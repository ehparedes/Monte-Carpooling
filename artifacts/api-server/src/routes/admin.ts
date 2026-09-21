import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profilesTable, tripsTable, ratingsTable } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import { tripWithDriverInfo } from "./trips";

const router: IRouter = Router();

async function isAdmin(replitUserId: string): Promise<boolean> {
  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, replitUserId)).limit(1);
  return profile.length > 0 && profile[0].isAdmin;
}

router.get("/admin/users", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!(await isAdmin(req.user.id))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const profiles = await db.select().from(profilesTable).orderBy(profilesTable.createdAt);

  const usersWithRatings = await Promise.all(profiles.map(async (p) => {
    const ratingCount = await db.select({ count: count() }).from(ratingsTable).where(eq(ratingsTable.ratedUserId, p.id));
    return {
      id: p.id,
      replitUserId: p.replitUserId,
      username: p.username,
      isDriver: p.isDriver,
      isAdmin: p.isAdmin,
      totalRatings: Number(ratingCount[0]?.count ?? 0),
      createdAt: p.createdAt.toISOString(),
    };
  }));

  res.json({ users: usersWithRatings });
});

router.delete("/admin/users/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!(await isAdmin(req.user.id))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  await db.delete(profilesTable).where(eq(profilesTable.id, userId));
  res.json({ success: true });
});

router.get("/admin/trips", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!(await isAdmin(req.user.id))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const trips = await db.select().from(tripsTable).orderBy(tripsTable.createdAt);
  const tripsWithInfo = await Promise.all(trips.map(tripWithDriverInfo));

  res.json({ trips: tripsWithInfo });
});

export default router;
