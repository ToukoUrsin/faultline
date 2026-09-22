import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { validateScenario } from "../web/scenario.js";
const valid = JSON.parse(
  await fs.readFile(
    new URL("../examples/bridge-failure.json", import.meta.url),
  ),
);
assert.deepEqual(validateScenario(valid), valid);
assert.deepEqual(
  validateScenario({ scenario: valid, report: { delivered: 999999 } }),
  valid,
);
const copy = validateScenario(valid);
copy.links[0].capacity = 7;
assert.equal(valid.links[0].capacity, 4);
const invalid = JSON.parse(
  await fs.readFile(
    new URL("../examples/invalid-endpoint.json", import.meta.url),
  ),
);
assert.throws(() => validateScenario(invalid), /Invalid link/);
for (const mutate of [
  (s) => (s.params.count = 49),
  (s) => (s.params.count = 1.5),
  (s) => (s.params.interval = -1),
  (s) => (s.links[0].service = 0),
  (s) => (s.nodes[0].x = Infinity),
  (s) => (s.nodes[0].name = "x".repeat(41)),
  (s) => (s.schema = "wrong"),
  (s) => (s.nodes = []),
]) {
  const s = structuredClone(valid);
  mutate(s);
  assert.throws(() => validateScenario(s));
}
console.log(
  "Scenario boundary checks passed: valid round-trip, copied state, untrusted result ignored, eight invalid cases.",
);
