import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
} from "@/integrations/lovable/appUserConnector";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_drive";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.readonly",
];

export const startGoogleDriveConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((targetOrigin: string) => targetOrigin)
  .handler(async ({ data: targetOrigin, context }) => {
    const clientKey = process.env.GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY;
    if (!clientKey) {
      throw new Error("Google Drive connector is not configured on the server.");
    }
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl: targetOrigin,
      responseMode: "web_message",
      webMessageTargetOrigin: targetOrigin,
      credentialsConfiguration: { scopes: GOOGLE_SCOPES },
    });
    return { authorizationUrl };
  });

export const saveGoogleDriveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { connectionAPIKey: string }) => input)
  .handler(async ({ data, context }) => {
    const { saveConnectionKeyForUser } = await import("./app-user-connections.server");
    await saveConnectionKeyForUser(context.userId, CONNECTOR_ID, data.connectionAPIKey);
    return { ok: true };
  });

export const isGoogleDriveConnected = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    return { connected: !!key };
  });

export const disconnectGoogleDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import(
      "./app-user-connections.server"
    );
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (key) {
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: CONNECTOR_ID,
        });
      } catch {
        // If the gateway disconnect fails, still purge locally.
      }
    }
    await deleteConnectionForUser(context.userId, CONNECTOR_ID);
    return { ok: true };
  });

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
}

export const listDriveFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { query?: string; pageToken?: string }) => input)
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) throw new Error("Google Drive is not connected for this user.");

    const params = new URLSearchParams({
      pageSize: "25",
      fields:
        "nextPageToken,files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink)",
      orderBy: "modifiedTime desc",
      q: data.query
        ? `name contains '${data.query.replace(/'/g, "\\'")}' and trashed=false`
        : "trashed=false",
    });
    if (data.pageToken) params.set("pageToken", data.pageToken);

    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: `/drive/v3/files?${params.toString()}`,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Drive list failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { files?: DriveFile[]; nextPageToken?: string };
    return { files: json.files ?? [], nextPageToken: json.nextPageToken };
  });

/**
 * Import a Drive file into the user's `user-files` bucket so the chat's
 * existing attachment pipeline (PDF/DOCX/image/OCR) reads it.
 * Google-native formats are exported to a portable type.
 */
export const importDriveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: { fileId: string; name: string; mimeType: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) throw new Error("Google Drive is not connected for this user.");

    // Google-native → exported format
    const exportMap: Record<string, { mime: string; ext: string }> = {
      "application/vnd.google-apps.document": { mime: "application/pdf", ext: "pdf" },
      "application/vnd.google-apps.spreadsheet": {
        mime: "text/csv",
        ext: "csv",
      },
      "application/vnd.google-apps.presentation": {
        mime: "application/pdf",
        ext: "pdf",
      },
    };
    const exp = exportMap[data.mimeType];
    const path = exp
      ? `/drive/v3/files/${data.fileId}/export?mimeType=${encodeURIComponent(exp.mime)}`
      : `/drive/v3/files/${data.fileId}?alt=media`;

    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Drive download failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const finalMime = exp?.mime ?? data.mimeType ?? "application/octet-stream";
    const safeName = exp
      ? data.name.replace(/\.[^.]+$/, "") + "." + exp.ext
      : data.name;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storagePath = `${context.userId}/${crypto.randomUUID()}-${safeName}`;
    const up = await supabaseAdmin.storage
      .from("user-files")
      .upload(storagePath, buf, { contentType: finalMime });
    if (up.error) throw new Error(up.error.message);

    await supabaseAdmin.from("files").insert({
      user_id: context.userId,
      name: safeName,
      mime: finalMime,
      size_bytes: buf.byteLength,
      storage_path: storagePath,
    });

    return {
      name: safeName,
      mime: finalMime,
      size: buf.byteLength,
      path: storagePath,
    };
  });
