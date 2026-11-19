import { describe, expect, it } from "vitest";
import {
  acceptsKey,
  initialProgress,
  makeExpedition,
  reducer,
  selectPrompts,
} from "./game";
import type { Mode } from "./game";
import { lessons, parseWords, schoolLists } from "./curriculum";
const start = (mode: Mode = "keys", word = "a") =>
  reducer(initialProgress(), {
    type: "start",
    expedition: makeExpedition(
      mode,
      "Test",
      Array(10).fill(word),
      "test-expedition",
    ),
  });
describe("typing and expedition rewards", () => {
  it("gives gentle wrong-key feedback without taking ore or advancing", () => {
    const p = reducer(start(), { type: "key", key: "x" });
    expect(p.active?.position).toBe(0);
    expect(p.ore).toBe(0);
    expect(p.keyStats.a).toEqual({ attempts: 1, correct: 0 });
    expect(p.active?.feedback).toContain("take your time");
  });
  it("accepts uppercase and curved apostrophes, requiring every character", () => {
    let p = start("words", "I'll");
    for (const key of ["I", "’", "L"]) p = reducer(p, { type: "key", key });
    expect(p.ore).toBe(0);
    expect(p.active?.position).toBe(3);
    p = reducer(p, { type: "key", key: "L" });
    expect(p.ore).toBe(5);
    expect(p.active?.index).toBe(1);
  });
  it("awards exactly one gem and ten ore for ten letter rocks", () => {
    let p = start();
    for (let i = 0; i < 10; i++) p = reducer(p, { type: "key", key: "a" });
    expect(p.active).toBeNull();
    expect(p.ore).toBe(10);
    expect(p.gems).toBe(1);
    expect(p.expeditions).toBe(1);
    expect(p.rocks).toBe(10);
    expect(reducer(p, { type: "key", key: "a" })).toEqual(p);
    expect(reducer(p, { type: "submit" })).toEqual(p);
  });
  it("does not restart an unfinished expedition", () => {
    const p = start();
    expect(
      reducer(p, {
        type: "start",
        expedition: makeExpedition("words", "Other", Array(10).fill("gem")),
      }),
    ).toBe(p);
  });
  it("filters held keys, shortcuts, composing input and non-letter keys", () => {
    const e = {
      key: "a",
      repeat: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
    };
    expect(acceptsKey(e)).toBe(true);
    for (const patch of [
      { repeat: true },
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { isComposing: true },
      { key: "Tab" },
      { key: "Enter" },
    ])
      expect(acceptsKey({ ...e, ...patch })).toBe(false);
  });
});
describe("spelling is tracked separately", () => {
  it("records first-try unaided success without affecting physical key accuracy", () => {
    let p = start("spell", "each");
    p = reducer(p, { type: "spell-input", value: "EACH" });
    p = reducer(p, { type: "submit" });
    expect(p.stats.each.unaided).toBe(1);
    expect(p.stats.each.spellingAttempts).toBe(1);
    expect(p.keyStats).toEqual({});
    expect(p.ore).toBe(5);
  });
  it("does not count a revealed answer as unaided", () => {
    let p = start("spell", "each");
    p = reducer(p, { type: "hint" });
    p = reducer(p, { type: "spell-input", value: "each" });
    p = reducer(p, { type: "submit" });
    expect(p.stats.each.unaided).toBe(0);
    expect(p.stats.each.spellingAttempts).toBe(1);
    expect(p.active?.assisted).toBe(false);
  });
  it("does not count corrected spelling as first-try success", () => {
    let p = start("spell", "each");
    p = reducer(p, { type: "spell-input", value: "eech" });
    p = reducer(p, { type: "submit" });
    expect(p.ore).toBe(0);
    expect(p.active?.typed).toBe("eech");
    p = reducer(p, { type: "spell-input", value: "each" });
    p = reducer(p, { type: "submit" });
    expect(p.stats.each.unaided).toBe(0);
    expect(p.stats.each.completed).toBe(1);
  });
});
describe("progression and curriculum", () => {
  it("never overspends, and equipping owned tools is free", () => {
    let p = initialProgress();
    expect(reducer(p, { type: "tool", id: "copper" })).toBe(p);
    p = { ...p, ore: 40 };
    p = reducer(p, { type: "tool", id: "copper" });
    expect(p.ore).toBe(20);
    p = reducer(p, { type: "tool", id: "starter" });
    p = reducer(p, { type: "tool", id: "copper" });
    expect(p.ore).toBe(20);
  });
  it("unlocks caves only at their thresholds", () => {
    const p = initialProgress();
    expect(reducer(p, { type: "cave", id: "crystal" })).toBe(p);
    expect(
      reducer({ ...p, expeditions: 3 }, { type: "cave", id: "crystal" })
        .selectedCave,
    ).toBe("crystal");
  });
  it("charges for decorations once and restores owned choices freely", () => {
    let p = { ...initialProgress(), gems: 6 };
    p = reducer(p, { type: "decoration", slot: "pet", id: "snail" });
    p = reducer(p, { type: "decoration", slot: "pet", id: "fox" });
    expect(p.gems).toBe(0);
    p = reducer(p, { type: "decoration", slot: "pet", id: "snail" });
    expect(p.gems).toBe(0);
    expect(p.placed.pet).toBe("snail");
  });
  it("has 120 school entries and covers every alphabet key", () => {
    expect(schoolLists).toHaveLength(10);
    expect(schoolLists.flatMap((l) => l.words)).toHaveLength(120);
    const keys = lessons.map((l) => l.keys).join("");
    for (const c of "abcdefghijklmnopqrstuvwxyz'") expect(keys).toContain(c);
  });
  it("previews comma/newline lists and normalizes apostrophes", () => {
    expect(parseWords("cat, dog\ncat\nI’ll")).toEqual(["cat", "dog", "I'll"]);
  });
  it("samples ten prompts, weighting difficult words and cycling short pools", () => {
    const stats = {
      hard: {
        attempts: 5,
        correct: 0,
        completed: 0,
        unaided: 0,
        spellingAttempts: 0,
      },
    };
    expect(selectPrompts(["easy", "hard"], stats, () => 0.4)[0]).toBe("hard");
    expect(selectPrompts(["a"], {}, () => 0)).toEqual(Array(10).fill("a"));
    expect(
      new Set(selectPrompts(schoolLists[0].words, {}, () => 0.5)).size,
    ).toBe(10);
  });
});
