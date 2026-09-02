import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { Upload, FileText, Trash2, Download, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useUserPrefs } from "@/lib/user-prefs";

export const Route = createFileRoute("/files")({
  head: () => ({ meta: [{ title: "Files — Metrixcom" }] }),
  component: FilesPage,
});

interface FileRow {
  id: string;
  name: string;
  mime: string | null;
  size_bytes: number;
  storage_path: string;
  created_at: string;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function FilesPage() {
  const { user } = useAuth();
  const { formatDateTime } = useUserPrefs();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setFiles((data as FileRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || !user) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 20MB limit`);
        continue;
      }
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("user-files")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}`);
        continue;
      }
      const { error: insErr } = await supabase.from("files").insert({
        user_id: user.id,
        name: file.name,
        mime: file.type || null,
        size_bytes: file.size,
        storage_path: path,
      });
      if (insErr) toast.error(insErr.message);
    }
    setUploading(false);
    toast.success("Files uploaded");
    load();
  }

  async function handleDelete(f: FileRow) {
    if (!confirm(`Delete ${f.name}?`)) return;
    await supabase.storage.from("user-files").remove([f.storage_path]);
    await supabase.from("files").delete().eq("id", f.id);
    toast.success("File deleted");
    load();
  }

  async function handleDownload(f: FileRow) {
    const { data, error } = await supabase.storage
      .from("user-files")
      .createSignedUrl(f.storage_path, 60);
    if (error || !data) return toast.error("Download failed");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <PageShell title="Files" description="Documents, images and data attached to your conversations.">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      <div className="min-h-0 -webkit-overflow-scrolling-touch pointer-events-auto">
      <div
        ref={dropRef}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleUpload(e.dataTransfer.files);
        }}
        className="rounded-xl border border-dashed border-border-strong bg-surface p-14 text-center cursor-pointer hover:bg-surface-elevated transition-colors"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 mx-auto text-muted-foreground animate-spin" />
        ) : (
          <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
        )}
        <p className="mt-3 text-[14px]">Drag & drop files, or click to browse</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Max 20MB per file · stored securely
        </p>
      </div>

      <div className="mt-8">
        <h2 className="text-[12px] uppercase tracking-wider text-muted-foreground mb-3">
          Your files ({files.length})
        </h2>
        {loading ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted-foreground text-[13px]">
            Loading…
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted-foreground text-[13px]">
            No files yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            {files.map((f) => (
              <div
                key={f.id}
                className="group flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-elevated"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-[13.5px] truncate flex-1">{f.name}</span>
                <span className="text-[11.5px] text-muted-foreground shrink-0">
                  {formatBytes(f.size_bytes)}
                </span>
                <span
                  className="text-[11.5px] text-muted-foreground shrink-0 hidden sm:inline"
                  title={formatDateTime(f.created_at)}
                >
                  {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                </span>
                <button
                  onClick={() => handleDownload(f)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1.5 rounded-md"
                  aria-label="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(f)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1.5 rounded-md"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </PageShell>
  );
}
