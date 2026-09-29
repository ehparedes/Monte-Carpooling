import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const invitesTable = pgTable("invites", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  createdById: integer("created_by_id"),
  usedById: integer("used_by_id"),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
});
