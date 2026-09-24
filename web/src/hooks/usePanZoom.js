import { useCallback, useEffect, useRef, useState } from "react";

/** Drag to pan, wheel to zoom at the cursor. Ignores presses on interactive marks. */
export function usePanZoom(svgRef, initial, { ignore = "" } = {}) {
  const [view, setView] = useState(initial);
  const drag = useRef(null);

  const scaleFor = useCallback(() => {
    const el = svgRef.current;
    if (!el) return 1;
    const r = el.getBoundingClientRect();
    return Math.max(view.w / r.width, view.h / r.height);
  }, [svgRef, view.w, view.h]);

  const zoomAt = useCallback((factor, cx, cy) => {
    setView((v) => {
      const w = Math.max(300, Math.min(2600, v.w * factor));
      const k = w / v.w;
      return { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w, h: v.h * k };
    });
  }, []);

  const centreZoom = useCallback((f) => zoomAt(f, view.x + view.w / 2, view.y + view.h / 2), [zoomAt, view]);
  const fit = useCallback(() => setView(initial), [initial]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (ev) => {
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      const s = Math.max(view.w / r.width, view.h / r.height);
      const x = view.x + view.w / 2 + (ev.clientX - (r.left + r.width / 2)) * s;
      const y = view.y + view.h / 2 + (ev.clientY - (r.top + r.height / 2)) * s;
      zoomAt(ev.deltaY > 0 ? 1.12 : 0.89, x, y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [svgRef, view, zoomAt]);

  const onPointerDown = (ev) => {
    if (ignore && ev.target.closest(ignore)) return;
    drag.current = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y };
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
  };
  const onPointerMove = (ev) => {
    if (!drag.current) return;
    const s = scaleFor();
    setView((v) => ({ ...v, x: drag.current.vx - (ev.clientX - drag.current.x) * s,
                            y: drag.current.vy - (ev.clientY - drag.current.y) * s }));
  };
  const endPan = () => { drag.current = null; };

  return {
    view,
    panning: drag.current !== null,
    viewBox: `${view.x} ${view.y} ${view.w} ${view.h}`,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endPan, onPointerCancel: endPan },
    zoomIn: () => centreZoom(0.8),
    zoomOut: () => centreZoom(1.25),
    fit,
  };
}
