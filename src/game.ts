import { initialFingerPractice, isFingerPractice } from "./fingers";
import type { FingerPractice } from "./fingers";
import { caves, decorations, normalize, quarryKeys, tools } from "./curriculum";
import type { WordList } from "./curriculum";
export type Mode = "keys" | "words" | "spell";
export interface Stat {
  attempts: number;
  correct: number;
  completed: number;
  unaided: number;
  spellingAttempts: number;
}
export interface Expedition {
  id: string;
  mode: Mode;
  title: string;
  prompts: string[];
  index: number;
  position: number;
  mistakes: number;
  assisted: boolean;
  typed: string;
  feedback: string;
  hits: number;
}
export interface ProgressV1 {
  version: 1;
  fingerPractice?: FingerPractice;
  ore: number;
  gems: number;
  expeditions: number;
  rocks: number;
  ownedTools: string[];
  selectedTool: string;
  selectedCave: string;
  ownedDecorations: string[];
  placed: Record<string, string>;
  settings: { sound: boolean; motion: boolean; showHands: boolean };
  customLists: WordList[];
  stats: Record<string, Stat>;
  keyStats: Record<string, { attempts: number; correct: number }>;
  active: Expedition | null;
  lastResult: {
    id: string;
    mode: Mode;
    ore: number;
    correct: number;
    total: number;
  } | null;
}
export const initialProgress = (): ProgressV1 => ({
  version: 1,
  fingerPractice: initialFingerPractice(),
  ore: 0,
  gems: 0,
  expeditions: 0,
  rocks: 0,
  ownedTools: ["starter"],
  selectedTool: "starter",
  selectedCave: "moss",
  ownedDecorations: [],
  placed: {},
  settings: { sound: true, motion: true, showHands: true },
  customLists: [],
  stats: {},
  keyStats: {},
  active: null,
  lastResult: null,
});
export type Action =
  | { type: "finger-practice"; practice: FingerPractice }
  | { type: "start"; expedition: Expedition }
  | { type: "key"; key: string }
  | { type: "spell-input"; value: string }
  | { type: "submit" }
  | { type: "hint" }
  | { type: "tool"; id: string }
  | { type: "cave"; id: string }
  | { type: "decoration"; slot: string; id: string }
  | { type: "settings"; settings: Partial<ProgressV1["settings"]> }
  | { type: "list"; list: WordList }
  | { type: "replace"; progress: ProgressV1 };
const emptyStat = (): Stat => ({
  attempts: 0,
  correct: 0,
  completed: 0,
  unaided: 0,
  spellingAttempts: 0,
});
export function selectPrompts(
  pool: string[],
  stats: ProgressV1["stats"],
  random = Math.random,
): string[] {
  if (!pool.length) throw new Error("Choose at least one word.");
  const available = [...pool],
    result: string[] = [];
  while (result.length < 10) {
    if (!available.length) available.push(...pool);
    const weights = available.map((w) => {
      const s = stats[normalize(w)];
      return 1 + (s ? Math.min(4, s.attempts - s.correct) : 1);
    });
    let pick = random() * weights.reduce((a, b) => a + b, 0),
      index = 0;
    while (index < weights.length - 1 && pick >= weights[index])
      pick -= weights[index++];
    result.push(available.splice(index, 1)[0]);
  }
  return result;
}
export function makeExpedition(
  mode: Mode,
  title: string,
  prompts: string[],
  id: string = crypto.randomUUID(),
): Expedition {
  return {
    id,
    mode,
    title,
    prompts,
    index: 0,
    position: 0,
    mistakes: 0,
    assisted: false,
    typed: "",
    feedback: "",
    hits: 0,
  };
}
export function acceptsKey(e: {
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  isComposing?: boolean;
}) {
  return (
    !e.repeat &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.isComposing &&
    quarryKeys.has(normalize(e.key))
  );
}
function finishPrompt(p: ProgressV1, a: Expedition): ProgressV1 {
  const word = normalize(a.prompts[a.index]),
    stat = p.stats[word] ?? emptyStat();
  const updated = {
    ...stat,
    completed: stat.completed + 1,
    unaided:
      stat.unaided + (a.mode === "spell" && !a.assisted && !a.mistakes ? 1 : 0),
    spellingAttempts: stat.spellingAttempts + (a.mode === "spell" ? 1 : 0),
  };
  const ore = a.mode === "keys" ? 1 : 5;
  const next = {
    ...p,
    ore: p.ore + ore,
    rocks: p.rocks + 1,
    stats: { ...p.stats, [word]: updated },
  };
  if (a.index === 9)
    return {
      ...next,
      gems: next.gems + 1,
      expeditions: next.expeditions + 1,
      active: null,
      lastResult: {
        id: a.id,
        mode: a.mode,
        ore: ore * 10,
        correct: 10,
        total: 10,
      },
    };
  return {
    ...next,
    active: {
      ...a,
      index: a.index + 1,
      position: 0,
      mistakes: 0,
      assisted: false,
      typed: "",
      feedback: "Rock mined! Keep going.",
    },
  };
}
export function reducer(p: ProgressV1, action: Action): ProgressV1 {
  switch (action.type) {
    case "finger-practice":
      return isFingerPractice(action.practice)
        ? { ...p, fingerPractice: action.practice }
        : p;
    case "replace":
      return action.progress;
    case "start":
      return p.active
        ? p
        : { ...p, active: action.expedition, lastResult: null };
    case "settings":
      return { ...p, settings: { ...p.settings, ...action.settings } };
    case "list":
      return { ...p, customLists: [...p.customLists, action.list] };
    case "tool": {
      const t = tools.find((t) => t.id === action.id);
      if (!t) return p;
      const owned = p.ownedTools.includes(t.id);
      if (!owned && p.ore < t.cost) return p;
      return {
        ...p,
        ore: p.ore - (owned ? 0 : t.cost),
        selectedTool: t.id,
        ownedTools: owned ? p.ownedTools : [...p.ownedTools, t.id],
      };
    }
    case "cave":
      return caves.some((c) => c.id === action.id && p.expeditions >= c.at)
        ? { ...p, selectedCave: action.id }
        : p;
    case "decoration": {
      const item = decorations
        .find((d) => d.id === action.slot)
        ?.choices.find((c) => c.id === action.id);
      if (!item) return p;
      const id = `${action.slot}/${item.id}`,
        owned = p.ownedDecorations.includes(id);
      if (!owned && p.gems < item.cost) return p;
      return {
        ...p,
        gems: p.gems - (owned ? 0 : item.cost),
        ownedDecorations: owned
          ? p.ownedDecorations
          : [...p.ownedDecorations, id],
        placed: { ...p.placed, [action.slot]: item.id },
      };
    }
    case "hint":
      return p.active
        ? {
            ...p,
            active: {
              ...p.active,
              assisted: true,
              feedback: "Here’s the word. You can do this!",
            },
          }
        : p;
    case "spell-input":
      return p.active?.mode === "spell"
        ? {
            ...p,
            active: {
              ...p.active,
              typed: action.value.slice(0, 32),
              feedback: "",
            },
          }
        : p;
    case "submit": {
      const a = p.active;
      if (!a || a.mode !== "spell" || !a.typed.trim()) return p;
      const word = normalize(a.prompts[a.index]),
        typed = normalize(a.typed.trim()),
        s = p.stats[word] ?? emptyStat();
      const correct = word === typed;
      const stats = {
        ...p.stats,
        [word]: {
          ...s,
          attempts: s.attempts + word.length,
          correct: s.correct + (correct ? word.length : 0),
        },
      };
      if (correct)
        return finishPrompt({ ...p, stats }, { ...a, hits: a.hits + 1 });
      return {
        ...p,
        stats,
        active: {
          ...a,
          mistakes: a.mistakes + 1,
          feedback: "A little different. Listen again or reveal a hint.",
        },
      };
    }
    case "key": {
      const a = p.active;
      if (!a || a.mode === "spell") return p;
      const key = normalize(action.key);
      if (!quarryKeys.has(key)) return p;
      const word = normalize(a.prompts[a.index]),
        expected = word[a.position],
        correct = key === expected;
      const s = p.stats[word] ?? emptyStat(),
        k = p.keyStats[expected] ?? { attempts: 0, correct: 0 };
      const next = {
        ...p,
        stats: {
          ...p.stats,
          [word]: {
            ...s,
            attempts: s.attempts + 1,
            correct: s.correct + (correct ? 1 : 0),
          },
        },
        keyStats: {
          ...p.keyStats,
          [expected]: {
            attempts: k.attempts + 1,
            correct: k.correct + (correct ? 1 : 0),
          },
        },
      };
      if (!correct)
        return {
          ...next,
          active: {
            ...a,
            mistakes: a.mistakes + 1,
            feedback: `Try ${a.prompts[a.index][a.position].toUpperCase()} — take your time.`,
          },
        };
      const updated = {
        ...a,
        position: a.position + 1,
        hits: a.hits + 1,
        feedback: "Nice hit!",
      };
      return updated.position === word.length
        ? finishPrompt(next, updated)
        : { ...next, active: updated };
    }
  }
}
