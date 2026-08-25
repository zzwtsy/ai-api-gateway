---
name: update-shadcn
description: Add or update shadcn components in AI API Gateway against the pinned Base UI and Nova baseline. Review official Registry differences file by file, keep Registry-owned components/ui source unchanged, and verify equivalent behavior for generated hooks. Do not use for product UX design or ordinary feature composition.
---

# Update shadcn components

## Read first

1. `apps/web/AGENTS.md`
2. `docs/references/official-toolchain-baseline.md`
3. `.toolchain/baseline.json`

## Workflow

1. Run `pnpm ui:info`; confirm `base=base`, `style=nova/base-nova`, and Tailwind v4.
2. Check whether the component is already installed.
3. Run the pinned CLI with `pnpm exec shadcn add <component> --cwd apps/web --dry-run`.
4. Review every existing file with `--diff <file>`.
5. After file-by-file review, let the pinned CLI overwrite `components/ui`; never merge or format that directory manually.
6. Base UI custom triggers use `render`; Button-as-Link uses a real Link with `buttonVariants`.
7. Forms use `FieldGroup`, `Field`, `data-invalid`, and `aria-invalid`.
8. Icons use `data-icon`; do not set icon dimensions manually inside Buttons.
9. Move product differences into global tokens, `components/product`, the owning feature, or layout composition.
10. Generated hooks outside `components/ui` enter normal ESLint. Equivalent formatting or implementation changes are allowed only when exports, breakpoints, subscription behavior, and cleanup remain equivalent and their digest and behavior tests are updated.
11. Update the component, hook, and digest records in `.toolchain/baseline.json`; keep `localPatches` empty.
12. Run `pnpm verify:toolchain-baseline`, `pnpm verify:toolchain-official`, and `pnpm check:web`.

## Prohibited shortcuts

- Do not overwrite components from GitHub Raw URLs.
- Do not introduce `@radix-ui/*`.
- Do not restore `asChild` or Slot contracts.
- Do not create parallel shadcn-like primitives.
- Do not patch or format `components/ui` manually.
- Do not use `--overwrite` to bypass file-by-file diff review.
