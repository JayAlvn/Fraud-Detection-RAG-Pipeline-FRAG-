import { RiskGauge } from './RiskGauge';
import { ConfidenceGauge } from './ConfidenceGauge';
import { FactorsChart } from './FactorsChart';
import { ChevronUpIcon, ChevronDownIcon } from './Icons';
import type { Risk, Confidence } from '../lib/utils';


type FindingPaneProps = {
  finding: string;
  error: string | null;
  loading: boolean;
  elapsedMs: number;
  mode: 'naive' | 'basic';
  risk: Risk;
  confidence: Confidence;
  accent: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

function levelColor(level: string): string {
  if (level === 'high') return '#ef4444';
  if (level === 'medium') return '#f59e0b';
  return '#22c55e';
}

export function FindingPane({
  finding, error, loading, elapsedMs, mode, risk, confidence, accent,
  collapsed, onToggleCollapse,
}: FindingPaneProps) {
  // Risk is produced by the LLM, so only basic mode has it. Confidence comes from
  // retrieval distances, which both modes have.
  const showRisk = mode === 'basic' && !loading && !!finding;
  const showConfidence = !loading && !!finding;

  return (
    <div className="flex h-full flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-main)' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-4 shrink-0">
        <h3 className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          Finding
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--card-bg)', color: accent, border: '1px solid var(--border-color)' }}>
            {mode}
          </span>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded transition-all"
            style={{ color: 'var(--text-muted)' }}
            title={collapsed ? 'Expand Finding' : 'Collapse Finding'}
            aria-label={collapsed ? 'Expand Finding' : 'Collapse Finding'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-auto min-h-0 px-5 pb-5">
          {loading ? (
            <div className="flex items-baseline gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <span className="animate-pulse">Searching…</span>
              <span className="text-xs tabular-nums">{(elapsedMs / 1000).toFixed(1)}s</span>
            </div>
          ) : error ? (
            <div
              className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-xl p-4"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid #ef4444' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#ef4444' }}>
                Request failed
              </p>
              <p className="text-sm" style={{ color: 'var(--text-main)', overflowWrap: 'anywhere' }}>
                {error}
              </p>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Check the backend is running on localhost:8000.
              </p>
            </div>
          ) : finding ? (
            <>
              <div key={finding}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-xl p-4 text-[15px] font-medium leading-relaxed"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', overflowWrap: 'anywhere' }}>
                {finding}
              </div>

              {showConfidence && (
                <div className="mt-4 flex flex-wrap items-start gap-8">
                  {showRisk && (
                    <div className="flex flex-col items-center gap-1.5">
                      <RiskGauge score={risk.score} level={risk.level} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Risk
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-1.5">
                    <ConfidenceGauge score={confidence.score} level={confidence.level} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Confidence
                    </span>
                  </div>
                </div>
              )}

              {showRisk && (
                <div className="mt-4">
                  <FactorsChart data={risk.factors} color={levelColor(risk.level)} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Ask a question to see the result here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
