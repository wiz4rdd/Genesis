import os
import orjson
from typing import Annotated, AsyncGenerator
from typing_extensions import TypedDict
from dotenv import load_dotenv

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, ORJSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_groq import ChatGroq
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.prebuilt import ToolNode, tools_condition

# 1. Configuration & Setup
load_dotenv()

app = FastAPI(title="Zen Research API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the State
class State(TypedDict):
    messages: Annotated[list, add_messages]

# 2. Define Tools and LLM
search_tool = TavilySearchResults(max_results=5) 
tools = [search_tool]

# Initialize LLM and bind tools
llm = ChatGroq(model="llama-3.1-8b-instant")
llm_with_tools = llm.bind_tools(tools)

# 3. Define Node Functions
def research_agent(state: State):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

# 4. Build the Graph
builder = StateGraph(State)
builder.add_node("agent", research_agent)
builder.add_node("tools", ToolNode(tools))
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition)
builder.add_edge("tools", "agent") 
graph = builder.compile()

# 5. API Models
class ChatRequest(BaseModel):
    message: str

# 6. Endpoints
@app.get("/health")
async def health():
    return {"status": "healthy", "ml_pipeline": "active"}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    async def event_generator():
        from langchain_core.messages import SystemMessage, HumanMessage
        
        # Define Zen's high-performance persona
        system_msg = SystemMessage(content=(
            "You are Zen, a high-performance research and productivity assistant. "
            "Your goal is to provide high-fidelity, accurate, and concise information. "
            "Use your search tool only when you need real-time data or specific facts. "
            "For creative tasks, drafting, or general knowledge, answer directly with a premium, minimalist tone."
        ))

        input_query = {"messages": [system_msg, HumanMessage(content=request.message)]}
        
        # We use graph.astream for async streaming
        async for event in graph.astream(input_query, stream_mode="values"):
            if "messages" in event:
                from langchain_core.messages import AIMessage
                message = event["messages"][-1]
                
                # Only stream the AI's response to the frontend
                if not isinstance(message, AIMessage):
                    continue

                # Prepare payload for frontend
                payload = {
                    "content": message.content,
                    "type": "zen",
                    "sender": "Zen"
                }
                # Handle tool calls specifically if needed
                if hasattr(message, "tool_calls") and message.tool_calls:
                    payload["status"] = "Researching..."
                
                yield f"data: {orjson.dumps(payload).decode()}\n\n"
        
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
