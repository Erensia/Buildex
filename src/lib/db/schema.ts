import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  displayName: varchar("display_name", { length: 80 }).notNull(),
  role: varchar("role", { length: 20 }).default("user").notNull(),
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
  currentDataVersion: varchar("current_data_version", { length: 32 }),
  sourceSnapshot: varchar("source_snapshot", { length: 10 }),
  sourceUrl: text("source_url"),
  currentDataReleaseId: uuid("current_data_release_id"),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

export const gameDataReleases = pgTable("game_data_releases", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 32 }).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  sourceSnapshot: varchar("source_snapshot", { length: 10 }).notNull(),
  sourceManifest: jsonb("source_manifest").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => [uniqueIndex("game_data_release_game_version_idx").on(table.gameId, table.version)]);

export const characters = pgTable("characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  releaseId: uuid("release_id").notNull().references(() => gameDataReleases.id, { onDelete: "restrict" }),
  externalKey: varchar("external_key", { length: 80 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  role: varchar("role", { length: 40 }).notNull(),
  dataVersion: varchar("data_version", { length: 32 }),
  sourceSnapshot: varchar("source_snapshot", { length: 10 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  baseStats: jsonb("base_stats").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("character_release_key_idx").on(table.releaseId, table.externalKey)]);

export const weapons = pgTable("weapons", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  releaseId: uuid("release_id").notNull().references(() => gameDataReleases.id, { onDelete: "restrict" }),
  externalKey: varchar("external_key", { length: 80 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  weaponType: varchar("weapon_type", { length: 40 }).notNull(),
  dataVersion: varchar("data_version", { length: 32 }),
  sourceSnapshot: varchar("source_snapshot", { length: 10 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  stats: jsonb("stats").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("weapon_release_key_idx").on(table.releaseId, table.externalKey)]);

export const echoes = pgTable("echoes", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  releaseId: uuid("release_id").notNull().references(() => gameDataReleases.id, { onDelete: "restrict" }),
  externalKey: varchar("external_key", { length: 80 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  cost: integer("cost").notNull(),
  dataVersion: varchar("data_version", { length: 32 }),
  sourceSnapshot: varchar("source_snapshot", { length: 10 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  stats: jsonb("stats").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("echo_release_key_idx").on(table.releaseId, table.externalKey)]);

export const echoSets = pgTable("echo_sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  releaseId: uuid("release_id").notNull().references(() => gameDataReleases.id, { onDelete: "restrict" }),
  externalKey: varchar("external_key", { length: 80 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  dataVersion: varchar("data_version", { length: 32 }),
  sourceSnapshot: varchar("source_snapshot", { length: 10 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  effects: jsonb("effects").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("echo_set_release_key_idx").on(table.releaseId, table.externalKey)]);

export const echoSetEchoes = pgTable("echo_set_echoes", {
  echoSetId: uuid("echo_set_id").notNull().references(() => echoSets.id, { onDelete: "cascade" }),
  echoId: uuid("echo_id").notNull().references(() => echoes.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.echoSetId, table.echoId] })]);

export const echoMainStats = pgTable("echo_main_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  releaseId: uuid("release_id").notNull().references(() => gameDataReleases.id, { onDelete: "restrict" }),
  cost: integer("cost").notNull(),
  statKey: varchar("stat_key", { length: 80 }).notNull(),
  value: integer("value").notNull(),
  dataVersion: varchar("data_version", { length: 32 }),
  sourceSnapshot: varchar("source_snapshot", { length: 10 }).notNull(),
  sourceUrl: text("source_url").notNull(),
}, (table) => [uniqueIndex("echo_main_stat_release_cost_key_idx").on(table.releaseId, table.cost, table.statKey)]);

export const buildProfiles = pgTable("build_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  characterId: uuid("character_id").notNull().references(() => characters.id),
  weaponId: uuid("weapon_id").references(() => weapons.id),
  name: varchar("name", { length: 80 }).notNull(),
  buildInput: jsonb("build_input").notNull(),
  calculatedResult: jsonb("calculated_result").notNull(),
  dataVersion: varchar("data_version", { length: 32 }).notNull(),
  dataReleaseId: uuid("data_release_id").references(() => gameDataReleases.id, { onDelete: "restrict" }),
  formulaVersion: varchar("formula_version", { length: 32 }).notNull(),
  ...timestamps,
});
