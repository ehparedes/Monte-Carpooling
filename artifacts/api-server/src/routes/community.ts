import { Router, type IRouter, type Request, type Response } from "express";
import { randomInt } from "crypto";
import { z } from "zod";
import { db } from "@workspace/db";
import { profilesTable, invitesTable } from "@workspace/db/schema";
import { and, eq, isNull, desc, inArray, sql } from "drizzle-orm";
import { getOrCreateProfile } from "./users";
import { missingProfileFields } from "../middlewares/communityGate";

const router: IRouter = Router();

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Profile = typeof profilesTable.$inferSelect;

function newCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `MONTE-${s}`;
}

function normCode(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

function fullName(p: Pick<Profile, "firstName" | "lastName" | "username">): string {
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.username;
}

async function currentProfile(req: Request): Promise<Profile> {
  const u = req.user;
  return getOrCreateProfile(u.id, u.username ?? u.id, u.firstName, u.lastName, u.profileImageUrl);
}

async function findValidInvite(code: string) {
  if (!code) return null;
  const [inv] = await db.select().from(invitesTable).where(eq(invitesTable.code, code)).limit(1);
  if (!inv || inv.usedById || inv.revoked) return null;
  if (inv.expiresAt && inv.expiresAt < new Date()) return null;
  return inv;
}

async function createInvite(createdById: number) {
  for (let i = 0; i < 5; i++) {
    try {
      const [row] = await db.insert(invitesTable)
        .values({ code: newCode(), createdById, expiresAt: new Date(Date.now() + INVITE_TTL_MS) })
        .returning();
      return row;
    } catch {
      /* código repetido: se reintenta */
    }
  }
  throw new Error("No se pudo generar el código");
}

function inviteState(r: typeof invitesTable.$inferSelect): "used" | "revoked" | "expired" | "open" {
  if (r.usedById) return "used";
  if (r.revoked) return "revoked";
  if (r.expiresAt && r.expiresAt < new Date()) return "expired";
  return "open";
}

// ---------- Usuario ----------

router.get("/community/status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const p = await currentProfile(req);
  let invitedBy: string | null = null;
  if (p.invitedById) {
    const [inviter] = await db.select().from(profilesTable).where(eq(profilesTable.id, p.invitedById)).limit(1);
    if (inviter) invitedBy = fullName(inviter);
  }
  const open = await db.select({ id: invitesTable.id }).from(invitesTable)
    .where(and(
      eq(invitesTable.createdById, p.id),
      isNull(invitesTable.usedById),
      eq(invitesTable.revoked, false),
      sql`(${invitesTable.expiresAt} is null or ${invitesTable.expiresAt} > now())`,
    ));
  res.setHeader("Cache-Control", "no-store");
  res.json({
    status: p.memberStatus,
    openInvites: open.length,
    isAdmin: p.isAdmin,
    missing: missingProfileFields(p),
    invitedBy,
    invitesRemaining: p.invitesRemaining,
    firstName: p.firstName,
    lastName: p.lastName,
    avatarUrl: p.avatarUrl,
  });
});

router.get("/community/invite/:code", async (req: Request, res: Response) => {
  const inv = await findValidInvite(normCode(req.params.code));
  if (!inv) {
    res.json({ valid: false });
    return;
  }
  let inviterName: string | null = null;
  if (inv.createdById) {
    const [p] = await db.select().from(profilesTable).where(eq(profilesTable.id, inv.createdById)).limit(1);
    if (p) inviterName = p.firstName?.trim() || fullName(p);
  }
  res.json({ valid: true, inviterName });
});

router.post("/community/redeem", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const p = await currentProfile(req);
  if (p.memberStatus === "active") {
    res.json({ status: "active" });
    return;
  }
  if (p.memberStatus === "suspended") {
    res.status(403).json({ error: "Tu cuenta está suspendida." });
    return;
  }

  const invalid = "El código no existe, ya se usó o venció. Pedile uno nuevo a quien te invitó.";
  const inv = await findValidInvite(normCode(req.body?.code));
  if (!inv) {
    res.status(400).json({ error: invalid });
    return;
  }
  if (inv.createdById === p.id) {
    res.status(400).json({ error: "No podés usar tu propia invitación." });
    return;
  }

  const claimed = await db.update(invitesTable)
    .set({ usedById: p.id, usedAt: new Date() })
    .where(and(eq(invitesTable.id, inv.id), isNull(invitesTable.usedById), eq(invitesTable.revoked, false)))
    .returning();
  if (claimed.length === 0) {
    res.status(400).json({ error: invalid });
    return;
  }

  await db.update(profilesTable)
    .set({ memberStatus: "active", invitedById: inv.createdById, approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(profilesTable.id, p.id));
  res.json({ status: "active" });
});

router.get("/community/invites", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const p = await currentProfile(req);
  if (p.memberStatus !== "active" && !p.isAdmin) {
    res.status(403).json({ error: "Tu cuenta todavía no está activa." });
    return;
  }
  const rows = await db.select().from(invitesTable)
    .where(eq(invitesTable.createdById, p.id)).orderBy(desc(invitesTable.createdAt));
  const usedIds = rows.map((r) => r.usedById).filter((x): x is number => typeof x === "number");
  const users = usedIds.length
    ? await db.select().from(profilesTable).where(inArray(profilesTable.id, usedIds))
    : [];

  res.json({
    unlimited: p.isAdmin,
    invitesRemaining: p.invitesRemaining,
    invites: rows.map((r) => {
      const u = users.find((x) => x.id === r.usedById);
      return {
        code: r.code,
        state: inviteState(r),
        usedBy: u ? fullName(u) : null,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      };
    }),
  });
});

router.post("/community/invites", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const p = await currentProfile(req);
  if (!p.isAdmin) {
    if (p.memberStatus !== "active") {
      res.status(403).json({ error: "Tu cuenta todavía no está activa." });
      return;
    }
    if (missingProfileFields(p).length > 0) {
      res.status(403).json({ error: "Completá tu perfil antes de invitar." });
      return;
    }
    const dec = await db.update(profilesTable)
      .set({ invitesRemaining: sql`${profilesTable.invitesRemaining} - 1` })
      .where(and(eq(profilesTable.id, p.id), sql`${profilesTable.invitesRemaining} > 0`))
      .returning();
    if (dec.length === 0) {
      res.status(403).json({ error: "No te quedan invitaciones. Pedile más al administrador." });
      return;
    }
  }
  const inv = await createInvite(p.id);
  res.status(201).json({ code: inv.code });
});

router.post("/community/invites/:code/revoke", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const p = await currentProfile(req);
  const revoked = await db.update(invitesTable)
    .set({ revoked: true })
    .where(and(
      eq(invitesTable.code, normCode(req.params.code)),
      eq(invitesTable.createdById, p.id),
      isNull(invitesTable.usedById),
      eq(invitesTable.revoked, false),
    ))
    .returning();
  if (revoked.length === 0) {
    res.status(404).json({ error: "No encontramos esa invitación sin usar." });
    return;
  }
  if (!p.isAdmin) {
    await db.update(profilesTable)
      .set({ invitesRemaining: sql`${profilesTable.invitesRemaining} + 1` })
      .where(eq(profilesTable.id, p.id));
  }
  res.status(204).end();
});

// ---------- Admin ----------

async function requireAdmin(req: Request, res: Response): Promise<Profile | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const [p] = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (!p?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return p;
}

function parseId(v: unknown): number | null {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

router.get("/admin/community/members", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const rows = await db.select().from(profilesTable).orderBy(desc(profilesTable.createdAt));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const filtered = status ? rows.filter((r) => r.memberStatus === status) : rows;

  res.json({
    counts: {
      pending: rows.filter((r) => r.memberStatus === "pending").length,
      active: rows.filter((r) => r.memberStatus === "active").length,
      suspended: rows.filter((r) => r.memberStatus === "suspended").length,
    },
    members: filtered.map((r) => {
      const inviter = r.invitedById ? byId.get(r.invitedById) : undefined;
      return {
        id: r.id,
        name: fullName(r),
        username: r.username,
        avatarUrl: r.avatarUrl,
        phone: r.phone,
        memberStatus: r.memberStatus,
        isAdmin: r.isAdmin,
        invitesRemaining: r.invitesRemaining,
        invitedBy: inviter ? fullName(inviter) : null,
        invitedCount: rows.filter((x) => x.invitedById === r.id).length,
        missing: missingProfileFields(r),
        createdAt: r.createdAt.toISOString(),
      };
    }),
  });
});

const StatusBody = z.object({ status: z.enum(["active", "pending", "suspended"]) });

router.post("/admin/community/members/:id/status", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const id = parseId(req.params.id);
  const parsed = StatusBody.safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  if (id === admin.id && parsed.data.status !== "active") {
    res.status(400).json({ error: "No podés suspenderte a vos mismo." });
    return;
  }
  const { status } = parsed.data;
  const [row] = await db.update(profilesTable)
    .set({
      memberStatus: status,
      ...(status === "active" ? { approvedAt: new Date() } : {}),
      ...(status === "suspended" ? { invitesRemaining: 0 } : {}),
      updatedAt: new Date(),
    })
    .where(eq(profilesTable.id, id))
    .returning();

  if (status === "suspended") {
    await db.update(invitesTable)
      .set({ revoked: true })
      .where(and(eq(invitesTable.createdById, id), isNull(invitesTable.usedById)));
  }
  res.json({ ok: true, memberStatus: row?.memberStatus ?? null });
});

const InvitesBody = z.object({ add: z.number().int().min(1).max(50) });

router.post("/admin/community/members/:id/invites", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseId(req.params.id);
  const parsed = InvitesBody.safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db.update(profilesTable)
    .set({ invitesRemaining: sql`${profilesTable.invitesRemaining} + ${parsed.data.add}` })
    .where(eq(profilesTable.id, id))
    .returning();
  res.json({ ok: true, invitesRemaining: row?.invitesRemaining ?? null });
});

router.post("/admin/community/invites", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const inv = await createInvite(admin.id);
  res.status(201).json({ code: inv.code });
});

export default router;
