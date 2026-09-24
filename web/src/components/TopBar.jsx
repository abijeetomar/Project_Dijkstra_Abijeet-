import { ALPHA, NAMES } from "../metro/network.js";

export default function TopBar({ src, dst, onSrc, onDst, onSwap, dij }) {
  const { playing, play, stepOnce, solveAll, reset, speed, setSpeed } = dij;
  return (
    <header id="bar">
      <div className="brand">
        <b>Hyderabad Metro</b>
        <span>Dijkstra Router</span>
      </div>

      <div className="route">
        <div className="fld">
          <label htmlFor="src">From</label>
          <select id="src" value={src} onChange={(e) => onSrc(Number(e.target.value))}>
            {ALPHA.map((i) => <option key={i} value={i}>{NAMES[i]}  #{i}</option>)}
          </select>
        </div>
        <button className="swap" onClick={onSwap} title="Swap origin and destination"
                aria-label="Swap origin and destination">⇄</button>
        <div className="fld">
          <label htmlFor="dst">To</label>
          <select id="dst" value={dst} onChange={(e) => onDst(Number(e.target.value))}>
            {ALPHA.map((i) => <option key={i} value={i}>{NAMES[i]}  #{i}</option>)}
          </select>
        </div>
      </div>

      <div className="tport">
        <button className="btn primary" onClick={play}>{playing ? "⏸ Pause" : "▶ Run"}</button>
        <button className="btn" onClick={stepOnce}>Step</button>
        <button className="btn" onClick={solveAll}>Solve</button>
        <button className="btn" onClick={reset}>Reset</button>
        <div className="speed">
          <label htmlFor="spd">Speed</label>
          <input id="spd" type="range" min="0" max="100" value={speed}
                 onChange={(e) => setSpeed(Number(e.target.value))} />
        </div>
      </div>
    </header>
  );
}
