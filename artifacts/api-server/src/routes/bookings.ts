import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profilesTable, tripsTable, bookingsTable } from "@workspace/db/schema";
import { eq, and, or } from "drizzle-orm";
import { tripWithDriverInfo } from "./trips";
import { sendPushToProfile } from "./push";

const router: IRouter = Router();

router.post("/bookings", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { tripId, seatsBooked = 1 } = req.body;

  const trip = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1);
  if (trip.length === 0) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  if (trip[0].availableSeats < seatsBooked) {
    res.status(400).json({ error: "Not enough seats available" });
    return;
  }

  if (trip[0].status !== "scheduled") {
    res.status(400).json({ error: "Trip is not available for booking" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  if (trip[0].driverId === profile[0].id) {
    res.status(400).json({ error: "Drivers cannot book their own trips" });
    return;
  }

  const existingBooking = await db.select().from(bookingsTable).where(
    and(
      eq(bookingsTable.tripId, tripId),
      eq(bookingsTable.passengerId, profile[0].id),
      or(eq(bookingsTable.status, "confirmed"), eq(bookingsTable.status, "pending"))
    )
  ).limit(1);

  if (existingBooking.length > 0) {
    res.status(400).json({ error: "Ya tenés una reserva activa para este viaje" });
    return;
  }

  await db.update(tripsTable)
    .set({ availableSeats: trip[0].availableSeats - seatsBooked, updatedAt: new Date() })
    .where(eq(tripsTable.id, tripId));

  const booking = await db.insert(bookingsTable).values({
    tripId,
    passengerId: profile[0].id,
    status: "pending",
    seatsBooked,
  }).returning();

  const tripInfo = await tripWithDriverInfo((await db.select().from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1))[0]);
  const passengerName = `${profile[0].firstName ?? ""} ${profile[0].lastName ?? ""}`.trim() || profile[0].username;

  sendPushToProfile(trip[0].driverId, {
    title: "🙋 Nueva solicitud de reserva",
    body: `${passengerName} quiere ${seatsBooked} lugar(es) en tu viaje ${trip[0].origin} → ${trip[0].destination}. ¡Aceptá o rechazá!`,
    url: `/trip/${tripId}`,
  }).catch(() => {});

  res.status(201).json({
    ...booking[0],
    passengerName,
    passengerAvatarUrl: profile[0].avatarUrl,
    trip: tripInfo,
    createdAt: booking[0].createdAt.toISOString(),
  });
});

router.get("/bookings/driver/pending-count", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) {
    res.json({ count: 0 });
    return;
  }

  const driverTrips = await db.select({ id: tripsTable.id }).from(tripsTable)
    .where(eq(tripsTable.driverId, profile[0].id));

  if (driverTrips.length === 0) {
    res.json({ count: 0 });
    return;
  }

  const tripIds = driverTrips.map(t => t.id);
  let count = 0;
  for (const tripId of tripIds) {
    const pending = await db.select({ id: bookingsTable.id }).from(bookingsTable)
      .where(and(eq(bookingsTable.tripId, tripId), eq(bookingsTable.status, "pending")));
    count += pending.length;
  }

  res.json({ count });
});

router.get("/bookings/my", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) {
    res.json({ bookings: [] });
    return;
  }

  const bookings = await db.select().from(bookingsTable)
    .where(eq(bookingsTable.passengerId, profile[0].id))
    .orderBy(bookingsTable.createdAt);

  const bookingsWithTrips = await Promise.all(bookings.map(async (b) => {
    const trip = await db.select().from(tripsTable).where(eq(tripsTable.id, b.tripId)).limit(1);
    const tripInfo = trip.length > 0 ? await tripWithDriverInfo(trip[0]) : null;
    return {
      ...b,
      passengerName: `${profile[0].firstName ?? ""} ${profile[0].lastName ?? ""}`.trim() || profile[0].username,
      passengerAvatarUrl: profile[0].avatarUrl,
      trip: tripInfo,
      createdAt: b.createdAt.toISOString(),
    };
  }));

  res.json({ bookings: bookingsWithTrips });
});

router.patch("/bookings/:bookingId/confirm", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const bookingId = parseInt(req.params.bookingId);
  if (isNaN(bookingId)) {
    res.status(400).json({ error: "Invalid booking ID" });
    return;
  }

  const driverProfile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (driverProfile.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const booking = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (booking.length === 0) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const trip = await db.select().from(tripsTable).where(eq(tripsTable.id, booking[0].tripId)).limit(1);
  if (trip.length === 0 || trip[0].driverId !== driverProfile[0].id) {
    res.status(403).json({ error: "Solo el conductor puede confirmar reservas" });
    return;
  }

  if (booking[0].status !== "pending") {
    res.status(400).json({ error: "Solo se pueden confirmar reservas pendientes" });
    return;
  }

  const [updated] = await db.update(bookingsTable)
    .set({ status: "confirmed" })
    .where(eq(bookingsTable.id, bookingId))
    .returning();

  const passengerProfile = await db.select().from(profilesTable).where(eq(profilesTable.id, booking[0].passengerId)).limit(1);
  const driverName = `${driverProfile[0].firstName ?? ""} ${driverProfile[0].lastName ?? ""}`.trim() || driverProfile[0].username;

  sendPushToProfile(booking[0].passengerId, {
    title: "✅ ¡Tu lugar fue confirmado!",
    body: `${driverName} confirmó tu reserva en el viaje ${trip[0].origin} → ${trip[0].destination}.`,
    url: `/trip/${trip[0].id}`,
  }).catch(() => {});

  res.json({
    ...updated,
    passengerName: passengerProfile[0] ? `${passengerProfile[0].firstName ?? ""} ${passengerProfile[0].lastName ?? ""}`.trim() || passengerProfile[0].username : null,
    passengerAvatarUrl: passengerProfile[0]?.avatarUrl ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.patch("/bookings/:bookingId/reject", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const bookingId = parseInt(req.params.bookingId);
  if (isNaN(bookingId)) {
    res.status(400).json({ error: "Invalid booking ID" });
    return;
  }

  const driverProfile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (driverProfile.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const booking = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (booking.length === 0) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const trip = await db.select().from(tripsTable).where(eq(tripsTable.id, booking[0].tripId)).limit(1);
  if (trip.length === 0 || trip[0].driverId !== driverProfile[0].id) {
    res.status(403).json({ error: "Solo el conductor puede rechazar reservas" });
    return;
  }

  if (booking[0].status !== "pending") {
    res.status(400).json({ error: "Solo se pueden rechazar reservas pendientes" });
    return;
  }

  const { reason } = req.body;
  const driverName = `${driverProfile[0].firstName ?? ""} ${driverProfile[0].lastName ?? ""}`.trim() || driverProfile[0].username;

  await db.update(bookingsTable)
    .set({ status: "cancelled", rejectionReason: reason || null })
    .where(eq(bookingsTable.id, bookingId));

  await db.update(tripsTable)
    .set({ availableSeats: trip[0].availableSeats + booking[0].seatsBooked, updatedAt: new Date() })
    .where(eq(tripsTable.id, booking[0].tripId));

  sendPushToProfile(booking[0].passengerId, {
    title: "❌ Reserva no disponible",
    body: `${driverName} no pudo aceptar tu reserva para ${trip[0].origin} → ${trip[0].destination}. Podés buscar otro viaje.`,
    url: "/",
  }).catch(() => {});

  const [updated] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.patch("/bookings/:bookingId/cancel", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const bookingId = parseInt(req.params.bookingId);
  if (isNaN(bookingId)) {
    res.status(400).json({ error: "Invalid booking ID" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const booking = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (booking.length === 0) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (booking[0].passengerId !== profile[0].id) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  await db.update(bookingsTable)
    .set({ status: "cancelled" })
    .where(eq(bookingsTable.id, bookingId));

  const [currentTrip] = await db.select().from(tripsTable).where(eq(tripsTable.id, booking[0].tripId)).limit(1);
  await db.update(tripsTable)
    .set({ availableSeats: currentTrip.availableSeats + booking[0].seatsBooked, updatedAt: new Date() })
    .where(eq(tripsTable.id, booking[0].tripId));

  const [updated] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
