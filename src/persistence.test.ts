import { describe, expect, it } from "vitest";
import {
  OLD_SAVE_KEY,
  SAVE_KEY,
  createBackup,
  loadProgress,
  parseBackup,
  saveProgress,
  validateProgress,
} from "./persistence";
import { initialProgress, makeRun, reducer } from "./game";
import { cellOf } from "./dig";
import { levels } from "./curriculum";

const v1 = {
  version: 1,
  fingerPractice: { lessonId: "anchors", step: 0, completed: [] },
  ore: 35,
  gems: 3,
  expeditions: 4,
  rocks: 40,
  ownedTools: ["starter", "copper"],
  selectedTool: "copper",
  selectedCave: "crystal",
  ownedDecorations: ["pet/fox", "home/tent"],
  placed: { pet: "fox", home: "tent" },
  settings: { sound: false, motion: true },
  customLists: [
    {
      id: "custom-a",
      title: "Mine",
      date: "2026-11-16",
      words: ["gem", "I'll"],
    },
  ],
  stats: {
    gem: {
      attempts: 3,
      correct: 3,
      completed: 1,
      unaided: 0,
      spellingAttempts: 0,
    },
    f: {
      attempts: 2,
      correct: 1,
      completed: 1,
      unaided: 0,
      spellingAttempts: 0,
    },
  },
  keyStats: { f: { attempts: 2, correct: 1 } },
  active: null,
  lastResult: null,
};
describe("save and restore", () => {
  it("round-trips a run in progress, a dig and custom lists", () => {
    let p = initialProgress();
    p = reducer(p, {
      type: "list",
      list: {
        id: "custom-test",
        date: "2026-11-16",
        title: "Words",
        words: ["gem", "I'll"],
      },
    });
    p = reducer(p, {
      type: "start",
      run: makeRun(
        "words",
        "words:custom-test",
        "Words",
        Array(10).fill("gem"),
      ),
    });
    p = reducer(p, { type: "key", key: "g" });
    p = reducer(reducer(p, { type: "dig-swing" }), {
      type: "dig-move",
      face: "down",
    });
    const restored = parseBackup(JSON.stringify(createBackup(p))).progress;
    expect(restored).toEqual(p);
    expect(restored).not.toBe(p);
    let stored = "";
    expect(
      saveProgress(
        {
          setItem: (key, v) => {
            expect(key).toBe(SAVE_KEY);
            stored = v;
          },
        },
        p,
      ),
    ).toBe("");
    const loaded = loadProgress({
      getItem: (k) => (k === SAVE_KEY ? stored : null),
    });
    expect(loaded.progress.active?.position).toBe(1);
    expect(loaded.progress.dig.y).toBe(1);
  });
  it("carries a first-version save forward", () => {
    const p = validateProgress(v1);
    expect(p).toMatchObject({
      version: 2,
      gems: 65,
      runs: 4,
      rocks: 40,
      selectedTool: "copper",
      ownedDecorations: ["fox", "campfire"],
      settings: {
        sound: false,
        motion: true,
        showHands: true,
        unlockAll: true,
      },
      drill: { owned: false, charge: 0 },
    });
    expect(p.customLists).toHaveLength(1);
    expect(p.keyStats.f).toEqual({ attempts: 2, correct: 1 });
    const loaded = loadProgress({
      getItem: (k) => (k === OLD_SAVE_KEY ? JSON.stringify(v1) : null),
    });
    expect(loaded.error).toBe("");
    expect(loaded.progress.gems).toBe(65);
    expect(
      parseBackup(
        JSON.stringify({
          format: "gem-mine",
          version: 1,
          exportedAt: "2026-11-01T00:00:00Z",
          progress: v1,
        }),
      ).progress.gems,
    ).toBe(65);
  });
  it("rejects malformed, unsupported and oversized backups", () => {
    for (const s of [
      "nope",
      "{}",
      JSON.stringify({ ...createBackup(initialProgress()), version: 3 }),
      JSON.stringify({ ...createBackup(initialProgress()), format: "other" }),
      "a".repeat(2_000_001),
    ])
      expect(() => parseBackup(s)).toThrow();
  });
  it("rejects invalid values throughout nested state", () => {
    const good = initialProgress();
    const run = makeRun("keys", levels[0].id, "T", ["f", "jf"]);
    for (const patch of [
      { gems: -1 },
      { gems: Infinity },
      { energy: 1.5 },
      { version: 3 },
      { selectedTool: "unknown" },
      { ownedTools: ["copper"] },
      { ownedDecorations: ["fern", "fern"] },
      { ownedDecorations: ["nope"] },
      { levelStars: { a: 4 } },
      { drill: { owned: true, charge: 11 } },
      { finds: { unicorn: 1 } },
      { finds: { coal: -1 } },
      { dig: { ...good.dig, x: 99 } },
      { dig: { ...good.dig, dug: [0] } },
      { dig: { ...good.dig, dug: [20, 20] } },
      { dig: { ...good.dig, y: 3 } },
      { dig: { ...good.dig, face: "sideways" } },
      { settings: { ...good.settings, unlockAll: "yes" } },
      {
        customLists: [
          { id: "x", title: "t", date: "2026-11-16", words: ["a"] },
        ],
      },
      {
        customLists: [
          { id: "custom-x", title: "t", date: "2026-13-40", words: ["a"] },
        ],
      },
      {
        customLists: [
          { id: "custom-x", title: "t", date: "2026-11-16", words: ["a b"] },
        ],
      },
      {
        stats: {
          gem: {
            attempts: 1,
            correct: 2,
            completed: 0,
            unaided: 0,
            spellingAttempts: 0,
          },
        },
      },
      { keyStats: { "!": { attempts: 1, correct: 1 } } },
      { active: { ...run, index: 2 } },
      { active: { ...run, position: 1 } },
      { active: { ...run, prompts: ["F!"] } },
      { active: { ...run, mode: "race" } },
      { active: { ...run, mode: "words", prompts: ["fj;"] } },
      {
        lastResult: {
          id: "a",
          levelId: "b",
          mode: "keys",
          title: "t",
          stars: 0,
          gems: 1,
          best: true,
        },
      },
    ])
      expect(
        () => validateProgress({ ...good, ...patch }),
        JSON.stringify(patch),
      ).toThrow();
    expect(
      validateProgress({
        ...good,
        dig: { ...good.dig, y: 1, dug: [cellOf(good.dig.x, 1)] },
      }).dig.y,
    ).toBe(1);
  });
  it("preserves a corrupt save instead of overwriting it", () => {
    const loaded = loadProgress({
      getItem: (k) => (k === SAVE_KEY ? "{broken" : null),
    });
    expect(loaded.corrupt).toBe("{broken");
    expect(loaded.error).toMatch(/preserved/);
    expect(loaded.progress.gems).toBe(0);
    const blocked = loadProgress({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(blocked.corrupt).toBeNull();
    expect(blocked.error).toMatch(/unavailable/);
    expect(
      saveProgress(
        {
          setItem: () => {
            throw new Error("full");
          },
        },
        initialProgress(),
      ),
    ).toMatch(/isn’t being saved/);
  });
});
