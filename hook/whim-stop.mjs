#!/usr/bin/env node
// Stop hook: snapshot the project to a hidden ref, diff against the last snapshot,
// and post the prompt plus changed files to Whim. Deliberately simple.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { captureElements } from "./whim-capture.mjs";

const REF = "refs/whim/snapshots";
const IMAGE = /\.(png|jpe?g|webp|gif|svg)$/i;
const MAX_TEXT = 200_000;
const MAX_IMAGE = 2_000_000;
const MAX_DIFF = 300_000;

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () =>
  run(JSON.parse(raw || "{}")).catch((e) => {
    try { writeFileSync(join(process.cwd(), ".whim", "last-error.log"), `${new Date().toISOString()} ${e?.stack || e}\n`); } catch {}
    process.exit(0);
  }),
);

async function run(input) {
  const cwd = input.cwd || process.cwd();
  const whimDir = join(cwd, ".whim");
  mkdirSync(join(whimDir, "queue"), { recursive: true });
  const config = readJson(join(cwd, "whim.config.json"));
  if (!config?.endpoint) return;

  const pending = readJson(join(whimDir, "pending.json"));
  const prompts = (pending?.prompts ?? (pending?.prompt ? [pending.prompt] : [])).map((p) => String(p).trim()).filter(Boolean);
  const prompt = prompts.join("\n\n");
  if (!prompt) return;
  rmSync(join(whimDir, "pending.json"), { force: true });

  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).trim();
  const env = { ...process.env, GIT_INDEX_FILE: join(whimDir, "index") };
  const gitIdx = (...args) =>
    execFileSync("git", args, { cwd, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).trim();

  // Snapshot the whole working tree with a temporary index; the user's branch is untouched.
  let parent = "";
  try { parent = git("rev-parse", "-q", "--verify", REF); } catch {}
  gitIdx("add", "-A");
  try { gitIdx("rm", "-r", "--cached", "--quiet", "--ignore-unmatch", ".whim"); } catch {}
  const tree = gitIdx("write-tree");
  // Nothing on disk changed since the last snapshot: nothing to record. This is what a second Stop in the
  // same turn looks like, and it used to post a duplicate prompt with an empty diff.
  if (parent) {
    let parentTree = "";
    try { parentTree = git("rev-parse", `${parent}^{tree}`); } catch {}
    if (parentTree === tree) { note(whimDir, "skipped: no changes since the last snapshot"); return; }
  }
  const args = ["commit-tree", tree, "-m", `whim: ${prompt.split("\n")[0].slice(0, 120)}`];
  if (parent) args.push("-p", parent);
  const commit = git(...args);
  git("update-ref", REF, commit);

  // What changed since the last snapshot.
  const changedFiles = [];
  let diff = "";
  if (parent) {
    const status = git("diff-tree", "-r", "--name-status", "--no-renames", parent, commit);
    for (const line of status.split("\n").filter(Boolean)) {
      const [code, ...rest] = line.split("\t");
      const path = rest.join("\t");
      if (!matches(path, config.include)) continue;
      changedFiles.push(buildFile(cwd, path, code === "A" ? "added" : code === "D" ? "deleted" : "modified"));
    }
    diff = git("diff", "--no-color", "--stat=120", "-p", parent, commit, "--", ...textPathspecs(config.include));
  }

  // Element screenshots and DOM snapshots from the running app, one page or several. Never blocks the turn if it fails.
  // `urls` (or a single `url`) lists the pages to open; an element seen on an earlier page is not captured again,
  // but every page it appears on is recorded in `pages` so Whim can say where a subject lives.
  let capture = null;
  const urls = [].concat(config.urls ?? config.url ?? []).filter(Boolean);
  if (urls.length && changedFiles.length) {
    capture = { elements: [], css: null, fonts: [], roots: null, error: null };
    const seenSlugs = new Map();
    const seenFonts = new Set();
    const errors = [];
    for (const url of urls) {
      try {
        const page = await captureElements(cwd, url);
        if (page.skipped) { capture.error = page.skipped; break; }
        for (const el of page.elements) {
          const seen = seenSlugs.get(el.slug);
          if (seen) seen.pages.push(url);
          else { seenSlugs.set(el.slug, el); el.pages = [url]; capture.elements.push(el); }
        }
        for (const f of page.fonts) if (!seenFonts.has(f.hash)) { seenFonts.add(f.hash); capture.fonts.push(f); }
        capture.css ??= page.css;
        capture.roots ??= page.roots;
      } catch (e) {
        errors.push(`${url} unreachable: ${e?.message ?? e}`);
      }
    }
    if (errors.length) capture.error = errors.join("; ");
  }

  const payload = {
    prompt,
    snapshotSha: commit,
    diff: diff.slice(0, MAX_DIFF),
    changedFiles: changedFiles.filter(Boolean).slice(0, 200),
    capturedAt: new Date().toISOString(),
    elements: capture?.elements ?? [],
    pageCss: capture?.css ?? null,
    fonts: capture?.fonts ?? [],
    roots: capture?.roots ?? null,
    captureError: capture?.error ?? capture?.skipped ?? null,
  };

  const token = resolveToken(cwd, config.tokenEnv || "WHIM_TOKEN");
  if (!token) { logError(whimDir, "no token: set " + (config.tokenEnv || "WHIM_TOKEN")); queue(whimDir, payload); return; }

  // Retry anything that failed to upload last time, oldest first, then send this turn.
  const queued = readdirSync(join(whimDir, "queue")).filter((f) => f.endsWith(".json")).sort();
  for (const f of queued) {
    const p = join(whimDir, "queue", f);
    if (await send(config.endpoint, token, readJson(p), whimDir)) rmSync(p, { force: true });
  }
  payload.queued = readdirSync(join(whimDir, "queue")).filter((f) => f.endsWith(".json")).length;
  if (!(await send(config.endpoint, token, payload, whimDir))) queue(whimDir, payload);
}

/**
 * Upload with one adaptation: if Whim rejects the payload as too big, drop the largest element capture and try
 * again, down to no captures at all. A prompt with its text and diff must land even when a screenshot cannot.
 * Every failure is written to .whim/last-error.log with Whim's reply, so a silent queue cannot build up unnoticed.
 */
async function send(endpoint, token, payload, whimDir) {
  for (let attempt = 0; attempt < 12; attempt++) {
    let res;
    try {
      res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
    } catch (e) {
      logError(whimDir, `upload failed: ${e?.message ?? e}`);
      return false;
    }
    if (res.ok) return true;
    const text = await res.text().catch(() => "");
    logError(whimDir, `upload rejected ${res.status}: ${text.slice(0, 400)}`);
    const tooBig = (res.status === 400 && /too_big|too big/i.test(text)) || res.status === 413;
    if (!tooBig || !payload.elements?.length) return false;
    payload.elements.sort((a, b) => b.screenshot.length - a.screenshot.length);
    const dropped = payload.elements.shift();
    payload.captureError = [payload.captureError, `${dropped.slug} screenshot too large to upload`].filter(Boolean).join("; ");
  }
  return false;
}

function note(whimDir, message) {
  try { writeFileSync(join(whimDir, "last-run.log"), `${new Date().toISOString()} ${message}\n`); } catch {}
}

function logError(whimDir, message) {
  try { writeFileSync(join(whimDir, "last-error.log"), `${new Date().toISOString()} ${message}\n`, { flag: "a" }); } catch {}
}

function buildFile(cwd, path, status) {
  if (status === "deleted") return { path, status };
  const full = join(cwd, path);
  if (!existsSync(full)) return { path, status };
  const size = statSync(full).size;
  const image = IMAGE.test(path);
  if (image && path.toLowerCase().endsWith(".svg")) {
    if (size > MAX_TEXT) return { path, status };
    return { path, status, encoding: "utf8", mime: "image/svg+xml", content: readFileSync(full, "utf8") };
  }
  if (image) {
    if (size > MAX_IMAGE) return { path, status };
    const ext = path.split(".").pop().toLowerCase();
    return { path, status, encoding: "base64", mime: `image/${ext === "jpg" ? "jpeg" : ext}`, content: readFileSync(full).toString("base64") };
  }
  if (size > MAX_TEXT) return { path, status };
  const buf = readFileSync(full);
  if (buf.includes(0)) return { path, status }; // binary we don't understand
  return { path, status, encoding: "utf8", content: buf.toString("utf8") };
}

function matches(path, globs) {
  if (!globs?.length) return true;
  return globs.some((g) => globToRe(g).test(path));
}

function globToRe(glob) {
  const re = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\u0000")
    .replace(/\*\*/g, "\u0001")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0000/g, "(?:.*/)?")
    .replace(/\u0001/g, ".*");
  return new RegExp(`^${re}$`);
}

function textPathspecs(globs) {
  // Keep images out of the unified diff; the files travel separately.
  const specs = (globs?.length ? globs : ["."]).map((g) => `:(glob)${g}`);
  return [...specs, ":!*.png", ":!*.jpg", ":!*.jpeg", ":!*.webp", ":!*.gif"];
}

function resolveToken(cwd, name) {
  if (process.env[name]) return process.env[name];
  for (const f of [".env.local", ".env"]) {
    const p = join(cwd, f);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

async function post(endpoint, token, payload) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function queue(dir, payload) {
  writeFileSync(join(dir, "queue", `${Date.now()}.json`), JSON.stringify(payload));
}

function readJson(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}
