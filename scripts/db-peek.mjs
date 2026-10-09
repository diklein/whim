import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const t = await sql`select status, left(prompt,48) prompt, summary, changed_paths from turns order by created_at desc limit 4`;
console.table(t.map(r => ({...r, changed_paths: JSON.stringify(r.changed_paths)})));
const s = await sql`select s.slug, s.kind, s.name, p.slug parent, s.change_count from subjects s left join subjects p on p.id=s.parent_id order by s.last_changed_at desc`;
console.table(s);
const v = await sql`select s.slug, v.change_type, v.file_path, left(v.code_snippet,40) code, v.text_content is not null has_text from versions v join subjects s on s.id=v.subject_id order by v.created_at desc limit 5`;
console.table(v);
