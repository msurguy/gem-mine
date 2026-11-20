import { useEffect, useReducer, useState } from "react";
import {
  Map as MapIcon,
  Pickaxe as PickIcon,
  Tent,
  Warehouse,
  Volume2,
  VolumeX,
  Users,
} from "lucide-react";
import { formatDate, keyPrompts, levels, schoolLists } from "./curriculum";
import { initialProgress, makeRun, reducer, selectPrompts } from "./game";
import {
  createBackup,
  download,
  loadProgress,
  saveProgress,
} from "./persistence";
import { preloadSfx, sfx, stopSpeech } from "./audio";
import { Bolt, Gem } from "./Art";
import MapScreen from "./MapScreen";
import PlayScreen from "./PlayScreen";
import DigScreen from "./DigScreen";
import ShedScreen from "./ShedScreen";
import CampScreen from "./CampScreen";
import GrownUps from "./GrownUps";

type Screen = "map" | "play" | "dig" | "shed" | "camp" | "grownups";
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
const places = [
  { id: "map", label: "Map", icon: MapIcon },
  { id: "dig", label: "Dig", icon: PickIcon },
  { id: "shed", label: "Toolshed", icon: Warehouse },
  { id: "camp", label: "My camp", icon: Tent },
] as const;

export default function App() {
  const [loaded] = useState(load),
    [progress, dispatch] = useReducer(reducer, loaded.progress),
    [saveError, setSaveError] = useState(loaded.error),
    [corrupt, setCorrupt] = useState(loaded.corrupt),
    [screen, setScreen] = useState<Screen>("map");
  const lists = [...schoolLists, ...progress.customLists].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
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
  useEffect(() => stopSpeech, [screen]);
  // Sounds load on the first touch or key, when the browser lets audio start.
  useEffect(() => {
    if (!progress.settings.sound) return;
    const start = () => preloadSfx();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [progress.settings.sound]);
  const exportSave = () =>
    download(
      "gem-mine-backup.json",
      JSON.stringify(createBackup(progress), null, 2),
    );
  /** Start a map level or a word list ("words:<id>" or "spell:<id>"), or pick up where it was left. */
  function play(id: string, restart = false) {
    if (!restart && progress.active?.levelId === id) return setScreen("play");
    const level = levels.find((l) => l.id === id);
    if (level) {
      dispatch({
        type: "start",
        run: level.words
          ? makeRun(
              "words",
              id,
              level.title,
              selectPrompts(level.words, progress.stats),
            )
          : makeRun("keys", id, level.title, keyPrompts(level)),
      });
    } else {
      const [mode, listId] = id.split(/:(.*)/),
        list = lists.find((l) => l.id === listId),
        pool = listId === "mixed" ? lists.flatMap((l) => l.words) : list?.words;
      if (!pool || (mode !== "words" && mode !== "spell")) return;
      dispatch({
        type: "start",
        run: makeRun(
          mode,
          id,
          list ? `Week of ${formatDate(list.date)}` : "All my words",
          selectPrompts(pool, progress.stats),
        ),
      });
    }
    setScreen("play");
  }
  const playing = screen === "play" && (progress.active || progress.lastResult);
  return (
    <div className={`app ${progress.settings.motion ? "" : "reduce-motion"}`}>
      {saveError && (
        <div className="save-warning" role="status">
          {saveError} <button onClick={exportSave}>Export backup</button>
          {corrupt && (
            <button onClick={() => download("gem-mine-recovery.json", corrupt)}>
              Download original save
            </button>
          )}
        </div>
      )}
      {playing ? (
        <PlayScreen
          key={progress.active?.id ?? progress.lastResult?.id}
          progress={progress}
          dispatch={dispatch}
          onPlay={play}
          onExit={(to = "map") => {
            dispatch({ type: "clear-result" });
            setScreen(to);
          }}
        />
      ) : (
        <>
          <header className="top-bar">
            <button
              className="brand"
              onClick={() => setScreen("map")}
              aria-label="Gem Mine map"
            >
              <Gem size={36} />
              <span>Gem Mine</span>
            </button>
            <nav aria-label="Places">
              {places.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`place ${screen === id || (id === "map" && screen === "play") ? "here" : ""}`}
                  aria-current={screen === id ? "page" : undefined}
                  onClick={() => setScreen(id)}
                >
                  <Icon size={26} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="purse">
              <span className="pill" title="Gems">
                <Gem size={26} />
                <strong data-testid="gems">{progress.gems}</strong>
                <span className="sr-only">gems</span>
              </span>
              <span className="pill" title="Dig power">
                <Bolt size={24} />
                <strong data-testid="energy">{progress.energy}</strong>
                <span className="sr-only">dig power</span>
              </span>
              <button
                className="round"
                onClick={() => {
                  sfx(progress.settings.sound ? "sound-off" : "sound-on");
                  dispatch({
                    type: "settings",
                    settings: { sound: !progress.settings.sound },
                  });
                }}
                aria-label={
                  progress.settings.sound ? "Turn sound off" : "Turn sound on"
                }
              >
                {progress.settings.sound ? (
                  <Volume2 size={22} />
                ) : (
                  <VolumeX size={22} />
                )}
              </button>
              <button
                className={`grownups-link ${screen === "grownups" ? "here" : ""}`}
                onClick={() => setScreen("grownups")}
              >
                <Users size={16} />
                Grown-ups
              </button>
            </div>
          </header>
          <main data-screen={screen === "play" ? "map" : screen}>
            {(screen === "map" || screen === "play") && (
              <MapScreen
                progress={progress}
                lists={lists}
                onPlay={play}
                onDig={() => setScreen("dig")}
              />
            )}
            {screen === "dig" && (
              <DigScreen
                progress={progress}
                dispatch={dispatch}
                onMap={() => setScreen("map")}
                onShed={() => setScreen("shed")}
              />
            )}
            {screen === "shed" && (
              <ShedScreen
                progress={progress}
                dispatch={dispatch}
                onMap={() => setScreen("map")}
              />
            )}
            {screen === "camp" && (
              <CampScreen progress={progress} dispatch={dispatch} />
            )}
            {screen === "grownups" && (
              <GrownUps
                progress={progress}
                dispatch={dispatch}
                exportSave={exportSave}
                onRecover={() => setCorrupt(null)}
                corrupt={corrupt}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}
