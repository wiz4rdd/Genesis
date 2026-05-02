import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Search, Sparkles, ExternalLink, Globe, BookOpen, Brain, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://localhost:8000';
const SESSION_KEY = 'zen_session_id';

// ── Session helpers ───────────────────────────────────────────────────────────
function getStoredSession() {
  return localStorage.getItem(SESSION_KEY) || '';
}
function storeSession(id) {
  localStorage.setItem(SESSION_KEY, id);
}
function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function renderContent(text) {
  if (!text) return null;
  const mainText = text.split('## Sources')[0].trim();
  const elements = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length) {
      elements.push(<ul key={`ul-${elements.length}`} className="md-ul">{listBuffer}</ul>);
      listBuffer = [];
    }
  };

  mainText.split('\n').forEach((line, i) => {
    if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={i} className="md-h2">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={i} className="md-h3">{line.slice(4)}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(<li key={i} className="md-li">{line.slice(2)}</li>);
    } else if (/^\d+\.\s/.test(line)) {
      listBuffer.push(<li key={i} className="md-li">{line.replace(/^\d+\.\s/, '')}</li>);
    } else if (line.trim() === '') {
      flushList();
      elements.push(<div key={i} className="md-spacer" />);
    } else {
      flushList();
      // Inline bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={i} className="md-p">
          {parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={j}>{p.slice(2, -2)}</strong>
              : p
          )}
        </p>
      );
    }
  });
  flushList();
  return elements;
}

// ── Source Card ───────────────────────────────────────────────────────────────
function SourceCard({ source, index }) {
  const domain = (() => {
    try { return new URL(source.url).hostname.replace('www.', ''); }
    catch { return source.url; }
  })();

  return (
    <motion.a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="source-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ scale: 1.02 }}
    >
      <span className="source-index">{index + 1}</span>
      <div className="source-body">
        <span className="source-title">{source.title}</span>
        <span className="source-domain"><Globe size={10} />{domain}</span>
      </div>
      <ExternalLink size={11} className="source-ext" />
    </motion.a>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────
function Message({ msg }) {
  const hasSources = msg.sources?.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={`message ${msg.type}`}
    >
      <div className="message-header">
        <div className="message-sender">
          {msg.type === 'zen' && <Sparkles size={11} />}
          {msg.sender}
        </div>
        {msg.turn && msg.type === 'zen' && (
          <span className="turn-badge">Turn {msg.turn}</span>
        )}
      </div>
      <div className="message-content">{renderContent(msg.content)}</div>

      {hasSources && (
        <div className="sources-panel">
          <div className="sources-header">
            <BookOpen size={11} />
            <span>{msg.sources.length} sources cited</span>
          </div>
          <div className="sources-grid">
            {msg.sources.map((src, i) => (
              <SourceCard key={i} source={src} index={i} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Memory Banner ─────────────────────────────────────────────────────────────
function MemoryBanner({ turn, sessionId, onClear }) {
  if (!sessionId) return null;
  return (
    <motion.div
      className="memory-banner"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Brain size={12} />
      <span>Memory active · Turn {turn} · Session <code>{sessionId.slice(0, 8)}…</code></span>
      <button className="clear-btn" onClick={onClear} title="Clear memory & start new session">
        <Trash2 size={11} /> New Session
      </button>
    </motion.div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '0',
      content: 'Greetings. I am Zen — your autonomous deep research assistant with persistent memory.\n\nI remember everything across this session. Ask follow-up questions, build on prior research, or start fresh with a new session. What shall I investigate?',
      sender: 'Zen',
      type: 'zen',
      sources: [],
      turn: null,
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [sessionId, setSessionId] = useState(getStoredSession);
  const [turn, setTurn] = useState(0);
  const [sourceCount, setSourceCount] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // ── New Session ─────────────────────────────────────────────────────────────
  const handleNewSession = useCallback(async () => {
    try {
      const res = await fetch(`${API}/session/new`, { method: 'POST' });
      const { session_id } = await res.json();
      storeSession(session_id);
      setSessionId(session_id);
    } catch {
      const sid = crypto.randomUUID();
      storeSession(sid);
      setSessionId(sid);
    }
    setTurn(0);
    setSourceCount(0);
    setMessages([{
      id: Date.now().toString(),
      content: 'Memory cleared. New session started. What shall I research?',
      sender: 'Zen',
      type: 'zen',
      sources: [],
      turn: null,
    }]);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      content: input,
      sender: 'You',
      type: 'user',
      sources: [],
      turn: null,
    };
    setMessages(prev => [...prev, userMsg]);
    const query = input;
    setInput('');
    setIsLoading(true);
    setStatus('Routing query through memory pipeline…');

    // Use stored session or create one on the fly
    const sid = sessionId || (() => {
      const newId = crypto.randomUUID();
      storeSession(newId);
      setSessionId(newId);
      return newId;
    })();

    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, session_id: sid }),
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const zenId = (Date.now() + 1).toString();
      let zenMsg = { id: zenId, content: '', sender: 'Zen', type: 'zen', sources: [], turn: null };
      setMessages(prev => [...prev, zenMsg]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') { setIsLoading(false); setStatus(null); continue; }

          try {
            const data = JSON.parse(raw);

            if (data.type === 'session') {
              // Server confirmed session — persist it
              storeSession(data.session_id);
              setSessionId(data.session_id);
              setTurn(data.turn);
              continue;
            }

            if (data.type === 'status') {
              setStatus(data.status);
              continue;
            }

            if (data.type === 'zen' && data.content) {
              zenMsg = { ...zenMsg, content: data.content, sources: data.sources || [], turn: data.turn };
              setMessages(prev => prev.map(m => m.id === zenId ? { ...zenMsg } : m));
              if (data.source_count) setSourceCount(c => c + data.source_count);
            }
          } catch { /* malformed frame — skip */ }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        content: `⚠ ${err.message}. Ensure the backend is running on port 8000.`,
        sender: 'System',
        type: 'zen',
        sources: [],
      }]);
      setIsLoading(false);
      setStatus(null);
    }
  };

  return (
    <div className="zen-container">
      {/* Header */}
      <motion.header initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="header">
        <div className="logo">ZEN RESEARCH</div>
        <div className="header-right">
          {sourceCount > 0 && (
            <motion.div className="source-badge" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Globe size={11} /><span>{sourceCount} sources</span>
            </motion.div>
          )}
          <button className="new-session-btn" onClick={handleNewSession} title="Start new session">
            <Plus size={13} /> New Session
          </button>
          <div className="status-indicator">
            <div className="pulse" />
            <span>GEMINI 2.5 FLASH · LIVE</span>
          </div>
        </div>
      </motion.header>

      {/* Memory Banner */}
      <MemoryBanner turn={turn} sessionId={sessionId} onClear={handleNewSession} />

      {/* Chat */}
      <main className="chat-area">
        <AnimatePresence>
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        </AnimatePresence>

        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="streaming-status"
            >
              <div className="pulse" />
              <span>{status}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </main>

      {/* Input */}
      <motion.form
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onSubmit={handleSubmit}
        className="input-container"
      >
        <Search size={20} color="#94a3b8" />
        <input
          id="research-input"
          className="zen-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={turn > 0 ? 'Continue your research — Zen remembers…' : 'Ask anything — Zen will research, aggregate, and cite…'}
          disabled={isLoading}
          autoComplete="off"
        />
        <button id="submit-btn" type="submit" className="send-button" disabled={isLoading || !input.trim()}>
          {isLoading ? <div className="spinner" /> : <Send size={18} color="#000" />}
        </button>
      </motion.form>
    </div>
  );
}
