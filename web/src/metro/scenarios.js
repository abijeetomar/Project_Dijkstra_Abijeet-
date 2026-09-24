import { ALL_TRACKS, LINE_TRACKS, CHANGE_BY_STATION, TRACK_BY_KEY } from "./graph.js";

/* Each scenario starts from a clean network, then applies its own disruption. */
export const SCENARIOS = [
  {
    title: "Normal service",
    note: "Every hop 2 min, every change 6 min.",
    apply: () => {},
  },
  {
    title: "Blue Line at rush hour",
    note: "The Hitec City corridor slows to 4 min a hop.",
    apply: (w) => LINE_TRACKS[2].forEach((e) => { w[e.id] = { ...w[e.id], w: 4 }; }),
  },
  {
    title: "Ameerpet concourse jammed",
    note: "The Red ⇄ Blue change costs 20 min.",
    apply: (w) => { const e = CHANGE_BY_STATION.get(16); w[e.id] = { ...w[e.id], w: 20 }; },
  },
  {
    title: "Durgam Cheruvu–Hitec City closed",
    note: "Forces a reroute, or no route at all.",
    apply: (w) => { const e = TRACK_BY_KEY.get("2:53:54"); w[e.id] = { ...w[e.id], shut: true }; },
  },
];

export { ALL_TRACKS };
