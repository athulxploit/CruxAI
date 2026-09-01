import { store } from "@/lib/app-store";
import { toast } from "sonner";

export function tryTogglePin(id: string, max: number | undefined) {
  const chats = store.get().chats;
  const chat = chats.find((c) => c.id === id);
  if (!chat) return;
  const currentlyPinned = chats.filter((c) => c.pinned).length;
  if (!chat.pinned && typeof max === "number" && max > 0 && currentlyPinned >= max) {
    toast.error(`Pin limit reached (${max}). Unpin a chat first.`);
    return;
  }
  store.togglePin(id);
}
