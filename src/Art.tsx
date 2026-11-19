export function Gem({
  color = "#5ee6c8",
  size = 26,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg
      className="gem-icon"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 14 8-9h14l8 9-15 22Z"
        fill={color}
        stroke="#0c3b4a"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="m5 14 15 22-6-22 6-9 6 9-6 22 15-22Z"
        fill="none"
        stroke="#0c3b4a"
        strokeOpacity=".35"
        strokeWidth="1.5"
      />
      <path d="m13 6-5 7h8l4-7Z" fill="white" fillOpacity=".55" />
    </svg>
  );
}
export function Star({
  on = true,
  size = 30,
}: {
  on?: boolean;
  size?: number;
}) {
  return (
    <svg
      className={`star ${on ? "on" : "off"}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <path
        d="M20 3.5 25 14l11.500 1.500-8.400 8 2.100 11.400L20 29.400 9.800 34.900l2.100-11.400-8.400-8L15 14Z"
        fill={on ? "#ffd23f" : "#ffffff"}
        fillOpacity={on ? 1 : 0.22}
        stroke={on ? "#a0620a" : "#ffffff"}
        strokeOpacity={on ? 1 : 0.5}
        strokeWidth="2.500"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Stars({ count, size = 22 }: { count: number; size?: number }) {
  return (
    <span className="stars" role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} on={n <= count} size={size} />
      ))}
    </span>
  );
}
export function Bolt({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M23 3 8 23h9l-2 14 16-21h-9Z"
        fill="#ffd23f"
        stroke="#a0620a"
        strokeWidth="2.500"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Pickaxe({
  color = "#b0c7c8",
  className = "",
}: {
  color?: string;
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="m25 86 43-57"
        stroke="#62462f"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="m25 83 40-54"
        stroke="#c18d55"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M29 17C52 11 78 23 87 47L65 34 52 28 28 31Z"
        fill={color}
        stroke="#263c3a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m37 18 26 8 16 13"
        fill="none"
        stroke="white"
        strokeOpacity=".5"
        strokeWidth="3"
      />
    </svg>
  );
}
export type Pose =
  | "wave"
  | "cheer"
  | "think"
  | "swing"
  | "drill-side"
  | "drill-down"
  | "drill-up";
export function Miner({
  pose = "wave",
  className = "",
}: {
  pose?: Pose;
  className?: string;
}) {
  return (
    <img
      className={`miner ${className}`}
      src={`./art/miner-${pose}.webp`}
      alt=""
      draggable={false}
    />
  );
}
export function Sticker({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  return (
    <img
      className={`sticker ${className}`}
      src={`./art/stickers/${id}.svg`}
      alt=""
      draggable={false}
    />
  );
}
export function Rock({ fraction = 0 }: { fraction?: number }) {
  return (
    <svg className="rock-art" viewBox="0 0 400 280" aria-hidden="true">
      <image href="./art/gem-rock.webp" width="400" height="280" />
      {fraction > 0 && (
        <path
          d="m201 91-14 34 25 22-19 30 11 37m7-67 28-15 14 8m-60 36-27 5-11 21"
          stroke="#eaffff"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          opacity={0.5 + fraction * 0.5}
        />
      )}
      {fraction > 0.45 && (
        <path
          d="m187 125-38-9-21 12m76 86 31 12 13 22m-9-116 13-25 29-7"
          stroke="#eaffff"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
