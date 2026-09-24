import { useMemo, useRef, useState } from "react";
import { LINE, LINES_AT, NAMES, TERMINI, sid, stationOf } from "../metro/network.js";
import { POSITIONS, LABELS, VIEWBOX, XCHG_CHIP } from "../metro/geometry.js";
import { CHANGE, CHANGE_BY_STATION, EDGES, TRACK, edgeLabel, lineBase } from "../metro/graph.js";
import { bestState } from "../metro/dijkstra.js";
import { usePanZoom } from "../hooks/usePanZoom.js";

const TRACKS = EDGES.filter((e) => e.kind === TRACK);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function MapView({
  run, version, weights, showDist, src, dst, picked, routeLegs, changeMarks, drawKey,
  onStationClick, onEdgeWeight, onOpenEditor, onPickEdge, children,
}) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClick = useRef(false);
  const [hovered, setHovered] = useState(-1);
  const [tip, setTip] = useState(null);
  const [hintOpen, setHintOpen] = useState(true);

  const pan = usePanZoom(svgRef, VIEWBOX, { ignore: ".hit,.node,.chip-x,.wbadge" });
  const bases = useMemo(() => LINE.map((_, li) => lineBase(weights, li)), [weights]);

  /* ---- local coordinates for the floating bits ---- */
  const localPoint = (ev) => {
    const box = wrapRef.current.getBoundingClientRect();
    return { x: ev.clientX - box.left, y: ev.clientY - box.top, box };
  };
  const placeTip = (ev, body) => {
    const { x, y, box } = localPoint(ev);
    setTip({ body, x: x + 240 > box.width ? x - 230 : x + 14, y: y + 90 > box.height ? y - 90 : y + 14 });
  };

  /* ---- drag a segment to retime it ---- */
  const onHitDown = (ev, id) => {
    dragRef.current = { id, y0: ev.clientY, w0: weights[id].w, moved: false };
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
  };
  const onHitMove = (ev, id) => {
    const drag = dragRef.current;
    if (!drag) {
      setHovered(id);
      const s = weights[id];
      placeTip(ev, (
        <>
          <div className="t">{edgeLabel(EDGES[id])}</div>
          <div className="r"><span>{EDGES[id].kind === TRACK ? LINE[EDGES[id].line].name : "interchange"}</span>
            <b>{s.shut ? "closed" : `${s.w} min`}</b></div>
          <div className="r"><span /><span style={{ color: "var(--tx-3)" }}>drag to retime · click to edit</span></div>
        </>
      ));
      return;
    }
    const dy = drag.y0 - ev.clientY;
    if (!drag.moved && Math.abs(dy) < 5) return;
    if (!drag.moved) onPickEdge(drag.id);
    drag.moved = true;
    suppressClick.current = true;
    const v = clamp(Math.round(drag.w0 + dy / 7), 1, 120);
    onEdgeWeight(drag.id, v, true);
    placeTip(ev, (
      <>
        <div className="t">{edgeLabel(EDGES[drag.id])}</div>
        <div className="r"><span>running time</span><b>{v} min</b></div>
        <div className="r"><span /><span style={{ color: "var(--tx-3)" }}>up slower · down faster</span></div>
      </>
    ));
  };
  const onHitUp = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (drag.moved) { onEdgeWeight(drag.id, weights[drag.id].w, false); setTip(null); }
  };
  const onHitClick = (ev, id) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    const { x, y, box } = localPoint(ev);
    onOpenEditor(id, clamp(x + 16, 8, box.width - 254), clamp(y - 30, 8, box.height - 230));
  };

  /* ---- per-station search state ---- */
  const nodeInfo = (st) => {
    const lines = LINES_AT[st];
    const settled = lines.some((l) => run.done[sid(st, l)]);
    const queued = lines.some((l) => run.inQueue.has(sid(st, l)));
    const current = run.current >= 0 && stationOf(run.current) === st;
    const best = bestState(run, st);
    return { lines, settled, queued, current, best };
  };

  const edgeClass = (e) => {
    const s = weights[e.id];
    const cls = ["edge"];
    if (s.shut) cls.push("closed");
    else {
      if (run.seen.has(e.id)) cls.push("seen");
      if (run.tree.has(e.id)) cls.push("tree");
      if (run.flash.has(e.id)) cls.push("flash");
    }
    if (hovered === e.id) cls.push("hov");
    if (picked === e.id) cls.push("pick");
    return cls.join(" ");
  };

  const midOf = (e) => {
    const i = Math.floor((e.pts.length - 1) / 2);
    const a = e.pts[i], b = e.pts[i + 1] || a;
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
  };

  let delay = 0;

  return (
    <div id="mapwrap" ref={wrapRef}>
      <svg
        id="map" ref={svgRef} viewBox={pan.viewBox} preserveAspectRatio="xMidYMid meet"
        className={pan.panning ? "dragging" : undefined}
        role="img" aria-label="Schematic map of the Hyderabad Metro with the Dijkstra search state"
        {...pan.handlers}
        onPointerLeave={() => { setTip(null); setHovered(-1); }}
      >
        <defs>
          <pattern id="gp" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--grid)" />
          </pattern>
        </defs>
        <rect x={VIEWBOX.x} y={VIEWBOX.y} width={VIEWBOX.w} height={VIEWBOX.h} fill="url(#gp)" opacity=".5" />

        {/* corridors */}
        <g>
          {TRACKS.map((e) => (
            <path key={e.id} className={edgeClass(e)} d={e.d} stroke={LINE[e.line].css} />
          ))}
        </g>

        {/* the winning route, drawn leg by leg */}
        <g>
          {routeLegs.map((leg, i) => {
            const dur = Math.max(180, leg.len * 1.5);
            const style = {
              "--len": leg.len, "--dur": `${dur}ms`, "--delay": `${delay}ms`,
            };
            delay += dur;
            return (
              <g key={`${i}-${drawKey}`}>
                <path className="route-cas draw" d={leg.d} style={style} />
                <path className="route-leg draw" d={leg.d} stroke={LINE[leg.line].css} style={style} />
              </g>
            );
          })}
        </g>

        {/* invisible wide targets for hover, click and drag */}
        <g>
          {TRACKS.map((e) => (
            <path
              key={e.id} className="hit" d={e.d}
              onPointerDown={(ev) => onHitDown(ev, e.id)}
              onPointerMove={(ev) => onHitMove(ev, e.id)}
              onPointerUp={onHitUp}
              onPointerCancel={onHitUp}
              onPointerLeave={() => { if (!dragRef.current) { setHovered(-1); setTip(null); } }}
              onClick={(ev) => onHitClick(ev, e.id)}
            />
          ))}
        </g>

        {/* stations */}
        <g>
          {POSITIONS.map((p, st) => {
            const { lines, settled, queued, current, best } = nodeInfo(st);
            const interchange = lines.length > 1;
            let ring = "none", ringOpacity = 0;
            if (current) { ring = "var(--violet)"; ringOpacity = 1; }
            else if (st === src || st === dst) { ring = "var(--tx)"; ringOpacity = 0.9; }
            else if (queued && !settled) { ring = "var(--amber-fill)"; ringOpacity = 0.45; }
            return (
              <g key={st}>
                <circle className="ring" cx={p.x} cy={p.y} r={interchange ? 12 : 9}
                        stroke={ring} strokeWidth="2.4" opacity={ringOpacity} />
                <circle
                  className="node" cx={p.x} cy={p.y} r={interchange ? 7 : 4.6}
                  fill={settled ? LINE[lines[0]].css : "var(--map-bg)"}
                  stroke={queued && !settled ? "var(--amber-fill)" : LINE[lines[0]].css}
                  opacity={settled || queued ? 1 : 0.55}
                  style={{ cursor: "pointer" }}
                  onPointerMove={(ev) => placeTip(ev, (
                    <>
                      <div className="t">{NAMES[st]}</div>
                      <div className="r"><span>index</span><b>#{st}</b></div>
                      <div className="r"><span>lines</span>
                        <span>{lines.map((l) => (
                          <span key={l}><span className="lc" style={{ background: LINE[l].css }} />{LINE[l].short} </span>
                        ))}</span>
                      </div>
                      <div className="r"><span>dist</span>
                        <b>{best >= 0 ? `${run.dist[best]} min ${settled ? "(settled)" : "(tentative)"}` : "not reached"}</b></div>
                    </>
                  ))}
                  onPointerLeave={() => setTip(null)}
                  onClick={(ev) => onStationClick(st, ev.shiftKey || ev.altKey)}
                />
              </g>
            );
          })}
        </g>

        {/* station names */}
        <g>
          {LABELS.map((s, st) => {
            const p = POSITIONS[st];
            const x = p.x + s.dx, y = p.y + s.dy;
            const interchange = LINES_AT[st].length > 1;
            const info = nodeInfo(st);
            const cls = ["nlabel"];
            if (interchange) cls.push("xchg");
            else if (TERMINI.has(st)) cls.push("term");
            if (info.current || st === src || st === dst) cls.push("on");
            return (
              <text key={st} className={cls.join(" ")} x={x} y={y} textAnchor={s.anchor}
                    transform={s.rot ? `rotate(${s.rot} ${x.toFixed(1)} ${y.toFixed(1)})` : undefined}>
                {NAMES[st]}
              </text>
            );
          })}
        </g>

        {/* live distances */}
        {showDist && (
          <g>
            {POSITIONS.map((p, st) => {
              const { settled, queued, best } = nodeInfo(st);
              if (best < 0 || !(settled || queued)) return null;
              const s = LABELS[st];
              return (
                <text key={st} className={`dlabel${settled ? " done" : ""}`}
                      x={p.x - s.nx * 12} y={p.y - s.ny * 12 + 3}
                      textAnchor={s.nx > 0 ? "end" : "start"}>
                  {Math.round(run.dist[best])}
                </text>
              );
            })}
          </g>
        )}

        {/* edits, closures, interchange chips, change markers */}
        <g>
          {TRACKS.map((e) => {
            const s = weights[e.id];
            const m = midOf(e);
            if (s.shut) {
              return (
                <g key={e.id}>
                  <line className="shut" x1={m.x - 6} y1={m.y - 6} x2={m.x + 6} y2={m.y + 6} />
                  <line className="shut" x1={m.x + 6} y1={m.y - 6} x2={m.x - 6} y2={m.y + 6} />
                </g>
              );
            }
            if (s.w === bases[e.line]) return null;
            return (
              <g key={e.id} className="wbadge" onClick={(ev) => onHitClick(ev, e.id)}>
                <rect x={m.x - 11} y={m.y - 7.5} width="22" height="15" rx="7.5" />
                <text x={m.x} y={m.y + 3.2}>{s.w}</text>
              </g>
            );
          })}

          {Object.entries(XCHG_CHIP).map(([st, [cx, cy]]) => {
            const edge = CHANGE_BY_STATION.get(Number(st));
            const s = weights[edge.id];
            return (
              <g key={st} className={`chip-x${s.w !== s.def ? " edited" : ""}`}
                 onClick={(ev) => onHitClick(ev, edge.id)}>
                <rect x={cx - 16} y={cy - 8} width="32" height="16" rx="8" />
                <text x={cx} y={cy + 3.2}>⇄{s.w}</text>
              </g>
            );
          })}

          {changeMarks.map((st) => (
            <circle key={st} cx={POSITIONS[st].x} cy={POSITIONS[st].y} r="13"
                    fill="none" stroke="var(--amber-fill)" strokeWidth="2.6" pointerEvents="none" />
          ))}
        </g>
      </svg>

      {hintOpen && (
        <div className="hint">
          <button onClick={() => setHintOpen(false)} aria-label="Dismiss">×</button>
          <b>Drag any segment up or down</b> to retime it live — the route re-solves as you drag.
          Click it instead for a slider and a maintenance closure. Click a station to set the
          destination, <kbd>shift</kbd>-click for the origin.
        </div>
      )}

      <div className="zoom">
        <button onClick={pan.zoomIn} title="Zoom in">+</button>
        <button onClick={pan.zoomOut} title="Zoom out">−</button>
        <button onClick={pan.fit} title="Fit map">⤢</button>
      </div>

      {tip && <div id="tip" className="on" style={{ left: tip.x, top: tip.y }}>{tip.body}</div>}
      {children}
    </div>
  );
}
