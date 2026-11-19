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
    name: "Left pointer finger",
    home: "f",
    keys: "45rtfgvb",
    color: "#5b9f99",
  },
  {
    id: "ri",
    name: "Right pointer finger",
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
  { id: "thumb", name: "Thumb", home: " ", keys: " ", color: "#8d81b2" },
];
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
