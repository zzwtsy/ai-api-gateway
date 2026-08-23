import assert from "node:assert/strict";
import test from "node:test";

import { validateDecisionNote } from "../decision-notes-policy.mjs";

const frontmatter = `---\nstatus: normative\nlast_reviewed_at: 2026-08-22\nlanguage: zh-CN\n---\n\n`;

test("implemented Decision Note accepts the canonical evidence-bearing skeleton", () => {
  const source = `${frontmatter}# Decision: 示例\n\nStatus: implemented\n\n## Problem\n\n问题。\n\n## Decision\n\n决定。\n\n## Alternatives considered\n\n- **替代方案。** 未采用。\n\n## Consequences\n\n后果。\n\n## Verification\n\n- Gate。\n`;
  assert.deepEqual(validateDecisionNote("docs/decisions/implemented/2026-08-22-example.md", source), []);
});

test("implemented Decision Note rejects proposal-era headings and weak alternatives", () => {
  const source = `${frontmatter}# Decision: 示例\n\nStatus: implemented\n\n## Problem\n\n问题。\n\n## Proposal\n\n提案。\n\n## Alternatives considered\n\n没有别的方案。\n`;
  const errors = validateDecisionNote("docs/decisions/implemented/2026-08-22-example.md", source);
  assert.ok(errors.some((error) => error.includes("missing required section ## Decision")));
  assert.ok(errors.some((error) => error.includes("may not contain ## Proposal")));
  assert.ok(errors.some((error) => error.includes("alternatives must name")));
});

test("superseded Decision Note must point at an implemented replacement", () => {
  const source = `${frontmatter}# Decision: 旧决定\n\nStatus: superseded — 已有新决定\n\n## Problem\n\n问题。\n\n## Decision\n\n旧决定。\n\n## Alternatives considered\n\n- **替代方案。** 未采用。\n\n## Consequences\n\n后果。\n\n## Verification\n\n- 历史。\n`;
  const errors = validateDecisionNote("docs/decisions/superseded/2026-08-22-old.md", source);
  assert.ok(errors.some((error) => error.includes("must link to its implemented replacement")));
});
