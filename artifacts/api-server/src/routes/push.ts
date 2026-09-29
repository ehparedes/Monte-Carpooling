import { Router, type IRouter } from "express";
import webPush from "web-push";
import { db } from "@workspace/db";
import { profilesTable, pushSubscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_SUBJECT ?? "mailto:admin@montecarpooling.ar";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

router.get("/push/vapid-key", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

router.post("/push/subscribe", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Invalid subscription data" });
    return;
  }

  const profile = await db.select().from(profilesTable)
    .where(eq(profilesTable.replitUserId, req.user.id))
    .limit(1);

  if (profile.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  await db.insert(pushSubscriptionsTable)
    .values({
      profileId: profile[0].id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { p256dh: keys.p256dh, auth: keys.auth },
    });

  res.status(201).json({ success: true });
});

export async function sendPushToProfile(profileId: number, payload: { title: string; body: string; icon?: string; url?: string }) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const subs = await db.select().from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.profileId, profileId));

  const data = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.delete(pushSubscriptionsTable)
          .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
      }
    }
  }
}

export default router;
