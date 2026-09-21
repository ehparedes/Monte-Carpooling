import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profilesTable, chatMessagesTable, bookingsTable, tripsTable } from "@workspace/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { broadcast } from "../ws/chatWsManager";

const router: IRouter = Router();

async function canAccessTripChat(profileId: number, tripId: number): Promise<boolean> {
  const trip = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1);
  if (trip.length === 0) return false;

  if (trip[0].driverId === profileId) return true;

  const booking = await db.select().from(bookingsTable).where(
    and(
      eq(bookingsTable.tripId, tripId),
      eq(bookingsTable.passengerId, profileId),
      eq(bookingsTable.status, "confirmed")
    )
  ).limit(1);

  return booking.length > 0;
}

router.get("/chat/unreads", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.replitUserId, req.user.id)).limit(1);
  if (profile.length === 0) {
    res.json({ unreads: [] });
    return;
  }

  const profileId = profile[0].id;

  const driverTrips = await db.select({ id: tripsTable.id }).from(tripsTable)
    .where(eq(tripsTable.driverId, profileId));

  const confirmedBookings = await db.select({ tripId: bookingsTable.tripId }).from(bookingsTable)
    .where(and(eq(bookingsTable.passengerId, profileId), eq(bookingsTable.status, "confirmed")));

  const accessibleTripIds = [
    ...driverTrips.map(t => t.id),
    ...confirmedBookings.map(b => b.tripId),
  ];

  const uniqueTripIds = [...new Set(accessibleTripIds)];
  if (uniqueTripIds.length === 0) {
    res.json({ unreads: [] });
    return;
  }

  const result = await Promise.all(uniqueTripIds.map(async (tripId) => {
    const latest = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.tripId, tripId))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(1);

    if (latest.length === 0) return null;
    const msg = latest[0];
    const sender = await db.select().from(profilesTable).where(eq(profilesTable.id, msg.senderId)).limit(1);
    return {
      tripId,
      lastMessageAt: msg.createdAt.toISOString(),
      lastMessage: msg.message,
      senderName: sender[0]
        ? (`${sender[0].firstName ?? ""} ${sender[0].lastName ?? ""}`.trim() || sender[0].username)
        : "Usuario",
    };
  }));

  res.json({ unreads: result.filter(Boolean) });
});

router.get("/chat/:tripId/messages", async (req, res) => {
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
  if (profile.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const canAccess = await canAccessTripChat(profile[0].id, tripId);
  if (!canAccess) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const messages = await db.select().from(chatMessagesTable)
    .where(eq(chatMessagesTable.tripId, tripId))
    .orderBy(asc(chatMessagesTable.createdAt));

  const messagesWithSenders = await Promise.all(messages.map(async (m) => {
    const sender = await db.select().from(profilesTable).where(eq(profilesTable.id, m.senderId)).limit(1);
    return {
      ...m,
      senderName: sender[0] ? `${sender[0].firstName ?? ""} ${sender[0].lastName ?? ""}`.trim() || sender[0].username : null,
      senderAvatarUrl: sender[0]?.avatarUrl ?? null,
      createdAt: m.createdAt.toISOString(),
    };
  }));

  res.json({ messages: messagesWithSenders });
});

router.post("/chat/:tripId/messages", async (req, res) => {
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
  if (profile.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const canAccess = await canAccessTripChat(profile[0].id, tripId);
  if (!canAccess) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { message } = req.body;
  if (!message || typeof message !== "string" || message.trim() === "") {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }

  const inserted = await db.insert(chatMessagesTable).values({
    tripId,
    senderId: profile[0].id,
    message: message.trim(),
  }).returning();

  const responseMsg = {
    ...inserted[0],
    senderName: `${profile[0].firstName ?? ""} ${profile[0].lastName ?? ""}`.trim() || profile[0].username,
    senderAvatarUrl: profile[0].avatarUrl,
    createdAt: inserted[0].createdAt.toISOString(),
  };

  broadcast(tripId, { type: "message", data: responseMsg });

  res.status(201).json(responseMsg);
});

export default router;
