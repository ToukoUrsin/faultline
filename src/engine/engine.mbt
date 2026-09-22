///|
/// A bidirectional link. Each direction owns an independent FIFO transmitter.
/// Capacity counts both the packet in service and packets waiting for service.
pub(all) struct Link {
  from : Int
  to : Int
  propagation : Int
  service : Int
  capacity : Int
  down_at : Int
}

///|
/// Status: 1 delivered, 2 disconnected, 3 queue full, 4 link failed, 5 hop limit.
pub(all) struct Packet {
  id : Int
  sent : Int
  mut ended : Int
  mut status : Int
  mut hops : Int
  mut queued : Int
}

///|
/// Kind: 0 inject, 1 queue wait, 2 transit, 3 arrive, 4 delivered, 5 dropped.
pub(all) struct Trace {
  packet : Int
  kind : Int
  node : Int
  next : Int
  link : Int
  time : Int
  end : Int
  reason : Int
}

///|
pub(all) struct Report {
  packets : Array[Packet]
  trace : Array[Trace]
  delivered : Int
  lost : Int
  duration : Int
  mean_latency : Int
  p95_latency : Int
  peak_queue : Int
}

///|
priv struct Pending {
  packet : Int
  node : Int
  time : Int
  link : Int
}

///|
/// Return the index of the first edge on a shortest currently available route.
/// Cost is propagation + serialization, independent of current queue lengths.
/// Equal-cost choices are deterministic by node and insertion order.
pub fn next_link(
  nodes : Int,
  links : Array[Link],
  source : Int,
  target : Int,
  now : Int,
) -> Int {
  if !valid_network(nodes, links) ||
    source < 0 ||
    source >= nodes ||
    target < 0 ||
    target >= nodes ||
    now < 0 ||
    source == target {
    return -1
  }
  let distance = Array::make(nodes, 100000000)
  let first = Array::make(nodes, -1)
  let visited = Array::make(nodes, false)
  distance[source] = 0
  for iteration = 0; iteration < nodes; iteration = iteration + 1 {
    let mut chosen = -1
    for node = 0; node < nodes; node = node + 1 {
      if !visited[node] && (chosen < 0 || distance[node] < distance[chosen]) {
        chosen = node
      }
    }
    if chosen < 0 || distance[chosen] == 100000000 {
      break
    }
    if chosen == target {
      return first[target]
    }
    visited[chosen] = true
    for index = 0; index < links.length(); index = index + 1 {
      let edge = links[index]
      if edge.down_at >= 0 && now >= edge.down_at {
        continue
      }
      let other = if edge.from == chosen {
        edge.to
      } else if edge.to == chosen {
        edge.from
      } else {
        -1
      }
      if other < 0 || visited[other] {
        continue
      }
      let cost = distance[chosen] + edge.propagation + edge.service
      if cost < distance[other] {
        distance[other] = cost
        first[other] = if chosen == source { index } else { first[chosen] }
      }
    }
  }
  -1
}

///|
/// Validate before allocating or indexing. All times are integer milliseconds.
pub fn valid_network(nodes : Int, links : Array[Link]) -> Bool {
  if nodes < 2 || nodes > 24 || links.length() > 64 {
    return false
  }
  for edge in links {
    if edge.from < 0 ||
      edge.to < 0 ||
      edge.from >= nodes ||
      edge.to >= nodes ||
      edge.from == edge.to {
      return false
    }
    if edge.propagation < 1 ||
      edge.propagation > 10000 ||
      edge.service < 1 ||
      edge.service > 10000 {
      return false
    }
    if edge.capacity < 1 ||
      edge.capacity > 128 ||
      edge.down_at < -1 ||
      edge.down_at > 1000000 {
      return false
    }
  }
  true
}

///|
/// A stable event scheduler, finite FIFO queues, fail-stop links, and exact traces.
/// Returns None for invalid input. No network requests or wall-clock reads occur.
pub fn simulate(
  nodes : Int,
  links : Array[Link],
  count : Int,
  source : Int,
  target : Int,
  interval : Int,
  hop_limit : Int,
) -> Report? {
  if !valid_network(nodes, links) ||
    count < 1 ||
    count > 128 ||
    source < 0 ||
    source >= nodes ||
    target < 0 ||
    target >= nodes ||
    interval < 0 ||
    interval > 10000 ||
    hop_limit < 1 ||
    hop_limit > 96 {
    return None
  }
  let packets : Array[Packet] = []
  let pending : Array[Pending] = []
  let trace : Array[Trace] = []
  let next_free = Array::make(links.length() * 2, 0)
  let departures : Array[Array[Int]] = []
  for iteration = 0; iteration < links.length() * 2; iteration = iteration + 1 {
    departures.push([])
  }
  for id = 0; id < count; id = id + 1 {
    packets.push({
      id,
      sent: id * interval,
      ended: -1,
      status: 0,
      hops: 0,
      queued: 0,
    })
    pending.push({ packet: id, node: source, time: id * interval, link: -1, })
  }
  let mut peak_queue = 0
  while pending.length() > 0 {
    let mut best = 0
    for i = 1; i < pending.length(); i = i + 1 {
      if pending[i].time < pending[best].time ||
        (
          pending[i].time == pending[best].time &&
          pending[i].packet < pending[best].packet
        ) {
        best = i
      }
    }
    let event = pending[best]
    pending.remove(best) |> ignore
    let packet = packets[event.packet]
    trace.push({
      packet: packet.id,
      kind: if event.link < 0 {
        0
      } else {
        3
      },
      node: event.node,
      next: event.node,
      link: event.link,
      time: event.time,
      end: event.time,
      reason: 0,
    })
    if event.node == target {
      packet.status = 1
      packet.ended = event.time
      trace.push({
        packet: packet.id,
        kind: 4,
        node: target,
        next: target,
        link: -1,
        time: event.time,
        end: event.time,
        reason: 1,
      })
      continue
    }
    if packet.hops >= hop_limit {
      packet.status = 5
      packet.ended = event.time
      trace.push({
        packet: packet.id,
        kind: 5,
        node: event.node,
        next: event.node,
        link: -1,
        time: event.time,
        end: event.time,
        reason: 5,
      })
      continue
    }
    let index = next_link(nodes, links, event.node, target, event.time)
    if index < 0 {
      packet.status = 2
      packet.ended = event.time
      trace.push({
        packet: packet.id,
        kind: 5,
        node: event.node,
        next: event.node,
        link: -1,
        time: event.time,
        end: event.time,
        reason: 2,
      })
      continue
    }
    let edge = links[index]
    let forward = edge.from == event.node
    let other = if forward { edge.to } else { edge.from }
    let direction = index * 2 + (if forward { 0 } else { 1 })
    let busy = departures[direction].filter(fn(t) { t > event.time })
    departures[direction] = busy
    if busy.length() >= edge.capacity {
      packet.status = 3
      packet.ended = event.time
      trace.push({
        packet: packet.id,
        kind: 5,
        node: event.node,
        next: other,
        link: index,
        time: event.time,
        end: event.time,
        reason: 3,
      })
      continue
    }
    let start = if next_free[direction] > event.time {
      next_free[direction]
    } else {
      event.time
    }
    let serialized = start + edge.service
    let arrival = serialized + edge.propagation
    next_free[direction] = serialized
    busy.push(serialized)
    if busy.length() > peak_queue {
      peak_queue = busy.length()
    }
    let wait_end = if edge.down_at >= 0 && edge.down_at < start {
      edge.down_at
    } else {
      start
    }
    packet.queued = packet.queued + wait_end - event.time
    if wait_end > event.time {
      trace.push({
        packet: packet.id,
        kind: 1,
        node: event.node,
        next: other,
        link: index,
        time: event.time,
        end: wait_end,
        reason: 0,
      })
    }
    if edge.down_at < 0 || start < edge.down_at {
      packet.hops = packet.hops + 1
    }
    if edge.down_at >= 0 && edge.down_at <= arrival {
      packet.status = 4
      packet.ended = edge.down_at
      if start < edge.down_at {
        trace.push({
          packet: packet.id,
          kind: 2,
          node: event.node,
          next: other,
          link: index,
          time: start,
          end: edge.down_at,
          reason: 4,
        })
      }
      trace.push({
        packet: packet.id,
        kind: 5,
        node: event.node,
        next: other,
        link: index,
        time: edge.down_at,
        end: edge.down_at,
        reason: 4,
      })
    } else {
      trace.push({
        packet: packet.id,
        kind: 2,
        node: event.node,
        next: other,
        link: index,
        time: start,
        end: arrival,
        reason: 0,
      })
      pending.push({
        packet: packet.id,
        node: other,
        time: arrival,
        link: index,
      })
    }
  }
  let latencies : Array[Int] = []
  let mut duration = 0
  let mut total = 0
  for packet in packets {
    if packet.ended > duration {
      duration = packet.ended
    }
    if packet.status == 1 {
      let latency = packet.ended - packet.sent
      latencies.push(latency)
      total = total + latency
    }
  }
  latencies.sort()
  let delivered = latencies.length()
  Some({
    packets,
    trace,
    delivered,
    lost: count - delivered,
    duration,
    mean_latency: if delivered > 0 {
      total / delivered
    } else {
      0
    },
    p95_latency: if delivered > 0 {
      latencies[(delivered * 95 + 99) / 100 - 1]
    } else {
      0
    },
    peak_queue,
  })
}
