import type { Dispatch } from "react";
import { Check } from "lucide-react";
import { decorations } from "./curriculum";
import type { Action, ProgressV2 } from "./game";
import { Miner, Sticker } from "./Art";
import { Price } from "./ShedScreen";

export default function CampScreen({
  progress,
  dispatch,
}: {
  progress: ProgressV2;
  dispatch: Dispatch<Action>;
}) {
  const owned = progress.ownedDecorations;
  return (
    <div className="camp">
      <h1>My camp</h1>
      <section className="camp-scene" aria-label="Your camp">
        <img className="camp-art" src="./art/miners-camp.jpg" alt="" />
        {decorations
          .filter((d) => owned.includes(d.id))
          .map((d) => (
            <img
              key={d.id}
              className="placed"
              data-placed={d.id}
              src={`./art/stickers/${d.id}.svg`}
              alt={d.name}
              style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.size}%` }}
            />
          ))}
        <Miner pose="wave" className="camp-miner" />
        {!owned.length && (
          <p className="camp-hint">Pick a sticker to start your camp!</p>
        )}
      </section>
      <h2>Stickers</h2>
      <div className="grid stickers">
        {decorations.map((d) => {
          const have = owned.includes(d.id);
          return (
            <article key={d.id} className={`card item ${have ? "using" : ""}`}>
              <Sticker id={d.id} />
              <h3>{d.name}</h3>
              {have ? (
                <p className="have">
                  <Check size={18} /> In camp
                </p>
              ) : (
                <button
                  className="chunky small go"
                  disabled={progress.gems < d.cost}
                  aria-label={`Buy ${d.name} for ${d.cost} gems`}
                  onClick={() => dispatch({ type: "decoration", id: d.id })}
                >
                  <Price cost={d.cost} gems={progress.gems} />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
