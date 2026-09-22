export function validateScenario(raw) {
  const s = structuredClone(raw.scenario ?? raw);
  if (s.schema !== "faultline/scenario/v1")
    throw Error("Expected a Faultline scenario/v1 JSON export.");
  if (
    !Array.isArray(s.nodes) ||
    s.nodes.length < 2 ||
    s.nodes.length > 24 ||
    !Array.isArray(s.links) ||
    s.links.length > 64
  )
    throw Error("Use 2–24 nodes and at most 64 links.");
  const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  s.nodes.forEach((n, i) => {
    if (typeof n.name !== "string" || n.name.length > 40)
      throw Error(`Node ${i} requires a name under 41 characters.`);
    if (
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      n.x < 30 ||
      n.x > 770 ||
      n.y < 30 ||
      n.y > 255
    )
      throw Error("Node layout must fit x:30–770, y:30–255.");
  });
  for (const l of s.links) {
    if (
      !integer(l.from, 0, s.nodes.length - 1) ||
      !integer(l.to, 0, s.nodes.length - 1) ||
      l.from === l.to ||
      !integer(l.propagation, 1, 10000) ||
      !integer(l.service, 1, 10000) ||
      !integer(l.capacity, 1, 128) ||
      !integer(l.down_at, -1, 1000000)
    )
      throw Error(
        "Invalid link: check endpoints, latency, service, capacity and failure time.",
      );
  }
  const p = s.params;
  if (
    !p ||
    !integer(p.count, 1, 48) ||
    !integer(p.source, 0, s.nodes.length - 1) ||
    !integer(p.target, 0, s.nodes.length - 1) ||
    !integer(p.interval, 0, 24) ||
    !integer(p.hop_limit, 1, 96)
  )
    throw Error(
      "UI supports 1–48 packets, spacing 0–24 ms and hop budget 1–96.",
    );
  return s;
}
