import React, { useState, useRef, useEffect } from 'react';
import { Send, Cpu, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', content: 'Greetings. I am Zen, your high-performance research assistant. How can I assist your inquiry today?', sender: 'Zen', type: 'zen' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [isTurbo, setIsTurbo] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now().toString(), content: input, sender: 'User', type: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStatus(isTurbo ? 'Turbo Mode (Grok 4.1)' : 'Analyzing...');

    try {
      if (isTurbo) {
        // High-Performance Puter.js Grok Integration
        const response = await window.puter.ai.chat(input, {
          model: 'x-ai/grok-4-1-fast',
          stream: true
        });

        let currentZenMessage = { id: (Date.now() + 1).toString(), content: '', sender: 'Zen', type: 'zen' };
        setMessages(prev => [...prev, currentZenMessage]);

        for await (const part of response) {
          if (part.text) {
            currentZenMessage.content += part.text;
            setMessages(prev => 
              prev.map(msg => msg.id === currentZenMessage.id ? { ...currentZenMessage } : msg)
            );
          }
        }
        setIsLoading(false);
        setStatus(null);
        return;
      }

      // Default LangGraph Backend
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) throw new Error('Backend offline');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentZenMessage = { id: (Date.now() + 1).toString(), content: '', sender: 'Zen', type: 'zen' };
      
      setMessages(prev => [...prev, currentZenMessage]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              setIsLoading(false);
              setStatus(null);
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              if (data.status) setStatus(data.status);
              
              if (data.content) {
                currentZenMessage.content = data.content;
                setMessages(prev => 
                  prev.map(msg => msg.id === currentZenMessage.id ? { ...currentZenMessage } : msg)
                );
              }
            } catch (e) {
              console.error('Error parsing SSE data', e);
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: 'err', content: 'Connection failure. Please ensure the high-performance backend is running.', sender: 'System', type: 'zen' }]);
      setIsLoading(false);
      setStatus(null);
    }
  };

  return (
    <div className="zen-container">
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="header"
      >
        <div className="logo">ZEN RESEARCH</div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button 
            onClick={() => setIsTurbo(!isTurbo)}
            style={{
              background: isTurbo ? 'rgba(0, 242, 255, 0.1)' : 'transparent',
              border: `1px solid ${isTurbo ? 'var(--accent-color)' : 'var(--glass-border)'}`,
              color: isTurbo ? 'var(--accent-color)' : 'var(--text-secondary)',
              padding: '0.4rem 1rem',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Cpu size={14} />
            {isTurbo ? 'TURBO ACTIVE (GROK)' : 'ACTIVATE TURBO'}
          </button>
          <div className="status-indicator">
            <div className="pulse" />
            <span>ML PIPELINE ACTIVE</span>
          </div>
        </div>
      </motion.header>

      <main className="chat-area">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className={`message ${msg.type}`}
            >
              <div className="message-sender">
                {msg.type === 'zen' ? <Sparkles size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> : null}
                {msg.sender}
              </div>
              <div className="message-content">{msg.content}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="status-indicator" 
            style={{ paddingLeft: '1rem' }}
          >
            <div className="pulse" />
            <span>{status}</span>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </main>

      <motion.form 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onSubmit={handleSubmit} 
        className="input-container"
      >
        <Search size={20} color="#94a3b8" />
        <input 
          className="zen-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Initiate high-fidelity research inquiry..."
          disabled={isLoading}
        />
        <button type="submit" className="send-button" disabled={isLoading || !input.trim()}>
          <Send size={18} color="#000" />
        </button>
      </motion.form>
    </div>
  );
}

export default App;
