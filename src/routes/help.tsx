import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { BookOpen, HelpCircle, MessageCircle, Bug, Download } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — Metrixcom" },
      { name: "description", content: "Get Metrixcom help, documentation, support, FAQs and bug reporting in one place." },
      { property: "og:title", content: "Help — Metrixcom" },
      { property: "og:description", content: "Get Metrixcom help, documentation, support, FAQs and bug reporting in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

const FAQ = [
  { q: "How do I switch agents?", a: "Use the agent selector in the chat composer or open the Agents page." },
  { q: "Are my chats private?", a: "Yes. Chats are stored per-user with row-level security. You can delete them at any time from Privacy settings." },
  { q: "Can I upload files?", a: "Yes — up to 20MB per file. Go to Files or use the paperclip in the composer." },
  { q: "How do I enable MFA?", a: "Go to Settings → Security to enroll a TOTP authenticator." },
];

function HelpPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(false);
  const [openBug, setOpenBug] = useState(false);
  const [openContact, setOpenContact] = useState(false);
  const [bugTitle, setBugTitle] = useState("");
  const [bugBody, setBugBody] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function getProvider(): string | undefined {
    const u = user as unknown as { app_metadata?: { provider?: string }; identities?: { provider: string }[] } | null;
    return u?.app_metadata?.provider ?? u?.identities?.[0]?.provider;
  }

  async function submitBug() {
    if (!bugBody.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("activity_log").insert({
      user_id: user.id,
      email: user.email ?? null,
      type: "bug_report",
      category: "help",
      message: bugTitle || "Bug report",
      meta: { body: bugBody, url: window.location.href, ua: navigator.userAgent, provider: getProvider() },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Bug report submitted");
    setBugTitle("");
    setBugBody("");
    setOpenBug(false);
  }

  async function submitContact() {
    if (!contactBody.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("activity_log").insert({
      user_id: user.id,
      email: user.email ?? null,
      type: "support_request",
      category: "help",
      message: "Support request",
      meta: { body: contactBody, provider: getProvider() },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Support request sent");
    setContactBody("");
    setOpenContact(false);
  }

  const items = [
    {
      icon: BookOpen,
      title: "Documentation",
      desc: "Guides, references and tutorials.",
      onClick: () => navigate({ to: "/docs" }),
    },
    {
      icon: Download,
      title: "Download app",
      desc: "Install on desktop, phone or tablet.",
      onClick: () => navigate({ to: "/download" }),
    },
    { icon: HelpCircle, title: "FAQ", desc: "Answers to common questions.", onClick: () => setOpenFaq(true) },
    { icon: MessageCircle, title: "Contact support", desc: "Reach our team, 24/7.", onClick: () => setOpenContact(true) },
    { icon: Bug, title: "Report a bug", desc: "Tell us what went wrong.", onClick: () => setOpenBug(true) },
  ];

  const cardClass = "text-left rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-border-strong transition-colors p-5";

  return (
    <PageShell title="Help" description="Get answers, guides and support.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((i) => {
          const content = (
            <>
              <i.icon className="h-4 w-4 text-muted-foreground" />
              <div className="mt-3 text-[14px] font-medium">{i.title}</div>
              <div className="text-[12.5px] text-muted-foreground mt-0.5">{i.desc}</div>
            </>
          );

          return (
            <button key={i.title} onClick={i.onClick} className={cardClass}>
              {content}
            </button>
          );
        })}
      </div>

      <Dialog open={openFaq} onOpenChange={setOpenFaq}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Frequently asked questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <div className="text-[13.5px] font-medium">{f.q}</div>
                <div className="text-[13px] text-muted-foreground mt-1">{f.a}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openBug} onOpenChange={setOpenBug}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a bug</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Short title" value={bugTitle} onChange={(e) => setBugTitle(e.target.value)} />
            <Textarea
              placeholder="What happened? Steps to reproduce…"
              rows={6}
              value={bugBody}
              onChange={(e) => setBugBody(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBug(false)}>Cancel</Button>
            <Button disabled={submitting || !bugBody.trim()} onClick={submitBug}>
              {submitting ? "Sending…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openContact} onOpenChange={setOpenContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact support</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="How can we help?"
            rows={6}
            value={contactBody}
            onChange={(e) => setContactBody(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenContact(false)}>Cancel</Button>
            <Button disabled={submitting || !contactBody.trim()} onClick={submitContact}>
              {submitting ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
