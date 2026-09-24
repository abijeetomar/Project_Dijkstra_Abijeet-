/*
 * A range input that reports every pixel of the drag as a live change, then one
 * final settled change on release. The live ones skip the route animation; the
 * settled one gets it.
 */
export default function LiveSlider({ value, min, max, onLive, onSettle, ...rest }) {
  return (
    <input
      type="range" min={min} max={max} step="1" value={value}
      onChange={(e) => onLive(Number(e.target.value))}
      onPointerUp={(e) => onSettle(Number(e.currentTarget.value))}
      onKeyUp={(e) => onSettle(Number(e.currentTarget.value))}
      {...rest}
    />
  );
}
