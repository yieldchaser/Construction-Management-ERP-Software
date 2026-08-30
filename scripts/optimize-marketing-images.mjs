#!/usr/bin/env node
// D-017: Re-encode bloated marketing images using sharp.
// Run from repo root: node scripts/optimize-marketing-images.mjs
// Reports before/after sizes.

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "../frontend/public");

const TARGETS = [
  // construction-hero.webp is 8.54 MB — was never actually compressed.
  // Re-encode at quality 82 (high quality, readable glossary page).
  {
    src: path.join(PUBLIC, "resources/glossary/construction-hero.webp"),
    out: path.join(PUBLIC, "resources/glossary/construction-hero.webp"),
    format: "webp",
    quality: 82,
    label: "construction-hero.webp",
  },
  // Also produce a compressed PNG replacement (the .png is 8.54 MB too)
  {
    src: path.join(PUBLIC, "resources/glossary/construction-hero.png"),
    out: path.join(PUBLIC, "resources/glossary/construction-hero.webp"),
    format: "webp",
    quality: 82,
    label: "construction-hero.png→webp (overwrite same output as above, skip if already done)",
    skip: true, // the webp above is already derived from this PNG, so skip
  },

  // feature-dpr-phones.png — 4.1 MB PNG. The webp at 0.28 MB is good.
  // Also re-encode the PNG itself to webp at quality 80 for <picture> fallback users.
  // (MockupFrame already auto-selects .webp so this is a belt-and-suspenders fix.)
  {
    src: path.join(PUBLIC, "marketing/landing/feature-dpr-phones.png"),
    out: path.join(PUBLIC, "marketing/landing/feature-dpr-phones.webp"),
    format: "webp",
    quality: 80,
    label: "feature-dpr-phones.png→webp",
  },

  // Blog / mocks — large PNGs not on index page, but reduce overall public/ weight
  // so that CDN cache warm-up and Vercel edge costs are lower.
  {
    src: path.join(PUBLIC, "marketing/blog/cat-compliance.png"),
    out: path.join(PUBLIC, "marketing/blog/cat-compliance.webp"),
    format: "webp",
    quality: 80,
    label: "cat-compliance",
  },
  {
    src: path.join(PUBLIC, "marketing/mocks/mock-line-chart.png"),
    out: path.join(PUBLIC, "marketing/mocks/mock-line-chart.webp"),
    format: "webp",
    quality: 80,
    label: "mock-line-chart",
  },
  {
    src: path.join(PUBLIC, "marketing/blog/cat-site-execution.png"),
    out: path.join(PUBLIC, "marketing/blog/cat-site-execution.webp"),
    format: "webp",
    quality: 80,
    label: "cat-site-execution",
  },
  {
    src: path.join(PUBLIC, "marketing/blog/cat-insights.png"),
    out: path.join(PUBLIC, "marketing/blog/cat-insights.webp"),
    format: "webp",
    quality: 80,
    label: "cat-insights",
  },
];

async function main() {
  for (const t of TARGETS) {
    if (t.skip) {
      console.log(`SKIP  ${t.label}`);
      continue;
    }
    if (!fs.existsSync(t.src)) {
      console.warn(`MISS  ${t.label} (source not found: ${t.src})`);
      continue;
    }
    const beforeBytes = fs.statSync(t.src).size;
    try {
      await sharp(t.src)
        .webp({ quality: t.quality, effort: 5 })
        .toFile(t.out + ".tmp");
      // Only replace if the new file is actually smaller
      const afterBytes = fs.statSync(t.out + ".tmp").size;
      if (afterBytes < beforeBytes || t.src !== t.out) {
        fs.renameSync(t.out + ".tmp", t.out);
        const savePct = (((beforeBytes - afterBytes) / beforeBytes) * 100).toFixed(1);
        console.log(
          `OK    ${t.label}: ${(beforeBytes / 1024 / 1024).toFixed(2)} MB → ${(afterBytes / 1024 / 1024).toFixed(2)} MB (${savePct}% saved)`
        );
      } else {
        fs.unlinkSync(t.out + ".tmp");
        console.log(`SKIP  ${t.label}: already optimal (new=${(afterBytes/1024/1024).toFixed(2)}MB >= old=${(beforeBytes/1024/1024).toFixed(2)}MB)`);
      }
    } catch (err) {
      if (fs.existsSync(t.out + ".tmp")) fs.unlinkSync(t.out + ".tmp");
      console.error(`ERR   ${t.label}: ${err.message}`);
    }
  }
}

main();
