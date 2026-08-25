# Authoring-residue recall probes

These commands improve recall; they do not define defects. Judge every match against the document type, code semantics, and current fact owner. The probes intentionally match this Skill's own rules and examples. Exclude this directory when reviewing product scope, or mark its matches as calibration data.

A run with no matches does not prove that prose is concise, useful, correctly placed, or free of less predictable authoring residue.

## Common exclusions

```bash
COMMON=(
  --hidden -n
  --glob '!node_modules/**'
  --glob '!.git/**'
  --glob '!dist/**'
  --glob '!coverage/**'
  --glob '!.artifacts/**'
  --glob '!apps/web/src/routeTree.gen.ts'
  --glob '!apps/web/src/api/schema.d.ts'
  --glob '!.agents/skills/trim-authoring-residue/**'
)
```

For shells without Bash arrays, write each `--glob` directly in the command.

## PR, review, and design-session vantage

```bash
rg "${COMMON[@]}" -i \
  '(这个 PR|本 PR|本次修改|这一轮|上一轮|后续 PR|前一个 commit|previous commit|this PR|later PR|reviewer|评审(认为|要求|确认|拒绝)|设计稿|设计会话|审计项|audit [A-Z][0-9]+|decision [0-9]+|计划 §|design §)' \
  .
```

## Change narration and repository timestamps

```bash
rg "${COMMON[@]}" -i \
  '(以前|之前|旧版|老版本|不再|现在改为|目前这版|这一版|本版|本轮|used to|no longer|previously|old version|this cut|for now|at the moment)' \
  .
```

Postmortems, Decision Notes, and runtime old or new states may be legitimate matches.

## Vague plans and hedges

```bash
rg "${COMMON[@]}" -i \
  '(暂时够用|以后再说|后面再做|大概没问题|应该足够|可能需要|视情况|probably fine|should be enough|maybe later|eventually|for the time being)' \
  .
```

For each match, decide whether it needs a precise boundary, an active Plan or Issue, an owned `TODO` or `FIXME`, or deletion.

## Control-flow and test narration

```bash
rg "${COMMON[@]}" -i \
  '(先.{0,30}然后|首先.{0,30}接着|最后我们|这个测试先|点击.{0,30}然后|first we|then we|finally we|this test first)' \
  --glob '*.md' --glob '*.ts' --glob '*.tsx' --glob '*.mjs' \
  .
```

When order is itself a non-interchangeable contract, retain the fact as “A must precede B; otherwise C.”

## Self-defense

```bash
rg "${COMMON[@]}" -i \
  '(这里(是|很)?安全|这个强转(是)?安全|显然正确|不会出错|这是正确的因为|safe because|this cast is safe|obviously correct|cannot fail)' \
  --glob '*.md' --glob '*.ts' --glob '*.tsx' --glob '*.mjs' \
  .
```

Replace the conclusion “safe” with the unique constructor, validation point, ownership rule, or invariant that establishes safety.

## Unresolvable internal labels

```bash
rg "${COMMON[@]}" \
  '(\b[PTW]-?[0-9]+\b|\b[A-Z][0-9]+\b|§[0-9]+(?:\.[0-9]+)*)' \
  --glob '*.md' --glob '*.ts' --glob '*.tsx' --glob '*.mjs' \
  .
```

This probe has many false positives: HTTP statuses, Error Codes, RFC sections, committed anchors, and test IDs can all be legitimate. Only repair labels that cannot be resolved from the current repository or a public standard.

## Exact-phrase follow-up

After finding a new residue expression, search the full request scope for its most distinctive three to eight words. Add a phrase to the permanent probes only when it represents a stable defect category rather than one author's wording.
