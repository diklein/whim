#!/usr/bin/env node
// UserPromptSubmit hook: remember the prompt so the Stop hook can pair it with the work.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const cwd = input.cwd || process.cwd();
    const dir = join(cwd, ".whim");
    mkdirSync(dir, { recursive: true });
    // Several prompts can arrive before the agent stops (messages sent mid-turn). Keep them all, in order,
    // so the Stop hook attributes the work to everything that was asked, not just the last message.
    const file = join(dir, "pending.json");
    let prompts = [];
    try { const prev = JSON.parse(readFileSync(file, "utf8")); prompts = prev.prompts ?? (prev.prompt ? [prev.prompt] : []); } catch {}
    const prompt = (input.prompt ?? "").trim();
    if (prompt && prompts[prompts.length - 1] !== prompt) prompts.push(prompt);
    writeFileSync(file, JSON.stringify({ prompts, sessionId: input.session_id, at: new Date().toISOString() }));
  } catch {
    // Never block a prompt over bookkeeping.
  }
  process.exit(0);
});
