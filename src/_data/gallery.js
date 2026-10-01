// Builds the /photos/ page from two sources, shown together as one stream:
//   • Pinterest photos, synced automatically → src/_data/pinterestPins.json
//   • Website-only photos you add by hand     → src/_data/photos.json ("photos")
// Anything listed in photos.json → "removed" is left out.
// Photos are shown newest first, grouped by year.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA = path.dirname(fileURLToPath(import.meta.url));
const read = (f, fallback) => {
  try { return JSON.parse(readFileSync(path.join(DATA, f), "utf8")); } catch { return fallback; }
};
const pinId = (v) => (String(v).match(/\d+/g) || []).sort((a, b) => b.length - a.length)[0];

export default function () {
  const config = read("photos.json", {});
  const synced = read("pinterestPins.json", { photos: [] });
  const removedPins = new Set((config.removed || []).map(pinId).filter(Boolean));
  const removedFiles = new Set((config.removed || []).map(String));

  const fromPinterest = (synced.photos || [])
    .filter((p) => !removedPins.has(p.pin || p.id))
    .map((p) => ({
      source: "pinterest",
      src: p.image,
      full: p.full,
      fallback: p.image,
      width: p.width,
      height: p.height,
      alt: p.alt || p.caption || "Photo by Vidhan Jain",
      caption: p.caption || "",
      date: p.date || null,
    }));

  const fromSite = (config.photos || [])
    .filter((p) => p.file && !removedFiles.has(p.file))
    .map((p) => ({
      source: "local",
      file: p.file,
      alt: p.alt || p.caption || "Photo by Vidhan Jain",
      caption: p.caption || "",
      date: p.date ? new Date(p.date).toISOString() : null,
    }));

  const all = [...fromPinterest, ...fromSite]
    .map((it, i) => ({ it, i }))
    .sort((a, b) => {
      if (a.it.date && b.it.date) return b.it.date.localeCompare(a.it.date);
      if (a.it.date) return -1;
      if (b.it.date) return 1;
      return a.i - b.i;
    })
    .map(({ it }) => it);

  const groups = [];
  for (const photo of all) {
    const label = photo.date ? photo.date.slice(0, 4) : "More photos";
    let g = groups.find((x) => x.label === label);
    if (!g) groups.push((g = { label, slug: label.toLowerCase().replace(/\s+/g, "-"), items: [] }));
    g.items.push(photo);
  }

  const profile = (config.pinterest && config.pinterest.profile) || "";
  return {
    total: all.length,
    groups,
    pinterestProfile: profile ? (profile.startsWith("http") ? profile : `https://www.pinterest.com/${profile.replace(/^@/, "")}/`) : "",
  };
}
