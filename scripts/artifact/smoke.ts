import process from "node:process";

process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "memory";
process.env.LOG_LEVEL = "silent";

const [{ createApplication }, { createInMemoryDependencies }, { env }, { createLogger }] = await Promise.all([
  import("../../apps/gateway/dist/app/create-application.js"),
  import("../../apps/gateway/dist/app/create-dependencies.js"),
  import("../../apps/gateway/dist/config/env.js"),
  import("../../apps/gateway/dist/core/logging/logger.js"),
]);
const dependencies = createInMemoryDependencies(env, createLogger(env));
try {
  const response = await createApplication(dependencies).request("/healthz");
  if (response.status !== 200)
    throw new Error(`artifact health smoke returned ${response.status}`);
  process.stdout.write("artifact smoke passed\n");
} finally {
  await dependencies.transportRegistry.close();
}
