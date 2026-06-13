'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import { TokenStorage } from '@/lib/api/client';
import { useDashboard } from '@/lib/hooks';
import { formatINR } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
let msgId = 0;
const id = () => String(++msgId);

const QUICK = [
  'Should I choose old or new tax regime?',
  'How do I claim 80C deductions?',
  'What is the ITR filing deadline?',
  'Explain advance tax installments',
];

function formatMessageContent(content: string) {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const italicParts = part.split(/(\*.*?\*)/g);
    return italicParts.map((subPart, subIndex) => {
      if (subPart.startsWith('*') && subPart.endsWith('*')) {
        return (
          <em key={`${index}-${subIndex}`} className="italic">
            {subPart.slice(1, -1)}
          </em>
        );
      }
      return subPart;
    });
  });
}

export default function ChatPage() {
  const [msgs, setMsgs] = useState<ChatMessage[]>([{
    id: id(), role: 'assistant', content: "Hi! I'm your TaxAI assistant. I can help you with Indian income tax, GST, deductions, and filing. What would you like to know?", createdAt: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: dashboard } = useDashboard();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, streamText]);

  const context = useCallback(() => {
    if (!dashboard?.taxSummary) return {};
    return {
      taxSummary: dashboard.taxSummary.totalTax != null
        ? `Tax: ${formatINR(dashboard.taxSummary.totalTax)}, Regime: ${dashboard.taxSummary.recommendedRegime}, Rate: ${dashboard.taxSummary.effectiveTaxRate}%`
        : undefined,
      filingStatus: dashboard.activeFiling?.status ? `Filing: ${dashboard.activeFiling.status}` : undefined,
    };
  }, [dashboard]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { id: id(), role: 'user', content: text, createdAt: new Date() };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setStreamText('');

    const history = msgs.slice(-10).map(m => ({ role: m.role, content: m.content }));
    const token = TokenStorage.getAccess();

    try {
      const res = await fetch(`${API_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history, ...context() }),
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6);
          if (json === '[DONE]') break;
          try { const { token: t } = JSON.parse(json); if (t) { full += t; setStreamText(full); } } catch { /* skip */ }
        }
      }
      setMsgs(prev => [...prev, { id: id(), role: 'assistant', content: full, createdAt: new Date() }]);
    } catch {
      setMsgs(prev => [...prev, { id: id(), role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', createdAt: new Date() }]);
    } finally {
      setStreaming(false);
      setStreamText('');
    }
  }, [msgs, streaming, context]);

  return (
    <div className="flex flex-col max-w-3xl h-[calc(100vh-7rem)] md:h-[calc(100vh-8.5rem)]">
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">AI Tax Assistant</h1>
        <p className="text-gray-500 text-sm mt-1">Ask anything about Indian tax, GST, or filing</p>
      </div>

      {/* Messages */}
      <div className="flex-1 card overflow-y-auto p-4 md:p-6 space-y-4 mb-4">
        {msgs.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[88%] md:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
              {formatMessageContent(msg.content)}
            </div>
          </div>
        ))}

        {streaming && streamText && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-gray-600" /></div>
            <div className="max-w-[88%] md:max-w-[80%] bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {formatMessageContent(streamText)}<span className="inline-block w-1 h-3.5 bg-gray-400 ml-0.5 cursor-blink" />
            </div>
          </div>
        )}
        {streaming && !streamText && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Bot className="w-4 h-4 text-gray-600" /></div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3"><Loader className="w-4 h-4 text-gray-400 animate-spin" /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {msgs.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
          {QUICK.map(p => (
            <button key={p} onClick={() => send(p)} className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-brand-400 hover:text-brand-700 transition-colors">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3 flex-shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Ask about tax, GST, deductions…"
          className="input flex-1"
          disabled={streaming}
        />
        <button onClick={() => send(input)} disabled={!input.trim() || streaming} className="btn-primary px-4 flex-shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}