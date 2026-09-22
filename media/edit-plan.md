# Faultline narration and real-capture edit plan

Target: about two minutes, under three. Stock ElevenLabs George voice; no cloned identity. All app visuals must come from the root agent's actual captures. No invented states, metrics or UI. Retiming holds and accelerating waits is acceptable if it preserves actual outcomes.

1. **Hero / bridge:** first two narration paragraphs. Start on hero, then show network and 9/12 versus 12/12. Lower third: “MoonBit → WebAssembly · real deterministic simulation”.
2. **P03 evidence:** third paragraph. Show selected P03 with 16, 34 and 52 ms trail. Caption: “Failure at arrival time wins — an explicit model rule”.
3. **Earlier failure:** fourth paragraph. Show actual 25-point sensitivity and click early failure, reaching 12/12. Caption: “25 independent simulations · all scheduled failures move together”.
4. **Burst:** fifth paragraph. Show 3/12 delivered, 9 queue full. Caption: “Queue capacity includes the packet in service”.
5. **Minimal cut:** sixth paragraph. Apply engine-computed two-edge cut, show 0/12 no route. Caption: “Inclusion-minimal cut: either link alone preserves connectivity”. Do not imply the video demonstrates removing either edge unless captured.
6. **Healthy + export/import:** seventh paragraph. Show 12/12, actual export/import and verification. If import did not succeed in root's capture, omit its visual claim and change narration to describe the designed behavior as a feature, not demonstrated validation.
7. **Close:** final paragraph. Hero or methodology. Persistent disclosure: “Synthetic network model · instant route updates · no TCP or real traffic”. Finish with public repo and verified live demo URL.

Use readable dark lower thirds and limited overlays; the UI is the product. Retain the synthetic/model disclosure without obscuring controls. Export English SRT and optionally Chinese translation after audio duration and cuts are known.
