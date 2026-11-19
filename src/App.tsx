import { HandsKeyboard } from "./HandsKeyboard";
import KeyMap from "./KeyMap";
import FingerSchool from "./FingerSchool";
import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Dispatch, KeyboardEvent, ReactNode } from "react";
import {
  Pickaxe as PickIcon,
  Tent,
  Gem as GemIcon,
  Settings2,
  Volume2,
  VolumeX,
  ArrowRight,
  Check,
  LockKeyhole,
  Leaf,
  Sparkles,
  Download,
  Upload,
  Plus,
  X,
  BookOpen,
  Keyboard,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  ChevronRight,
  CircleHelp,
  Hand,
} from "lucide-react";
import {
  caves,
  decorations,
  fingerFor,
  formatDate,
  lessons,
  normalize,
  parseWords,
  schoolLists,
  tools,
} from "./curriculum";
import {
  acceptsKey,
  initialProgress,
  makeExpedition,
  reducer,
  selectPrompts,
} from "./game";
import type { Action, Mode, ProgressV1 } from "./game";
import {
  createBackup,
  download,
  loadProgress,
  parseBackup,
  saveProgress,
} from "./persistence";
import type { BackupV1 } from "./persistence";
import { canSpeak, chime, say, stopSpeech } from "./audio";
import { Gem, Miner, Pickaxe, Rock } from "./Art";
const load = () => {
  try {
    return loadProgress(window.localStorage);
  } catch {
    return {
      progress: initialProgress(),
      error:
        "Storage is unavailable. Progress isn’t being saved. Export a backup before leaving.",
      corrupt: null,
    };
  }
};
const modeInfo = {
  keys: {
    title: "Key Quarry",
    description: "Find your way around the keyboard.",
    icon: Keyboard,
  },
  words: {
    title: "Word Mine",
    description: "Turn your school words into treasure.",
    icon: BookOpen,
  },
  spell: {
    title: "Treasure Challenge",
    description: "Listen closely. Spell something great.",
    icon: Headphones,
  },
};
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title">
      <button
        className="icon-button dialog-close"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}
function Currency({ ore, gems }: { ore: number; gems: number }) {
  return (
    <div className="currencies">
      <span title="Ore">
        <span className="ore-dot" />
        {ore}
        <small>ore</small>
      </span>
      <span title="Gems">
        <Gem size={22} />
        {gems}
        <small>gems</small>
      </span>
    </div>
  );
}
export default function App() {
  const [loaded] = useState(load),
    [progress, dispatch] = useReducer(reducer, loaded.progress),
    [saveError, setSaveError] = useState(loaded.error),
    [corrupt, setCorrupt] = useState(loaded.corrupt);
  const [tab, setTab] = useState("mine"),
    [shelf, setShelf] = useState("Tools"),
    [campSlot, setCampSlot] = useState("pet"),
    [mode, setMode] = useState<Mode>(loaded.progress.active?.mode ?? "keys"),
    [lesson, setLesson] = useState("home"),
    [list, setList] = useState("latest"),
    [focused, setFocused] = useState(false),
    [speechFailed, setSpeechFailed] = useState(false),
    [help, setHelp] = useState(false),
    [resultDismissed, setResultDismissed] = useState(
      loaded.progress.lastResult?.id ?? "",
    );
  const playRef = useRef<HTMLDivElement>(null),
    spellRef = useRef<HTMLInputElement>(null),
    previousHits = useRef(progress.active?.hits ?? 0),
    previousRocks = useRef(progress.rocks),
    focusOnStart = useRef(false);
  const active = progress.active,
    selectedMode = active?.mode ?? mode,
    info = modeInfo[selectedMode],
    cave = caves.find((c) => c.id === progress.selectedCave)!,
    pick = tools.find((t) => t.id === progress.selectedTool)!;
  const lists = [...schoolLists, ...progress.customLists].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const currentWord =
    active?.prompts[active.index] ??
    (mode === "keys"
      ? (lessons.find((l) => l.id === lesson)?.keys[0] ?? "f")
      : "each");
  const position = active?.position ?? 0,
    expected = normalize(currentWord)[position],
    hidden = selectedMode === "spell" && !active?.assisted;
  const visibleWord = normalize(currentWord);
  const typed = normalize(active?.typed ?? "");
  const guideTarget = hidden
    ? undefined
    : selectedMode === "spell"
      ? [...visibleWord].find((letter, index) => letter !== typed[index])
      : expected;
  useLayoutEffect(() => {
    if (focusOnStart.current && active) {
      focusOnStart.current = false;
      if (active.mode === "spell") spellRef.current?.focus();
      else playRef.current?.focus();
    }
  }, [active?.id]);
  useEffect(() => {
    if (corrupt) return;
    try {
      setSaveError(saveProgress(window.localStorage, progress));
    } catch {
      setSaveError(
        "Progress isn’t being saved. Export a backup before leaving.",
      );
    }
  }, [progress, corrupt]);
  useEffect(() => {
    const hits = active?.hits ?? 0;
    if (progress.settings.sound) {
      if (progress.rocks > previousRocks.current) chime("complete");
      else if (hits > previousHits.current) chime("hit");
    }
    previousHits.current = hits;
    previousRocks.current = progress.rocks;
  }, [active?.hits, progress.rocks, progress.settings.sound]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) {
        setFocused(false);
        (document.activeElement as HTMLElement)?.blur();
        stopSpeech();
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    setFocused(false);
    stopSpeech();
  }, [tab]);
  const exportSave = () =>
    download(
      "gem-mine-backup.json",
      JSON.stringify(createBackup(progress), null, 2),
    );
  function focusPlay() {
    if ((progress.active?.mode ?? mode) === "spell") spellRef.current?.focus();
    else playRef.current?.focus();
  }
  function begin() {
    if (active) {
      focusPlay();
      return;
    }
    const chosen = lists.find((l) => l.id === list) ?? lists[0];
    const pool =
      mode === "keys"
        ? [...(lessons.find((l) => l.id === lesson)?.keys ?? "asdfjkl")]
        : list === "mixed"
          ? lists.flatMap((l) => l.words)
          : chosen.words;
    const title =
      mode === "keys"
        ? lessons.find((l) => l.id === lesson)!.title
        : list === "mixed"
          ? "Mixed review"
          : `Week of ${formatDate(chosen.date)}`;
    const stats =
      mode === "keys"
        ? Object.fromEntries(
            Object.entries(progress.keyStats).map(([k, s]) => [
              k,
              { ...s, completed: 0, unaided: 0, spellingAttempts: 0 },
            ]),
          )
        : progress.stats;
    const prompts = selectPrompts(pool, stats);
    focusOnStart.current = true;
    dispatch({
      type: "start",
      expedition: makeExpedition(mode, title, prompts),
    });
    setSpeechFailed(false);
    if (mode === "spell") say(prompts[0], () => setSpeechFailed(true));
  }
  function keyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (selectedMode === "spell" || e.target !== playRef.current || !active)
      return;
    if (acceptsKey(e.nativeEvent)) {
      e.preventDefault();
      dispatch({ type: "key", key: e.key });
    }
    if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  }
  const completed =
    progress.lastResult && progress.lastResult.id !== resultDismissed;

  return (
    <div className={`app ${!progress.settings.motion ? "reduce-motion" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to the adventure
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("mine");
          }}
          aria-label="Gem Mine home"
        >
          <span className="brand-icon">
            <Gem size={34} />
          </span>
          <span>
            gem mine<small>A TYPING ADVENTURE</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {[
            { id: "mine", label: "The mine", icon: PickIcon },
            { id: "fingers", label: "Finger school", icon: Hand },
            { id: "base", label: "My base", icon: Tent },
            { id: "collection", label: "Discoveries", icon: GemIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? "selected" : ""}`}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              <Icon size={20} />
              {label}
              {tab === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${tab === "parents" ? "selected" : ""}`}
            onClick={() => setTab("parents")}
          >
            <Settings2 size={19} />
            Grown-up corner
          </button>
        </div>
        <div className="header-right">
          <Currency ore={progress.ore} gems={progress.gems} />
          <span className="header-separator" />
          <button
            className="icon-button"
            onClick={() =>
              dispatch({
                type: "settings",
                settings: { sound: !progress.settings.sound },
              })
            }
            aria-label={
              progress.settings.sound
                ? "Mute sound effects"
                : "Enable sound effects"
            }
          >
            {progress.settings.sound ? (
              <Volume2 size={20} />
            ) : (
              <VolumeX size={20} />
            )}
          </button>
          <button
            className="avatar"
            onClick={() => setHelp(true)}
            aria-label="How to play"
          >
            <CircleHelp size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        {saveError && (
          <div className="save-warning" role="status">
            {saveError} <button onClick={exportSave}>Export backup</button>
            {corrupt && (
              <button
                onClick={() => download("gem-mine-recovery.json", corrupt)}
              >
                Download original save
              </button>
            )}
          </div>
        )}
        <main data-screen={tab} id="main-content" tabIndex={-1}>
          {tab === "mine" && (
            <>
              <div className="mine-layout">
                <div className="main-column">
                  <div
                    className="mode-tabs"
                    role="group"
                    aria-label="Choose a learning mode"
                  >
                    {(Object.entries(modeInfo) as [Mode, typeof info][]).map(
                      ([id, { title, icon: Icon }]) => (
                        <button
                          key={id}
                          disabled={!!active && active.mode !== id}
                          className={selectedMode === id ? "active" : ""}
                          onClick={() => {
                            setMode(id);
                            stopSpeech();
                          }}
                        >
                          <Icon size={18} />
                          {title}
                          {id === selectedMode && (
                            <span className="mode-check">
                              <Check size={12} />
                            </span>
                          )}
                        </button>
                      ),
                    )}
                  </div>
                  <section
                    className={`mine-scene theme-${cave.id}`}
                    aria-label={`${cave.name} mining station`}
                  >
                    <img
                      className="painted-cave cave-art"
                      src="./art/crystal-grotto.jpg"
                      alt=""
                    />
                    <div className="scene-top">
                      <span className="location">
                        <span className="location-dot" />
                        {cave.name}
                      </span>
                      <span className="scene-level">
                        CAVE {caves.indexOf(cave) + 1} / 4
                      </span>
                    </div>
                    <div className="scene-instruction">
                      {active
                        ? selectedMode === "spell"
                          ? "Listen, then spell the hidden word"
                          : selectedMode === "keys"
                            ? focused
                              ? "Find this key to crack the rock"
                              : "Click the rock to resume typing"
                            : focused
                              ? "Type the word to discover what’s inside"
                              : "Click the rock to resume typing"
                        : "Click the rock or Let’s mine to start"}
                    </div>
                    <div className="rock-container">
                      <button
                        className="rock-interaction"
                        aria-label={
                          active
                            ? "Resume typing at the rock"
                            : "Start mining at the rock"
                        }
                        onClick={active ? focusPlay : begin}
                      />
                      <div
                        key={`${active?.id}-${active?.hits ?? 0}`}
                        className={active?.hits ? "rock-hit" : ""}
                      >
                        <Rock fraction={position / currentWord.length} />
                      </div>
                      <div
                        className={`rock-word ${currentWord.length > 8 ? "long-word" : ""}`}
                      >
                        {hidden ? (
                          <span className="mystery-word">
                            <LockKeyhole size={28} />
                            <span>?</span>
                          </span>
                        ) : (
                          currentWord.split("").map((letter, i) => (
                            <span
                              key={i}
                              className={
                                i < position
                                  ? "typed"
                                  : i === position
                                    ? "next-letter"
                                    : ""
                              }
                            >
                              {letter}
                            </span>
                          ))
                        )}
                      </div>
                      <Pickaxe
                        color={pick.color}
                        className={`scene-pick ${active?.hits ? "swing" : ""}`}
                        key={`pick-${active?.hits ?? 0}`}
                      />
                      {active?.hits ? (
                        <div className="hit-spark" key={`spark-${active.hits}`}>
                          ✦
                        </div>
                      ) : null}
                    </div>
                    {active && active.index > 0 && (
                      <div
                        className="loot-pop"
                        key={`loot-${active.id}-${active.index}`}
                        aria-hidden="true"
                      >
                        <Gem size={25} />+{active.mode === "keys" ? 1 : 5} ore
                      </div>
                    )}
                    <div className="miner-container">
                      <Miner />
                      <div className="speech-bubble">
                        {active ? "You’ve got this!" : "Ready when you are."}
                      </div>
                    </div>
                    <div className="scene-floor">
                      <span>
                        <Gem size={18} />
                        {selectedMode === "keys"
                          ? "+1 ore per rock"
                          : "+5 ore per word"}
                      </span>
                    </div>
                  </section>
                  <section
                    className="typing-panel"
                    aria-label="Typing controls"
                  >
                    <h1 className="station-title">{info.title}</h1>
                    <div className="expedition-line">
                      <div>
                        <span className="section-kicker">
                          {active
                            ? "EXPEDITION IN PROGRESS"
                            : "YOUR NEXT EXPEDITION"}
                        </span>
                        <strong>
                          {active ? active.title : info.description}
                        </strong>
                      </div>
                      <span className="prompt-count">
                        {active ? active.index : 0}
                        <span> / 10 rocks</span>
                      </span>
                    </div>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={10}
                      aria-valuenow={active?.index ?? 0}
                      aria-label={`${active?.index ?? 0} of 10 rocks completed`}
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <span
                          key={i}
                          className={
                            i < (active?.index ?? 0)
                              ? "done"
                              : i === (active?.index ?? -1)
                                ? "current"
                                : ""
                          }
                        />
                      ))}
                    </div>
                    {!active ? (
                      <div className="start-controls">
                        <label>
                          {mode === "keys"
                            ? "Choose your lesson"
                            : "Choose your words"}
                          <select
                            value={mode === "keys" ? lesson : list}
                            onChange={(e) =>
                              mode === "keys"
                                ? setLesson(e.target.value)
                                : setList(e.target.value)
                            }
                          >
                            {mode === "keys" ? (
                              lessons.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.title}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="latest">
                                  Latest week · {formatDate(lists[0].date)}
                                </option>
                                <option value="mixed">
                                  Mixed review · all weeks
                                </option>
                                {lists.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {formatDate(l.date)} · {l.title}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                        </label>
                        <button className="primary" onClick={begin}>
                          Let’s mine <ArrowRight size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        {selectedMode === "spell" ? (
                          <div className="spell-controls">
                            <div className="spell-buttons">
                              <button
                                className="secondary"
                                onClick={() =>
                                  say(currentWord, () => setSpeechFailed(true))
                                }
                              >
                                <Volume2 size={17} />
                                Hear word
                              </button>
                              <button
                                className="text-button"
                                onClick={() => dispatch({ type: "hint" })}
                              >
                                Reveal hint
                              </button>
                            </div>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                dispatch({ type: "submit" });
                                stopSpeech();
                              }}
                            >
                              <label htmlFor="spelling">
                                Type the word you hear
                              </label>
                              <div className="spell-input-row">
                                <input
                                  id="spelling"
                                  ref={spellRef}
                                  value={active.typed}
                                  autoComplete="off"
                                  autoCorrect="off"
                                  spellCheck={false}
                                  autoCapitalize="off"
                                  maxLength={32}
                                  onChange={(e) =>
                                    dispatch({
                                      type: "spell-input",
                                      value: e.target.value,
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.repeat) e.preventDefault();
                                    if (e.key === "Escape")
                                      e.currentTarget.blur();
                                  }}
                                  onFocus={() => setFocused(true)}
                                  onBlur={() => setFocused(false)}
                                />
                                <button className="primary" type="submit">
                                  Mine it <PickIcon size={17} />
                                </button>
                              </div>
                            </form>
                            {(!canSpeak() || speechFailed) && (
                              <div className="speech-fallback">
                                Audio isn’t available.{" "}
                                <button
                                  onClick={() => dispatch({ type: "hint" })}
                                >
                                  Show the word and practice typing
                                </button>
                              </div>
                            )}
                            <p className="typing-feedback" role="status">
                              {active.feedback ||
                                "Press “Hear word” for each new rock. You can replay it anytime."}
                            </p>
                          </div>
                        ) : (
                          <div
                            ref={playRef}
                            tabIndex={0}
                            role="group"
                            aria-label="Mining keyboard. Type the highlighted letter. Escape pauses."
                            className={`capture-area ${focused ? "is-focused" : ""}`}
                            onKeyDown={keyDown}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                          >
                            <div className="typing-prompt">
                              {focused ? (
                                <>
                                  <span className="keycap-small">
                                    {expected.toUpperCase()}
                                  </span>
                                  <span>
                                    {fingerFor(expected)}
                                    <small>
                                      {active.feedback ||
                                        "Press the highlighted key. Take your time."}
                                    </small>
                                  </span>
                                  <span className="live-badge">MINING</span>
                                </>
                              ) : (
                                <>
                                  <Pause size={20} />
                                  <span>
                                    Ready to keep mining?
                                    <small>
                                      Click here or press Tab to focus the
                                      keyboard.
                                    </small>
                                  </span>
                                  <button
                                    className="text-button"
                                    onClick={() => playRef.current?.focus()}
                                  >
                                    Resume <Play size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                  <section
                    className="keyboard-deck"
                    aria-label="Keyboard guide"
                  >
                    <div className="deck-heading">
                      <h2>
                        <Keyboard size={19} /> Keyboard guide
                      </h2>
                      <button
                        type="button"
                        className="map-switch hands-toggle"
                        aria-pressed={progress.settings.showHands}
                        onClick={() => {
                          dispatch({
                            type: "settings",
                            settings: {
                              showHands: !progress.settings.showHands,
                            },
                          });
                          if (active) focusPlay();
                        }}
                      >
                        Show hands
                      </button>
                      <button
                        className="finger-school-link"
                        onClick={() => setTab("fingers")}
                      >
                        <Hand size={16} />
                        Where do my fingers go?
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    {progress.settings.showHands && guideTarget ? (
                      <HandsKeyboard
                        target={guideTarget}
                        phase="reach"
                        full
                        className="full-key-map"
                        onClick={active ? focusPlay : begin}
                      />
                    ) : (
                      <KeyMap
                        target={guideTarget}
                        onClick={active ? focusPlay : begin}
                      />
                    )}
                  </section>
                </div>
              </div>
            </>
          )}
          {tab === "collection" && (
            <>
              <PageHeading
                eyebrow="A POCKET FULL OF POSSIBILITIES"
                title="Your discoveries"
                subtitle="A new look for every little adventure. All tools mine one key at a time."
              />
              <div
                className="mode-tabs shelf-tabs"
                role="group"
                aria-label="Discoveries"
              >
                {["Tools", "Caves", "Gems"].map((name) => (
                  <button
                    key={name}
                    aria-pressed={shelf === name}
                    className={shelf === name ? "active" : ""}
                    onClick={() => setShelf(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {shelf === "Tools" && (
                <div className="shop-grid">
                  {tools.map((t) => {
                    const owned = progress.ownedTools.includes(t.id),
                      selected = progress.selectedTool === t.id;
                    return (
                      <article
                        className={`shop-card ${selected ? "equipped" : ""}`}
                        key={t.id}
                      >
                        <div className="shop-art">
                          <Pickaxe color={t.color} />
                        </div>
                        <h3>{t.name}</h3>
                        <p>{t.description}</p>
                        <button
                          className={selected ? "secondary" : "primary"}
                          disabled={!owned && progress.ore < t.cost}
                          onClick={() => dispatch({ type: "tool", id: t.id })}
                        >
                          {selected ? (
                            <>
                              <Check size={16} />
                              Equipped
                            </>
                          ) : owned ? (
                            "Equip pickaxe"
                          ) : (
                            <>
                              <span className="ore-dot" />
                              {t.cost} ore
                            </>
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
              {shelf === "Caves" && (
                <div className="caves-grid">
                  {caves.map((c) => (
                    <article className="cave-card" key={c.id}>
                      <div className={`cave-thumbnail theme-${c.id}`}>
                        <img
                          className="painted-cave cave-art"
                          src="./art/crystal-grotto.jpg"
                          alt=""
                        />
                        <Gem color={c.color} size={55} />
                      </div>
                      <h3>{c.name}</h3>
                      <p>{c.description}</p>
                      <button
                        className="secondary"
                        disabled={progress.expeditions < c.at}
                        onClick={() => dispatch({ type: "cave", id: c.id })}
                      >
                        {progress.expeditions < c.at ? (
                          <>
                            <LockKeyhole size={15} />
                            {c.at} expeditions
                          </>
                        ) : progress.selectedCave === c.id ? (
                          <>
                            <Check size={15} />
                            Exploring now
                          </>
                        ) : (
                          "Explore cave"
                        )}
                      </button>
                    </article>
                  ))}
                </div>
              )}
              {shelf === "Gems" && (
                <div className="gem-shelf">
                  {caves.map((c, i) => (
                    <div
                      key={c.id}
                      className={
                        progress.expeditions >= [1, 3, 8, 15][i]
                          ? ""
                          : "undiscovered"
                      }
                    >
                      <Gem size={65} color={c.color} />
                      <strong>
                        {
                          [
                            "Moss jade",
                            "Sky crystal",
                            "Amber sun",
                            "Moonstone",
                          ][i]
                        }
                      </strong>
                      <small>
                        {progress.expeditions >= [1, 3, 8, 15][i]
                          ? "Discovered!"
                          : `Complete ${[1, 3, 8, 15][i]} expeditions`}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === "base" && (
            <>
              <PageHeading
                eyebrow="MAKE YOURSELF AT HOME"
                title="Your little base camp"
                subtitle="Turn your hard-earned gems into a cozy place of your own."
              />
              <div
                className="base-scene"
                style={{ backgroundImage: `url(./art/miners-camp.jpg)` }}
              >
                <div className="base-sun" />
                <div className="base-hill back" />
                <div className="base-hill front" />
                <div className="base-sign">HOME SWEET HOLLOW</div>
                <div className="base-items">
                  {decorations.map((d) => {
                    const item = d.choices.find(
                      (c) => c.id === progress.placed[d.id],
                    );
                    return (
                      <button
                        key={d.id}
                        className={`base-slot slot-${d.id}`}
                        aria-pressed={campSlot === d.id}
                        aria-label={`Decorate ${d.name}`}
                        onClick={() => setCampSlot(d.id)}
                      >
                        <span>{item?.icon ?? "+"}</span>
                        <small>{item?.name ?? d.name}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
              <h2 className="section-title">
                Choose a spot in your camp{" "}
                <span>Earn one gem each expedition</span>
              </h2>
              <div className="decoration-grid">
                {decorations
                  .filter((d) => d.id === campSlot)
                  .map((d) => (
                    <section className="decoration-card" key={d.id}>
                      <h3>{d.name}</h3>
                      {d.choices.map((c) => {
                        const owned = progress.ownedDecorations.includes(
                            `${d.id}/${c.id}`,
                          ),
                          placed = progress.placed[d.id] === c.id;
                        return (
                          <div className="decoration-choice" key={c.id}>
                            <span
                              className="decoration-emoji"
                              aria-hidden="true"
                            >
                              {c.icon}
                            </span>
                            <span>
                              {c.name}
                              <small>
                                {owned ? "Yours to keep" : `${c.cost} gems`}
                              </small>
                            </span>
                            <button
                              className="secondary"
                              disabled={!owned && progress.gems < c.cost}
                              onClick={() =>
                                dispatch({
                                  type: "decoration",
                                  slot: d.id,
                                  id: c.id,
                                })
                              }
                            >
                              {placed ? (
                                <Check size={16} />
                              ) : owned ? (
                                "Place"
                              ) : (
                                <>
                                  <Gem size={17} />
                                  {c.cost}
                                </>
                              )}
                              <span className="sr-only">
                                {" "}
                                {placed
                                  ? "Placed"
                                  : owned
                                    ? "Place"
                                    : "Buy"}{" "}
                                {c.name}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </section>
                  ))}
              </div>
            </>
          )}
          {tab === "fingers" && (
            <FingerSchool
              saved={progress.fingerPractice}
              sound={progress.settings.sound}
              onSave={(practice) =>
                dispatch({ type: "finger-practice", practice })
              }
              onMine={() => setTab("mine")}
            />
          )}
          {tab === "parents" && (
            <Parents
              progress={progress}
              dispatch={dispatch}
              exportSave={exportSave}
              onRecover={() => setCorrupt(null)}
              corrupt={corrupt}
            />
          )}
        </main>
      </div>
      {help && (
        <Modal title="Every key is a discovery" onClose={() => setHelp(false)}>
          <div className="help-art">
            <Pickaxe />
            <Gem size={55} />
          </div>
          <ol className="help-list">
            <li>
              Choose <strong>Key Quarry</strong> to find letters, or{" "}
              <strong>Word Mine</strong> for your school words.
            </li>
            <li>
              Press the highlighted key. Each correct letter swings your
              pickaxe. Mistakes are okay!
            </li>
            <li>Mine 10 rocks to finish an expedition and earn a gem.</li>
            <li>
              Visit <strong>Discoveries</strong> for tools, or decorate{" "}
              <strong>My base</strong>.
            </li>
          </ol>
          <p className="muted">
            Treasure Challenge lets you listen and spell. You can always ask for
            a hint. Escape pauses keyboard practice.
          </p>
          <button className="primary full" onClick={() => setHelp(false)}>
            Let’s explore <ArrowRight size={18} />
          </button>
        </Modal>
      )}
      {completed && (
        <Modal
          title="Look what you discovered!"
          onClose={() => setResultDismissed(progress.lastResult!.id)}
        >
          <div className="celebration">
            <Gem size={100} />
            <span>✦</span>
            <span>✧</span>
          </div>
          <p className="centered">Ten little rocks. One big achievement.</p>
          <div className="reward-row">
            <span>+{progress.lastResult!.ore} ore</span>
            <span>
              <Gem size={24} />
              +1 gem
            </span>
          </div>
          <p className="centered muted">
            Stretch your fingers and take a little break.
            <br />
            Your next adventure will be here when you’re ready.
          </p>
          <button
            className="primary full"
            onClick={() => {
              setResultDismissed(progress.lastResult!.id);
              setTab("base");
            }}
          >
            Visit my base <Tent size={18} />
          </button>
          <button
            className="text-button full"
            onClick={() => setResultDismissed(progress.lastResult!.id)}
          >
            Back to the mine
          </button>
        </Modal>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
function Parents({
  progress,
  dispatch,
  exportSave,
  onRecover,
  corrupt,
}: {
  progress: ProgressV1;
  dispatch: Dispatch<Action>;
  exportSave: () => void;
  onRecover: () => void;
  corrupt: string | null;
}) {
  const [incoming, setIncoming] = useState<BackupV1 | null>(null),
    [error, setError] = useState(""),
    [reset, setReset] = useState(false),
    [title, setTitle] = useState("School spelling"),
    [date, setDate] = useState(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }),
    [raw, setRaw] = useState(""),
    [preview, setPreview] = useState(false),
    [notice, setNotice] = useState("");
  const words = parseWords(raw),
    stats = Object.values(progress.keyStats),
    attempts = stats.reduce((sum, s) => sum + s.attempts, 0),
    correct = stats.reduce((sum, s) => sum + s.correct, 0),
    wordStats = Object.values(progress.stats),
    spells = wordStats.reduce((sum, s) => sum + s.spellingAttempts, 0),
    unaided = wordStats.reduce((sum, s) => sum + s.unaided, 0);
  const wordValid =
    words.length > 0 &&
    words.length <= 100 &&
    words.every(
      (w) => /^[A-Za-z]+(?:'[A-Za-z]+)*$/.test(w) && w.length <= 32,
    ) &&
    title.trim().length > 0 &&
    title.trim().length <= 80 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date));
  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 2_000_000)
        throw new Error("Choose a backup smaller than 2 MB.");
      setIncoming(parseBackup(await file.text()));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE HELP BEHIND THE SCENES"
        title="Grown-up corner"
        subtitle="Follow the progress, add school words, and keep a backup of this little world."
      />
      <div className="parent-stat-grid">
        <StatCard
          label="Typing accuracy"
          value={attempts ? `${Math.round((correct / attempts) * 100)}%` : "—"}
          detail={`${correct} correct of ${attempts} key presses`}
        />
        <StatCard
          label="Unaided spelling"
          value={spells ? `${Math.round((unaided / spells) * 100)}%` : "—"}
          detail={`${unaided} of ${spells} completed spelling words`}
        />
        <StatCard
          label="Expeditions finished"
          value={String(progress.expeditions)}
          detail={`${progress.rocks} rocks mined`}
        />
      </div>
      <div className="parent-grid">
        <section className="panel">
          <h2>
            <BookOpen size={21} />
            Add a week of words
          </h2>
          <p>
            Paste just the words, separated by commas or new lines. Lists stay
            on this device and travel with backups.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPreview(true);
            }}
          >
            <div className="form-row">
              <label>
                List title
                <input
                  value={title}
                  maxLength={80}
                  required
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setPreview(false);
                  }}
                />
              </label>
              <label>
                Week beginning
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setPreview(false);
                  }}
                />
              </label>
            </div>
            <label>
              Spelling words
              <textarea
                rows={4}
                value={raw}
                maxLength={4000}
                placeholder="rock, gem, dig, shine"
                onChange={(e) => {
                  setRaw(e.target.value);
                  setPreview(false);
                }}
              />
            </label>
            <small>
              1–100 words. Letters and apostrophes; up to 32 characters per
              word.
            </small>
            <button className="secondary" disabled={!wordValid} type="submit">
              Preview {words.length || ""} words <ArrowRight size={16} />
            </button>
          </form>
          {preview && wordValid && (
            <div className="list-preview">
              <strong>
                {title} · {formatDate(date)}
              </strong>
              <div className="word-chips">
                {words.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <button
                className="primary"
                onClick={() => {
                  if (progress.customLists.length >= 200) {
                    setError("You have reached the limit of 200 custom lists.");
                    return;
                  }
                  dispatch({
                    type: "list",
                    list: {
                      id: `custom-${crypto.randomUUID()}`,
                      title: title.trim(),
                      date,
                      words,
                    },
                  });
                  setRaw("");
                  setPreview(false);
                  setNotice(
                    "Word list added. Choose it in Word Mine or Treasure Challenge.",
                  );
                }}
              >
                <Plus size={16} />
                Add this list
              </button>
            </div>
          )}
          <div role="status" className="success-notice">
            {notice}
          </div>
          {progress.customLists.length > 0 && (
            <details>
              <summary>{progress.customLists.length} custom word lists</summary>
              {progress.customLists.map((l) => (
                <p key={l.id}>
                  {formatDate(l.date)} · {l.title} · {l.words.length} words
                </p>
              ))}
            </details>
          )}
        </section>
        <div className="parent-stack">
          <section className="panel">
            <h2>
              <Download size={21} />
              Keep your discoveries safe
            </h2>
            <p>
              Progress belongs to this browser and website address. Download a
              backup to move devices or keep it safe before clearing browser
              data.
            </p>
            <div className="backup-actions">
              <button className="primary" onClick={exportSave}>
                <Download size={17} />
                Export progress
              </button>
              <label className="secondary upload-label">
                <Upload size={17} />
                Import progress
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    void readFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {corrupt && (
              <button
                className="secondary"
                onClick={() => download("gem-mine-recovery.json", corrupt)}
              >
                Download preserved original
              </button>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </section>
          <section className="panel">
            <h2>
              <Settings2 size={21} />
              Make it comfortable
            </h2>
            <label className="toggle-label">
              <span>
                Gentle sound effects
                <small>Spoken words play when “Hear word” is pressed.</small>
              </span>
              <input
                type="checkbox"
                checked={progress.settings.sound}
                onChange={(e) =>
                  dispatch({
                    type: "settings",
                    settings: { sound: e.target.checked },
                  })
                }
              />
            </label>
            <label className="toggle-label">
              <span>
                Pickaxe & sparkle animations
                <small>
                  Also respects your device’s reduced-motion setting.
                </small>
              </span>
              <input
                type="checkbox"
                checked={progress.settings.motion}
                onChange={(e) =>
                  dispatch({
                    type: "settings",
                    settings: { motion: e.target.checked },
                  })
                }
              />
            </label>
          </section>
        </div>
      </div>
      <section className="panel practice-report">
        <h2>
          <Keyboard size={21} />
          Keys to practice
        </h2>
        <p>
          Typing accuracy counts physical-key attempts in Key Quarry and Word
          Mine. Spelling success counts words completed on the first try without
          a reveal.
        </p>
        <div className="key-report">
          {Object.entries(progress.keyStats)
            .sort(
              (a, b) =>
                a[1].correct / a[1].attempts - b[1].correct / b[1].attempts,
            )
            .map(([key, s]) => (
              <div key={key}>
                <kbd>{key.toUpperCase()}</kbd>
                <strong>{Math.round((s.correct / s.attempts) * 100)}%</strong>
                <small>{s.attempts} tries</small>
              </div>
            ))}
          {!stats.length && (
            <p>
              No key presses yet. A first expedition is a great place to start.
            </p>
          )}
        </div>
      </section>
      <section className="panel">
        <h2>Word practice</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Word</th>
                <th>Rocks completed</th>
                <th>Unaided spelling</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(progress.stats)
                .filter(([w]) => w.length > 1)
                .map(([w, s]) => (
                  <tr key={w}>
                    <td>{w}</td>
                    <td>{s.completed}</td>
                    <td>
                      {s.unaided} / {s.spellingAttempts}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="reset-row">
        <span>
          Want a fresh start? This clears this device’s game progress and custom
          words.
        </span>
        <button className="text-button danger" onClick={() => setReset(true)}>
          <RotateCcw size={15} />
          Reset progress
        </button>
      </div>
      {incoming && (
        <Modal
          title="Restore this adventure?"
          onClose={() => setIncoming(null)}
        >
          <p>
            This backup contains{" "}
            <strong>{incoming.progress.expeditions} expeditions</strong>,{" "}
            <strong>{incoming.progress.ore} ore</strong>,{" "}
            <strong>{incoming.progress.gems} gems</strong>, and{" "}
            <strong>{incoming.progress.customLists.length} custom lists</strong>
            .
          </p>
          <p className="muted">
            Exported {new Date(incoming.exportedAt).toLocaleString()}. Restoring
            replaces all current progress on this device.
          </p>
          <button className="secondary full" onClick={exportSave}>
            <Download size={17} />
            Back up current progress first
          </button>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setIncoming(null)}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => {
                dispatch({ type: "replace", progress: incoming.progress });
                onRecover();
                setIncoming(null);
                setNotice("Progress restored. Your adventure is ready.");
              }}
            >
              Replace & restore
            </button>
          </div>
        </Modal>
      )}
      {reset && (
        <Modal title="Start a new adventure?" onClose={() => setReset(false)}>
          <p>
            This removes your ore, gems, tools, decorations, lessons, and custom
            word lists from this device.
          </p>
          <button className="secondary full" onClick={exportSave}>
            <Download size={17} />
            Export a backup first
          </button>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setReset(false)}>
              Keep my adventure
            </button>
            <button
              className="danger-button"
              onClick={() => {
                dispatch({ type: "replace", progress: initialProgress() });
                onRecover();
                setReset(false);
                setNotice("A fresh adventure is ready.");
              }}
            >
              Reset everything
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
