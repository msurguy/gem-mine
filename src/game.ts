import { decorations, levels, normalize, tools, typeKeys } from "./curriculum";
import type { WordList } from "./curriculum";
import {
  DRILL_CHARGE,
  DRILL_COST,
  ENERGY_PER_ROCK,
  START_ENERGY,
  move,
  newDig,
  swing,
} from "./dig";
import type { DigState, Facing } from "./dig";
export type Mode = "keys" | "words" | "spell";
export interface Stat {
  attempts: number;
  correct: number;
  completed: number;
  unaided: number;
  spellingAttempts: number;
}
/** One trip into the mine: a row of rocks, each holding a key pattern or word. */
export interface Run {
  id: string;
  /** A map level id, or "words:<list id>" / "spell:<list id>". */
  levelId: string;
  mode: Mode;
  title: string;
  prompts: string[];
  index: number;
  position: number;
  /** Wrong tries on the current rock. */
  mistakes: number;
  /** The current spelling word is being shown. */
  assisted: boolean;
  typed: string;
  /** Correct key presses, wrong key presses, and unaided first-try spellings. */
  hits: number;
  misses: number;
  clean: number;
}
export interface Result {
  id: string;
  levelId: string;
  mode: Mode;
  title: string;
  stars: number;
  gems: number;
  /** These stars beat the previous best for the level. */
  best: boolean;
}
export interface ProgressV2 {
  version: 2;
  gems: number;
  rocks: number;
  runs: number;
  levelStars: Record<string, number>;
  ownedTools: string[];
  selectedTool: string;
  ownedDecorations: string[];
  /** The drill is bought with gems, then powered by finishing typing levels. */
  drill: { owned: boolean; charge: number };
  /** Swings left for digging. Typing rocks earns more. */
  energy: number;
  /** How many of each treasure have been dug up. */
  finds: Record<string, number>;
  dig: DigState;
  settings: {
    sound: boolean;
    motion: boolean;
    showHands: boolean;
    unlockAll: boolean;
  };
  customLists: WordList[];
  stats: Record<string, Stat>;
  keyStats: Record<string, { attempts: number; correct: number }>;
  active: Run | null;
  lastResult: Result | null;
}
export const initialProgress = (): ProgressV2 => ({
  version: 2,
  gems: 0,
  rocks: 0,
  runs: 0,
  levelStars: {},
  ownedTools: ["starter"],
  selectedTool: "starter",
  ownedDecorations: [],
  drill: { owned: false, charge: 0 },
  energy: START_ENERGY,
  finds: {},
  dig: newDig(),
  settings: { sound: true, motion: true, showHands: true, unlockAll: false },
  customLists: [],
  stats: {},
  keyStats: {},
  active: null,
  lastResult: null,
});
export type Action =
  | { type: "start"; run: Run }
  | { type: "quit" }
  | { type: "key"; key: string }
  | { type: "spell-input"; value: string }
  | { type: "submit" }
  | { type: "hint" }
  | { type: "clear-result" }
  | { type: "tool"; id: string }
  | { type: "decoration"; id: string }
  | { type: "drill" }
  | { type: "dig-move"; face: Facing }
  | { type: "dig-swing" }
  | { type: "dig-new"; seed?: number }
  | { type: "settings"; settings: Partial<ProgressV2["settings"]> }
  | { type: "list"; list: WordList }
  | { type: "remove-list"; id: string }
  | { type: "replace"; progress: ProgressV2 };
const emptyStat = (): Stat => ({
  attempts: 0,
  correct: 0,
  completed: 0,
  unaided: 0,
  spellingAttempts: 0,
});
/** Gems for each rock, and bonus gems for each star at the end. */
export const GEMS_PER_ROCK = 1;
export const GEMS_PER_STAR = 2;
/** Pick up to ten words, favouring ones that were missed before. */
export function selectPrompts(
  pool: string[],
  stats: ProgressV2["stats"],
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
export function makeRun(
  mode: Mode,
  levelId: string,
  title: string,
  prompts: string[],
  id: string = crypto.randomUUID(),
): Run {
  return {
    id,
    levelId,
    mode,
    title,
    prompts,
    index: 0,
    position: 0,
    mistakes: 0,
    assisted: false,
    typed: "",
    hits: 0,
    misses: 0,
    clean: 0,
  };
}
export const drillReady = (p: ProgressV2) =>
  p.drill.owned && p.drill.charge >= DRILL_CHARGE;
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
    typeKeys.has(normalize(e.key))
  );
}
/** One to three stars. Finishing always earns at least one. */
export function starsFor(run: Run): number {
  const score =
    run.mode === "spell"
      ? run.clean / run.prompts.length
      : run.hits / Math.max(1, run.hits + run.misses);
  const [three, two] = run.mode === "spell" ? [0.8, 0.5] : [0.9, 0.7];
  return score >= three ? 3 : score >= two ? 2 : 1;
}
/** A level opens once the one before it has been finished. */
export function isUnlocked(p: ProgressV2, levelId: string) {
  const index = levels.findIndex((l) => l.id === levelId);
  return (
    p.settings.unlockAll ||
    index <= 0 ||
    !!p.levelStars[levelId] ||
    !!p.levelStars[levels[index - 1].id]
  );
}
/** The first map level without stars, or the last level once all are done. */
export function nextLevel(p: ProgressV2) {
  return levels.find((l) => !p.levelStars[l.id]) ?? levels[levels.length - 1];
}
function finishPrompt(p: ProgressV2, a: Run): ProgressV2 {
  const word = normalize(a.prompts[a.index]),
    stat = p.stats[word] ?? emptyStat(),
    unaided = a.mode === "spell" && !a.assisted && !a.mistakes;
  const run = { ...a, clean: a.clean + (unaided ? 1 : 0) };
  const next = {
    ...p,
    gems: p.gems + GEMS_PER_ROCK,
    energy: p.energy + ENERGY_PER_ROCK,
    rocks: p.rocks + 1,
    stats:
      a.mode === "keys"
        ? p.stats
        : {
            ...p.stats,
            [word]: {
              ...stat,
              completed: stat.completed + 1,
              unaided: stat.unaided + (unaided ? 1 : 0),
              spellingAttempts:
                stat.spellingAttempts + (a.mode === "spell" ? 1 : 0),
            },
          },
  };
  if (a.index === a.prompts.length - 1) {
    const stars = starsFor(run),
      previous = p.levelStars[a.levelId] ?? 0;
    return {
      ...next,
      gems: next.gems + stars * GEMS_PER_STAR,
      runs: next.runs + 1,
      drill: p.drill.owned
        ? { ...p.drill, charge: Math.min(DRILL_CHARGE, p.drill.charge + 1) }
        : p.drill,
      levelStars: { ...p.levelStars, [a.levelId]: Math.max(previous, stars) },
      active: null,
      lastResult: {
        id: a.id,
        levelId: a.levelId,
        mode: a.mode,
        title: a.title,
        stars,
        gems: a.prompts.length * GEMS_PER_ROCK + stars * GEMS_PER_STAR,
        best: stars > previous,
      },
    };
  }
  return {
    ...next,
    active: {
      ...run,
      index: a.index + 1,
      position: 0,
      mistakes: 0,
      assisted: false,
      typed: "",
    },
  };
}
export function reducer(p: ProgressV2, action: Action): ProgressV2 {
  switch (action.type) {
    case "replace":
      return action.progress;
    case "start":
      return { ...p, active: action.run, lastResult: null };
    case "quit":
      return p.active ? { ...p, active: null } : p;
    case "clear-result":
      return p.lastResult ? { ...p, lastResult: null } : p;
    case "settings":
      return { ...p, settings: { ...p.settings, ...action.settings } };
    case "list":
      return { ...p, customLists: [...p.customLists, action.list] };
    case "remove-list":
      return {
        ...p,
        customLists: p.customLists.filter((l) => l.id !== action.id),
      };
    case "tool": {
      const t = tools.find((t) => t.id === action.id);
      if (!t) return p;
      const owned = p.ownedTools.includes(t.id);
      if (!owned && p.gems < t.cost) return p;
      return {
        ...p,
        gems: p.gems - (owned ? 0 : t.cost),
        selectedTool: t.id,
        ownedTools: owned ? p.ownedTools : [...p.ownedTools, t.id],
      };
    }
    case "decoration": {
      const item = decorations.find((d) => d.id === action.id);
      if (!item || p.ownedDecorations.includes(item.id) || p.gems < item.cost)
        return p;
      return {
        ...p,
        gems: p.gems - item.cost,
        ownedDecorations: [...p.ownedDecorations, item.id],
      };
    }
    case "drill":
      return p.drill.owned || p.gems < DRILL_COST
        ? p
        : {
            ...p,
            gems: p.gems - DRILL_COST,
            drill: { owned: true, charge: 0 },
          };
    case "dig-move":
      return { ...p, dig: move(p.dig, action.face) };
    case "dig-new":
      return { ...p, dig: newDig(action.seed) };
    case "dig-swing": {
      const out = swing(p.dig, p.energy, drillReady(p));
      if (out.kind === "crack")
        return { ...p, dig: out.dig, energy: p.energy - 1 };
      if (out.kind !== "broke") return p;
      const loot = out.loot;
      return {
        ...p,
        dig: out.dig,
        energy: p.energy - 1,
        gems: p.gems + (loot?.value ?? 0),
        finds: loot
          ? { ...p.finds, [loot.id]: (p.finds[loot.id] ?? 0) + 1 }
          : p.finds,
      };
    }
    case "hint":
      return p.active?.mode === "spell"
        ? { ...p, active: { ...p.active, assisted: true, typed: "" } }
        : p;
    case "spell-input":
      return p.active?.mode === "spell"
        ? { ...p, active: { ...p.active, typed: action.value.slice(0, 32) } }
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
      // Two misses show the word, so nobody stays stuck on one rock.
      return {
        ...p,
        stats,
        active: {
          ...a,
          typed: "",
          mistakes: a.mistakes + 1,
          misses: a.misses + 1,
          assisted: a.assisted || a.mistakes >= 1,
        },
      };
    }
    case "key": {
      const a = p.active;
      if (!a || a.mode === "spell") return p;
      const key = normalize(action.key);
      if (!typeKeys.has(key)) return p;
      const word = normalize(a.prompts[a.index]),
        expected = word[a.position],
        correct = key === expected;
      const s = p.stats[word] ?? emptyStat(),
        k = p.keyStats[expected] ?? { attempts: 0, correct: 0 };
      const next = {
        ...p,
        // Key patterns such as "fjf" are not words, so only keys are counted.
        stats:
          a.mode === "keys"
            ? p.stats
            : {
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
          active: { ...a, mistakes: a.mistakes + 1, misses: a.misses + 1 },
        };
      const updated = { ...a, position: a.position + 1, hits: a.hits + 1 };
      return updated.position === word.length
        ? finishPrompt(next, updated)
        : { ...next, active: updated };
    }
  }
}
