import { pgTable, serial, varchar, text, integer, timestamp, boolean, uniqueIndex, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegram_id: varchar("telegram_id", { length: 64 }).notNull().unique(),
  first_name: varchar("first_name", { length: 128 }).notNull(),
  last_name: varchar("last_name", { length: 128 }),
  username: varchar("username", { length: 64 }),
  avatar_url: text("avatar_url"),
  gender: varchar("gender", { length: 16 }),
  birth_year: integer("birth_year"),
  height_cm: integer("height_cm"),
  weight_kg: integer("weight_kg"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const steps = pgTable(
  "steps",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id").notNull().references(() => users.id),
    source: varchar("source", { length: 32 }).notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    step_count: integer("step_count").notNull(),
    recorded_at: timestamp("recorded_at").defaultNow().notNull()
  },
  table => ({
    unique_step_entry: uniqueIndex("unique_step_entry").on(table.user_id, table.source, table.date)
  })
);

export const bonus_transactions = pgTable("bonus_transactions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  source: varchar("source", { length: 64 }),
  meta: jsonb("meta"),
  created_at: timestamp("created_at").defaultNow().notNull()
});

export const promo_codes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 128 }).notNull(),
  description: text("description"),
  cost_points: integer("cost_points").notNull().default(0),
  reward_points: integer("reward_points").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expires_at: timestamp("expires_at")
});

export const promo_redemptions = pgTable("promo_redemptions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  promo_code_id: integer("promo_code_id").notNull().references(() => promo_codes.id),
  redeemed_at: timestamp("redeemed_at").defaultNow().notNull()
}, table => ({
  unique_redemption: uniqueIndex("unique_redemption").on(table.user_id, table.promo_code_id)
}));

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  inviter_id: integer("inviter_id").notNull().references(() => users.id),
  invitee_id: integer("invitee_id").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  reward_given: boolean("reward_given").notNull().default(true)
});
