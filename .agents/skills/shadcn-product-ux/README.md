# shadcn-product-ux

A portable Agent Skill for designing, auditing, refactoring, and implementing product-style web UX with shadcn/ui and Lucide while preserving the default shadcn visual language.

## Package

```text
shadcn-product-ux/
├── SKILL.md
├── README.md
├── assets/
│   └── ux-spec-template.md
├── evals/
│   └── trigger-evals.json
└── references/
    ├── component-decisions.md
    ├── qa-checklist.md
    └── ux-principles.md
```

The skill is intentionally instruction-only. UX decisions are context-dependent; deterministic scripts would add maintenance cost without improving the core workflow.

## Install

Place the entire `shadcn-product-ux` directory in a skills location supported by your agent. Common locations include:

```text
# Repository-scoped, portable default
.agents/skills/shadcn-product-ux/

# User-scoped
~/.agents/skills/shadcn-product-ux/
```

Some clients also discover `.claude/skills/`, `.github/skills/`, or product-specific skill directories.

## Invoke

Explicitly mention the skill when supported, or ask for a product UX design, audit, refactor, or implementation involving shadcn/ui and Lucide. The frontmatter description is written to support implicit activation while excluding component installation/debugging and purely decorative marketing design.

## Evaluate and improve

1. Run the prompts in `evals/trigger-evals.json` and record whether the skill activates correctly.
2. Test representative design, audit, and implementation tasks with and without the skill.
3. Review execution traces for unnecessary work, skipped states, overuse of cards, or component choices that do not match task scope.
4. Generalize recurring corrections into `SKILL.md` or a focused reference file.
5. Remove instructions that do not measurably improve output.

Keep `SKILL.md` focused. Put conditional detail in `references/` and load it only when the task needs it.
