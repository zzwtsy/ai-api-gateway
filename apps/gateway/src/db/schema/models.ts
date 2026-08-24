import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { upstreamEndpoints } from "./connections.js";

export const providerModelBindings = pgTable(
  "provider_model_bindings",
  {
    id: text("id").primaryKey(),
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => upstreamEndpoints.id, { onDelete: "cascade" }),
    upstreamModelId: text("upstream_model_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("unverified"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex("provider_model_bindings_endpoint_model_unq").on(table.endpointId, table.upstreamModelId),
    index("provider_model_bindings_endpoint_id_idx").on(table.endpointId),
  ],
);
