# Verification record — September 21, 2026

- `npm test` passes: 15 MoonBit tests, including a 25-scenario parameter sweep; real release WASM checks; JavaScript scenario-boundary checks.
- The default real WASM produces 9 delivered / 3 failed, 154 ms experiment duration, 66 ms delivered P95. Healthy comparison is 12 delivered, 54 ms P95. Burst with capacity 3 produces 3 delivered / 9 queue drops.
- Cut analysis returns four minimal two-link cuts and zero singleton cuts for the default graph. Its first cut removes Source–North plus Source–South.
- Live local browser: engine-ready status, rendered topology and packet dots, default metrics and P03 event trail checked. Burst preset visibly produces 3/12; applying the first cut produces 0/12 and `no route`; healthy preset restores 12/12. The 25 actual sweep outputs are visible and accessible as labeled controls.
- The campaign owner subsequently completed the real browser round-trip: exported healthy 12/12, changed to the bridge-failure 9/12 state, then imported the exported JSON. The app displayed its recomputation notice and restored 12/12. This was captured in scene6b/scene6c. The shared import validator is also independently tested for deep-copy isolation, ignoring untrusted report data, endpoint failure and eight malformed cases.
- The initial screenshot was visually reviewed at the available 864 px viewport. A 390 px responsive viewport reports client width = scroll width = 390 px and a 342 px workspace, with no horizontal overflow. Broader manual device and assistive-technology coverage remains future work.

See `validation.json` for the exact release binary SHA-256. Tests validate the stated synthetic model, not real network performance. No external traffic, private datasets or user identity/banking data are part of this project.

The public native GitHub Pages build is verified at https://toukoursin.github.io/faultline/ . Its downloaded WebAssembly is byte-for-byte identical to the locally tested 22,113-byte artifact. The Actions verification workflow has not executed successfully; local test results and native Pages deployment are separate evidence.
