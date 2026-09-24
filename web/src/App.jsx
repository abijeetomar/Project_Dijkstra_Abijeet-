import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LINES_AT, NAMES, stationOf } from "./metro/network.js";
import {
  ALL_TRACKS, CHANGE, CHANGE_BY_STATION, EDGES, LINE_TRACKS, TRACK_BY_KEY,
  buildAdjacency, initialWeights,
} from "./metro/graph.js";
import { pathOf, summarize } from "./metro/dijkstra.js";
import { changeStations, routeGeometry } from "./metro/route.js";
import { SCENARIOS } from "./metro/scenarios.js";
import { useDijkstra } from "./hooks/useDijkstra.js";
import TopBar from "./components/TopBar.jsx";
import MapView from "./components/MapView.jsx";
import EdgeEditor from "./components/EdgeEditor.jsx";
import RailPanel from "./components/RailPanel.jsx";
import Footer from "./components/Footer.jsx";

const STATE_COUNT = LINES_AT.reduce((a, l) => a + l.length, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function App() {
  const [weights, setWeights] = useState(initialWeights);
  const [src, setSrc] = useState(0);
  const [dst, setDst] = useState(55);
  const [picked, setPicked] = useState(-1);
  const [editor, setEditor] = useState(null);
  const [showDist, setShowDist] = useState(true);
  const [tab, setTab] = useState("plan");

  /* Set before a weight change so the hook knows whether this is a scrub (no
     route animation, no trace) or a settled edit. */
  const scrubbingRef = useRef(false);

  const adjacency = useMemo(() => buildAdjacency(weights), [weights]);
  const dij = useDijkstra({ adj: adjacency, src, dst, scrubbingRef });
  const { run, version, drawKey } = dij;

  const weightBetween = useCallback(
    (a, b) => {
      if (stationOf(a) === stationOf(b)) return weights[CHANGE_BY_STATION.get(stationOf(a)).id].w;
      const e = TRACK_BY_KEY.get(`${a % 3}:${stationOf(a)}:${stationOf(b)}`);
      return e ? weights[e.id].w : 0;
    },
    [weights]
  );

  const path = useMemo(() => pathOf(run), [run, version]);
  const plan = useMemo(
    () => (path.length ? summarize(path, weightBetween) : null),
    [path, weightBetween]
  );
  const routeLegs = useMemo(() => routeGeometry(path), [path]);
  const changeMarks = useMemo(() => changeStations(path), [path]);

  /* ---------- editing weights ---------- */
  const commit = useCallback((mutate, live = false) => {
    scrubbingRef.current = live;
    setWeights((prev) => {
      const next = prev.slice();
      mutate(next);
      return next;
    });
  }, []);

  const onWeight = useCallback(
    (id, w, live) => commit((n) => { n[id] = { ...n[id], w: clamp(Math.round(w) || 1, 1, 120), shut: false }; }, live),
    [commit]
  );
  const onShut = useCallback((id, shut) => commit((n) => { n[id] = { ...n[id], shut }; }), [commit]);
  const onReset = useCallback((id) => commit((n) => { n[id] = { ...n[id], w: n[id].def, shut: false }; }), [commit]);
  const onResetLine = useCallback(
    (li) => commit((n) => LINE_TRACKS[li].forEach((e) => { n[e.id] = { ...n[e.id], w: n[e.id].def }; })),
    [commit]
  );
  const onResetAll = useCallback(
    () => commit((n) => n.forEach((s, i) => { n[i] = { ...s, w: s.def, shut: false }; })),
    [commit]
  );
  /* Bulk: sets the default too, and deliberately leaves closures closed. */
  const onAllHops = useCallback(
    (w, live) => commit((n) => ALL_TRACKS.forEach((e) => { n[e.id] = { ...n[e.id], w, def: w }; }), live),
    [commit]
  );
  const onAllChanges = useCallback(
    (w, live) => commit((n) => EDGES.filter((e) => e.kind === CHANGE)
      .forEach((e) => { n[e.id] = { ...n[e.id], w, def: w }; }), live),
    [commit]
  );
  const onLineHops = useCallback(
    (li, w, live) => commit((n) => LINE_TRACKS[li].forEach((e) => { n[e.id] = { ...n[e.id], w, shut: false }; }), live),
    [commit]
  );
  const onChangeAt = useCallback(
    (st, w, live) => commit((n) => { const e = CHANGE_BY_STATION.get(st); n[e.id] = { ...n[e.id], w }; }, live),
    [commit]
  );
  const onScenario = useCallback(
    (i) => commit((n) => {
      n.forEach((s, k) => { n[k] = { ...s, w: s.def, shut: false }; });
      SCENARIOS[i].apply(n);
    }),
    [commit]
  );

  /* ---------- picking on the map ---------- */
  const onPickEdge = useCallback((id) => setPicked(id), []);
  const onOpenEditor = useCallback((id, x, y) => { setPicked(id); setEditor({ id, x, y }); }, []);
  const onStationClick = useCallback(
    (st, asOrigin) => {
      if (asOrigin) { if (st !== dst) setSrc(st); }
      else if (st !== src) setDst(st);
    },
    [src, dst]
  );

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setEditor(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- narration ---------- */
  const previous = useRef(null);
  const swing = plan && previous.current !== null && previous.current !== plan.minutes
    ? plan.minutes - previous.current : 0;
  useEffect(() => { previous.current = plan ? plan.minutes : null; }, [plan]);

  let message;
  if (src === dst) {
    message = <>Origin and destination are both <b>{NAMES[src]}</b>.</>;
  } else if (run.finished && plan) {
    message = (
      <>
        Settled <b>{NAMES[dst]}</b> at <b>{plan.minutes} min</b>
        {swing !== 0 && (
          <span style={{ color: swing > 0 ? "var(--red)" : "var(--green)" }}>
            {" "}{swing > 0 ? "+" : "−"}{Math.abs(swing)} min
          </span>
        )}{" "}
        after {run.pops} pops — {plan.hops} stations, {plan.changes} change{plan.changes === 1 ? "" : "s"}.
      </>
    );
  } else if (run.finished) {
    message = <>No route from <b>{NAMES[src]}</b> to <b>{NAMES[dst]}</b> — every path is closed.</>;
  } else if (run.pops === 0) {
    message = <>Searching from <b>{NAMES[src]}</b> to <b>{NAMES[dst]}</b> over {STATE_COUNT} (station, line) states.</>;
  } else {
    const last = run.trace[run.trace.length - 1];
    const at = last && last.u !== undefined ? NAMES[stationOf(last.u)] : "";
    message = <>Settled <b>{at}</b> at {last?.d} min · {run.inQueue.size} states queued.</>;
  }

  return (
    <div id="app">
      <TopBar
        src={src} dst={dst} dij={dij}
        onSrc={setSrc} onDst={setDst}
        onSwap={() => { setSrc(dst); setDst(src); }}
      />
      <div id="body">
        <MapView
          run={run} version={version} weights={weights} showDist={showDist}
          src={src} dst={dst} picked={picked}
          routeLegs={routeLegs} changeMarks={changeMarks} drawKey={drawKey}
          onStationClick={onStationClick} onEdgeWeight={onWeight}
          onOpenEditor={onOpenEditor} onPickEdge={onPickEdge}
        >
          <EdgeEditor
            editor={editor} weights={weights} plan={plan}
            onWeight={onWeight} onShut={onShut} onReset={onReset}
            onClose={() => setEditor(null)}
          />
        </MapView>

        <RailPanel
          tab={tab} setTab={setTab} plan={plan} run={run} version={version}
          path={path} weights={weights} stateCount={STATE_COUNT}
          showDist={showDist} setShowDist={setShowDist}
          picked={picked} onPick={onPickEdge}
          onWeight={onWeight} onShut={onShut} onReset={onReset}
          onResetLine={onResetLine} onResetAll={onResetAll}
          onAllHops={onAllHops} onAllChanges={onAllChanges}
          onLineHops={onLineHops} onChangeAt={onChangeAt} onScenario={onScenario}
        />
      </div>
      <Footer message={message} />
    </div>
  );
}
