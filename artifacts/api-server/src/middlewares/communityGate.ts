import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// Rutas que no exigen ser miembro activo (login, perfil propio, fotos, guía, invitaciones).
const OPEN_PREFIXES = [
  "/health",
  "/healthz",
  "/auth",
  "/login",
  "/callback",
  "/logout",
  "/mobile-auth",
  "/users/profile",
  "/storage",
  "/push/vapid-key",
  "/sponsors",
  "/community",
];

export function missingProfileFields(p: {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}): string[] {
  const missing: string[] = [];
  if (!p.firstName?.trim()) missing.push("firstName");
  if (!p.lastName?.trim()) missing.push("lastName");
  if (!p.avatarUrl?.startsWith("/objects/uploads/")) missing.push("photo");
  return missing;
}

export async function communityGate(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  if (OPEN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    next();
    return;
  }

  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db.select().from(profilesTable)
    .where(eq(profilesTable.replitUserId, req.user.id)).limit(1);

  if (!profile) {
    res.status(403).json({ error: "community_pending" });
    return;
  }
  if (profile.isAdmin) {
    next();
    return;
  }
  if (profile.memberStatus !== "active") {
    res.status(403).json({
      error: profile.memberStatus === "suspended" ? "community_suspended" : "community_pending",
    });
    return;
  }
  const missing = missingProfileFields(profile);
  if (missing.length > 0) {
    res.status(403).json({ error: "profile_incomplete", missing });
    return;
  }
  next();
}
