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
export const lessons = [
  {
    id: "home",
    title: "Home row",
    keys: "asdfghjkl",
    hint: "Find the little bumps on F and J. Rest your index fingers there.",
  },
  {
    id: "upper",
    title: "Upper row",
    keys: "qwertyuiop",
    hint: "Reach up from your home row, then bring your fingers back.",
  },
  {
    id: "lower",
    title: "Lower row",
    keys: "zxcvbnm",
    hint: "Reach down gently. There is no need to hurry.",
  },
  {
    id: "apostrophe",
    title: "Apostrophes",
    keys: "'",
    hint: "Your right pinky finds the apostrophe, beside the Enter key.",
  },
  {
    id: "digits",
    title: "Number row",
    keys: "1234567890",
    hint: "Reach up from your home keys.",
  },
  {
    id: "marks",
    title: "Punctuation",
    keys: ",./;'[]-=",
    hint: "Use your right hand for these marks.",
  },
];
export const quarryKeys = new Set(
  lessons.flatMap((lesson) => [...lesson.keys]),
);
export const tools = [
  {
    id: "starter",
    name: "Trusty pick",
    cost: 0,
    color: "#a9c2c5",
    description: "Every adventure starts here.",
  },
  {
    id: "copper",
    name: "Copper pick",
    cost: 20,
    color: "#dca080",
    description: "A warm copper shine.",
  },
  {
    id: "jade",
    name: "Jade pick",
    cost: 40,
    color: "#96d5a5",
    description: "A little forest magic.",
  },
  {
    id: "gold",
    name: "Golden pick",
    cost: 80,
    color: "#f4d17c",
    description: "A sunbeam in the cave.",
  },
  {
    id: "amethyst",
    name: "Amethyst pick",
    cost: 120,
    color: "#c3a4e4",
    description: "Made for purple discoveries.",
  },
  {
    id: "diamond",
    name: "Diamond pick",
    cost: 200,
    color: "#a3e3f1",
    description: "Your brightest adventure yet.",
  },
];
export const caves = [
  {
    id: "moss",
    name: "Mossy Hollow",
    at: 0,
    color: "#91bca1",
    description: "Where your adventure begins",
  },
  {
    id: "crystal",
    name: "Crystal Cavern",
    at: 3,
    color: "#9abddb",
    description: "A hidden world of blue",
  },
  {
    id: "amber",
    name: "Amber Grotto",
    at: 8,
    color: "#dab67c",
    description: "A cave full of golden light",
  },
  {
    id: "moon",
    name: "Moonstone Deep",
    at: 15,
    color: "#bba8d7",
    description: "Something extraordinary awaits",
  },
];
export const decorations = [
  {
    id: "light",
    name: "Lighting",
    choices: [
      { id: "lantern", name: "Little lantern", icon: "🏮", cost: 2 },
      { id: "stars", name: "Star lights", icon: "✨", cost: 4 },
    ],
  },
  {
    id: "plant",
    name: "Garden",
    choices: [
      { id: "fern", name: "Little fern", icon: "🌿", cost: 2 },
      { id: "tree", name: "Cherry tree", icon: "🌸", cost: 4 },
    ],
  },
  {
    id: "pet",
    name: "Companion",
    choices: [
      { id: "snail", name: "Snail buddy", icon: "🐌", cost: 2 },
      { id: "fox", name: "Fox friend", icon: "🦊", cost: 4 },
    ],
  },
  {
    id: "home",
    name: "Shelter",
    choices: [
      { id: "tent", name: "Cozy tent", icon: "⛺", cost: 2 },
      { id: "cabin", name: "Woodland cabin", icon: "🏡", cost: 4 },
    ],
  },
  {
    id: "display",
    name: "Collection",
    choices: [
      { id: "rock", name: "Rock garden", icon: "🪨", cost: 2 },
      { id: "crystal", name: "Crystal display", icon: "💎", cost: 4 },
    ],
  },
  {
    id: "flag",
    name: "Camp marker",
    choices: [
      { id: "flag", name: "Adventure flag", icon: "🚩", cost: 2 },
      { id: "rainbow", name: "Rainbow arch", icon: "🌈", cost: 4 },
    ],
  },
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
  return fingerForKey(key)?.name ?? "Find the highlighted key";
}
