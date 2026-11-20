import type { Dispatch } from "react";
import { Check, Keyboard } from "lucide-react";
import { tools } from "./curriculum";
import { drillReady } from "./game";
import type { Action, ProgressV2 } from "./game";
import { DRILL_CHARGE, DRILL_COST, lootByLevel, treasures } from "./dig";
import { Gem, Pickaxe, Sticker } from "./Art";
import { sfx } from "./audio";

const shelves = [
  { kind: "ore", name: "Ores" },
  { kind: "gem", name: "Gems" },
  { kind: "fossil", name: "Fossils" },
  { kind: "ancient", name: "Ancient treasures" },
] as const;
/** The first depth level where a treasure can turn up. */
const firstLevel = (id: string) =>
  lootByLevel.findIndex((table) => table.some(([t]) => t === id)) + 1;

export function Price({ cost, gems }: { cost: number; gems: number }) {
  return (
    <>
      <Gem size={22} />
      {cost}
    </>
  );
}
export default function ShedScreen({
  progress,
  dispatch,
  onMap,
}: {
  progress: ProgressV2;
  dispatch: Dispatch<Action>;
  onMap: () => void;
}) {
  const { drill, gems, finds } = progress,
    ready = drillReady(progress),
    sound = progress.settings.sound;
  const kinds = treasures.filter((t) => finds[t.id]).length;
  return (
    <div className="shed">
      <h1>Toolshed</h1>
      <section className="card drill-card" aria-label="Drill">
        <Sticker id="drill" className={drill.owned ? "" : "unowned"} />
        <div>
          <h2>The drill</h2>
          {!drill.owned ? (
            <>
              <p>
                Cuts through the hardest rock, deep down where the rarest
                treasure hides.
              </p>
              <button
                className="chunky go"
                disabled={gems < DRILL_COST}
                aria-label={`Buy the drill for ${DRILL_COST} gems`}
                onClick={() => {
                  if (sound) sfx("buy");
                  dispatch({ type: "drill" });
                }}
              >
                <Price cost={DRILL_COST} gems={gems} />
              </button>
            </>
          ) : (
            <>
              <p>
                {ready
                  ? "Powered up! It digs any rock in one go."
                  : "Finish typing levels to power it up."}
              </p>
              <div
                className="power"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={DRILL_CHARGE}
                aria-valuenow={drill.charge}
                aria-label={`Drill power ${drill.charge} of ${DRILL_CHARGE}`}
              >
                {Array.from({ length: DRILL_CHARGE }, (_, i) => (
                  <span key={i} className={i < drill.charge ? "on" : ""} />
                ))}
                <strong>
                  {drill.charge} / {DRILL_CHARGE}
                </strong>
              </div>
              {!ready && (
                <button className="chunky go small" onClick={onMap}>
                  <Keyboard size={18} /> Go type
                </button>
              )}
            </>
          )}
        </div>
      </section>
      <section aria-label="Pickaxes">
        <h2>Pickaxes</h2>
        <div className="grid picks">
          {tools.map((t) => {
            const owned = progress.ownedTools.includes(t.id),
              using = progress.selectedTool === t.id;
            return (
              <article
                key={t.id}
                className={`card item ${using ? "using" : ""}`}
              >
                <Pickaxe color={t.color} />
                <h3>{t.name}</h3>
                {using ? (
                  <p className="have">
                    <Check size={18} /> Using
                  </p>
                ) : (
                  <button
                    className={`chunky small ${owned ? "" : "go"}`}
                    disabled={!owned && gems < t.cost}
                    aria-label={
                      owned
                        ? `Use ${t.name}`
                        : `Buy ${t.name} for ${t.cost} gems`
                    }
                    onClick={() => {
                      if (sound) sfx(owned ? "equip" : "buy");
                      dispatch({ type: "tool", id: t.id });
                    }}
                  >
                    {owned ? "Use" : <Price cost={t.cost} gems={gems} />}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section aria-label="My finds">
        <h2>
          My finds{" "}
          <small>
            {kinds} of {treasures.length}
          </small>
        </h2>
        {shelves.map((shelf) => (
          <div key={shelf.kind} className="shelf">
            <h3>{shelf.name}</h3>
            <div className="grid finds">
              {treasures
                .filter((t) => t.kind === shelf.kind)
                .map((t) => {
                  const count = finds[t.id] ?? 0;
                  return (
                    <div
                      key={t.id}
                      className={`find ${count ? "" : "unknown"}`}
                      data-find={t.id}
                    >
                      <Sticker id={t.id} />
                      <strong>{count ? t.name : "???"}</strong>
                      <small>
                        {count
                          ? `× ${count}`
                          : `Dig level ${firstLevel(t.id)}+`}
                      </small>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
