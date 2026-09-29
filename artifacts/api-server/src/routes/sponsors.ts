import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  profilesTable, sponsorsTable, sponsorPlacementsTable, sponsorEventsTable,
} from "@workspace/db/schema";
import { and, eq, lte, gte, inArray, sql, asc } from "drizzle-orm";

const router: IRouter = Router();

const SLOTS = ["home_banner", "guide_listing", "guide_featured", "meeting_point", "trip_coupon"] as const;
const EVENTS = ["view", "click_whatsapp", "click_map", "click_web", "coupon_shown"] as const;
type Slot = (typeof SLOTS)[number];

function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const p = await db.select({ isAdmin: profilesTable.isAdmin }).from(profilesTable)
    .where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (!p[0]?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

function activeNow() {
  const d = today();
  return and(
    eq(sponsorPlacementsTable.active, true),
    eq(sponsorsTable.active, true),
    lte(sponsorPlacementsTable.startsAt, d),
    gte(sponsorPlacementsTable.endsAt, d),
  );
}

const publicFields = {
  placementId: sponsorPlacementsTable.id,
  slot: sponsorPlacementsTable.slot,
  headline: sponsorPlacementsTable.headline,
  body: sponsorPlacementsTable.body,
  couponText: sponsorPlacementsTable.couponText,
  zone: sponsorPlacementsTable.zone,
  priority: sponsorPlacementsTable.priority,
  sponsorId: sponsorsTable.id,
  name: sponsorsTable.name,
  category: sponsorsTable.category,
  description: sponsorsTable.description,
  address: sponsorsTable.address,
  whatsapp: sponsorsTable.whatsapp,
  website: sponsorsTable.website,
  logoUrl: sponsorsTable.logoUrl,
  lat: sponsorsTable.lat,
  lng: sponsorsTable.lng,
};

// ---------- Público ----------

router.get("/sponsors/slot/:slot", async (req: Request, res: Response) => {
  const slot = String(req.params.slot);
  if (!(SLOTS as readonly string[]).includes(slot)) {
    res.status(400).json({ error: "Invalid slot" });
    return;
  }
  const zone = typeof req.query.zone === "string" && req.query.zone ? req.query.zone : null;

  const rows = await db.select(publicFields).from(sponsorPlacementsTable)
    .innerJoin(sponsorsTable, eq(sponsorPlacementsTable.sponsorId, sponsorsTable.id))
    .where(and(activeNow(), eq(sponsorPlacementsTable.slot, slot as Slot)));

  const pool = zone ? rows.filter((r) => r.zone === zone || !r.zone) : rows;
  res.setHeader("Cache-Control", "no-store");
  if (pool.length === 0) {
    res.json({ placement: null });
    return;
  }
  const top = Math.max(...pool.map((r) => r.priority));
  const best = pool.filter((r) => r.priority === top);
  res.json({ placement: best[Math.floor(Math.random() * best.length)] });
});

router.get("/sponsors/guide", async (_req: Request, res: Response) => {
  const rows = await db.select(publicFields).from(sponsorPlacementsTable)
    .innerJoin(sponsorsTable, eq(sponsorPlacementsTable.sponsorId, sponsorsTable.id))
    .where(and(activeNow(), inArray(sponsorPlacementsTable.slot, ["guide_listing", "guide_featured"])));

  const bySponsor = new Map<number, (typeof rows)[number] & { featured: boolean }>();
  for (const r of rows) {
    const featured = r.slot === "guide_featured";
    const cur = bySponsor.get(r.sponsorId);
    if (!cur || (featured && !cur.featured)) bySponsor.set(r.sponsorId, { ...r, featured });
  }
  const items = [...bySponsor.values()].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, "es"),
  );
  const categories = [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b, "es"));
  res.setHeader("Cache-Control", "no-store");
  res.json({ items, categories });
});

const EventBody = z.object({
  placementId: z.number().int().positive(),
  type: z.enum(EVENTS),
});

router.post("/sponsors/events", async (req: Request, res: Response) => {
  const parsed = EventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid event" });
    return;
  }
  const { placementId, type } = parsed.data;
  const exists = await db.select({ id: sponsorPlacementsTable.id }).from(sponsorPlacementsTable)
    .where(eq(sponsorPlacementsTable.id, placementId)).limit(1);
  if (exists.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.insert(sponsorEventsTable)
    .values({ placementId, eventType: type, day: today(), count: 1 })
    .onConflictDoUpdate({
      target: [sponsorEventsTable.placementId, sponsorEventsTable.eventType, sponsorEventsTable.day],
      set: { count: sql`${sponsorEventsTable.count} + 1` },
    });
  res.status(204).end();
});

// ---------- Admin ----------

const optText = (max: number) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null));
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const SponsorBody = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  description: optText(500),
  address: optText(200),
  whatsapp: optText(30),
  website: optText(300),
  logoUrl: optText(300),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  active: z.boolean().optional(),
  notes: optText(1000),
});

const PlacementBody = z.object({
  slot: z.enum(SLOTS),
  headline: optText(120),
  body: optText(300),
  couponText: optText(120),
  zone: optText(60),
  startsAt: dateStr,
  endsAt: dateStr,
  active: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

function parseId(v: unknown): number | null {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

router.get("/admin/sponsors", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const sponsors = await db.select().from(sponsorsTable).orderBy(asc(sponsorsTable.name));
  const placements = await db.select().from(sponsorPlacementsTable).orderBy(asc(sponsorPlacementsTable.startsAt));
  res.json({
    today: today(),
    sponsors: sponsors.map((s) => ({ ...s, placements: placements.filter((p) => p.sponsorId === s.id) })),
  });
});

router.post("/admin/sponsors", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = SponsorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") });
    return;
  }
  const [row] = await db.insert(sponsorsTable).values(parsed.data).returning();
  res.status(201).json({ sponsor: row });
});

router.put("/admin/sponsors/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseId(req.params.id);
  const parsed = SponsorBody.partial().safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db.update(sponsorsTable).set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(sponsorsTable.id, id)).returning();
  res.json({ sponsor: row ?? null });
});

router.delete("/admin/sponsors/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(sponsorsTable).where(eq(sponsorsTable.id, id));
  res.status(204).end();
});

router.post("/admin/sponsors/:id/placements", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const sponsorId = parseId(req.params.id);
  const parsed = PlacementBody.safeParse(req.body);
  if (!sponsorId || !parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  if (parsed.data.endsAt < parsed.data.startsAt) {
    res.status(400).json({ error: "La fecha de fin es anterior a la de inicio" });
    return;
  }
  const [row] = await db.insert(sponsorPlacementsTable).values({ ...parsed.data, sponsorId }).returning();
  res.status(201).json({ placement: row });
});

router.put("/admin/placements/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseId(req.params.id);
  const parsed = PlacementBody.partial().safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db.update(sponsorPlacementsTable).set(parsed.data)
    .where(eq(sponsorPlacementsTable.id, id)).returning();
  res.json({ placement: row ?? null });
});

router.delete("/admin/placements/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(sponsorPlacementsTable).where(eq(sponsorPlacementsTable.id, id));
  res.status(204).end();
});

router.get("/admin/sponsors/report", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const month = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
    ? req.query.month
    : today().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

  const totals = await db.select({
    placementId: sponsorEventsTable.placementId,
    eventType: sponsorEventsTable.eventType,
    total: sql<number>`sum(${sponsorEventsTable.count})::int`,
  }).from(sponsorEventsTable)
    .where(and(gte(sponsorEventsTable.day, start), lte(sponsorEventsTable.day, end)))
    .groupBy(sponsorEventsTable.placementId, sponsorEventsTable.eventType);

  const placements = await db.select({
    placementId: sponsorPlacementsTable.id,
    slot: sponsorPlacementsTable.slot,
    sponsorName: sponsorsTable.name,
  }).from(sponsorPlacementsTable)
    .innerJoin(sponsorsTable, eq(sponsorPlacementsTable.sponsorId, sponsorsTable.id));

  const rows = placements.map((p) => {
    const row: Record<string, string | number> = { ...p };
    for (const e of EVENTS) {
      row[e] = totals.find((t) => t.placementId === p.placementId && t.eventType === e)?.total ?? 0;
    }
    return row;
  }).filter((r) => EVENTS.some((e) => Number(r[e]) > 0));

  res.json({ month, rows });
});

export default router;
