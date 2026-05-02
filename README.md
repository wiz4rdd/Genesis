# Zen Research (Genesis)

The **Zen Research** project is a high-performance, AI-driven research assistant designed with a premium, high-tech aesthetic. It leverages a modern stack combining state-of-the-art LLM orchestration on the backend with a polished, glassmorphic Next.js frontend.

## 🏗️ Architecture & Core Components

### 1. Backend (Python/FastAPI)
The backend is located in `api.py` and serves as the orchestration layer.
- **LLM Engine**: Powered by **Google Gemini Flash** or **Groq**, providing low-latency responses.
- **Orchestration**: Uses **LangGraph** to manage the research workflow.
- **API Strategy**: 
  - Uses **FastAPI** for high performance.
  - Implements **Server-Sent Events (SSE)** for real-time message streaming.

### 2. Frontend (Next.js)
The frontend is a premium, high-density glassmorphic application.
- **UI Framework**: Next.js 15+ (App Router).
- **Styling**: Tailwind CSS 4.0 with vanilla CSS enhancements.
- **Interactions**: **Framer Motion** for fluid animations.
- **Icons**: **Lucide React**.

## 🎨 Design System
- **Theme**: Cyber-Minimalist Dark Mode.
- **Typography**: **Outfit** (Google Fonts).
- **Aesthetics**: Glassmorphism, backdrop blurs, and vibrant cyan accents.

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js & npm/pnpm

### Setup
1. Install Python dependencies:
   ```bash
   pip install -e .
   ```
2. Install Node.js dependencies:
   ```bash
   pnpm install
   ```
3. Configure environment variables in `.env`.

### Running the App
Use the convenience script:
```powershell
./run.ps1
```
Or run manually:
- Backend: `pnpm run dev:backend`
- Frontend: `pnpm run dev:frontend`

---
*Simplified and optimized for Genesis Research.*