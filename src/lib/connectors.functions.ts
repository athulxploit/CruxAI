import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { authorizeAppUserOAuth, disconnectAppUser } from "@/integrations/lovable/appUserConnector";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";

// Mapping of local connector IDs to Gateway connector IDs and their required scopes
const CONNECTOR_CONFIGS: Record<string, { gatewayId: string; scopes: string[]; clientKeyEnv: string }> = {
  "google-drive": {
    gatewayId: "google_drive",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/drive.readonly"
    ],
    clientKeyEnv: "GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY"
  },
  "gmail-calendar": {
    gatewayId: "google_drive", // Reusing the same provider if it covers both, or specific ID
    scopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar.readonly"
    ],
    clientKeyEnv: "GMAIL_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"
  },
  "github": {
    gatewayId: "github",
    scopes: ["repo", "read:user", "user:email"],
    clientKeyEnv: "GITHUB_APP_USER_CONNECTOR_CLIENT_API_KEY"
  },
  "slack": {
    gatewayId: "slack",
    scopes: ["channels:read", "groups:read", "chat:write"],
    clientKeyEnv: "SLACK_APP_USER_CONNECTOR_CLIENT_API_KEY"
  },
  "notion": {
    gatewayId: "notion",
    scopes: [], // Notion uses internal integrations often
    clientKeyEnv: "NOTION_APP_USER_CONNECTOR_CLIENT_API_KEY"
  }
};

export const startConnectorAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    connectorId: z.string(),
    origin: z.string().url()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const config = CONNECTOR_CONFIGS[data.connectorId];
    if (!config) throw new Error(`Connector ${data.connectorId} is not configured.`);
    
    const clientKey = process.env[config.clientKeyEnv];
    if (!clientKey) {
      throw new Error(`Connector ${data.connectorId} is missing server-side credentials (${config.clientKeyEnv}).`);
    }

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: config.gatewayId,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl: data.origin,
      responseMode: "web_message",
      webMessageTargetOrigin: data.origin,
      credentialsConfiguration: { scopes: config.scopes },
    });

    return { authorizationUrl };
  });

export const saveConnectorConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    connectorId: z.string(),
    connectionAPIKey: z.string(),
    accountName: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { saveConnectionKeyForUser } = await import("./app-user-connections.server");
    await saveConnectionKeyForUser(context.userId, data.connectorId, data.connectionAPIKey, data.accountName);
    return { ok: true };
  });

export const listUserConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("app_user_connections")
      .select("*")
      .eq("user_id", context.userId);
      
    if (error) throw error;
    // Map to bypass linter errors for missing generated columns
    const connections = (data || []).map((c: any) => ({
      connector_id: c.connector_id as string,
      account_display_name: c.account_display_name as string | null,
      status: (c.status as string) || "connected",
      updated_at: c.updated_at as string
    }));
    return { connections };
  });

export const disconnectConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ connectorId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import("./app-user-connections.server");
    const key = await getConnectionKeyForUser(context.userId, data.connectorId);
    
    if (key) {
      const config = CONNECTOR_CONFIGS[data.connectorId];
      if (config) {
        try {
          await disconnectAppUser({
            gatewayBaseUrl: GATEWAY_BASE_URL,
            connectionAPIKey: key,
            connectorId: config.gatewayId,
          });
        } catch (e) {
          console.error("Gateway disconnect failed", e);
        }
      }
    }
    
    await deleteConnectionForUser(context.userId, data.connectorId);
    return { ok: true };
  });
