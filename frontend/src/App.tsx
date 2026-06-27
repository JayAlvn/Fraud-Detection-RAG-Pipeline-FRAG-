import React, { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { THEMES, ThemeColors } from './lib/themes';
import { MessageSquareIcon } from './components/Icons';
import { FindingPane } from './components/FindingPane';
import { CitationPane } from './components/CitationPane';
import { ChatPane } from './components/ChatPane';
import { ContextPane } from './components/ContextPane';
import './App.css';

type Message = { role: 'user' | 'assistant'; content: string };
type Retrieval = { source: string; score: number };
type Risk = { level: string; score: number; factors: { name: string; weight: number }[] };
type Doc = { id: string; name: string; chunks: number };
type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens: number; context_window: number };

const EMPTY_USAGE: Usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, context_window: 4096 };

function App() {
  const [theme, setTheme] = useState<ThemeColors>(THEMES[0].colors);
  const [finding, setFinding] = useState('');
  const [citations, setCitations] = useState<string[]>([]);
  const [retrieval, setRetrieval] = useState<Retrieval[]>([]);
  const [risk, setRisk] = useState<Risk>({ level: '', score: 0, factors: [] });
  const [mode, setMode] = useState<'naive' | 'basic'>('naive');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatVisible, setChatVisible] = useState(true);
  const [layoutKey, setLayoutKey] = useState(0);

  // Lifted up from ContextPane so they survive the chat-toggle remount:
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  // Real token usage from Ollama:
  const [usage, setUsage] = useState<Usage>(EMPTY_USAGE);
  const [tokensBurned, setTokensBurned] = useState(0);

  const sendPrompt = async (prompt: string) => {
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setLoading(true);
    setFinding('');
    try {
      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: prompt, mode, source: activeDoc }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`HTTP ${res.status} — ${detail}`);
      }
      const data = await res.json();
      setFinding(data.finding);
      setCitations(data.sources ?? []);
      setRetrieval(data.retrieval ?? []);
      setRisk({
        level: data.risk_level ?? '',
        score: data.risk_score ?? 0,
        factors: data.factors ?? [],
      });
      const u: Usage = data.usage ?? EMPTY_USAGE;
      setUsage(u);
      setTokensBurned(t => t + (u.total_tokens ?? 0));
      setMessages(prev => [...prev, { role: 'assistant', content: data.finding }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setFinding(`Error: ${msg}`);
      setCitations([]);
      setRetrieval([]);
      setRisk({ level: '', score: 0, factors: [] });
      setUsage(EMPTY_USAGE);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative h-screen w-screen overflow-hidden transition-colors duration-200"
      style={{
        backgroundColor: 'var(--app-bg)',
        '--app-bg': theme.bg,
        '--panel-bg': theme.panelBg,
        '--card-bg': theme.cardBg,
        '--text-main': theme.text,
        '--text-muted': theme.textMuted,
        '--border-color': theme.border,
        '--accent-color': theme.accent,
        '--accent-text': theme.accentText,
      } as React.CSSProperties}
    >
      {/* Toolbar */}
      <div className="absolute top-1.5 right-4 z-50">
        <div
          className="flex items-center gap-1 p-1 rounded-lg border shadow-sm backdrop-blur-md"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => { setChatVisible(v => !v); setLayoutKey(k => k + 1); }}
            className="p-1.5 rounded transition-all"
            style={chatVisible
              ? { backgroundColor: 'var(--panel-bg)', color: 'var(--text-main)' }
              : { color: 'var(--text-muted)' }}
            title="Toggle Chat"
          >
            <MessageSquareIcon />
          </button>
          <div className="w-px h-4 self-center mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
          <div className="flex items-center gap-1.5 px-1">
            {THEMES.map((t) => (
              <button
                key={t.name}
                onClick={() => setTheme(t.colors)}
                className="w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 focus:outline-none"
                style={{
                  background: `linear-gradient(135deg, ${t.colors.bg} 50%, ${t.colors.panelBg} 50%)`,
                  borderColor: theme.bg === t.colors.bg ? 'var(--text-main)' : 'rgba(0,0,0,0.15)',
                }}
                title={t.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <Group key={layoutKey} orientation="horizontal" className="h-full w-full">

        {/* Left: Finding (top half) + Citations (bottom half) */}
        <Panel id="left" defaultSize={40} minSize={20} className="min-w-0">
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0 overflow-hidden" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <FindingPane
                finding={finding}
                loading={loading}
                mode={mode}
                risk={risk}
                accent={theme.accent}
              />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <CitationPane
                citations={citations}
                retrieval={retrieval}
                accent={theme.accent}
              />
            </div>
          </div>
        </Panel>

        {chatVisible && <Separator className="panel-separator" />}
        {chatVisible && (
          <Panel
            id="chat"
            defaultSize={35}
            minSize={20}
            className="min-w-0"
            style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}
          >
            <ChatPane
              messages={messages}
              onSend={sendPrompt}
              loading={loading}
              mode={mode}
              setMode={setMode}
            />
          </Panel>
        )}

        <Separator className="panel-separator" />

        {/* Right: Files + Context Window */}
        <Panel id="files" defaultSize={25} minSize={15} className="min-w-0">
          <ContextPane
            documents={documents}
            setDocuments={setDocuments}
            activeDoc={activeDoc}
            setActiveDoc={setActiveDoc}
            usage={usage}
            tokensBurned={tokensBurned}
          />
        </Panel>

      </Group>
    </div>
  );
}

export default App;