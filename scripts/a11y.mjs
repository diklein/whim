// Accessibility audit: axe-core (WCAG 2.1 A/AA + best practice) over every page state, plus the overlay and the
// phone menu. Run with the dev server up:  pnpm a11y  [base url]
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.argv[2] ?? "http://localhost:3200";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
let total = 0;

async function audit(name, run) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  total += r.violations.length;
  console.log(`\n${name}: ${r.violations.length ? `${r.violations.length} violation type(s)` : "✓ pass"}`);
  for (const v of r.violations) {
    console.log(`  - ${v.id} (${v.impact}, ${v.nodes.length}) ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) console.log(`      ${n.html.slice(0, 140)}\n      ${n.failureSummary?.split("\n")[1] ?? ""}`);
  }
}

// Pages that need no ids come first; the rest are discovered from the sidebar and the feed.
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await audit("Live");
const subject = await page.locator('nav[aria-label="Whim"] a[href^="/subjects/"]').first().getAttribute("href").catch(() => null);
const prompt = await page.locator('main a[href^="/turns/"]').first().getAttribute("href").catch(() => null);
for (const [name, path] of [["Setup", "/setup"], ["Shelved", "/shelved"], ["Subject", subject], ["Prompt", prompt]]) {
  if (!path) { console.log(`\n${name}: skipped (nothing to open yet)`); continue; }
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await audit(name);
}
if (subject) {
  await page.goto(BASE + subject, { waitUntil: "networkidle" });
  const img = page.locator('button[aria-label^="View "]').first();
  if (await img.count()) {
    await img.click();
    await page.waitForSelector('[data-whim="whim-lightbox"]');
    await audit("Overlay");
    await page.keyboard.press("Escape");
  }
  const ids = await page.locator("[data-version-id]").evaluateAll((els) => els.slice(0, 2).map((e) => e.getAttribute("data-version-id")));
  if (ids.length === 2) { await page.goto(`${BASE}/compare?ids=${ids.join(",")}`, { waitUntil: "networkidle" }); await audit("Compare"); }
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Open menu" }).click();
await page.waitForSelector('[data-sidebar="sidebar"][data-mobile="true"]');
await audit("Phone menu");

await browser.close();
console.log(total ? `\n${total} violation type(s) in all.` : "\nNo violations.");
process.exit(total ? 1 : 0);
