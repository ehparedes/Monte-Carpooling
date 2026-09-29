import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";

export const tripStatusEnum = pgEnum("trip_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "cancelled",
]);

export const priceTypeEnum = pgEnum("price_type", [
  "fixed",
  "free",
  "optional",
]);

export const profilesTable = pgTable("profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  replitUserId: text("replit_user_id").notNull().unique(),
  username: text("username").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  avatarSeed: text("avatar_seed"),
  avatarStyle: text("avatar_style").default("avataaars"),
  isDriver: boolean("is_driver").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  memberStatus: text("member_status").notNull().default("active"),
  invitedById: integer("invited_by_id"),
  invitesRemaining: integer("invites_remaining").notNull().default(3),
  approvedAt: timestamp("approved_at"),
  vehicleModel: text("vehicle_model"),
  vehicleColor: text("vehicle_color"),
  licensePlate: text("license_plate"),
  totalSeats: integer("total_seats"),
  acceptsPackages: boolean("accepts_packages").notNull().default(false),
  dni: text("dni"),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tripsTable = pgTable("trips", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  driverId: integer("driver_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  availableSeats: integer("available_seats").notNull(),
  totalSeats: integer("total_seats").notNull(),
  pricePerSeat: numeric("price_per_seat", { precision: 10, scale: 2 }).notNull(),
  priceType: priceTypeEnum("price_type").notNull().default("fixed"),
  meetingPoint: text("meeting_point").notNull(),
  status: tripStatusEnum("status").notNull().default("scheduled"),
  acceptsPackages: boolean("accepts_packages").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const bookingsTable = pgTable("bookings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => tripsTable.id, { onDelete: "cascade" }),
  passengerId: integer("passenger_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  status: bookingStatusEnum("status").notNull().default("confirmed"),
  seatsBooked: integer("seats_booked").notNull().default(1),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => tripsTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ratingsTable = pgTable("ratings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => tripsTable.id, { onDelete: "cascade" }),
  raterId: integer("rater_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  ratedUserId: integer("rated_user_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  stars: integer("stars").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tripRequestStatusEnum = pgEnum("trip_request_status", [
  "open",
  "matched",
  "closed",
]);

export const tripRequestsTable = pgTable("trip_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  passengerId: integer("passenger_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  date: text("date").notNull(),
  time: text("time"),
  seats: integer("seats").notNull().default(1),
  notes: text("notes"),
  status: tripRequestStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const offerStatusEnum = pgEnum("offer_status", ["pending", "accepted", "rejected"]);

export const tripRequestOffersTable = pgTable("trip_request_offers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tripRequestId: integer("trip_request_id")
    .notNull()
    .references(() => tripRequestsTable.id, { onDelete: "cascade" }),
  driverProfileId: integer("driver_profile_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  status: offerStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Profile = typeof profilesTable.$inferSelect;
export type Trip = typeof tripsTable.$inferSelect;
export type Booking = typeof bookingsTable.$inferSelect;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type Rating = typeof ratingsTable.$inferSelect;
export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
export type TripRequest = typeof tripRequestsTable.$inferSelect;
export type TripRequestOffer = typeof tripRequestOffersTable.$inferSelect;
