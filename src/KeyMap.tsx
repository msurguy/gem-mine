import { keycaps } from "./keyboardLayout";
import { fingerForKey, keyLabel } from "./fingers";

export function KeyFaces({ target }: { target?: string }) {
  return (
    <>
      {keycaps.map(({ key, x, y, w, h }) => {
        const finger =
          key.length === 1 && x < 900 ? fingerForKey(key) : undefined;
        const selected = !!finger && key === target;
        return (
          <g
            key={x + ":" + y}
            data-key={key}
            transform={`translate(${x} ${y})`}
          >
            <rect
              width={w}
              height={h}
              rx="7"
              fill={selected ? "#fcc84b" : finger ? "#dce9ee" : "#586483"}
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
  onClick,
}: {
  target?: string;
  onClick: () => void;
}) {
  return (
    <svg
      className="full-key-map"
      viewBox="-10 -82 1390 389"
      role="img"
      aria-label={
        target
          ? `Full US keyboard. Find ${keyLabel(target)}.`
          : "Full US keyboard"
      }
      onClick={onClick}
    >
      <KeyFaces target={target} />
    </svg>
  );
}
