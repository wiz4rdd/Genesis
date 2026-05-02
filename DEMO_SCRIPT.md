# 🎬 Zen Research Agent — Demo Video Script & Codebase Explanation
> **Target duration:** 3–5 minutes  
> **Format:** Screen-recorded walkthrough with voiceover narration  
> **Tone:** Clear, confident, technical-but-accessible

---

## ⏱️ Full Timing Overview

| Section | Content | Time |
|---|---|---|
| 0:00 – 0:25 | Hook + What it is | 25s |
| 0:25 – 1:00 | Architecture overview | 35s |
| 1:00 – 1:45 | Live demo — first query | 45s |
| 1:45 – 2:30 | Follow-up query (memory proof) | 45s |
| 2:30 – 3:10 | Code walkthrough (backend) | 40s |
| 3:10 – 3:45 | Code walkthrough (frontend) | 35s |
| 3:45 – 4:10 | Sources + session management | 25s |
| 4:10 – 4:30 | Closing | 20s |

---

## 🎤 Scene-by-Scene Script

---

### **SCENE 1 — Hook [0:00 – 0:25]**
> 🎥 *Show: Browser open at `localhost:3000`, Zen UI visible*

**Narration:**
> *"What if you could ask any research question — and get a fully cited, multi-source, deeply synthesised answer in seconds? Not a hallucinated guess. Real web data, live, with every claim traceable to a source. That's Zen — an autonomous deep research agent built for Hack to Future 3.0."*

---

### **SCENE 2 — Architecture Overview [0:25 – 1:00]**
> 🎥 *Show: Quick diagram or architecture slide from deck. Then switch to file tree in VS Code: `api.py`, `frontend/src/App.jsx`, `run.ps1`, `pyproject.toml`*

**Narration:**
> *"The stack is clean and purpose-built. On the backend: a **FastAPI** server running a **LangGraph** agentic state machine powered by **Gemini 2.5 Flash** as the reasoning brain, and the **Tavily Search API** for live web retrieval. On the frontend: a **React + Vite** chat UI with real-time **Server-Sent Events** streaming. Everything boots with a single PowerShell script."*

---

### **SCENE 3 — Live Demo: First Query [1:00 – 1:45]**
> 🎥 *Type into the input bar, send, and let it stream live*

**Query to type:**
```
What are the latest breakthroughs in LLM reasoning in 2025?
```

**Narration:**
> *"Watch what happens when I send a research question. First — a status message: 'Routing query through memory pipeline'. The agent decomposes the query, decides it needs live data, and fires a Tavily search call. You can see it — 'Searching via tavily_search_results_json'. Then the answer streams back, chunked and live — structured markdown with headers, bullets, numbered points. At the bottom: source cards, each one a real clickable URL. The session ID is persisted to local storage so memory survives a page refresh."*

---

### **SCENE 4 — Follow-up Query: Memory Proof [1:45 – 2:30]**
> 🎥 *Do NOT start a new session. Type a follow-up immediately*

**Query to type:**
```
Which of those models would be best suited for multi-hop reasoning tasks?
```

**Narration:**
> *"Now here's what makes this different from a standard chatbot. Notice the memory banner — Turn 2, same session ID. I haven't repeated any context. Zen already knows what we discussed. It references prior research and builds on it instead of starting from scratch. This is LangGraph's MemorySaver checkpointer in action — the full message history stored in-process, keyed by session ID, passed automatically on every turn."*

---

### **SCENE 5 — Code Walkthrough: Backend [2:30 – 3:10]**
> 🎥 *Open `api.py` in VS Code, scroll slowly through key sections*

**Narration:**
> *"In `api.py` — the LangGraph graph is a two-node cycle. The 'agent' node calls Gemini with the full message history. If Gemini decides it needs to search, it emits a tool call. The 'tools' node executes Tavily and returns results. Then control goes back to the agent. That loop continues until Gemini is confident in the answer.*
>
> *The system prompt tells Zen to decompose queries into 2–4 sub-questions, cite at least 3 sources per response, and never fabricate. The `/chat` endpoint returns a StreamingResponse using Server-Sent Events — so the frontend sees responses as they arrive, not after a 10-second wait."*

**Highlight these lines while narrating:**
- Lines 91–99 — `StateGraph` build + `MemorySaver` compile
- Lines 183–188 — First-turn system prompt injection logic
- Line 204 — `graph.astream()` the streaming call
- Line 218 — SSE `status` event emitted on tool calls

---

### **SCENE 6 — Code Walkthrough: Frontend [3:10 – 3:45]**
> 🎥 *Open `frontend/src/App.jsx`, scroll to `handleSubmit` and the SSE reader loop*

**Narration:**
> *"On the React side — the submit handler opens a fetch stream, reads SSE frames one by one, and dispatches them to state. Three event types: 'session' — which confirms and persists the session ID; 'status' — which drives the live tool-call indicator; and 'zen' — the actual answer plus parsed source objects. Messages update in place as chunks arrive, no flicker. Source cards animate in staggered using Framer Motion. The markdown renderer is hand-rolled — no library — handling headers, bullets, and bold inline text cleanly."*

**Highlight these lines while narrating:**
- Lines 240–272 — SSE reader loop
- Lines 252–268 — Three event type dispatch
- Lines 20–64 — `renderContent()` custom markdown renderer
- Lines 67–92 — `SourceCard` with Framer Motion stagger

---

### **SCENE 7 — Session Management [3:45 – 4:10]**
> 🎥 *Click "New Session" button, show memory reset. Then navigate to `localhost:8000/health` in browser.*

**Narration:**
> *"Clicking 'New Session' calls `POST /session/new`, gets a fresh UUID, clears local storage, and resets the message list. You can hit `/health` at any time to confirm the model, count active sessions, and verify the memory backend is running. The full system — FastAPI backend and the Next.js dev server — boots from a single `.\run.ps1` command."*

---

### **SCENE 8 — Closing [4:10 – 4:30]**
> 🎥 *Return to full Zen UI with a completed research answer visible on screen*

**Narration:**
> *"That's Zen — a production-grade autonomous research agent, not a toy demo. Real-time streaming. Persistent session memory. Live web citations you can actually click. Open source, fully hackable, and live right now. Thank you."*

---

## 🏗️ Codebase Architecture Reference

```
iitg/
├── api.py                  ← FastAPI backend + LangGraph agent
├── frontend/
│   └── src/App.jsx         ← React chat UI (SSE consumer)
├── zen-next/               ← Next.js production frontend (active)
├── run.ps1                 ← Single boot script (backend + frontend)
├── pyproject.toml          ← Python deps (langchain, langgraph, etc.)
└── .env                    ← GEMINI_API_KEY, TAVILY_API_KEY
```

---

## 🔧 Backend (`api.py`) — Key Design Decisions

| Component | Choice | Why |
|---|---|---|
| LLM | `gemini-3.1-flash-lite-preview` | Speed + cost-efficient at hackathon scale |
| Agent framework | LangGraph `StateGraph` | Fine-grained loop control vs. single-shot Q&A |
| Memory | `MemorySaver` (in-process) | Zero-infra, thread-keyed, no DB required |
| Search | `TavilySearchResults` (`max_results=8`) | Purpose-built for LLM agents, not scraping |
| Streaming | FastAPI `StreamingResponse` + SSE | Sub-second latency to frontend |
| Sessions | UUID v4 → `_sessions` dict | Lightweight, zero external dependency |

### Agent Graph Logic
```
START → agent node
         ↓ (tool_call?)
    tools node (Tavily)
         ↓
    agent node  ← loops until no tool call
         ↓
    [DONE] streamed to frontend
```

### System Prompt Strategy
- Decompose into 2–4 sub-questions before searching
- Cite minimum 3 sources per research response
- Skip search for conversational/simple questions
- Reference prior context: *"As I noted earlier…"*
- End every research answer with a `## Sources` section

---

## ⚛️ Frontend (`App.jsx`) — Key Design Decisions

| Component | Choice | Why |
|---|---|---|
| Streaming | `fetch` + `ReadableStream` reader | Native, no WebSocket overhead |
| Animation | `framer-motion` | Source card stagger, message entrance |
| Markdown | Hand-rolled `renderContent()` | No library bloat; handles 90% of agent output |
| Session | `localStorage` | Survives page reload, zero backend roundtrip |
| State | React `useState` only | Simple, no Redux needed at this scale |

### SSE Event Types Consumed
| Event type | Action |
|---|---|
| `session` | Persists `session_id` to localStorage, updates turn counter |
| `status` | Shows live "Searching…" indicator with pulse dot |
| `zen` | Updates message content + appends parsed `sources[]` |
| `[DONE]` | Clears loading state, hides status indicator |

---

## 📋 Pre-Recording Checklist

- [ ] `.\run.ps1` running — backend on `:8000`, frontend on `:3000`
- [ ] `localhost:8000/health` returns `"status": "healthy"`
- [ ] `.env` has valid `GEMINI_API_KEY` and `TAVILY_API_KEY`
- [ ] Browser zoom at 100%, full screen, no bookmarks bar
- [ ] Start with a clean session (click "New Session" first)
- [ ] VS Code font size boosted for code scenes (`Ctrl +`)
- [ ] Screen recorder set to capture mic audio, system audio off

---

> *Built for Hack to Future 3.0 · LangGraph · Gemini 2.5 Flash · Tavily Search API*
