import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const gatewayRequests = pgTable(
  "gateway_requests",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull(),
    protocol: text("protocol").notNull(),
    requestedModel: text("requested_model").notNull(),
    upstreamModel: text("upstream_model").notNull(),
    routingSnapshotVersion: integer("routing_snapshot_version").notNull(),
    stream: boolean("stream").notNull(),
    outcome: text("outcome").notNull(),
    statusCode: integer("status_code"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    latencyMs: integer("latency_ms"),
    ttftMs: integer("ttft_ms"),
    observationStatus: text("observation_status").notNull(),
    observedBytes: integer("observed_bytes").notNull().default(0),
  },
  table => [index("gateway_requests_started_at_idx").on(table.startedAt)],
);

export const gatewayAttempts = pgTable(
  "gateway_attempts",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => gatewayRequests.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    connectionId: text("connection_id").notNull(),
    credentialId: text("credential_id").notNull(),
    upstreamModel: text("upstream_model").notNull(),
    outcome: text("outcome").notNull(),
    statusCode: integer("status_code"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    errorCode: text("error_code"),
    fallbackReason: text("fallback_reason"),
  },
  table => [
    index("gateway_attempts_request_id_idx").on(table.requestId),
    uniqueIndex("gateway_attempts_request_sequence_unq").on(table.requestId, table.sequence),
  ],
);
