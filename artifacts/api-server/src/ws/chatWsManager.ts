import { getSession, SESSION_COOKIE } from "../lib/auth";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

interface AuthedWebSocket extends WebSocket {
  profileId?: number;
  tripId?: number;
  isAlive?: boolean;
}

const clients = new Map<number, Set<AuthedWebSocket>>();

export function broadcast(tripId: number, payload: object) {
  const room = clients.get(tripId);
  if (!room) return;
  const data = JSON.stringify(payload);
  for (const ws of room) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export function setupChatWs(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  const interval = setInterval(() => {
    wss.clients.forEach((rawWs) => {
      const ws = rawWs as AuthedWebSocket;
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  wss.on("connection", async (rawWs: AuthedWebSocket, req: IncomingMessage) => {
    rawWs.isAlive = true;
    rawWs.on("pong", () => { rawWs.isAlive = true; });

    const url = new URL(req.url ?? "/", "http://localhost");
    const tripId = parseInt(url.searchParams.get("tripId") ?? "");
    const sid = getSidFromUpgrade(req, url);
    const session = sid ? await getSession(sid) : null;
    const replitUserId = session?.user?.id;

    if (isNaN(tripId) || !replitUserId) {
      rawWs.close(1008, "Unauthorized");
      return;
    }

    const profile = await db.select().from(profilesTable)
      .where(eq(profilesTable.replitUserId, replitUserId))
      .limit(1);

    if (profile.length === 0) {
      rawWs.close(1008, "Profile not found");
      return;
    }

    rawWs.profileId = profile[0].id;
    rawWs.tripId = tripId;

    if (!clients.has(tripId)) clients.set(tripId, new Set());
    clients.get(tripId)!.add(rawWs);

    rawWs.on("close", () => {
      clients.get(tripId)?.delete(rawWs);
      if (clients.get(tripId)?.size === 0) clients.delete(tripId);
    });

    rawWs.on("error", () => {
      clients.get(tripId)?.delete(rawWs);
    });
  });

  console.log("WebSocket chat server ready at /ws/chat");
}


function getSidFromUpgrade(req: IncomingMessage, url: URL): string | undefined {
  const cookieHeader = req.headers.cookie ?? "";
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join("="));
  }
  return url.searchParams.get("token") ?? undefined;
}
