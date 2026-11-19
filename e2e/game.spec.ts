import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { ProgressV1 } from "../src/game";
import AxeBuilder from "@axe-core/playwright";
const save = async (page: Page): Promise<ProgressV1> =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("gem-mine:progress:v1")!),
  );
test("a real keyboard expedition, focus pause, reload and exactly-once rewards", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Let’s mine" }).click();
  const area = page.getByRole("group", { name: /Mining keyboard/ });
  await expect(area).toBeFocused();
  let p = await save(page);
  const first = p.active.prompts[0];
  await page.keyboard.press(first === "x" ? "z" : "x");
  p = await save(page);
  expect(p.active.index).toBe(0);
  expect(p.active.mistakes).toBe(1);
  await page.keyboard.press("Escape");
  await page.keyboard.press(first);
  expect((await save(page)).active.index).toBe(0);
  await area.focus();
  await page.keyboard.down(first);
  await page.keyboard.down(first);
  await page.keyboard.up(first);
  expect((await save(page)).active.index).toBe(1);
  await page.reload();
  await expect(page.getByText("Ready to keep mining?")).toBeVisible();
  await area.focus();
  for (let i = 1; i < 10; i++) {
    p = await save(page);
    await page.keyboard.press(p.active.prompts[p.active.index]);
  }
  await expect(page.getByRole("dialog")).toBeVisible();
  p = await save(page);
  expect(p.ore).toBe(10);
  expect(p.gems).toBe(1);
  expect(p.expeditions).toBe(1);
  await page.keyboard.press(first);
  expect((await save(page)).ore).toBe(10);
  await page.getByRole("button", { name: "Back to the mine" }).click();
  await page.reload();
  expect((await save(page)).gems).toBe(1);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("word mode requires every character and custom lists survive reload", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Grown-up corner" }).click();
  await page
    .getByRole("textbox", { name: "Spelling words" })
    .fill("I'll, you're, gem");
  await page.getByRole("button", { name: "Preview 3 words" }).click();
  await page.getByRole("button", { name: "Add this list" }).click();
  const p = await save(page);
  expect(p.customLists).toHaveLength(1);
  await page.getByRole("button", { name: "The mine", exact: true }).click();
  await page.getByRole("button", { name: "Word Mine", exact: true }).click();
  await page.getByRole("combobox").selectOption(p.customLists[0].id);
  await page.getByRole("button", { name: "Let’s mine" }).click();
  await expect(
    page.getByRole("group", { name: /Mining keyboard/ }),
  ).toBeFocused();
  const word = (await save(page)).active!.prompts[0];
  await page.keyboard.type(word.slice(0, -1).toUpperCase());
  await expect
    .poll(async () => (await save(page)).active?.position)
    .toBe(word.length - 1);
  expect((await save(page)).ore).toBe(0);
  await page.reload();
  await page.getByRole("group", { name: /Mining keyboard/ }).focus();
  await page.keyboard.type(word.slice(-1).toUpperCase());
  expect((await save(page)).ore).toBe(5);
});
test("spelling challenge separates assisted and unaided words and completes a session", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Treasure Challenge", exact: true })
    .click();
  await page.getByRole("button", { name: "Let’s mine" }).click();
  for (let i = 0; i < 10; i++) {
    const p = await save(page);
    if (i === 0)
      await page.getByRole("button", { name: "Reveal hint" }).click();
    await page
      .getByRole("textbox", { name: "Type the word you hear" })
      .fill(p.active.prompts[i]);
    await page.getByRole("button", { name: "Mine it" }).click();
  }
  await expect(page.getByRole("dialog")).toBeVisible();
  const p = await save(page);
  expect(p.ore).toBe(50);
  expect(p.gems).toBe(1);
  expect(Object.values(p.stats).reduce((n, s) => n + s.unaided, 0)).toBe(9);
});
test("export, malformed import, preview, cancel and restore", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Grown-up corner" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export progress", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("gem-mine-backup.json");
  const before = await save(page);
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(page.getByRole("alert")).toContainText("not readable JSON");
  expect(await save(page)).toEqual(before);
  const backup = {
    format: "gem-mine",
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: { ...before, ore: 100, gems: 6 },
  };
  await page.locator("input[type=file]").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("dialog")).toContainText("100 ore");
  expect((await save(page)).ore).toBe(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await save(page)).ore).toBe(0);
  await page.locator("input[type=file]").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "Replace & restore" }).click();
  expect((await save(page)).ore).toBe(100);
  await page.getByRole("button", { name: "Discoveries", exact: true }).click();
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Copper pick", exact: true }),
    })
    .getByRole("button")
    .click();
  expect((await save(page)).ore).toBe(80);
  await page.getByRole("button", { name: "My base", exact: true }).click();
  await page.getByRole("button", { name: /Buy Snail buddy/ }).click();
  expect((await save(page)).gems).toBe(4);
  await page.reload();
  expect((await save(page)).placed.pet).toBe("snail");
});
test("corrupt storage is preserved", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("gem-mine:progress:v1", "broken"),
  );
  await page.goto("./");
  await expect(page.getByText(/Your saved file needs attention/)).toBeVisible();
  await page.getByRole("button", { name: "Let’s mine" }).click();
  await page.keyboard.press("a");
  expect(
    await page.evaluate(() => localStorage.getItem("gem-mine:progress:v1")),
  ).toBe("broken");
});
test("responsive layout, keyboard dialog navigation, reduced motion and accessibility", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page
    .getByRole("button", { name: "How to play", exact: true })
    .first()
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Let’s mine" }).click();
  const p = await save(page);
  await page.keyboard.press(p.active.prompts[0]);
  expect(
    await page
      .locator(".scene-pick")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/gem-mine-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("blocked storage allows play and export with an honest warning", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get: () => {
        throw new Error("Blocked");
      },
    });
  });
  await page.goto("./");
  await expect(
    page.getByText(/Progress isn’t being saved/).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Let’s mine" }).click();
  const area = page.getByRole("group", { name: /Mining keyboard/ });
  await area.focus();
  const key = await page.locator(".keyboard-key.target").textContent();
  await page.keyboard.press(key!);
  await expect(page.locator(".prompt-count")).toContainText("1");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export backup", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("gem-mine-backup.json");
});
test("all main screens have accessible labels and readable text", async ({
  page,
}) => {
  await page.goto("./");
  for (const screen of ["Discoveries", "My base", "Grown-up corner"]) {
    await page.getByRole("button", { name: screen, exact: true }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      screen,
    ).toEqual([]);
  }
});

test("clicking the rock starts or resumes physical typing", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Start mining at the rock" }).click();
  const area = page.getByRole("group", { name: /Mining keyboard/ });
  await expect(area).toBeFocused();
  let p = await save(page);
  await page.keyboard.press("Escape");
  await page.keyboard.press(p.active!.prompts[0]);
  expect((await save(page)).ore).toBe(0);
  await page.getByRole("button", { name: "Resume typing at the rock" }).click();
  await expect(area).toBeFocused();
  await page.keyboard.press(p.active!.prompts[0]);
  expect((await save(page)).ore).toBe(1);
  await page.keyboard.press("Escape");
  await page.locator(".keyboard-key.target").click();
  await expect(area).toBeFocused();
  p = await save(page);
  await page.keyboard.press(p.active!.prompts[1]);
  expect((await save(page)).ore).toBe(2);
});

test("number and punctuation expeditions resume with the right key highlighted", async ({
  page,
}) => {
  for (const lesson of ["digits", "marks"]) {
    await page.goto("./");
    await page.getByRole("combobox").selectOption(lesson);
    await page.getByRole("button", { name: "Let’s mine" }).click();
    for (let i = 0; i < 10; i++) {
      if (i === 1) {
        await page.reload();
        await page.getByRole("group", { name: /Mining keyboard/ }).focus();
      }
      const p = await save(page);
      const key = p.active!.prompts[i];
      await expect(page.locator(".keyboard-key.target")).toHaveText(key);
      await page.keyboard.type(key);
    }
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Back to the mine" }).click();
  }
  expect((await save(page)).ore).toBe(20);
});

test("mine hands follow school words and remember the toggle", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Word Mine", exact: true }).click();
  await page.getByRole("button", { name: "Let’s mine" }).click();
  const p = await save(page);
  const word = p.active!.prompts[0].toLowerCase();
  const deck = page.locator(".keyboard-deck");
  const toggle = deck.getByRole("button", { name: "Show hands" });
  await expect(deck.locator('[data-phase="reach"]')).toHaveCount(1);
  await page.keyboard.type(word[0]);
  await expect(deck.locator(".keyboard-key.target")).toHaveText(
    word[1].toUpperCase(),
  );
  await toggle.click();
  await expect(deck.locator(".hand-outline")).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: /Mining keyboard/ }),
  ).toBeFocused();
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(deck.locator(".hand-outline")).toHaveCount(2);
  await page.keyboard.type(word.slice(1));
  expect((await save(page)).active!.index).toBe(1);
});
