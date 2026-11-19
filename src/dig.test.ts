import { describe, expect, it } from "vitest";
import {
  DIG_LEVELS,
  DIG_ROWS,
  DIG_WIDTH,
  HARD_LEVEL,
  ROWS_PER_LEVEL,
  cellOf,
  facingCell,
  levelOfRow,
  lootAt,
  lootByLevel,
  move,
  newDig,
  swing,
  treasures,
} from "./dig";
import { initialProgress, reducer } from "./game";
import type { ProgressV2 } from "./game";

/** The first cell at a depth level that does, or does not, hide treasure. */
function findCell(seed: number, level: number, withLoot: boolean) {
  const first = 1 + (level - 1) * ROWS_PER_LEVEL;
  for (let y = first; y < first + ROWS_PER_LEVEL; y++)
    for (let x = 0; x < DIG_WIDTH; x++)
      if (!!lootAt(seed, cellOf(x, y)) === withLoot) return { x, y };
  throw new Error("no such cell");
}
describe("the dig", () => {
  it("has eight depth levels below an open surface", () => {
    expect(levelOfRow(0)).toBe(0);
    expect(levelOfRow(1)).toBe(1);
    expect(levelOfRow(ROWS_PER_LEVEL)).toBe(1);
    expect(levelOfRow(ROWS_PER_LEVEL + 1)).toBe(2);
    expect(levelOfRow(DIG_ROWS - 1)).toBe(DIG_LEVELS);
    expect(lootByLevel).toHaveLength(DIG_LEVELS);
  });
  it("hides each kind of treasure somewhere, with gold, bones and fossils from level three", () => {
    const listed = new Set(lootByLevel.flatMap((t) => t.map(([id]) => id)));
    expect([...listed].sort()).toEqual(treasures.map((t) => t.id).sort());
    expect(lootByLevel[2].map(([id]) => id)).toEqual(
      expect.arrayContaining(["gold", "bone", "fossil"]),
    );
    const firstAncient = lootByLevel.findIndex((t) =>
      t.some(([id]) => treasures.find((x) => x.id === id)!.kind === "ancient"),
    );
    expect(firstAncient + 1).toBeGreaterThanOrEqual(HARD_LEVEL);
  });
  it("hides the same treasure for the same seed, only from that level's list", () => {
    let found = 0;
    for (let cell = DIG_WIDTH; cell < DIG_WIDTH * DIG_ROWS; cell++) {
      const loot = lootAt(7, cell);
      expect(lootAt(7, cell)).toBe(loot);
      if (!loot) continue;
      found++;
      const level = levelOfRow(Math.floor(cell / DIG_WIDTH));
      expect(lootByLevel[level - 1].map(([id]) => id)).toContain(loot.id);
    }
    expect(found).toBeGreaterThan(30);
    expect(found).toBeLessThan(130);
    expect(lootAt(7, 0)).toBeNull();
  });
  it("walks along the surface and into dug cells, but not into earth or off the edge", () => {
    let dig = newDig(1);
    expect(dig).toMatchObject({ x: 4, y: 0 });
    dig = move(dig, "down");
    expect(dig).toMatchObject({ x: 4, y: 0, face: "down" });
    dig = move(dig, "left");
    expect(dig).toMatchObject({ x: 3, y: 0, face: "left" });
    for (let i = 0; i < 20; i++) dig = move(dig, "left");
    expect(dig.x).toBe(0);
    expect(facingCell(dig)).toBeNull();
    expect(swing(dig, 5, false).kind).toBe("nothing");
    dig = move({ ...dig, dug: [cellOf(0, 1)] }, "down");
    expect(dig).toMatchObject({ x: 0, y: 1 });
  });
  it("breaks soft earth in one swing and stone in two", () => {
    const dig = newDig(1);
    const soft = swing(dig, 5, false);
    expect(soft.kind).toBe("broke");
    const deep = {
      ...dig,
      y: 2 * ROWS_PER_LEVEL,
      dug: [cellOf(4, 2 * ROWS_PER_LEVEL)],
    };
    const first = swing(deep, 5, false);
    expect(first.kind).toBe("crack");
    if (first.kind !== "crack") return;
    expect(swing(first.dig, 5, false).kind).toBe("broke");
    expect(swing(deep, 5, true).kind).toBe("broke");
  });
  it("needs a powered drill for hard rock, and energy for every swing", () => {
    const y = (HARD_LEVEL - 1) * ROWS_PER_LEVEL;
    const deep = { ...newDig(1), y, dug: [cellOf(4, y)] };
    expect(swing(deep, 5, false).kind).toBe("too-hard");
    expect(swing(deep, 5, true).kind).toBe("broke");
    expect(swing(newDig(1), 0, false).kind).toBe("no-energy");
  });
  it("spends dig power and collects treasure through the game reducer", () => {
    const seed = 11,
      rich = findCell(seed, 1, true),
      plain = findCell(seed, 1, false);
    const at = (c: { x: number; y: number }): ProgressV2 => ({
      ...initialProgress(),
      energy: 3,
      dig: {
        ...newDig(seed),
        x: c.x,
        y: c.y - 1,
        dug: c.y > 1 ? [cellOf(c.x, c.y - 1)] : [],
      },
    });
    const loot = lootAt(seed, cellOf(rich.x, rich.y))!;
    let p = reducer(at(rich), { type: "dig-swing" });
    expect(p.energy).toBe(2);
    expect(p.finds).toEqual({ [loot.id]: 1 });
    expect(p.gems).toBe(loot.value);
    expect(p.dig.dug).toContain(cellOf(rich.x, rich.y));
    expect(reducer(p, { type: "dig-swing" })).toBe(p);
    p = reducer(at(plain), { type: "dig-swing" });
    expect(p).toMatchObject({ energy: 2, gems: 0, finds: {} });
    const empty = { ...at(plain), energy: 0 };
    expect(reducer(empty, { type: "dig-swing" })).toBe(empty);
    p = reducer(reducer(p, { type: "dig-move", face: "down" }), {
      type: "dig-new",
      seed: 5,
    });
    expect(p.dig).toEqual(newDig(5));
  });
});
