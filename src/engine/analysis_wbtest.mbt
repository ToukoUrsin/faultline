///|
test "sweep includes endpoints and reflects exact simulations" {
  let links = [edge(0, 2, 5, 10, 4, 15)]
  let points = failure_sweep(3, links, 3, 0, 2, 0, 12, 40, 5).unwrap()
  assert_eq(points.length(), 5)
  assert_eq(points[0].time, 0)
  assert_eq(points[0].delivered, 0)
  assert_eq(points[2].time, 20)
  assert_eq(points[2].delivered, 1)
  assert_eq(points[4].time, 40)
  assert_eq(points[4].delivered, 3)
  for point in points {
    assert_eq(point.delivered + point.lost, 3)
  }
  assert_eq(links[0].down_at, 15)
}

///|
test "sweep is bounded and no scheduled failures give no curve" {
  assert_true(failure_sweep(3, [], 3, 0, 2, 0, 12, 100, 1) is None)
  assert_true(failure_sweep(3, [], 3, 0, 2, 0, 12, 100, 66) is None)
  assert_true(failure_sweep(3, [], 3, 0, 2, 0, 12, -1, 12) is None)
  assert_eq(failure_sweep(3, [], 3, 0, 2, 0, 12, 100, 5).unwrap().length(), 0)
}

///|
test "path graph contains each single cut and no nonminimal pairs" {
  let links = [edge(0, 1, 1, 1, 4, -1), edge(1, 2, 1, 1, 4, -1)]
  let cuts = minimal_cuts(3, links, 0, 2).unwrap()
  assert_eq(cuts.length(), 2)
  assert_eq(cuts[0].first, 0)
  assert_eq(cuts[0].second, -1)
  assert_eq(cuts[1].first, 1)
  assert_eq(cuts[1].second, -1)
}

///|
test "triangle cuts are inclusion-minimal and respect parallel links" {
  let triangle = [
    edge(0, 1, 1, 1, 4, -1),
    edge(1, 2, 1, 1, 4, -1),
    edge(0, 2, 1, 1, 4, -1),
  ]
  let cuts = minimal_cuts(3, triangle, 0, 2).unwrap()
  assert_eq(cuts.length(), 2)
  for cut in cuts {
    assert_true(cut.second >= 0)
    assert_true(connected_without(3, triangle, 0, 2, cut.first, -1))
    assert_true(connected_without(3, triangle, 0, 2, cut.second, -1))
    assert_true(!connected_without(3, triangle, 0, 2, cut.first, cut.second))
  }
  let parallel = [edge(0, 2, 1, 1, 4, -1), edge(0, 2, 1, 1, 4, -1)]
  assert_eq(minimal_cuts(3, parallel, 0, 2).unwrap().length(), 1)
  assert_true(connected_without(3, parallel, 0, 2, 0, -1))
}

///|
test "disconnected graphs and identical endpoints have no minimal cuts" {
  assert_eq(minimal_cuts(3, [], 0, 2).unwrap().length(), 0)
  assert_true(!connected_without(3, [], 0, 2, -1, -1))
  assert_true(connected_without(3, [], 0, 0, -1, -1))
  assert_true(minimal_cuts(3, [], 0, 9) is None)
}
