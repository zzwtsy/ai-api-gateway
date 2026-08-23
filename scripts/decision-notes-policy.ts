const lifecycleRules = Object.freeze({
  implemented: {
    status: /^Status: implemented$/mu,
    required: ["Problem", "Decision", "Alternatives considered", "Consequences", "Verification"],
    forbidden: ["Proposal", "Acceptance criteria", "Risks"],
  },
  proposed: {
    status: /^Status: proposed$/mu,
    required: ["Problem", "Proposal", "Alternatives considered", "Acceptance criteria", "Risks"],
    forbidden: ["Decision", "Consequences"],
  },
  rejected: {
    status: /^Status: rejected\s+[—-]\s+\S.+$/mu,
    required: ["Problem", "Proposal", "Alternatives considered"],
    forbidden: [],
  },
  superseded: {
    status: /^Status: superseded\s+[—-]\s+\S.+$/mu,
    required: ["Problem", "Decision", "Alternatives considered", "Consequences", "Verification"],
    forbidden: ["Proposal", "Acceptance criteria", "Risks"],
  },
});

type Lifecycle = keyof typeof lifecycleRules;
type LifecycleRule = (typeof lifecycleRules)[Lifecycle];

/**
 * 验证单个有效 Decision Note，不访问文件系统。
 *
 * @returns 违规信息列表。
 */
export function validateDecisionNote(relativePath: string, source: string): string[] {
  const lifecycle = relativePath.match(/^docs\/decisions\/(implemented|proposed|rejected|superseded)\//u)?.[1] as Lifecycle | undefined;
  if (lifecycle === undefined) {
    return [`${relativePath}: path does not identify a Decision Note lifecycle`];
  }
  const rules = lifecycleRules[lifecycle];
  const headings = [...source.matchAll(/^## (.+)$/gmu)].map(match => match[1]?.trim() ?? "");
  return [
    ...collectIdentityViolations(relativePath, source, lifecycle, rules),
    ...collectHeadingViolations(relativePath, lifecycle, headings, rules),
    ...collectLifecycleContentViolations(relativePath, source, lifecycle),
  ];
}

function collectIdentityViolations(
  relativePath: string,
  source: string,
  lifecycle: Lifecycle,
  rules: LifecycleRule,
): string[] {
  const errors: string[] = [];
  const titleMatches = [...source.matchAll(/^# Decision: (.+)$/gmu)];
  if (titleMatches.length !== 1 || titleMatches[0]?.[1]?.trim() === "") {
    errors.push(`${relativePath}: requires exactly one non-empty '# Decision:' title`);
  }
  if (!rules.status.test(source)) {
    errors.push(`${relativePath}: Status line does not match ${lifecycle} lifecycle`);
  }
  return errors;
}

function collectHeadingViolations(
  relativePath: string,
  lifecycle: Lifecycle,
  headings: readonly string[],
  rules: LifecycleRule,
): string[] {
  const errors: string[] = [];
  const duplicates = headings.filter((heading, index) => headings.indexOf(heading) !== index);
  for (const heading of new Set(duplicates)) errors.push(`${relativePath}: duplicate section ## ${heading}`);

  for (const required of rules.required) {
    if (!headings.includes(required))
      errors.push(`${relativePath}: missing required section ## ${required}`);
  }
  for (const forbidden of rules.forbidden) {
    if (headings.includes(forbidden))
      errors.push(`${relativePath}: ${lifecycle} note may not contain ## ${forbidden}`);
  }

  const requiredPositions = rules.required.map(heading => headings.indexOf(heading));
  for (let index = 1; index < requiredPositions.length; index += 1) {
    const current = requiredPositions[index];
    const previous = requiredPositions[index - 1];
    if (current !== undefined && previous !== undefined && current < previous) {
      errors.push(`${relativePath}: required sections are out of canonical order`);
      break;
    }
  }
  return errors;
}

function collectLifecycleContentViolations(relativePath: string, source: string, lifecycle: Lifecycle): string[] {
  const errors: string[] = [];
  const alternatives = sectionBody(source, "Alternatives considered");
  if (alternatives !== null && !/^[-*]\s+\*\*.+?\*\*/mu.test(alternatives)) {
    errors.push(`${relativePath}: alternatives must name at least one real option with a bold-led list item`);
  }
  if (lifecycle === "superseded" && !/\]\(\.\.\/implemented\/[^)]+\.md(?:#[^)]+)?\)/u.test(source)) {
    errors.push(`${relativePath}: superseded note must link to its implemented replacement`);
  }
  if (lifecycle === "rejected" && /^Status: rejected\s+[—-]\s+(?:TODO|TBD|<)/mu.test(source)) {
    errors.push(`${relativePath}: rejected note requires a concrete rejection reason`);
  }

  return errors;
}

function sectionBody(source: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(`^## ${escaped}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "mu").exec(source);
  return match?.[1]?.trim() ?? null;
}
