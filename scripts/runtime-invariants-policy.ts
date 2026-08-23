import { access, readFile } from "node:fs/promises";
import path from "node:path";

export interface RuntimeInvariantOwner {
  name: string;
  source: string;
  test: string;
  consumers: readonly string[];
  symbol?: string;
  symbols?: readonly string[];
}

/**
 * 验证 Runtime Invariant 的所有权与生产入口强制执行关系。
 *
 * @returns 违规信息列表。
 */
export async function collectRuntimeInvariantViolations(
  root: string,
  manifest: { owners?: readonly RuntimeInvariantOwner[] },
): Promise<string[]> {
  const failures: string[] = [];
  const names = new Set<string>();

  for (const owner of manifest.owners ?? []) {
    const shape = validateRuntimeInvariantOwner(owner, names);
    failures.push(...shape.failures);
    if (shape.symbols === null)
      continue;
    failures.push(...await collectPathViolations(root, owner));
    failures.push(...await collectSymbolViolations(root, owner, shape.symbols));
  }

  return failures;
}

function validateRuntimeInvariantOwner(
  owner: RuntimeInvariantOwner,
  names: Set<string>,
): { failures: string[]; symbols: readonly string[] | null } {
  if (typeof owner.name !== "string" || owner.name.trim() === "") {
    return { failures: ["runtime invariant owner is missing a name"], symbols: null };
  }

  const failures: string[] = [];
  if (names.has(owner.name))
    failures.push(`duplicate runtime invariant owner: ${owner.name}`);
  names.add(owner.name);

  const symbols = owner.symbols ?? (owner.symbol === undefined ? [] : [owner.symbol]);
  if (symbols.length === 0 || !symbols.every(symbol => typeof symbol === "string" && symbol.trim() !== "")) {
    return { failures: [...failures, `${owner.name}: missing invariant symbol`], symbols: null };
  }
  if (typeof owner.source !== "string" || typeof owner.test !== "string") {
    return { failures: [...failures, `${owner.name}: source and test paths are required`], symbols: null };
  }
  if (!Array.isArray(owner.consumers) || owner.consumers.length === 0) {
    failures.push(`${owner.name}: at least one production consumer is required`);
  }
  return { failures, symbols };
}

async function collectPathViolations(root: string, owner: RuntimeInvariantOwner): Promise<string[]> {
  const failures: string[] = [];
  const paths = [owner.source, owner.test, ...(owner.consumers ?? [])];
  for (const relative of paths) {
    if (typeof relative !== "string" || relative.trim() === "") {
      failures.push(`${owner.name}: invalid path entry`);
      continue;
    }
    try {
      await access(path.join(root, relative));
    } catch {
      failures.push(`${owner.name}: missing ${relative}`);
    }
  }
  return failures;
}

async function collectSymbolViolations(
  root: string,
  owner: RuntimeInvariantOwner,
  symbols: readonly string[],
): Promise<string[]> {
  const failures: string[] = [];
  const source = await readText(path.join(root, owner.source));
  const sourceCode = source === null ? null : stripCommentsAndStrings(source);
  const test = await readText(path.join(root, owner.test));
  const testCode = test === null ? null : stripCommentsAndStrings(test);
  for (const symbol of symbols) {
    const exportPattern = symbolExportPattern(symbol);
    if (sourceCode === null || !exportPattern.test(sourceCode)) {
      failures.push(`${owner.name}: source does not export ${symbol}`);
    }
    const usePattern = symbolUsePattern(symbol);
    if (testCode === null || !usePattern.test(testCode)) {
      failures.push(`${owner.name}: test does not exercise ${symbol}`);
    }
    for (const consumer of owner.consumers ?? []) {
      const content = await readText(path.join(root, consumer));
      const code = content === null ? null : stripCommentsAndStrings(content);
      if (code === null || !usePattern.test(code)) {
        failures.push(`${owner.name}: ${consumer} does not enforce ${symbol}`);
      }
    }
  }
  return failures;
}

function symbolUsePattern(symbol: string): RegExp {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?:\\b${escaped}\\s*\\(|\\bnew\\s+${escaped}\\s*\\()`, "u");
}

function symbolExportPattern(symbol: string): RegExp {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`\\bexport\\s+(?:(?:async|declare|abstract)\\s+)*(?:function|class|const|let|var)\\s+${escaped}\\b`, "u");
}

/**
 * 轻量所有权检查前移除注释和字面量内容，避免注释或字符串误满足生产调用合同。
 * 此处刻意不引入 TypeScript Parser，保持脚本在依赖安装前可运行。
 */
function stripCommentsAndStrings(source: string): string {
  let output = "";
  let index = 0;
  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];
    if (current === "/" && next === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      output += "\n";
      index += 1;
      continue;
    }
    if (current === "/" && next === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        output += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      index += 2;
      continue;
    }
    if (current === "\"" || current === "'" || current === "`") {
      const quote = current;
      output += " ";
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          output += "  ";
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          output += " ";
          index += 1;
          break;
        }
        output += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }
    output += current;
    index += 1;
  }
  return output;
}

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}
