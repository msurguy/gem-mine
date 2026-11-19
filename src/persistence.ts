import { isFingerPractice } from "./fingers";
import { caves, decorations, quarryKeys, tools } from "./curriculum";
import { initialProgress } from "./game";
import type { ProgressV1 } from "./game";
export interface BackupV1 {
  format: "gem-mine";
  version: 1;
  exportedAt: string;
  progress: ProgressV1;
}
export const SAVE_KEY = "gem-mine:progress:v1";
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 1e9;
const str = (v: unknown, max = 100): v is string =>
  typeof v === "string" && v.length <= max;
const mode = (v: unknown) => ["keys", "words", "spell"].includes(String(v));
const word = (v: unknown) =>
  str(v, 32) && /^[A-Za-z]+(?:['‘’][A-Za-z]+)*$/.test(v);
const prompt = (v: unknown) =>
  word(v) || (typeof v === "string" && quarryKeys.has(v));
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
export function validateProgress(value: unknown): ProgressV1 {
  const fail = (): never => {
    throw new Error(
      "This file is not a valid Gem Mine v1 save. Your current progress is safe.",
    );
  };
  if (!object(value)) return fail();
  const p = value;
  if (p.fingerPractice !== undefined && !isFingerPractice(p.fingerPractice))
    return fail();
  if (
    p.version !== 1 ||
    !["ore", "gems", "expeditions", "rocks"].every((k) => num(p[k]))
  )
    return fail();
  if (
    !ids(
      p.ownedTools,
      tools.map((t) => t.id),
    ) ||
    !p.ownedTools.includes("starter") ||
    typeof p.selectedTool !== "string" ||
    !p.ownedTools.includes(p.selectedTool)
  )
    return fail();
  if (
    !caves.some((c) => c.id === p.selectedCave && Number(p.expeditions) >= c.at)
  )
    return fail();
  const decIds = decorations.flatMap((d) =>
    d.choices.map((c) => `${d.id}/${c.id}`),
  );
  if (
    !ids(p.ownedDecorations, decIds) ||
    !object(p.placed) ||
    Object.entries(p.placed).some(
      ([k, v]) =>
        !decorations.some(
          (d) => d.id === k && d.choices.some((c) => c.id === v),
        ) || !(p.ownedDecorations as string[]).includes(`${k}/${v}`),
    )
  )
    return fail();
  if (
    !object(p.settings) ||
    typeof p.settings.sound !== "boolean" ||
    typeof p.settings.motion !== "boolean" ||
    (p.settings.showHands !== undefined &&
      typeof p.settings.showHands !== "boolean")
  )
    return fail();
  if (!Array.isArray(p.customLists) || p.customLists.length > 200)
    return fail();
  const listIds = new Set();
  for (const l of p.customLists) {
    if (
      !object(l) ||
      !str(l.id) ||
      !l.id.startsWith("custom-") ||
      listIds.has(l.id) ||
      !str(l.title, 80) ||
      !l.title.trim() ||
      !date(l.date) ||
      !Array.isArray(l.words) ||
      l.words.length < 1 ||
      l.words.length > 100 ||
      !l.words.every(word)
    )
      return fail();
    listIds.add(l.id);
  }
  if (
    !object(p.stats) ||
    Object.keys(p.stats).length > 20000 ||
    !object(p.keyStats) ||
    Object.keys(p.keyStats).length > quarryKeys.size
  )
    return fail();
  for (const [k, s] of Object.entries(p.stats)) {
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
  for (const [k, s] of Object.entries(p.keyStats)) {
    if (
      !quarryKeys.has(k) ||
      !object(s) ||
      !num(s.attempts) ||
      !num(s.correct) ||
      Number(s.correct) > Number(s.attempts)
    )
      return fail();
  }
  if (p.active !== null) {
    const a = p.active;
    if (
      !object(a) ||
      !str(a.id) ||
      !mode(a.mode) ||
      !str(a.title, 120) ||
      !Array.isArray(a.prompts) ||
      a.prompts.length !== 10 ||
      !a.prompts.every(a.mode === "keys" ? prompt : word) ||
      !num(a.index) ||
      Number(a.index) > 9 ||
      !num(a.position) ||
      Number(a.position) >= String(a.prompts[Number(a.index)]).length ||
      !num(a.mistakes) ||
      !num(a.hits) ||
      typeof a.assisted !== "boolean" ||
      !str(a.typed, 32) ||
      !str(a.feedback, 200)
    )
      return fail();
    if (a.mode === "keys" && !a.prompts.every((x) => String(x).length === 1))
      return fail();
    if (a.mode === "spell" && a.position !== 0) return fail();
  }
  if (p.lastResult !== null) {
    const r = p.lastResult;
    if (
      !object(r) ||
      !str(r.id) ||
      !mode(r.mode) ||
      !num(r.ore) ||
      r.correct !== 10 ||
      r.total !== 10 ||
      p.active !== null
    )
      return fail();
  }
  // Reconstruct via JSON: no executable values or shared object references enter state.
  const progress = JSON.parse(JSON.stringify(p)) as ProgressV1;
  progress.settings.showHands ??= true;
  return progress;
}
export function createBackup(progress: ProgressV1): BackupV1 {
  return {
    format: "gem-mine",
    version: 1,
    exportedAt: new Date().toISOString(),
    progress,
  };
}
export function parseBackup(raw: string): BackupV1 {
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
    v.version !== 1 ||
    !str(v.exportedAt) ||
    Number.isNaN(Date.parse(v.exportedAt))
  )
    throw new Error("Choose a supported Gem Mine v1 backup.");
  return {
    format: "gem-mine",
    version: 1,
    exportedAt: v.exportedAt,
    progress: validateProgress(v.progress),
  };
}
export function loadProgress(storage: Pick<Storage, "getItem">): {
  progress: ProgressV1;
  error: string;
  corrupt: string | null;
} {
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY);
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
export function saveProgress(storage: Pick<Storage, "setItem">, p: ProgressV1) {
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
