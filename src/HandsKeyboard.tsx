import { KeyFaces } from "./KeyMap";
import { fingerForKey, fingers, keyLabel, keyPosition } from "./fingers";

export type Phase = "home" | "reach" | "press";
type Point = { x: number; y: number };
const fingerHomes = { left: ["a", "s", "d", "f"], right: [";", "l", "k", "j"] };

// Draw the back of a curled hand as one silhouette. Each web stays joined to
// its knuckles as the two curves on either side of the fingertip articulate.
function silhouette(tips: Point[], shift: Point, thumb: Point) {
  const palm = (x: number, y: number) => `${x + shift.x} ${y + shift.y}`;
  let path = `M ${palm(70, 159)} C ${palm(68, 145)} ${palm(38, 130)} ${palm(31, 98)}`;
  const widths = [9, 11, 12, 11];
  tips.forEach(({ x, y }, i) => {
    const w = widths[i],
      base = 39 + i * 38;
    path += ` C ${palm(base - w, 77)} ${x - w - 1} ${y + 25} ${x - w} ${y + 7}
      C ${x - w} ${y - 6} ${x + w - 1} ${y - 8} ${x + w} ${y + 6}
      C ${x + w + 1} ${y + 22} ${palm(base + w, 61)} ${palm(base + w + 5, 67)}`;
    if (i < 3) path += ` Q ${palm(base + 20, 76)} ${palm(base + 25, 61)}`;
  });
  return (
    path +
    ` C ${palm(167, 83)} ${palm(166, 108)} ${palm(180, 119)}
    C ${palm(192, 128)} ${thumb.x - 21} ${thumb.y + 13} ${thumb.x - 9} ${thumb.y + 1}
    C ${thumb.x + 1} ${thumb.y - 9} ${thumb.x + 12} ${thumb.y - 5} ${thumb.x + 11} ${thumb.y + 4}
    C ${thumb.x + 10} ${thumb.y + 14} ${palm(208, 139)} ${palm(196, 145)}
    C ${palm(179, 155)} ${palm(154, 144)} ${palm(140, 159)} Z`
  );
}
function MinerHand({
  right,
  target,
  phase,
}: {
  right: boolean;
  target: string;
  phase: Phase;
}) {
  const homes = fingerHomes[right ? "right" : "left"];
  const origin = keyPosition(homes[0]),
    sign = right ? -1 : 1;
  const owner = fingerForKey(target)!;
  const activeIndex = homes.indexOf(owner.home);
  const thumbActive = !right && owner.id === "thumb";
  const reaching = phase !== "home";
  const destination = keyPosition(target);
  const restX = [10, 63, 117, 171];
  const offsets = [11, -1, -8, 2];
  const tips = homes.map((_, i) => {
    const active = reaching && activeIndex === i;
    return {
      x: active ? sign * (destination.x - origin.x) : restX[i],
      y: active
        ? destination.y - origin.y + (phase === "press" ? 5 : 0)
        : offsets[i],
    };
  });
  const shift =
    activeIndex < 0
      ? { x: 0, y: 0 }
      : {
          x: (tips[activeIndex].x - restX[activeIndex]) * 0.32,
          y: (tips[activeIndex].y - offsets[activeIndex]) * 0.34,
        };
  const thumb = {
    x: 227 + shift.x * 0.5,
    y: thumbActive && reaching ? 121 : 108 + shift.y * 0.45,
  };
  const outline = silhouette(tips, shift, thumb).replace(/\s+/g, " ");
  return (
    <g
      pointerEvents="none"
      transform={`translate(${origin.x} ${origin.y}) scale(${sign} 1)`}
    >
      <path
        className="hand-outline"
        d={outline}
        style={{ d: `path("${outline}")` }}
        fill="url(#hand-skin)"
        fillOpacity=".48"
        strokeOpacity=".83"
        stroke="#744735"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <g
        className="hand-joint"
        style={{ transform: `translate(${shift.x}px,${shift.y}px)` }}
      >
        <path
          d="M68 149 Q104 160 142 149 L146 175 Q108 185 66 176Z"
          fill="url(#hand-cuff)"
          stroke="#174c56"
          strokeWidth="3"
        />
        <path
          d="M72 154 Q107 164 139 154"
          fill="none"
          stroke="#a6e4d4"
          strokeWidth="3"
          strokeDasharray="6 5"
        />
        <path d="M98 166 105 162 112 166 105 174Z" fill="#ffdb79" />
        <path
          d="M40 82q4 -2 9 0 M76 77q5 -2 10 0 M113 76q5 -2 10 0 M151 79q4 -2 9 0"
          fill="none"
          stroke="#dea580"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      {[...tips, thumb].map(({ x, y }, i) => {
        const finger =
          i === 4 ? fingers[fingers.length - 1] : fingerForKey(homes[i])!;
        const active = i === 4 ? thumbActive : activeIndex === i;
        return (
          <g
            key={i}
            className="hand-joint"
            data-finger={
              i === 4 ? (right ? "right-thumb" : "left-thumb") : finger.id
            }
            data-phase={active ? phase : "home"}
            data-contact={active && phase === "press" ? target : undefined}
            style={{ transform: `translate(${x}px,${y}px)` }}
          >
            <g
              opacity={active ? 0.78 : 0.32}
              transform={
                i === 4 ? "rotate(53) scale(.73)" : "rotate(-6) scale(.74)"
              }
            >
              <path
                d="M-9 8 Q-10 -3 -1 -4 Q9 -5 10 6 L10 12 Q2 18 -8 13Z"
                fill={active ? "#ffe177" : "#ffd4bd"}
                stroke={active ? "#77572b" : "#c78f73"}
                strokeWidth="1.7"
              />
              <path
                d="M-5 2q3 -3 7 -2"
                fill="none"
                stroke="#fff2dc"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {i !== 4 && (
                <path
                  d="M-6 31q6 -3 12 0"
                  fill="none"
                  stroke="#ca8966"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </g>
            {active && (
              <g transform={`scale(${sign} 1)`}>
                <path d="M-11 -13 L0 -5 11 -13" fill="#ffda6c" />
                <rect
                  x={target === " " ? -31 : -18}
                  y="-42"
                  width={target === " " ? 62 : 36}
                  height="30"
                  rx="9"
                  fill="#ffda6c"
                  stroke="#543c28"
                  strokeWidth="2"
                />
                <text
                  x="0"
                  y="-21"
                  textAnchor="middle"
                  fontSize="20"
                  fontWeight="800"
                  fill="#322840"
                >
                  {keyLabel(phase === "home" ? finger.home : target)}
                </text>
                {phase === "press" && (
                  <path
                    d="M-24 -2l-7 -5 M24 -2l7 -5"
                    stroke="#fff1a8"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                )}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}
export function HandsKeyboard({
  target,
  phase,
  full,
  className = "hands-keyboard",
  onClick,
}: {
  target: string;
  phase: Phase;
  full: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const owner = fingerForKey(target)!;
  return (
    <svg
      className={className}
      onClick={onClick}
      viewBox={full ? "-18 -88 1410 443" : "-18 -12 935 365"}
      role="img"
      aria-labelledby="hands-title hands-desc"
    >
      <title id="hands-title">Finger positions on a QWERTY keyboard</title>
      <desc id="hands-desc">
        Looking down at your hands. {owner.name} rests on {keyLabel(owner.home)}
        , taps {keyLabel(target)}, and comes home.
      </desc>
      <defs>
        <linearGradient
          id="hand-skin"
          x2=".3"
          y2="1"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="#ffddbb" />
          <stop offset=".58" stopColor="#f4be94" />
          <stop offset="1" stopColor="#dd9b74" />
        </linearGradient>
        <linearGradient id="hand-cuff" x2=".2" y2="1">
          <stop stopColor="#459e9b" />
          <stop offset="1" stopColor="#216575" />
        </linearGradient>
        <clipPath id="keyboard-frame">
          <rect x="-10" y="-82" width={full ? 1400 : 912} height="400" />
        </clipPath>
      </defs>
      <g clipPath="url(#keyboard-frame)">
        <KeyFaces target={target} />
      </g>
      {(owner.id.startsWith("r") ? [false, true] : [true, false]).map(
        (right) => (
          <MinerHand
            key={String(right)}
            right={right}
            target={target}
            phase={phase}
          />
        ),
      )}
    </svg>
  );
}
