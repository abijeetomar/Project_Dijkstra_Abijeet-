import { useEffect, useRef } from "react";
import { LINE, NAMES, lineOf, stationOf } from "../metro/network.js";

export default function TracePanel({ run, version }) {
  const boxRef = useRef(null);
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [version]);

  const entries = run.trace.slice(-400);

  return (
    <div id="log" ref={boxRef}>
      {entries.length === 0 && <div style={{ border: 0 }}>Press Run or Step to trace the search.</div>}
      {entries.map((e, i) => {
        if (e.kind === "exhausted")
          return <div className="fin" key={i}>queue empty — destination unreachable</div>;
        if (e.kind === "goal")
          return (
            <div className="fin" key={i}>
              pop <b>{NAMES[stationOf(e.u)]}</b> · {LINE[lineOf(e.u)].short} @ {e.d} — destination settled, stop
            </div>
          );
        const improved = e.relaxed.filter((r) => r.better).length;
        return (
          <div key={i}>
            pop <b>{NAMES[stationOf(e.u)]}</b> · {LINE[lineOf(e.u)].short} @ {e.d} → relax {e.relaxed.length}
            {improved > 0 && <span className="imp"> ↓{improved}</span>}
          </div>
        );
      })}
    </div>
  );
}
