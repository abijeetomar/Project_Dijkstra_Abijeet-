import PlanPanel from "./PlanPanel.jsx";
import QueuePanel from "./QueuePanel.jsx";
import TracePanel from "./TracePanel.jsx";
import WeightsPanel from "./WeightsPanel.jsx";
import StatTiles from "./StatTiles.jsx";

const TABS = [
  ["plan", "Plan"],
  ["queue", "Frontier"],
  ["trace", "Trace"],
  ["weights", "Weights"],
];

export default function RailPanel({ tab, setTab, plan, run, version, ...rest }) {
  return (
    <aside id="rail">
      <StatTiles plan={plan} pops={run.pops} />
      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? " on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="pane on">
        {tab === "plan" && <PlanPanel plan={plan} run={run} {...rest} />}
        {tab === "queue" && <QueuePanel run={run} />}
        {tab === "trace" && <TracePanel run={run} version={version} />}
        {tab === "weights" && <WeightsPanel {...rest} />}
      </div>
    </aside>
  );
}
