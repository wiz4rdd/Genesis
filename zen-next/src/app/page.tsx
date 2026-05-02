"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Plus, ExternalLink, Globe, 
  Layers, MessageSquare, Trash2, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const USER_NAME_KEY = 'genesis_user_name';
const THREADS_KEY   = 'genesis_threads';
const ACTIVE_KEY    = 'genesis_active_thread';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Source { title: string; url: string; }

interface Message {
  id: string;
  content: string;
  sender: string;
  type: 'genesis' | 'user' | 'system' | 'zen';
  sources?: Source[];
}

interface Thread {
  id: string;
  title: string;
  sessionId: string;
  messages: Message[];
  createdAt: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getNameColor = (name: string) => {
  const colors = [
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const makeThread = (): Thread => ({
  id: Date.now().toString(),
  title: 'New Thread',
  sessionId: '',
  createdAt: Date.now(),
  messages: [{ id: '0', content: 'Ready. What are we researching today?', sender: 'Genesis', type: 'genesis' }],
});

// ── Components ────────────────────────────────────────────────────────────────
const Waves = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <motion.div className="absolute w-full h-full rounded-full border border-cyan-500/30"
      animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />
    <motion.div className="absolute w-full h-full rounded-full border border-purple-500/20"
      animate={{ scale: [1, 2.6], opacity: [0.3, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.7 }} />
  </div>
);

const SourceLink = ({ source }: { source: Source }) => (
  <a href={source.url} target="_blank" rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-white/10 transition-all text-[11px] text-zinc-500 hover:text-zinc-300">
    <Globe size={9} />
    <span className="truncate max-w-[120px]">{source.title}</span>
    <ExternalLink size={9} className="opacity-40" />
  </a>
);

const MessageBubble = ({ msg, userName }: { msg: Message; userName: string }) => {
  const isGenesis = msg.type === 'genesis' || msg.type === 'zen';
  const nameColor = isGenesis ? '' : getNameColor(userName || 'User');
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group/msg flex items-start gap-4 py-5 first:pt-0 w-full relative">
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold border overflow-hidden relative",
        isGenesis ? "bg-white text-black border-white/80" : nameColor
      )}>
        {isGenesis ? "G" : (userName?.[0]?.toUpperCase() || "U")}
        {isGenesis && msg.content === '' && <Waves />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1 pt-0.5">
        <span className={cn(
          "block text-[9px] font-black uppercase tracking-[0.15em]",
          isGenesis ? "text-white/50" : "text-zinc-600"
        )}>
          {isGenesis ? "Genesis" : userName}
        </span>

        <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-[14px] text-zinc-200 font-sans">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {msg.content.split('## Sources')[0].trim()}
          </ReactMarkdown>
        </div>

        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {msg.sources.map((src, i) => <SourceLink key={i} source={src} />)}
          </div>
        )}
      </div>

      {/* Copy button on hover */}
      {msg.content && (
        <button onClick={copy}
          className="absolute top-3 right-0 opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-zinc-500 hover:text-white">
          {copied
            ? <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest px-1">Copied</span>
            : <MessageSquare size={11} />
          }
        </button>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [input, setInput]             = useState('');
  const [userName, setUserName]       = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [threads, setThreads]         = useState<Thread[]>([]);
  const [activeId, setActiveId]       = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [status, setStatus]           = useState<string | null>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Visual Viewport API — keyboard-safe sizing on Android/iOS ────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const el = containerRef.current;
      if (!el) return;
      el.style.height  = `${vv.height}px`;
      el.style.top     = `${vv.offsetTop}px`;
      el.style.left    = `${vv.offsetLeft}px`;
      el.style.width   = `${vv.width}px`;
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

  // ── Derived active thread ─────────────────────────────────────────────────
  const activeThread = threads.find(t => t.id === activeId) ?? threads[0];

  // ── Persist & restore ─────────────────────────────────────────────────────
  useEffect(() => {
    const storedName    = localStorage.getItem(USER_NAME_KEY);
    const storedThreads = localStorage.getItem(THREADS_KEY);
    const storedActive  = localStorage.getItem(ACTIVE_KEY);

    if (storedName) setUserName(storedName);
    else setIsEditingName(true);

    if (storedThreads) {
      try {
        const parsed: Thread[] = JSON.parse(storedThreads);
        if (parsed.length > 0) {
          setThreads(parsed);
          setActiveId(storedActive || parsed[0].id);
          return;
        }
      } catch { /* ignore */ }
    }
    // Bootstrap first thread
    const first = makeThread();
    setThreads([first]);
    setActiveId(first.id);
  }, []);

  // Save threads whenever they change
  useEffect(() => {
    if (threads.length === 0) return;
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeThread?.messages, status]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveName = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setUserName(clean);
    localStorage.setItem(USER_NAME_KEY, clean);
    setIsEditingName(false);
  };

  const updateThread = (id: string, patch: Partial<Thread>) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const updateMessages = (id: string, msgs: Message[]) => {
    updateThread(id, { messages: msgs });
  };

  const newThread = () => {
    const t = makeThread();
    setThreads(prev => [t, ...prev]);
    setActiveId(t.id);
  };

  const deleteThread = (id: string) => {
    const next = threads.filter(t => t.id !== id);
    if (next.length === 0) {
      const fresh = makeThread();
      setThreads([fresh]);
      setActiveId(fresh.id);
    } else {
      setThreads(next);
      if (activeId === id) setActiveId(next[0].id);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeThread) return;

    const query = input;
    const tid = activeThread.id;
    const userMsg: Message = { id: Date.now().toString(), content: query, sender: userName || 'You', type: 'user' };
    const newMsgs = [...activeThread.messages, userMsg];

    // Auto-title thread from first user message
    if (activeThread.title === 'New Thread') {
      updateThread(tid, { messages: newMsgs, title: query.slice(0, 40) + (query.length > 40 ? '…' : '') });
    } else {
      updateMessages(tid, newMsgs);
    }

    setInput('');
    setIsLoading(true);
    setStatus('Searching…');

    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, session_id: activeThread.sessionId }),
      });

      if (!response.ok) throw new Error('Network error');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const genesisId = (Date.now() + 1).toString();
      let gMsg: Message = { id: genesisId, content: '', sender: 'Genesis', type: 'genesis', sources: [] };

      setThreads(prev => prev.map(t =>
        t.id === tid ? { ...t, messages: [...t.messages.filter(m => m.id !== genesisId), gMsg] } : t
      ));

      if (!reader) return;

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
              updateThread(tid, { sessionId: data.session_id });
            } else if (data.type === 'status') {
              setStatus(data.status);
            } else if (data.type === 'zen' || data.type === 'genesis') {
              gMsg = { ...gMsg, content: data.content, sources: data.sources, type: 'genesis' };
              setThreads(prev => prev.map(t =>
                t.id === tid ? { ...t, messages: t.messages.map(m => m.id === genesisId ? { ...gMsg } : m) } : t
              ));
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setIsLoading(false);
      setStatus(null);
      const errMsg: Message = { id: 'err-' + Date.now(), content: 'Connection failed. Try again.', sender: 'Genesis', type: 'system' };
      setThreads(prev => prev.map(t => t.id === tid ? { ...t, messages: [...t.messages, errMsg] } : t));
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!activeThread) return;
    const text = activeThread.messages.map(m => `### ${m.sender}\n${m.content}`).join('\n\n---\n\n');
    const blob = new Blob([`# ${activeThread.title}\n\n${text}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `genesis-${activeThread.id}.md`;
    a.click();
  };

  const handleCopyAll = () => {
    if (!activeThread) return;
    navigator.clipboard.writeText(activeThread.messages.map(m => `${m.sender}: ${m.content}`).join('\n\n'));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex bg-[#0e0e10] text-zinc-300 font-sans"
    >

      {/* Name Prompt */}
      <AnimatePresence>
        {isEditingName && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0e10]/98 backdrop-blur-3xl p-6">
            <div className="w-full max-w-sm space-y-8 text-center">
              <p className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-black">Genesis</p>
              <h2 className="font-serif text-3xl text-white tracking-tight">What should I call you?</h2>
              <input autoFocus
                className="w-full bg-transparent border-b border-white/10 py-4 text-center text-xl outline-none focus:border-cyan-500/40 transition-colors placeholder:text-zinc-800 text-white"
                placeholder="Your name"
                onKeyDown={e => e.key === 'Enter' && saveName((e.target as HTMLInputElement).value)}
              />
              <p className="text-[10px] text-zinc-700 uppercase tracking-[0.3em]">Press Enter to continue</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-60 border-r border-white/5 hidden lg:flex flex-col bg-[#111113] z-20">
        {/* User */}
        <div className="p-5 border-b border-white/5 cursor-pointer group" onClick={() => setIsEditingName(true)}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border",
              getNameColor(userName || 'U')
            )}>
              {userName?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/90 truncate">{userName || "Set name"}</p>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest group-hover:text-zinc-400 transition-colors">Edit</p>
            </div>
          </div>
        </div>

        {/* Thread actions */}
        <div className="p-3 border-b border-white/5 space-y-1">
          <button onClick={newThread}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
            <Plus size={13} /> New Thread
          </button>
          <button onClick={handleCopyAll}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
            <MessageSquare size={13} /> Copy Thread
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
            <ExternalLink size={13} /> Export .md
          </button>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {threads.map(t => (
            <div key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                "group/thread flex items-center gap-2 w-full px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                t.id === activeId
                  ? "bg-white/8 text-white"
                  : "text-zinc-500 hover:bg-white/4 hover:text-zinc-300"
              )}>
              <ChevronRight size={10} className={cn("flex-shrink-0 transition-transform", t.id === activeId && "rotate-90 text-cyan-400")} />
              <span className="text-[11px] truncate flex-1">{t.title}</span>
              <button onClick={e => { e.stopPropagation(); deleteThread(t.id); }}
                className="opacity-0 group-hover/thread:opacity-100 p-0.5 hover:text-red-400 transition-all">
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <p className="text-[9px] text-zinc-700 uppercase tracking-widest">Genesis Core</p>
        </div>
      </aside>

      {/* ── Main Container ───────────────────────────────────────────────────── */}
      <main className="flex-1 relative h-full overflow-hidden">

        {/* Navigation — Absolute, never pushes content */}
        <nav className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-8 z-30 border-b border-white/5">
          <div className="absolute inset-0 bg-[#0e0e10]/90 backdrop-blur-xl" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

          <div className="relative flex items-center gap-3 z-10">
            <span className="font-serif text-xl text-white tracking-tight">Genesis</span>
          </div>

          <div className="relative flex items-center gap-2 z-10 text-zinc-500">
            <button onClick={newThread} className="p-2 rounded-lg hover:bg-white/5 hover:text-white transition-all">
              <Plus size={16} />
            </button>
            <button onClick={() => window.print()} className="p-2 rounded-lg hover:bg-white/5 hover:text-white transition-all lg:hidden xl:block">
              <Layers size={15} />
            </button>
            <button onClick={() => activeThread && deleteThread(activeThread.id)} className="p-2 rounded-lg hover:bg-white/5 hover:text-red-400 transition-all">
              <Trash2 size={15} />
            </button>
          </div>
        </nav>

        {/* Messages — top padding accounts for absolute nav height + extra gap */}
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto pt-20 px-6 pb-28 scroll-smooth overscroll-none">
          <div className="max-w-2xl mx-auto w-full">
            {activeThread?.messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} userName={userName} />
            ))}

            {status && (
              <div className="flex items-center gap-4 py-3">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden flex-shrink-0">
                  <Waves />
                </div>
                <span className="text-[11px] italic text-zinc-500 tracking-wide">{status}</span>
              </div>
            )}
          </div>
        </div>

        {/* Input area — absolute pinned to bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-2 z-20">
          <div className="absolute inset-0 bg-[#0e0e10]/80 backdrop-blur-xl pointer-events-none" />
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

          <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto z-10">
            <div className="absolute inset-0 rounded-2xl bg-cyan-500/5 blur-2xl opacity-0 focus-within:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />
            <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/20 transition-all duration-300 shadow-lg">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything…"
                disabled={isLoading}
                className="flex-1 bg-transparent py-3.5 px-5 outline-none text-[14px] placeholder:text-zinc-700 text-white"
              />
              <button type="submit" disabled={isLoading || !input.trim()}
                className="mr-2 p-2.5 rounded-xl bg-white text-black hover:bg-zinc-100 transition-all disabled:bg-white/10 disabled:text-zinc-700">
                <Send size={15} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
