import { useEffect, useRef, useState } from "react";
import { KeyFaces } from "./KeyMap";
import { fingerForKey, fingers, keyLabel, keyPosition } from "./fingers";

export type Phase = "home" | "reach" | "press";
type Point = { x: number; y: number };

// Both hands are drawn as a left hand, in keyboard coordinates. The right
// hand is the same drawing mirrored about the line between F and J.
const MIRROR = keyPosition("f").x + keyPosition("j").x;
const THUMB = 4;
const INK = "#744735";
/** Pinky to thumb: where each finger joins the palm and how thick it is. */
const anatomy = [
  { home: "a", knuckle: { x: 150, y: 236 }, base: 16, tip: 13.5 },
  { home: "s", knuckle: { x: 196, y: 224 }, base: 18.5, tip: 15.5 },
  { home: "d", knuckle: { x: 246, y: 219 }, base: 19.5, tip: 16 },
  { home: "f", knuckle: { x: 296, y: 226 }, base: 19, tip: 16 },
  { home: " ", knuckle: { x: 306, y: 292 }, base: 21, tip: 17 },
];
const rest: Point[] = anatomy.map(({ home }, i) =>
  i === THUMB
    ? { x: 370, y: 263 }
    : { x: keyPosition(home).x, y: keyPosition(home).y + 4 },
);
const palm: Point[] = [
  [134, 246],
  [142, 225],
  [172, 214],
  [220, 206],
  [270, 206],
  [306, 216],
  [319, 246],
  [327, 288],
  [308, 322],
  [270, 340],
  [202, 340],
  [162, 320],
  [140, 284],
].map(([x, y]) => ({ x, y }));

const n = (v: number) => v.toFixed(1);
const add = (a: Point, b: Point, scale = 1) => ({
  x: a.x + b.x * scale,
  y: a.y + b.y * scale,
});
/** A finger seen from above: two circles joined by their outer tangents. */
function capsule(a: Point, ra: number, b: Point, rb: number) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d <= Math.abs(ra - rb) + 0.01) {
    const [c, r] = ra >= rb ? [a, ra] : [b, rb];
    return `M${n(c.x - r)} ${n(c.y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  }
  const along = Math.atan2(b.y - a.y, b.x - a.x),
    spread = Math.acos((ra - rb) / d);
  const at = (c: Point, r: number, angle: number) =>
    `${n(c.x + r * Math.cos(angle))} ${n(c.y + r * Math.sin(angle))}`;
  const wide = spread > Math.PI / 2 ? 1 : 0;
  return `M${at(a, ra, along + spread)}L${at(b, rb, along + spread)}A${rb} ${rb} 0 ${wide} 0 ${at(b, rb, along - spread)}L${at(a, ra, along - spread)}A${ra} ${ra} 0 ${1 - wide} 0 ${at(a, ra, along + spread)}Z`;
}
/** A closed smooth curve through the points. */
function blob(points: Point[]) {
  const p = (i: number) => points[(i + points.length) % points.length];
  return (
    points
      .map((b, i) => {
        const a = p(i - 1),
          c = p(i + 1),
          d = p(i + 2);
        return `${i ? "" : `M${n(b.x)} ${n(b.y)}`}C${n(b.x + (c.x - a.x) / 6)} ${n(b.y + (c.y - a.y) / 6)} ${n(c.x - (d.x - b.x) / 6)} ${n(c.y - (d.y - b.y) / 6)} ${n(c.x)} ${n(c.y)}`;
      })
      .join("") + "Z"
  );
}

/**
 * Where one hand wants to be: five fingertips, how far the palm has moved,
 * and how hard the working finger is pressing, as a flat list of numbers.
 */
function pose(right: boolean, target: string, phase: Phase) {
  const owner = fingerForKey(target)!;
  const active =
    owner.id === "thumb"
      ? right
        ? -1
        : THUMB
      : owner.id[0] === (right ? "r" : "l")
        ? "prmi".indexOf(owner.id[1])
        : -1;
  const reaching = active >= 0 && phase !== "home";
  const key = keyPosition(target);
  const goal =
    active === THUMB
      ? { x: 380, y: 268 }
      : { x: right ? MIRROR - key.x : key.x, y: key.y + 4 };
  // The palm follows a reaching finger most of the way, as a real hand does.
  const shift =
    reaching && active !== THUMB
      ? {
          x: (goal.x - rest[active].x) * 0.55,
          y: (goal.y - rest[active].y) * 0.6,
        }
      : { x: 0, y: 0 };
  const tips = rest.map((home, i) =>
    reaching && i === active
      ? goal
      : add(home, shift, i === THUMB ? 0.85 : 0.6),
  );
  return {
    active,
    values: [
      ...tips.flatMap((t) => [t.x, t.y]),
      shift.x,
      shift.y,
      reaching && phase === "press" ? 1 : 0,
    ],
  };
}
/** Moves a list of numbers toward its target like weights on springs. */
function useSprings(target: number[]) {
  const [, redraw] = useState(0);
  const state = useRef({ at: target, speed: target.map(() => 0), frame: 0 });
  useEffect(() => {
    const s = state.current;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      s.at = target;
      return redraw((v) => v + 1);
    }
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000) / 2;
      last = now;
      let moving = false;
      for (let half = 0; half < 2; half++)
        s.at = s.at.map((at, i) => {
          // The press is quicker and firmer than the travel.
          const [pull, drag] = i === target.length - 1 ? [900, 38] : [260, 24];
          s.speed[i] += ((target[i] - at) * pull - s.speed[i] * drag) * dt;
          const next = at + s.speed[i] * dt;
          if (Math.abs(target[i] - next) > 0.02 || Math.abs(s.speed[i]) > 0.5)
            moving = true;
          return next;
        });
      if (!moving) s.at = target;
      redraw((v) => v + 1);
      s.frame = moving ? requestAnimationFrame(step) : 0;
    };
    s.frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(s.frame);
  }, [target.join()]);
  return state.current.at;
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
  const side = right ? "right" : "left";
  const { active, values: goal } = pose(right, target, phase);
  const now = useSprings(goal);
  const shift = { x: now[10], y: now[11] },
    press = Math.max(0, Math.min(1.2, now[12]));
  const parts = anatomy.map((bone, i) => {
    const tip = { x: now[i * 2], y: now[i * 2 + 1] };
    const away = Math.hypot(goal[i * 2] - tip.x, goal[i * 2 + 1] - tip.y);
    const working = i === active;
    // A finger rises off the keys while it travels and hovers before a press.
    const lift = Math.max(
      Math.min(1, away / 45),
      working && phase === "reach" ? 0.35 : 0,
    );
    const knuckle = add(bone.knuckle, shift),
      swell = 1 + 0.1 * lift - (working ? 0.07 * press : 0),
      radius = bone.tip * swell;
    return {
      tip,
      knuckle,
      lift,
      radius,
      working,
      angle: Math.atan2(tip.y - knuckle.y, tip.x - knuckle.x),
      shape: capsule(knuckle, bone.base * (1 + 0.04 * lift), tip, radius),
      finger:
        i === THUMB
          ? fingers[fingers.length - 1]
          : fingerForKey(right ? [";", "l", "k", "j"][i] : bone.home)!,
    };
  });
  const palmShape = blob(palm.map((p) => add(p, shift)));
  const shapes = [palmShape, ...parts.map((p) => p.shape)];
  const worker = parts[active];
  return (
    <g
      pointerEvents="none"
      transform={right ? `translate(${MIRROR} 0) scale(-1 1)` : undefined}
    >
      {/* Soft shadows: the whole hand, then each finger by how high it is. */}
      <g fill="#1b1430" opacity=".2">
        <path d={palmShape} transform="translate(5 8)" />
        {parts.map((p, i) => (
          <path
            key={i}
            d={p.shape}
            transform={`translate(${n(4 + 7 * p.lift)} ${n(6 + 10 * p.lift)})`}
          />
        ))}
      </g>
      <g opacity=".66">
        {shapes.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={INK}
            stroke={INK}
            strokeWidth="5"
            strokeLinejoin="round"
          />
        ))}
        {shapes.map((d, i) => (
          <path key={i} d={d} fill="url(#hand-skin)" />
        ))}
        <g transform={`translate(${n(shift.x)} ${n(shift.y)})`}>
          <path
            d="M141 244q8 -7 16 -2 M188 232q9 -7 17 -1 M237 227q9 -7 18 0 M287 233q9 -6 17 0"
            fill="none"
            stroke="#c98b68"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* The sleeve runs off the bottom edge, so a far reach shows an arm. */}
          <path
            d="M174 346 L166 560 L300 560 L292 346Z"
            fill="#216575"
            stroke="#174c56"
            strokeWidth="3"
          />
          <path
            d="M176 320 Q232 334 290 320 L296 352 Q232 366 170 352Z"
            fill="url(#hand-cuff)"
            stroke="#174c56"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M181 327 Q232 340 286 327"
            fill="none"
            stroke="#a6e4d4"
            strokeWidth="3"
            strokeDasharray="6 5"
          />
          <path d="M224 343 232 338 240 343 232 351Z" fill="#ffdb79" />
        </g>
        {parts.map((p, i) => (
          <Finger key={i} {...p} bright={false} />
        ))}
      </g>
      {worker && (
        <>
          <defs>
            {/* Fades in from the knuckle so the bright finger joins the palm. */}
            <linearGradient
              id={`hand-glow-${side}`}
              gradientUnits="userSpaceOnUse"
              x1={n(worker.knuckle.x)}
              y1={n(worker.knuckle.y)}
              x2={n(worker.tip.x)}
              y2={n(worker.tip.y)}
            >
              <stop stopColor="#ffe9c9" stopOpacity="0" />
              <stop offset=".55" stopColor="#ffe9c9" stopOpacity=".9" />
              <stop offset="1" stopColor="#fff3d6" />
            </linearGradient>
            <linearGradient
              id={`hand-line-${side}`}
              gradientUnits="userSpaceOnUse"
              x1={n(worker.knuckle.x)}
              y1={n(worker.knuckle.y)}
              x2={n(worker.tip.x)}
              y2={n(worker.tip.y)}
            >
              <stop stopColor="#5d3524" stopOpacity="0" />
              <stop offset=".55" stopColor="#5d3524" />
            </linearGradient>
          </defs>
          <circle
            cx={n(worker.tip.x)}
            cy={n(worker.tip.y)}
            r={n(worker.radius + 5 + 16 * press)}
            fill="none"
            stroke="#fff1a8"
            strokeWidth={n(5 * (1 - Math.min(1, press)))}
          />
          <path
            d={worker.shape}
            fill={`url(#hand-glow-${side})`}
            stroke={`url(#hand-line-${side})`}
            strokeWidth="3"
          />
          <g
            data-finger={active === THUMB ? `${side}-thumb` : worker.finger.id}
            data-phase={phase}
            data-contact={phase === "press" ? target : undefined}
          >
            <Finger {...worker} bright />
          </g>
          <g
            transform={`translate(${n(worker.tip.x)} ${n(worker.tip.y - worker.radius + 4)}) scale(${right ? -1 : 1} 1)`}
          >
            <path d="M-9 -15 L0 -6 9 -15" fill="#ffda6c" />
            <rect
              x={target === " " ? -31 : -17}
              y="-42"
              width={target === " " ? 62 : 34}
              height="28"
              rx="9"
              fill="#ffda6c"
              stroke="#543c28"
              strokeWidth="2"
            />
            <text
              x="0"
              y="-21.5"
              textAnchor="middle"
              fontSize="19"
              fontWeight="800"
              fill="#322840"
            >
              {keyLabel(phase === "home" ? worker.finger.home : target)}
            </text>
          </g>
        </>
      )}
    </g>
  );
}
/** The nail and the two creases that make a rounded shape read as a finger. */
function Finger({
  tip,
  knuckle,
  angle,
  radius,
  finger,
  bright,
}: {
  tip: Point;
  knuckle: Point;
  angle: number;
  radius: number;
  finger: { color: string };
  bright: boolean;
}) {
  const length = Math.hypot(tip.x - knuckle.x, tip.y - knuckle.y),
    nail = radius * 0.62;
  return (
    <g
      transform={`translate(${n(tip.x)} ${n(tip.y)}) rotate(${n((angle * 180) / Math.PI)})`}
    >
      {[0.36, 0.62].map(
        (back) =>
          length * back > radius + 6 && (
            <path
              key={back}
              d={`M${n(-length * back)} ${n(-radius * 0.55)}q4 ${n(radius * 0.55)} 0 ${n(radius * 1.1)}`}
              fill="none"
              stroke="#c98b68"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ),
      )}
      <path
        d={`M${n(-nail * 1.1)} ${n(-nail)}L${n(nail * 0.25)} ${n(-nail)}A${n(nail)} ${n(nail)} 0 0 1 ${n(nail * 0.25)} ${n(nail)}L${n(-nail * 1.1)} ${n(nail)}Q${n(-nail * 1.45)} 0 ${n(-nail * 1.1)} ${n(-nail)}Z`}
        fill={finger.color}
        stroke={bright ? "#4b2f25" : "#8a5a44"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d={`M${n(-nail * 0.7)} ${n(-nail * 0.45)}L${n(nail * 0.3)} ${n(-nail * 0.45)}`}
        stroke="#fff"
        strokeOpacity=".65"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>
  );
}
export function HandsKeyboard({
  target,
  phase,
  wrong,
}: {
  target: string;
  phase: Phase;
  wrong?: string;
}) {
  const owner = fingerForKey(target)!;
  return (
    <svg
      className="keyboard with-hands"
      viewBox="-18 -46 935 399"
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
          gradientUnits="userSpaceOnUse"
          x1="150"
          y1="120"
          x2="300"
          y2="350"
        >
          <stop stopColor="#ffe2c4" />
          <stop offset=".6" stopColor="#f6c39b" />
          <stop offset="1" stopColor="#e2a27b" />
        </linearGradient>
        <linearGradient id="hand-cuff" x2=".2" y2="1">
          <stop stopColor="#459e9b" />
          <stop offset="1" stopColor="#216575" />
        </linearGradient>
      </defs>
      <KeyFaces target={target} wrong={wrong} />
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
