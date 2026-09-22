# Verification record — September 21, 2026

- `npm test` passes: 15 MoonBit tests, including a 25-scenario parameter sweep; real release WASM checks; JavaScript scenario-boundary checks.
- The default real WASM produces 9 delivered / 3 failed, 154 ms experiment duration, 66 ms delivered P95. Healthy comparison is 12 delivered, 54 ms P95. Burst with capacity 3 produces 3 delivered / 9 queue drops.
- Cut analysis returns four minimal two-link cuts and zero singleton cuts for the default graph. Its first cut removes Source–North plus Source–South.
- Live local browser: engine-ready status, rendered topology and packet dots, default metrics and P03 event trail checked. Burst preset visibly produces 3/12; applying the first cut produces 0/12 and `no route`; healthy preset restores 12/12. The 25 actual sweep outputs are visible and accessible as labeled controls.
- Browser file chooser automation was unavailable (`setFiles` denied by browser tooling), so no end-to-end browser file-import success is claimed. The actual shared import validator is independently tested for a valid round-trip, deep-copy isolation, ignoring untrusted report data, endpoint failure and eight malformed cases.
- The initial screenshot was visually reviewed at the available 864 px viewport. Broader manual device and assistive-technology coverage remains future work.

See `validation.json` for the exact release binary SHA-256. Tests validate the stated synthetic model, not real network performance. No external traffic, private datasets or user identity/banking data are part of this project.
