/*
 * Edges are the editable part of the network, so they are kept separate from
 * the topology: EDGES holds what each edge *is*, and a plain weights array
 * (owned by React) holds what each edge currently *costs*.
 */
import { LINE, LINES_AT, NAMES, N, INTERCHANGES, HOP_DEF, XCHG_DEF, sid, STATE_COUNT } from "./network.js";
import { SEGMENTS } from "./geometry.js";

export const TRACK = "track";
export const CHANGE = "change";

const edges = [];

SEGMENTS.forEach((s) => {
  edges.push({
    id: edges.length, kind: TRACK, line: s.line, a: s.a, b: s.b,
    d: s.d, pts: s.pts, len: s.len, def: HOP_DEF,
  });
});

INTERCHANGES.forEach((st) => {
  const [l1, l2] = LINES_AT[st];
  edges.push({ id: edges.length, kind: CHANGE, st, l1, l2, line: -1, def: XCHG_DEF });
});

export const EDGES = edges;

/** "line:a:b" -> edge, both directions. */
export const TRACK_BY_KEY = new Map();
EDGES.filter((e) => e.kind === TRACK).forEach((e) => {
  TRACK_BY_KEY.set(`${e.line}:${e.a}:${e.b}`, e);
  TRACK_BY_KEY.set(`${e.line}:${e.b}:${e.a}`, e);
});
export const CHANGE_BY_STATION = new Map(
  EDGES.filter((e) => e.kind === CHANGE).map((e) => [e.st, e])
);

export const LINE_TRACKS = LINE.map((_, li) => EDGES.filter((e) => e.kind === TRACK && e.line === li));
export const ALL_TRACKS = EDGES.filter((e) => e.kind === TRACK);

export const edgeLabel = (e) =>
  e.kind === TRACK ? `${NAMES[e.a]} → ${NAMES[e.b]}` : `Change at ${NAMES[e.st]}`;

/** Every segment touching a station: its track neighbours, plus its interchange. */
export function neighborsOf(station) {
  const out = [];
  for (const e of EDGES) {
    if (e.kind !== TRACK) continue;
    if (e.a === station) out.push({ id: e.id, line: e.line, label: NAMES[e.b] });
    else if (e.b === station) out.push({ id: e.id, line: e.line, label: NAMES[e.a] });
  }
  const c = CHANGE_BY_STATION.get(station);
  if (c) out.push({ id: c.id, line: -1, label: `change ${LINE[c.l1].short} ⇄ ${LINE[c.l2].short}` });
  return out;
}

export const initialWeights = () => EDGES.map((e) => ({ w: e.def, def: e.def, shut: false }));

/** Adjacency over (station, line) states, skipping closed segments. */
export function buildAdjacency(weights) {
  const adj = Array.from({ length: STATE_COUNT }, () => []);
  for (const e of EDGES) {
    const { w, shut } = weights[e.id];
    if (shut) continue;
    const [u, v] =
      e.kind === TRACK
        ? [sid(e.a, e.line), sid(e.b, e.line)]
        : [sid(e.st, e.l1), sid(e.st, e.l2)];
    adj[u].push({ to: v, w, e: e.id });
    adj[v].push({ to: u, w, e: e.id });
  }
  return adj;
}

/*
 * The weight most of a corridor is running at. A segment away from it is a real
 * edit worth badging; retiming the whole corridor is not 26 separate edits.
 */
export function lineBase(weights, li) {
  const open = LINE_TRACKS[li].filter((e) => !weights[e.id].shut);
  if (!open.length) return weights[LINE_TRACKS[li][0].id].def;
  const def = weights[open[0].id].def;
  const tally = new Map();
  for (const e of open) tally.set(weights[e.id].w, (tally.get(weights[e.id].w) || 0) + 1);
  let best = def, bestCount = -1;
  for (const [w, c] of tally) if (c > bestCount || (c === bestCount && w === def)) { best = w; bestCount = c; }
  return best;
}

export { N, NAMES };
