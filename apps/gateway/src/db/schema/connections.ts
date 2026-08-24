import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { harnessProfiles } from "./clients.js";

export const providers = pgTable(
  "providers",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    presetKind: text("preset_kind").notNull().default("custom"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex("providers_slug_unq").on(table.slug),
    uniqueIndex("providers_name_unq").on(table.name),
  ],
);

export const upstreamEndpoints = pgTable(
  "upstream_endpoints",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    protocol: text("protocol").notNull(),
    baseUrl: text("base_url").notNull(),
    requestPath: text("request_path").notNull(),
    authScheme: text("auth_scheme").notNull().default("bearer"),
    supportsStreaming: boolean("supports_streaming").notNull().default(true),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex("upstream_endpoints_provider_name_unq").on(table.providerId, table.name),
    uniqueIndex("upstream_endpoints_protocol_url_unq").on(table.protocol, table.baseUrl, table.requestPath),
    index("upstream_endpoints_provider_id_idx").on(table.providerId),
  ],
);

export const providerAccounts = pgTable(
  "provider_accounts",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    billingMode: text("billing_mode").notNull().default("unknown"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex("provider_accounts_provider_name_unq").on(table.providerId, table.name),
    index("provider_accounts_provider_id_idx").on(table.providerId),
  ],
);

export const providerCredentials = pgTable(
  "provider_credentials",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => providerAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    encryptedSecret: text("encrypted_secret").notNull(),
    secretKeyId: text("secret_key_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    maskedDisplay: text("masked_display").notNull(),
    status: text("status").notNull().default("unverified"),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true, mode: "date" }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true, mode: "date" }),
    disabledAt: timestamp("disabled_at", { withTimezone: true, mode: "date" }),
  },
  table => [
    uniqueIndex("provider_credentials_fingerprint_unq").on(table.fingerprint),
    uniqueIndex("provider_credentials_account_name_unq").on(table.accountId, table.name),
    index("provider_credentials_account_id_idx").on(table.accountId),
    index("provider_credentials_status_idx").on(table.status),
  ],
);

export const endpointCredentials = pgTable(
  "endpoint_credentials",
  {
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => upstreamEndpoints.id, { onDelete: "cascade" }),
    credentialId: text("credential_id")
      .notNull()
      .references(() => providerCredentials.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    primaryKey({ columns: [table.endpointId, table.credentialId] }),
    index("endpoint_credentials_credential_id_idx").on(table.credentialId),
  ],
);

export const compatibilityProfiles = pgTable(
  "compatibility_profiles",
  {
    id: text("id").primaryKey(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => upstreamEndpoints.id, { onDelete: "cascade" }),
    harnessProfileId: text("harness_profile_id")
      .notNull()
      .references(() => harnessProfiles.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("unverified"),
    lastProbeAt: timestamp("last_probe_at", { withTimezone: true, mode: "date" }),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex("compatibility_profiles_endpoint_harness_unq").on(table.endpointId, table.harnessProfileId),
    index("compatibility_profiles_connection_id_idx").on(table.connectionId),
  ],
);

export const compatibilityProbeRuns = pgTable(
  "compatibility_probe_runs",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => compatibilityProfiles.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => upstreamEndpoints.id, { onDelete: "cascade" }),
    credentialId: text("credential_id")
      .notNull()
      .references(() => providerCredentials.id, { onDelete: "restrict" }),
    harnessProfileId: text("harness_profile_id")
      .notNull()
      .references(() => harnessProfiles.id, { onDelete: "restrict" }),
    model: text("model").notNull(),
    checks: text("checks").array().notNull(),
    status: text("status").notNull().default("queued"),
    totalChecks: integer("total_checks").notNull(),
    completedChecks: integer("completed_checks").notNull().default(0),
    currentCheck: text("current_check"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex("compatibility_probe_runs_active_target_unq")
      .on(table.endpointId, table.credentialId, table.model)
      .where(sql`${table.status} in ('queued', 'running')`),
    index("compatibility_probe_runs_connection_created_idx").on(table.connectionId, table.createdAt),
    index("compatibility_probe_runs_profile_created_idx").on(table.profileId, table.createdAt),
  ],
);

export const compatibilityFacts = pgTable(
  "compatibility_facts",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => compatibilityProfiles.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    supportLevel: text("support_level").notNull(),
    evidenceSource: text("evidence_source").notNull(),
    evidenceRef: text("evidence_ref").notNull(),
    verifiedModelId: text("verified_model_id").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }).notNull(),
    notes: text("notes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    primaryKey({ columns: [table.profileId, table.featureKey, table.verifiedModelId] }),
    index("compatibility_facts_profile_verified_idx").on(table.profileId, table.verifiedAt),
  ],
);
