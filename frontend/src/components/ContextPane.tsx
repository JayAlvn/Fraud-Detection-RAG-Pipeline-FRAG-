import React, { useState, useRef } from 'react';
import { MoreHorizontalIcon, FileIcon, XIcon, UploadIcon } from './Icons';

type Doc = { id: string; name: string; chunks: number };
type Usage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  context_window: number;
};

type ContextPaneProps = {
  documents: Doc[];
  setDocuments: React.Dispatch<React.SetStateAction<Doc[]>>;
  activeDoc: string | null;
  setActiveDoc: (name: string | null) => void;
  usage: Usage;
  tokensBurned: number;
};

export function ContextPane({
  documents,
  setDocuments,
  activeDoc,
  setActiveDoc,
  usage,
  tokensBurned,
}: ContextPaneProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:8000/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      // De-dupe by name (re-uploading the same file upserts in ChromaDB)
      setDocuments(prev => [
        ...prev.filter(d => d.name !== data.filename),
        { id: data.filename, name: data.filename, chunks: data.chunks_indexed },
      ]);
      setActiveDoc(data.filename); // auto-scope queries to the doc you just added
    } catch {
      alert('Upload failed — is the backend running?');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (e.target) e.target.value = '';
  };

  const removeDoc = async (name: string) => {
    try {
      await fetch(`http://localhost:8000/document/${encodeURIComponent(name)}`, { method: 'DELETE' });
    } catch {
      /* still remove from UI even if the network call fails */
    }
    setDocuments(prev => prev.filter(d => d.name !== name));
    if (activeDoc === name) setActiveDoc(null);
  };

  const selectDoc = (name: string) => setActiveDoc(activeDoc === name ? null : name);

  // ---- Real token dashboard values ----
  const total = usage.total_tokens;
  const windowSize = usage.context_window || 4096;
  const pct = windowSize > 0 ? Math.min(100, Math.round((total / windowSize) * 100)) : 0;
  const promptPct = windowSize > 0 ? Math.min(100, (usage.prompt_tokens / windowSize) * 100) : 0;
  const completionPct = windowSize > 0 ? Math.min(100, (usage.completion_tokens / windowSize) * 100) : 0;
  const available = Math.max(0, windowSize - total);

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto p-5"
      style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-main)' }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Context Window — real Ollama token usage from the last query */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            Context Window
          </h3>
          <button className="p-1 rounded-md" style={{ color: 'var(--text-muted)' }}>
            <MoreHorizontalIcon />
          </button>
        </div>

        <div className="h-1.5 w-full rounded-full overflow-hidden mb-2 flex" style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="h-full" style={{ width: `${promptPct}%`, backgroundColor: '#22c55e' }} />
          <div className="h-full" style={{ width: `${completionPct}%`, backgroundColor: '#3b82f6' }} />
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span>{total.toLocaleString()} / {windowSize.toLocaleString()} tokens</span>
          <span className="font-medium" style={{ color: pct > 80 ? '#ef4444' : '#22c55e' }}>{pct}%</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" />
              <span style={{ color: 'var(--text-muted)' }}>Prompt (context + question)</span>
            </div>
            <span className="tabular-nums">{usage.prompt_tokens.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
              <span style={{ color: 'var(--text-muted)' }}>Response (generated)</span>
            </div>
            <span className="tabular-nums">{usage.completion_tokens.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--border-color)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Available</span>
            </div>
            <span className="tabular-nums">{available.toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 flex justify-between text-sm" style={{ borderTop: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Session total burned</span>
          <span className="font-medium tabular-nums">{tokensBurned.toLocaleString()}</span>
        </div>
      </div>

      <hr style={{ borderColor: 'var(--border-color)' }} className="mb-5" />

      {/* Loaded Documents */}
      <div>
        <h3 className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
          Loaded Documents
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Click a document to scope queries to it
        </p>
        <div className="space-y-2">
          {documents.map(doc => {
            const isActive = doc.name === activeDoc;
            return (
              <div
                key={doc.id}
                onClick={() => selectDoc(doc.name)}
                className="flex items-center justify-between p-3 border rounded-xl cursor-pointer transition"
                style={{
                  borderColor: isActive ? 'var(--accent-color)' : 'var(--border-color)',
                  backgroundColor: 'var(--card-bg)',
                  boxShadow: isActive ? '0 0 0 1px var(--accent-color)' : undefined,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 border rounded-lg shrink-0" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
                    <FileIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{doc.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: isActive ? 'var(--accent-color)' : 'var(--text-muted)' }}>
                      {doc.chunks} chunks indexed{isActive ? ' · active' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeDoc(doc.name); }}
                  style={{ color: 'var(--text-muted)' }}
                  className="p-1 shrink-0"
                >
                  <XIcon />
                </button>
              </div>
            );
          })}

          {/* Upload dropzone */}
          <div
            className="mt-2 cursor-pointer rounded-xl border border-dashed py-6 px-4 text-center flex flex-col items-center gap-2 transition hover:opacity-70"
            style={{ borderColor: uploading ? 'var(--accent-color)' : 'var(--border-color)' }}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <div style={{ color: 'var(--text-muted)' }}>
              <UploadIcon />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {uploading ? 'Uploading…' : 'Drop file or click to add'}
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.txt,.md,.docx"
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}