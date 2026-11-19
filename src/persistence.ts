import { decorations, tools, typeKeys } from "./curriculum";
import {
  DIG_ROWS,
  DIG_WIDTH,
  DRILL_CHARGE,
  START_ENERGY,
  isOpen,
  newDig,
  treasures,
} from "./dig";
import { initialProgress } from "./game";
import type { ProgressV2 } from "./game";
export interface BackupV2 {
  format: "gem-mine";
  version: 2;
  exportedAt: string;
  progress: ProgressV2;
}
export const SAVE_KEY = "gem-mine:progress:v2";
/** Saves from the first version of the game are read once, then left alone. */
export const OLD_SAVE_KEY = "gem-mine:progress:v1";
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, max = 1e9): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
const str = (v: unknown, max = 100): v is string =>
  typeof v === "string" && v.length <= max;
const mode = (v: unknown) => ["keys", "words", "spell"].includes(String(v));
const word = (v: unknown) =>
  str(v, 32) && /^[A-Za-z]+(?:['‘’][A-Za-z]+)*$/.test(v);
const pattern = (v: unknown) =>
  str(v, 32) &&
  v.length > 0 &&
  [...v.toLowerCase()].every((k) => typeKeys.has(k));
const prompt = (v: unknown) => word(v) || pattern(v);
const ids = (v: unknown, allowed: string[]): v is string[] =>
  Array.isArray(v) &&
  v.length <= allowed.length &&
  new Set(v).size === v.length &&
  v.every((x) => typeof x === "string" && allowed.includes(x));
const date = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const fail = (): never => {
  throw new Error(
    "This file is not a valid Gem Mine save. Your current progress is safe.",
  );
};
function checkLists(v: unknown) {
  if (!Array.isArray(v) || v.length > 200) return fail();
  const seen = new Set();
  for (const l of v) {
    if (
      !object(l) ||
      !str(l.id) ||
      !l.id.startsWith("custom-") ||
      seen.has(l.id) ||
      !str(l.title, 80) ||
      !l.title.trim() ||
      !date(l.date) ||
      !Array.isArray(l.words) ||
      l.words.length < 1 ||
      l.words.length > 100 ||
      !l.words.every(word)
    )
      return fail();
    seen.add(l.id);
  }
}
function checkStats(stats: unknown, keyStats: unknown) {
  if (
    !object(stats) ||
    Object.keys(stats).length > 20000 ||
    !object(keyStats) ||
    Object.keys(keyStats).length > typeKeys.size
  )
    return fail();
  for (const [k, s] of Object.entries(stats)) {
    if (
      !prompt(k) ||
      !object(s) ||
      ![
        "attempts",
        "correct",
        "completed",
        "unaided",
        "spellingAttempts",
      ].every((f) => num(s[f])) ||
      Number(s.correct) > Number(s.attempts) ||
      Number(s.unaided) > Number(s.spellingAttempts) ||
      Number(s.spellingAttempts) > Number(s.completed)
    )
      return fail();
  }
  for (const [k, s] of Object.entries(keyStats)) {
    if (
      !typeKeys.has(k) ||
      !object(s) ||
      !num(s.attempts) ||
      !num(s.correct) ||
      Number(s.correct) > Number(s.attempts)
    )
      return fail();
  }
}
export function validateProgress(value: unknown): ProgressV2 {
  if (!object(value)) return fail();
  const p = value;
  if (p.version === 1) return migrateV1(p);
  if (
    p.version !== 2 ||
    !["gems", "rocks", "runs", "energy"].every((k) => num(p[k]))
  )
    return fail();
  if (
    !object(p.levelStars) ||
    Object.keys(p.levelStars).length > 2000 ||
    Object.entries(p.levelStars).some(
      ([k, v]) => k.length > 120 || ![1, 2, 3].includes(v as number),
    )
  )
    return fail();
  if (
    !ids(
      p.ownedTools,
      tools.map((t) => t.id),
    ) ||
    !p.ownedTools.includes("starter") ||
    typeof p.selectedTool !== "string" ||
    !p.ownedTools.includes(p.selectedTool) ||
    !ids(
      p.ownedDecorations,
      decorations.map((d) => d.id),
    )
  )
    return fail();
  if (
    !object(p.drill) ||
    typeof p.drill.owned !== "boolean" ||
    !num(p.drill.charge, DRILL_CHARGE) ||
    !object(p.finds) ||
    Object.entries(p.finds).some(
      ([k, v]) => !treasures.some((t) => t.id === k) || !num(v),
    )
  )
    return fail();
  const d = p.dig;
  if (
    !object(d) ||
    !num(d.seed) ||
    !Array.isArray(d.dug) ||
    d.dug.length > DIG_WIDTH * DIG_ROWS ||
    new Set(d.dug).size !== d.dug.length ||
    !d.dug.every((c) => num(c, DIG_WIDTH * DIG_ROWS - 1) && c >= DIG_WIDTH) ||
    !num(d.x, DIG_WIDTH - 1) ||
    !num(d.y, DIG_ROWS - 1) ||
    !["left", "right", "up", "down"].includes(String(d.face)) ||
    !(d.crackCell === -1 || num(d.crackCell, DIG_WIDTH * DIG_ROWS - 1)) ||
    !num(d.cracks, 5) ||
    !isOpen(d as unknown as ProgressV2["dig"], d.x, d.y)
  )
    return fail();
  if (
    !object(p.settings) ||
    !["sound", "motion", "showHands", "unlockAll"].every(
      (k) => typeof (p.settings as Record<string, unknown>)[k] === "boolean",
    )
  )
    return fail();
  checkLists(p.customLists);
  checkStats(p.stats, p.keyStats);
  if (p.active !== null) {
    const a = p.active;
    if (
      !object(a) ||
      !str(a.id) ||
      !str(a.levelId, 120) ||
      !mode(a.mode) ||
      !str(a.title, 120) ||
      !Array.isArray(a.prompts) ||
      a.prompts.length < 1 ||
      a.prompts.length > 20 ||
      !a.prompts.every(a.mode === "keys" ? prompt : word) ||
      !num(a.index, a.prompts.length - 1) ||
      !num(a.position) ||
      a.position >= String(a.prompts[a.index]).length ||
      !["mistakes", "hits", "misses"].every((k) => num(a[k])) ||
      !num(a.clean, a.prompts.length) ||
      typeof a.assisted !== "boolean" ||
      !str(a.typed, 32)
    )
      return fail();
    if (a.mode === "spell" && a.position !== 0) return fail();
  }
  if (p.lastResult !== null) {
    const r = p.lastResult;
    if (
      !object(r) ||
      !str(r.id) ||
      !str(r.levelId, 120) ||
      !mode(r.mode) ||
      !str(r.title, 120) ||
      ![1, 2, 3].includes(r.stars as number) ||
      !num(r.gems) ||
      typeof r.best !== "boolean"
    )
      return fail();
  }
  // Reconstruct via JSON: no executable values or shared object references enter state.
  return JSON.parse(JSON.stringify(p)) as ProgressV2;
}
const oldDecorations: Record<string, string> = {
  "light/lantern": "lantern",
  "light/stars": "starlights",
  "plant/fern": "fern",
  "plant/tree": "cherrytree",
  "pet/snail": "snail",
  "pet/fox": "fox",
  "home/tent": "campfire",
  "home/cabin": "cabin",
  "display/rock": "crystals",
  "display/crystal": "chest",
  "flag/flag": "flag",
  "flag/rainbow": "rainbow",
};
/**
 * Carry a first-version save forward. Ore and gems become one gem count,
 * tools, camp items, word lists and practice history are kept, and a player
 * who already finished expeditions keeps every level open.
 */
function migrateV1(p: Record<string, unknown>): ProgressV2 {
  if (!["ore", "gems", "expeditions", "rocks"].every((k) => num(p[k])))
    return fail();
  const settings = object(p.settings) ? p.settings : fail();
  const owned = Array.isArray(p.ownedDecorations) ? p.ownedDecorations : fail();
  return validateProgress({
    ...initialProgress(),
    gems: Math.min(1e9, Number(p.ore) + Number(p.gems) * 10),
    rocks: p.rocks,
    runs: p.expeditions,
    ownedTools: p.ownedTools,
    selectedTool: p.selectedTool,
    ownedDecorations: [
      ...new Set(owned.map((id) => oldDecorations[String(id)]).filter(Boolean)),
    ],
    energy: START_ENERGY,
    dig: newDig(1),
    settings: {
      sound: settings.sound,
      motion: settings.motion,
      showHands: settings.showHands ?? true,
      unlockAll: Number(p.expeditions) > 0,
    },
    customLists: p.customLists,
    stats: p.stats,
    keyStats: p.keyStats,
  });
}
export function createBackup(progress: ProgressV2): BackupV2 {
  return {
    format: "gem-mine",
    version: 2,
    exportedAt: new Date().toISOString(),
    progress,
  };
}
export function parseBackup(raw: string): BackupV2 {
  if (raw.length > 2_000_000)
    throw new Error("This backup is too large (maximum 2 MB).");
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw new Error(
      "This file is not readable JSON. Your current progress is safe.",
    );
  }
  if (
    !object(v) ||
    v.format !== "gem-mine" ||
    (v.version !== 1 && v.version !== 2) ||
    !str(v.exportedAt) ||
    Number.isNaN(Date.parse(v.exportedAt))
  )
    throw new Error("Choose a Gem Mine backup file.");
  return {
    format: "gem-mine",
    version: 2,
    exportedAt: v.exportedAt,
    progress: validateProgress(v.progress),
  };
}
export function loadProgress(storage: Pick<Storage, "getItem">): {
  progress: ProgressV2;
  error: string;
  corrupt: string | null;
} {
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY) ?? storage.getItem(OLD_SAVE_KEY);
    return {
      progress: raw ? validateProgress(JSON.parse(raw)) : initialProgress(),
      error: "",
      corrupt: null,
    };
  } catch {
    return {
      progress: initialProgress(),
      error: raw
        ? "Your saved file needs attention. It has been preserved; progress isn’t being saved until you recover or reset it."
        : "Storage is unavailable. Progress isn’t being saved. Export a backup before leaving.",
      corrupt: raw,
    };
  }
}
export function saveProgress(storage: Pick<Storage, "setItem">, p: ProgressV2) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(p));
    return "";
  } catch {
    return "Progress isn’t being saved. Export a backup before leaving.";
  }
}
export function download(name: string, contents: string) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
