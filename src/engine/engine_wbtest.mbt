///|
fn edge(
  a : Int,
  b : Int,
  propagation : Int,
  service : Int,
  capacity : Int,
  down : Int,
) -> Link {
  { from: a, to: b, propagation, service, capacity, down_at: down, }
}

///|
fn run_case(links : Array[Link], count : Int, interval : Int) -> Report {
  simulate(3, links, count, 0, 2, interval, 12).unwrap()
}

///|
test "shortest path recomputes after fail-stop and respects tie order" {
  let links = [
    edge(0, 1, 2, 1, 4, 10),
    edge(1, 2, 2, 1, 4, -1),
    edge(0, 2, 10, 1, 4, -1),
  ]
  assert_eq(next_link(3, links, 0, 2, 0), 0)
  assert_eq(next_link(3, links, 0, 2, 10), 2)
  assert_eq(next_link(3, links, 2, 0, 10), 2)
  assert_eq(next_link(3, links, 9, 0, 0), -1)
}

///|
test "FIFO serialization has exact queue and latency metrics" {
  let report = run_case([edge(0, 2, 5, 10, 4, -1)], 3, 0)
  assert_eq(report.delivered, 3)
  assert_eq(report.packets[0].ended, 15)
  assert_eq(report.packets[1].ended, 25)
  assert_eq(report.packets[2].ended, 35)
  assert_eq(report.packets[2].queued, 20)
  assert_eq(report.mean_latency, 25)
  assert_eq(report.p95_latency, 35)
  assert_eq(report.peak_queue, 3)
}

///|
test "capacity counts transmitting packet, not propagation" {
  let links = [edge(0, 2, 30, 5, 1, -1)]
  let burst = run_case(links, 3, 0)
  assert_eq(burst.delivered, 1)
  assert_eq(burst.lost, 2)
  assert_eq(burst.packets[1].status, 3)
  let spaced = run_case(links, 3, 5)
  assert_eq(spaced.delivered, 3)
  assert_eq(spaced.packets[2].ended, 45)
}

///|
test "failure at arrival wins and waiting packets do not teleport" {
  let report = run_case([edge(0, 2, 5, 10, 4, 15)], 4, 0)
  assert_eq(report.delivered, 0)
  assert_eq(report.packets[0].ended, 15)
  assert_eq(report.packets[0].status, 4)
  assert_eq(report.packets[2].queued, 15)
  assert_eq(report.packets[2].hops, 0)
  for event in report.trace {
    assert_true(event.end >= event.time)
  }
}

///|
test "a failure during a route produces later adaptive detours" {
  let links = [
    edge(0, 1, 2, 1, 8, -1),
    edge(1, 2, 2, 1, 8, 5),
    edge(0, 2, 10, 1, 8, -1),
  ]
  let report = run_case(links, 3, 10)
  assert_eq(report.packets[0].status, 4)
  assert_eq(report.packets[1].status, 1)
  assert_eq(report.packets[1].hops, 1)
  assert_eq(report.packets[1].ended, 21)
}

///|
test "disconnection is distinct from queue or link loss" {
  let report = run_case([edge(0, 1, 2, 1, 4, -1)], 2, 8)
  assert_eq(report.delivered, 0)
  assert_eq(report.packets[0].status, 2)
  assert_eq(report.packets[1].ended, 8)
}

///|
test "source equals destination is a zero-latency delivery" {
  let report = simulate(2, [], 2, 0, 0, 10, 1).unwrap()
  assert_eq(report.delivered, 2)
  assert_eq(report.mean_latency, 0)
  assert_eq(report.packets[0].hops, 0)
}

///|
test "hop limit terminates a route without inventing delivery" {
  let links = [edge(0, 1, 2, 1, 4, -1), edge(1, 2, 2, 1, 4, -1)]
  let report = simulate(3, links, 1, 0, 2, 0, 1).unwrap()
  assert_eq(report.packets[0].status, 5)
  assert_eq(report.packets[0].ended, 3)
}

///|
test "invalid bounds fail before allocating or indexing" {
  assert_true(simulate(0, [], 1, 0, 1, 0, 1).is_none())
  assert_true(simulate(3, [], 129, 0, 2, 0, 1).is_none())
  assert_true(simulate(3, [edge(0, 8, 1, 1, 1, -1)], 1, 0, 2, 0, 1).is_none())
  assert_true(simulate(3, [edge(0, 2, 1, 0, 1, -1)], 1, 0, 2, 0, 1).is_none())
  assert_true(simulate(3, [edge(0, 2, 1, 1, 0, -1)], 1, 0, 2, 0, 1).is_none())
  assert_true(simulate(3, [], 1, 0, 2, -1, 1).is_none())
}

///|
test "determinism and conservation across a parameter sweep" {
  for capacity = 1; capacity <= 5; capacity = capacity + 1 {
    for interval = 0; interval <= 8; interval = interval + 2 {
      let links = [
        edge(0, 1, 4, 3, capacity, -1),
        edge(1, 2, 3, 4, capacity, 28),
        edge(0, 2, 20, 6, capacity, -1),
      ]
      let a = run_case(links, 20, interval)
      let b = run_case(links, 20, interval)
      assert_eq(a.delivered + a.lost, 20)
      assert_eq(a.delivered, b.delivered)
      assert_eq(a.duration, b.duration)
      assert_eq(a.trace.length(), b.trace.length())
      for id = 0; id < 20; id = id + 1 {
        assert_eq(a.packets[id].status, b.packets[id].status)
        assert_eq(a.packets[id].ended, b.packets[id].ended)
        assert_true(a.packets[id].ended >= a.packets[id].sent)
        let terminal = a.trace.filter(fn(e) {
          e.packet == id && (e.kind == 4 || e.kind == 5)
        })
        assert_eq(terminal.length(), 1)
      }
      for e in a.trace {
        assert_true(e.end >= e.time)
      }
    }
  }
}
