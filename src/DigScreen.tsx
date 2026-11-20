import { useEffect, useState } from "react";
import type { Dispatch } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Keyboard,
  RotateCcw,
} from "lucide-react";
import { drillReady } from "./game";
import type { Action, ProgressV2 } from "./game";
import {
  DIG_LEVELS,
  DIG_ROWS,
  DIG_WIDTH,
  DRILL_CHARGE,
  DRILL_COST,
  HARD_LEVEL,
  ROWS_PER_LEVEL,
  cellOf,
  facingCell,
  isOpen,
  levelOfRow,
  lootAt,
  swing,
  swingsFor,
} from "./dig";
import type { Facing, Treasure } from "./dig";
import { sfx } from "./audio";
import type { Sfx } from "./audio";
import { Bolt, Gem, Miner, Sticker } from "./Art";

/** Shinier, rarer finds sound bigger. */
function findSound(id: string, kind: Treasure["kind"]): Sfx {
  if (id === "coin" || id === "gold") return "find-coin";
  if (kind === "ancient") return "find-ancient";
  return kind === "gem" ? "find-gem" : "find-common";
}
/** Rows of the dig visible at once. */
const VIEW_ROWS = 7;
const arrows: Record<string, Facing> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};
type Note =
  | { kind: "find"; treasure: Treasure; fresh: boolean; n: number }
  | { kind: "too-hard" | "no-energy"; n: number }
  | null;

export default function DigScreen({
  progress,
  dispatch,
  onMap,
  onShed,
}: {
  progress: ProgressV2;
  dispatch: Dispatch<Action>;
  onMap: () => void;
  onShed: () => void;
}) {
  const { dig, energy } = progress,
    drill = drillReady(progress),
    sound = progress.settings.sound;
  const [note, setNote] = useState<Note>(null),
    [swings, setSwings] = useState(0);
  // Space should dig straight away, not press the menu button that brought us here.
  useEffect(() => (document.activeElement as HTMLElement | null)?.blur(), []);
  const pose = !drill
    ? "swing"
    : dig.face === "up"
      ? "drill-up"
      : dig.face === "down"
        ? "drill-down"
        : "drill-side";
  const facing = facingCell(dig),
    depth = levelOfRow(dig.y);
  function step(face: Facing) {
    dispatch({ type: "dig-move", face });
  }
  function hit() {
    const out = swing(dig, energy, drill),
      n = (note?.n ?? 0) + 1;
    if (out.kind === "nothing") return;
    setSwings(swings + 1);
    if (out.kind === "too-hard" || out.kind === "no-energy") {
      if (sound) sfx(out.kind);
      return setNote({ kind: out.kind, n });
    }
    if (sound) {
      const stone = swingsFor(facing!.y, false) > 1;
      sfx(
        out.kind === "crack"
          ? "crack"
          : drill
            ? "drill"
            : stone
              ? "dig-stone"
              : "dig-earth",
      );
      if (out.kind === "broke" && out.loot) {
        const { id, kind } = out.loot,
          fresh = !progress.finds[id];
        sfx(findSound(id, kind));
        if (fresh) sfx(kind === "ancient" ? "find-new-ancient" : "find-new");
      }
    }
    if (out.kind === "broke" && out.loot) {
      setNote({
        kind: "find",
        treasure: out.loot,
        fresh: !progress.finds[out.loot.id],
        n,
      });
    }
    dispatch({ type: "dig-swing" });
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const face = arrows[e.key];
      if (face) {
        e.preventDefault();
        step(face);
      } else if (e.key === " ") {
        if ((e.target as HTMLElement).closest?.("button, a")) return;
        e.preventDefault();
        hit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  // Keep the miner in the middle of the window, without scrolling past the ends.
  const top = Math.max(
    0,
    Math.min(DIG_ROWS - VIEW_ROWS, dig.y - Math.floor(VIEW_ROWS / 2)),
  );
  const cells = [];
  for (let y = 0; y < DIG_ROWS; y++)
    for (let x = 0; x < DIG_WIDTH; x++) {
      const cell = cellOf(x, y),
        open = isOpen(dig, x, y),
        level = levelOfRow(y);
      // A sparkle shows on a treasure block once the miner has dug next to it.
      const shiny =
        !open &&
        !!lootAt(dig.seed, cell) &&
        (isOpen(dig, x - 1, y) ||
          isOpen(dig, x + 1, y) ||
          isOpen(dig, x, y - 1) ||
          isOpen(dig, x, y + 1));
      cells.push(
        <div
          key={cell}
          className={[
            "cell",
            y === 0 ? "sky" : open ? "dug" : `block depth-${level}`,
            !open && level >= HARD_LEVEL ? "hard" : "",
            !open && y === 1 ? "grass" : "",
            facing?.cell === cell && !open ? "aimed" : "",
            dig.crackCell === cell ? "cracked" : "",
          ].join(" ")}
          style={{ left: `${(x / DIG_WIDTH) * 100}%`, top: `${y * 100}%` }}
        >
          {shiny && <span className="glint">✦</span>}
          {x === 0 && y > 0 && (y - 1) % ROWS_PER_LEVEL === 0 && (
            <span className="depth-tag">Level {level}</span>
          )}
        </div>,
      );
    }
  const found = Object.values(progress.finds).reduce((a, b) => a + b, 0);
  return (
    <div className="dig">
      <section
        className="shaft"
        aria-label={`The dig. You are at depth level ${depth} of ${DIG_LEVELS}.`}
      >
        <div
          className="shaft-rows"
          style={{ transform: `translateY(${-top * 100}%)` }}
        >
          {cells}
          <div
            className={`digger face-${dig.face}`}
            style={{
              left: `${(dig.x / DIG_WIDTH) * 100}%`,
              top: `${dig.y * 100}%`,
            }}
          >
            <span key={swings} className={swings ? "swinging" : ""}>
              <Miner pose={pose} className={`dig-${pose}`} />
            </span>
          </div>
          {note?.kind === "find" && (
            <div
              key={note.n}
              className="find-pop"
              style={{
                left: `${((dig.x + 0.5) / DIG_WIDTH) * 100}%`,
                top: `${dig.y * 100}%`,
              }}
            >
              <Sticker id={note.treasure.id} />
            </div>
          )}
        </div>
      </section>
      <aside className="side">
        <section className="card dig-status">
          <h1>The dig</h1>
          <div className="meters">
            <span className="pill">
              <Bolt size={24} />
              <strong data-testid="dig-energy">{energy}</strong> dig power
            </span>
            <span className="pill">
              {depth ? (
                <>
                  Level <strong>{depth}</strong> of {DIG_LEVELS}
                </>
              ) : (
                "Up top"
              )}
            </span>
          </div>
          <div className="note" role="status" key={note?.n}>
            {note?.kind === "find" ? (
              <>
                <Sticker id={note.treasure.id} />
                <p>
                  {note.fresh && <em>New!</em>}
                  <strong>{note.treasure.name}</strong>
                  <span>
                    <Gem size={20} />+{note.treasure.value}
                  </span>
                </p>
              </>
            ) : note?.kind === "too-hard" ? (
              <>
                <Sticker id="drill" />
                <p>
                  <strong>This rock is too hard!</strong>
                  <span>
                    {progress.drill.owned
                      ? `Finish typing levels to power your drill: ${progress.drill.charge} of ${DRILL_CHARGE}.`
                      : `You need a drill. It costs ${DRILL_COST} gems.`}
                  </span>
                  <button className="chunky small" onClick={onShed}>
                    Toolshed
                  </button>
                </p>
              </>
            ) : note?.kind === "no-energy" || energy < 1 ? (
              <>
                <Bolt size={54} />
                <p>
                  <strong>Out of dig power!</strong>
                  <span>Type some rocks to get more.</span>
                  <button className="chunky go small" onClick={onMap}>
                    <Keyboard size={18} /> Go type
                  </button>
                </p>
              </>
            ) : (
              <p className="how">
                Walk with the <strong>arrow keys</strong>. Dig with{" "}
                <strong>Space</strong>. Deeper levels hide rarer treasure.
              </p>
            )}
          </div>
        </section>
        <section className="card pad" aria-label="Dig buttons">
          <div className="dpad">
            <button
              className="chunky up"
              aria-label="Up"
              onClick={(e) => {
                e.currentTarget.blur();
                step("up");
              }}
            >
              <ArrowUp size={24} />
            </button>
            <button
              className="chunky left"
              aria-label="Left"
              onClick={(e) => {
                e.currentTarget.blur();
                step("left");
              }}
            >
              <ArrowLeft size={24} />
            </button>
            <button
              className="chunky down"
              aria-label="Down"
              onClick={(e) => {
                e.currentTarget.blur();
                step("down");
              }}
            >
              <ArrowDown size={24} />
            </button>
            <button
              className="chunky right"
              aria-label="Right"
              onClick={(e) => {
                e.currentTarget.blur();
                step("right");
              }}
            >
              <ArrowRight size={24} />
            </button>
          </div>
          <button
            className="chunky go dig-button"
            onClick={(e) => {
              e.currentTarget.blur();
              hit();
            }}
          >
            Dig!
            <small>Space</small>
          </button>
        </section>
        <div className="dig-foot">
          <button className="chunky quiet small" onClick={onShed}>
            {found} {found === 1 ? "treasure" : "treasures"} found
          </button>
          {dig.dug.length >= 12 && (
            <button
              className="chunky quiet small"
              onClick={() => {
                setNote(null);
                dispatch({ type: "dig-new" });
              }}
            >
              <RotateCcw size={16} /> New dig
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
