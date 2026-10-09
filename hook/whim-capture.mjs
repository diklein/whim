// Element capture (hour-5 spike): open the configured localhost URL in Playwright and, for every
// [data-whim] element, save a screenshot plus a DOM snapshot (its rendered HTML and the page's CSS).
// Optional: if Playwright is not installed in the tracked project, capture is skipped silently.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const MAX_ELEMENT_HEIGHT = 1600;
const MAX_SCREENSHOT_BYTES = 2_500_000;

export async function captureElements(cwd, url, { timeoutMs = 20_000 } = {}) {
  let chromium;
  try {
    const require = createRequire(cwd + "/package.json");
    ({ chromium } = require("playwright"));
  } catch {
    return { elements: [], skipped: "no screenshots: Playwright is not installed in this project. Run `npm i -D playwright && npx playwright install chromium` (or the pnpm/yarn equivalent)." };
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
    await page.evaluate(() => document.fonts?.ready);

    // Page CSS once: same-origin sheets are read as text; others are fetched.
    const css = await page.evaluate(async () => {
      const parts = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          parts.push(Array.from(sheet.cssRules).map((r) => r.cssText).join("\n"));
        } catch {
          if (sheet.href) {
            try { parts.push(await (await fetch(sheet.href)).text()); } catch {}
          }
        }
      }
      return parts.join("\n\n");
    });

    // Fonts referenced by @font-face: fetched once here (the server cannot reach localhost),
    // uploaded by content hash on ingest, and referenced by placeholder until then.
    const fonts = [];
    const seen = new Map();
    let cssOut = "";
    let last = 0;
    for (const m of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
      cssOut += css.slice(last, m.index);
      const family = (m[0].match(/font-family:\s*["']?([^;"']+)/) || [])[1] || "unknown";
      let block = m[0];
      for (const u of block.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) {
        const abs = new URL(u[2], url).href;
        let hash = seen.get(abs);
        if (!hash) {
          try {
            const res = await page.request.get(abs, { timeout: 10_000 });
            if (!res.ok()) continue;
            const body = await res.body();
            if (body.length > 3_000_000 || fonts.length >= 12) continue;
            hash = createHash("sha256").update(body).digest("hex");
            seen.set(abs, hash);
            fonts.push({ hash, family: family.trim(), mime: res.headers()["content-type"] || "font/woff2", data: body.toString("base64") });
          } catch {
            continue;
          }
        }
        block = block.replace(u[0], `url(whim-font:${hash})`);
      }
      cssOut += block;
      last = m.index + m[0].length;
    }
    cssOut += css.slice(last);

    // Root classes carry font variables (next/font) and theme tokens; the snapshot needs them to resolve.
    const roots = await page.evaluate(() => ({
      htmlClass: document.documentElement.className,
      htmlStyle: document.documentElement.getAttribute("style") || "",
      bodyClass: document.body.className,
    }));

    const handles = await page.$$("[data-whim]");
    const elements = [];
    const captured = new Set();
    for (const h of handles) {
      const slug = await h.getAttribute("data-whim");
      // One capture per slug per page: a list of fifty cards tagged alike is one subject, not fifty.
      if (!slug || captured.has(slug)) continue;
      captured.add(slug);
      const box = await h.boundingBox();
      if (!box || box.width < 2 || box.height < 2) continue;
      // A feed or a long grid can run thousands of pixels tall. The top MAX_ELEMENT_HEIGHT is what a card can show
      // anyway, and one prompt's upload must stay under the ingest limit (4.5 MB on Vercel), so tall elements are clipped.
      const clipped = box.height > MAX_ELEMENT_HEIGHT;
      const png = clipped
        ? await page.screenshot({ type: "png", clip: { x: box.x, y: box.y, width: box.width, height: MAX_ELEMENT_HEIGHT } })
        : await h.screenshot({ type: "png" });
      if (png.length > MAX_SCREENSHOT_BYTES) continue;
      const html = await h.evaluate((el) => el.outerHTML);
      elements.push({
        slug,
        screenshot: png.toString("base64"),
        hash: createHash("sha256").update(png).digest("hex"),
        html: html.slice(0, 400_000),
        width: Math.round(box.width),
        height: Math.round(clipped ? MAX_ELEMENT_HEIGHT : box.height),
      });
    }
    return { elements, css: cssOut.slice(0, 600_000), fonts, roots, pageUrl: url };
  } finally {
    await browser.close();
  }
}
