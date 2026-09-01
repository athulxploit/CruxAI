import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/arch/chat-view";
import { ChatInput } from "@/components/arch/chat-input";
import { LiveThinkingBar } from "@/components/arch/live-thinking";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatView />
      <LiveThinkingBar />
      <ChatInput />
    </div>
  );
}
