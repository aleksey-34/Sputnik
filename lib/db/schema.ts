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
  kind: varchar("kind", { length: 32 }).notNull().default("bonus_shop"),
  partner_name: varchar("partner_name", { length: 128 }),
  cost_points: integer("cost_points").notNull().default(0),
  reward_points: integer("reward_points").notNull().default(0),
  discount_percent: integer("discount_percent").notNull().default(0),
  user_cashback_percent: integer("user_cashback_percent").notNull().default(0),
  platform_fee_percent: integer("platform_fee_percent").notNull().default(0),
  required_steps: integer("required_steps").notNull().default(0),
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

/** OAuth-токены Google Fit для повторной синхронизации без повторного входа */
export const google_fit_connections = pgTable("google_fit_connections", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id).unique(),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token"),
  expires_at: timestamp("expires_at"),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

/** Журнал синхронизаций — пруф для админки и пользователя */
export const step_sync_logs = pgTable("step_sync_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  source: varchar("source", { length: 32 }).notNull(),
  period: varchar("period", { length: 16 }).notNull(),
  date_from: varchar("date_from", { length: 10 }).notNull(),
  date_to: varchar("date_to", { length: 10 }).notNull(),
  days_synced: integer("days_synced").notNull().default(0),
  steps_synced: integer("steps_synced").notNull().default(0),
  bonus_awarded: integer("bonus_awarded").notNull().default(0),
  status: varchar("status", { length: 16 }).notNull().default("success"),
  meta: jsonb("meta"),
  created_at: timestamp("created_at").defaultNow().notNull()
});

/** Глобальные настройки приложения (бонусы, рефералы и т.д.) */
export const app_settings = pgTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});
