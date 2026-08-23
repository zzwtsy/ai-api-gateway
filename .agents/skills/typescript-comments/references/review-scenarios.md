# TypeScript comment review scenarios

Use this reference only when comment ownership or placement is unclear.

| Fact | Owner |
| --- | --- |
| Caller-visible rejection, cancellation, ownership, or timing | Public JSDoc on the owning API |
| Non-local ordering, race prevention, security boundary, or counterintuitive failure | Internal comment beside the invariant |
| Why a fixture, real entry point, platform workaround, or negative control is required | Test comment beside that setup or assertion |
| Cross-module long-term choice and rejected alternatives | Decision Note, with only a short local link if needed |
| Type already expresses the field or return value | No comment |
| Line-by-line control flow, change narration, review note, or confidence claim | No comment |

For TODOs, require a concrete missing behavior and a removal condition. Prefer an issue or roadmap owner for work that is not local to the file.

For suppression directives, first try to express the boundary through a type guard, validated parsing, or a narrower external declaration. If suppression is still necessary, use `@ts-expect-error` with a durable explanation of the external mismatch and the condition that makes it removable.
