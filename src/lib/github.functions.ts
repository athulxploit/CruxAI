import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CONNECTOR_ID = "github";
const GITHUB_SCOPES = "repo read:user user:email";
const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";




export const startGithubConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((origin: string) => origin)
  .handler(async ({ data: origin, context }) => {
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    if (!clientId) throw new Error("GitHub OAuth is not configured on the server.");
    if (!/^https?:\/\//.test(origin)) throw new Error("Invalid origin");

    const { signGithubState } = await import("@/lib/github.server");
    const state = signGithubState({ userId: context.userId, origin });

    const redirectUri = `${origin}/api/public/github-callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: GITHUB_SCOPES,
      state,
      allow_signup: "true",
    });
    return { authorizationUrl: `${GITHUB_AUTHORIZE}?${params.toString()}` };
  });

export const isGithubConnected = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    return { connected: !!key };
  });

export const disconnectGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { deleteConnectionForUser } = await import("./app-user-connections.server");
    await deleteConnectionForUser(context.userId, CONNECTOR_ID);
    return { ok: true };
  });

async function githubFetch(token: string, path: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Metrixcom-App",
    },
  });
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  updated_at: string;
  language: string | null;
}

export const listGithubRepos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { query?: string }) => input)
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const token = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!token) throw new Error("GitHub is not connected for this user.");

    const q = data.query?.trim().toLowerCase();
    // Always list the user's own repos (search API doesn't resolve "@me" and
    // scoping to a login excludes collaborator repos), then filter client-side.
    const res = await githubFetch(
      token,
      `/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`,
    );
    if (!res.ok) throw new Error(`GitHub repos failed [${res.status}]`);
    let repos = (await res.json()) as GithubRepo[];
    if (q) {
      repos = repos.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false),
      );
    }
    repos = repos.slice(0, 50);
    return { repos };
  });

export interface GithubContentItem {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
  sha: string;
}

export const listGithubContents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { fullName: string; path?: string; ref?: string }) => input)
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const token = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!token) throw new Error("GitHub is not connected for this user.");
    const [owner, repo] = data.fullName.split("/");
    if (!owner || !repo) throw new Error("Invalid repository");
    const path = (data.path ?? "").replace(/^\//, "");
    const q = data.ref ? `?ref=${encodeURIComponent(data.ref)}` : "";
    const res = await githubFetch(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}${q}`,
    );
    if (!res.ok) throw new Error(`GitHub contents failed [${res.status}]`);
    const j = (await res.json()) as GithubContentItem[] | GithubContentItem;
    const items = Array.isArray(j) ? j : [j];
    items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    return { items };
  });

/**
 * Download a file from GitHub and store it in the user's file bucket so the
 * chat's existing attachment pipeline can read it.
 */
export const importGithubFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: { fullName: string; path: string; ref?: string; name: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const token = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!token) throw new Error("GitHub is not connected for this user.");
    const [owner, repo] = data.fullName.split("/");
    if (!owner || !repo) throw new Error("Invalid repository");

    const q = data.ref ? `?ref=${encodeURIComponent(data.ref)}` : "";
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(data.path)}${q}`,
      {
        headers: {
          Accept: "application/vnd.github.raw",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Metrixcom-App",
        },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub download failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 5 * 1024 * 1024) throw new Error("File too large (max 5 MB)");

    // best-guess mime by extension
    const ext = data.name.split(".").pop()?.toLowerCase() ?? "";
    const mimeMap: Record<string, string> = {
      md: "text/markdown", txt: "text/plain", json: "application/json",
      js: "text/javascript", ts: "text/typescript", tsx: "text/typescript",
      jsx: "text/javascript", py: "text/x-python", rs: "text/x-rust",
      go: "text/x-go", java: "text/x-java", c: "text/x-c", cpp: "text/x-c++",
      h: "text/x-c", css: "text/css", html: "text/html", yml: "text/yaml",
      yaml: "text/yaml", toml: "text/plain", sh: "text/x-shellscript",
      sql: "text/plain", xml: "text/xml", pdf: "application/pdf",
      png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
      webp: "image/webp", svg: "image/svg+xml",
    };
    const mime = mimeMap[ext] ?? "text/plain";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storagePath = `${context.userId}/${crypto.randomUUID()}-${data.name}`;
    const up = await supabaseAdmin.storage
      .from("user-files")
      .upload(storagePath, buf, { contentType: mime });
    if (up.error) throw new Error(up.error.message);

    await supabaseAdmin.from("files").insert({
      user_id: context.userId,
      name: data.name,
      mime,
      size_bytes: buf.byteLength,
      storage_path: storagePath,
    });

    return { name: data.name, mime, size: buf.byteLength, path: storagePath };
  });
