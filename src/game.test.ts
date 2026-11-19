import { describe, expect, it } from "vitest";
import {
  GEMS_PER_ROCK,
  GEMS_PER_STAR,
  acceptsKey,
  drillReady,
  initialProgress,
  isUnlocked,
  makeRun,
  nextLevel,
  reducer,
  selectPrompts,
  starsFor,
} from "./game";
import type { ProgressV2 } from "./game";
import { keyPrompts, learnedBefore, levels, typeKeys } from "./curriculum";
import { DRILL_CHARGE, DRILL_COST, ENERGY_PER_ROCK, START_ENERGY } from "./dig";

const type = (p: ProgressV2, text: string) =>
  [...text].reduce((s, key) => reducer(s, { type: "key", key }), p);
const start = (prompts: string[], mode: "keys" | "words" | "spell" = "keys") =>
  reducer(initialProgress(), {
    type: "start",
    run: makeRun(mode, levels[0].id, "Test", prompts, "run-1"),
  });

describe("levels", () => {
  it("teach every key once and only ask for keys already met", () => {
    const taught = levels.flatMap((l) => [...l.newKeys]);
    expect(new Set(taught).size).toBe(taught.length);
    for (const level of levels.filter((l) => !l.words)) {
      const allowed = new Set(learnedBefore(level) + level.newKeys);
      const prompts = keyPrompts(level);
      expect(prompts).toHaveLength(10);
      for (const prompt of prompts) {
        expect(
          [...prompt].every((k) => allowed.has(k) && typeKeys.has(k)),
        ).toBe(true);
        expect([...prompt].some((k) => level.newKeys.includes(k))).toBe(true);
      }
    }
  });
  it("open one at a time unless every level is opened", () => {
    let p = initialProgress();
    expect(isUnlocked(p, levels[0].id)).toBe(true);
    expect(isUnlocked(p, levels[1].id)).toBe(false);
    expect(nextLevel(p)).toBe(levels[0]);
    p = { ...p, levelStars: { [levels[0].id]: 1 } };
    expect(isUnlocked(p, levels[1].id)).toBe(true);
    expect(nextLevel(p)).toBe(levels[1]);
    p = reducer(initialProgress(), {
      type: "settings",
      settings: { unlockAll: true },
    });
    expect(isUnlocked(p, levels[levels.length - 1].id)).toBe(true);
  });
});

describe("typing a run", () => {
  it("counts hits and misses, and pays gems and dig power for each rock", () => {
    let p = start(["f", "jf"]);
    p = type(p, "x");
    expect(p.active).toMatchObject({ index: 0, misses: 1, hits: 0 });
    p = type(p, "f");
    expect(p.active).toMatchObject({ index: 1, position: 0, hits: 1 });
    expect(p.gems).toBe(GEMS_PER_ROCK);
    expect(p.energy).toBe(START_ENERGY + ENERGY_PER_ROCK);
    expect(p.keyStats.f).toEqual({ attempts: 2, correct: 1 });
    expect(p.stats).toEqual({});
  });
  it("finishes with stars, bonus gems and a result, exactly once", () => {
    let p = type(start(["f", "j"]), "fj");
    expect(p.active).toBeNull();
    expect(p.lastResult).toMatchObject({
      id: "run-1",
      stars: 3,
      best: true,
      gems: 2 * GEMS_PER_ROCK + 3 * GEMS_PER_STAR,
    });
    expect(p.gems).toBe(2 * GEMS_PER_ROCK + 3 * GEMS_PER_STAR);
    expect(p.levelStars[levels[0].id]).toBe(3);
    expect(p.runs).toBe(1);
    expect(type(p, "f")).toBe(p);
    p = reducer(p, { type: "clear-result" });
    expect(p.lastResult).toBeNull();
  });
  it("keeps the best stars when a later try is worse", () => {
    let p = type(start(["f"]), "f");
    p = reducer(p, {
      type: "start",
      run: makeRun("keys", levels[0].id, "Test", ["f"], "run-2"),
    });
    p = type(p, "xxxxf");
    expect(p.lastResult).toMatchObject({ stars: 1, best: false });
    expect(p.levelStars[levels[0].id]).toBe(3);
  });
  it("gives stars for accuracy, and always at least one", () => {
    const run = makeRun("keys", "a", "A", ["f"]);
    expect(starsFor({ ...run, hits: 10, misses: 1 })).toBe(3);
    expect(starsFor({ ...run, hits: 8, misses: 2 })).toBe(2);
    expect(starsFor({ ...run, hits: 1, misses: 9 })).toBe(1);
    const spell = makeRun("spell", "a", "A", ["a", "b", "c", "d", "e"]);
    expect(starsFor({ ...spell, clean: 4 })).toBe(3);
    expect(starsFor({ ...spell, clean: 3 })).toBe(2);
    expect(starsFor({ ...spell, clean: 0 })).toBe(1);
  });
  it("records word practice and is not case sensitive", () => {
    const p = type(start(["I'll", "gem"], "words"), "i’ll");
    expect(p.active?.index).toBe(1);
    expect(p.stats["i'll"]).toMatchObject({
      attempts: 4,
      correct: 4,
      completed: 1,
    });
  });
  it("ignores held keys, shortcuts and keys outside the game", () => {
    const e = {
      key: "f",
      repeat: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    };
    expect(acceptsKey(e)).toBe(true);
    expect(acceptsKey({ ...e, repeat: true })).toBe(false);
    expect(acceptsKey({ ...e, metaKey: true })).toBe(false);
    expect(acceptsKey({ ...e, key: "Tab" })).toBe(false);
  });
});

describe("spelling", () => {
  const spell = (p: ProgressV2, value: string) =>
    reducer(reducer(p, { type: "spell-input", value }), { type: "submit" });
  it("counts a first-try word as unaided", () => {
    const p = spell(start(["gem", "dig"], "spell"), " Gem ");
    expect(p.active).toMatchObject({ index: 1, clean: 1, typed: "" });
    expect(p.stats.gem).toMatchObject({ unaided: 1, spellingAttempts: 1 });
  });
  it("shows the word after two misses and does not count it as unaided", () => {
    let p = spell(start(["gem", "dig"], "spell"), "jem");
    expect(p.active).toMatchObject({ mistakes: 1, assisted: false, typed: "" });
    p = spell(p, "gim");
    expect(p.active?.assisted).toBe(true);
    p = spell(p, "gem");
    expect(p.active).toMatchObject({ index: 1, clean: 0, assisted: false });
    expect(p.stats.gem).toMatchObject({ unaided: 0, spellingAttempts: 1 });
  });
  it("lets a hint show the word", () => {
    const p = reducer(start(["gem"], "spell"), { type: "hint" });
    expect(p.active?.assisted).toBe(true);
    expect(spell(p, "gem").lastResult?.stars).toBe(1);
  });
});

describe("words and shop", () => {
  it("selects ten prompts and repeats a short list only when it runs out", () => {
    const prompts = selectPrompts(["a", "b", "c"], {}, () => 0);
    expect(prompts).toHaveLength(10);
    expect(new Set(prompts.slice(0, 3)).size).toBe(3);
    expect(() => selectPrompts([], {})).toThrow();
  });
  it("buys tools and stickers only when there are enough gems", () => {
    let p = initialProgress();
    expect(reducer(p, { type: "tool", id: "copper" })).toBe(p);
    expect(reducer(p, { type: "decoration", id: "fern" })).toBe(p);
    p = { ...p, gems: 50 };
    p = reducer(p, { type: "tool", id: "copper" });
    expect(p).toMatchObject({ gems: 20, selectedTool: "copper" });
    p = reducer(p, { type: "decoration", id: "fern" });
    expect(p).toMatchObject({ gems: 5, ownedDecorations: ["fern"] });
    expect(reducer(p, { type: "decoration", id: "fern" })).toBe(p);
    p = reducer(p, { type: "tool", id: "starter" });
    expect(p).toMatchObject({ gems: 5, selectedTool: "starter" });
  });
  it("sells the drill for 100 gems and powers it with ten finished levels", () => {
    let p: ProgressV2 = { ...initialProgress(), gems: DRILL_COST - 1 };
    expect(reducer(p, { type: "drill" })).toBe(p);
    p = reducer({ ...p, gems: DRILL_COST }, { type: "drill" });
    expect(p).toMatchObject({ gems: 0, drill: { owned: true, charge: 0 } });
    expect(drillReady(p)).toBe(false);
    for (let i = 0; i < DRILL_CHARGE; i++) {
      p = reducer(p, {
        type: "start",
        run: makeRun("keys", levels[0].id, "Test", ["f"], `run-${i}`),
      });
      p = type(p, "f");
    }
    expect(p.drill.charge).toBe(DRILL_CHARGE);
    expect(drillReady(p)).toBe(true);
  });
  it("does not charge a drill that has not been bought", () => {
    const p = type(start(["f"]), "f");
    expect(p.drill).toEqual({ owned: false, charge: 0 });
  });
});
