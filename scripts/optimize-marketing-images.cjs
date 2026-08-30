#!/usr/bin/env node
// D-017: Re-encode bloated marketing images using sharp.
// Run from repo root: node scripts/optimize-marketing-images.cjs
// Uses sharp from frontend/node_modules.

const sharp = require("../frontend/node_modules/sharp");
const fs = require("fs");
const path = require("path");

const PUBLIC = path.resolve(__dirname, "../frontend/public");

const TARGETS = [
  // construction-hero.webp is 8.54 MB — the WebP re-encode was never done properly.
  // Source PNG is also 8.54 MB. Re-encode to quality-82 WebP.
  {
    src: path.join(PUBLIC, "resources/glossary/construction-hero.png"),
    out: path.join(PUBLIC, "resources/glossary/construction-hero.webp"),
    quality: 82,
    label: "construction-hero.png → construction-hero.webp",
  },
  // feature-dpr-phones.webp is already 0.28 MB (good). The .png is 4.11 MB.
  // Re-verify the webp is correct (no-op if already good).
  {
    src: path.join(PUBLIC, "marketing/landing/feature-dpr-phones.png"),
    out: path.join(PUBLIC, "marketing/landing/feature-dpr-phones.webp"),
    quality: 80,
    label: "feature-dpr-phones.png → .webp",
  },
  // Large blog images (not on index page but reduce CDN footprint)
  {
    src: path.join(PUBLIC, "marketing/blog/cat-compliance.png"),
    out: path.join(PUBLIC, "marketing/blog/cat-compliance.webp"),
    quality: 80,
    label: "cat-compliance.png → .webp",
  },
  {
    src: path.join(PUBLIC, "marketing/mocks/mock-line-chart.png"),
    out: path.join(PUBLIC, "marketing/mocks/mock-line-chart.webp"),
    quality: 80,
    label: "mock-line-chart.png → .webp",
  },
  {
    src: path.join(PUBLIC, "marketing/blog/cat-site-execution.png"),
    out: path.join(PUBLIC, "marketing/blog/cat-site-execution.webp"),
    quality: 80,
    label: "cat-site-execution.png → .webp",
  },
  {
    src: path.join(PUBLIC, "marketing/blog/cat-insights.png"),
    out: path.join(PUBLIC, "marketing/blog/cat-insights.webp"),
    quality: 80,
    label: "cat-insights.png → .webp",
  },
  {
    src: path.join(PUBLIC, "marketing/mocks/mock-ticket.png"),
    out: path.join(PUBLIC, "marketing/mocks/mock-ticket.webp"),
    quality: 80,
    label: "mock-ticket.png → .webp",
  },
  {
    src: path.join(PUBLIC, "marketing/mocks/mock-dependency-graph.png"),
    out: path.join(PUBLIC, "marketing/mocks/mock-dependency-graph.webp"),
    quality: 80,
    label: "mock-dependency-graph.png → .webp",
  },
  {
    src: path.join(PUBLIC, "marketing/mocks/mock-gantt-bars.png"),
    out: path.join(PUBLIC, "marketing/mocks/mock-gantt-bars.webp"),
    quality: 80,
    label: "mock-gantt-bars.png → .webp",
  },
];

async function main() {
  let totalBefore = 0, totalAfter = 0;
  for (const t of TARGETS) {
    if (!fs.existsSync(t.src)) {
      console.log(`MISS  ${t.label} (source not found)`);
      continue;
    }
    const beforeBytes = fs.statSync(t.src).size;
    try {
      await sharp(t.src)
        .webp({ quality: t.quality, effort: 5 })
        .toFile(t.out + ".tmp");
      const afterBytes = fs.statSync(t.out + ".tmp").size;
      fs.renameSync(t.out + ".tmp", t.out);
      const savePct = (((beforeBytes - afterBytes) / beforeBytes) * 100).toFixed(1);
      totalBefore += beforeBytes;
      totalAfter += afterBytes;
      console.log(
        `OK    ${t.label}: ${(beforeBytes / 1024 / 1024).toFixed(2)} MB → ${(afterBytes / 1024 / 1024).toFixed(2)} MB (${savePct}% saved)`
      );
    } catch (err) {
      if (fs.existsSync(t.out + ".tmp")) fs.unlinkSync(t.out + ".tmp");
      console.error(`ERR   ${t.label}: ${err.message}`);
    }
  }
  console.log(`\nTOTAL: ${(totalBefore/1024/1024).toFixed(2)} MB → ${(totalAfter/1024/1024).toFixed(2)} MB`);
}

main().catch(console.error);
