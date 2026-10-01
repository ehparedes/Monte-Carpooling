import { Router, type IRouter } from "express";
import { sendPushToProfile } from "./push";
import { sendPushToProfile } from "./push";
import { db } from "@workspace/db";
import { profilesTable, tripsTable, bookingsTable, ratingsTable } from "@workspace/db/schema";
import { eq, and, sql, avg, or } from "drizzle-orm";

const router: IRouter = Router();

// Teléfono y patente solo para el conductor, sus pasajeros confirmados y admins.
function hidePrivateDriverData<T extends object>(t: T): T {
  return { ...t, driverPhone: null, licensePlate: null };
}

async function tripWithDriverInfo(trip: typeof tripsTable.$inferSelect) {
  const driver = await db.select().from(profilesTable).where(eq(profilesTable.id, trip.driverId)).limit(1);
  const driverProfile = driver[0];

  const ratingResult = await db
    .select({ avg: avg(ratingsTable.stars) })
    .from(ratingsTable)
    .where(eq(ratingsTable.ratedUserId, trip.driverId));

  return {
    ...trip,
    pricePerSeat: parseFloat(trip.pricePerSeat),
    driverName: driverProfile ? `${driverProfile.firstName ?? ""} ${driverProfile.lastName ?? ""}`.trim() || driverProfile.username : null,
    driverAvatarUrl: driverProfile?.avatarUrl ?? null,
    driverPhone: driverProfile?.phone ?? null,
    vehicleModel: driverProfile?.vehicleModel ?? null,
    vehicleColor: driverProfile?.vehicleColor ?? null,
    licensePlate: driverProfile?.licensePlate ?? null,
    driverRating: ratingResult[0]?.avg ? parseFloat(ratingResult[0].avg) : null,
    createdAt: trip.createdAt.toISOString(),
  };
}

router.get("/trips", async (req, res) => {
  const { origin, destination, date, status } = req.query;

  let query = db.select().from(tripsTable).$dynamic();

  const conditions = [];
  if (origin && typeof origin === "string") conditions.push(eq(tripsTable.origin, origin));
  if (destination && typeof destination === "string") conditions.push(eq(tripsTable.destination, destination));
  if (date && typeof date === "string") conditions.push(eq(tripsTable.date, date));
  if (status && typeof status === "string") {
    conditions.push(eq(tripsTable.status, status as "scheduled" | "in_progress" | "completed" | "cancelled"));
  } else {
    conditions.push(eq(tripsTable.status, "scheduled"));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const trips = await query.orderBy(sql`${tripsTable.date} ASC, ${tripsTable.time} ASC`);
  const tripsWithInfo = await Promise.all(trips.map(tripWithDriverInfo));

  res.json({ trips: tripsWithInfo.map(hidePrivateDriverData) });
});

router.get("/trips/my/driver", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) {
    res.json({ trips: [] });
    return;
  }

  const trips = await db.select().from(tripsTable)
    .where(eq(tripsTable.driverId, profile[0].id))
    .orderBy(sql`${tripsTable.date} DESC`);

  const tripsWithInfo = await Promise.all(trips.map(async (trip) => {
    const base = await tripWithDriverInfo(trip);

    const pendingBookingsRaw = await db.select().from(bookingsTable)
      .where(and(eq(bookingsTable.tripId, trip.id), eq(bookingsTable.status, "pending")));

    const pendingBookings = await Promise.all(pendingBookingsRaw.map(async (b) => {
      const passenger = await db.select().from(profilesTable).where(eq(profilesTable.id, b.passengerId)).limit(1);
      const p = passenger[0];
      return {
        id: b.id,
        passengerId: b.passengerId,
        passengerName: p ? (`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.username) : "Usuario",
        passengerAvatarUrl: p?.avatarUrl ?? null,
        seatsBooked: b.seatsBooked,
        createdAt: b.createdAt.toISOString(),
      };
    }));

    const confirmedBookingsRaw = await db.select().from(bookingsTable)
      .where(and(eq(bookingsTable.tripId, trip.id), eq(bookingsTable.status, "confirmed")));

    const confirmedPassengers = await Promise.all(confirmedBookingsRaw.map(async (b) => {
      const passenger = await db.select().from(profilesTable).where(eq(profilesTable.id, b.passengerId)).limit(1);
      const p = passenger[0];
      return {
        id: b.id,
        passengerId: b.passengerId,
        passengerName: p ? (`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.username) : "Usuario",
        passengerAvatarUrl: p?.avatarUrl ?? null,
        seatsBooked: b.seatsBooked,
      };
    }));

    return { ...base, pendingBookings, confirmedPassengers };
  }));

  res.json({ trips: tripsWithInfo });
});

router.get("/trips/:tripId", async (req, res) => {
  const tripId = parseInt(req.params.tripId);
  if (isNaN(tripId)) {
    res.status(400).json({ error: "Invalid trip ID" });
    return;
  }

  const trip = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1);
  if (trip.length === 0) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  // autoCloseStale: cerrar viajes viejos que nadie marcó como terminados
  if (trip[0].status === "scheduled" || trip[0].status === "in_progress") {
    const tripDate = new Date(`${trip[0].date}T${trip[0].time || "00:00"}:00-03:00`);
    if (!isNaN(tripDate.getTime()) && Date.now() - tripDate.getTime() > 6 * 60 * 60 * 1000) {
      await db.update(tripsTable).set({ status: "completed", updatedAt: new Date() }).where(eq(tripsTable.id, tripId));
      trip[0].status = "completed";
    }
  }

  const bookings = await db.select().from(bookingsTable).where(
    and(eq(bookingsTable.tripId, tripId), or(eq(bookingsTable.status, "confirmed"), eq(bookingsTable.status, "pending")))
  );

  const bookingsWithPassengers = await Promise.all(bookings.map(async (b) => {
    const passenger = await db.select().from(profilesTable).where(eq(profilesTable.id, b.passengerId)).limit(1);
    return {
      ...b,
      passengerName: passenger[0] ? `${passenger[0].firstName ?? ""} ${passenger[0].lastName ?? ""}`.trim() || passenger[0].username : null,
      passengerAvatarUrl: passenger[0]?.avatarUrl ?? null,
      createdAt: b.createdAt.toISOString(),
    };
  }));

  const tripWithInfo = await tripWithDriverInfo(trip[0]);
  let canSeePrivate = false;
  if (req.isAuthenticated()) {
    const [viewer] = await db.select().from(profilesTable)
      .where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
    if (viewer) {
      canSeePrivate = viewer.isAdmin || viewer.id === trip[0].driverId ||
        bookings.some((b) => b.passengerId === viewer.id && b.status === "confirmed");
    }
  }
  const safeTrip = canSeePrivate ? tripWithInfo : hidePrivateDriverData(tripWithInfo);
  res.json({ ...safeTrip, bookings: bookingsWithPassengers });
});

router.post("/trips", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0 || !profile[0].isDriver) {
    res.status(403).json({ error: "Para publicar viajes, activá la opción de conductor en tu perfil." });
    return;
  }

  const missingVehicle = [
    !profile[0].vehicleModel?.trim() && "modelo",
    !profile[0].vehicleColor?.trim() && "color",
    !profile[0].licensePlate?.trim() && "patente",
  ].filter(Boolean);
  if (missingVehicle.length > 0) {
    res.status(400).json({
      error: `Antes de publicar, cargá en tu perfil los datos del auto que faltan: ${missingVehicle.join(", ")}.`,
    });
    return;
  }

  const { origin, destination, date, time, availableSeats, pricePerSeat, priceType, meetingPoint, acceptsPackages } = req.body;
  const resolvedPriceType: "fixed" | "free" | "optional" = ["fixed", "free", "optional"].includes(priceType) ? priceType : "fixed";
  const resolvedPrice = resolvedPriceType === "fixed" ? (pricePerSeat ?? 0).toString() : "0";

  const inserted = await db.insert(tripsTable).values({
    driverId: profile[0].id,
    origin,
    destination,
    date,
    time,
    availableSeats: parseInt(availableSeats),
    totalSeats: parseInt(availableSeats),
    pricePerSeat: resolvedPrice,
    priceType: resolvedPriceType,
    meetingPoint,
    acceptsPackages: acceptsPackages ?? false,
    status: "scheduled",
  }).returning();

  res.status(201).json(await tripWithDriverInfo(inserted[0]));
});

router.patch("/trips/:tripId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const tripId = parseInt(req.params.tripId);
  if (isNaN(tripId)) {
    res.status(400).json({ error: "Invalid trip ID" });
    return;
  }

  const trip = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1);
  if (trip.length === 0) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  const isDriverOrAdmin = profile[0].id === trip[0].driverId || profile[0].isAdmin;

  // Para iniciar o terminar, el pasajero confirmado también puede
  const { status } = req.body;
  let isParticipant = isDriverOrAdmin;
  if (!isParticipant && (status === "in_progress" || status === "completed")) {
    const pBooking = await db.select().from(bookingsTable)
      .where(and(eq(bookingsTable.tripId, tripId), eq(bookingsTable.passengerId, profile[0].id), eq(bookingsTable.status, "confirmed")))
      .limit(1);
    isParticipant = pBooking.length > 0;
  }
  if (!isParticipant) {
    res.status(403).json({ error: "No tenés permiso para cambiar este viaje." });
    return;
  }

  // Validar transiciones permitidas
  const allowed: Record<string, string[]> = {
    scheduled: ["in_progress", "cancelled"],
    in_progress: ["completed"],
  };
  if (!allowed[trip[0].status]?.includes(status)) {
    res.status(400).json({ error: `No se puede pasar de "${trip[0].status}" a "${status}".` });
    return;
  }

  const updated = await db.update(tripsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(tripsTable.id, tripId))
    .returning();

  const result = await tripWithDriverInfo(updated[0]);

  // notifyParticipants
  const actorName = `${profile[0].firstName ?? ""} ${profile[0].lastName ?? ""}`.trim() || profile[0].username;
  const allBookings = await db.select().from(bookingsTable)
    .where(and(eq(bookingsTable.tripId, tripId), eq(bookingsTable.status, "confirmed")));
  const participantIds = [trip[0].driverId, ...allBookings.map(b => b.passengerId)]
    .filter(id => id !== profile[0].id);

  const msgs: Record<string, { title: string; body: string }> = {
    in_progress: { title: "🚗 ¡Viaje iniciado!", body: `${actorName} marcó que el viaje ${trip[0].origin} → ${trip[0].destination} está en camino.` },
    completed: { title: "🏁 Viaje terminado", body: `El viaje ${trip[0].origin} → ${trip[0].destination} terminó. ¡Calificá a tus compañeros de viaje!` },
    cancelled: { title: "❌ Viaje cancelado", body: `${actorName} canceló el viaje ${trip[0].origin} → ${trip[0].destination}.` },
  };
  const msg = msgs[status];
  if (msg) {
    for (const pid of participantIds) {
      sendPushToProfile(pid, { ...msg, url: `/trip/${tripId}` }).catch(() => {});
    }
  }

  res.json(result);
});

router.delete("/trips/:tripId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const tripId = parseInt(req.params.tripId);
  if (isNaN(tripId)) {
    res.status(400).json({ error: "Invalid trip ID" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0 || !profile[0].isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  await db.delete(tripsTable).where(eq(tripsTable.id, tripId));
  res.json({ success: true });
});

export { tripWithDriverInfo };
export default router;
