import { generateText } from "ai";
const candidates = process.argv.slice(2);
for (const model of candidates) {
  try {
    const r = await generateText({ model, prompt: "Reply with the single word: ok", maxOutputTokens: 32 });
    console.log("OK  ", model, "->", r.text.trim().slice(0, 20), r.response.modelId ?? "");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("FAIL", model, "->", msg.slice(0, 90));
  }
}
