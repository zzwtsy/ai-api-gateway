import path from "node:path";
import process from "node:process";

import { setProjectVersion } from "../project-version-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
if (args.length !== 1) {
  throw new Error("用法：pnpm version:set -- <semver>");
}

const targetVersion = args[0];
if (targetVersion === undefined)
  throw new Error("目标版本缺失");
const result = await setProjectVersion(root, targetVersion);
process.stdout.write(
  `项目版本已从 ${result.previousVersion} 同步到 ${result.version}（${result.paths} 个投影）；请手工新增 CHANGELOG 顶部条目。\n`,
);
