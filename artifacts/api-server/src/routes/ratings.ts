import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profilesTable, ratingsTable, tripsTable, bookingsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.post("/ratings", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { tripId, ratedUserId, stars, comment } = req.body;

  if (!tripId || !ratedUserId || !stars) {
    res.status(400).json({ error: "tripId, ratedUserId, and stars are required" });
    return;
  }

  if (stars < 1 || stars > 5) {
    res.status(400).json({ error: "Stars must be between 1 and 5" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const trip = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1);
  if (trip.length === 0) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  if (trip[0].status !== "completed") {
    res.status(400).json({ error: "Can only rate completed trips" });
    return;
  }

  // Solo pueden calificarse quienes compartieron el viaje: pasajeros al conductor y conductor a pasajeros.
  const raterId = profile[0].id;
  const ratedId = Number(ratedUserId);
  const driverId = trip[0].driverId;
  const confirmed = await db.select({ passengerId: bookingsTable.passengerId }).from(bookingsTable)
    .where(and(eq(bookingsTable.tripId, trip[0].id), eq(bookingsTable.status, "confirmed")));
  const participants = new Set<number>([driverId, ...confirmed.map((b) => b.passengerId)]);
  if (!participants.has(raterId) || !participants.has(ratedId) || raterId === ratedId) {
    res.status(403).json({ error: "Solo podés calificar a quienes viajaron con vos en este viaje" });
    return;
  }
  if (raterId !== driverId && ratedId !== driverId) {
    res.status(403).json({ error: "Los pasajeros califican al conductor" });
    return;
  }

  const existingRating = await db.select().from(ratingsTable).where(
    and(
      eq(ratingsTable.tripId, tripId),
      eq(ratingsTable.raterId, profile[0].id),
      eq(ratingsTable.ratedUserId, ratedUserId)
    )
  ).limit(1);

  if (existingRating.length > 0) {
    res.status(400).json({ error: "You have already rated this user for this trip" });
    return;
  }

  const inserted = await db.insert(ratingsTable).values({
    tripId,
    raterId: profile[0].id,
    ratedUserId,
    stars: parseInt(stars),
    comment: comment ?? null,
  }).returning();

  res.status(201).json({
    ...inserted[0],
    createdAt: inserted[0].createdAt.toISOString(),
  });
});

export default router;
