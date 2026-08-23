import { boolean, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const connections = pgTable(
  "connections",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    protocol: text("protocol").notNull(),
    baseUrl: text("base_url").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex("connections_name_unq").on(table.name),
    uniqueIndex("connections_protocol_base_url_unq").on(table.protocol, table.baseUrl),
  ],
);
