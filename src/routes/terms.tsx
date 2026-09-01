import { createFileRoute, Link } from "@tanstack/react-router";
import { ArchLogo } from "@/components/arch/logo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Metrixcom" },
      { name: "description", content: "Terms governing your use of Metrixcom — acceptable use, account rules, AI output limits, and liability." },
      { property: "og:title", content: "Terms of Service — Metrixcom" },
      { property: "og:description", content: "Terms governing your use of Metrixcom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="mt-3 text-[14px] text-muted-foreground">By creating an account or using Metrixcom you agree to these terms.</p>
        </div>

        <Section title="1. Account">
          <p>You must be 13+ (or the age of digital consent in your country). You are responsible for keeping your credentials secure. One account per person.</p>
        </Section>

        <Section title="2. Acceptable use">
          <p>Do not use Metrixcom to generate content that is illegal, harmful, or infringes on others' rights, to attack the platform or other users, to evade rate limits, or to build a competing service by scraping outputs.</p>
          <p>Cipher-1 is provided for ethical security research on systems you own or are authorized to test. Unauthorized penetration testing is prohibited.</p>
        </Section>

        <Section title="3. AI output">
          <p>AI-generated responses may be inaccurate, incomplete, or biased. You are responsible for verifying outputs before relying on them for consequential decisions. Metrixcom is not a substitute for professional advice.</p>
        </Section>

        <Section title="4. Content & IP">
          <p>You retain rights to prompts and files you submit. You grant Metrixcom a limited license to process them solely to provide the service. We claim no ownership over your outputs.</p>
        </Section>

        <Section title="5. Plans & billing">
          <p>Free tier is subject to daily message limits. Pro and Pro+ plans unlock higher limits and premium models. Promo codes may be time- or usage-limited.</p>
        </Section>

        <Section title="6. Termination">
          <p>You may delete your account at any time from Settings. We may suspend accounts that violate these terms or trigger security policies.</p>
        </Section>

        <Section title="7. Liability">
          <p>The service is provided "as is" without warranties. To the fullest extent permitted by law, Metrixcom is not liable for indirect or consequential damages arising from your use.</p>
        </Section>

        <Section title="8. Changes">
          <p>We may update these terms. Material changes are notified in-app; continued use after the effective date constitutes acceptance.</p>
        </Section>

        <div className="pt-4 border-t border-border text-[12px] text-muted-foreground">
          See also: <Link to="/privacy" className="underline">Privacy Policy</Link>
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
