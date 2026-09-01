import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "@/components/arch/sidebar";
import { TopBar } from "@/components/arch/topbar";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppearanceProvider } from "@/lib/appearance";
import { PlatformProvider, usePlatform } from "@/lib/platform";
import { UserPrefsProvider } from "@/lib/user-prefs";
import { AutoTranslator } from "@/lib/auto-translator";
import { Toaster } from "@/components/ui/sonner";
import { TwoFactorGate } from "@/components/arch/two-factor-gate";
import { PlanCelebration } from "@/components/arch/plan-celebration";

import { useState } from "react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-semibold tracking-tight">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to Metrixcom
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try again or return to the workspace.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Metrixcom — Premium AI workspace" },
      {
        name: "description",
        content:
          "Metrixcom is a premium, minimal AI platform for research, engineering and security work.",
      },
      { name: "theme-color", content: "#1a1a1f" },
      { property: "og:title", content: "Metrixcom" },
      {
        property: "og:description",
        content: "A premium AI workspace with specialized agents for every task.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Metrixcom" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=3" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png?v=3" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png?v=3" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=3" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Michroma&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const APPEARANCE_BOOT = `
(function(){try{var r=document.documentElement;var raw=localStorage.getItem('arch-appearance');var a=raw?JSON.parse(raw):{};var t=a.theme||'dark';if(t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}r.classList.remove('dark','light');r.classList.add(t);var d=a.density||'comfortable';r.classList.add('density-'+d);var f=a.font||'inter';r.classList.add('font-'+f);if(a.reduceMotion)r.classList.add('reduce-motion');var accents={blue:'oklch(0.66 0.17 250)',violet:'oklch(0.62 0.22 295)',emerald:'oklch(0.68 0.16 160)',amber:'oklch(0.78 0.16 75)',rose:'oklch(0.65 0.22 15)'};r.style.setProperty('--accent-color',accents[a.accent||'blue']);r.classList.add('chat-'+(a.chatWidth||'normal'));if((a.sidebarDefault||'expanded')==='collapsed')r.classList.add('sidebar-collapsed');r.classList.add('code-'+(a.codeTheme||'dark'));r.classList.add('msg-'+(a.msgFontSize||'md'));r.classList.add('radius-'+(a.radius||'soft'));}catch(e){}})();
`;


function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark density-comfortable font-inter" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT }} />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppearanceProvider>
          <UserPrefsProvider>
            <PlatformProvider>
              <Shell />
              <PlanCelebration />
              <AutoTranslator />

              <Toaster />
            </PlatformProvider>
          </UserPrefsProvider>
        </AppearanceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;
    // Behavioral biometrics — silently profile; anomalies are logged to
    // activity_log server-side, no user-facing toast (too noisy).
    let stop: (() => void) | undefined;
    import("@/lib/behavioral-biometrics").then((m) => {
      stop = m.startBehavioralBiometrics(() => { /* silent */ });
    });
    // App integrity — record to activity_log only. Do not toast: browser
    // extensions routinely patch fetch/XHR and would spam the UI.
    import("@/lib/app-integrity").then((m) => {
      m.verifyAppIntegrity(() => { /* silent */ });
    });
    return () => { stop?.(); };
  }, [user]);


  // Standalone routes with their own full-page layout (no app shell, no auth gate)
  if (pathname === "/auth" || pathname === "/docs" || pathname.startsWith("/docs/")) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  // Public chat view when not signed in? Redirect to /auth for anything else.
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/auth";
    return null;
  }

  return (
    <TwoFactorGate>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <PlatformOverlays />
          <TopBar />
          <Outlet />
        </div>
      </div>
    </TwoFactorGate>
  );
}


function PlatformOverlays() {
  const { settings, announcements } = usePlatform();
  const { isAdmin } = useAuth();
  const banner = announcements.find((a) => a.kind === "banner" || a.kind === "release");
  const popup = announcements.find((a) => a.kind === "popup");
  const maint = announcements.find((a) => a.kind === "maintenance");
  const [dismissed, setDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("arch-dismissed") || "[]"); } catch { return []; }
  });
  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem("arch-dismissed", JSON.stringify(next)); } catch { /* empty */ }
  }
  return (
    <>
      {settings?.maintenance_mode && !isAdmin && (
        <div className="bg-amber-500/15 text-amber-300 text-[12.5px] px-4 py-1.5 text-center border-b border-amber-500/20">
          {maint?.title ?? "Metrixcom is undergoing maintenance. Some features may be unavailable."}
        </div>
      )}
      {banner && !dismissed.includes(banner.id) && (
        <div className="bg-primary/10 text-primary text-[12.5px] px-4 py-1.5 flex items-center gap-3 border-b border-primary/20">
          <span className="font-medium">{banner.title}</span>
          <span className="text-muted-foreground truncate">{banner.body}</span>
          <button onClick={() => dismiss(banner.id)} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}
      {popup && !dismissed.includes(popup.id) && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => dismiss(popup.id)}>
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-[16px] font-semibold">{popup.title}</div>
            <div className="mt-2 text-[13.5px] text-muted-foreground whitespace-pre-wrap">{popup.body}</div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => dismiss(popup.id)} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-[13px]">Got it</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
