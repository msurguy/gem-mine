import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
const saved = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("gem-mine:progress:v1")!),
  );
const open = async (page: Page) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Finger school", exact: true })
    .click();
};
test("demonstrates the right finger reaching, pressing and returning; can pause", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /Reach & come home/ }).click();
  await page.getByRole("button", { name: "Play demo", exact: true }).click();
  const finger = page.locator('[data-finger="li"]');
  await expect(finger).toHaveAttribute("data-phase", "press");
  await expect(finger).toHaveAttribute("data-contact", "r");
  const contact = await finger.evaluate((el) => {
    const key = el
      .closest("svg")!
      .querySelector('[data-key="r"] rect')!
      .getBoundingClientRect();
    const tip = new DOMPoint(0, 5).matrixTransform(
      (el as SVGGraphicsElement).getScreenCTM()!,
    );
    return (
      tip.x >= key.left &&
      tip.x <= key.right &&
      tip.y >= key.top &&
      tip.y <= key.bottom
    );
  });
  expect(contact).toBe(true);
  await expect(finger).toHaveAttribute("data-phase", "home");
  await page.getByRole("button", { name: "Pause demo", exact: true }).click();
  await expect(finger).toHaveAttribute("data-phase", "home");
  await expect(
    page.getByRole("button", { name: "Play demo", exact: true }),
  ).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.failureSummary),
    })),
  ).toEqual([]);
  await page.screenshot({ path: "/tmp/gem-finger-school.png", fullPage: true });
});
test("practices home positions including semicolon and space; saves without affecting mining", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Let’s mine" }).click();
  const before = (await saved(page)).active;
  await page
    .getByRole("button", { name: "Finger school", exact: true })
    .click();
  await page.getByRole("button", { name: /A home for every finger/ }).click();
  await page.getByRole("button", { name: "Your turn", exact: true }).click();
  const area = page.getByRole("group", { name: /Finger practice/ });
  await area.focus();
  await page.keyboard.press("x");
  await expect(page.getByText(/Try A with your left pinky/)).toBeVisible();
  await expect(page.getByRole("button", { name: /I’m home/ })).toBeDisabled();
  for (const key of ["a", "s", "d", "f", "j", "k", "l", ";", " "]) {
    await area.focus();
    await page.keyboard.press(key === " " ? "Space" : key);
    await expect(page.getByText("Good tap. Now come home.")).toBeVisible();
    await page
      .getByRole("button", { name: key === " " ? "Finish lesson" : /I’m home/ })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Your fingers found their home!" }),
  ).toBeVisible();
  expect((await saved(page)).fingerPractice.completed).toContain("home");
  expect((await saved(page)).active).toEqual(before);
  await page.reload();
  await page
    .getByRole("button", { name: "Finger school", exact: true })
    .click();
  await page.getByRole("button", { name: "Your turn", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your fingers found their home!" }),
  ).toBeVisible();
});
test("pauses physical practice outside its focus and respects motion preferences", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.getByRole("button", { name: "Your turn", exact: true }).click();
  const area = page.getByRole("group", { name: /Finger practice/ });
  await expect(area).toBeFocused();
  await page.keyboard.press("Escape");
  await page.keyboard.press("f");
  await expect(page.getByRole("button", { name: /I’m home/ })).toBeDisabled();
  await area.focus();
  await page.keyboard.down("f");
  await page.keyboard.down("f");
  await page.keyboard.up("f");
  await expect(page.getByRole("button", { name: /I’m home/ })).toBeEnabled();
  expect((await saved(page)).fingerPractice.step).toBe(0);
  expect(
    await page
      .locator('[data-finger="li"]')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Your turn immediately accepts F then J without clicking the practice box", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Your turn", exact: true }).click();
  await expect(
    page.getByRole("group", { name: /Finger practice/ }),
  ).toBeFocused();
  await page.keyboard.press("f");
  await page.getByRole("button", { name: /I’m home/ }).click();
  await expect(
    page.getByRole("group", { name: /Finger practice. Press J/ }),
  ).toBeFocused();
  await page.keyboard.press("j");
  await expect(page.getByText("Good tap. Now come home.")).toBeVisible();
  await page.getByRole("button", { name: /I’m home/ }).click();
  expect((await saved(page)).fingerPractice.step).toBe(2);
});

test("shows the full keyboard and keeps number practice on screen", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./");
    await expect(page.locator(".keyboard-deck [data-key='F12']")).toBeVisible();
    await expect(page.locator(".keyboard-deck [data-key='↓']")).toBeVisible();
    const deck = await page.locator(".keyboard-deck").boundingBox();
    expect(deck!.y + deck!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({
      path: "/tmp/gem-mine-station-" + viewport.width + ".png",
    });
    await page
      .getByRole("button", { name: "Finger school", exact: true })
      .click();
    await page.getByRole("button", { name: /Number tunnels/ }).click();
    await page.getByRole("button", { name: "Your turn", exact: true }).click();
    await page.keyboard.press("1");
    const next = page.getByRole("button", { name: /I’m home/ });
    await expect(next).toBeEnabled();
    const box = await next.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }
});
