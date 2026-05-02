# Zen Research Repository Analysis

The **Zen Research** project is a high-performance, AI-driven research assistant designed with a premium, high-tech aesthetic. It leverages a modern stack combining state-of-the-art LLM orchestration on the backend with a polished, glassmorphic frontend.

## 🏗️ Architecture & Core Components

### 1. Backend (Python/FastAPI)

The backend is located in `api.py` and serves as the orchestration layer.

- **LLM Engine**: Powered by **Groq** (specifically `llama-3.1-8b-instant`), providing low-latency responses.
- **Orchestration**: Uses **LangGraph** to manage the research workflow. It implements a stateful graph with two primary nodes:
  - `agent`: The core reasoning engine.
  - `tools`: A tool-calling node that currently integrates **Tavily Search** for real-time data retrieval.
- **API Strategy**: 
  - Uses **FastAPI** for high performance.
  - Implements **Server-Sent Events (SSE)** for real-time message streaming.
  - Uses **orjson** for fast JSON serialization.

### 2. Frontend (React/Vite)

The frontend is a minimalist yet premium single-page application.

- **UI Framework**: React 19 (Vite-based).
- **Interactions**: **Framer Motion** is used for smooth entry animations and layout transitions.
- **Icons**: **Lucide React** provides the high-tech iconography.
- **Turbo Mode**: Includes an experimental integration with **Puter.js**, targeting `x-ai/grok-4-1-fast`.

## 🎨 Design System & Aesthetics

The project follows a "Cyber-Minimalist" design language:

- **Typography**: Uses the **Outfit** font family (Google Fonts), known for its geometric and clean look.
- **Visuals**:
  - **Glassmorphism**: Heavy use of `backdrop-filter: blur()` and semi-transparent backgrounds.
  - **Color Palette**: Dark charcoal background (`#0a0a0c`) with a vibrant cyan accent (`#00f2ff`).
  - **Texture**: Subtle carbon-fiber overlay and radial gradients to create depth.
  - **Micro-animations**: Pulse indicators for "ML Pipeline Active" and smooth message scaling.

## 🚀 Key Files & Structure

- `api.py`: The entry point for the FastAPI server and LangGraph logic.
- `frontend/src/App.jsx`: Main UI logic, handling both standard and "Turbo" chat modes.
- `frontend/src/index.css`: Core design tokens and global styles.
- `pyproject.toml`: Backend dependencies.
- `run.ps1`: Convenience script for starting the project.

## 🛠️ Observations & Potential Enhancements

- **Turbo Mode**: The `grok-4-1-fast` model name appears to be a placeholder or specific to a custom environment, as that model version is not publicly available yet.
- **Backend Port**: Defaults to port 8000, while the frontend expects `localhost:8000`.
- **Search Logic**: Current graph logic is set to `max_results=5` for Tavily, balancing speed and information density.

---

*Analysis completed by Antigravity.*