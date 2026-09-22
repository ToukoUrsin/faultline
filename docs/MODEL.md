# Model, architecture and ABI

## State and ordering

A simulation consists of immutable input links, packet records, directional queue reservations, pending node-arrival events and an append-only trace. All times are integer milliseconds. Event order is `(time, packet id)`; route ties use node order and link insertion order. This is a stable, documented ordering, not random sampling.

At each node, the engine checks destination, hop budget and the current shortest route. Dijkstra edge cost is `service + propagation`. Links with `now >= down_at` are excluded. The queue for the chosen direction counts reservations whose serialization end is strictly greater than `now`. Thus a serialization finishing at exactly the next injection time has released its capacity. Propagation does not occupy the transmitter.

Tail-drop rejects an arrival if in-service plus waiting reservations already equal capacity. Otherwise serialization starts at `max(now, next_free)`, ends after service, and arrival follows propagation. Waiting time is truncated if a fail-stop happens before service starts. Such a packet never acquires an invented hop. If failure is at or before arrival, that packet is lost; failure wins at equality. The link never recovers. Packets queued before a failure are dropped rather than rerouted while waiting. New node-arrival events compute current routes afresh.

The scheduler may append a future transit or drop before processing another packet's earlier injection. Therefore the trace array is deterministic **but not globally sorted by time**. Consumers should sort by time when building a global event view. Per-packet paths are chronological; equal-time injection precedes transit.

## Counterfactuals

The healthy comparison preserves all parameters and changes only `down_at` to `-1`. A failure-time sweep preserves the set of scheduled links and moves all of those failures to the same sampled time. It does not claim monotonicity; queue interactions and in-flight loss can produce a non-monotonic delivery curve. The 25 UI samples are exact simulations at discrete times, not an interpolation or confidence interval.

Minimal cuts ignore configured failure times and inspect the original graph. First test each link removal; then test pairs excluding any pair containing an already disconnecting singleton. This enumerates inclusion-minimal cuts of sizes one and two, including parallel-link cases. It does not enumerate larger cuts. If the original graph is disconnected or source equals destination, it returns an empty list. The reusable `connected_without` API distinguishes those cases.

## Package boundaries

- `src/engine/engine.mbt`: model types, validation, routing, event simulation and report aggregation.
- `src/engine/analysis.mbt`: failure sweeps, reachability and cut enumeration.
- `src/bridge/bridge.mbt`: session topology and numeric WebAssembly ABI; invalid indices return `-1`.
- `web/app.js`: controlled scenario state, rendering, playback and JSON boundary validation. No simulation logic.
- `scripts/wasm-test.mjs`: instantiates the same release bytes shipped to the browser and tests real outcomes.

Core invalid input returns `None`, not partial simulation results. The bridge clears prior reports and analysis on new runs/topology changes. Invalid reset/add-link requests preserve the previous valid topology; a rejected run clears its report so stale success cannot be read as the new result. The browser validates an imported candidate before committing it and recomputes rather than trusting serialized reports. An invalid candidate can change bridge scratch state, but does not replace the browser's saved scenario/report; the next action reloads the valid scenario into the bridge.

## Numeric interface

`reset(node_count)` clears a valid session. `add_link(from,to,propagation,service,capacity,down_at)` returns its zero-based edge id or `-1`. `run(count,source,target,interval,hop_limit)` returns 1 or -1.

`packet_value(index,field)` fields: id, sent, ended, status, hops, queued. Status: 1 delivered; 2 no route; 3 queue full; 4 link failed; 5 hop limit.

`event_value(index,field)` fields: packet, kind, node, next, link, time, end, reason. Kind: 0 inject; 1 wait; 2 transit; 3 arrive; 4 delivered; 5 dropped. Link is -1 for non-link events.

`statistic(field)` fields: floor(mean delivered latency), nearest-rank P95 delivered latency, peak occupied transmitter queue. Counts and duration have named accessors. No-delivery aggregate latencies are 0 internally; the UI renders an unavailable P95.

`analyze(count,source,target,interval,hop_limit,horizon,steps)` computes a sweep and cuts for the loaded graph. It returns point count or -1. `sweep_value(index,field)` fields: failure time, delivered, lost, P95, total queued time. `cut_count()` and `cut_value(index,field)` return pairs of link IDs; `second=-1` represents a singleton.

## Complexity and limits

For bounded small educational graphs, clarity wins over priority-queue complexity. The event queue uses linear minimum selection; routing uses an O(V² + VE) Dijkstra scan; cut enumeration uses O(E²) connectivity probes. Maximum bounds are validated before indexing: 24 nodes, 64 links, 128 packets, 96 hops and 65 sweep samples. Times are bounded to keep intermediate integer arithmetic within signed 32-bit limits. Core operations never read the wall clock or network.

## Verification and limitations

Tests cover hand-calculated FIFO outcomes, service-release equality, queue overflow, failure/arrival equality, waiting failure, adaptive rerouting, no-route status, zero-hop delivery, hop exhaustion, invalid inputs, 25 scenario combinations with deterministic conservation, sweep endpoints and non-mutation, one/two-link minimality, parallel edges and disconnected graphs. WASM integration additionally verifies no host imports, public getter guards and exact six-node preset results.

Browser QA is separate from core tests. No measured real-world networking claim follows from synthetic scenarios. The current UI draws serialization plus propagation as a continuous traverse, so its dots explain timing rather than physical packet location. Only the browser stores live state; reload resets it, and export is the preservation mechanism.
