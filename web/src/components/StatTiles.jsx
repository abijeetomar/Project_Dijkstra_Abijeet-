import { fare } from "../metro/network.js";

export default function StatTiles({ plan, pops }) {
  const tiles = [
    { k: "Journey", v: plan ? `${plan.minutes}m` : "—" },
    { k: "Changes", v: plan ? plan.changes : "—" },
    { k: "Fare", v: plan ? `₹${fare(plan.hops)}` : "—" },
    { k: "Settled", v: pops },
  ];
  return (
    <div className="tiles">
      {tiles.map((t) => (
        <div className="tile" key={t.k}>
          <div className="k">{t.k}</div>
          <div className="v">{t.v}</div>
        </div>
      ))}
    </div>
  );
}
