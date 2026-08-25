# Consumer proof

For every candidate, search exact symbols, calls, configuration keys, Error Codes, events, wire strings, and environment variables across:

- production consumers under `src`;
- tests, documentation, snapshots, and fixtures;
- composition roots, route registration, dynamic loaders, build configuration, scripts, and Docker entrypoints;
- migrations, historical formats, and export compatibility.

Read call sites before classifying them:

```text
production
non-production
build-or-dynamic
compatibility
no-consumer
```

A test-only consumer does not automatically prove deletion safety; the test may preserve an important negative guarantee. Directory search, type-reference counts, and static tools alone cannot exclude reflection, generated entrypoints, or release glue.
