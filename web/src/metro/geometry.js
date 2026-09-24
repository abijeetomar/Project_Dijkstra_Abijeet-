/*
 * Schematic layout. Each corridor is a polyline through its interchanges and
 * termini; the stations in between are spread along it by arc length, so a
 * segment that turns a corner is drawn around the corner rather than across it.
 */
import { LINE, NAMES } from "./network.js";

export const VIEWBOX = { x: -30, y: 60, w: 1360, h: 720 };

const RUNS = [
  [ // Red: LB Nagar (SE) up to Miyapur (NW)
    { a: 0,  b: 7,  side: "up",   pts: [[1110, 730], [980, 730], [910, 660], [750, 660]] },
    { a: 7,  b: 16, side: "up",   pts: [[750, 660], [610, 660], [430, 480], [430, 410]] },
    { a: 16, b: 26, side: "left", pts: [[430, 410], [430, 250], [290, 110], [150, 110]] },
  ],
  [ // Green: Parade Ground straight down to MG Bus Station
    { a: 34, b: 7, side: "left", pts: [[750, 180], [750, 660]] },
  ],
  [ // Blue: Nagole (E) across to Raidurg (SW)
    { a: 35, b: 42, side: "up",   pts: [[1190, 260], [830, 260]] },
    { a: 42, b: 34, side: "up",   pts: [[830, 260], [750, 180]] },
    { a: 34, b: 16, side: "up",   pts: [[750, 180], [660, 180], [430, 410]] },
    { a: 16, b: 55, side: "left", pts: [[430, 410], [350, 490], [250, 490], [170, 570], [170, 660]] },
  ],
];

/* Labels that the automatic placement puts somewhere crowded. */
const LABEL_FIX = {
  16: { dx: -15, dy: -9,  anchor: "end"   },
  34: { dx: 13,  dy: -14, anchor: "start" },
  7:  { dx: 13,  dy: 21,  anchor: "start" },
  0:  { dx: 14,  dy: 4,   anchor: "start" },
  26: { dx: -4,  dy: -13, anchor: "end"   },
  35: { dx: 5,   dy: -14, anchor: "start" },
  55: { dx: 13,  dy: 5,   anchor: "start" },
  23: { dx: -11, dy: -8,  anchor: "end"   },
};

export const XCHG_CHIP = { 16: [466, 432], 34: [786, 156], 7: [750, 700] };

/* Which way a label leans, as a preference vector scored against the two
   normals of the track at that point. */
const PREF = { up: [0.2, -1], down: [0.2, 1], left: [-1, 0.2], right: [1, 0.2] };

function polyline(pts) {
  const seg = [];
  let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dy = pts[i + 1][1] - pts[i][1];
    const len = Math.hypot(dx, dy);
    seg.push({ p: pts[i], dx, dy, len, at: total });
    total += len;
  }
  return { seg, total };
}

function pointAt(poly, t) {
  const tc = Math.max(0, Math.min(poly.total, t));
  for (const s of poly.seg) {
    if (tc <= s.at + s.len + 1e-6) {
      const k = s.len ? (tc - s.at) / s.len : 0;
      return {
        x: s.p[0] + s.dx * k, y: s.p[1] + s.dy * k,
        tx: s.len ? s.dx / s.len : 1, ty: s.len ? s.dy / s.len : 0,
      };
    }
  }
  const s = poly.seg[poly.seg.length - 1];
  return { x: s.p[0] + s.dx, y: s.p[1] + s.dy, tx: s.dx / s.len, ty: s.dy / s.len };
}

/** The stretch of polyline between two arc-length marks, corners included. */
function slice(poly, t0, t1) {
  const a = pointAt(poly, t0), b = pointAt(poly, t1);
  const out = [[a.x, a.y]];
  for (const s of poly.seg) {
    const end = s.at + s.len;
    if (end > t0 + 0.5 && end < t1 - 0.5) out.push([s.p[0] + s.dx, s.p[1] + s.dy]);
  }
  out.push([b.x, b.y]);
  return out;
}

export const toPath = (pts) => "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L");
export const pathLength = (pts) => {
  let n = 0;
  for (let i = 0; i + 1 < pts.length; i++) n += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return n;
};

function labelFor(p, side, st) {
  const pref = PREF[side] || PREF.up;
  const cands = [[-p.ty, p.tx], [p.ty, -p.tx]];
  const score = (n) => n[0] * pref[0] + n[1] * pref[1];
  const nrm = score(cands[0]) >= score(cands[1]) ? cands[0] : cands[1];
  const horizontal = Math.abs(p.tx) > 0.72;

  let spec = horizontal
    ? (nrm[1] < 0
        ? { dx: 2, dy: -8, rot: -45, anchor: "start" }
        : { dx: -2, dy: 9, rot: -45, anchor: "end" })
    : { dx: nrm[0] * 11, dy: nrm[1] * 11 + 3.4, rot: 0, anchor: nrm[0] >= 0 ? "start" : "end" };

  spec = { ...spec, nx: nrm[0], ny: nrm[1] };
  if (LABEL_FIX[st]) spec = { ...spec, rot: 0, ...LABEL_FIX[st] };
  return spec;
}

/* ---- walk every corridor once: positions, labels and track segments ---- */
const positions = new Array(NAMES.length);
const labels = new Array(NAMES.length);
const segments = []; // { line, a, b, pts, d, len }

LINE.forEach((ln, li) => {
  RUNS[li].forEach((run) => {
    const poly = polyline(run.pts);
    const i0 = ln.order.indexOf(run.a);
    const i1 = ln.order.indexOf(run.b);
    const n = i1 - i0;
    const marks = Array.from({ length: n + 1 }, (_, k) => (poly.total * k) / n);

    for (let k = 0; k <= n; k++) {
      const st = ln.order[i0 + k];
      const p = pointAt(poly, marks[k]);
      if (!positions[st]) {
        positions[st] = { x: p.x, y: p.y };
        labels[st] = labelFor(p, run.side, st);
      }
      if (k < n) {
        const pts = slice(poly, marks[k], marks[k + 1]);
        segments.push({ line: li, a: st, b: ln.order[i0 + k + 1], pts, d: toPath(pts), len: pathLength(pts) });
      }
    }
  });
});

export const POSITIONS = positions;
export const LABELS = labels;
export const SEGMENTS = segments;
