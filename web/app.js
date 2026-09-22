import { validateScenario } from "./scenario.js";
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const nodes = [
  { name: "Source", x: 80, y: 150 },
  { name: "North", x: 280, y: 65 },
  { name: "Bridge", x: 510, y: 65 },
  { name: "South", x: 280, y: 235 },
  { name: "Relay", x: 510, y: 235 },
  { name: "Destination", x: 720, y: 150 },
];
const baseEdges = [
  [0, 1, 10],
  [1, 2, 10],
  [2, 5, 10],
  [0, 3, 14],
  [3, 4, 14],
  [4, 5, 14],
  [1, 4, 18],
];
const initial = () => ({
  schema: "faultline/scenario/v1",
  nodes: structuredClone(nodes),
  links: baseEdges.map(([from, to, propagation], i) => ({
    from,
    to,
    propagation,
    service: 8,
    capacity: 4,
    down_at: i === 1 ? 52 : -1,
  })),
  params: { count: 12, source: 0, target: 5, interval: 8, hop_limit: 24 },
});
let scenario = initial(),
  wasm,
  report,
  baseline,
  selected = 2,
  clock = 0,
  playing = false,
  lastFrame = 0,
  preset = "failure";
const statusText = [
  "Pending",
  "Delivered",
  "No route",
  "Queue full",
  "Link failed",
  "Hop limit",
];
const packetName = (id) => `P${String(id + 1).padStart(2, "0")}`;
const nodeName = (id) => scenario.nodes[id]?.name || `Node ${id}`;
const linkName = (edge) => `${nodeName(edge.from)} ↔ ${nodeName(edge.to)}`;
function message(text, error = false) {
  $("notice").textContent = text;
  $("notice").classList.toggle("error", error);
}
function evaluate(s) {
  if (wasm.reset(s.nodes.length) !== 1) throw Error("Unsupported node count.");
  for (const edge of s.links) {
    if (
      wasm.add_link(
        edge.from,
        edge.to,
        edge.propagation,
        edge.service,
        edge.capacity,
        edge.down_at,
      ) < 0
    )
      throw Error("The MoonBit engine rejected a link.");
  }
  const p = s.params;
  if (wasm.run(p.count, p.source, p.target, p.interval, p.hop_limit) !== 1)
    throw Error("The MoonBit engine rejected the packet parameters.");
  const sweepCount = wasm.analyze(
    p.count,
    p.source,
    p.target,
    p.interval,
    p.hop_limit,
    Math.max(150, wasm.max_time()),
    25,
  );
  const sweep = Array.from({ length: Math.max(0, sweepCount) }, (_, i) => ({
    time: wasm.sweep_value(i, 0),
    delivered: wasm.sweep_value(i, 1),
    lost: wasm.sweep_value(i, 2),
  }));
  const cuts = Array.from({ length: wasm.cut_count() }, (_, i) =>
    [wasm.cut_value(i, 0), wasm.cut_value(i, 1)].filter((x) => x >= 0),
  );
  return {
    sweep,
    cuts,
    packets: Array.from({ length: wasm.packet_count() }, (_, i) => {
      const [id, sent, ended, status, hops, queued] = Array.from(
        { length: 6 },
        (_, j) => wasm.packet_value(i, j),
      );
      return { id, sent, ended, status, hops, queued };
    }),
    trace: Array.from({ length: wasm.event_count() }, (_, i) => {
      const [packet, kind, node, next, link, time, end, reason] = Array.from(
        { length: 8 },
        (_, j) => wasm.event_value(i, j),
      );
      return { packet, kind, node, next, link, time, end, reason };
    }),
    delivered: wasm.delivered_count(),
    lost: wasm.lost_count(),
    duration: wasm.max_time(),
    mean_latency: wasm.statistic(0),
    p95_latency: wasm.statistic(1),
    peak_queue: wasm.statistic(2),
  };
}
function recompute(resetClock = true) {
  try {
    report = evaluate(scenario);
    const healthy = structuredClone(scenario);
    healthy.links.forEach((e) => (e.down_at = -1));
    baseline = evaluate(healthy);
    if (resetClock) {
      clock = 0;
      playing = false;
    }
    selected = Math.min(selected, report.packets.length - 1);
    $("scrub").max = Math.max(1, report.duration);
    $("duration").textContent = `${report.duration} ms`;
    $("interval-value").textContent = `${scenario.params.interval} ms`;
    const capacities = [...new Set(scenario.links.map((e) => e.capacity))];
    $("capacity-value").textContent =
      capacities.length === 1 ? `${capacities[0]} packets` : "Mixed capacities";
    const failed = scenario.links.filter((e) => e.down_at >= 0);
    const failureTimes = [...new Set(failed.map((e) => e.down_at))];
    $("failure-value").textContent =
      failureTimes.length === 1
        ? `${failureTimes[0]} ms`
        : failed.length
          ? "Mixed times"
          : "No failures";
    $("failure-time").max = Math.max(150, report.duration, ...failureTimes);
    $("delivered").innerHTML =
      `${report.delivered}<small>/ ${scenario.params.count}</small>`;
    $("delivered-comparison").textContent =
      `Healthy network: ${baseline.delivered}/${scenario.params.count}`;
    $("dropped").textContent = report.lost;
    const causes = [2, 3, 4, 5]
      .map((s) => ({
        s,
        n: report.packets.filter((p) => p.status === s).length,
      }))
      .filter((x) => x.n);
    $("loss-reason").textContent = causes.length
      ? causes.map((x) => `${x.n} ${statusText[x.s].toLowerCase()}`).join(" · ")
      : "Every packet arrived";
    $("latency").innerHTML = report.delivered
      ? `${report.p95_latency}<small>ms</small>`
      : "—";
    $("latency-comparison").textContent =
      `Healthy: ${baseline.delivered ? baseline.p95_latency + " ms" : "no delivery"} · delivered only`;
    $("queue").innerHTML =
      `${report.peak_queue}<small>${report.peak_queue === 1 ? "packet" : "packets"}</small>`;
    $("route-label").textContent =
      `${nodeName(scenario.params.source)} → ${nodeName(scenario.params.target)}`;
    $("network-title").textContent =
      scenario.nodes.length === 6
        ? "Six nodes. More than one way."
        : `${scenario.nodes.length} nodes. Follow the consequences.`;
    renderNetwork();
    renderTimeline();
    renderInspector();
    renderSweep();
    renderClock();
  } catch (error) {
    playing = false;
    message(error.message, true);
  }
}
function renderNetwork() {
  $("links").innerHTML = scenario.links
    .map((e, i) => {
      const a = scenario.nodes[e.from],
        b = scenario.nodes[e.to],
        mx = (a.x + b.x) / 2,
        my = (a.y + b.y) / 2;
      return `<g><line id="edge-${i}" class="network-link" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><line class="link-hit" tabindex="0" role="button" aria-label="${esc(linkName(e))}, ${e.down_at >= 0 ? "clear failure" : "schedule failure"}" data-edge="${i}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><text class="link-label" x="${mx}" y="${my - 11}">${e.propagation + e.service} ms</text>${e.down_at >= 0 ? `<text class="failure-label" x="${mx}" y="${my + 17}">FAIL @ ${e.down_at} ms</text>` : ""}</g>`;
    })
    .join("");
  $("nodes").innerHTML = scenario.nodes
    .map(
      (n, i) =>
        `<g><circle class="node-circle ${[scenario.params.source, scenario.params.target].includes(i) ? "endpoint" : ""}" cx="${n.x}" cy="${n.y}" r="24"/><text class="node-text" x="${n.x}" y="${n.y + 1}">${String.fromCharCode(65 + i)}</text><text class="node-name" x="${n.x}" y="${n.y + 42}">${esc(n.name)}</text></g>`,
    )
    .join("");
  const toggle = (i) => {
    scenario.links[i].down_at =
      scenario.links[i].down_at < 0 ? Number($("failure-time").value) : -1;
    custom();
    recompute();
  };
  document.querySelectorAll("[data-edge]").forEach((el) => {
    el.onclick = () => toggle(Number(el.dataset.edge));
    el.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle(Number(el.dataset.edge));
      }
    };
  });
}
function renderSweep() {
  $("sweep-mode").textContent = report.sweep.length
    ? `${report.sweep.length} EXACT MOONBIT RUNS`
    : "ORIGINAL GRAPH ANALYSIS";
  $("sweep").innerHTML = report.sweep.length
    ? report.sweep
        .map(
          (p) =>
            `<button data-failure="${p.time}" style="height:${Math.max(5, (p.delivered / scenario.params.count) * 70)}px" title="Failure at ${p.time} ms: ${p.delivered}/${scenario.params.count} delivered" aria-label="Fail at ${p.time} milliseconds, ${p.delivered} delivered"><span>${p.delivered}</span></button>`,
        )
        .join("")
    : '<span class="sweep-empty">Schedule a link failure to explore how its timing changes delivery.</span>';
  $("sweep-axis").innerHTML = report.sweep.length
    ? `<span>FAIL AT 0 ms</span><span>BAR HEIGHT = DELIVERED PACKETS</span><span>${report.sweep.at(-1).time} ms</span>`
    : "";
  $("sweep-copy").textContent = report.sweep.length
    ? "Move all scheduled failures together. Every bar is a fresh simulation. Click to try."
    : "The original graph can still have a minimal cut even when every packet arrives.";
  const singles = report.cuts.filter((c) => c.length === 1).length;
  $("cut-summary").textContent = report.cuts.length
    ? `${singles} single-link cuts · ${report.cuts.length - singles} minimal two-link cuts in the original topology.`
    : "No one- or two-link minimal cuts found. The original graph may also be disconnected.";
  $("try-cut").disabled = !report.cuts.length;
  document.querySelectorAll("[data-failure]").forEach(
    (el) =>
      (el.onclick = () => {
        const time = Number(el.dataset.failure);
        scenario.links.forEach((e) => {
          if (e.down_at >= 0) e.down_at = time;
        });
        $("failure-time").value = time;
        custom();
        recompute();
      }),
  );
}
function renderTimeline() {
  const duration = Math.max(report.duration, 1);
  $("timeline").innerHTML =
    report.packets
      .map((p) => {
        const segments = report.trace.filter(
          (e) => e.packet === p.id && (e.kind === 1 || e.kind === 2),
        );
        return `<button class="packet-row ${p.id === selected ? "selected" : ""}" data-packet="${p.id}" aria-label="${packetName(p.id)}, ${statusText[p.status]}, inspect events"><span>${packetName(p.id)}</span><div class="packet-track">${segments.map((e) => `<i class="packet-segment ${e.kind === 1 ? "wait" : ""}" style="left:${(e.time / duration) * 100}%;width:${Math.max(0.2, ((e.end - e.time) / duration) * 100)}%"></i>`).join("")}<b class="packet-end ${p.status === 1 ? "" : "lost"}" style="left:${(p.ended / duration) * 100}%">${p.status === 1 ? "·" : "×"}</b><i class="packet-now"></i></div><small>${p.ended - p.sent} ms</small></button>`;
      })
      .join("") +
    `<div class="axis"><span>0 ms</span><span>${Math.round(report.duration / 2)} ms</span><span>${report.duration} ms</span></div>`;
  document.querySelectorAll("[data-packet]").forEach(
    (el) =>
      (el.onclick = () => {
        selected = Number(el.dataset.packet);
        renderTimeline();
        renderInspector();
        renderClock();
      }),
  );
}
function renderInspector() {
  const p = report.packets[selected],
    events = report.trace.filter((e) => e.packet === selected);
  $("selected-id").textContent = packetName(p.id);
  $("selected-status").textContent = statusText[p.status];
  $("selected-status").classList.toggle("good", p.status === 1);
  $("packet-summary").textContent =
    p.status === 1
      ? `Delivered in ${p.ended - p.sent} ms, across ${p.hops} links. ${p.queued ? `${p.queued} ms spent waiting for a transmitter.` : "No time lost in a queue."}`
      : `Stopped ${p.ended - p.sent} ms after injection. ${statusText[p.status]} ended this packet’s journey at ${p.ended} ms.`;
  const path = [
    scenario.params.source,
    ...events.filter((e) => e.kind === 3).map((e) => e.node),
  ];
  $("packet-path").textContent =
    path.map((id) => String.fromCharCode(65 + id)).join(" → ") +
    (p.status === 1 ? "  ✓" : "  ×");
  const displayed = events
    .filter((e) => e.kind !== 3)
    .sort((a, b) => a.time - b.time || a.kind - b.kind);
  $("event-list").innerHTML = displayed
    .map((e) => {
      let title = "",
        detail = "";
      if (e.kind === 0) {
        title = `Injected at ${nodeName(e.node)}`;
        detail = "Entered the experiment.";
      }
      if (e.kind === 1) {
        title = `Queued for ${e.end - e.time} ms`;
        detail = `${nodeName(e.node)} transmitter was occupied. Wait ends at ${e.end} ms.`;
      }
      if (e.kind === 2) {
        title = `${nodeName(e.node)} → ${nodeName(e.next)}`;
        const l = scenario.links[e.link];
        detail =
          e.reason === 4
            ? `Link failed at ${e.end} ms before delivery.`
            : `${l.service} ms serialization + ${l.propagation} ms propagation. Arrives ${e.end} ms.`;
      }
      if (e.kind === 4) {
        title = "Delivered";
        detail = `Reached ${nodeName(e.node)} at ${e.time} ms.`;
      }
      if (e.kind === 5) {
        title = statusText[e.reason];
        detail =
          e.reason === 2
            ? "No path exists through currently active links."
            : e.reason === 3
              ? `Queue occupancy reached the ${scenario.links[e.link].capacity}-packet limit.`
              : e.reason === 4
                ? "Fail-stop policy discards waiting and in-flight packets."
                : "The configured hop budget was exhausted.";
      }
      return `<div class="event ${e.kind === 5 ? "danger" : ""}"><time>${e.time} ms</time><div><b>${esc(title)}</b><p>${esc(detail)}</p></div></div>`;
    })
    .join("");
  const before = baseline.packets[selected];
  const insight =
    p.status === 1
      ? before.status === 1
        ? p.ended === before.ended
          ? "This packet is unaffected by the scheduled failures. It arrives at the same time as the healthy-network run."
          : `The healthy-network run arrives at ${before.ended} ms. This run arrives ${Math.abs(p.ended - before.ended)} ms ${p.ended > before.ended ? "later" : "earlier"} with ${p.hops} traversed links.`
        : "This packet arrives here despite failing in the healthy-network comparison. Changed routes can also change queue pressure."
      : before.status === 1
        ? `With these failures removed, this exact packet arrives at ${before.ended} ms. The experiment isolates the effect of the scheduled link failures.`
        : `This packet also fails in the healthy-network run (${statusText[before.status].toLowerCase()}). Removing failed links alone does not solve this load pattern.`;
  $("insight").textContent = insight;
}
function renderClock() {
  $("clock-chip").innerHTML =
    `${String(Math.floor(clock)).padStart(3, "0")} <small>ms</small>`;
  $("scrub").value = clock;
  $("play").textContent = playing ? "Ⅱ" : "▶";
  $("play").setAttribute(
    "aria-label",
    playing ? "Pause simulation" : "Play simulation",
  );
  for (let i = 0; i < scenario.links.length; i++) {
    const e = scenario.links[i];
    $(`edge-${i}`).classList.toggle(
      "scheduled",
      e.down_at >= 0 && clock < e.down_at,
    );
    $(`edge-${i}`).classList.toggle(
      "failed",
      e.down_at >= 0 && clock >= e.down_at,
    );
  }
  const circles = [];
  for (const p of report.packets) {
    if (clock < p.sent || clock >= p.ended) continue;
    const events = report.trace.filter((e) => e.packet === p.id);
    const active = events.find(
      (e) => (e.kind === 1 || e.kind === 2) && clock >= e.time && clock < e.end,
    );
    if (!active) continue;
    const a = scenario.nodes[active.node],
      b = scenario.nodes[active.next],
      link = scenario.links[active.link];
    const fraction =
      active.kind === 1
        ? 0
        : Math.min(
            1,
            (clock - active.time) / (link.service + link.propagation),
          );
    const x = a.x + (b.x - a.x) * fraction,
      y = a.y + (b.y - a.y) * fraction;
    const color = active.kind === 1 ? "#edbd70" : "#a1ceff";
    circles.push(
      `<circle cx="${x}" cy="${y}" r="${p.id === selected ? 8 : 5}" fill="${color}" stroke="#0a101b" stroke-width="2"/><text x="${x}" y="${y - 12}" fill="${color}" font-size="8" text-anchor="middle">${packetName(p.id)}</text>`,
    );
  }
  $("packets").innerHTML = circles.join("");
  document
    .querySelectorAll(".packet-now")
    .forEach(
      (el) =>
        (el.style.left = `${(clock / Math.max(report.duration, 1)) * 100}%`),
    );
}
function frame(timestamp) {
  if (playing && report) {
    clock = Math.min(
      report.duration,
      clock + ((timestamp - lastFrame) / 1000) * Number($("speed").value),
    );
    if (clock >= report.duration) playing = false;
    renderClock();
  }
  lastFrame = timestamp;
  requestAnimationFrame(frame);
}
function custom() {
  preset = "custom";
  document
    .querySelectorAll("[data-preset]")
    .forEach((el) => el.classList.remove("active"));
  $("experiment-title").textContent = "Your own stress test.";
  $("experiment-copy").textContent =
    "One changed condition. An exact, inspectable consequence.";
  message("");
}
function setPreset(name) {
  preset = name;
  scenario = initial();
  selected = 2;
  const p = scenario.params;
  if (name === "healthy") scenario.links.forEach((e) => (e.down_at = -1));
  if (name === "burst") {
    scenario.links.forEach((e) => {
      e.down_at = -1;
      e.capacity = 3;
    });
    p.interval = 0;
    selected = 3;
  }
  if (name === "partition") {
    scenario.links.forEach((e) => (e.down_at = e.to === 5 ? 40 : -1));
    selected = 0;
  }
  $("interval").value = p.interval;
  $("capacity").value = scenario.links[0].capacity;
  $("packet-count").value = p.count;
  $("failure-time").value = name === "partition" ? 40 : 52;
  document
    .querySelectorAll("[data-preset]")
    .forEach((el) => el.classList.toggle("active", el.dataset.preset === name));
  const titles = {
    failure: [
      "A bridge goes dark.",
      "Some packets are already on their way. The rest must find another route.",
    ],
    burst: [
      "Too much, too soon.",
      "The topology is healthy. The queues still have a breaking point.",
    ],
    partition: [
      "The destination becomes an island.",
      "Two failed links remove every route. Timing decides what gets through.",
    ],
    healthy: [
      "Before anything goes wrong.",
      "Establish a reference. Then change one condition and compare.",
    ],
  };
  $("experiment-title").textContent = titles[name][0];
  $("experiment-copy").textContent = titles[name][1];
  message("");
  recompute();
}

$("try-cut").onclick = () => {
  const cut = report.cuts[0];
  if (!cut) return;
  scenario.links.forEach((e, i) => (e.down_at = cut.includes(i) ? 0 : -1));
  $("failure-time").value = 0;
  custom();
  recompute();
  message(
    `Applied an engine-verified minimal cut: ${cut.map((i) => linkName(scenario.links[i])).join(" + ")}. Removing any proper subset preserves connectivity.`,
  );
};
$("play").onclick = () => {
  if (!report) return;
  if (clock >= report.duration) clock = 0;
  playing = !playing;
  renderClock();
};
$("restart").onclick = () => {
  clock = 0;
  playing = false;
  renderClock();
};
$("scrub").oninput = () => {
  clock = Number($("scrub").value);
  playing = false;
  renderClock();
};
$("follow").onclick = () => {
  clock = report.packets[selected].ended;
  playing = false;
  renderClock();
};
$("help").onclick = () =>
  $("method").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
$("interval").oninput = () => {
  scenario.params.interval = Number($("interval").value);
  custom();
  recompute();
};
$("capacity").oninput = () => {
  scenario.links.forEach((e) => (e.capacity = Number($("capacity").value)));
  custom();
  recompute();
};
$("failure-time").oninput = () => {
  scenario.links.forEach((e) => {
    if (e.down_at >= 0) e.down_at = Number($("failure-time").value);
  });
  custom();
  recompute();
};
$("packet-count").onchange = () => {
  const n = Number($("packet-count").value);
  if (!Number.isInteger(n) || n < 1 || n > 48) {
    $("packet-count").value = scenario.params.count;
    message("Choose a whole number of packets from 1 to 48.", true);
    return;
  }
  scenario.params.count = n;
  custom();
  recompute();
};
document
  .querySelectorAll("[data-preset]")
  .forEach((el) => (el.onclick = () => setPreset(el.dataset.preset)));
$("export").onclick = () => {
  if (!report) return;
  const payload = {
    format: "faultline/experiment/v1",
    engine: "MoonBit deterministic FIFO fail-stop model v1",
    scenario,
    report,
    baseline,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "faultline-experiment.json";
  a.click();
  URL.revokeObjectURL(url);
  message(
    "Exported the scenario, complete event trace and healthy-network comparison.",
  );
};
$("import").onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1_000_000) throw Error("Import limit is 1 MB.");
    const raw = JSON.parse(await file.text()),
      candidate = validateScenario(raw);
    evaluate(candidate);
    scenario = candidate;
    selected = 0;
    $("interval").value = scenario.params.interval;
    $("capacity").value = Math.min(12, scenario.links[0]?.capacity ?? 4);
    $("packet-count").value = scenario.params.count;
    $("failure-time").value = Math.min(
      150,
      Math.max(0, scenario.links.find((e) => e.down_at >= 0)?.down_at ?? 52),
    );
    custom();
    recompute();
    message(
      "Imported and recomputed in MoonBit. Stored results were not trusted. Imported capacities and failure times remain exact until their controls are changed.",
    );
  } catch (error) {
    message(`Import rejected. ${error.message}`, true);
  } finally {
    event.target.value = "";
  }
};
try {
  const response = await fetch("assets/faultline.wasm");
  if (!response.ok) throw Error(`Engine download failed (${response.status}).`);
  const { instance } = await WebAssembly.instantiate(
    await response.arrayBuffer(),
    {},
  );
  wasm = instance.exports;
  $("engine-status").innerHTML = "<i></i> MoonBit → WASM · ready";
  setPreset("failure");
  clock = 45;
  renderClock();
  requestAnimationFrame(frame);
} catch (error) {
  $("engine-status").textContent = "Engine unavailable";
  message(
    `${error.message} Serve this directory over HTTP. No JavaScript fallback is used.`,
    true,
  );
  document
    .querySelectorAll("button,input,select")
    .forEach((el) => (el.disabled = true));
}
