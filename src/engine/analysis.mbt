///|
/// A point on the counterfactual failure-time curve.
/// Every currently scheduled failure is moved to `time`, preserving all other input.
pub(all) struct SweepPoint {
  time : Int
  delivered : Int
  lost : Int
  p95_latency : Int
  total_queue_time : Int
}

///|
/// A bounded parameter sweep, rather than an interpolated or fitted prediction.
/// Returns an empty array if there are no scheduled failures.
pub fn failure_sweep(
  nodes : Int,
  links : Array[Link],
  count : Int,
  source : Int,
  target : Int,
  interval : Int,
  hop_limit : Int,
  horizon : Int,
  steps : Int,
) -> Array[SweepPoint]? {
  if horizon < 0 || horizon > 1000000 || steps < 2 || steps > 65 {
    return None
  }
  if simulate(nodes, links, count, source, target, interval, hop_limit) is None {
    return None
  }
  if !links.any(fn(link) { link.down_at >= 0 }) {
    return Some([])
  }
  let points : Array[SweepPoint] = []
  for step = 0; step < steps; step = step + 1 {
    let time = horizon * step / (steps - 1)
    let shifted = links.map(fn(link) {
      {
        from: link.from,
        to: link.to,
        propagation: link.propagation,
        service: link.service,
        capacity: link.capacity,
        down_at: if link.down_at >= 0 {
          time
        } else {
          -1
        },
      }
    })
    match simulate(nodes, shifted, count, source, target, interval, hop_limit) {
      None => return None
      Some(report) => {
        let mut total_queue_time = 0
        for packet in report.packets {
          total_queue_time = total_queue_time + packet.queued
        }
        points.push({
          time,
          delivered: report.delivered,
          lost: report.lost,
          p95_latency: report.p95_latency,
          total_queue_time,
        })
      }
    }
  }
  Some(points)
}

///|
/// A minimal failure set of size one or two, independent of packet load.
/// A pair is reported only if neither member disconnects the endpoints alone.
pub(all) struct Cut {
  first : Int
  second : Int
}

///|
/// Breadth-first reachability after hypothetically removing two edge IDs.
/// Failure timestamps are intentionally ignored: this measures the original graph.
pub fn connected_without(
  nodes : Int,
  links : Array[Link],
  source : Int,
  target : Int,
  removed_a : Int,
  removed_b : Int,
) -> Bool {
  if !valid_network(nodes, links) ||
    source < 0 ||
    source >= nodes ||
    target < 0 ||
    target >= nodes {
    return false
  }
  if source == target {
    return true
  }
  let seen = Array::make(nodes, false)
  let queue : Array[Int] = [source]
  seen[source] = true
  let mut head = 0
  while head < queue.length() {
    let node = queue[head]
    head = head + 1
    for index = 0; index < links.length(); index = index + 1 {
      if index == removed_a || index == removed_b {
        continue
      }
      let edge = links[index]
      let other = if edge.from == node {
        edge.to
      } else if edge.to == node {
        edge.from
      } else {
        -1
      }
      if other < 0 || seen[other] {
        continue
      }
      if other == target {
        return true
      }
      seen[other] = true
      queue.push(other)
    }
  }
  false
}

///|
/// Enumerate all inclusion-minimal one- and two-link cuts, for a bounded graph.
/// None is invalid input; [] can mean robust to two removals OR already disconnected.
/// Call connected_without(..., -1, -1) to distinguish those cases.
pub fn minimal_cuts(
  nodes : Int,
  links : Array[Link],
  source : Int,
  target : Int,
) -> Array[Cut]? {
  if !valid_network(nodes, links) ||
    source < 0 ||
    source >= nodes ||
    target < 0 ||
    target >= nodes {
    return None
  }
  let cuts : Array[Cut] = []
  if source == target ||
    !connected_without(nodes, links, source, target, -1, -1) {
    return Some(cuts)
  }
  let single = Array::make(links.length(), false)
  for i = 0; i < links.length(); i = i + 1 {
    if !connected_without(nodes, links, source, target, i, -1) {
      single[i] = true
      cuts.push({ first: i, second: -1, })
    }
  }
  for i = 0; i < links.length(); i = i + 1 {
    if single[i] {
      continue
    }
    for j = i + 1; j < links.length(); j = j + 1 {
      if single[j] {
        continue
      }
      if !connected_without(nodes, links, source, target, i, j) {
        cuts.push({ first: i, second: j, })
      }
    }
  }
  Some(cuts)
}
