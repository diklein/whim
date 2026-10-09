// Empties every Whim table so an install can be tested from a true first run. Needs --yes; there is no undo.
// Run: node --env-file=.env.local scripts/db-reset.mjs --yes
import { neon } from "@neondatabase/serverless";

if (!process.argv.includes("--yes")) {
  console.error("This deletes every prompt, subject, and version in the database. Re-run with --yes to confirm.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const [{ n: turnsBefore }] = await sql`select count(*)::int n from turns`;
await sql`delete from versions`;
await sql`delete from subjects`;
await sql`delete from turns`;
await sql`delete from fonts`;
console.log(`Reset. ${turnsBefore} prompts removed. Restart pnpm dev so Whim's read cache lets go of the old data.`);
