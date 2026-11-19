import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Keyboard,
  LockKeyhole,
  Play,
} from "lucide-react";
import { formatDate, levels, worlds } from "./curriculum";
import type { WordList } from "./curriculum";
import { isUnlocked, nextLevel } from "./game";
import type { ProgressV2 } from "./game";
import { Bolt, Miner, Stars } from "./Art";

/** Where the six stones of a world sit on its picture, as percentages. */
const spots = [
  [10, 66],
  [26, 44],
  [42, 64],
  [58, 42],
  [74, 62],
  [90, 40],
];

export default function MapScreen({
  progress,
  lists,
  onPlay,
  onDig,
}: {
  progress: ProgressV2;
  lists: WordList[];
  onPlay: (id: string) => void;
  onDig: () => void;
}) {
  const next = nextLevel(progress),
    resume = progress.active;
  const [worldIndex, setWorldIndex] = useState(() =>
      worlds.findIndex((w) => w.id === next.world),
    ),
    [listIndex, setListIndex] = useState(0);
  const world = worlds[worldIndex],
    stones = levels.filter((l) => l.world === world.id),
    worldOpen = isUnlocked(progress, stones[0].id);
  const earned = stones.reduce(
    (sum, l) => sum + (progress.levelStars[l.id] ?? 0),
    0,
  );
  const playButton = useRef<HTMLButtonElement>(null);
  useEffect(() => playButton.current?.focus(), []);
  // The last choice in the word chest mixes every list together.
  const choices = [...lists.map((l) => l.id), "mixed"],
    listId = choices[Math.min(listIndex, choices.length - 1)],
    list = lists.find((l) => l.id === listId);
  return (
    <div className="map">
      <section
        className={`world world-${world.id}`}
        aria-label={`${world.name}: ${world.tagline}`}
      >
        <img className="world-art" src={world.art} alt="" />
        <div className="world-head">
          <button
            className="round"
            aria-label="Previous cave"
            disabled={worldIndex === 0}
            onClick={() => setWorldIndex(worldIndex - 1)}
          >
            <ChevronLeft size={28} />
          </button>
          <div className="world-name">
            <h1>{world.name}</h1>
            <p>
              {worldOpen ? (
                <>
                  {world.tagline} · {earned} / {stones.length * 3} stars
                </>
              ) : (
                <>
                  <LockKeyhole size={16} /> Finish {worlds[worldIndex - 1].name}{" "}
                  to open this cave
                </>
              )}
            </p>
          </div>
          <button
            className="round"
            aria-label="Next cave"
            disabled={worldIndex === worlds.length - 1}
            onClick={() => setWorldIndex(worldIndex + 1)}
          >
            <ChevronRight size={28} />
          </button>
        </div>
        <div className="trail">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={stones.map((_, i) => spots[i].join(",")).join(" ")}
            />
          </svg>
          {stones.map((level, i) => {
            const open = isUnlocked(progress, level.id),
              stars = progress.levelStars[level.id] ?? 0,
              here = level.id === next.id;
            return (
              <div
                key={level.id}
                className="stone-spot"
                style={{ left: `${spots[i][0]}%`, top: `${spots[i][1]}%` }}
              >
                {here && <Miner pose="wave" className="map-miner" />}
                <button
                  className={`stone ${open ? "" : "locked"} ${here ? "here" : ""} ${stars ? "done" : ""} ${level.words ? "wordy" : ""}`}
                  disabled={!open}
                  onClick={() => onPlay(level.id)}
                >
                  <span aria-hidden="true">
                    {open ? level.label : <LockKeyhole size={26} />}
                  </span>
                  <span className="sr-only">
                    {open
                      ? `Play ${level.title}. ${stars} of 3 stars.`
                      : `${level.title}. Locked.`}
                  </span>
                </button>
                {open && <Stars count={stars} size={20} />}
              </div>
            );
          })}
        </div>
        <div className="world-foot">
          <button
            ref={playButton}
            className="big-play"
            onClick={() => onPlay(resume?.levelId ?? next.id)}
          >
            <Play size={30} fill="currentColor" />
            <span>
              {resume ? "Keep going" : "Play"}
              <small>{resume?.title ?? next.title}</small>
            </span>
          </button>
        </div>
      </section>
      <aside className="side">
        <section className="card chest" aria-label="My school words">
          <h2>My school words</h2>
          <div className="week">
            <button
              className="round small"
              aria-label="Newer words"
              disabled={listIndex === 0}
              onClick={() => setListIndex(listIndex - 1)}
            >
              <ChevronLeft size={22} />
            </button>
            <strong>
              {list ? `Week of ${formatDate(list.date)}` : "All my words"}
            </strong>
            <button
              className="round small"
              aria-label="Older words"
              disabled={listIndex >= choices.length - 1}
              onClick={() => setListIndex(listIndex + 1)}
            >
              <ChevronRight size={22} />
            </button>
          </div>
          <p className="word-chips">
            {list
              ? list.words.slice(0, 12).map((w) => <span key={w}>{w}</span>)
              : "A mix of words from every week."}
          </p>
          <button
            className="chest-button"
            onClick={() => onPlay(`words:${listId}`)}
          >
            <Keyboard size={30} />
            <span>Type the words</span>
            <Stars
              count={progress.levelStars[`words:${listId}`] ?? 0}
              size={18}
            />
          </button>
          <button
            className="chest-button"
            onClick={() => onPlay(`spell:${listId}`)}
          >
            <Headphones size={30} />
            <span>Listen and spell</span>
            <Stars
              count={progress.levelStars[`spell:${listId}`] ?? 0}
              size={18}
            />
          </button>
        </section>
        <button className="card dig-card" onClick={onDig}>
          <img src="./art/stickers/chest.svg" alt="" />
          <span>
            <strong>Dig for treasure</strong>
            <small>
              <Bolt size={18} /> {progress.energy} dig power
            </small>
          </span>
          <ChevronRight size={26} />
        </button>
      </aside>
    </div>
  );
}
