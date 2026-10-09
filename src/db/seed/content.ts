// Seed content for a fictional tracked project called Tracker: a small issue tracker.
// Everything here is generated as strings so the seed needs no asset files on disk.

export type Palette = { name: string; colors: Record<string, string> };

export const palettes: Palette[] = [
  {
    name: "Tracker",
    colors: { primary: "#d70000", surface: "#fafaf9", text: "#1c1917", muted: "#78716c", border: "#e7e5e4" },
  },
  {
    name: "Tracker",
    colors: { primary: "#e8503a", surface: "#fcfbf9", text: "#1c1917", muted: "#78716c", border: "#e7e5e4" },
  },
  {
    name: "Tracker",
    colors: { primary: "#e8503a", surface: "#fcfbf9", text: "#111010", muted: "#6b6460", border: "#e4e0dc" },
  },
];

export const headlines = [
  "Nothing here yet. Start your first project and watch it fill up.",
  "No projects yet.",
  "What are you working on?",
  "Your projects will show up here.",
];

type SidebarOpts = {
  width: number;
  bg: string;
  text: string;
  muted: string;
  accent: string;
  grouped: boolean;
  quietCta: boolean;
  activeFill: boolean;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** A drawn mock of the Tracker sidebar, used as the screenshot for each version. */
export function sidebarSvg(o: SidebarOpts): string {
  const h = 420;
  const pad = 16;
  const items = o.grouped
    ? [
        { label: "Inbox", kind: "header" },
        { label: "Unread", kind: "item", active: true },
        { label: "Assigned to me", kind: "item" },
        { label: "Projects", kind: "header" },
        { label: "Tracker web", kind: "item" },
        { label: "Mobile beta", kind: "item" },
        { label: "Design system", kind: "item" },
      ]
    : [
        { label: "Inbox", kind: "item", active: true },
        { label: "Today", kind: "item" },
        { label: "Projects", kind: "item" },
        { label: "Settings", kind: "item" },
      ];
  let y = 72;
  const rows = items
    .map((it) => {
      if (it.kind === "header") {
        y += 10;
        const s = `<text x="${pad}" y="${y + 12}" font-size="11" font-weight="600" letter-spacing="0.06em" fill="${o.muted}">${esc(it.label.toUpperCase())}</text>`;
        y += 26;
        return s;
      }
      const active = "active" in it && it.active;
      const bgRect = active
        ? `<rect x="${pad - 8}" y="${y}" width="${o.width - pad * 2 + 16}" height="32" rx="6" fill="${o.activeFill ? o.accent : o.text}" opacity="${o.activeFill ? 0.14 : 0.06}"/>`
        : "";
      const dot = `<circle cx="${pad + 6}" cy="${y + 16}" r="3" fill="${active && o.activeFill ? o.accent : o.muted}"/>`;
      const s = `${bgRect}${dot}<text x="${pad + 20}" y="${y + 20}" font-size="13" fill="${o.text}" font-weight="${active ? 600 : 400}">${esc(it.label)}</text>`;
      y += 36;
      return s;
    })
    .join("");
  const ctaY = h - 56;
  const cta = o.quietCta
    ? `<text x="${pad}" y="${ctaY + 20}" font-size="13" fill="${o.accent}" font-weight="500">+ New project</text>`
    : `<rect x="${pad}" y="${ctaY}" width="${o.width - pad * 2}" height="32" rx="6" fill="${o.accent}"/><text x="${o.width / 2}" y="${ctaY + 20}" text-anchor="middle" font-size="13" font-weight="600" fill="#fff">New project</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${h}" viewBox="0 0 ${o.width} ${h}" font-family="ui-sans-serif, system-ui, -apple-system, Inter, sans-serif">
<rect width="${o.width}" height="${h}" fill="${o.bg}"/>
<rect x="${pad}" y="${pad + 4}" width="22" height="22" rx="6" fill="${o.accent}"/>
<path d="M${pad + 6} ${pad + 15} l4 4 l7 -8" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${pad + 30}" y="${pad + 20}" font-size="14" font-weight="600" fill="${o.text}">Tracker</text>
${rows}
${cta}
</svg>`;
}

/** Live-markup snapshot of the same sidebar: HTML plus the page CSS it needs. */
export function sidebarHtml(o: SidebarOpts): string {
  const groups = o.grouped
    ? `<h2>Inbox</h2><ul><li><a aria-current="page" href="#">Unread</a></li><li><a href="#">Assigned to me</a></li></ul><h2>Projects</h2><ul><li><a href="#">Tracker web</a></li><li><a href="#">Mobile beta</a></li><li><a href="#">Design system</a></li></ul>`
    : `<ul><li><a aria-current="page" href="#">Inbox</a></li><li><a href="#">Today</a></li><li><a href="#">Projects</a></li><li><a href="#">Settings</a></li></ul>`;
  const cta = o.quietCta
    ? `<button class="cta quiet">+ New project</button>`
    : `<button class="cta">New project</button>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--bg:${o.bg};--text:${o.text};--muted:${o.muted};--accent:${o.accent}}
body{margin:0;font:13px/1.4 ui-sans-serif,system-ui,-apple-system,Inter,sans-serif;background:transparent}
nav[data-whim="sidebar"]{box-sizing:border-box;width:${o.width}px;height:420px;background:var(--bg);color:var(--text);padding:16px;display:flex;flex-direction:column;gap:8px}
.brand{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;margin-bottom:16px}
.mark{width:22px;height:22px;border-radius:6px;background:var(--accent)}
h2{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:10px 0 4px}
ul{list-style:none;margin:0;padding:0}
li a{display:block;padding:7px 8px;border-radius:6px;color:inherit;text-decoration:none}
li a:hover{background:color-mix(in oklab,var(--text) 6%,transparent)}
li a[aria-current]{font-weight:600;background:color-mix(in oklab,${o.activeFill ? "var(--accent) 14%" : "var(--text) 6%"},transparent)}
.cta{margin-top:auto;height:32px;border:0;border-radius:6px;background:var(--accent);color:#fff;font:inherit;font-weight:600}
.cta.quiet{background:none;color:var(--accent);text-align:left;padding:0;font-weight:500}
</style></head><body><nav data-whim="sidebar" aria-label="Main"><div class="brand"><span class="mark"></span>Tracker</div>${groups}${cta}</nav></body></html>`;
}

export const sidebarVersions: SidebarOpts[] = [
  { width: 240, bg: "#fafaf9", text: "#1c1917", muted: "#78716c", accent: "#d70000", grouped: false, quietCta: false, activeFill: false },
  { width: 200, bg: "#fafaf9", text: "#1c1917", muted: "#78716c", accent: "#d70000", grouped: false, quietCta: false, activeFill: false },
  { width: 220, bg: "#fcfbf9", text: "#1c1917", muted: "#78716c", accent: "#e8503a", grouped: true, quietCta: false, activeFill: false },
  { width: 220, bg: "#fcfbf9", text: "#1c1917", muted: "#78716c", accent: "#e8503a", grouped: true, quietCta: true, activeFill: false },
  { width: 220, bg: "#1c1917", text: "#fafaf9", muted: "#a8a29e", accent: "#e8503a", grouped: true, quietCta: true, activeFill: true },
];

/** Six logo marks from one exploration turn. */
const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">${inner}</svg>`;

export const logos: { file: string; svg: string }[] = [
  {
    file: "explorations/logo/check-tile.svg",
    svg: wrap(`<rect x="12" y="12" width="72" height="72" rx="18" fill="#e8503a"/><path d="M32 49l11 11 22-24" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    file: "explorations/logo/dot-grid.svg",
    svg: wrap(`${[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => `<circle cx="${30 + c * 18}" cy="${30 + r * 18}" r="${r === 2 && c === 2 ? 9 : 5}" fill="${r === 2 && c === 2 ? "#e8503a" : "#1c1917"}"/>`)).join("")}`),
  },
  {
    file: "explorations/logo/wordmark.svg",
    svg: wrap(`<text x="48" y="58" text-anchor="middle" font-family="ui-sans-serif,system-ui,Inter,sans-serif" font-size="26" font-weight="700" letter-spacing="-0.04em" fill="#1c1917">tracker<tspan fill="#e8503a">.</tspan></text>`),
  },
  {
    file: "explorations/logo/t-mono.svg",
    svg: wrap(`<rect x="12" y="12" width="72" height="72" rx="36" fill="#1c1917"/><path d="M32 36h32M48 36v30" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`),
  },
  {
    file: "explorations/logo/ring.svg",
    svg: wrap(`<circle cx="48" cy="48" r="30" stroke="#1c1917" stroke-width="8" fill="none"/><circle cx="48" cy="48" r="30" stroke="#e8503a" stroke-width="8" fill="none" stroke-dasharray="120 200" stroke-linecap="round" transform="rotate(-90 48 48)"/>`),
  },
  {
    file: "explorations/logo/stack.svg",
    svg: wrap(`<rect x="20" y="56" width="56" height="12" rx="6" fill="#d6d3d1"/><rect x="20" y="40" width="56" height="12" rx="6" fill="#a8a29e"/><rect x="20" y="24" width="56" height="12" rx="6" fill="#e8503a"/>`),
  },
];

export const logoV1 = wrap(
  `<rect x="12" y="12" width="72" height="72" rx="18" fill="#d70000"/><path d="M32 49l11 11 22-24" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
);
