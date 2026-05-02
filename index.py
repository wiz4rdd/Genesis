import os
import uuid
import orjson
from typing import Annotated, AsyncGenerator
from typing_extensions import TypedDict
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# ── 1. Config ────────────────────────────────────────────────────────────────
load_dotenv()

app = FastAPI(title="Zen Research API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 2. State — extended with memory metadata ──────────────────────────────────
class State(TypedDict):
    messages: Annotated[list, add_messages]
    turn: int                    # how many user turns in this session
    memory_active: bool          # always True once session is created

# ── 3. Tools ─────────────────────────────────────────────────────────────────
search_tool = TavilySearchResults(
    max_results=8,
    min_results=3,
    search_depth="advanced",
    include_raw_content=False,
)
tools = [search_tool]

# ── 4. LLM — Gemini 2.5 Flash ────────────────────────────────────────────────
llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite-preview",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.2,
    max_output_tokens=8192,
)
llm_with_tools = llm.bind_tools(tools)

# ── 5. System Prompt ──────────────────────────────────────────────────────────
SYSTEM_PROMPT = SystemMessage(content=(
    "You are Zen, an elite autonomous deep research assistant with persistent memory.\n\n"
    "MEMORY & CONTEXT RULES:\n"
    "- You have full access to this conversation's history. Use it.\n"
    "- Reference earlier findings when relevant ('As I noted earlier…').\n"
    "- If the user asks a follow-up, build on previous research — do not repeat it.\n"
    "- Track entities, topics, and URLs mentioned across turns.\n\n"
    "RESEARCH PROTOCOL:\n"
    "1. Decompose the query into 2–4 focused sub-questions.\n"
    "2. Search each sub-question using the Tavily search tool.\n"
    "3. Aggregate and cross-reference information from ALL retrieved sources.\n"
    "4. Synthesise a comprehensive answer with clear reasoning.\n"
    "5. End every research response with a '## Sources' section:\n"
    "   [N] Title — URL\n\n"
    "CONSTRAINTS:\n"
    "- If the user says 'hi', 'hello', or asks a simple non-research question, RESPOND IMMEDIATELY and concisely without searching.\n"
    "- Use ONLY live web data for factual claims — never fabricate.\n"
    "- Cite at least 3 sources per research response.\n"
    "- For conversational or follow-up tasks, answer directly without redundant searching.\n"
    "- Respond with precision. No padding. Lead with insight."
))

# ── 6. Graph Node ─────────────────────────────────────────────────────────────
def research_agent(state: State):
    """Core reasoning node — full message history passed automatically."""
    response = llm_with_tools.invoke(state["messages"])
    return {
        "messages": [response],
        "turn": state.get("turn", 0),
        "memory_active": True,
    }

# ── 7. Build Graph with MemorySaver ──────────────────────────────────────────
builder = StateGraph(State)
builder.add_node("agent", research_agent)
builder.add_node("tools", ToolNode(tools))
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition)
builder.add_edge("tools", "agent")

memory_store = MemorySaver()                      # in-process session store
graph = builder.compile(checkpointer=memory_store)

# Sessions: {session_id: {"turn": int, "initialized": bool}}
_sessions: dict[str, dict] = {}

# ── 8. Helpers ────────────────────────────────────────────────────────────────
def _normalize_content(raw) -> str:
    if isinstance(raw, str):
        return raw
    if isinstance(raw, list):
        return " ".join(p.get("text", "") for p in raw if isinstance(p, dict))
    return ""

def _extract_sources(content: str) -> list[dict]:
    sources = []
    if "## Sources" not in content:
        return sources
    section = content.split("## Sources", 1)[1]
    for line in section.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.lstrip("0123456789[].- ").split(" — ", 1)
        title, url = (parts[0].strip(), parts[1].strip()) if len(parts) == 2 else (parts[0].strip(), parts[0].strip())
        if url.startswith("http"):
            sources.append({"title": title, "url": url})
    return sources

def _get_or_create_session(session_id: str) -> dict:
    if session_id not in _sessions:
        _sessions[session_id] = {"turn": 0, "initialized": False}
    return _sessions[session_id]

# ── 9. Models ─────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: str = ""        # empty → server generates one

# ── 10. Endpoints ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model": "gemini-3.1-flash-lite-preview",
        "active_sessions": len(_sessions),
        "memory": "MemorySaver",
    }

@app.post("/session/new")
async def new_session():
    """Create a fresh session and return its ID."""
    sid = str(uuid.uuid4())
    _sessions[sid] = {"turn": 0, "initialized": False}
    return {"session_id": sid}

@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Wipe memory for a session."""
    _sessions.pop(session_id, None)
    # MemorySaver holds state in-memory keyed by thread_id;
    # re-using the same thread_id with a fresh run effectively overwrites it.
    return {"cleared": session_id}

@app.get("/session/{session_id}/info")
async def session_info(session_id: str):
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    sess = _sessions[session_id]
    return {
        "session_id": session_id,
        "turn": sess["turn"],
        "memory_active": sess["initialized"],
    }

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # Resolve or create session
    sid = request.session_id.strip() or str(uuid.uuid4())
    sess = _get_or_create_session(sid)

    # Thread config for MemorySaver — all turns in same session share state
    langgraph_config = {"configurable": {"thread_id": sid}}

    # First turn: inject system prompt; subsequent turns: only new human msg
    if not sess["initialized"]:
        messages_input = [SYSTEM_PROMPT, HumanMessage(content=request.message)]
        sess["initialized"] = True
    else:
        messages_input = [HumanMessage(content=request.message)]

    sess["turn"] += 1
    current_turn = sess["turn"]

    async def event_generator() -> AsyncGenerator[bytes, None]:
        # Emit session handshake first so frontend can store the session_id
        yield f"data: {orjson.dumps({'type': 'session', 'session_id': sid, 'turn': current_turn}).decode()}\n\n"

        input_query = {
            "messages": messages_input,
            "turn": current_turn,
            "memory_active": True,
        }

        tool_call_count = 0

        async for event in graph.astream(input_query, config=langgraph_config, stream_mode="values"):
            if "messages" not in event:
                continue

            message = event["messages"][-1]
            if not isinstance(message, AIMessage):
                continue

            content = _normalize_content(message.content)
            is_tool_call = bool(getattr(message, "tool_calls", None))

            if is_tool_call:
                tool_call_count += 1
                tool_name = message.tool_calls[0].get("name", "tavily_search")
                yield f"data: {orjson.dumps({'type': 'status', 'status': f'Searching ({tool_call_count}) via {tool_name}…', 'content': ''}).decode()}\n\n"
                continue

            if not content:
                continue

            sources = _extract_sources(content)
            yield f"data: {orjson.dumps({'type': 'zen', 'content': content, 'sources': sources, 'source_count': len(sources), 'sender': 'Zen', 'turn': current_turn}).decode()}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host=host, port=port, reload=False)
