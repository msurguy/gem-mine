import { describe, expect, it } from "vitest";
import {
  createBackup,
  loadProgress,
  parseBackup,
  SAVE_KEY,
  saveProgress,
  validateProgress,
} from "./persistence";
import { initialProgress, makeExpedition, reducer } from "./game";
describe("save and restore", () => {
  it("round-trips a partially completed expedition and custom lists", () => {
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
      expedition: makeExpedition("words", "Words", Array(10).fill("gem")),
    });
    p = reducer(p, { type: "key", key: "g" });
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
    expect(
      loadProgress({ getItem: () => stored }).progress.active?.position,
    ).toBe(1);
  });
  it("rejects malformed, unsupported, and oversized backups", () => {
    for (const s of [
      "nope",
      "{}",
      JSON.stringify({ ...createBackup(initialProgress()), version: 2 }),
      "a".repeat(2_000_001),
    ])
      expect(() => parseBackup(s)).toThrow();
  });
  it("rejects invalid values throughout nested state", () => {
    for (const patch of [
      { ore: -1 },
      { ore: Infinity },
      { selectedTool: "unknown" },
      { ownedTools: ["starter", "starter"] },
      { selectedCave: "moon" },
      { settings: { sound: "yes", motion: true } },
      {
        customLists: [
          {
            id: "custom-test",
            date: "2026-02-31",
            title: "x",
            words: ["rock"],
          },
        ],
      },
      { keyStats: { a: { attempts: 1, correct: 2 } } },
      {
        stats: {
          rock: {
            attempts: 1,
            correct: 2,
            completed: 0,
            unaided: 0,
            spellingAttempts: 0,
          },
        },
      },
      { placed: { pet: "fox" } },
      { lastResult: { id: "x", mode: "bad", ore: 0, correct: 10, total: 10 } },
    ])
      expect(() =>
        validateProgress({ ...initialProgress(), ...patch }),
      ).toThrow();
  });
  it("rejects malformed active expeditions", () => {
    const a = makeExpedition("words", "Test", Array(10).fill("gem"));
    for (const patch of [
      { index: 10 },
      { position: 3 },
      { prompts: [] },
      { mode: "keys" },
      { typed: "x".repeat(33) },
    ])
      expect(() =>
        validateProgress({ ...initialProgress(), active: { ...a, ...patch } }),
      ).toThrow();
  });
  it("preserves corrupt content without writing to storage", () => {
    const raw = "broken save";
    const result = loadProgress({ getItem: () => raw });
    expect(result.corrupt).toBe(raw);
    expect(result.error).toContain("preserved");
    expect(result.progress).toEqual(initialProgress());
  });
  it("handles blocked and full storage", () => {
    const blocked = {
      getItem: () => {
        throw Error("denied");
      },
      setItem: () => {
        throw Error("quota");
      },
    };
    expect(loadProgress(blocked).error).toContain("isn’t being saved");
    expect(saveProgress(blocked, initialProgress())).toContain(
      "Export a backup",
    );
  });
  it("starts fresh only when there is no existing save", () => {
    const result = loadProgress({ getItem: () => null });
    expect(result.error).toBe("");
    expect(result.corrupt).toBeNull();
    expect(result.progress).toEqual(initialProgress());
  });
});
