import { useEffect, useMemo, useState } from "react";
import { ALPHA, LINE, NAMES } from "../metro/network.js";
import { CHANGE, EDGES, TRACK, neighborsOf } from "../metro/graph.js";
import LiveSlider from "./LiveSlider.jsx";

/** Change exactly one segment: pick the two stations it runs between. */
export default function SegmentPicker({ weights, picked, onPick, onWeight, onShut, onReset }) {
  const [from, setFrom] = useState(16);
  const options = useMemo(() => neighborsOf(from), [from]);

  /* If a segment is picked on the map, aim these selects at it. */
  useEffect(() => {
    if (picked < 0) return;
    if (options.some((o) => o.id === picked)) return;
    const e = EDGES[picked];
    setFrom(e.kind === TRACK ? e.a : e.st);
  }, [picked, options]);

  const selected = options.some((o) => o.id === picked) ? picked : options[0]?.id ?? -1;

  useEffect(() => {
    if (selected >= 0 && selected !== picked) onPick(selected);
  }, [selected, picked, onPick]);

  if (selected < 0) return null;
  const edge = EDGES[selected];
  const state = weights[selected];
  const isTrack = edge.kind !== CHANGE;
  const max = isTrack ? 30 : 40;

  return (
    <div className="seg">
      <div className="sgrow">
        <label htmlFor="segA">From</label>
        <select id="segA" value={from} onChange={(e) => setFrom(Number(e.target.value))}>
          {ALPHA.map((i) => <option key={i} value={i}>{NAMES[i]}</option>)}
        </select>
      </div>
      <div className="sgrow">
        <label htmlFor="segB">To</label>
        <select id="segB" value={selected} onChange={(e) => onPick(Number(e.target.value))}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.line < 0 ? o.label : `${o.label}  ·  ${LINE[o.line].short}`}
            </option>
          ))}
        </select>
      </div>

      <div className="stepper" style={{ marginTop: 10 }}>
        <button onClick={() => onWeight(selected, state.w - 1, false)} aria-label="Decrease">−</button>
        <input type="number" min="1" max="120" step="1" inputMode="numeric" aria-label="Minutes"
               value={state.w}
               onChange={(e) => onWeight(selected, Number(e.target.value), true)}
               onBlur={(e) => onWeight(selected, Number(e.target.value), false)} />
        <button onClick={() => onWeight(selected, state.w + 1, false)} aria-label="Increase">+</button>
      </div>

      <LiveSlider className="rng" value={Math.min(max, state.w)} min={1} max={max}
                  aria-label="Drag to change this segment"
                  onLive={(v) => onWeight(selected, v, true)}
                  onSettle={(v) => onWeight(selected, v, false)} />
      <div className="rngs"><span>1</span><span>{max} min</span></div>

      <div className="erow">
        <button className="mini" onClick={() => onReset(selected)}>Default</button>
        {isTrack && (
          <button className={`mini${state.shut ? " on" : ""}`} onClick={() => onShut(selected, !state.shut)}>
            {state.shut ? "Reopen" : "Close segment"}
          </button>
        )}
        <span className="unit">{state.shut ? "closed" : `default ${state.def}`}</span>
      </div>
    </div>
  );
}
