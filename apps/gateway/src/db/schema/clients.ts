import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const harnessProfiles = pgTable(
  "harness_profiles",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    allowedProtocols: text("allowed_protocols").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [uniqueIndex("harness_profiles_slug_unq").on(table.slug)],
);

export const gatewayClients = pgTable(
  "gateway_clients",
  {
    id: text("id").primaryKey(),
    harnessProfileId: text("harness_profile_id")
      .notNull()
      .references(() => harnessProfiles.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    allowedProtocols: text("allowed_protocols").array().notNull(),
    status: text("status").notNull().default("active"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex("gateway_clients_name_unq").on(table.name),
    index("gateway_clients_harness_profile_id_idx").on(table.harnessProfileId),
  ],
);

export const gatewayClientKeys = pgTable(
  "gateway_client_keys",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => gatewayClients.id, { onDelete: "cascade" }),
    keyPrefix: text("key_prefix").notNull(),
    keyLast4: text("key_last4").notNull(),
    secretHash: text("secret_hash").notNull(),
    hashAlgorithm: text("hash_algorithm").notNull().default("hmac-sha256"),
    status: text("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  },
  table => [
    uniqueIndex("gateway_client_keys_hash_unq").on(table.secretHash),
    index("gateway_client_keys_prefix_idx").on(table.keyPrefix),
    index("gateway_client_keys_client_id_idx").on(table.clientId),
    index("gateway_client_keys_status_idx").on(table.status),
  ],
);
