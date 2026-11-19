import { keycaps } from "./keyboardLayout";
export const fingers = [
  { id: "lp", name: "Left pinky", home: "a", keys: "`1qaz", color: "#bc7391" },
  {
    id: "lr",
    name: "Left ring finger",
    home: "s",
    keys: "2wsx",
    color: "#b59245",
  },
  {
    id: "lm",
    name: "Left middle finger",
    home: "d",
    keys: "3edc",
    color: "#709662",
  },
  {
    id: "li",
    name: "Left index finger",
    home: "f",
    keys: "45rtfgvb",
    color: "#5b9f99",
  },
  {
    id: "ri",
    name: "Right index finger",
    home: "j",
    keys: "67yuhjnm",
    color: "#5b9f99",
  },
  {
    id: "rm",
    name: "Right middle finger",
    home: "k",
    keys: "8ik,",
    color: "#709662",
  },
  {
    id: "rr",
    name: "Right ring finger",
    home: "l",
    keys: "9ol.",
    color: "#b59245",
  },
  {
    id: "rp",
    name: "Right pinky",
    home: ";",
    keys: "0-=p[]\\;'/",
    color: "#bc7391",
  },
  { id: "thumb", name: "Either thumb", home: " ", keys: " ", color: "#8d81b2" },
];
export const fingerLessons = [
  {
    id: "anchors",
    title: "Find your anchors",
    description: "Feel the bumps on F and J with your index fingers.",
    keys: ["f", "j", "f", "j", "f", "j"],
  },
  {
    id: "home",
    title: "A home for every finger",
    description:
      "Left hand: A S D F. Right hand: J K L ;. Thumbs float over Space.",
    keys: ["a", "s", "d", "f", "j", "k", "l", ";", " "],
  },
  {
    id: "reach",
    title: "Reach & come home",
    description:
      "Move one finger, tap the key, then bring it back to its home.",
    keys: [
      "r",
      "u",
      "e",
      "i",
      "w",
      "o",
      "q",
      "p",
      "g",
      "h",
      "v",
      "m",
      "'",
      " ",
    ],
  },
  {
    id: "numbers",
    title: "Number tunnels",
    description: "Reach up to the number row, then bring your finger home.",
    keys: [..."1234567890"],
  },
  {
    id: "symbols",
    title: "Secret symbols",
    description: "Use your right hand to find the punctuation keys.",
    keys: [...",./;'[]-="],
  },
];
export interface FingerPractice {
  lessonId: string;
  step: number;
  completed: string[];
}
export const initialFingerPractice = (): FingerPractice => ({
  lessonId: "anchors",
  step: 0,
  completed: [],
});
export const fingerForKey = (key: string) =>
  fingers.find((f) => f.keys.includes(key.toLowerCase()));
export const keyLabel = (key: string) =>
  key === " " ? "Space" : key.toUpperCase();
export const keyboardKeys = keycaps.filter(
  (k) => k.x < 900 && k.key.length === 1,
);
export const keyPosition = (key: string) => {
  const k = keyboardKeys.find((k) => k.key === key)!;
  return { x: k.x + k.w / 2, y: k.y + 25 };
};
export function isFingerPractice(value: unknown): value is FingerPractice {
  if (!value || typeof value !== "object") return false;
  const p = value as FingerPractice,
    lesson = fingerLessons.find((l) => l.id === p.lessonId);
  return (
    !!lesson &&
    Number.isInteger(p.step) &&
    p.step >= 0 &&
    p.step <= lesson.keys.length &&
    Array.isArray(p.completed) &&
    p.completed.length <= fingerLessons.length &&
    new Set(p.completed).size === p.completed.length &&
    p.completed.every((id) => fingerLessons.some((l) => l.id === id))
  );
}
export function acceptsFingerKey(e: {
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
    !!fingerForKey(e.key)
  );
}
