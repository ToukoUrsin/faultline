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
