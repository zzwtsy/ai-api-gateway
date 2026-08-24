import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const directory = path.join(root, "apps/gateway/drizzle");
const metaDirectory = path.join(directory, "meta");
const migrations = (await readdir(directory)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
const failures: string[] = [];
if (migrations.length === 0)
  failures.push("no SQL migrations found");
for (let index = 1; index < migrations.length; index += 1) {
  const current = migrations[index];
  const previous = migrations[index - 1];
  if (current !== undefined && previous !== undefined && current <= previous)
    failures.push("migration filenames are not monotonic");
}

const journal = JSON.parse(await readFile(path.join(metaDirectory, "_journal.json"), "utf8")) as {
  version?: unknown;
  dialect?: unknown;
  entries: { idx?: unknown; tag?: unknown }[];
};
if (journal.version !== "7" || journal.dialect !== "postgresql") {
  failures.push("Drizzle journal must use PostgreSQL snapshot format v7");
}
if (journal.entries.length !== migrations.length) {
  failures.push("Drizzle journal entry count does not match SQL migration count");
}
for (let index = 0; index < migrations.length; index += 1) {
  const migration = migrations[index];
  if (migration === undefined)
    continue;
  const tag = migration.replace(/\.sql$/, "");
  if (journal.entries[index]?.idx !== index || journal.entries[index]?.tag !== tag) {
    failures.push(`Drizzle journal does not match ${migration}`);
  }
  const snapshotPath = path.join(metaDirectory, `${String(index).padStart(4, "0")}_snapshot.json`);
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  if (snapshot.version !== "7" || snapshot.dialect !== "postgresql") {
    failures.push(`${path.basename(snapshotPath)} is not PostgreSQL snapshot format v7`);
  }
}

const combined = (await Promise.all(migrations.map(name => readFile(path.join(directory, name), "utf8")))).join("\n");
const historicalTables = ["connections", "gateway_requests", "gateway_attempts", "user", "session", "account", "verification"];
for (const table of historicalTables) {
  if (!combined.includes(`\"${table}\"`))
    failures.push(`migration set does not contain ${table}`);
}
for (const constraint of [
  "gateway_attempts_request_id_gateway_requests_id_fk",
  "gateway_attempts_request_sequence_unq",
  "session_userId_user_id_fk",
  "account_userId_user_id_fk",
  "user_email_unique",
  "session_token_unique",
  "gateway_client_keys_client_id_gateway_clients_id_fk",
  "provider_credentials_account_id_provider_accounts_id_fk",
  "endpoint_credentials_endpoint_id_credential_id_pk",
  "compatibility_facts_profile_id_feature_key_verified_model_id_pk",
  "compatibility_probe_runs_credential_id_provider_credentials_id_fk",
]) {
  if (!combined.includes(`\"${constraint}\"`))
    failures.push(`migration set does not contain ${constraint}`);
}

interface SnapshotTable {
  name: string;
  indexes?: Record<string, { isUnique?: boolean; columns?: { expression?: unknown }[]; where?: unknown }>;
}

const latestSnapshot = JSON.parse(await readFile(
  path.join(metaDirectory, `${String(migrations.length - 1).padStart(4, "0")}_snapshot.json`),
  "utf8",
)) as { tables: Record<string, SnapshotTable> };
const snapshotTables = new Set(Object.values(latestSnapshot.tables).map(table => table.name));
const expectedLatestTables = [
  "providers",
  "upstream_endpoints",
  "provider_accounts",
  "provider_credentials",
  "endpoint_credentials",
  "compatibility_profiles",
  "compatibility_probe_runs",
  "compatibility_facts",
  "harness_profiles",
  "gateway_clients",
  "gateway_client_keys",
  "provider_model_bindings",
  "gateway_requests",
  "gateway_attempts",
  "user",
  "session",
  "account",
  "verification",
];
for (const table of expectedLatestTables) {
  if (!snapshotTables.has(table))
    failures.push(`latest Drizzle snapshot does not contain ${table}`);
}
const attemptSnapshot = latestSnapshot.tables["public.gateway_attempts"];
const attemptSequenceIndex = attemptSnapshot?.indexes?.gateway_attempts_request_sequence_unq;
if (attemptSequenceIndex?.isUnique !== true
  || JSON.stringify(attemptSequenceIndex.columns?.map(column => column.expression)) !== JSON.stringify(["request_id", "sequence"])) {
  failures.push("latest Drizzle snapshot must enforce unique (request_id, sequence) attempts");
}
const compatibilityRunSnapshot = latestSnapshot.tables["public.compatibility_probe_runs"];
const activeProbeIndex = compatibilityRunSnapshot?.indexes?.compatibility_probe_runs_active_target_unq;
if (activeProbeIndex?.isUnique !== true
  || JSON.stringify(activeProbeIndex.columns?.map(column => column.expression)) !== JSON.stringify(["endpoint_id", "credential_id", "model"])
  || activeProbeIndex.where !== "\"compatibility_probe_runs\".\"status\" in ('queued', 'running')") {
  failures.push("latest Drizzle snapshot must enforce one queued/running compatibility probe per target and model");
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`migrations passed (${migrations.length} ordered SQL migration and snapshot chain)\n`);
}
