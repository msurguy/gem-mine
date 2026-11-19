import { describe, expect, it } from "vitest";
import {
  acceptsFingerKey,
  fingerForKey,
  fingerLessons,
  fingers,
  initialFingerPractice,
  isFingerPractice,
  keyboardKeys,
} from "./fingers";
import { createBackup, parseBackup, validateProgress } from "./persistence";
import { initialProgress, reducer } from "./game";
describe("finger positioning curriculum", () => {
  it("assigns every displayed key once and rests right pinky on semicolon", () => {
    for (const { key } of keyboardKeys)
      expect(fingers.filter((f) => f.keys.includes(key))).toHaveLength(1);
    expect(fingerForKey(";")?.home).toBe(";");
    expect(fingerForKey("'")?.home).toBe(";");
    expect(fingerForKey(" ")?.name).toBe("Either thumb");
    for (const lesson of fingerLessons)
      for (const key of lesson.keys)
        expect(keyboardKeys.some((k) => k.key === key)).toBe(true);
  });
  it("accepts space and semicolon but ignores holds and shortcuts", () => {
    const e = {
      key: " ",
      repeat: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    };
    expect(acceptsFingerKey(e)).toBe(true);
    expect(acceptsFingerKey({ ...e, key: ";" })).toBe(true);
    expect(acceptsFingerKey({ ...e, key: "Tab" })).toBe(false);
    expect(acceptsFingerKey({ ...e, repeat: true })).toBe(false);
    expect(acceptsFingerKey({ ...e, metaKey: true })).toBe(false);
  });
  it("saves completed lessons in backups and accepts pre-feature saves", () => {
    const old = initialProgress();
    delete old.fingerPractice;
    expect(validateProgress(old).fingerPractice).toBeUndefined();
    const next = reducer(old, {
      type: "finger-practice",
      practice: { lessonId: "anchors", step: 6, completed: ["anchors"] },
    });
    expect(
      parseBackup(JSON.stringify(createBackup(next))).progress.fingerPractice,
    ).toEqual(next.fingerPractice);
    expect(next.ore).toBe(0);
  });
  it("rejects malformed finger progress without changing the current game", () => {
    const p = initialProgress();
    for (const practice of [
      { ...initialFingerPractice(), step: -1 },
      { ...initialFingerPractice(), step: 7 },
      { ...initialFingerPractice(), lessonId: "bad" },
      { ...initialFingerPractice(), completed: ["anchors", "anchors"] },
    ]) {
      expect(isFingerPractice(practice)).toBe(false);
      expect(reducer(p, { type: "finger-practice", practice })).toBe(p);
      expect(() =>
        validateProgress({ ...p, fingerPractice: practice }),
      ).toThrow();
    }
  });
});
