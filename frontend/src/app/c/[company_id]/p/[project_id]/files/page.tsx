"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getApi, authHeaders } from "@/lib/siteflow";
import Icon from "@/components/marketing/Icon";

// ─── Types ────────────────────────────────────────────────────────────────────
type Folder = { id: string; project_id: string; parent_id: string | null; name: string };
type FileMeta = {
  id: string;
  project_id: string;
  folder_id: string | null;
  name: string;
  original_filename: string;
  content_type: string | null;
  size: number;
  uploaded_at: string;
};

type Crumb = { id: string | null; name: string };

const fmtSize = (n: number) => {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const ext = (name: string) => (name.includes(".") ? name.split(".").pop()!.toUpperCase().slice(0, 4) : "FILE");

export default function FilesTab() {
  const params = useParams();
  const companyId = params.company_id as string;
  const projectId = params.project_id as string;

  const [path, setPath] = useState<Crumb[]>([{ id: null, name: "Root" }]);
  const currentFolderId = path[path.length - 1].id;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<FileMeta | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fRes, fiRes] = await Promise.all([
        fetch(getApi(`/files/folders?project_id=${projectId}${currentFolderId ? `&parent_id=${currentFolderId}` : ""}`), {
          headers: authHeaders(),
        }),
        fetch(getApi(`/files/files?project_id=${projectId}${currentFolderId ? `&folder_id=${currentFolderId}` : ""}`), {
          headers: authHeaders(),
        }),
      ]);
      if (!fRes.ok) throw new Error(`Folders ${fRes.status}`);
      if (!fiRes.ok) throw new Error(`Files ${fiRes.status}`);
      setFolders(await fRes.json());
      setFiles(await fiRes.json());
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [projectId, currentFolderId]);

  useEffect(() => {
    load();
  }, [load]);

  const navigate = (folder: Folder) => setPath((p) => [...p, { id: folder.id, name: folder.name }]);
  const jumpTo = (idx: number) => setPath((p) => p.slice(0, idx + 1));

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    setSavingFolder(true);
    setError(null);
    try {
      const res = await fetch(getApi("/files/folders"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ project_id: projectId, parent_id: currentFolderId, name }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Error ${res.status}`);
      }
      setShowNewFolder(false);
      setNewFolderName("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to create folder");
    } finally {
      setSavingFolder(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of Array.from(list)) {
        const body = new FormData();
        body.append("project_id", projectId);
        if (currentFolderId) body.append("folder_id", currentFolderId);
        body.append("file", f);
        const res = await fetch(getApi("/files/upload"), { method: "POST", body, headers: authHeaders() });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Upload failed ${res.status}`);
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isPdf = (f: FileMeta) => (f.content_type || "").includes("pdf");
  const previewSrc = useMemo(
    () => (preview ? getApi(`/files/file/${preview.id}`) : ""),
    [preview]
  );
  const downloadSrc = useMemo(
    () => (preview ? getApi(`/files/file/${preview.id}?download=1`) : ""),
    [preview]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-14 border-b border-border-custom bg-card px-6 flex items-center justify-between shrink-0">
        <h1 className="text-sm font-bold text-foreground">Documents</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="px-3 py-1.5 bg-elevated text-muted text-xs font-bold rounded-lg hover:bg-elevated transition-all"
          >
            + New Folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-40"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onUpload} />
        </div>
      </header>

      <div className="px-5 py-2 border-b border-border-custom shrink-0 flex items-center gap-1 text-[11px] text-muted">
        {path.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted">/</span>}
            <button
              onClick={() => jumpTo(i)}
              className={i === path.length - 1 ? "text-primary font-semibold" : "hover:text-foreground"}
            >
              {c.name}
            </button>
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-5">
        {loading && <div className="p-10 text-center text-muted text-xs">Loading documents…</div>}
        {error && !loading && <div className="p-10 text-center text-rose-400 text-xs">{error}</div>}
        {!loading && !error && folders.length === 0 && files.length === 0 && (
          <div className="p-10 text-center text-muted text-xs">
            This folder is empty. Create a <span className="text-primary font-bold">New Folder</span> or{" "}
            <span className="text-primary font-bold">Upload</span> a document.
          </div>
        )}

        {!loading && !error && (folders.length > 0 || files.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(f)}
                className="group rounded-lg border border-border-custom bg-card p-3 text-left hover:border-primary/50 transition-colors"
              >
                <div className="text-2xl mb-2 inline-flex"><Icon name="folder" className="w-6 h-6" /></div>
                <div className="text-xs text-foreground font-medium truncate">{f.name}</div>
                <div className="text-[9px] text-muted mt-0.5">Folder</div>
              </button>
            ))}
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => setPreview(f)}
                className="group rounded-lg border border-border-custom bg-card p-3 text-left hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl inline-flex"><Icon name="description" className="w-6 h-6" /></span>
                  <span className="text-[8px] uppercase px-1 py-0.5 rounded bg-elevated text-muted">
                    {ext(f.name)}
                  </span>
                </div>
                <div className="text-xs text-foreground font-medium truncate">{f.name}</div>
                <div className="text-[9px] text-muted mt-0.5">{fmtSize(f.size)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border-custom bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">New Folder</h3>
              <button onClick={() => setShowNewFolder(false)} className="text-muted hover:text-foreground">
                ✕
              </button>
            </div>
            <form onSubmit={createFolder} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted">Folder Name</label>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Structural Drawings"
                  className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted"
                />
              </div>
              {error && <div className="text-[11px] text-rose-400">{error}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolder(false)}
                  className="px-4 py-2 bg-elevated text-muted text-sm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFolder}
                  className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg disabled:opacity-40"
                >
                  {savingFolder ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl h-[88vh] rounded-lg border border-border-custom bg-card flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{preview.name}</div>
                <div className="text-[10px] text-muted">{fmtSize(preview.size)}</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={downloadSrc}
                  className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90"
                >
                  Download
                </a>
                <button onClick={() => setPreview(null)} className="text-muted hover:text-foreground text-lg">
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 bg-elevated overflow-hidden">
              {isPdf(preview) ? (
                <iframe src={previewSrc} title={preview.name} className="w-full h-full border-0" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-6">
                  <div className="text-5xl inline-flex"><Icon name="description" className="w-12 h-12" /></div>
                  <div className="text-sm text-muted">Preview not available for this file type.</div>
                  <a
                    href={downloadSrc}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90"
                  >
                    Download {ext(preview.name)}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
