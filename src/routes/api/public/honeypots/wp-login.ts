import { createFileRoute } from "@tanstack/react-router";
import { trapAndLog } from "@/lib/honeypot.server";

// Honeypot: fake WordPress admin login. No legitimate traffic hits this.
export const Route = createFileRoute("/api/public/honeypots/wp-login")({
  server: {
    handlers: {
      GET: async ({ request }) => trapAndLog(request, "wp-login"),
      POST: async ({ request }) => trapAndLog(request, "wp-login"),
    },
  },
});
