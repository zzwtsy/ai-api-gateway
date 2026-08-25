---
name: trim-authoring-residue
description: Review or repair authoring-process residue in Markdown, JSDoc, comments, prompts, diagnostics, and visible strings. Use for PR, review, or design-session vantage; change narration; control-flow paraphrases; ownerless plans; and unresolvable references while preserving current contracts and evidence. Do not use for general UI copy simplification.
---

# Trim Authoring Residue

Authoring residue describes the repository from the temporary perspective of the person making a change instead of the perspective of a reader at the current `HEAD`. It depends on private design labels, PR rounds, review conversations, change stories, or natural-language restatements of code.

Repair is not mechanical deletion. Preserve the complete current contract and remove only the process wrapper. Delete review pleasantries, private audit labels, and obvious code paraphrases that carry no durable fact.

## Boundary

This Skill answers whether text depends on temporary author context. It does not decide whether a valid current fact deserves space in a product interface, whether nearby copy is repetitive, or whether the wording helps a user complete a task. When the request also concerns those questions, report the separate concern without expanding this workflow.

## Core question

Ask of every suspicious passage:

> Can a reader at the current `HEAD`, without access to chat history, PR discussion, an uncommitted design, or the author's memory, resolve every reference and verify every claim?

If not, rewrite the passage as a repository-verifiable current fact or link to its committed owner. Even resolvable change stories do not belong in a current README, Convention, JSDoc, or Architecture document when Decision Notes, Postmortems, Issues, or Git history already own that history.

## Residue categories

1. **Unresolvable design references:** `decision 7`, `audit C2`, `T4`, `P1`, `design §4.2`, or `the previous proposal`. Link a committed Decision or Plan, or remove the private label and make the fact self-contained.
2. **PR, commit, and stack vantage:** `this PR adds`, `a later PR`, `the previous commit`, or `this round`. State the delivered mechanism. Put deferred work in an owned `TODO`, Issue, or active Plan.
3. **Change narration and repository timestamps:** `used to`, `no longer`, `old version`, `now`, or `this cut`. Write current surfaces in the present tense. When regression rationale matters, use a present-tense counterfactual such as “Without X, Y occurs.”
4. **Review process:** `review rejected`, `the reviewer confirmed`, or `round five feedback`. Preserve the final decision and technical basis, not who said it or when.
5. **Reviewer-facing self-defense:** `this cast is safe` or `this is obviously correct`. State the ownership, validation point, or invariant that makes the code safe; delete the comment when the code already makes that clear.
6. **Control-flow and test narration:** `first A, then B, finally C`, branch-by-branch paraphrases, or click-by-click test descriptions. Delete them unless the order is non-interchangeable and has consequences; then state the sequencing contract.
7. **Vague plans and hedges:** `good enough for now`, `maybe later`, or `probably fine`. State the real boundary or use an owned `TODO` or `FIXME` with an exit condition; otherwise delete it.
8. **Draft-language residue:** meaningless English fragments in Chinese documentation, untranslated work notes in an English entry point, or separators such as `---- private ----`. Translate to the surface language or delete them. Technical identifiers are not residue.
9. **Hand-maintained status inventories:** `7/10 complete`, test-file lists, directory mirrors, or generated field tables. Move temporary progress to a Plan or let a script or generated artifact own the inventory. Current documentation keeps only durable rules.

## Not authoring residue

- Resolvable Issues, merged PRs, and `TODO(name)` references;
- real alternatives and tradeoffs in a Decision Note;
- Postmortem timelines, evidence, and causal chains;
- phase labels and implementation order in an active `docs/plans/` document, which must be closed out when complete;
- necessary reasons for lint or coverage suppressions, empty catches, and compatibility branches;
- present-tense regression rationale such as “Without X, Y occurs”;
- sourced measurements and limits;
- runtime old and new objects, such as a new connection taking traffic after the old connection drains;
- RFC sections, public standards, published design references, and committed documentation anchors;
- code identifiers, protocol names, Error Codes, and log fields in English.

Being resolvable only proves that a reference is not dead. It does not prove that the text is in the correct location. Keep change history in its owner instead of duplicating it into current-fact surfaces.

## Workflow

1. Confirm the user-specified scope or obtain it from `change-scope` using the confirmed Base.
2. Read the owning code and the conventions for the affected document or text surface.
3. Run the [recall probes](references/recall-batteries.md) read-only, then manually read the prose-dense parts of the scope. A probe hit is not a defect conclusion, and zero hits are not acceptance evidence.
4. For each candidate, enumerate actor, action, condition, timing, strength, negative guarantees, ownership, failure, and consequence.
5. Classify it as delete, restate in the present tense, link to the owner, move to a Decision, Postmortem, or Plan, or keep.
6. Edit the owning source first, then regenerate any catalog, specification projection, snapshot, or visible output.
7. Use the [rewrite examples](references/examples.md) to check for over-deletion.
8. Rerun the probes and manually justify every remaining match. Do not treat a clean search as proof of prose or UI quality.
9. Run gates for the affected surface and report what changed, what was deliberately retained, and what remains unresolved.

## Safeguards

- Do not directly edit `.artifacts/`, `dist/`, coverage output, generated API types, generated route trees, fixtures, or snapshots. Repair the owning source and regenerate.
- Do not modernize original logs or quotations preserved as Postmortem evidence.
- Do not silently polish prompts or UI strings. They are behavior changes and require corresponding evidence.
- Do not set deletion targets from search-result counts or remove real contracts merely to make a diff look clean.
- Do not weaken an explicit obligation into advice or present a hypothetical capability as delivered.
- Do not claim that residue cleanup establishes UI copy quality. A correct current fact can still be redundant, misplaced, or irrelevant to the user's task.

## Validation

For documentation, AGENTS files, Skills, or Decision Notes:

```bash
pnpm check:docs
git diff --check
```

For visible strings or prompts:

```bash
pnpm check:web
```

Add the relevant behavioral gate for protocol, database, or release changes. Editorial checks do not replace behavioral evidence.

This Skill is adapted from DeepSeek Harness `dsh-trim-cot-leakage` for this repository's fact ownership and Decision or Plan system. See [Third-Party Notices](../THIRD_PARTY_NOTICES.md) for licensing.
