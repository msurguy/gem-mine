import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { ProgressV2 } from "../src/game";

const KEY = "gem-mine:progress:v2";
const save = (page: Page): Promise<ProgressV2> =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
/** Start from a saved game with some fields changed. */
async function seed(page: Page, patch: Partial<ProgressV2>) {
  await page.goto("./");
  await page.evaluate(
    ([k, extra]) => {
      const p = JSON.parse(localStorage.getItem(k as string)!);
      localStorage.setItem(
        k as string,
        JSON.stringify({ ...p, ...(extra as object) }),
      );
    },
    [KEY, patch] as const,
  );
  await page.reload();
}
/** Type whatever the current rock asks for until the run ends. */
async function finishRun(page: Page) {
  for (let i = 0; i < 200; i++) {
    const a = (await save(page)).active;
    if (!a) return;
    await page.keyboard.press(a.prompts[a.index][a.position]);
  }
  throw new Error("run did not finish");
}
const axe = async (page: Page) =>
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

test("first level: meet the keys, type without clicking anything, earn stars", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Mossy Hollow" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /D and K\. Locked/ }),
  ).toBeDisabled();
  await axe(page);
  // The Play button has focus, so Enter alone starts the game.
  await page.keyboard.press("Enter");
  await expect(page.getByText("New key 1 of 2")).toBeVisible();
  await page.keyboard.press("x");
  await expect(page.getByText("New key 1 of 2")).toBeVisible();
  await page.keyboard.press("f");
  await expect(page.getByText("New key 2 of 2")).toBeVisible();
  await page.keyboard.press("j");
  await expect(page.getByLabel("Type f", { exact: true })).toBeVisible();
  await axe(page);
  // A wrong key and a held key do not move on; the miss is counted.
  await page.keyboard.press("q");
  await page.keyboard.down("f");
  await page.keyboard.down("f");
  await page.keyboard.up("f");
  let p = await save(page);
  expect(p.active).toMatchObject({ index: 1, misses: 1, hits: 1 });
  // Typing keeps working after a mouse click elsewhere on the screen.
  await page.getByRole("button", { name: "Hide hands" }).click();
  await page.keyboard.press(p.active!.prompts[1]);
  expect((await save(page)).active!.index).toBe(2);
  // Progress survives a reload, with no step needed to resume.
  await page.reload();
  await page.getByRole("button", { name: /Keep going/ }).click();
  await finishRun(page);
  const result = page.getByRole("dialog", { name: "Level finished" });
  await expect(result).toBeVisible();
  p = await save(page);
  expect(p.levelStars["moss-fj"]).toBe(3);
  expect(p.gems).toBe(16);
  expect(p.energy).toBe(50);
  await axe(page);
  await page.keyboard.press("f");
  expect((await save(page)).gems).toBe(16);
  // Enter goes straight on to the next level.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "D and K" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: /Play F and J\. 3 of 3 stars/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Play D and K/ }),
  ).toBeEnabled();
});

test("school words: type a list, then listen and spell", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Type the words" }).click();
  let p = await save(page);
  expect(p.active).toMatchObject({
    mode: "words",
    levelId: "words:school-2026-02-23",
  });
  await page.keyboard.type(p.active!.prompts[0]);
  p = await save(page);
  expect(p.active!.index).toBe(1);
  await page.keyboard.press("Escape");
  // Older weeks and the mix of every week are one click away.
  await page.getByRole("button", { name: "Older words" }).click();
  await expect(page.getByText("Week of Feb 16")).toBeVisible();
  await page.getByRole("button", { name: "Listen and spell" }).click();
  p = await save(page);
  expect(p.active).toMatchObject({
    mode: "spell",
    levelId: "spell:school-2026-02-16",
  });
  const word = p.active!.prompts[0];
  await expect(page.getByText(word, { exact: true })).toHaveCount(0);
  // Two wrong tries show the word so nobody gets stuck.
  await page.keyboard.type("zz");
  await page.keyboard.press("Backspace");
  expect((await save(page)).active!.typed).toBe("z");
  await page.keyboard.press("Enter");
  await page.keyboard.type("zz");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Copy the word.")).toBeVisible();
  await page.keyboard.type(word);
  await page.keyboard.press("Enter");
  p = await save(page);
  expect(p.active).toMatchObject({ index: 1, clean: 0 });
  await page.keyboard.type(p.active!.prompts[1]);
  await page.getByRole("button", { name: "Check" }).click();
  expect((await save(page)).active).toMatchObject({ index: 2, clean: 1 });
  await axe(page);
});

test("dig with arrows and space, find treasure, and run out of power", async ({
  page,
}) => {
  await seed(page, {
    energy: 4,
    dig: {
      seed: 11,
      dug: [],
      x: 4,
      y: 0,
      face: "down",
      crackCell: -1,
      cracks: 0,
    },
  });
  await page.getByRole("button", { name: "Dig", exact: true }).click();
  await axe(page);
  // Space digs straight away, even though a menu button was just clicked.
  await page.keyboard.press("Space");
  let p = await save(page);
  expect(p.dig.dug).toEqual([13]);
  expect(p.energy).toBe(3);
  await page.keyboard.press("ArrowDown");
  expect((await save(page)).dig).toMatchObject({ x: 4, y: 1 });
  // Walking into earth only turns the miner.
  await page.keyboard.press("ArrowLeft");
  expect((await save(page)).dig).toMatchObject({ x: 4, y: 1, face: "left" });
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowLeft");
  }
  p = await save(page);
  expect(p.energy).toBe(0);
  expect(p.dig.dug).toHaveLength(4);
  await page.keyboard.press("Space");
  await expect(page.getByText("Out of dig power!")).toBeVisible();
  expect((await save(page)).dig.dug).toHaveLength(4);
  // The on-screen buttons do the same as the keys.
  await page.getByRole("button", { name: "Right" }).click();
  expect((await save(page)).dig.x).toBe(p.dig.x + 1);
  await page.getByRole("button", { name: "Go type" }).click();
  await expect(
    page.getByRole("heading", { name: "Mossy Hollow" }),
  ).toBeVisible();
});

test("hard rock needs the drill, which is bought and then powered by levels", async ({
  page,
}) => {
  // Standing at the bottom of depth level 4, facing the hard rock of level 5.
  const shaft = Array.from({ length: 16 }, (_, i) => (i + 1) * 9 + 4);
  await seed(page, {
    gems: 100,
    energy: 9,
    dig: {
      seed: 11,
      dug: shaft,
      x: 4,
      y: 16,
      face: "down",
      crackCell: -1,
      cracks: 0,
    },
  });
  await page.getByRole("button", { name: "Dig", exact: true }).click();
  await page.keyboard.press("Space");
  await expect(page.getByText("This rock is too hard!")).toBeVisible();
  expect((await save(page)).energy).toBe(9);
  await page.getByRole("button", { name: "Toolshed" }).last().click();
  await page
    .getByRole("button", { name: "Buy the drill for 100 gems" })
    .click();
  let p = await save(page);
  expect(p).toMatchObject({ gems: 0, drill: { owned: true, charge: 0 } });
  await expect(
    page.getByRole("progressbar", { name: "Drill power 0 of 10" }),
  ).toBeVisible();
  await axe(page);
  // One finished level adds one bar of power.
  await page.getByRole("button", { name: "Go type" }).click();
  await page.locator(".big-play").click();
  await page.keyboard.press("f");
  await page.keyboard.press("j");
  await finishRun(page);
  await expect(page.getByText("Drill power 1 of 10")).toBeVisible();
  // With full power the drill cuts the hard rock in one go.
  await seed(page, { drill: { owned: true, charge: 10 } });
  await page.getByRole("button", { name: "Dig", exact: true }).click();
  await page.keyboard.press("Space");
  p = await save(page);
  expect(p.dig.dug).toContain(17 * 9 + 4);
});

test("toolshed shows finds, and gems buy pickaxes and camp stickers", async ({
  page,
}) => {
  await seed(page, { gems: 60, finds: { gold: 2 } });
  await page.getByRole("button", { name: "Toolshed" }).click();
  await expect(page.locator('[data-find="gold"]')).toContainText("Gold nugget");
  await expect(page.locator('[data-find="gold"]')).toContainText("× 2");
  await expect(page.locator('[data-find="mask"]')).toContainText("???");
  await page
    .getByRole("button", { name: "Buy Copper pick for 30 gems" })
    .click();
  expect(await save(page)).toMatchObject({ gems: 30, selectedTool: "copper" });
  await expect(
    page.getByRole("button", { name: /Buy Golden pick/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Use Trusty pick" }).click();
  expect((await save(page)).selectedTool).toBe("starter");
  await page.getByRole("button", { name: "My camp" }).click();
  await page
    .getByRole("button", { name: "Buy Snail buddy for 20 gems" })
    .click();
  await expect(page.locator('[data-placed="snail"]')).toBeVisible();
  expect(await save(page)).toMatchObject({
    gems: 10,
    ownedDecorations: ["snail"],
  });
  await axe(page);
  await page.reload();
  await page.getByRole("button", { name: "My camp" }).click();
  await expect(page.locator('[data-placed="snail"]')).toBeVisible();
});

test("grown-ups: add a word list, open every level, back up and reset", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Grown-ups" }).click();
  await axe(page);
  await page
    .getByRole("textbox", { name: "Spelling words" })
    .fill("rock, gem\nI’ll");
  await page.getByLabel("Week beginning").fill("2026-12-07");
  await page.getByRole("button", { name: /Preview 3 words/ }).click();
  await page.getByRole("button", { name: "Add this list" }).click();
  await page.getByLabel("Open every level").check();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress" }).click();
  expect((await download).suggestedFilename()).toBe("gem-mine-backup.json");
  await page.getByRole("button", { name: "Gem Mine map" }).click();
  await expect(page.getByText("Week of Dec 7")).toBeVisible();
  await page.getByRole("button", { name: "Next cave" }).click();
  await expect(
    page.getByRole("button", { name: /Play E and I/ }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Grown-ups" }).click();
  await page.getByRole("button", { name: "Reset progress" }).click();
  await page.getByRole("button", { name: "Reset everything" }).click();
  const p = await save(page);
  expect(p.customLists).toEqual([]);
  expect(p.settings.unlockAll).toBe(false);
});

test("an old save is carried forward and a broken save is preserved", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "gem-mine:progress:v1",
      JSON.stringify({
        version: 1,
        ore: 20,
        gems: 2,
        expeditions: 2,
        rocks: 20,
        ownedTools: ["starter"],
        selectedTool: "starter",
        selectedCave: "moss",
        ownedDecorations: ["pet/fox"],
        placed: { pet: "fox" },
        settings: { sound: true, motion: true, showHands: true },
        customLists: [],
        stats: {},
        keyStats: {},
        active: null,
        lastResult: null,
      }),
    );
  });
  await page.reload();
  await expect(page.getByTestId("gems")).toHaveText("40");
  await page.getByRole("button", { name: "My camp" }).click();
  await expect(page.locator('[data-placed="fox"]')).toBeVisible();
  await page.evaluate((k) => localStorage.setItem(k, "{broken"), KEY);
  await page.reload();
  await expect(page.getByText(/needs attention/)).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe(
    "{broken",
  );
});

test("fits a small laptop and a narrow window without sideways scrolling", async ({
  page,
}) => {
  for (const size of [
    { width: 1024, height: 680 },
    { width: 430, height: 820 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("./");
    const fits = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
    expect(await fits()).toBe(true);
    await page.locator(".big-play").click();
    expect(await fits()).toBe(true);
    await expect(page.locator(".keyboard")).toBeInViewport({ ratio: 0.95 });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Dig", exact: true }).click();
    expect(await fits()).toBe(true);
    await page.evaluate(() => localStorage.clear());
  }
});
