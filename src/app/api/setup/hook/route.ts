import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * The capture hook as one download: a plain tar of hook/*.mjs, built here with no dependency.
 * Setup is then "download this, paste one prompt into Claude Code".
 */
export async function GET() {
  const dir = join(process.cwd(), "hook");
  const names = (await readdir(dir)).filter((n) => n.endsWith(".mjs")).sort();
  const parts: Buffer[] = [];
  for (const name of names) {
    const body = await readFile(join(dir, name));
    parts.push(tarHeader(`whim-hook/${name}`, body.length), body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024)); // end of archive
  return new Response(new Uint8Array(Buffer.concat(parts)), {
    headers: {
      "content-type": "application/x-tar",
      "content-disposition": 'attachment; filename="whim-hook.tar"',
      "cache-control": "no-store",
    },
  });
}

/** A ustar header block. Only the fields tar needs for a regular, world-readable file. */
function tarHeader(name: string, size: number) {
  const h = Buffer.alloc(512);
  const put = (s: string, off: number, len: number) => h.write(s.padEnd(len, "\0").slice(0, len), off, "latin1");
  put(name, 0, 100);
  put("0000644\0", 100, 8);
  put("0000000\0", 108, 8);
  put("0000000\0", 116, 8);
  put(size.toString(8).padStart(11, "0") + "\0", 124, 12);
  put(Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0", 136, 12);
  put("        ", 148, 8); // checksum placeholder: spaces while summing
  put("0", 156, 1);
  put("ustar\0", 257, 6);
  put("00", 263, 2);
  let sum = 0;
  for (const b of h) sum += b;
  put(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
  return h;
}
