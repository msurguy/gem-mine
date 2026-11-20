import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Hand,
  Map as MapIcon,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { levels, normalize, tools, typeKeys, worlds } from "./curriculum";
import { GEMS_PER_STAR, drillReady, isUnlocked, nextLevel } from "./game";
import type { Action, ProgressV2 } from "./game";
import { DRILL_CHARGE, ENERGY_PER_ROCK } from "./dig";
import { fingerForKey, keyLabel } from "./fingers";
import { say, sfx, stopSpeech } from "./audio";
import type { Sfx } from "./audio";
import { Bolt, Gem, Miner, Pickaxe, Rock, Star } from "./Art";
import { HandsKeyboard } from "./HandsKeyboard";
import type { Phase } from "./HandsKeyboard";
import KeyMap from "./KeyMap";

const cheers = [
  "You can do it!",
  "Nice one!",
  "Great job!",
  "Keep going!",
  "Wow!",
  "So good!",
  "Super!",
  "Awesome!",
  "Almost there!",
  "Last one!",
];

export default function PlayScreen({
  progress,
  dispatch,
  onPlay,
  onExit,
}: {
  progress: ProgressV2;
  dispatch: Dispatch<Action>;
  onPlay: (id: string, restart?: boolean) => void;
  onExit: (to?: "map" | "dig") => void;
}) {
  const run = progress.active,
    result = progress.lastResult,
    levelId = (run?.levelId ?? result?.levelId)!,
    level = levels.find((l) => l.id === levelId),
    world = worlds.find(
      (w) => w.id === (level?.world ?? nextLevel(progress).world),
    )!,
    pick = tools.find((t) => t.id === progress.selectedTool)!,
    sound = progress.settings.sound;
  // A level that teaches new keys starts by meeting each one.
  const [intro, setIntro] = useState(() =>
    run &&
    level?.newKeys &&
    !progress.levelStars[level.id] &&
    run.index + run.position + run.hits === 0
      ? 0
      : -1,
  );
  const [wrong, setWrong] = useState({ key: "", n: 0 }),
    [phase, setPhase] = useState<Phase>("reach"),
    [speechFailed, setSpeechFailed] = useState(false);
  const word = run ? run.prompts[run.index] : "",
    letters = normalize(word),
    spelling = run?.mode === "spell",
    hidden = spelling && !run?.assisted;
  const target = !run
    ? undefined
    : intro >= 0
      ? level!.newKeys[intro]
      : spelling
        ? hidden
          ? undefined
          : [...letters].find((c, i) => c !== normalize(run.typed)[i])
        : letters[run.position];
  const finger = target ? fingerForKey(target) : undefined;

  // Sounds follow what the reducer decided, so they never disagree with the score.
  const seen = useRef({
    hits: run?.hits ?? 0,
    misses: run?.misses ?? 0,
    rocks: progress.rocks,
    result: result?.id,
    drill: drillReady(progress),
  });
  useEffect(() => {
    const s = seen.current,
      now = {
        hits: run?.hits ?? s.hits,
        misses: run?.misses ?? s.misses,
        rocks: progress.rocks,
        result: result?.id,
        drill: drillReady(progress),
      };
    if (sound) {
      if (now.rocks > s.rocks) sfx("rock");
      else if (now.hits > s.hits) sfx("hit");
      else if (now.misses > s.misses) sfx(spelling ? "wrong-word" : "miss");
      if (result && now.result !== s.result) {
        sfx(result.stars === 3 ? "win-perfect" : "win");
        if (now.drill && !s.drill) sfx("drill-ready");
      }
    }
    seen.current = now;
  }, [run?.hits, run?.misses, progress.rocks, result?.id, sound]);
  // The wrong-key flash fades by itself.
  useEffect(() => {
    if (!wrong.key) return;
    const t = setTimeout(() => setWrong({ key: "", n: wrong.n }), 700);
    return () => clearTimeout(t);
  }, [wrong]);
  // While meeting a new key, the hands show the reach, the press, and the way home.
  useEffect(() => {
    if (intro < 0) return setPhase("reach");
    setPhase("home");
    const timers = [
      setTimeout(() => setPhase("reach"), 500),
      setTimeout(() => setPhase("press"), 1100),
      setTimeout(() => setPhase("reach"), 1500),
    ];
    const loop = setInterval(() => {
      setPhase("home");
      timers.push(
        setTimeout(() => setPhase("reach"), 500),
        setTimeout(() => setPhase("press"), 1100),
        setTimeout(() => setPhase("reach"), 1500),
      );
    }, 2600);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [intro]);
  // Each new spelling rock says its word aloud.
  useEffect(() => {
    if (spelling && word) say(word, () => setSpeechFailed(true));
    return stopSpeech;
  }, [spelling, run?.id, run?.index]);

  const play = (kind: Sfx) => sound && sfx(kind);
  function miss(key: string) {
    if (intro >= 0) play("miss");
    setWrong({ key, n: wrong.n + 1 });
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (e.key === "Escape") return onExit();
      if (!run || e.key === "Tab") return;
      const onButton = (e.target as HTMLElement).closest?.("button, a");
      if (onButton && (e.key === "Enter" || e.key === " ")) return;
      const key = normalize(e.key);
      if (intro >= 0) {
        if (!typeKeys.has(key)) return;
        e.preventDefault();
        if (e.repeat) return;
        if (key !== level!.newKeys[intro]) return miss(key);
        play(`new-key-${Math.min(intro + 1, 5)}` as Sfx);
        setWrong({ key: "", n: wrong.n });
        setIntro(intro + 1 < level!.newKeys.length ? intro + 1 : -1);
        return;
      }
      if (run.mode === "spell") {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) submit();
        } else if (e.key === "Backspace") {
          e.preventDefault();
          if (run.typed) play("erase");
          dispatch({ type: "spell-input", value: run.typed.slice(0, -1) });
        } else if (/^[a-z']$/.test(key)) {
          e.preventDefault();
          if (e.repeat) return;
          play("letter");
          dispatch({ type: "spell-input", value: run.typed + e.key });
        }
        return;
      }
      if (!typeKeys.has(key)) return;
      e.preventDefault();
      if (e.repeat) return;
      if (key === letters[run.position]) setWrong({ key: "", n: wrong.n });
      else miss(key);
      dispatch({ type: "key", key });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function submit() {
    if (!run?.typed.trim()) return;
    if (normalize(run.typed.trim()) !== letters) miss("");
    dispatch({ type: "submit" });
  }

  const bubble = !run
    ? "You did it!"
    : intro >= 0
      ? "Meet a new key!"
      : spelling
        ? run.assisted
          ? "Copy the word."
          : run.mistakes
            ? "Listen again!"
            : "Listen and spell."
        : wrong.key
          ? `Try ${keyLabel(target ?? "")}!`
          : cheers[Math.min(run.index, cheers.length - 1)];
  const following = level && levels[levels.indexOf(level) + 1];
  return (
    <main className={`play world-${world.id}`}>
      <header className="play-bar">
        <button className="chunky quiet" onClick={() => onExit()}>
          <ArrowLeft size={22} /> Map
        </button>
        <h1>{run?.title ?? result?.title}</h1>
        {run && (
          <div
            className="pips"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={run.prompts.length}
            aria-valuenow={run.index}
            aria-label={`${run.index} of ${run.prompts.length} rocks done`}
          >
            {run.prompts.map((_, i) => (
              <span
                key={i}
                className={
                  i < run.index ? "done" : i === run.index ? "now" : ""
                }
              >
                <Gem size={24} color={i < run.index ? "#5ee6c8" : "#51607f"} />
              </span>
            ))}
          </div>
        )}
        <span className="pill">
          <Gem size={26} />
          <strong data-testid="gems">{progress.gems}</strong>
          <span className="sr-only">gems</span>
        </span>
      </header>
      <section className="stage" aria-label={`${world.name} cave`}>
        <img className="stage-art" src={world.art} alt="" />
        <div className="miner-spot">
          <div className="bubble" role="status">
            {bubble}
          </div>
          <Miner pose={!run ? "cheer" : wrong.key ? "think" : "swing"} />
        </div>
        {run && intro >= 0 && (
          <div className="intro-card">
            <p className="kicker">
              New key {intro + 1} of {level!.newKeys.length}
            </p>
            <div className="intro-row">
              <kbd className="keycap huge">{keyLabel(target!)}</kbd>
              <div>
                <strong style={{ color: finger?.color }}>{finger?.name}</strong>
                <p>
                  Watch the hands. Then press{" "}
                  <strong>{keyLabel(target!)}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
        {run && intro < 0 && (
          <div className="rock-zone">
            <div className="rock-holder">
              <div
                className={run.hits ? "rock-wrap hit" : "rock-wrap"}
                key={`${run.index}-${run.hits}`}
              >
                <Rock
                  fraction={
                    spelling
                      ? Math.min(1, run.typed.length / letters.length)
                      : run.position / letters.length
                  }
                />
              </div>
              <Pickaxe
                color={pick.color}
                className={`pick ${run.hits ? "swing" : ""}`}
                key={`pick-${run.hits}`}
              />
            </div>
            {run.index > 0 && (
              <div className="pop" key={`pop-${run.index}`} aria-hidden="true">
                <Gem size={30} />
                +1
              </div>
            )}
            {spelling ? (
              <SpellTiles
                word={word}
                typed={run.typed}
                shown={run.assisted}
                shake={wrong.n}
              />
            ) : (
              <div
                className={`tiles ${wrong.key ? "shake" : ""}`}
                key={wrong.n}
                role="img"
                style={{ "--n": letters.length } as React.CSSProperties}
                aria-label={`Type ${word}`}
              >
                {[...word].map((letter, i) => (
                  <span
                    key={i}
                    className={
                      i < run.position
                        ? "tile done"
                        : i === run.position
                          ? "tile now"
                          : "tile"
                    }
                  >
                    {letter}
                  </span>
                ))}
              </div>
            )}
            {spelling && (
              <div className="spell-buttons">
                <button
                  className="chunky"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    say(word, () => setSpeechFailed(true));
                  }}
                >
                  <Volume2 size={22} /> Hear it
                </button>
                {!run.assisted && (
                  <button
                    className="chunky quiet"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      play("hint");
                      dispatch({ type: "hint" });
                    }}
                  >
                    <Eye size={22} /> Show me
                  </button>
                )}
                <button
                  className="chunky go"
                  disabled={!run.typed.trim()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    submit();
                  }}
                >
                  <Check size={22} /> Check
                </button>
              </div>
            )}
            {spelling && speechFailed && !run.assisted && (
              <p className="stage-note">
                No sound here. Press <strong>Show me</strong> to see the word.
              </p>
            )}
          </div>
        )}
        {!run && result && (
          <div className="result" role="dialog" aria-label="Level finished">
            <h2>{result.stars === 3 ? "Amazing!" : "You did it!"}</h2>
            <div
              className="result-stars"
              role="img"
              aria-label={`${result.stars} of 3 stars`}
            >
              {[1, 2, 3].map((n) => (
                <Star key={n} on={n <= result.stars} size={n === 2 ? 96 : 76} />
              ))}
            </div>
            <div className="prizes">
              <span>
                <Gem size={30} />+{result.gems}
              </span>
              <span>
                <Bolt size={28} />+
                {(result.gems - result.stars * GEMS_PER_STAR) * ENERGY_PER_ROCK}
              </span>
            </div>
            {progress.drill.owned && (
              <p className="drill-line">
                <img src="./art/stickers/drill.svg" alt="" />
                {drillReady(progress)
                  ? "Your drill is powered up!"
                  : `Drill power ${progress.drill.charge} of ${DRILL_CHARGE}`}
              </p>
            )}
            <div className="result-buttons">
              {following && isUnlocked(progress, following.id) ? (
                <button
                  autoFocus
                  className="chunky go big"
                  onClick={() => onPlay(following.id)}
                >
                  Next level <ArrowRight size={26} />
                </button>
              ) : (
                <button
                  autoFocus
                  className="chunky go big"
                  onClick={() => onExit("dig")}
                >
                  Go dig <ArrowRight size={26} />
                </button>
              )}
              <button
                className="chunky"
                onClick={() => onPlay(result.levelId, true)}
              >
                <RotateCcw size={20} /> Again
              </button>
              <button className="chunky" onClick={() => onExit()}>
                <MapIcon size={20} /> Map
              </button>
            </div>
          </div>
        )}
      </section>
      {run && (
        <section className="deck" aria-label="Keyboard helper">
          <div className="deck-head">
            {finger && target ? (
              <p className="finger-tip">
                <kbd className="keycap">{keyLabel(target)}</kbd>
                <span
                  className="finger-dot"
                  style={{ background: finger.color }}
                />
                {finger.name}
              </p>
            ) : (
              <p className="finger-tip">
                Type the word you hear, then press <kbd>Enter</kbd>.
              </p>
            )}
            <button
              className="chunky quiet small"
              aria-pressed={progress.settings.showHands}
              onClick={(e) => {
                e.currentTarget.blur();
                dispatch({
                  type: "settings",
                  settings: { showHands: !progress.settings.showHands },
                });
              }}
            >
              <Hand size={18} />
              {progress.settings.showHands ? "Hide hands" : "Show hands"}
            </button>
          </div>
          {target && progress.settings.showHands ? (
            <HandsKeyboard target={target} phase={phase} wrong={wrong.key} />
          ) : (
            <KeyMap target={target} wrong={wrong.key} />
          )}
        </section>
      )}
    </main>
  );
}
function SpellTiles({
  word,
  typed,
  shown,
  shake,
}: {
  word: string;
  typed: string;
  shown: boolean;
  shake: number;
}) {
  const slots = Math.max(word.length, typed.length);
  return (
    <div
      className={`tiles spell ${shake ? "shake" : ""}`}
      key={shake}
      role="img"
      style={{ "--n": slots } as React.CSSProperties}
      aria-label={
        shown ? `Copy the word ${word}` : `You typed ${typed || "nothing yet"}`
      }
    >
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className={
            typed[i] ? "tile done" : i === typed.length ? "tile now" : "tile"
          }
        >
          {typed[i] ?? (shown ? <i>{word[i]}</i> : "")}
        </span>
      ))}
    </div>
  );
}
