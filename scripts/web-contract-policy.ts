import * as ts from "typescript";

export interface WebContractInput {
  readonly cssSource: string;
  readonly designTokens: unknown;
  readonly pageContracts: unknown;
  readonly pageManifest: readonly unknown[];
  readonly routeTreeSource: string;
}

interface PageIdentity {
  readonly id: string;
  readonly label: string;
  readonly navGroup: string;
  readonly path: string;
}

const implementedTokenVariables = [
  ["layout", "pageGutterDesktop", "--aigw-layout-page-gutter-desktop"],
  ["layout", "pageGutterMedium", "--aigw-layout-page-gutter-medium"],
  ["layout", "pageGutterCompact", "--aigw-layout-page-gutter-compact"],
  ["layout", "pageTopPadding", "--aigw-layout-page-top-padding"],
  ["layout", "pageBottomPadding", "--aigw-layout-page-bottom-padding"],
  ["layout", "requestMasterMin", "--aigw-layout-request-master-min"],
  ["layout", "requestInspectorMin", "--aigw-layout-request-inspector-min"],
  ["breakpoint", "desktop", "--breakpoint-aigw-desktop"],
  ["breakpoint", "minimumCommitted", "--breakpoint-aigw-minimum"],
] as const;

export function collectWebContractViolations(input: WebContractInput): string[] {
  const failures: string[] = [];
  const contractPages = readPageIdentities(input.pageContracts, "page-contracts.json", failures);
  const deliveredPages = readPageIdentities({ pages: input.pageManifest }, "page manifest", failures);

  checkDuplicates(contractPages, "page-contracts.json", failures);
  checkDuplicates(deliveredPages, "page manifest", failures);

  const contractsById = new Map(contractPages.map(page => [page.id, page]));
  const routePaths = readGeneratedRoutePaths(input.routeTreeSource, failures);
  for (const delivered of deliveredPages) {
    const contract = contractsById.get(delivered.id);
    if (contract === undefined) {
      failures.push(`page manifest ${delivered.id}: missing product page contract`);
      continue;
    }
    for (const field of ["path", "label", "navGroup"] as const) {
      if (delivered[field] !== contract[field]) {
        failures.push(`page manifest ${delivered.id}.${field}: expected ${JSON.stringify(contract[field])}, received ${JSON.stringify(delivered[field])}`);
      }
    }
    if (!routePaths.has(delivered.path)) {
      failures.push(`page manifest ${delivered.id}.path: generated route ${JSON.stringify(delivered.path)} is missing`);
    }
  }

  checkImplementedTokens(input.designTokens, input.cssSource, failures);
  return failures;
}

function readPageIdentities(source: unknown, owner: string, failures: string[]): PageIdentity[] {
  if (!isRecord(source) || !Array.isArray(source.pages)) {
    failures.push(`${owner}: expected a pages array`);
    return [];
  }

  const pages: PageIdentity[] = [];
  for (const [index, value] of source.pages.entries()) {
    if (!isRecord(value)) {
      failures.push(`${owner} pages[${index}]: expected an object`);
      continue;
    }
    const identity = readPageIdentity(value, `${owner} pages[${index}]`, failures);
    if (identity !== null)
      pages.push(identity);
  }
  return pages;
}

function readPageIdentity(source: Record<string, unknown>, owner: string, failures: string[]): PageIdentity | null {
  const values = {
    id: readRequiredString(source, "id", owner, failures),
    label: readRequiredString(source, "label", owner, failures),
    navGroup: readRequiredString(source, "navGroup", owner, failures),
    path: readRequiredString(source, "path", owner, failures),
  };
  if (Object.values(values).includes(null))
    return null;
  return values as PageIdentity;
}

function readRequiredString(
  source: Record<string, unknown>,
  field: string,
  owner: string,
  failures: string[],
): string | null {
  const value = source[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    failures.push(`${owner}.${field}: expected a non-empty string`);
    return null;
  }
  return value;
}

function checkDuplicates(pages: readonly PageIdentity[], owner: string, failures: string[]): void {
  for (const field of ["id", "path"] as const) {
    const seen = new Set<string>();
    for (const page of pages) {
      if (seen.has(page[field]))
        failures.push(`${owner}: duplicate ${field} ${JSON.stringify(page[field])}`);
      seen.add(page[field]);
    }
  }
}

function readGeneratedRoutePaths(source: string, failures: string[]): Set<string> {
  const sourceFile = ts.createSourceFile("routeTree.gen.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const paths = new Set<string>();
  let foundFullPaths = false;

  function visit(node: ts.Node): void {
    if (ts.isPropertySignature(node) && propertyName(node.name) === "fullPaths" && node.type !== undefined) {
      foundFullPaths = true;
      collectStringLiteralTypes(node.type, paths);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!foundFullPaths || paths.size === 0)
    failures.push("routeTree.gen.ts: could not read FileRouteTypes.fullPaths from the generated route tree");
  return paths;
}

function collectStringLiteralTypes(node: ts.TypeNode, output: Set<string>): void {
  if (ts.isUnionTypeNode(node)) {
    for (const member of node.types)
      collectStringLiteralTypes(member, output);
    return;
  }
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal))
    output.add(node.literal.text);
}

function propertyName(name: ts.PropertyName): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}

function checkImplementedTokens(designTokens: unknown, cssSource: string, failures: string[]): void {
  const cssVariables = readCssVariables(cssSource);
  for (const [section, key, variable] of implementedTokenVariables) {
    const expected = readNestedString(designTokens, section, key);
    if (expected === null) {
      failures.push(`design-tokens.json ${section}.${key}: expected a string value`);
      continue;
    }
    const actual = cssVariables.get(variable);
    if (actual === undefined) {
      failures.push(`index.css: missing ${variable} for ${section}.${key}`);
      continue;
    }
    if (actual !== expected) {
      failures.push(`index.css ${variable}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
    }
  }
}

function readCssVariables(source: string): Map<string, string> {
  const variables = new Map<string, string>();
  for (const match of source.matchAll(/(--[\w-]+)[ \t]*:([^;{}\r\n]+);/gu)) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined)
      variables.set(name, value.trim());
  }
  return variables;
}

function readNestedString(source: unknown, section: string, key: string): string | null {
  if (!isRecord(source))
    return null;
  const group = source[section];
  if (!isRecord(group))
    return null;
  const value = group[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
