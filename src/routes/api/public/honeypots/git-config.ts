import { createFileRoute } from "@tanstack/react-router";
import { trapAndLog } from "@/lib/honeypot.server";

// Honeypot: fake .git/config exposure.
export const Route = createFileRoute("/api/public/honeypots/git-config")({
  server: {
    handlers: {
      GET: async ({ request }) => trapAndLog(request, "git-config"),
    },
  },
});
