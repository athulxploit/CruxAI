import { createFileRoute } from "@tanstack/react-router";
import { trapAndLog } from "@/lib/honeypot.server";

// Honeypot: fake phpMyAdmin.
export const Route = createFileRoute("/api/public/honeypots/phpmyadmin")({
  server: {
    handlers: {
      GET: async ({ request }) => trapAndLog(request, "phpmyadmin"),
    },
  },
});
