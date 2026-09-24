import { LINE, NAMES, INTERCHANGES } from "../metro/network.js";
import { ALL_TRACKS, CHANGE, CHANGE_BY_STATION, EDGES, LINE_TRACKS, edgeLabel, lineBase } from "../metro/graph.js";
import { SCENARIOS } from "../metro/scenarios.js";
import SegmentPicker from "./SegmentPicker.jsx";
import LiveSlider from "./LiveSlider.jsx";

function Slider({ label, note, value, min, max, unit, onLive, onSettle }) {
  return (
    <div className="gset">
      <div className="hd">
        <span>{label}{note && <em> · {note}</em>}</span>
        <b>{value}</b><em>{unit}</em>
      </div>
      <LiveSlider value={value} min={min} max={max} onLive={onLive} onSettle={onSettle} />
    </div>
  );
}

const uniform = (values) => {
  const set = new Set(values);
  return set.size === 1 ? [...set][0] : null;
};

export default function WeightsPanel({
  weights, showDist, setShowDist, picked, onPick,
  onWeight, onShut, onReset, onResetLine, onResetAll,
  onAllHops, onAllChanges, onLineHops, onChangeAt, onScenario,
}) {
  const globalHop = uniform(ALL_TRACKS.map((e) => weights[e.id].def));
  const changeEdges = EDGES.filter((e) => e.kind === CHANGE);
  const globalChange = uniform(changeEdges.map((e) => weights[e.id].def));
  const bases = LINE.map((_, li) => lineBase(weights, li));

  /* An edit is a segment away from what its corridor is generally running at,
     so retiming a whole corridor reads as one change rather than twenty-six. */
  const rows = [];
  LINE.forEach((l, li) => {
    const def = weights[LINE_TRACKS[li][0].id].def;
    const open = LINE_TRACKS[li].filter((e) => !weights[e.id].shut);
    if (bases[li] !== def && open.length)
      rows.push({ key: `line${li}`, colour: l.css, name: `${l.name} · all ${open.length} hops`,
                  value: `${bases[li]}m`, tip: `Reset the whole corridor to ${def} min`,
                  onReset: () => onResetLine(li) });
    LINE_TRACKS[li].forEach((e) => {
      const s = weights[e.id];
      if (s.shut)
        rows.push({ key: e.id, colour: "var(--red)", name: edgeLabel(e), value: "closed",
                    tip: "Reopen this segment", onReset: () => onReset(e.id) });
      else if (s.w !== bases[li])
        rows.push({ key: e.id, colour: l.css, name: edgeLabel(e), value: `${s.w}m`,
                    tip: `Reset to ${s.def} min`, onReset: () => onReset(e.id) });
    });
  });
  changeEdges.forEach((e) => {
    const s = weights[e.id];
    if (s.w !== s.def)
      rows.push({ key: e.id, colour: "var(--amber-fill)", name: edgeLabel(e), value: `${s.w}m`,
                  tip: `Reset to ${s.def} min`, onReset: () => onReset(e.id) });
  });

  return (
    <>
      <p className="sec">One segment between two stations</p>
      <SegmentPicker weights={weights} picked={picked} onPick={onPick}
                     onWeight={onWeight} onShut={onShut} onReset={onReset} />

      <p className="sec mt">Bulk controls</p>
      <div className="caution">
        Each of these rewrites many segments at once and overwrites the individual edits above.
      </div>
      <Slider label="Every hop of track" note={`all ${ALL_TRACKS.length}`} unit="min"
              value={globalHop ?? 2} min={1} max={12}
              onLive={(v) => onAllHops(v, true)} onSettle={(v) => onAllHops(v, false)} />
      <Slider label="Every line change" note="all 3" unit="min"
              value={globalChange ?? 6} min={1} max={30}
              onLive={(v) => onAllChanges(v, true)} onSettle={(v) => onAllChanges(v, false)} />

      <p className="sec mt">Whole corridor · minutes a hop</p>
      {LINE.map((l, li) => {
        const open = LINE_TRACKS[li].filter((e) => !weights[e.id].shut);
        const u = open.length ? uniform(open.map((e) => weights[e.id].w)) : null;
        return (
          <div className="gset ln" key={l.name}>
            <div className="hd">
              <span><span className="lc" style={{ background: l.css }} />{l.name}</span>
              <b>{u === null ? "mixed" : u}</b><em>min</em>
            </div>
            <LiveSlider value={u ?? bases[li]} min={1} max={12}
                        onLive={(v) => onLineHops(li, v, true)}
                        onSettle={(v) => onLineHops(li, v, false)} />
          </div>
        );
      })}

      <p className="sec mt">Interchange penalty</p>
      {INTERCHANGES.map((st) => {
        const s = weights[CHANGE_BY_STATION.get(st).id];
        return (
          <Slider key={st} label={NAMES[st]} unit="min" value={s.w} min={1} max={40}
                  onLive={(v) => onChangeAt(st, v, true)}
                  onSettle={(v) => onChangeAt(st, v, false)} />
        );
      })}

      <div className="chkrow">
        <label htmlFor="gd">Show live distances on the map</label>
        <input id="gd" type="checkbox" checked={showDist} onChange={(e) => setShowDist(e.target.checked)} />
      </div>

      <p className="sec mt">Scenarios</p>
      <div className="scen">
        {SCENARIOS.map((s, i) => (
          <button key={s.title} onClick={() => onScenario(i)}>
            <b>{s.title}</b><span>{s.note}</span>
          </button>
        ))}
      </div>

      <p className="sec mt">Edited · {rows.length}</p>
      {rows.length === 0 ? (
        <div className="empty">Nothing off-default — drag a segment on the map, or a slider above.</div>
      ) : (
        <>
          <div className="wlist">
            {rows.map((r) => (
              <div className="wrow" key={r.key}>
                <span className="sw" style={{ background: r.colour }} />
                <span className="qname">{r.name}</span>
                <span className="w">{r.value}</span>
                <button className="x" title={r.tip} onClick={r.onReset}>×</button>
              </div>
            ))}
          </div>
          <button className="mini" style={{ marginTop: 10 }} onClick={onResetAll}>Reset every weight</button>
        </>
      )}
    </>
  );
}
