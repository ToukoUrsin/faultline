// Numeric WASM ABI: no JavaScript implementation of the simulation exists.

///|
let nodes : Array[Int] = [6]

///|
let links : Array[@engine.Link] = []

///|
let reports : Array[@engine.Report] = []

///|
pub fn reset(count : Int) -> Int {
  if count < 2 || count > 24 {
    return -1
  }
  nodes[0] = count
  links.clear()
  reports.clear()
  sweep_points.clear()
  cut_sets.clear()
  1
}

///|
pub fn add_link(
  a : Int,
  b : Int,
  latency : Int,
  service : Int,
  capacity : Int,
  down : Int,
) -> Int {
  let edge : @engine.Link = {
    from: a,
    to: b,
    propagation: latency,
    service,
    capacity,
    down_at: down,
  }
  let candidate = links.copy()
  candidate.push(edge)
  if !@engine.valid_network(nodes[0], candidate) {
    return -1
  }
  links.push(edge)
  reports.clear()
  sweep_points.clear()
  cut_sets.clear()
  links.length() - 1
}

///|
pub fn run(
  count : Int,
  source : Int,
  target : Int,
  interval : Int,
  ttl : Int,
) -> Int {
  reports.clear()
  sweep_points.clear()
  cut_sets.clear()
  match
    @engine.simulate(nodes[0], links, count, source, target, interval, ttl) {
    Some(report) => {
      reports.push(report)
      1
    }
    None => -1
  }
}

///|
pub fn packet_count() -> Int {
  if reports.is_empty() {
    0
  } else {
    reports[0].packets.length()
  }
}

///|
pub fn event_count() -> Int {
  if reports.is_empty() {
    0
  } else {
    reports[0].trace.length()
  }
}

///|
pub fn delivered_count() -> Int {
  if reports.is_empty() {
    0
  } else {
    reports[0].delivered
  }
}

///|
pub fn lost_count() -> Int {
  if reports.is_empty() {
    0
  } else {
    reports[0].lost
  }
}

///|
pub fn max_time() -> Int {
  if reports.is_empty() {
    0
  } else {
    reports[0].duration
  }
}

///|
pub fn packet_value(index : Int, field : Int) -> Int {
  if index < 0 || index >= packet_count() {
    return -1
  }
  let p = reports[0].packets[index]
  match field {
    0 => p.id
    1 => p.sent
    2 => p.ended
    3 => p.status
    4 => p.hops
    5 => p.queued
    _ => -1
  }
}

///|
pub fn event_value(index : Int, field : Int) -> Int {
  if index < 0 || index >= event_count() {
    return -1
  }
  let e = reports[0].trace[index]
  match field {
    0 => e.packet
    1 => e.kind
    2 => e.node
    3 => e.next
    4 => e.link
    5 => e.time
    6 => e.end
    7 => e.reason
    _ => -1
  }
}

///|
pub fn statistic(field : Int) -> Int {
  if reports.is_empty() {
    return -1
  }
  let r = reports[0]
  match field {
    0 => r.mean_latency
    1 => r.p95_latency
    2 => r.peak_queue
    _ => -1
  }
}

///|
let sweep_points : Array[@engine.SweepPoint] = []

///|
let cut_sets : Array[@engine.Cut] = []

///|
pub fn analyze(
  count : Int,
  source : Int,
  target : Int,
  interval : Int,
  ttl : Int,
  horizon : Int,
  steps : Int,
) -> Int {
  sweep_points.clear()
  cut_sets.clear()
  match
    @engine.failure_sweep(
      nodes[0],
      links,
      count,
      source,
      target,
      interval,
      ttl,
      horizon,
      steps,
    ) {
    None => return -1
    Some(points) =>
      for point in points {
        sweep_points.push(point)
      }
  }
  match @engine.minimal_cuts(nodes[0], links, source, target) {
    None => return -1
    Some(cuts) =>
      for cut in cuts {
        cut_sets.push(cut)
      }
  }
  sweep_points.length()
}

///|
pub fn sweep_value(index : Int, field : Int) -> Int {
  if index < 0 || index >= sweep_points.length() {
    return -1
  }
  let p = sweep_points[index]
  match field {
    0 => p.time
    1 => p.delivered
    2 => p.lost
    3 => p.p95_latency
    4 => p.total_queue_time
    _ => -1
  }
}

///|
pub fn cut_count() -> Int {
  cut_sets.length()
}

///|
pub fn cut_value(index : Int, field : Int) -> Int {
  if index < 0 || index >= cut_sets.length() {
    return -1
  }
  let c = cut_sets[index]
  match field {
    0 => c.first
    1 => c.second
    _ => -1
  }
}
