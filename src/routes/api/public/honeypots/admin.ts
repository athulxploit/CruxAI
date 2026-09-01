import { createFileRoute } from "@tanstack/react-router";
import { trapAndLog } from "@/lib/honeypot.server";

// Honeypot: fake admin panel.
export const Route = createFileRoute("/api/public/honeypots/admin")({
  server: {
    handlers: {
      GET: async ({ request }) => trapAndLog(request, "admin"),
      POST: async ({ request }) => trapAndLog(request, "admin"),
    },
  },
});
