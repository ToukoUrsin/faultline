# Faultline demo video

[Published MP4 and English/Chinese captions](https://github.com/ToukoUrsin/faultline/releases/tag/demo-2026-09-21). This media release is not an event submission.

Final file: `faultline-demo.mp4` (124.5 seconds, 1920×1080, 30 fps; H.264 video, AAC narration). English and Simplified Chinese subtitle tracks are embedded and supplied separately as `faultline-demo.en.srt` and `faultline-demo.zh-CN.srt`.

Narration uses the stock ElevenLabs George voice, with supplied text and forced alignment. No real person's voice is cloned. Visuals are actual CDP captures of the running app. The edit preserves within-scene chronology by capture timestamp, extends initial/final holds for explanation, and accelerates the healthy-reset recording 3.5×. One out-of-order frame arrival was sorted by its actual timestamp. The lower thirds are editorial; application states and outputs are never invented. Raw footage and audio are excluded from Git to keep the repository small. `edit.py`, alignment data, subtitles and `edit-manifest.json` reproduce and audit the edit when the source media is present.

Scene5 retains the burst scenario's 0 ms packet spacing and capacity 3. Its healthy comparison therefore delivers 3/12, while the applied cut delivers 0/12 due to no route. The caption explicitly states those retained conditions. Scene6 resets to normal spacing/capacity, producing 12/12. The export/import round trip in scene6b/6c was actually performed: healthy export, switch to bridge failure, import, recomputation notice, restored 12/12.

## Suggested YouTube title

Faultline — Watch a network fail, packet by packet | MoonBit + WASM

## Suggested YouTube description

Break one link. Understand everything after.

Faultline is an original MoonBit network laboratory, compiled to real WebAssembly. Follow each packet through exact events, compare a failure with a healthy network, explore 25 actual failure-time simulations, and apply computed minimal link cuts.

Live demo: https://toukoursin.github.io/faultline/
Source, tests and model semantics: https://github.com/ToukoUrsin/faultline

00:00 A bridge goes dark
00:27 One packet's exact story
00:46 Earlier failure can mean less loss
01:05 A queue for three, a burst of twelve
01:20 The minimal cut
01:34 Restore healthy conditions
01:36 Export the evidence
01:41 Import and recompute
01:47 Explicit assumptions and open source

The video shows the actual running app. Fifteen MoonBit tests, release-WASM integration checks and import-boundary checks validate the stated model. The export/import round trip is real. Narration uses a stock synthetic voice; English and Chinese captions are available.

This is a synthetic learning model with immediate route updates, uniform packets and permanent link failures. It does not implement TCP, retransmission, real network traffic or production-network prediction. Timeline holds are edited for explanation; healthy-reset playback is accelerated. The graph-cut scene retains the burst queue parameters, as disclosed on screen.

MIT-licensed original work, started September 21, 2026 with AI assistance. Prepared for the MoonBit September hackathon; no contest acceptance or prize eligibility is claimed.

#MoonBit #WebAssembly #NetworkSimulation #OpenSource
