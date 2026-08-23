import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createApplication } from "../app/create-application.js";
import { createInMemoryDependencies } from "../app/create-dependencies.js";
import { EnvSchema } from "../config/env-schema.js";
import { openApiDocumentConfig } from "../control-plane/http/openapi/configure-openapi.js";
import { createLogger } from "../core/logging/logger.js";

async function main(): Promise<void> {
  const outputArgument = process.argv.slice(2).find(argument => argument !== "--");
  if (outputArgument === undefined || path.extname(outputArgument).toLowerCase() !== ".json") {
    throw new Error("Usage: pnpm --filter @aigw/gateway openapi:export -- <output.json>");
  }

  // OpenAPI export assembles a static in-memory application. It deliberately does
  // not read production environment variables, open sockets, or connect to PostgreSQL.
  const exportEnv = EnvSchema.parse({
    NODE_ENV: "test",
    STORAGE_DRIVER: "memory",
    LOG_LEVEL: "silent",
  });
  const outputPath = path.resolve(outputArgument);
  const dependencies = createInMemoryDependencies(exportEnv, createLogger(exportEnv));
  try {
    const app = createApplication(dependencies);
    const document = app.getOpenAPIDocument(openApiDocumentConfig);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    process.stdout.write(`OpenAPI exported: ${outputPath}\n`);
  } finally {
    await dependencies.transportRegistry.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
