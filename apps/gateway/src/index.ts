import process from "node:process";

import { startApplication } from "./app/lifecycle.js";

startApplication().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
