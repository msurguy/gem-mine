import { fingerForKey } from "./fingers";
export interface WordList {
  id: string;
  title: string;
  date: string;
  words: string[];
}
const rows = [
  [
    "2026-01-05",
    "Short vowels",
    "cat, map, hen, bed, pig, sit, dog, hop, mud, bus, red, fun",
  ],
  [
    "2026-01-12",
    "Silent e",
    "cake, kite, name, time, home, five, made, ride, nose, game, gave, nice",
  ],
  [
    "2026-01-19",
    "Blends",
    "stop, frog, swim, flag, grass, sled, glad, black, truck, snow, star, green",
  ],
  [
    "2026-01-26",
    "sh, ch, th, wh",
    "ship, shop, fish, wish, much, lunch, catch, that, then, thank, when, white",
  ],
  [
    "2026-02-02",
    "Vowel teams",
    "rain, paint, tree, seed, sheep, feet, goat, road, coat, moon, room, soon",
  ],
  [
    "2026-02-09",
    "Bossy r",
    "car, farm, dark, hard, start, her, bird, girl, first, turn, horse, short",
  ],
  [
    "2026-02-16",
    "Contractions",
    "can't, don't, won't, didn't, isn't, I'm, I've, you're, we'll, they're, let's, here's",
  ],
  [
    "2026-02-23",
    "Tricky words",
    "because, friend, people, said, could, would, should, again, every, laugh, enough, through",
  ],
];
/** Sample weekly lists. Every word has a recorded clip in public/audio/words. */
export const schoolLists: WordList[] = rows.map(([date, title, words]) => ({
  id: `school-${date}`,
  date,
  title,
  words: words.split(", "),
}));
export interface World {
  id: string;
  name: string;
  tagline: string;
  art: string;
}
export const worlds: World[] = [
  {
    id: "moss",
    name: "Mossy Hollow",
    tagline: "Home keys",
    art: "./art/bg-moss.jpg",
  },
  {
    id: "crystal",
    name: "Crystal Cavern",
    tagline: "Top row",
    art: "./art/crystal-grotto.jpg",
  },
  {
    id: "amber",
    name: "Amber Grotto",
    tagline: "Bottom row",
    art: "./art/bg-amber.jpg",
  },
  {
    id: "moon",
    name: "Moonstone Deep",
    tagline: "Numbers and marks",
    art: "./art/bg-moon.jpg",
  },
];
export interface Level {
  id: string;
  world: string;
  /** Short label for the map stone, such as "F J". */
  label: string;
  title: string;
  /** Keys this level teaches for the first time. */
  newKeys: string;
  /** Real words to type instead of key patterns. */
  words?: string[];
}
const key = (world: string, newKeys: string): Level => ({
  id: `${world}-${newKeys}`,
  world,
  label: [...newKeys].join(" ").toUpperCase(),
  title: [...newKeys].map((k) => k.toUpperCase()).join(" and "),
  newKeys,
});
const wordLevel = (world: string, title: string, list: string): Level => ({
  id: `${world}-words`,
  world,
  label: "abc",
  title,
  newKeys: "",
  words: list.split(" "),
});
export const levels: Level[] = [
  key("moss", "fj"),
  key("moss", "dk"),
  key("moss", "sl"),
  key("moss", "a;"),
  key("moss", "gh"),
  wordLevel(
    "moss",
    "Home row words",
    "dad sad ask add all fall hall flag glad glass salad flash dash has had shall half",
  ),
  key("crystal", "ei"),
  key("crystal", "ru"),
  key("crystal", "ty"),
  key("crystal", "wo"),
  key("crystal", "qp"),
  wordLevel(
    "crystal",
    "Top row words",
    "the you were write pretty tired quiet purple yellow little other people sister start play laugh",
  ),
  key("amber", "vm"),
  key("amber", "bn"),
  key("amber", "c,"),
  key("amber", "x."),
  { ...key("amber", "z"), label: "Z", title: "Z" },
  wordLevel(
    "amber",
    "Every letter words",
    "zebra mix cave gem number move become magic zoom box never brave crystal jump cabin diamond",
  ),
  { ...key("moon", "4567"), title: "4, 5, 6 and 7" },
  { ...key("moon", "123"), title: "1, 2 and 3" },
  { ...key("moon", "890"), title: "8, 9 and 0" },
  { ...key("moon", "'-"), title: "Apostrophe and dash" },
  wordLevel(
    "moon",
    "Apostrophe words",
    "don't it's I'll can't we're isn't you're he's she's that's didn't let's",
  ),
];
/** Every key the game can ask for. */
export const typeKeys = new Set([
  ..."abcdefghijklmnopqrstuvwxyz1234567890,./;'[]-=",
]);
/** Keys taught before this level, oldest first. */
export function learnedBefore(level: Level) {
  return levels
    .slice(0, levels.indexOf(level))
    .map((l) => l.newKeys)
    .join("");
}
/**
 * Ten rocks for a key level: single new keys first, then short patterns of
 * the new keys, then patterns that mix in keys from earlier levels.
 */
export function keyPrompts(level: Level, random = Math.random): string[] {
  const fresh = [...level.newKeys],
    old = [...learnedBefore(level)].slice(-8);
  const pick = (from: string[]) => from[Math.floor(random() * from.length)];
  const pattern = (length: number, from: string[]) => {
    let out = pick(fresh);
    while (out.length < length) out += pick(from);
    return out;
  };
  const singles = Array.from({ length: 4 }, (_, i) => fresh[i % fresh.length]);
  const mixed = old.length ? [...fresh, ...fresh, ...old] : fresh;
  return [
    ...singles,
    pattern(2, fresh),
    pattern(2, fresh),
    pattern(3, fresh),
    pattern(3, mixed),
    pattern(3, mixed),
    pattern(4, mixed),
  ];
}
export const tools = [
  { id: "starter", name: "Trusty pick", cost: 0, color: "#a9c2c5" },
  { id: "copper", name: "Copper pick", cost: 30, color: "#e39a6c" },
  { id: "jade", name: "Jade pick", cost: 60, color: "#7fd896" },
  { id: "gold", name: "Golden pick", cost: 100, color: "#ffd257" },
  { id: "amethyst", name: "Amethyst pick", cost: 150, color: "#c99bf2" },
  { id: "diamond", name: "Diamond pick", cost: 220, color: "#8fe9ff" },
];
/** Camp stickers. x, y and size are percentages of the camp picture. */
export const decorations = [
  { id: "fern", name: "Little fern", cost: 15, x: 12, y: 86, size: 8 },
  { id: "lantern", name: "Lantern", cost: 15, x: 39, y: 70, size: 6 },
  { id: "snail", name: "Snail buddy", cost: 20, x: 50, y: 90, size: 7 },
  { id: "flag", name: "Adventure flag", cost: 20, x: 58, y: 58, size: 9 },
  { id: "campfire", name: "Campfire", cost: 30, x: 64, y: 82, size: 11 },
  { id: "crystals", name: "Crystal pile", cost: 30, x: 25, y: 84, size: 8 },
  { id: "fox", name: "Fox friend", cost: 40, x: 76, y: 86, size: 9 },
  { id: "starlights", name: "Star lights", cost: 40, x: 46, y: 52, size: 16 },
  { id: "cherrytree", name: "Cherry tree", cost: 50, x: 31, y: 56, size: 15 },
  { id: "chest", name: "Treasure chest", cost: 50, x: 37, y: 88, size: 9 },
  { id: "cabin", name: "Log cabin", cost: 70, x: 70, y: 58, size: 15 },
  { id: "rainbow", name: "Rainbow", cost: 80, x: 52, y: 24, size: 26 },
];
export const normalize = (word: string) =>
  word.replace(/[‘’]/g, "'").toLowerCase();
export const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
export function parseWords(text: string) {
  return [
    ...new Set(
      text
        .split(/[,\n]/)
        .map((w) => w.trim().replace(/[‘’]/g, "'"))
        .filter(Boolean),
    ),
  ];
}
export function fingerFor(key: string) {
  return fingerForKey(key)?.name ?? "";
}
