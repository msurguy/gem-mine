// A US ANSI desktop keyboard, measured in units of one square key.
type KeySpec = string | [string, number, number?];
export interface Keycap {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
function row(y: number, start: number, entries: KeySpec[]): Keycap[] {
  let x = start;
  return entries.map((entry) => {
    const [key, width, height = 1] =
      typeof entry === "string" ? [entry, 1] : entry;
    const cap = {
      key,
      x: x * 60,
      y: y * 60,
      w: width * 60 - 6,
      h: height * 60 - 6,
    };
    x += width;
    return cap;
  });
}
export const keycaps = [
  ...row(-1.2, 0, ["Esc"]),
  ...row(-1.2, 2, ["F1", "F2", "F3", "F4"]),
  ...row(-1.2, 6.5, ["F5", "F6", "F7", "F8"]),
  ...row(-1.2, 11, ["F9", "F10", "F11", "F12"]),
  ...row(0, 0, [..."`1234567890-=", ["Backspace", 2]]),
  ...row(1, 0, [["Tab", 1.5], ..."qwertyuiop[]", ["\\", 1.5]]),
  ...row(2, 0, [["Caps Lock", 1.75], ..."asdfghjkl;'", ["Enter", 2.25]]),
  ...row(3, 0, [["Shift", 2.25], ..."zxcvbnm,./", ["Shift", 2.75]]),
  ...row(4, 0, [
    ["Ctrl", 1.25],
    ["Win", 1.25],
    ["Alt", 1.25],
    [" ", 6.25],
    ["Alt", 1.25],
    ["Win", 1.25],
    ["Menu", 1.25],
    ["Ctrl", 1.25],
  ]),
  ...row(-1.2, 15.45, ["PrtSc", "ScrLk", "Pause"]),
  ...row(0, 15.45, ["Ins", "Home", "PgUp"]),
  ...row(1, 15.45, ["Del", "End", "PgDn"]),
  ...row(3, 16.45, ["↑"]),
  ...row(4, 15.45, ["←", "↓", "→"]),
  ...row(0, 18.9, ["Num", "/", "*", "-"]),
  ...row(1, 18.9, ["7", "8", "9", ["+", 1, 2]]),
  ...row(2, 18.9, ["4", "5", "6"]),
  ...row(3, 18.9, ["1", "2", "3", ["Enter", 1, 2]]),
  ...row(4, 18.9, [["0", 2], "."]),
];
