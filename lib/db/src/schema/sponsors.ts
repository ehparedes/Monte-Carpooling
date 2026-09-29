import {
  pgTable, text, integer, boolean, timestamp, date, doublePrecision, pgEnum, uniqueIndex,
} from "drizzle-orm/pg-core";

export const sponsorSlotEnum = pgEnum("sponsor_slot", [
  "home_banner",
  "guide_listing",
  "guide_featured",
  "meeting_point",
  "trip_coupon",
]);

export const sponsorEventTypeEnum = pgEnum("sponsor_event_type", [
  "view",
  "click_whatsapp",
  "click_map",
  "click_web",
  "coupon_shown",
]);

export const sponsorsTable = pgTable("sponsors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  address: text("address"),
  whatsapp: text("whatsapp"),
  website: text("website"),
  logoUrl: text("logo_url"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sponsorPlacementsTable = pgTable("sponsor_placements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsorsTable.id, { onDelete: "cascade" }),
  slot: sponsorSlotEnum("slot").notNull(),
  headline: text("headline"),
  body: text("body"),
  couponText: text("coupon_text"),
  zone: text("zone"),
  startsAt: date("starts_at").notNull(),
  endsAt: date("ends_at").notNull(),
  active: boolean("active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sponsorEventsTable = pgTable(
  "sponsor_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    placementId: integer("placement_id").notNull().references(() => sponsorPlacementsTable.id, { onDelete: "cascade" }),
    eventType: sponsorEventTypeEnum("event_type").notNull(),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => ({
    uniqDay: uniqueIndex("sponsor_events_placement_type_day").on(t.placementId, t.eventType, t.day),
  }),
);
