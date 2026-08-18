export function EmptyPane() {
  return (
    <div
      className="relative flex h-full min-h-0 min-w-0 items-center justify-center overflow-hidden"
      style={{ backgroundColor: 'var(--panel-bg)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Left pane (empty for now)</p>
    </div>
  );
}