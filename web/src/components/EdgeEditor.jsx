import { CHANGE, EDGES, edgeLabel } from "../metro/graph.js";
import { LINE } from "../metro/network.js";
import LiveSlider from "./LiveSlider.jsx";

/** The popover that opens when a segment on the map is clicked. */
export default function EdgeEditor({ editor, weights, plan, onWeight, onShut, onReset, onClose }) {
  if (!editor) return null;
  const edge = EDGES[editor.id];
  const state = weights[editor.id];
  const isTrack = edge.kind !== CHANGE;
  const max = isTrack ? 30 : 40;

  return (
    <div id="ed" className="on" style={{ left: editor.x, top: editor.y }}>
      <div className="eh">
        <span>{isTrack ? LINE[edge.line].name : "Interchange"}</span>
        <button onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="et">{edgeLabel(edge)}</div>
      <div className="es">
        {isTrack
          ? `One hop of track · default ${state.def} min`
          : `${LINE[edge.l1].name} ⇄ ${LINE[edge.l2].name} · default ${state.def} min`}
      </div>

      <div className="stepper">
        <button onClick={() => onWeight(edge.id, state.w - 1, false)} aria-label="Decrease">−</button>
        <input type="number" min="1" max="120" step="1" inputMode="numeric" aria-label="Minutes"
               value={state.w}
               onChange={(e) => onWeight(edge.id, Number(e.target.value), true)}
               onBlur={(e) => onWeight(edge.id, Number(e.target.value), false)} />
        <button onClick={() => onWeight(edge.id, state.w + 1, false)} aria-label="Increase">+</button>
      </div>

      <LiveSlider className="rng" value={Math.min(max, state.w)} min={1} max={max}
                  aria-label="Drag to change the running time"
                  onLive={(v) => onWeight(edge.id, v, true)}
                  onSettle={(v) => onWeight(edge.id, v, false)} />
      <div className="rngs"><span>1</span><span>{max} min</span></div>

      <div className="erow">
        <button className="mini" onClick={() => onReset(edge.id)}>Default</button>
        {isTrack && (
          <button className={`mini${state.shut ? " on" : ""}`}
                  onClick={() => onShut(edge.id, !state.shut)}>
            {state.shut ? "Reopen segment" : "Close segment"}
          </button>
        )}
        <span className="unit">min</span>
      </div>

      <div className="live">
        {plan
          ? <>Journey now <b>{plan.minutes}</b> min · {plan.changes} change{plan.changes === 1 ? "" : "s"}</>
          : <span style={{ color: "var(--red)" }}>No route while this is closed</span>}
      </div>
    </div>
  );
}
