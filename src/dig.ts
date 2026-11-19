// The dig: a column of earth under the camp. Arrow keys walk through dug
// tunnels, Space swings at the block the miner is facing.
export const DIG_WIDTH = 9;
export const ROWS_PER_LEVEL = 4;
export const DIG_LEVELS = 8;
/** Row 0 is the open surface; blocks fill rows 1 and below. */
export const DIG_ROWS = 1 + DIG_LEVELS * ROWS_PER_LEVEL;
/** From this depth level down, the rock is too hard for a pickaxe. */
export const HARD_LEVEL = 5;
export const DRILL_COST = 100;
/** Typing levels to finish before a new drill has power. */
export const DRILL_CHARGE = 10;
/** Swings the miner starts with, and swings earned for each typed rock. */
export const START_ENERGY = 30;
export const ENERGY_PER_ROCK = 2;
export type Facing = "left" | "right" | "up" | "down";
export interface Treasure {
  id: string;
  name: string;
  kind: "ore" | "gem" | "fossil" | "ancient";
  /** Gems earned for finding one. */
  value: number;
}
export const treasures: Treasure[] = [
  { id: "coal", name: "Coal", kind: "ore", value: 1 },
  { id: "copper", name: "Copper ore", kind: "ore", value: 2 },
  { id: "iron", name: "Iron ore", kind: "ore", value: 2 },
  { id: "gold", name: "Gold nugget", kind: "ore", value: 5 },
  { id: "quartz", name: "Quartz", kind: "gem", value: 3 },
  { id: "emerald", name: "Emerald", kind: "gem", value: 8 },
  { id: "ruby", name: "Ruby", kind: "gem", value: 10 },
  { id: "diamond", name: "Diamond", kind: "gem", value: 15 },
  { id: "fossil", name: "Shell fossil", kind: "fossil", value: 5 },
  { id: "bone", name: "Dinosaur bone", kind: "fossil", value: 6 },
  { id: "wood", name: "Petrified wood", kind: "fossil", value: 6 },
  { id: "trilobite", name: "Trilobite", kind: "fossil", value: 8 },
  { id: "skull", name: "Dinosaur skull", kind: "fossil", value: 15 },
  { id: "coin", name: "Ancient coin", kind: "ancient", value: 20 },
  { id: "vase", name: "Ancient vase", kind: "ancient", value: 30 },
  { id: "necklace", name: "Ancient necklace", kind: "ancient", value: 30 },
  { id: "mask", name: "Golden mask", kind: "ancient", value: 40 },
];
/** What can turn up at each depth level, with relative chances. */
export const lootByLevel: [string, number][][] = [
  [
    ["coal", 5],
    ["copper", 3],
  ],
  [
    ["coal", 3],
    ["copper", 3],
    ["iron", 4],
    ["quartz", 2],
  ],
  [
    ["iron", 3],
    ["gold", 3],
    ["bone", 2],
    ["fossil", 3],
  ],
  [
    ["gold", 2],
    ["emerald", 2],
    ["wood", 3],
    ["fossil", 2],
  ],
  [
    ["emerald", 2],
    ["ruby", 2],
    ["trilobite", 3],
    ["wood", 2],
    ["coin", 0.3],
  ],
  [
    ["ruby", 2],
    ["diamond", 2],
    ["skull", 2],
    ["trilobite", 2],
    ["coin", 0.5],
  ],
  [
    ["diamond", 3],
    ["skull", 2],
    ["coin", 1.5],
    ["vase", 0.5],
  ],
  [
    ["diamond", 3],
    ["coin", 2],
    ["vase", 1],
    ["necklace", 1],
    ["mask", 0.6],
  ],
];
/** One block in four hides something. */
export const LOOT_CHANCE = 0.25;
export interface DigState {
  seed: number;
  /** Cell numbers (row * width + column) that have been dug out. */
  dug: number[];
  x: number;
  y: number;
  face: Facing;
  /** The block being chipped at, and how many swings it has taken. */
  crackCell: number;
  cracks: number;
}
export const newDig = (seed = Math.floor(Math.random() * 1e9)): DigState => ({
  seed,
  dug: [],
  x: Math.floor(DIG_WIDTH / 2),
  y: 0,
  face: "down",
  crackCell: -1,
  cracks: 0,
});
export const cellOf = (x: number, y: number) => y * DIG_WIDTH + x;
/** Depth level 1 to 8 for a block row; 0 for the surface. */
export const levelOfRow = (y: number) =>
  y < 1 ? 0 : Math.min(DIG_LEVELS, Math.ceil(y / ROWS_PER_LEVEL));
/** A repeatable random number from 0 to 1 for a seed, cell and purpose. */
export function roll(seed: number, cell: number, salt: number) {
  let h =
    (seed ^ Math.imul(cell + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** The treasure hidden in a block, if any. The same seed always hides the same things. */
export function lootAt(seed: number, cell: number): Treasure | null {
  const level = levelOfRow(Math.floor(cell / DIG_WIDTH));
  if (!level || roll(seed, cell, 1) >= LOOT_CHANCE) return null;
  const table = lootByLevel[level - 1];
  let pick = roll(seed, cell, 2) * table.reduce((sum, [, w]) => sum + w, 0);
  for (const [id, weight] of table) {
    if (pick < weight) return treasures.find((t) => t.id === id)!;
    pick -= weight;
  }
  return treasures.find((t) => t.id === table[table.length - 1][0])!;
}
export const isOpen = (dig: DigState, x: number, y: number) =>
  x >= 0 &&
  x < DIG_WIDTH &&
  y >= 0 &&
  y < DIG_ROWS &&
  (y === 0 || dig.dug.includes(cellOf(x, y)));
const steps: Record<Facing, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};
/** The cell in front of the miner, or null at the edge of the dig. */
export function facingCell(dig: DigState) {
  const [dx, dy] = steps[dig.face],
    x = dig.x + dx,
    y = dig.y + dy;
  return x < 0 || x >= DIG_WIDTH || y < 1 || y >= DIG_ROWS
    ? null
    : { x, y, cell: cellOf(x, y) };
}
/** Turn to face a direction, and step that way when the path is open. */
export function move(dig: DigState, face: Facing): DigState {
  const [dx, dy] = steps[face],
    x = dig.x + dx,
    y = dig.y + dy;
  return isOpen(dig, x, y) ? { ...dig, face, x, y } : { ...dig, face };
}
/** Swings needed to break a block: soft earth one, stone two. A drill needs one. */
export function swingsFor(y: number, drill: boolean) {
  return drill || levelOfRow(y) < 3 ? 1 : 2;
}
export type SwingOutcome =
  | { kind: "nothing" }
  | { kind: "too-hard" }
  | { kind: "no-energy" }
  | { kind: "crack"; dig: DigState }
  | { kind: "broke"; dig: DigState; loot: Treasure | null };
/** What one press of Space does. Cracks and breaks each use one swing of energy. */
export function swing(
  dig: DigState,
  energy: number,
  drill: boolean,
): SwingOutcome {
  const target = facingCell(dig);
  if (!target || dig.dug.includes(target.cell)) return { kind: "nothing" };
  if (levelOfRow(target.y) >= HARD_LEVEL && !drill) return { kind: "too-hard" };
  if (energy < 1) return { kind: "no-energy" };
  const cracks = (dig.crackCell === target.cell ? dig.cracks : 0) + 1;
  if (cracks < swingsFor(target.y, drill))
    return { kind: "crack", dig: { ...dig, crackCell: target.cell, cracks } };
  return {
    kind: "broke",
    dig: {
      ...dig,
      dug: [...dig.dug, target.cell],
      crackCell: -1,
      cracks: 0,
    },
    loot: lootAt(dig.seed, target.cell),
  };
}
