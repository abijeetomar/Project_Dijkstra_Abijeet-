import { LINE, NAMES, DWELL_SECONDS, fare, stationOf } from "../metro/network.js";
import { CHANGE_BY_STATION, TRACK_BY_KEY } from "../metro/graph.js";

export default function PlanPanel({ path, plan, weights, run, stateCount }) {
  if (!plan || !path.length) {
    return (
      <>
        <p className="sec">Journey plan</p>
        <div className="empty">
          {run.finished
            ? "No route — some segment on every path is closed."
            : "Run the search to build the plan."}
        </div>
      </>
    );
  }

  const legMinutes = (leg) => {
    let total = 0;
    for (let i = leg.from; i < leg.to; i++) {
      const e = TRACK_BY_KEY.get(`${leg.line}:${stationOf(path[i])}:${stationOf(path[i + 1])}`);
      if (e) total += weights[e.id].w;
    }
    return total;
  };

  const realLegs = plan.legs.filter((l) => l.to > l.from);

  return (
    <>
      <p className="sec">Journey plan</p>
      {realLegs.map((leg, i) => {
        const from = stationOf(path[leg.from]);
        const to = stationOf(path[leg.to]);
        const stops = leg.to - leg.from;
        const via = [];
        for (let j = leg.from + 1; j < leg.to; j++) via.push(NAMES[stationOf(path[j])]);
        const next = realLegs[i + 1];
        const changeAt = next ? stationOf(path[next.from]) : null;
        return (
          <div key={leg.from}>
            <div className="leg">
              <div className="bar" style={{ background: LINE[leg.line].css }} />
              <div>
                <div className="ln" style={{ color: LINE[leg.line].css }}>
                  Leg {i + 1} · {LINE[leg.line].name}
                </div>
                <div className="st"><b>{NAMES[from]}</b> → <b>{NAMES[to]}</b></div>
                <div className="mt">
                  {stops} stop{stops === 1 ? "" : "s"} · {legMinutes(leg)} min
                  {via.length > 0 && ` · via ${via.length > 3 ? `${via.slice(0, 3).join(", ")} +${via.length - 3}` : via.join(", ")}`}
                </div>
              </div>
            </div>
            {changeAt !== null && (
              <div className="chg">
                ⇄ Change at <b>{NAMES[changeAt]}</b> — {weights[CHANGE_BY_STATION.get(changeAt).id].w} min across the concourse
              </div>
            )}
          </div>
        );
      })}

      <dl className="tot">
        <dt>Stations travelled</dt><dd>{plan.hops}</dd>
        <dt>Line changes</dt><dd>{plan.changes}</dd>
        <dt>Riding + changing</dt><dd>{plan.minutes} min</dd>
        <dt>With {DWELL_SECONDS}s dwell each</dt>
        <dd>{Math.round(plan.minutes + (plan.hops * DWELL_SECONDS) / 60)} min</dd>
        <dt>Fare (distance slab)</dt><dd>₹{fare(plan.hops)}</dd>
        <dt>States popped</dt><dd>{run.pops} / {stateCount}</dd>
      </dl>
    </>
  );
}
