import java.util.*;

/*
 * Hyderabad Metro journey simulator.
 *
 * dij.java answers "how many hops from one station to every other station".
 * This file answers "what does the actual trip look like": which line you board,
 * where you change trains, how long it takes, what it costs -- and then plays the
 * journey back station by station.
 *
 * Usage:
 *   java MetroSimulation                  -> interactive, pick source and destination
 *   java MetroSimulation 0 55             -> LB Nagar to Raidurg
 *   java MetroSimulation 0 55 --fast      -> same, without the animation delay
 */
class MetroSimulation {

    static final String[] STATIONS = {
        "LBnagar","Victoria_memorial","chaitanyapuri","Dilshukhnagar","moosrambagh","NewMarket",
        "malakpet","MGbusstation","Osmania_medical","Gandhibhavan","Nampally","Assembly",
        "Lakdikapool","Khairtabad","Irrummanzil","Panjagutta","Ameerpet","SRnagar","ESIhospital",
        "Erragadda","Bharatnagar","Moosapet","DR_BRambedkar","Kukatpally","KPHBcolony",
        "JNTUcollege","Miyapur","Sultanbazar","Narayanguda","Chikkadpali","RTCxroads",
        "Musheerabad","Gandhihospital","Secbadwest","Paradeground","Nagole","Uppal","stadium",
        "NGRI","Habsiguda","Tarnaka","Mettuguda","Secbadeast","Paradise","Rasoolpura",
        "PrakashNagar","Begumpet","MathuraNagar","Yusufguda","Jubliehills","JH-checkpost",
        "Peddamagudi","Madhapur","Dugamcheruvu","Hitechcity","raidurg"
    };

    static final int N = STATIONS.length;

    static final String[] LINE_NAMES = { "Red Line", "Green Line", "Blue Line" };
    static final int LINES = LINE_NAMES.length;

    /*
     * Each line is written out as the real running order of the corridor, so an
     * interchange is simply a station that shows up on more than one line.
     * Ameerpet      -> Red + Blue
     * Parade Ground -> Green + Blue
     * MG Bus Station-> Red + Green
     */
    static final int[][] LINE_STATIONS = {
        // Red: LB Nagar -> Miyapur
        { 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26 },
        // Green: Parade Ground -> MG Bus Station
        { 34,33,32,31,30,29,28,27,7 },
        // Blue: Nagole -> Raidurg
        { 35,36,37,38,39,40,41,42,34,43,44,45,46,16,47,48,49,50,51,52,53,54,55 }
    };

    static final int HOP_MINUTES = 2;          // running time between two stations
    static final int INTERCHANGE_MINUTES = 6;  // walk across the concourse + wait for the next train
    static final int DWELL_SECONDS = 25;       // doors open at each station

    /** A move in the search space: ride one hop, or change lines standing still. */
    static class Edge {
        final int to;      // state index
        final int cost;    // minutes
        Edge(int to, int cost) { this.to = to; this.cost = cost; }
    }

    /*
     * The search runs over (station, line) states rather than plain stations.
     * Without the line in the state there is nowhere to charge the interchange
     * penalty, and the router would happily "change trains" for free.
     */
    static int state(int station, int line) { return station * LINES + line; }
    static int stationOf(int state)         { return state / LINES; }
    static int lineOf(int state)            { return state % LINES; }

    static List<List<Edge>> buildGraph() {
        List<List<Edge>> graph = new ArrayList<>();
        for (int i = 0; i < N * LINES; i++) graph.add(new ArrayList<Edge>());

        // Riding: consecutive stations on the same line, both directions.
        for (int line = 0; line < LINES; line++) {
            int[] seq = LINE_STATIONS[line];
            for (int i = 0; i + 1 < seq.length; i++) {
                int a = state(seq[i], line);
                int b = state(seq[i + 1], line);
                graph.get(a).add(new Edge(b, HOP_MINUTES));
                graph.get(b).add(new Edge(a, HOP_MINUTES));
            }
        }

        // Changing: same station, different line.
        for (int st = 0; st < N; st++) {
            List<Integer> onLines = linesAt(st);
            for (int from : onLines) {
                for (int to : onLines) {
                    if (from != to) {
                        graph.get(state(st, from)).add(new Edge(state(st, to), INTERCHANGE_MINUTES));
                    }
                }
            }
        }
        return graph;
    }

    static List<Integer> linesAt(int station) {
        List<Integer> found = new ArrayList<>();
        for (int line = 0; line < LINES; line++) {
            for (int st : LINE_STATIONS[line]) {
                if (st == station) { found.add(line); break; }
            }
        }
        return found;
    }

    /** Dijkstra over (station, line) states; returns the cheapest state path from src to dst. */
    static List<Integer> route(List<List<Edge>> graph, int src, int dst) {
        int size = N * LINES;
        int[] dist = new int[size];
        int[] parent = new int[size];
        Arrays.fill(dist, Integer.MAX_VALUE);
        Arrays.fill(parent, -1);

        PriorityQueue<int[]> pq = new PriorityQueue<>(new Comparator<int[]>() {
            public int compare(int[] a, int[] b) { return Integer.compare(a[0], b[0]); }
        });

        for (int line : linesAt(src)) {
            dist[state(src, line)] = 0;
            pq.add(new int[] { 0, state(src, line) });
        }

        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int d = top[0], u = top[1];
            if (d > dist[u]) continue;
            for (Edge e : graph.get(u)) {
                if (d + e.cost < dist[e.to]) {
                    dist[e.to] = d + e.cost;
                    parent[e.to] = u;
                    pq.add(new int[] { dist[e.to], e.to });
                }
            }
        }

        int best = -1;
        for (int line : linesAt(dst)) {
            int s = state(dst, line);
            if (dist[s] != Integer.MAX_VALUE && (best == -1 || dist[s] < dist[best])) best = s;
        }
        if (best == -1) return Collections.emptyList();

        LinkedList<Integer> path = new LinkedList<>();
        for (int cur = best; cur != -1; cur = parent[cur]) path.addFirst(cur);
        return path;
    }

    /** Hyderabad Metro style distance slabs, priced off the number of stations travelled. */
    static int fare(int hops) {
        if (hops <= 2)  return 10;
        if (hops <= 4)  return 15;
        if (hops <= 6)  return 25;
        if (hops <= 9)  return 30;
        if (hops <= 14) return 40;
        if (hops <= 21) return 50;
        return 60;
    }

    static void pause(long millis) {
        if (millis <= 0) return;
        try { Thread.sleep(millis); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    static String pad(String s, int width) {
        StringBuilder sb = new StringBuilder(s);
        while (sb.length() < width) sb.append(' ');
        return sb.toString();
    }

    static void banner(String text) {
        StringBuilder bar = new StringBuilder();
        for (int i = 0; i < text.length() + 4; i++) bar.append('=');
        System.out.println(bar);
        System.out.println("  " + text);
        System.out.println(bar);
    }

    /** Pre-trip summary: the legs, where to change, total time and fare. */
    static void printItinerary(List<Integer> path) {
        banner("JOURNEY PLAN");

        int hops = 0, minutes = 0, changes = 0;
        List<int[]> legs = new ArrayList<>(); // { line, firstIndexInPath, lastIndexInPath }

        for (int i = 0; i + 1 < path.size(); i++) {
            int a = path.get(i), b = path.get(i + 1);
            if (stationOf(a) == stationOf(b)) {          // interchange
                minutes += INTERCHANGE_MINUTES;
                changes++;
            } else {                                     // one hop of track
                minutes += HOP_MINUTES;
                hops++;
            }
        }

        int legStart = 0;
        for (int i = 1; i < path.size(); i++) {
            if (lineOf(path.get(i)) != lineOf(path.get(i - 1))) {
                legs.add(new int[] { lineOf(path.get(legStart)), legStart, i - 1 });
                legStart = i;
            }
        }
        legs.add(new int[] { lineOf(path.get(legStart)), legStart, path.size() - 1 });

        int legNo = 1;
        for (int[] leg : legs) {
            int from = stationOf(path.get(leg[1]));
            int to = stationOf(path.get(leg[2]));
            int stops = leg[2] - leg[1];
            if (stops == 0) continue;
            System.out.println("Leg " + legNo + ": " + pad(LINE_NAMES[leg[0]], 11)
                    + STATIONS[from] + "  ->  " + STATIONS[to]
                    + "   (" + stops + " stop" + (stops == 1 ? "" : "s") + ", "
                    + (stops * HOP_MINUTES) + " min)");
            legNo++;
        }

        System.out.println();
        System.out.println("Stations travelled : " + hops);
        System.out.println("Line changes       : " + changes);
        System.out.println("Travel time        : ~" + minutes + " min");
        System.out.println("Fare               : Rs " + fare(hops));
        System.out.println();
    }

    /** Plays the trip back one station at a time. */
    static void simulate(List<Integer> path, long tickMillis) {
        banner("LIVE RUN");

        int clockSeconds = 0;
        int currentLine = lineOf(path.get(0));
        System.out.println("[" + clock(clockSeconds) + "] Boarding the " + LINE_NAMES[currentLine]
                + " at " + STATIONS[stationOf(path.get(0))]);
        System.out.println();
        pause(tickMillis);

        for (int i = 0; i + 1 < path.size(); i++) {
            int a = path.get(i), b = path.get(i + 1);

            if (stationOf(a) == stationOf(b)) {
                clockSeconds += INTERCHANGE_MINUTES * 60;
                System.out.println();
                System.out.println("  *** CHANGE HERE: " + STATIONS[stationOf(a)] + " ***");
                System.out.println("      Leave the " + LINE_NAMES[lineOf(a)]
                        + ", walk across to the " + LINE_NAMES[lineOf(b)]
                        + " platform (" + INTERCHANGE_MINUTES + " min)");
                System.out.println("[" + clock(clockSeconds) + "] Now on the " + LINE_NAMES[lineOf(b)]);
                System.out.println();
                currentLine = lineOf(b);
                pause(tickMillis * 2);
                continue;
            }

            clockSeconds += HOP_MINUTES * 60 + DWELL_SECONDS;
            boolean last = (i + 2 == path.size());

            System.out.println("[" + clock(clockSeconds) + "] " + pad(STATIONS[stationOf(a)], 20)
                    + track(currentLine) + "  " + STATIONS[stationOf(b)]
                    + (last ? "   <- you get off here" : ""));
            pause(tickMillis);
        }

        System.out.println();
        System.out.println("[" + clock(clockSeconds) + "] Arrived at "
                + STATIONS[stationOf(path.get(path.size() - 1))] + ". Mind the gap.");
        System.out.println();
    }

    static String track(int line) {
        String marker = (line == 0) ? "R" : (line == 1) ? "G" : "B";
        return "o--[" + marker + "]-->";
    }

    /** Elapsed time since boarding, as T+mm:ss. */
    static String clock(int seconds) {
        return String.format("T+%02d:%02d", seconds / 60, seconds % 60);
    }

    static void printStationMenu() {
        System.out.println("STATION LIST");
        System.out.println();
        for (int i = 0; i < N; i++) {
            System.out.print(pad(i + ". " + STATIONS[i], 30));
            if (i % 3 == 2) System.out.println();
        }
        System.out.println();
        System.out.println();
    }

    static int readStation(Scanner sc, String label) {
        while (true) {
            System.out.print("Enter the " + label + " station number (0-" + (N - 1) + "): ");
            if (!sc.hasNextInt()) {
                if (!sc.hasNext()) { System.out.println(); System.exit(0); }
                System.out.println("  That is not a number. Try again.");
                sc.next();
                continue;
            }
            int v = sc.nextInt();
            if (v < 0 || v >= N) {
                System.out.println("  No station with that number. Try again.");
                continue;
            }
            return v;
        }
    }

    public static void main(String[] args) {
        long tickMillis = 450;
        List<String> positional = new ArrayList<>();
        for (String arg : args) {
            if (arg.equals("--fast")) tickMillis = 0;
            else positional.add(arg);
        }

        List<List<Edge>> graph = buildGraph();

        int src, dst;
        if (positional.size() >= 2) {
            src = Integer.parseInt(positional.get(0));
            dst = Integer.parseInt(positional.get(1));
            if (src < 0 || src >= N || dst < 0 || dst >= N) {
                System.out.println("Station numbers must be between 0 and " + (N - 1) + ".");
                return;
            }
        } else {
            banner("HYDERABAD METRO - JOURNEY SIMULATOR");
            printStationMenu();
            Scanner sc = new Scanner(System.in);
            src = readStation(sc, "SOURCE");
            dst = readStation(sc, "DESTINATION");
            System.out.println();
        }

        if (src == dst) {
            System.out.println("You are already at " + STATIONS[src] + ".");
            return;
        }

        List<Integer> path = route(graph, src, dst);
        if (path.isEmpty()) {
            System.out.println("No route found between " + STATIONS[src] + " and " + STATIONS[dst] + ".");
            return;
        }

        System.out.println(STATIONS[src] + "  ==>  " + STATIONS[dst]);
        System.out.println();
        printItinerary(path);
        simulate(path, tickMillis);
    }
}
