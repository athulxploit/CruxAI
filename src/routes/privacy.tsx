import { createFileRoute, Link } from "@tanstack/react-router";
import { ArchLogo } from "@/components/arch/logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Metrixcom" },
      { name: "description", content: "How Metrixcom collects, uses, protects, and deletes your data. GDPR-aligned data handling for a private AI workspace." },
      { property: "og:title", content: "Privacy Policy — Metrixcom" },
      { property: "og:description", content: "How Metrixcom collects, uses, protects, and deletes your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/"><ArchLogo /></Link>
          <div className="text-[12px] text-muted-foreground">Last updated: July 19, 2026</div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="mt-3 text-[14px] text-muted-foreground">
            This page is maintained by the Metrixcom team to explain how Metrixcom handles your data. It is not a legal certification and does not create a contract; it describes the controls in place today.
          </p>
        </div>

        <Section title="1. What we collect">
          <p>Account data you provide: email, display name, avatar, and optional profile preferences (country, timezone, language).</p>
          <p>Conversation data: prompts, responses, and files you attach. Uploaded files stay in the encrypted <code>user-files</code> bucket.</p>
          <p>Usage telemetry: sign-in timestamps, device/IP for suspicious-login detection, message quota counters, and error events. No prompt bodies are logged.</p>
        </Section>

        <Section title="2. How we protect it">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Chat history is encrypted client-side with AES-256-GCM before it reaches our servers. Decryption keys stay on your device and are never uploaded.</li>
            <li>Transport is HTTPS (TLS 1.3) with HSTS and strict CSP. Modern security headers are enforced on every response.</li>
            <li>Row-Level Security on every user table restricts access to <code>auth.uid()</code>. The service role is used only for verified maintenance jobs.</li>
            <li>Rate limits, WAF, prompt-injection heuristics, and burst anomaly detection guard the API.</li>
          </ul>
        </Section>

        <Section title="3. Retention & deletion">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Unpinned chats are auto-deleted 7 days after last update. Pin ("Save") to keep indefinitely.</li>
            <li>IP addresses and User-Agent strings in activity logs are redacted after 30 days and purged after 180.</li>
            <li>Inactive accounts are anonymized after 12 months of no login and fully deleted after 13 months.</li>
            <li>You can export or delete all your data at any time in <Link to="/settings" className="underline">Settings → Data</Link>.</li>
          </ul>
        </Section>

        <Section title="4. Third parties (subprocessors)">
          <p>AI providers (Groq, Google Gemini, OpenRouter) receive your prompt content — needed to answer you — under their own terms. Firecrawl performs web-search enrichment. Cloudflare provides edge WAF and DDoS protection. Supabase (managed via Lovable Cloud) hosts the encrypted database, auth, and storage.</p>
        </Section>

        <Section title="5. Your rights (GDPR / CCPA-aligned)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Access & portability</strong>: download a JSON export of your workspace in Settings → Data.</li>
            <li><strong>Erasure</strong>: delete your account in Settings → Account. This cascades to chats, files, sessions, and roles.</li>
            <li><strong>Rectification</strong>: edit profile fields in Settings → Profile.</li>
            <li><strong>Objection & withdrawal</strong>: revoke consent by deleting your account; no further processing occurs after erasure.</li>
          </ul>
        </Section>

        <Section title="6. Contact">
          <p>Data controller: Metrixcom, operated by Athul Krishna PT. Contact via the in-app Help &amp; Support panel for privacy requests. We respond within 30 days.</p>
        </Section>

        <div className="pt-4 border-t border-border text-[12px] text-muted-foreground">
          See also: <Link to="/terms" className="underline">Terms of Service</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-[14px] text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}
