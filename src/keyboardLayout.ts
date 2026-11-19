// The main block of a US ANSI keyboard, measured in units of one square key.
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
];
