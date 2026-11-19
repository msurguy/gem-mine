import { keycaps } from "./keyboardLayout";
import { fingerForKey, keyLabel } from "./fingers";

export function KeyFaces({
  target,
  wrong,
}: {
  target?: string;
  /** A key that was just pressed by mistake; it flashes red. */
  wrong?: string;
}) {
  return (
    <>
      {keycaps.map(({ key, x, y, w, h }) => {
        const finger = key.length === 1 ? fingerForKey(key) : undefined;
        const selected = !!finger && key === target;
        const missed = !!finger && !selected && key === wrong;
        return (
          <g
            key={x + ":" + y}
            data-key={key}
            className={selected ? "key-target" : missed ? "key-wrong" : ""}
            transform={`translate(${x} ${y})`}
          >
            <rect
              width={w}
              height={h}
              rx="7"
              fill={
                selected
                  ? "#ffd23f"
                  : missed
                    ? "#ff8a80"
                    : finger
                      ? "#eef4f7"
                      : "#5b678a"
              }
            />
            {finger && (
              <rect
                x="6"
                y={h - 8}
                width={w - 12}
                height="4"
                rx="2"
                fill={finger.color}
              />
            )}
            <text
              x={w / 2}
              y={h / 2}
              dominantBaseline="central"
              textAnchor="middle"
              className={`key-legend keyboard-key ${selected ? "target" : ""}`}
              fill={finger ? "#18263e" : "white"}
              style={{ fontSize: key.length > 2 ? 17 : 27 }}
            >
              {key.length === 1 ? keyLabel(key) : key}
            </text>
          </g>
        );
      })}
    </>
  );
}
export default function KeyMap({
  target,
  wrong,
}: {
  target?: string;
  wrong?: string;
}) {
  return (
    <svg
      className="keyboard"
      viewBox="-6 -6 912 306"
      role="img"
      aria-label={target ? `Keyboard. Find ${keyLabel(target)}.` : "Keyboard"}
    >
      <KeyFaces target={target} wrong={wrong} />
    </svg>
  );
}
