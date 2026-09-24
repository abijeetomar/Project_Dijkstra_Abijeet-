import { LINE } from "../metro/network.js";

export default function Footer({ message }) {
  return (
    <footer id="foot">
      <div id="say">{message}</div>
      <div className="legend">
        <i><span className="dot" />unreached</i>
        <i><span className="dot f" />in queue</i>
        <i><span className="dot c" />popped now</i>
        <i><span className="dot s" />settled</i>
        {LINE.map((l) => (
          <i key={l.name}><span className="bar3" style={{ background: l.css }} />{l.short}</i>
        ))}
      </div>
    </footer>
  );
}
