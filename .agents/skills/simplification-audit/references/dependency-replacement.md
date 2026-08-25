# Dependency replacement

Adding a dependency is a simplification only when it lowers lifecycle cost. Record:

1. the exact surface fully covered by an upstream library or Node built-in;
2. uncovered residual semantics that remain project-owned;
3. effects on protocol transparency, streaming, Secrets, abort, and release entrypoints;
4. maintenance activity, adoption, transitive dependencies, license, and supply-chain risk;
5. net deletion: removed implementation, dedicated tests, documentation, and compatibility branches minus new glue, adaptation tests, and operational cost.

Adding a wrapper while retaining the original parser, state machine, and dedicated tests is not simplification.
