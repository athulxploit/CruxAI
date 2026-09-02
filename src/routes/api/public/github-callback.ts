import { createFileRoute } from "@tanstack/react-router";


function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function postMessageHtml(origin: string, payload: Record<string, unknown>): string {
  const data = JSON.stringify({ type: "metrixcom_github_oauth", connectorId: "github", ...payload });
  const originJson = JSON.stringify(origin);
  return `<!doctype html><html><body style="background:#0a0a0a;color:#fff;font-family:system-ui;padding:24px;">
<p>Finishing sign in…</p>
<script>
try {
  if (window.opener) window.opener.postMessage(${data}, ${originJson});
} catch(e){}
setTimeout(function(){ try { window.close(); } catch(e){} }, 400);
</script>
</body></html>`;
}

export const Route = createFileRoute("/api/public/github-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");

        if (err) {
          return html(postMessageHtml("*", { success: false, error: err }));
        }
        if (!code || !state) {
          return html(postMessageHtml("*", { success: false, error: "Missing code/state" }));
        }

        const { verifyGithubState } = await import("@/lib/github.server");
        const verified = verifyGithubState(state);
        if (!verified) {
          return html(postMessageHtml("*", { success: false, error: "Invalid state" }));
        }
        const targetOrigin = verified.origin;

        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return html(postMessageHtml(targetOrigin, { success: false, error: "Server misconfigured" }));
        }

        try {
          const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              code,
              redirect_uri: `${targetOrigin}/api/public/github-callback`,
            }),
          });
          const tokJson = (await tokenRes.json()) as {
            access_token?: string;
            error?: string;
            error_description?: string;
          };
          if (!tokJson.access_token) {
            return html(
              postMessageHtml(targetOrigin, {
                success: false,
                error: tokJson.error_description ?? tokJson.error ?? "Token exchange failed",
              }),
            );
          }

          // Persist encrypted, keyed by verified userId.
          const { saveConnectionKeyForUser } = await import("@/lib/app-user-connections.server");
          await saveConnectionKeyForUser(verified.userId, "github", tokJson.access_token);

          return html(postMessageHtml(targetOrigin, { success: true, status: "success" }));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unexpected error";
          return html(postMessageHtml(targetOrigin, { success: false, error: msg }));
        }
      },
    },
  },
});
