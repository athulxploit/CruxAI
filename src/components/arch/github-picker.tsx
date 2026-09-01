import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Search as SearchIcon,
  Folder,
  File as FileIcon,
  ChevronLeft,
  Github,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  listGithubRepos,
  listGithubContents,
  importGithubFile,
  type GithubRepo,
  type GithubContentItem,
} from "@/lib/github.functions";

export interface GithubPickedAttachment {
  name: string;
  size: number;
  path: string;
  mime: string;
}

export function GithubPicker({
  open,
  onOpenChange,
  onPicked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPicked?: (a: GithubPickedAttachment) => void;
}) {
  const [query, setQuery] = useState("");
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [repo, setRepo] = useState<GithubRepo | null>(null);
  const [path, setPath] = useState("");
  const [items, setItems] = useState<GithubContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  const listRepos = useServerFn(listGithubRepos);
  const listContents = useServerFn(listGithubContents);
  const importFn = useServerFn(importGithubFile);

  useEffect(() => {
    if (!open || repo) return;
    let cancelled = false;
    setLoading(true);
    listRepos({ data: { query: query.trim() || undefined } })
      .then((r) => !cancelled && setRepos(r.repos))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load repos"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, query, repo, listRepos]);

  useEffect(() => {
    if (!open || !repo) return;
    let cancelled = false;
    setLoading(true);
    listContents({ data: { fullName: repo.full_name, path, ref: repo.default_branch } })
      .then((r) => !cancelled && setItems(r.items))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load contents"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, repo, path, listContents]);

  useEffect(() => {
    if (!open) {
      setRepo(null);
      setPath("");
      setItems([]);
      setQuery("");
    }
  }, [open]);

  async function pickFile(f: GithubContentItem) {
    if (!repo) return;
    setImporting(f.sha);
    try {
      const a = await importFn({
        data: {
          fullName: repo.full_name,
          path: f.path,
          ref: repo.default_branch,
          name: f.name,
        },
      });
      toast.success(`${a.name} imported`);
      onPicked?.(a);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(null);
    }
  }

  function goUp() {
    if (!path) {
      setRepo(null);
      return;
    }
    const parts = path.split("/");
    parts.pop();
    setPath(parts.join("/"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Github className="h-4 w-4" /> GitHub
          </DialogTitle>
          <DialogDescription>
            {repo
              ? `${repo.full_name}${path ? " / " + path : ""}`
              : "Pick a repository to browse and attach a file to your chat."}
          </DialogDescription>
        </DialogHeader>

        {repo ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goUp}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {path ? "Up" : "Repos"}
            </Button>
            <div className="text-[12px] text-muted-foreground truncate">
              {repo.default_branch}
            </div>
          </div>
        ) : (
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your repos…"
              className="pl-9"
            />
          </div>
        )}

        <div className="max-h-80 overflow-y-auto -mx-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : !repo ? (
            repos.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-muted-foreground">
                No repositories.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {repos.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => {
                        setRepo(r);
                        setPath("");
                      }}
                      className="w-full flex items-center gap-3 px-2 py-2.5 text-left hover:bg-secondary/60 rounded-lg"
                    >
                      <Github className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] truncate flex items-center gap-1.5">
                          {r.full_name}
                          {r.private && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {r.description ?? r.language ?? "—"}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-muted-foreground">
              Empty folder.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((f) => (
                <li key={f.sha}>
                  <button
                    disabled={!!importing}
                    onClick={() =>
                      f.type === "dir"
                        ? setPath(f.path)
                        : f.type === "file"
                          ? pickFile(f)
                          : undefined
                    }
                    className="w-full flex items-center gap-3 px-2 py-2.5 text-left hover:bg-secondary/60 rounded-lg disabled:opacity-60"
                  >
                    {f.type === "dir" ? (
                      <Folder className="h-4 w-4 shrink-0" />
                    ) : (
                      <FileIcon className="h-4 w-4 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] truncate">{f.name}</div>
                      {f.type === "file" && f.size > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          {f.size < 1024
                            ? `${f.size} B`
                            : `${(f.size / 1024).toFixed(1)} KB`}
                        </div>
                      )}
                    </div>
                    {importing === f.sha && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Popup helper — opens GitHub OAuth in a popup and awaits postMessage from callback. */
export function connectGithubPopup(getAuthorizationUrl: () => Promise<string>): Promise<{
  success: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    const popup = window.open("", "metrixcom-github-oauth", "width=680,height=760");
    if (!popup) {
      resolve({ success: false, error: "Popup blocked. Allow popups and try again." });
      return;
    }
    (async () => {
      try {
        const url = await getAuthorizationUrl();
        popup.location.href = url;
      } catch (e) {
        popup.close();
        resolve({ success: false, error: e instanceof Error ? e.message : "Failed to start" });
        return;
      }
      const onMsg = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data;
        if (!data || data.type !== "metrixcom_github_oauth") return;
        cleanup();
        try {
          popup.close();
        } catch {
          /* ignore */
        }
        resolve({ success: !!data.success, error: data.error });
      };
      const timer = setInterval(() => {
        if (popup.closed) {
          cleanup();
          resolve({ success: false, error: "Sign in was cancelled" });
        }
      }, 500);
      const cleanup = () => {
        window.removeEventListener("message", onMsg);
        clearInterval(timer);
      };
      window.addEventListener("message", onMsg);
    })();
  });
}
