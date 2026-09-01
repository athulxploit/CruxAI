import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// --- Security hardening middleware ---
// Adds industry-standard security response headers on every request and
// force-upgrades plain HTTP to HTTPS when the edge proxy reports it.
// CSP is intentionally permissive for inline styles + Supabase/Gemini/Groq
// so the app keeps working; it still blocks framing, object embeds, and
// arbitrary third-party script origins.
const SUPABASE_ORIGIN = "https://tfgbdvjwwdwncrohbkyy.supabase.co";
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  // Inline scripts are used for the appearance boot snippet in __root.tsx.
  "script-src 'self' 'unsafe-inline'",
  // Tailwind + inline theme vars require 'unsafe-inline'. rsms.me hosts Inter.
  "style-src 'self' 'unsafe-inline' https://rsms.me https://fonts.googleapis.com",
  "font-src 'self' data: https://rsms.me https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  // XHR/fetch/WebSocket destinations: Supabase (DB, auth, realtime, storage)
  // plus the AI proxy is same-origin so 'self' covers it.
  `connect-src 'self' ${SUPABASE_ORIGIN} wss://tfgbdvjwwdwncrohbkyy.supabase.co https://generativelanguage.googleapis.com https://api.groq.com https://openrouter.ai`,
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
};

const securityMiddleware = createMiddleware().server(async ({ next, request }) => {
  // Force HTTPS on the published site. Localhost/dev is left alone so
  // the local preview server still works.
  const url = new URL(request.url);
  const xfProto = request.headers.get("x-forwarded-proto");
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!isLocal && (xfProto === "http" || url.protocol === "http:")) {
    url.protocol = "https:";
    return new Response(null, {
      status: 301,
      headers: { Location: url.toString(), ...SECURITY_HEADERS },
    });
  }

  const result = await next();
  // Attach security headers to whatever response the app produced.
  const response = (result as { response?: Response }).response;
  if (response) {
    try {
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
        if (!response.headers.has(k)) response.headers.set(k, v);
      }
    } catch {
      /* some Response objects have immutable headers — ignore */
    }
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  // Order matters: security runs first so its headers wrap error responses too.
  requestMiddleware: [securityMiddleware, errorMiddleware],
}));
