import { stationOf, lineOf } from "./network.js";
import { TRACK_BY_KEY } from "./graph.js";
import { toPath, pathLength } from "./geometry.js";

/** The winning path as one drawable polyline per line, in travel order. */
export function routeGeometry(path) {
  const legs = [];
  let current = null;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i], b = path[i + 1];
    if (stationOf(a) === stationOf(b)) { current = null; continue; } // interchange
    const line = lineOf(a);
    const edge = TRACK_BY_KEY.get(`${line}:${stationOf(a)}:${stationOf(b)}`);
    if (!edge) continue;
    const pts = edge.a === stationOf(a) ? edge.pts : [...edge.pts].reverse();
    if (!current || current.line !== line) {
      current = { line, pts: [...pts] };
      legs.push(current);
    } else {
      for (const p of pts) {
        const last = current.pts[current.pts.length - 1];
        if (!last || last[0] !== p[0] || last[1] !== p[1]) current.pts.push(p);
      }
    }
  }
  return legs.map((l) => ({ line: l.line, d: toPath(l.pts), len: pathLength(l.pts) }));
}

/** Stations where the plan changes trains. */
export function changeStations(path) {
  const out = [];
  for (let i = 0; i + 1 < path.length; i++)
    if (stationOf(path[i]) === stationOf(path[i + 1])) out.push(stationOf(path[i]));
  return out;
}
