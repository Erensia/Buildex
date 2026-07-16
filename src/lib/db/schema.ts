import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  displayName: varchar("display_name", { length: 80 }).notNull(),
  ...timestamps,
});

export const authIdentities = pgTable("auth_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerSubject: varchar("provider_subject", { length: 320 }).notNull(),
  passwordHash: text("password_hash"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("auth_identity_provider_subject_idx").on(table.provider, table.providerSubject)]);

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  currentDataVersion: varchar("current_data_version", { length: 32 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

export const characters = pgTable("characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  externalKey: varchar("external_key", { length: 80 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  role: varchar("role", { length: 40 }).notNull(),
  dataVersion: varchar("data_version", { length: 32 }).notNull(),
  baseStats: jsonb("base_stats").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("character_game_key_idx").on(table.gameId, table.externalKey)]);

export const weapons = pgTable("weapons", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  externalKey: varchar("external_key", { length: 80 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  weaponType: varchar("weapon_type", { length: 40 }).notNull(),
  dataVersion: varchar("data_version", { length: 32 }).notNull(),
  stats: jsonb("stats").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("weapon_game_key_idx").on(table.gameId, table.externalKey)]);

export const echoes = pgTable("echoes", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  externalKey: varchar("external_key", { length: 80 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  cost: integer("cost").notNull(),
  dataVersion: varchar("data_version", { length: 32 }).notNull(),
  stats: jsonb("stats").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("echo_game_key_idx").on(table.gameId, table.externalKey)]);

export const buildProfiles = pgTable("build_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  characterId: uuid("character_id").notNull().references(() => characters.id),
  weaponId: uuid("weapon_id").references(() => weapons.id),
  name: varchar("name", { length: 80 }).notNull(),
  buildInput: jsonb("build_input").notNull(),
  calculatedResult: jsonb("calculated_result").notNull(),
  dataVersion: varchar("data_version", { length: 32 }).notNull(),
  formulaVersion: varchar("formula_version", { length: 32 }).notNull(),
  ...timestamps,
});
