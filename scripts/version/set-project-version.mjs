import path from "node:path";
import process from "node:process";

import { setProjectVersion } from "../project-version-policy.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
if (args.length !== 1) {
  throw new Error("用法：pnpm version:set -- <semver>");
}

const result = await setProjectVersion(root, args[0]);
process.stdout.write(
  `项目版本已从 ${result.previousVersion} 同步到 ${result.version}（${result.paths} 个投影）；请手工新增 CHANGELOG 顶部条目。\n`,
);
