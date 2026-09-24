# Hyderabad Metro · Dijkstra

Shortest-path routing across the 56 stations of the Hyderabad Metro, in three
forms: the original C++ program, a Java journey simulator, and an interactive
React visualiser that shows the search settling station by station and lets you
retime or close any segment while it re-routes.

**[▶ Open the live visualiser](https://vaibhav01web.github.io/Dijkstras_Vaibhav/)**

![The network](graph_representation.png)

---

## What is here

| Path | What it is |
| --- | --- |
| `web/` | React + Vite visualiser. The map, the animated search, live weight editing. |
| `metro-visualizer.html` | The same app as one dependency-free HTML file. Double-click it. |
| `MetroSimulation.java` | Journey simulator: legs, interchanges, travel time, fare, played back station by station. |
| `dij.java` | Hop-count shortest paths from one station to every other. |
| `dijkstras.cpp` | The original C++ implementation. |

## The routing model

A metro map is not a plain graph. Changing trains costs real time, and a graph
whose nodes are stations has nowhere to charge that cost — the router would
swap lines for free and happily plan a trip with nine changes.

So the search runs over **(station, line) states** instead. Riding one hop moves
between two states on the same line; changing trains moves between two states at
the same station, and that edge carries the interchange penalty.

```
state(station, line) = station * 3 + line

ride    (Ameerpet, Red)  ──2 min──▶  (Panjagutta, Red)
change  (Ameerpet, Red)  ──6 min──▶  (Ameerpet, Blue)
```

Three stations sit on more than one line, and those are the only places a change
is possible: **Ameerpet** (Red ⇄ Blue), **Parade Ground** (Green ⇄ Blue) and
**MG Bus Station** (Red ⇄ Green).

Defaults are 2 minutes a hop, 6 minutes a change, and a 25-second dwell at each
platform. Fares follow the real distance slabs, priced off stations travelled
rather than time, so making a corridor slower never changes the fare.

All three programs agree. `java MetroSimulation 0 55 --fast` and the visualiser
both route LB Nagar → Raidurg as 25 stations, one change at Ameerpet, 56 minutes,
₹60.

## Running it

**The visualiser, from source**

```bash
cd web
npm install
npm run dev            # http://localhost:5173
npm run build          # dist/
npm run build:single   # dist-single/index.html — one self-contained file
```

**The Java programs**

```bash
javac MetroSimulation.java
java MetroSimulation              # pick source and destination
java MetroSimulation 0 55         # LB Nagar to Raidurg
java MetroSimulation 0 55 --fast  # skip the playback delay
```

**The C++ program**

```bash
g++ dijkstras.cpp -o dijkstras && ./dijkstras
```

## Inside the visualiser

- **Watch it search.** Run, Step or Solve, at any speed. The popped state gets a
  violet ring, queued stations an amber one, settled stations fill with their
  line colour. Live distances sit beside each station and the parent tree
  brightens as it forms.
- **Read the queue.** The Frontier tab is the actual priority queue, sorted, with
  pops, relaxations, improvements and stale-entry counters. Trace is one line per pop.
- **Change the weights.** Drag any segment on the map up or down to retime it,
  or pick two stations in the Weights tab and set that one segment exactly.
  Bulk sliders retime a whole corridor or every hop at once.
- **Close a segment** for maintenance and watch the route go around it — or
  discover there is no way around.

### Project layout

```
web/src/
├── metro/
│   ├── network.js    stations, corridors, fare slabs, state encoding
│   ├── geometry.js   schematic layout: polylines, label placement
│   ├── graph.js      edges, adjacency, corridor baselines
│   ├── dijkstra.js   createRun / step / solve / summarize  (pure, no React)
│   └── route.js      winning path → drawable legs
├── hooks/            useDijkstra (the stepper), usePanZoom
└── components/       TopBar · MapView · EdgeEditor · SegmentPicker · panels
```

Edge weights live in React state; the topology is a module constant. Adjacency
is a `useMemo` over the weights, so editing one segment re-routes through
ordinary data flow rather than an imperative refresh.

## Station indices

The same numbering is used by every program here.

| # | Station | # | Station | # | Station | # | Station |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | LB Nagar | 14 | Irrum Manzil | 28 | Narayanguda | 42 | Secunderabad East |
| 1 | Victoria Memorial | 15 | Panjagutta | 29 | Chikkadpally | 43 | Paradise |
| 2 | Chaitanyapuri | 16 | **Ameerpet** | 30 | RTC X Roads | 44 | Rasoolpura |
| 3 | Dilsukhnagar | 17 | SR Nagar | 31 | Musheerabad | 45 | Prakash Nagar |
| 4 | Moosarambagh | 18 | ESI Hospital | 32 | Gandhi Hospital | 46 | Begumpet |
| 5 | New Market | 19 | Erragadda | 33 | Secunderabad West | 47 | Madhura Nagar |
| 6 | Malakpet | 20 | Bharat Nagar | 34 | **Parade Ground** | 48 | Yusufguda |
| 7 | **MG Bus Station** | 21 | Moosapet | 35 | Nagole | 49 | Jubilee Hills |
| 8 | Osmania Medical | 22 | Dr. B.R. Ambedkar | 36 | Uppal | 50 | JH Check Post |
| 9 | Gandhi Bhavan | 23 | Kukatpally | 37 | Stadium | 51 | Peddamma Gudi |
| 10 | Nampally | 24 | KPHB Colony | 38 | NGRI | 52 | Madhapur |
| 11 | Assembly | 25 | JNTU College | 39 | Habsiguda | 53 | Durgam Cheruvu |
| 12 | Lakdikapul | 26 | Miyapur | 40 | Tarnaka | 54 | Hitec City |
| 13 | Khairatabad | 27 | Sultan Bazar | 41 | Mettuguda | 55 | Raidurg |

**Bold** stations are interchanges.

Lines: **Red** 0–26 (LB Nagar ↔ Miyapur) · **Green** 34, 33 … 27, 7 (Parade
Ground ↔ MG Bus Station) · **Blue** 35–42, 34, 43–46, 16, 47–55 (Nagole ↔ Raidurg).

## Complexity

With a binary heap, Dijkstra runs in O(E log V). Here V is 59 (station, line)
states rather than 56 stations — 27 on the Red Line, 9 on the Green, 23 on the
Blue, with the three interchanges counted once per line they serve. E is 56 ride
edges plus 3 change edges, each usable in both directions. LB Nagar → Raidurg
settles in 58 pops, and the search stops the moment the destination is popped
rather than finishing the whole network.

## Credits

Built on [Mak-3/Dijkstras-algorithm-HYDmetro](https://github.com/Mak-3/Dijkstras-algorithm-HYDmetro),
which is where `dijkstras.cpp` and the original station numbering come from.
A related Java implementation lives at
[ASMA-GIT/Hyderabad-Metro-DijkstraAlgo](https://github.com/ASMA-GIT/Hyderabad-Metro-DijkstraAlgo).

MIT licensed — see [LICENCE](LICENCE).
