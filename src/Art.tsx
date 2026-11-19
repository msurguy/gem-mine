export function Gem({
  color = "#a3dbbd",
  size = 26,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path d="m5 14 8-9h14l8 9-15 22Z" fill={color} />
      <path
        d="m5 14 15 22-6-22 6-9 6 9-6 22 15-22Z"
        fill="none"
        stroke="#173e37"
        strokeOpacity=".45"
        strokeWidth="1.8"
      />
      <path d="M5 14h30" stroke="white" strokeOpacity=".45" />
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
export function Miner() {
  return <img className="miner" src="./art/miner.webp" alt="" />;
}
export function Rock({ fraction = 0 }: { fraction?: number }) {
  return (
    <svg className="rock-art" viewBox="0 0 400 280" aria-hidden="true">
      <image href="./art/gem-rock.webp" width="400" height="280" />
      {fraction > 0 && (
        <path
          d="m201 91-14 34 25 22-19 30 11 37m7-67 28-15 14 8m-60 36-27 5-11 21"
          stroke="#8bf2f3"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity={0.5 + fraction * 0.5}
        />
      )}
      {fraction > 0.45 && (
        <path
          d="m187 125-38-9-21 12m76 86 31 12 13 22m-9-116 13-25 29-7"
          stroke="#8bf2f3"
          strokeWidth="4"
          fill="none"
        />
      )}
    </svg>
  );
}
