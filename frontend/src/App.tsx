import React, { useEffect, useRef, useState } from 'react';
import { Group, Panel, Separator, type PanelImperativeHandle } from 'react-resizable-panels';
import { THEMES, ThemeColors } from './lib/themes';
import type { RetrievalItem, Message, Turn, Risk, Confidence, Usage } from './lib/utils';
import { useMachineStats, type Timings } from './lib/useMachineStats';
import { MessageSquareIcon } from './components/Icons';
import { FindingPane } from './components/FindingPane';
import { CitationPane } from './components/CitationPane';
import { ChatPane } from './components/ChatPane';
import { ContextPane } from './components/ContextPane';
import './App.css';

type Doc = { id: string; name: string; chunks: number };

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

  // Which answer the left-hand panes are showing. Follows the newest turn, but
  // clicking an older card in the transcript points it back at that one.
  const [activeTurnId, setActiveTurnId] = useState<number | null>(null);

  // Message identity has to survive list growth, so it can't be the array index.
  const nextId = useRef(0);

  // A query takes several seconds, so show the clock running rather than a dead label.
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [timings, setTimings] = useState<Timings | null>(null);

  // Polls fast while generating, slowly when idle.
  const machine = useMachineStats(loading);

  // The chat panel is collapsed rather than unmounted, so widths you drag survive the toggle.
  const chatPanel = useRef<PanelImperativeHandle | null>(null);
  const findingPanel = useRef<PanelImperativeHandle | null>(null);

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

  // Collapsing has to go through the panel, not just the pane's own markup:
  // inside a resizable Group the library owns the height, so hiding the body
  // alone leaves the header stranded above the space it used to fill.
  const toggleFinding = () => {
    const panel = findingPanel.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setFindingCollapsed(false);
    } else {
      panel.collapse();
      setFindingCollapsed(true);
    }
  };

  /** Repoint the panes at an answer already in the transcript. No refetch --
   *  every turn keeps its own evidence, so this is pure local state. */
  const restoreTurn = (message: Message) => {
    if (!message.turn || loading) return;
    const t = message.turn;
    setFinding(t.finding);
    setCitations(t.citations);
    setRetrieval(t.retrieval);
    setRisk(t.risk);
    setConfidence(t.confidence);
    setUsage(t.usage);
    setTimings(t.timings);
    setLastMs(t.ms);
    setError(null);
    setActiveTurnId(message.id);
  };

  const sendPrompt = async (prompt: string) => {
    const started = performance.now();
    setMessages(prev => [...prev, { id: ++nextId.current, role: 'user', content: prompt }]);
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

      // Assembled once, then used for both the live panes and the transcript
      // card, so the two can never drift apart.
      const turn: Turn = {
        finding: data.finding,
        citations: data.sources ?? [],
        retrieval: data.retrieval ?? [],
        risk: {
          level: data.risk_level ?? '',
          score: data.risk_score ?? 0,
          factors: data.factors ?? [],
        },
        confidence: { level: data.confidence_level ?? '', score: data.confidence ?? 0 },
        usage: data.usage ?? EMPTY_USAGE,
        timings: data.timings ?? null,
        ms: performance.now() - started,
      };

      setFinding(turn.finding);
      setCitations(turn.citations);
      setRetrieval(turn.retrieval);
      setRisk(turn.risk);
      setConfidence(turn.confidence);
      setTimings(turn.timings);
      setUsage(turn.usage);
      setTokensBurned(t => t + (turn.usage.total_tokens ?? 0));

      const id = ++nextId.current;
      setMessages(prev => [...prev, { id, role: 'assistant', content: turn.finding, turn }]);
      setActiveTurnId(id);
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
      // No turn attached: a failed query has no evidence to restore, which is
      // what keeps the error bubble unclickable.
      setMessages(prev => [...prev, { id: ++nextId.current, role: 'assistant', content: `Error: ${msg}` }]);
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

        {/* Left: Finding (top) + Citations (bottom), independently resizable */}
        <Panel id="left" defaultSize={40} minSize={20} className="min-w-0">
          <Group orientation="vertical" className="h-full w-full">
            <Panel
              id="finding"
              defaultSize={45}
              minSize={15}
              collapsible
              // Leaves the header row visible when collapsed, so the chevron
              // stays reachable. String sizes take CSS units.
              collapsedSize="56px"
              panelRef={findingPanel}
              // Dragging the divider past minSize collapses the panel too, so
              // read the collapsed state back rather than trusting the button.
              onResize={() => {
                const panel = findingPanel.current;
                if (panel) setFindingCollapsed(panel.isCollapsed());
              }}
              className="overflow-hidden"
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
                onToggleCollapse={toggleFinding}
              />
            </Panel>

            <Separator className="panel-separator panel-separator-vertical" />

            <Panel id="citations" defaultSize={55} minSize={15} className="overflow-hidden">
              <CitationPane citations={citations} retrieval={retrieval} />
            </Panel>
          </Group>
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
            onSelectTurn={restoreTurn}
            activeTurnId={activeTurnId}
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
