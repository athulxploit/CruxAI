import { createFileRoute } from "@tanstack/react-router";
import { trapAndLog } from "@/lib/honeypot.server";

// Honeypot: fake .env leak.
export const Route = createFileRoute("/api/public/honeypots/env")({
  server: {
    handlers: {
      GET: async ({ request }) => trapAndLog(request, "env"),
    },
  },
});
