import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profilesTable, tripsTable, bookingsTable } from "@workspace/db/schema";
import { eq, avg, count, and } from "drizzle-orm";
import { ratingsTable } from "@workspace/db/schema";

const router: IRouter = Router();

async function getOrCreateProfile(replitUserId: string, username: string, firstName?: string | null, lastName?: string | null, avatarUrl?: string | null) {
  let profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, replitUserId)).limit(1);
  if (profile.length === 0) {
    const dicebearUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    const inserted = await db.insert(profilesTable).values({
      replitUserId,
      username,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      avatarUrl: avatarUrl ?? dicebearUrl,
      memberStatus: "pending",
    }).returning();
    return inserted[0];
  }
  return profile[0];
}

async function profileWithRating(profile: typeof profilesTable.$inferSelect) {
  const ratingResult = await db
    .select({ avg: avg(ratingsTable.stars), count: count() })
    .from(ratingsTable)
    .where(eq(ratingsTable.ratedUserId, profile.id));

  return {
    ...profile,
    avgRating: ratingResult[0]?.avg ? parseFloat(ratingResult[0].avg) : null,
    totalRatings: Number(ratingResult[0]?.count ?? 0),
    createdAt: profile.createdAt.toISOString(),
  };
}

router.get("/users/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  const profile = await getOrCreateProfile(
    user.id,
    user.username ?? user.id,
    user.firstName,
    user.lastName,
    user.profileImageUrl,
  );
  res.json(await profileWithRating(profile));
});

router.put("/users/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  let profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, user.id)).limit(1);
  if (profile.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const { firstName, lastName, isDriver, vehicleModel, vehicleColor, licensePlate, totalSeats, acceptsPackages, dni, phone, avatarStyle, avatarUrl } = req.body;
  const updated = await db.update(profilesTable)
    .set({
      firstName: firstName !== undefined ? firstName : profile[0].firstName,
      lastName: lastName !== undefined ? lastName : profile[0].lastName,
      isDriver: isDriver !== undefined ? isDriver : profile[0].isDriver,
      vehicleModel: vehicleModel !== undefined ? vehicleModel : profile[0].vehicleModel,
      vehicleColor: vehicleColor !== undefined ? vehicleColor : profile[0].vehicleColor,
      licensePlate: licensePlate !== undefined ? licensePlate : profile[0].licensePlate,
      totalSeats: totalSeats !== undefined ? totalSeats : profile[0].totalSeats,
      acceptsPackages: acceptsPackages !== undefined ? acceptsPackages : profile[0].acceptsPackages,
      dni: dni !== undefined ? dni : profile[0].dni,
      phone: phone !== undefined ? phone : profile[0].phone,
      avatarStyle: avatarStyle !== undefined ? avatarStyle : profile[0].avatarStyle,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : profile[0].avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(profilesTable.replitUserId, user.id))
    .returning();

  res.json(await profileWithRating(updated[0]));
});

router.get("/users/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const profile = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
  if (profile.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const base = await profileWithRating(profile[0]);

  const [driverTripsResult] = await db
    .select({ count: count() })
    .from(tripsTable)
    .where(and(eq(tripsTable.driverId, userId), eq(tripsTable.status, "completed")));

  const [passengerTripsResult] = await db
    .select({ count: count() })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.passengerId, userId), eq(bookingsTable.status, "confirmed")));

  const { dni, phone, replitUserId, ...publicProfile } = base;

  res.json({
    ...publicProfile,
    tripsAsDriver: Number(driverTripsResult?.count ?? 0),
    tripsAsPassenger: Number(passengerTripsResult?.count ?? 0),
  });
});

export { getOrCreateProfile, profileWithRating };
export default router;
