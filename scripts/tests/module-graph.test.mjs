import assert from "node:assert/strict";
import test from "node:test";

import { buildModuleGraphDocument } from "../docs/generate-module-graph.mjs";

test("module graph projection is deterministic and includes real Gateway edges", async () => {
  const first = await buildModuleGraphDocument();
  const second = await buildModuleGraphDocument();
  assert.equal(first, second);
  assert.match(first, /`data-plane` \| `core`/u);
  assert.match(first, /`routes` \| `feature:requests`/u);
});
