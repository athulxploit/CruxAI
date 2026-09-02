import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/arch/chat-view";
import { ChatInput } from "@/components/arch/chat-input";
import { LiveThinkingBar } from "@/components/arch/live-thinking";
import { ModeSwitch } from "@/components/arch/mode-switch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Metrixcom — Premium AI Workspace" },
      { name: "description", content: "Metrixcom is an advanced AI platform for research, engineering, and cybersecurity, featuring specialized agents and professional workspaces." },
      { property: "og:title", content: "Metrixcom — Premium AI Workspace" },
      { property: "og:description", content: "Access elite AI models and specialized engineering tools in a minimal, high-performance workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex-1 flex flex-col min-h-0 relative w-full h-full">
      <h1 className="sr-only">Metrixcom — Premium AI Workspace for Engineering and Research</h1>
      <ModeSwitch className="shrink-0" />
      <div className="flex-1 min-h-0 w-full flex flex-col relative">
        <ChatView />
      </div>
      <div className="shrink-0 w-full relative z-20">
        <LiveThinkingBar />
        <ChatInput />
      </div>
    </div>
  );
}
