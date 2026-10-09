// Seeds a day of Tracker history so the UI never waits on capture.
// Run: pnpm db:seed   (idempotent: wipes and reinserts)
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { db, schema } from "./index";
import {
  headlines,
  logoV1,
  logos,
  palettes,
  sidebarHtml,
  sidebarSvg,
  sidebarVersions,
} from "./seed/content";

const { turns, subjects, versions } = schema;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function upload(body: string, ext: "svg" | "html", contentType: string) {
  const hash = sha(body);
  const { url } = await put(`files/${hash}.${ext}`, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { url, hash };
}

const day = (h: number, m: number) => new Date(Date.UTC(2026, 9, 6, h + 7, m)); // PDT morning

const T = [
  { at: day(9, 12), prompt: "Scaffold the sidebar for Tracker: logo and name at the top, nav links for Inbox, Today, Projects, Settings, and a New project button pinned to the bottom.", summary: "Added the first sidebar with a logo, four nav links, and a filled New project button." },
  { at: day(9, 41), prompt: "The sidebar feels wide. Bring it down to 200px and tighten the link padding.", summary: "Narrowed the sidebar to 200px and tightened link spacing." },
  { at: day(10, 5), prompt: "Draft a headline for the empty projects state. Friendly, not cute.", summary: "Wrote a first empty-state headline inviting the user to start a project." },
  { at: day(10, 30), prompt: "Set up a palette in explorations/palette: warm neutral surfaces, near-black text, and a strong red primary.", summary: "Created the Tracker palette with a red primary on warm neutrals." },
  { at: day(11, 2), prompt: "Explore six logo marks for Tracker: a check in a tile, a dot grid, a lowercase wordmark, a T in a circle, a progress ring, and a stack. Save each as an SVG in explorations/logo.", summary: "Saved six logo directions as SVGs: check tile, dot grid, wordmark, T mono, ring, and stack." },
  { at: day(11, 28), prompt: "That headline is too cute. Make it plainer.", summary: "Shortened the empty-state headline to a plain statement." },
  { at: day(11, 50), prompt: "Nudge the primary toward coral and lift the surface a touch warmer.", summary: "Shifted the primary to coral and warmed the surface color." },
  { at: day(13, 14), prompt: "Group the sidebar links under Inbox and Projects with small section headers, and list real projects under Projects.", summary: "Grouped nav links under Inbox and Projects headers and listed three projects." },
  { at: day(13, 37), prompt: "Make New project quieter. Text only with a plus, in the accent color.", summary: "Replaced the filled New project button with a quiet text link." },
  { at: day(14, 2), prompt: "Try the empty-state headline as a question.", summary: "Rewrote the empty-state headline as a question." },
  { at: day(14, 20), prompt: "Darken body text and borders slightly so the coral reads as the only warm thing on the page.", summary: "Darkened text and border tokens so the coral primary stands alone." },
  { at: day(14, 41), prompt: "Try the sidebar on a dark background with the accent on the active link.", summary: "Switched the sidebar to a dark surface with a coral active state." },
  { at: day(15, 3), prompt: "One more headline option, something that tells them where things will appear.", summary: "Added a headline that explains where projects will appear." },
];

async function main() {
  // Only the seed's own rows go: its turns have a 12-character sha, real captures carry git's 40. Whim's own history stays.
  console.log("Removing the previous seed…");
  const seedTurns = await db.select({ id: turns.id }).from(turns).where(sql`length(${turns.snapshotSha}) = 12 and ${turns.diff} is null`);
  if (seedTurns.length) {
    await db.delete(versions).where(inArray(versions.turnId, seedTurns.map((t) => t.id)));
    await db.delete(turns).where(inArray(turns.id, seedTurns.map((t) => t.id)));
  }
  await db.delete(subjects).where(sql`not exists (select 1 from ${versions} v where v.subject_id = ${subjects.id})`);

  console.log("Inserting turns…");
  const turnRows = await db
    .insert(turns)
    .values(
      T.map((t) => ({
        prompt: t.prompt,
        summary: t.summary,
        status: "ready" as const,
        snapshotSha: sha(t.prompt).slice(0, 12),
        createdAt: t.at,
        changedPaths: [],
      })),
    )
    .returning();
  const turn = (i: number) => turnRows[i];

  console.log("Inserting subjects…");
  const [sidebar] = await db
    .insert(subjects)
    .values({ slug: "sidebar", name: "Sidebar", kind: "component" })
    .returning();
  const [logo, links, cta, headline, palette] = await db
    .insert(subjects)
    .values([
      { slug: "logo", name: "Logo", kind: "asset", parentId: sidebar.id },
      { slug: "nav-links", name: "Links", kind: "component", parentId: sidebar.id },
      { slug: "new-project-cta", name: "New project CTA", kind: "component", parentId: sidebar.id },
      { slug: "empty-state-headline", name: "Empty state headline", kind: "text" },
      { slug: "palette", name: "Palette", kind: "color" },
    ])
    .returning();

  type V = typeof versions.$inferInsert;
  const rows: V[] = [];

  console.log("Uploading sidebar screenshots and DOM snapshots…");
  const sidebarTurns = [0, 1, 7, 8, 11];
  const sidebarStatus: V["status"][] = ["passed", "removed", "none", "none", "picked"];
  for (let i = 0; i < sidebarVersions.length; i++) {
    const o = sidebarVersions[i];
    const shot = await upload(sidebarSvg(o), "svg", "image/svg+xml");
    const dom = await upload(sidebarHtml(o), "html", "text/html");
    const t = turn(sidebarTurns[i]);
    rows.push({
      subjectId: sidebar.id,
      turnId: t.id,
      blobUrl: shot.url,
      domSnapshotUrl: dom.url,
      imageHash: shot.hash,
      filePath: "src/components/sidebar.tsx",
      codeSnippet: `<nav data-whim="sidebar" aria-label="Main" className="w-[${o.width}px] ${o.bg === "#1c1917" ? "bg-stone-900 text-stone-50" : "bg-stone-50 text-stone-900"}">…</nav>`,
      changeType: i === 0 ? "feature" : i === 4 ? "color" : "layout",
      status: sidebarStatus[i],
      removedAt: sidebarStatus[i] === "removed" ? new Date(t.createdAt.getTime() + 3600_000) : null,
      createdAt: t.createdAt,
    });
  }

  // Children of the sidebar: links changed in turns 0 and 7, CTA in turns 0 and 8.
  const linksV1 = await upload(sidebarSvg(sidebarVersions[0]), "svg", "image/svg+xml");
  const linksV2 = await upload(sidebarSvg(sidebarVersions[2]), "svg", "image/svg+xml");
  rows.push(
    { subjectId: links.id, turnId: turn(0).id, blobUrl: linksV1.url, imageHash: linksV1.hash, filePath: "src/components/sidebar.tsx", codeSnippet: `<ul>{links.map(l => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>`, changeType: "feature", status: "none", createdAt: turn(0).createdAt },
    { subjectId: links.id, turnId: turn(7).id, blobUrl: linksV2.url, imageHash: linksV2.hash, filePath: "src/components/sidebar.tsx", codeSnippet: `{groups.map(g => <section key={g.title}><h2>{g.title}</h2><ul>…</ul></section>)}`, changeType: "layout", status: "picked", createdAt: turn(7).createdAt },
    { subjectId: cta.id, turnId: turn(0).id, blobUrl: linksV1.url, imageHash: linksV1.hash, filePath: "src/components/sidebar.tsx", codeSnippet: `<Button className="mt-auto w-full">New project</Button>`, changeType: "feature", status: "passed", createdAt: turn(0).createdAt },
    { subjectId: cta.id, turnId: turn(8).id, blobUrl: (await upload(sidebarSvg(sidebarVersions[3]), "svg", "image/svg+xml")).url, filePath: "src/components/sidebar.tsx", codeSnippet: `<Button variant="link" className="mt-auto self-start px-0 text-primary">+ New project</Button>`, changeType: "layout", status: "picked", createdAt: turn(8).createdAt },
  );

  console.log("Uploading logos…");
  const v1 = await upload(logoV1, "svg", "image/svg+xml");
  rows.push({ subjectId: logo.id, turnId: turn(0).id, blobUrl: v1.url, imageHash: v1.hash, filePath: "public/logo.svg", codeSnippet: logoV1, changeType: "asset", status: "passed", createdAt: turn(0).createdAt });
  const logoStatus: V["status"][] = ["picked", "none", "none", "passed", "none", "removed"];
  for (let i = 0; i < logos.length; i++) {
    const up = await upload(logos[i].svg, "svg", "image/svg+xml");
    rows.push({
      subjectId: logo.id,
      turnId: turn(4).id,
      blobUrl: up.url,
      imageHash: up.hash,
      filePath: logos[i].file,
      codeSnippet: logos[i].svg,
      changeType: "asset",
      status: logoStatus[i],
      removedAt: logoStatus[i] === "removed" ? new Date(turn(4).createdAt.getTime() + 600_000) : null,
      createdAt: new Date(turn(4).createdAt.getTime() + i * 1000),
    });
  }

  console.log("Inserting text and palette versions…");
  const headlineTurns = [2, 5, 9, 12];
  const headlineStatus: V["status"][] = ["passed", "none", "picked", "none"];
  headlines.forEach((text, i) => {
    rows.push({
      subjectId: headline.id,
      turnId: turn(headlineTurns[i]).id,
      textContent: text,
      filePath: "copy.json",
      codeSnippet: `"emptyState": { "headline": ${JSON.stringify(text)} }`,
      changeType: "copy",
      status: headlineStatus[i],
      createdAt: turn(headlineTurns[i]).createdAt,
    });
  });
  const paletteTurns = [3, 6, 10];
  const paletteStatus: V["status"][] = ["passed", "none", "picked"];
  palettes.forEach((p, i) => {
    const json = JSON.stringify(p, null, 2);
    rows.push({
      subjectId: palette.id,
      turnId: turn(paletteTurns[i]).id,
      textContent: json,
      filePath: "explorations/palette/tracker.json",
      codeSnippet: json,
      changeType: "color",
      status: paletteStatus[i],
      createdAt: turn(paletteTurns[i]).createdAt,
    });
  });

  await db.insert(versions).values(rows);

  // Denormalized recency fields on subjects.
  for (const s of [sidebar, logo, links, cta, headline, palette]) {
    const mine = rows.filter((r) => r.subjectId === s.id);
    const last = mine.reduce((m, r) => (r.createdAt! > m ? r.createdAt! : m), new Date(0));
    await db
      .update(subjects)
      .set({ changeCount: new Set(mine.map((r) => r.turnId)).size, lastChangedAt: last })
      .where(eq(subjects.id, s.id));
  }

  // Changed paths per turn, derived from the versions.
  for (const t of turnRows) {
    const paths = [...new Set(rows.filter((r) => r.turnId === t.id).map((r) => r.filePath!).filter(Boolean))];
    await db.update(turns).set({ changedPaths: paths }).where(eq(turns.id, t.id));
  }

  console.log(`Seeded ${turnRows.length} turns, 6 subjects, ${rows.length} versions.`);
}

import { eq, inArray, sql } from "drizzle-orm";

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
