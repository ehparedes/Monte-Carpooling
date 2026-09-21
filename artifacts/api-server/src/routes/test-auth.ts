import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { profilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createSession, SESSION_COOKIE, SESSION_TTL, type SessionData } from "../lib/auth";

const router: IRouter = Router();

const TEST_PASSCODE = process.env.TEST_PASSCODE || "MONTE2026";

router.post("/auth/test-login", async (req: Request, res: Response) => {
  const { name, email, passcode } = req.body;

  if (!passcode || passcode !== TEST_PASSCODE) {
    res.status(401).json({ error: "Código de acceso incorrecto" });
    return;
  }
  if (!name || !email || typeof name !== "string" || typeof email !== "string") {
    res.status(400).json({ error: "Nombre y correo son requeridos" });
    return;
  }

  const sanitizedEmail = email.trim().toLowerCase();
  const sanitizedName = name.trim();
  const userId = `tester_${sanitizedEmail.replace(/[^a-z0-9]/gi, "_")}`;

  const nameParts = sanitizedName.split(" ");
  const firstName = nameParts[0] || sanitizedName;
  const lastName = nameParts.slice(1).join(" ") || null;
  const username = sanitizedEmail.split("@")[0] || userId;

  await db.insert(usersTable).values({
    id: userId,
    email: sanitizedEmail,
    firstName,
    lastName,
  }).onConflictDoUpdate({
    target: usersTable.id,
    set: { firstName, lastName, updatedAt: new Date() },
  });

  const existingProfile = await db.select().from(profilesTable)
    .where(eq(profilesTable.replitUserId, userId)).limit(1);

  if (existingProfile.length === 0) {
    const dicebearUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    await db.insert(profilesTable).values({
      replitUserId: userId,
      username,
      firstName,
      lastName,
      avatarUrl: dicebearUrl,
    });
  }

  const sessionData: SessionData = {
    user: {
      id: userId,
      username,
      firstName,
      lastName: lastName ?? undefined,
      profileImageUrl: null,
    },
    access_token: "test_token",
  };

  const sid = await createSession(sessionData);

  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });

  res.json({ ok: true, username });
});

export default router;
