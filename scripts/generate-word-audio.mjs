// Makes one spoken clip in public/audio/words/ for every word in
// src/curriculum.ts and scripts/spelling-words.txt.
// Words that already have a clip are skipped, so it is cheap to rerun after
// adding words. Pass words as arguments to redo just those:
//   OPENAI_API_KEY=... node scripts/generate-word-audio.mjs [word ...]
// Needs ffmpeg on the PATH.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "vite";

const MODEL = "gpt-4o-mini-tts";
const VOICE = "marin";
const INSTRUCTIONS =
  "You are reading a spelling test word to a seven-year-old. Say only the " +
  "word, once, slowly and very clearly, in a warm, friendly voice. " +
  "Pronounce every sound. Do not add any other words.";
const OUT = "public/audio/words";
// Trim silence from both ends, then encode a small mono MP3. The threshold
// is low and a little lead-in is kept so soft starts like "h" survive.
const trim =
  "silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0.08";
const FILTER = `${trim},areverse,${trim},areverse`;

const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("Set OPENAI_API_KEY");

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
const { schoolLists, levels } = await vite.ssrLoadModule("/src/curriculum.ts");
const { clipName } = await vite.ssrLoadModule("/src/audio.ts");
await vite.close();

const redo = process.argv.slice(2);
const all = [
  ...schoolLists.flatMap((l) => l.words),
  ...levels.flatMap((l) => l.words ?? []),
  ...readFileSync("scripts/spelling-words.txt", "utf8")
    .split("\n")
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean),
];
const todo = [
  ...new Map((redo.length ? redo : all).map((w) => [clipName(w), w])),
].filter(([name]) => redo.length || !existsSync(`${OUT}/${name}.mp3`));
mkdirSync(OUT, { recursive: true });

// The model now and then returns a near-empty take, so try again.
async function make(job) {
  for (let tries = 3; ;) {
    await record(job);
    if (statSync(`${OUT}/${job[0]}.mp3`).size > 3000) break;
    if (!--tries) throw new Error(`${job[1]}: clip is too short`);
  }
  console.log(`${job[1]} -> ${job[0]}.mp3`);
}
async function record([name, word]) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: `${word[0].toUpperCase()}${word.slice(1)}.`,
      instructions: INSTRUCTIONS,
      response_format: "wav",
    }),
  });
  if (!res.ok) throw new Error(`${word}: ${res.status} ${await res.text()}`);
  const wav = Buffer.from(await res.arrayBuffer());
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-i", "pipe:0", "-af", FILTER].concat([
        "-ac",
        "1",
        "-b:a",
        "64k",
        `${OUT}/${name}.mp3`,
      ]),
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) =>
      code ? reject(new Error(`${word}: ffmpeg exited ${code}`)) : resolve(),
    );
    ffmpeg.stdin.end(wav);
  });
}

let failed = 0;
const queue = [...todo];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let job; (job = queue.shift());)
      await make(job).catch((e) => {
        failed++;
        console.error(e.message);
      });
  }),
);
console.log(`${todo.length - failed} made, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
