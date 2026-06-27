import { RetrievalChart } from './RetrievalChart';

type RetrievalItem = { source: string; score: number };

type CitationPaneProps = {
  citations: string[];
  retrieval: RetrievalItem[];
  accent: string;
};

export function CitationPane({ citations, retrieval, accent }: CitationPaneProps) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden p-5"
      style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-main)' }}
    >
      <h3
        className="text-[11px] font-semibold tracking-widest uppercase mb-3 shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        Retrieved Citations
      </h3>

      <div className="flex-1 overflow-auto min-h-0">
        
        {retrieval.length > 0 && (
          <div className="mb-4">
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Retrieval Relevance
            </p>
            <RetrievalChart data={retrieval} color={accent} />
          </div>
        )}

        {citations.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Ask a question to see the passages used.
          </p>
        ) : (
          <div className="space-y-2">
            {citations.map((passage, idx) => (
              <div
                key={idx}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 p-3 rounded-xl border"
                style={{
                  animationDelay: `${idx * 80}ms`,
                  animationFillMode: 'both',
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--card-bg)',
                }}
              >
                <p
                  className="text-[15px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--accent-color)' }}
                >
                  Source {idx + 1}
                </p>
                <p
                  className="text-[20px] leading-relaxed break-words"
                  style={{ color: 'var(--text-main)', overflowWrap: 'anywhere' }}
                >
                  {passage}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}