import React, { useEffect, useRef, useState } from 'react';
import { Group, Panel, Separator, type PanelImperativeHandle } from 'react-resizable-panels';
import { THEMES, ThemeColors } from './lib/themes';
import type { RetrievalItem } from './lib/utils';
import { useMachineStats, type Timings } from './lib/useMachineStats';
import { MessageSquareIcon } from './components/Icons';
import { FindingPane } from './components/FindingPane';
import { CitationPane } from './components/CitationPane';
import { ChatPane } from './components/ChatPane';
import { ContextPane } from './components/ContextPane';
import './App.css';

type Message = { role: 'user' | 'assistant'; content: string };
type Risk = { level: string; score: number; factors: { name: string; weight: number }[] };
type Doc = { id: string; name: string; chunks: number };
type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens: number; context_window: number };
type Confidence = { level: string; score: number };

const EMPTY_USAGE: Usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, context_window: 4096 };

function App() {
  const [theme, setTheme] = useState<ThemeColors>(THEMES[0].colors);
  const [finding, setFinding] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [retrieval, setRetrieval] = useState<RetrievalItem[]>([]);
  const [risk, setRisk] = useState<Risk>({ level: '', score: 0, factors: [] });
  const [confidence, setConfidence] = useState<Confidence>({ level: '', score: 0 });
  const [mode, setMode] = useState<'naive' | 'basic'>('basic');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatVisible, setChatVisible] = useState(true);
  const [findingCollapsed, setFindingCollapsed] = useState(false);
  const [sourceCount, setSourceCount] = useState(6);

  // A query takes several seconds, so show the clock running rather than a dead label.
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [timings, setTimings] = useState<Timings | null>(null);

  // Polls fast while generating, slowly when idle.
  const machine = useMachineStats(loading);

  // The chat panel is collapsed rather than unmounted, so widths you drag survive the toggle.
  const chatPanel = useRef<PanelImperativeHandle | null>(null);

  // Lifted up from ContextPane so they survive the chat-toggle remount:
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  // Real token usage from Ollama:
  const [usage, setUsage] = useState<Usage>(EMPTY_USAGE);
  const [tokensBurned, setTokensBurned] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const started = performance.now();
    setElapsedMs(0);
    const id = setInterval(() => setElapsedMs(performance.now() - started), 100);
    return () => clearInterval(id);
  }, [loading]);

  const toggleChat = () => {
    const panel = chatPanel.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setChatVisible(true);
    } else {
      panel.collapse();
      setChatVisible(false);
    }
  };

  const sendPrompt = async (prompt: string) => {
    const started = performance.now();
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setLoading(true);
    setFinding('');
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: prompt, mode, source: activeDoc, n: sourceCount }),
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
      setConfidence({ level: data.confidence_level ?? '', score: data.confidence ?? 0 });
      setTimings(data.timings ?? null);
      const u: Usage = data.usage ?? EMPTY_USAGE;
      setUsage(u);
      setTokensBurned(t => t + (u.total_tokens ?? 0));
      setMessages(prev => [...prev, { role: 'assistant', content: data.finding }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setFinding('');
      setCitations([]);
      setRetrieval([]);
      setRisk({ level: '', score: 0, factors: [] });
      setConfidence({ level: '', score: 0 });
      setUsage(EMPTY_USAGE);
      setTimings(null);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setLastMs(performance.now() - started);
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
            onClick={toggleChat}
            className="p-1.5 rounded transition-all"
            style={chatVisible
              ? { backgroundColor: 'var(--panel-bg)', color: 'var(--text-main)' }
              : { color: 'var(--text-muted)' }}
            title="Toggle Chat"
            aria-label={chatVisible ? 'Hide chat' : 'Show chat'}
            aria-pressed={chatVisible}
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
                aria-label={`${t.name} theme`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <Group orientation="horizontal" className="h-full w-full">

        {/* Left: Finding (top half) + Citations (bottom half) */}
        <Panel id="left" defaultSize={40} minSize={20} className="min-w-0">
          <div className="flex flex-col h-full">
            <div
              className={findingCollapsed ? 'shrink-0 overflow-hidden' : 'flex-1 min-h-0 overflow-hidden'}
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <FindingPane
                finding={finding}
                error={error}
                loading={loading}
                elapsedMs={elapsedMs}
                mode={mode}
                risk={risk}
                confidence={confidence}
                accent={theme.accent}
                collapsed={findingCollapsed}
                onToggleCollapse={() => setFindingCollapsed(v => !v)}
              />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <CitationPane citations={citations} retrieval={retrieval} />
            </div>
          </div>
        </Panel>

        <Separator
          className="panel-separator"
          style={chatVisible ? undefined : { display: 'none' }}
        />
        <Panel
          id="chat"
          defaultSize={35}
          minSize={20}
          collapsible
          collapsedSize={0}
          panelRef={chatPanel}
          // Dragging past minSize collapses the panel too, so track the real
          // size rather than assuming the toolbar button is the only way in.
          onResize={(size) => setChatVisible(size.asPercentage > 0)}
          className="min-w-0"
          style={chatVisible
            ? { borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }
            : undefined}
        >
          <ChatPane
            messages={messages}
            onSend={sendPrompt}
            loading={loading}
            mode={mode}
            setMode={setMode}
            activeDoc={activeDoc}
            sourceCount={sourceCount}
            setSourceCount={setSourceCount}
            modelLoaded={machine?.model ? machine.model.loaded : null}
          />
        </Panel>

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
            lastMs={lastMs}
            machine={machine}
            timings={timings}
          />
        </Panel>

      </Group>
    </div>
  );
}

export default App;
