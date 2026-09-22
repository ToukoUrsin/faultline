# Faultline

**Break one link. Understand everything after.**

Faultline is a deterministic packet-network laboratory implemented in **MoonBit** and compiled to **WebAssembly**. It turns an abstract failure into an inspectable chain of events: which packet was in transit, which queue was full, which route changed, and what would happen with the failure removed.

[中文说明](README.zh-CN.md) · [Model and architecture](docs/MODEL.md) · [One-page proposal](docs/PROPOSAL.md) · [Validation evidence](docs/validation.json)

## Run it

Requires Node.js 22 or newer. No npm packages, API keys, accounts, services or browser extensions are required.

```sh
npm start
# Open http://127.0.0.1:8777
```

A compiled `web/assets/faultline.wasm` is included, so the interactive laboratory runs immediately. Serve over HTTP; browsers cannot fetch the engine using a `file://` URL. The server binds only to localhost. The entire `web/` folder can also be hosted by an ordinary static web server. The project does not send telemetry or simulate by calling an external service.

To change or verify the engine, install [the official MoonBit toolchain](https://www.moonbitlang.com/download), then:

```sh
npm test   # 15 MoonBit tests, release build, real WASM and import-boundary checks
npm run build
```

The development build uses `moon 0.1.20260920 (914d7da 2026-09-20)`, compiler `v0.10.14+7d59c7ec9 (2026-09-18)`. The compiler and core library are installed under an ignored `.toolchain/` directory for this workspace; scripts prefer that local toolchain when present, otherwise `moon` on PATH. `MOON_BIN` can select a different executable. A CI workflow is configured for the official current toolchain; hosted CI has not run successfully. Local checks pass. Since MoonBit evolves quickly, record the compiler version when reproducing a result.

## Try three experiments

1. **Bridge failure.** At 52 ms, North–Bridge fails. Nine of twelve packets arrive; three in-flight packets are lost. The healthy comparison delivers twelve. Select P03 to see its exact 16 → 34 → 52 ms chain.
2. **A sudden burst.** Inject all twelve packets at once into a three-packet queue. Nine are rejected immediately. Raising capacity changes actual simulated outcomes; healthy connectivity alone cannot solve overload.
3. **Failure timing.** The 25-bar counterfactual chart reruns the MoonBit engine for different failure times. An early failure can lose fewer packets because routing avoids it before traffic enters. Click a bar to adopt that experiment.

The minimal-cut analyzer separately enumerates every inclusion-minimal one- or two-link cut in the original topology. “Try first minimal cut” applies a computed cut. The default network has zero single-link cuts and four two-link cuts. Packet loss and graph disconnection are distinct measurements.

Click links to schedule or clear failures. Scrub or play model time, inspect packet rows, then export the complete scenario, original report and healthy-network comparison. Import recomputes all results; it never trusts a supplied trace. Reloading resets the app. Export any scenario you wish to preserve.

## What is MoonBit here?

MoonBit owns input bounds, Dijkstra routing, the stable event scheduler, independent directional FIFO transmitters, queue overflow, fail-stop semantics, hop budgets, packet traces, aggregate statistics, the failure-time sweep, breadth-first connectivity and minimal-cut enumeration. The reusable `engine` package has no browser dependencies. `bridge` supplies a defensive numeric ABI. The release module has **zero host imports**.

JavaScript owns controls, SVG rendering, playback, file import/export and explanatory wording around engine facts. HTML and CSS own presentation. There is no JavaScript simulation fallback, mocked network response or prewritten successful trace. No code from another hackathon project is reused.

## Scope and honest limitations

This is a small, explicit teaching and reasoning model, not a production network predictor. Links are bidirectional, routing sees failure immediately, and packets have uniform serialization times. There is no TCP, retransmission, congestion-control protocol, packet payload, wireless interference, recovery, real network capture or distributed routing convergence. Transit animation combines serialization and propagation into one visual segment. See [exact semantics](docs/MODEL.md).

Core limits: 24 nodes, 64 links, 128 packets, 96 hops, 65 sweep points. The browser restricts packet count to 48 and spacing to 24 ms to keep the timeline readable. Inputs beyond limits fail explicitly. The graph analyzer only enumerates cuts of size one and two; an empty cut list does not prove arbitrary resilience. P95 and mean latency include delivered packets only; if none arrive, the UI shows no latency result.

## Originality, AI and license

Original work began September 21, 2026 in this repository. Codex assisted design, MoonBit implementation, tests, interface and documentation. The implementation uses standard Dijkstra, FIFO, breadth-first reachability and discrete-event concepts; it is not a port of a specific project. No external images, fonts, paid assets or private/company data are included. MoonBit’s compiler/runtime and core library have their own upstream licenses; our original project is MIT licensed.

This is a prepared project for the MoonBit September event. **No acceptance, submission or prize eligibility is claimed.** The official registration requires identity/banking information and a legal commitment; the overseas route is awaiting clarification. The event’s exact gates and primary sources are documented in [entry research](docs/MOONBIT-ENTRY.md).

## Static publication

`npm run build` compiles WASM and synchronizes the public static artifact into `docs/`. GitHub Pages serves that folder using its native branch-build mode. The documentation Markdown alongside it remains source material; `docs/index.html`, `docs/app.js`, `docs/scenario.js`, `docs/style.css` and `docs/assets/` are generated copies. Edit `web/`, then rebuild. Upstream MoonBit notices are preserved in the shipped artifact.
