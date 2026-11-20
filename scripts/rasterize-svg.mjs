// Renders an SVG to a 512×512 PNG on white, for use as an image reference.
//   node scripts/rasterize-svg.mjs input.svg output.png
// Uses the Playwright dev dependency with an installed Google Chrome.
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error("Usage: node scripts/rasterize-svg.mjs input.svg output.png");
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
await page.setContent(
  `<body style="margin:0;background:#fff"><img src="${pathToFileURL(resolve(input))}" width="512" height="512"></body>`,
);
await page.waitForTimeout(300);
await page.screenshot({ path: output });
await browser.close();
