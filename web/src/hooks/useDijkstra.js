import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createRun, step as stepRun, solve } from "../metro/dijkstra.js";

/*
 * The run is a mutable simulation object held in a ref, with a version counter
 * to drive renders. Copying the typed arrays on every pop would be honest but
 * pointless: nothing outside this hook writes to the run.
 */
export function useDijkstra({ adj, src, dst, scrubbingRef }) {
  const runRef = useRef(null);
  const [version, bump] = useReducer((v) => v + 1, 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(62);
  const [drawKey, setDrawKey] = useState(0);

  if (runRef.current === null) runRef.current = solve(createRun(adj, src, dst));

  const interval = Math.round(420 - speed * 3.95); // 420ms … 25ms

  /* Any change to the weights or the endpoints re-solves at once. While a
     slider or a segment is being dragged the route redraws without animating,
     so scrubbing stays smooth. */
  useEffect(() => {
    const live = scrubbingRef?.current;
    runRef.current = solve(createRun(adj, src, dst), { trace: !live });
    if (!live) setDrawKey((k) => k + 1);
    setPlaying(false);
    bump();
  }, [adj, src, dst, scrubbingRef]);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      const run = runRef.current;
      if (run.finished) { setPlaying(false); return; }
      const event = stepRun(run);
      if (event) run.trace.push(event);
      if (run.finished) { setPlaying(false); setDrawKey((k) => k + 1); }
      bump();
    }, interval);
    return () => clearInterval(id);
  }, [playing, interval]);

  const restart = useCallback(() => {
    runRef.current = createRun(adj, src, dst);
    bump();
    return runRef.current;
  }, [adj, src, dst]);

  const play = useCallback(() => {
    if (src === dst) return;
    if (runRef.current.finished) restart();
    setPlaying((p) => !p);
  }, [restart, src, dst]);

  const stepOnce = useCallback(() => {
    if (src === dst) return;
    setPlaying(false);
    const run = runRef.current.finished ? restart() : runRef.current;
    const event = stepRun(run);
    if (event) run.trace.push(event);
    if (run.finished) setDrawKey((k) => k + 1);
    bump();
  }, [restart, src, dst]);

  const solveAll = useCallback(() => {
    if (src === dst) return;
    setPlaying(false);
    solve(runRef.current.finished ? restart() : runRef.current);
    setDrawKey((k) => k + 1);
    bump();
  }, [restart, src, dst]);

  const reset = useCallback(() => {
    setPlaying(false);
    restart();
    setDrawKey((k) => k + 1);
  }, [restart]);

  return {
    run: runRef.current, version, drawKey,
    playing, play, stepOnce, solveAll, reset,
    speed, setSpeed,
  };
}
