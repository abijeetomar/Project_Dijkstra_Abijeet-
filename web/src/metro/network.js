/*
 * The network itself: the same 56 stations and three corridors as
 * MetroSimulation.java in the repo root, with the station indices unchanged
 * so `java MetroSimulation 0 55` and this app describe the same journey.
 */

export const NAMES = [
  "LB Nagar", "Victoria Memorial", "Chaitanyapuri", "Dilsukhnagar", "Moosarambagh",
  "New Market", "Malakpet", "MG Bus Station", "Osmania Medical", "Gandhi Bhavan",
  "Nampally", "Assembly", "Lakdikapul", "Khairatabad", "Irrum Manzil", "Panjagutta",
  "Ameerpet", "SR Nagar", "ESI Hospital", "Erragadda", "Bharat Nagar", "Moosapet",
  "Dr. B.R. Ambedkar", "Kukatpally", "KPHB Colony", "JNTU College", "Miyapur",
  "Sultan Bazar", "Narayanguda", "Chikkadpally", "RTC X Roads", "Musheerabad",
  "Gandhi Hospital", "Secunderabad West", "Parade Ground", "Nagole", "Uppal",
  "Stadium", "NGRI", "Habsiguda", "Tarnaka", "Mettuguda", "Secunderabad East",
  "Paradise", "Rasoolpura", "Prakash Nagar", "Begumpet", "Madhura Nagar",
  "Yusufguda", "Jubilee Hills", "JH Check Post", "Peddamma Gudi", "Madhapur",
  "Durgam Cheruvu", "Hitec City", "Raidurg",
];

export const N = NAMES.length;
export const LINES = 3;

const seq = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const LINE = [
  { name: "Red Line",   short: "Red",   css: "var(--red)",   order: seq(0, 26) },
  { name: "Green Line", short: "Green", css: "var(--green)", order: [34, 33, 32, 31, 30, 29, 28, 27, 7] },
  { name: "Blue Line",  short: "Blue",  css: "var(--blue)",
    order: [35, 36, 37, 38, 39, 40, 41, 42, 34, 43, 44, 45, 46, 16, 47, 48, 49, 50, 51, 52, 53, 54, 55] },
];

/** Which lines call at a station. Two or more means it is an interchange. */
export const LINES_AT = Array.from({ length: N }, (_, st) =>
  LINE.reduce((acc, l, i) => (l.order.includes(st) ? [...acc, i] : acc), [])
);

export const INTERCHANGES = LINES_AT.reduce(
  (acc, ls, st) => (ls.length > 1 ? [...acc, st] : acc), []
);

export const TERMINI = new Set(LINE.flatMap((l) => [l.order[0], l.order[l.order.length - 1]]));

export const HOP_DEF = 2;      // minutes of running time between two stations
export const XCHG_DEF = 6;     // minutes to cross the concourse and wait
export const DWELL_SECONDS = 25;

/** Hyderabad Metro distance slabs, priced off stations travelled. */
export function fare(hops) {
  if (hops <= 2) return 10;
  if (hops <= 4) return 15;
  if (hops <= 6) return 25;
  if (hops <= 9) return 30;
  if (hops <= 14) return 40;
  if (hops <= 21) return 50;
  return 60;
}

/* The search runs over (station, line) states, not plain stations: without the
   line in the state there is nowhere to charge an interchange, and the router
   would change trains for free. */
export const sid = (station, line) => station * LINES + line;
export const stationOf = (state) => (state - (state % LINES)) / LINES;
export const lineOf = (state) => state % LINES;
export const STATE_COUNT = N * LINES;

/** Station indices sorted by name, for the pickers. */
export const ALPHA = Array.from({ length: N }, (_, i) => i).sort((a, b) =>
  NAMES[a].localeCompare(NAMES[b])
);
