import { access, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Validate runtime-invariant ownership and production enforcement.
 *
 * @param {string} root
 * @param {{ owners?: readonly RuntimeInvariantOwner[] }} manifest
 * @returns {Promise<string[]>}
 */
export async function collectRuntimeInvariantViolations(root, manifest) {
  const failures = [];
  const names = new Set();

  for (const owner of manifest.owners ?? []) {
    if (typeof owner.name !== "string" || owner.name.trim() === "") {
      failures.push("runtime invariant owner is missing a name");
      continue;
    }
    if (names.has(owner.name)) failures.push(`duplicate runtime invariant owner: ${owner.name}`);
    names.add(owner.name);

    const symbols = owner.symbols ?? (owner.symbol === undefined ? [] : [owner.symbol]);
    if (symbols.length === 0 || !symbols.every((symbol) => typeof symbol === "string" && symbol.trim() !== "")) {
      failures.push(`${owner.name}: missing invariant symbol`);
      continue;
    }
    if (typeof owner.source !== "string" || typeof owner.test !== "string") {
      failures.push(`${owner.name}: source and test paths are required`);
      continue;
    }
    if (!Array.isArray(owner.consumers) || owner.consumers.length === 0) {
      failures.push(`${owner.name}: at least one production consumer is required`);
    }

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
  }

  return failures;
}

/** @param {string} symbol */
function symbolUsePattern(symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?:\\b${escaped}\\s*\\(|\\bnew\\s+${escaped}\\s*\\()`, "u");
}

/** @param {string} symbol */
function symbolExportPattern(symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`\\bexport\\s+(?:(?:async|declare|abstract)\\s+)*(?:function|class|const|let|var)\\s+${escaped}\\b`, "u");
}

/**
 * Remove comments and literal contents before applying lightweight ownership checks.
 * This is deliberately not a TypeScript parser; it only prevents comments and
 * strings from satisfying a production-call contract before dependencies exist.
 *
 * @param {string} source
 */
function stripCommentsAndStrings(source) {
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
    if (current === '"' || current === "'" || current === "`") {
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

/** @param {string} file */
async function readText(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

/**
 * @typedef {object} RuntimeInvariantOwner
 * @property {string} name
 * @property {string} source
 * @property {string} test
 * @property {readonly string[]} consumers
 * @property {string | undefined} [symbol]
 * @property {readonly string[] | undefined} [symbols]
 */
