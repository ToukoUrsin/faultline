import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
const bytes = await fs.readFile(
  new URL("../web/assets/faultline.wasm", import.meta.url),
);
const module = await WebAssembly.compile(bytes);
assert.deepEqual(
  WebAssembly.Module.imports(module),
  [],
  "engine must not depend on a JS simulator",
);
const w = (await WebAssembly.instantiate(module, {})).exports;
const edges = [
  [0, 1, 10],
  [1, 2, 10],
  [2, 5, 10],
  [0, 3, 14],
  [3, 4, 14],
  [4, 5, 14],
  [1, 4, 18],
];
function run({ failure = 52, interval = 8, capacity = 4, count = 12 } = {}) {
  assert.equal(w.reset(6), 1);
  edges.forEach((e, i) =>
    assert.equal(w.add_link(...e, 8, capacity, i === 1 ? failure : -1), i),
  );
  assert.equal(w.run(count, 0, 5, interval, 24), 1);
  const packets = Array.from({ length: w.packet_count() }, (_, i) =>
    Array.from({ length: 6 }, (_, j) => w.packet_value(i, j)),
  );
  const events = Array.from({ length: w.event_count() }, (_, i) =>
    Array.from({ length: 8 }, (_, j) => w.event_value(i, j)),
  );
  return {
    delivered: w.delivered_count(),
    lost: w.lost_count(),
    duration: w.max_time(),
    p95: w.statistic(1),
    packets,
    events,
  };
}
const fault = run();
assert.equal(fault.delivered, 9);
assert.equal(fault.lost, 3);
assert.equal(fault.duration, 154);
assert.equal(fault.p95, 66);
assert.deepEqual(fault, run());
assert.equal(w.analyze(12, 0, 5, 8, 24, 154, 25), 25);
assert.equal(w.sweep_value(0, 0), 0);
assert.equal(w.sweep_value(0, 1), 12);
assert.equal(w.sweep_value(24, 1), 12);
assert.equal(w.cut_count(), 4);
assert.equal(w.cut_value(0, 0), 0);
assert.equal(w.cut_value(0, 1), 3);
assert.equal(w.sweep_value(-1, 0), -1);
assert.equal(w.cut_value(0, 99), -1);
const healthy = run({ failure: -1 });
assert.equal(w.cut_count(), 0);
assert.equal(w.sweep_value(0, 0), -1);
assert.equal(healthy.delivered, 12);
assert.equal(healthy.p95, 54);
const burst = run({ failure: -1, interval: 0, capacity: 3 });
assert.equal(burst.delivered, 3);
assert.equal(burst.lost, 9);
assert.equal(burst.packets[3][3], 3);
assert.equal(w.packet_value(-1, 0), -1);
assert.equal(w.packet_value(5000, 0), -1);
assert.equal(w.event_value(-1, 0), -1);
assert.equal(w.event_value(0, 99), -1);
assert.equal(w.reset(10000000), -1);
assert.equal(w.add_link(0, 999, 10, 8, 4, -1), -1);
assert.equal(w.run(-1, 0, 5, 0, 24), -1);
assert.equal(w.packet_count(), 0);
const validation = {
  checkedAt: new Date().toISOString(),
  engineSHA256: crypto.createHash("sha256").update(bytes).digest("hex"),
  engineBytes: bytes.length,
  hostImports: [],
  wasmChecks: [
    "exact failure outcome",
    "healthy comparison",
    "burst tail-drop",
    "deterministic repeat",
    "ABI invalid reads",
    "rejected invalid inputs clear reports",
  ],
  bridgeFailure: {
    delivered: fault.delivered,
    lost: fault.lost,
    duration: fault.duration,
    p95: fault.p95,
  },
  healthy: { delivered: healthy.delivered, p95: healthy.p95 },
};
await fs.writeFile(
  new URL("../docs/validation.json", import.meta.url),
  JSON.stringify(validation, null, 2) + "\n",
);
console.log("WASM integration checks passed:", validation.engineSHA256);
