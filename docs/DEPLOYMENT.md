# Deployment Guide

This project consists of a **FastAPI Backend** and a **Next.js Frontend**.

## 1. Deploying the Frontend (Vercel)

The frontend is located in the `zen-next/` directory.

1.  Push your code to GitHub.
2.  Go to [Vercel](https://vercel.com/new).
3.  Import the repository.
4.  **Important:** In the "Root Directory" setting, select `zen-next`.
5.  Add your environment variables:
    *   `NEXT_PUBLIC_API_URL`: The URL of your deployed backend (e.g., `https://your-api.onrender.com`).
6.  Click **Deploy**.

## 2. Deploying the Backend (Render / Railway)

Since the backend is a Python FastAPI app, it's often easiest to deploy it on **Render** or **Railway**.

### Render Deployment:
1.  Go to [Render](https://dashboard.render.com/).
2.  Create a new **Web Service**.
3.  Connect your GitHub repository.
4.  Set the **Build Command**: `pip install -r requirements.txt` (or use `uv` if preferred).
5.  Set the **Start Command**: `uvicorn api:app --host 0.0.0.0 --port $PORT`.
6.  Add Environment Variables:
    *   `GEMINI_API_KEY`: Your Google Gemini API Key.
    *   `TAVILY_API_KEY`: Your Tavily Search API Key.
7.  Click **Create Web Service**.

## 3. Connecting Them
Once your backend is live, copy its URL and update the `NEXT_PUBLIC_API_URL` variable in your Vercel project settings, then redeploy the frontend.

---
**Note:** If you want to deploy *everything* on Vercel, you would need to move `api.py` into `zen-next/api/index.py` and configure Vercel's Python runtime, but the dual-service approach above is usually more stable for agentic apps.
