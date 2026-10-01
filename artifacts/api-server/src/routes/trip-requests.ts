import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profilesTable, tripRequestsTable, tripRequestOffersTable, tripsTable, bookingsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendPushToProfile } from "./push";

const router: IRouter = Router();

async function requestWithPassengerInfo(req: typeof tripRequestsTable.$inferSelect) {
  const passenger = await db.select().from(profilesTable).where(eq(profilesTable.id, req.passengerId)).limit(1);
  const profile = passenger[0];
  return {
    ...req,
    passengerName: profile ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || profile.username : null,
    passengerAvatarUrl: profile?.avatarUrl ?? null,
    passengerPhone: profile?.phone ?? null,
    createdAt: req.createdAt.toISOString(),
  };
}

async function requestWithOffersInfo(req: typeof tripRequestsTable.$inferSelect) {
  const base = await requestWithPassengerInfo(req);
  const offers = await db.select().from(tripRequestOffersTable)
    .where(eq(tripRequestOffersTable.tripRequestId, req.id))
    .orderBy(sql`${tripRequestOffersTable.createdAt} DESC`);

  const offersWithDriverInfo = await Promise.all(offers.map(async (offer) => {
    const driver = await db.select().from(profilesTable).where(eq(profilesTable.id, offer.driverProfileId)).limit(1);
    const d = driver[0];
    return {
      id: offer.id,
      status: offer.status,
      createdAt: offer.createdAt.toISOString(),
      driverProfileId: offer.driverProfileId,
      driverName: d ? `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || d.username : "Conductor",
      driverAvatarUrl: d?.avatarUrl ?? null,
      driverPhone: d?.phone ?? null,
      driverBio: d?.bio ?? null,
    };
  }));

  return { ...base, offers: offersWithDriverInfo };
}

router.get("/trip-requests", async (req, res) => {
  const { origin, destination, date, status } = req.query;
  const conditions = [];

  if (origin && typeof origin === "string") conditions.push(eq(tripRequestsTable.origin, origin));
  if (destination && typeof destination === "string") conditions.push(eq(tripRequestsTable.destination, destination));
  if (date && typeof date === "string") conditions.push(eq(tripRequestsTable.date, date));
  if (status && typeof status === "string") {
    conditions.push(eq(tripRequestsTable.status, status as "open" | "matched" | "closed"));
  } else {
    conditions.push(eq(tripRequestsTable.status, "open"));
  }

  let query = db.select().from(tripRequestsTable).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));

  const requests = await query.orderBy(sql`${tripRequestsTable.date} ASC`);
  const requestsWithInfo = await Promise.all(requests.map(requestWithPassengerInfo));

  res.json({ tripRequests: requestsWithInfo });
});

router.get("/trip-requests/my", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autorizado" }); return; }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) { res.status(404).json({ error: "Perfil no encontrado" }); return; }

  const requests = await db.select().from(tripRequestsTable)
    .where(eq(tripRequestsTable.passengerId, profile[0].id))
    .orderBy(sql`${tripRequestsTable.date} ASC`);

  const requestsWithInfo = await Promise.all(requests.map(requestWithOffersInfo));
  res.json({ tripRequests: requestsWithInfo });
});

router.post("/trip-requests", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autorizado" }); return; }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) { res.status(404).json({ error: "Perfil no encontrado" }); return; }

  const { origin, destination, date, time, seats, notes } = req.body;
  if (!origin || !destination || !date) {
    res.status(400).json({ error: "Origen, destino y fecha son obligatorios" });
    return;
  }

  const [newRequest] = await db.insert(tripRequestsTable).values({
    passengerId: profile[0].id,
    origin,
    destination,
    date,
    time: time || null,
    seats: seats ? parseInt(seats) : 1,
    notes: notes || null,
    status: "open",
  }).returning();

  res.status(201).json({ tripRequest: await requestWithOffersInfo(newRequest) });
});

router.delete("/trip-requests/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autorizado" }); return; }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) { res.status(404).json({ error: "Perfil no encontrado" }); return; }

  const requestId = parseInt(req.params.id);
  const [existing] = await db.select().from(tripRequestsTable).where(eq(tripRequestsTable.id, requestId)).limit(1);

  if (!existing) { res.status(404).json({ error: "Solicitud no encontrada" }); return; }
  if (existing.passengerId !== profile[0].id) { res.status(403).json({ error: "No tenés permiso" }); return; }

  await db.delete(tripRequestsTable).where(eq(tripRequestsTable.id, requestId));
  res.json({ success: true });
});

router.patch("/trip-requests/:id/close", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autorizado" }); return; }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) { res.status(404).json({ error: "Perfil no encontrado" }); return; }

  const requestId = parseInt(req.params.id);
  const [existing] = await db.select().from(tripRequestsTable).where(eq(tripRequestsTable.id, requestId)).limit(1);

  if (!existing) { res.status(404).json({ error: "Solicitud no encontrada" }); return; }
  if (existing.passengerId !== profile[0].id) { res.status(403).json({ error: "No tenés permiso" }); return; }

  const [updated] = await db.update(tripRequestsTable)
    .set({ status: "matched" })
    .where(eq(tripRequestsTable.id, requestId))
    .returning();

  res.json({ tripRequest: await requestWithOffersInfo(updated) });
});

router.post("/trip-requests/:id/offer", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autorizado" }); return; }

  const driverProfile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (driverProfile.length === 0) { res.status(404).json({ error: "Perfil no encontrado" }); return; }

  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [tripReq] = await db.select().from(tripRequestsTable).where(eq(tripRequestsTable.id, requestId)).limit(1);
  if (!tripReq) { res.status(404).json({ error: "Solicitud no encontrada" }); return; }

  if (tripReq.passengerId === driverProfile[0].id) {
    res.status(400).json({ error: "No podés ofrecerte para tu propia solicitud" });
    return;
  }

  const existingOffer = await db.select().from(tripRequestOffersTable).where(
    and(
      eq(tripRequestOffersTable.tripRequestId, requestId),
      eq(tripRequestOffersTable.driverProfileId, driverProfile[0].id)
    )
  ).limit(1);

  if (existingOffer.length > 0) {
    res.status(400).json({ error: "Ya enviaste una oferta para esta solicitud" });
    return;
  }

  await db.insert(tripRequestOffersTable).values({
    tripRequestId: requestId,
    driverProfileId: driverProfile[0].id,
    status: "pending",
  });

  const driver = driverProfile[0];
  const driverName = `${driver.firstName ?? ""} ${driver.lastName ?? ""}`.trim() || driver.username;
  const driverPhone = driver.phone ?? null;

  const pushBody = `${driverName} ofrece llevarte de ${tripReq.origin} a ${tripReq.destination}. Entrá a la app para aceptar o rechazar.`;

  await sendPushToProfile(tripReq.passengerId, {
    title: "🚗 ¡Un conductor te ofrece llevarte!",
    body: pushBody,
    url: "/",
  }).catch(() => {});

  res.json({ success: true, driverName, driverPhone });
});

router.patch("/trip-request-offers/:offerId/accept", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autorizado" }); return; }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) { res.status(404).json({ error: "Perfil no encontrado" }); return; }

  const offerId = parseInt(req.params.offerId);
  if (isNaN(offerId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [offer] = await db.select().from(tripRequestOffersTable).where(eq(tripRequestOffersTable.id, offerId)).limit(1);
  if (!offer) { res.status(404).json({ error: "Oferta no encontrada" }); return; }

  const [tripReq] = await db.select().from(tripRequestsTable).where(eq(tripRequestsTable.id, offer.tripRequestId)).limit(1);
  if (!tripReq || tripReq.passengerId !== profile[0].id) {
    res.status(403).json({ error: "Solo el pasajero puede aceptar ofertas" });
    return;
  }

  if (offer.status !== "pending") {
    res.status(400).json({ error: "Solo se pueden aceptar ofertas pendientes" });
    return;
  }

  await db.update(tripRequestOffersTable)
    .set({ status: "accepted" })
    .where(eq(tripRequestOffersTable.id, offerId));

  // Rechazar las demás ofertas pendientes
  await db.update(tripRequestOffersTable)
    .set({ status: "rejected" })
    .where(and(
      eq(tripRequestOffersTable.tripRequestId, tripReq.id),
      eq(tripRequestOffersTable.status, "pending"),
    ));

  await db.update(tripRequestsTable)
    .set({ status: "matched" })
    .where(eq(tripRequestsTable.id, tripReq.id));

  // Crear el viaje y la reserva confirmada
  const driverProfile = await db.select().from(profilesTable).where(eq(profilesTable.id, offer.driverProfileId)).limit(1);
  const [newTrip] = await db.insert(tripsTable).values({
    driverId: offer.driverProfileId,
    origin: tripReq.origin,
    destination: tripReq.destination,
    date: tripReq.date,
    time: tripReq.time ?? "00:00",
    availableSeats: Math.max(0, (driverProfile[0]?.totalSeats ?? 4) - tripReq.seats),
    totalSeats: driverProfile[0]?.totalSeats ?? 4,
    pricePerSeat: "0",
    priceType: "free",
    acceptsPackages: false,
    status: "scheduled",
  }).returning();

  await db.insert(bookingsTable).values({
    tripId: newTrip.id,
    passengerId: tripReq.passengerId,
    seatsBooked: tripReq.seats,
    status: "confirmed",
  });

  const passengerName = `${profile[0].firstName ?? ""} ${profile[0].lastName ?? ""}`.trim() || profile[0].username;

  await sendPushToProfile(offer.driverProfileId, {
    title: "✅ ¡Aceptaron tu oferta!",
    body: `${passengerName} aceptó tu oferta para ${tripReq.origin} → ${tripReq.destination}. Ya podés ver el viaje en Mis viajes.`,
    url: `/trip/${newTrip.id}`,
  }).catch(() => {});

  res.json({ success: true, tripId: newTrip.id });
});

router.patch("/trip-request-offers/:offerId/reject", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autorizado" }); return; }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) { res.status(404).json({ error: "Perfil no encontrado" }); return; }

  const offerId = parseInt(req.params.offerId);
  if (isNaN(offerId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [offer] = await db.select().from(tripRequestOffersTable).where(eq(tripRequestOffersTable.id, offerId)).limit(1);
  if (!offer) { res.status(404).json({ error: "Oferta no encontrada" }); return; }

  const [tripReq] = await db.select().from(tripRequestsTable).where(eq(tripRequestsTable.id, offer.tripRequestId)).limit(1);
  if (!tripReq || tripReq.passengerId !== profile[0].id) {
    res.status(403).json({ error: "Solo el pasajero puede rechazar ofertas" });
    return;
  }

  if (offer.status !== "pending") {
    res.status(400).json({ error: "Solo se pueden rechazar ofertas pendientes" });
    return;
  }

  await db.update(tripRequestOffersTable)
    .set({ status: "rejected" })
    .where(eq(tripRequestOffersTable.id, offerId));

  const passengerName = `${profile[0].firstName ?? ""} ${profile[0].lastName ?? ""}`.trim() || profile[0].username;

  await sendPushToProfile(offer.driverProfileId, {
    title: "❌ Oferta no aceptada",
    body: `${passengerName} no pudo aceptar tu oferta para ${tripReq.origin} → ${tripReq.destination}.`,
    url: "/",
  }).catch(() => {});

  res.json({ success: true });
});

export default router;
