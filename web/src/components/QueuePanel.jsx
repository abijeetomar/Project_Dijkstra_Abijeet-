import { LINE, LINES_AT, N, NAMES, lineOf, stationOf } from "../metro/network.js";
import { INF } from "../metro/dijkstra.js";

const SHOWN = 14;

export default function QueuePanel({ run }) {
  const rows = [...run.inQueue]
    .filter((s) => !run.done[s] && run.dist[s] < INF)
    .sort((a, b) => run.dist[a] - run.dist[b]);
  const reached = new Set([...run.touched].map(stationOf)).size;
  const stateCount = LINES_AT.reduce((a, l) => a + l.length, 0);

  return (
    <>
      <p className="sec">Priority queue · {rows.length} state{rows.length === 1 ? "" : "s"}</p>
      <div className="qrow head"><span className="d">min</span><span>Station</span><span>Line</span></div>
      {rows.length === 0 && (
        <div className="empty">{run.finished ? "Empty — the search has stopped." : "Nothing queued yet."}</div>
      )}
      {rows.slice(0, SHOWN).map((s) => (
        <div className="qrow" key={s}>
          <span className="d">{Math.round(run.dist[s])}</span>
          <span className="qname">{NAMES[stationOf(s)]}</span>
          <span><span className="lc" style={{ background: LINE[lineOf(s)].css }} /></span>
        </div>
      ))}
      {rows.length > SHOWN && <div className="empty">+{rows.length - SHOWN} more queued</div>}

      <p className="sec mt">Counters</p>
      <dl className="tot" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
        <dt>States settled (pops)</dt><dd>{run.pops}</dd>
        <dt>Edges relaxed</dt><dd>{run.relaxations}</dd>
        <dt>Distances improved</dt><dd>{run.improvements}</dd>
        <dt>Stale entries skipped</dt><dd>{run.stale}</dd>
        <dt>Stations reached</dt><dd>{reached} / {N}</dd>
        <dt>Of {stateCount} states</dt><dd>{run.pops}</dd>
      </dl>
    </>
  );
}
