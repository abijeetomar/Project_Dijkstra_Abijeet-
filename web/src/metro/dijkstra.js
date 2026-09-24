/*
 * Dijkstra over (station, line) states, one heap pop at a time so the search
 * can be watched. Same result as the PriorityQueue loop in MetroSimulation.java.
 */
import { LINES_AT, STATE_COUNT, sid, stationOf, lineOf } from "./network.js";

export const INF = Infinity;

export function createRun(adj, src, dst) {
  const run = {
    adj, src, dst,
    dist: new Float64Array(STATE_COUNT).fill(INF),
    parent: new Int32Array(STATE_COUNT).fill(-1),
    parentEdge: new Int32Array(STATE_COUNT).fill(-1),
    done: new Uint8Array(STATE_COUNT),
    inQueue: new Set(),
    heap: [],
    pops: 0, relaxations: 0, improvements: 0, stale: 0,
    finished: false, goal: -1, current: -1,
    touched: new Set(), tree: new Set(), seen: new Set(),
    flash: new Set(), trace: [],
  };
  for (const line of LINES_AT[src]) {
    const s = sid(src, line);
    run.dist[s] = 0;
    run.inQueue.add(s);
    run.touched.add(s);
    heapPush(run.heap, [0, s]);
  }
  return run;
}

function heapPush(h, item) {
  h.push(item);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p][0] <= h[i][0]) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
}

function heapPop(h) {
  if (!h.length) return null;
  const top = h[0];
  const last = h.pop();
  if (h.length) {
    h[0] = last;
    for (let i = 0; ; ) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < h.length && h[l][0] < h[m][0]) m = l;
      if (r < h.length && h[r][0] < h[m][0]) m = r;
      if (m === i) break;
      [h[m], h[i]] = [h[i], h[m]];
      i = m;
    }
  }
  return top;
}

/** One pop and the relaxations it causes. Mutates and returns the event. */
export function step(run) {
  if (run.finished) return null;
  run.flash = new Set();

  for (;;) {
    const top = heapPop(run.heap);
    if (!top) {
      run.finished = true;
      run.current = -1;
      return { kind: "exhausted" };
    }
    const [d, u] = top;
    if (d > run.dist[u] + 1e-9 || run.done[u]) { run.stale++; continue; }

    run.done[u] = 1;
    run.inQueue.delete(u);
    run.pops++;
    run.current = u;

    if (stationOf(u) === run.dst) {
      run.finished = true;
      run.goal = u;
      return { kind: "goal", u, d };
    }

    const event = { kind: "pop", u, d, relaxed: [] };
    for (const arc of run.adj[u]) {
      run.relaxations++;
      run.seen.add(arc.e);
      const nd = d + arc.w;
      const better = nd < run.dist[arc.to] - 1e-9;
      if (better) {
        if (run.parentEdge[arc.to] >= 0) run.tree.delete(run.parentEdge[arc.to]);
        run.dist[arc.to] = nd;
        run.parent[arc.to] = u;
        run.parentEdge[arc.to] = arc.e;
        run.tree.add(arc.e);
        run.inQueue.add(arc.to);
        run.touched.add(arc.to);
        run.improvements++;
        run.flash.add(arc.e);
        heapPush(run.heap, [nd, arc.to]);
      }
      event.relaxed.push({ edge: arc.e, to: arc.to, nd, better });
    }
    return event;
  }
}

export function solve(run, { trace = true } = {}) {
  let guard = 0;
  while (!run.finished && guard++ < 20000) {
    const event = step(run);
    if (trace && event) run.trace.push(event);
  }
  return run;
}

export function bestState(run, station) {
  let best = -1;
  for (const line of LINES_AT[station]) {
    const s = sid(station, line);
    if (run.dist[s] < INF && (best < 0 || run.dist[s] < run.dist[best])) best = s;
  }
  return best;
}

/** The winning chain of states, source first. */
export function pathOf(run) {
  if (run.goal < 0) return [];
  const out = [];
  for (let c = run.goal; c !== -1; c = run.parent[c]) out.unshift(c);
  return out;
}

/** Legs, hops, changes and total minutes for a state path. */
export function summarize(path, weightOf) {
  let hops = 0, minutes = 0, changes = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i], b = path[i + 1];
    const interchange = stationOf(a) === stationOf(b);
    minutes += weightOf(a, b);
    if (interchange) changes++; else hops++;
  }
  const legs = [];
  let start = 0;
  for (let i = 1; i < path.length; i++) {
    if (lineOf(path[i]) !== lineOf(path[i - 1])) {
      legs.push({ line: lineOf(path[start]), from: start, to: i - 1 });
      start = i;
    }
  }
  legs.push({ line: lineOf(path[start]), from: start, to: path.length - 1 });
  return { hops, minutes, changes, legs };
}
