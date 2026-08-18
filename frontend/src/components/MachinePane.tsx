import { tidyCpu, type MachineStats, type Timings } from '../lib/useMachineStats';

const GREEN = '#22c55e';
const BLUE = '#3b82f6';
const AMBER = '#f59e0b';

function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      className="h-1.5 w-full rounded-full overflow-hidden"
      style={{ backgroundColor: 'var(--card-bg)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function MachinePane({
  machine,
  timings,
}: {
  machine: MachineStats | null;
  timings: Timings | null;
}) {
  if (!machine) return null;

  const { specs, gpu, cpu, model } = machine;
  const total = timings ? timings.retrieval_ms + timings.generation_ms : 0;

  return (
    <div>
      <h3
        className="text-[11px] font-semibold tracking-widest uppercase mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Machine
      </h3>

      {/* Static identity — what this pipeline is actually running on. */}
      <div className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
        <p style={{ color: 'var(--text-main)' }}>
          {tidyCpu(specs.cpu)} · {specs.cores} cores
        </p>
        <p style={{ color: 'var(--text-main)' }}>
          {specs.gpu
            ? `${specs.gpu} · ${((specs.vram_total_mb ?? 0) / 1024).toFixed(1)} GB VRAM`
            : 'No CUDA GPU — running on CPU'}
        </p>
        <p>{specs.ram_total_gb} GB RAM · {specs.os}</p>
      </div>

      {/* Live load */}
      {gpu && (
        <div className="mb-3 space-y-1.5">
          <Row label="GPU" value={`${gpu.util}%`} />
          <Meter pct={gpu.util} color={GREEN} />
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="tabular-nums">
              {(gpu.vram_used_mb / 1024).toFixed(1)} / {(gpu.vram_total_mb / 1024).toFixed(1)} GB
            </span>
            <span className="tabular-nums">{gpu.temp_c}°C</span>
          </div>
        </div>
      )}

      <div className="mb-3 space-y-1.5">
        <Row label="CPU" value={`${cpu.util.toFixed(0)}%`} />
        <Meter pct={cpu.util} color={BLUE} />
        <div className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {cpu.ram_used_gb} / {cpu.ram_total_gb} GB RAM
        </div>
      </div>

      {/* Model residency — the real explanation for generation speed. */}
      {model && (
        <div
          className="rounded-lg p-2.5 text-xs mb-4"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: `1px solid ${model.loaded ? 'var(--border-color)' : AMBER}`,
          }}
        >
          {model.loaded ? (
            <>
              <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                {model.name}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}· {model.size_gb} GB · {model.gpu_percent}% on GPU
              </span>
              {(model.gpu_percent ?? 100) < 100 && (
                <p className="mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {100 - (model.gpu_percent ?? 0)}% of layers offloaded to system RAM —
                  generation throughput is bound by CPU memory bandwidth rather than the GPU.
                </p>
              )}
            </>
          ) : (
            <span style={{ color: AMBER }}>
              Model not loaded — the next query spends ~10s reloading it first.
            </span>
          )}
        </div>
      )}

      {/* Where the last query's time actually went. */}
      {timings && total > 0 && (
        <div>
          <h4
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Last query
          </h4>
          <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-2"
            style={{ backgroundColor: 'var(--card-bg)' }}>
            <div style={{ width: `${(timings.retrieval_ms / total) * 100}%`, backgroundColor: GREEN }} />
            <div style={{ width: `${(timings.generation_ms / total) * 100}%`, backgroundColor: BLUE }} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: GREEN }} />
                <span style={{ color: 'var(--text-muted)' }}>Retrieval</span>
              </div>
              <span className="font-semibold tabular-nums">
                {(timings.retrieval_ms / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: BLUE }} />
                <span style={{ color: 'var(--text-muted)' }}>Generation</span>
              </div>
              <span className="font-semibold tabular-nums">
                {(timings.generation_ms / 1000).toFixed(2)}s
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
