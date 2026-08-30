#!/usr/bin/env node
// Reference scan: find every image in frontend/public that is NOT referenced
// from any source file in the repo.
//
// Run from repo root: node scripts/scan-orphaned-images.cjs
// Outputs: orphaned files (safe to delete) + referenced files still large.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const PUBLIC = path.resolve(REPO, "frontend/public");
const FRONTEND_SRC = path.resolve(REPO, "frontend/src");

// Extensions to scan for image references in source files
const SRC_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".css", ".json", ".md", ".mdx", ".html"];
// Image extensions to inventory
const IMG_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"]);

// ─── 1. Collect all image files in public/ ────────────────────────────────
function walkDir(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, out);
    else if (IMG_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

const allImages = walkDir(PUBLIC);

// ─── 2. Collect all source text ────────────────────────────────────────────
function collectSourceText(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".next") {
      collectSourceText(full, out);
    } else if (SRC_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      try { out.push(fs.readFileSync(full, "utf8")); } catch {}
    }
  }
  return out;
}

// Scan: frontend/src + docs (markdown may reference images) + scripts
const sourceTexts = [
  ...collectSourceText(FRONTEND_SRC),
  ...collectSourceText(path.resolve(REPO, "docs")),
  ...collectSourceText(path.resolve(REPO, "scripts")),
];
const combinedSource = sourceTexts.join("\n");

// ─── 3. Classify each image ────────────────────────────────────────────────
const orphans = [];
const referenced = [];

for (const imgPath of allImages) {
  // Compute the public-relative path as it would appear in source:
  // e.g. "marketing/landing/feature-dpr-phones.webp"
  const rel = imgPath.replace(PUBLIC + path.sep, "").replace(/\\/g, "/");
  const basename = path.basename(rel);
  const noext = basename.replace(/\.[^.]+$/, "");

  // Check only by:
  // 1. Full relative path as a URL string: e.g. "/marketing/landing/feature-dpr-phones.webp"
  //    or "marketing/landing/feature-dpr-phones.webp" (with or without leading slash)
  // 2. Basename WITH extension: e.g. "feature-dpr-phones.webp"
  // NOT by bare stem — stems like "concrete-volume-calculator" appear in page route
  // file paths and cause false "referenced" matches.
  const isReferenced =
    combinedSource.includes("/" + rel) ||
    combinedSource.includes('"' + rel) ||
    combinedSource.includes("'" + rel) ||
    combinedSource.includes(basename);


  const sizeBytes = fs.statSync(imgPath).size;
  const entry = { rel, sizeBytes, sizeMB: (sizeBytes / 1024 / 1024).toFixed(2) };

  if (isReferenced) referenced.push(entry);
  else orphans.push(entry);
}

// ─── 4. Report ────────────────────────────────────────────────────────────
orphans.sort((a, b) => b.sizeBytes - a.sizeBytes);
referenced.sort((a, b) => b.sizeBytes - a.sizeBytes);

const orphanTotal = orphans.reduce((s, f) => s + f.sizeBytes, 0);
const refTotal = referenced.reduce((s, f) => s + f.sizeBytes, 0);

console.log(`\n${"=".repeat(72)}`);
console.log(`ORPHANED (${orphans.length} files, ${(orphanTotal/1024/1024).toFixed(1)} MB total)`);
console.log("=".repeat(72));
for (const f of orphans) {
  console.log(`  ${f.sizeMB.padStart(5)} MB  ${f.rel}`);
}

console.log(`\n${"=".repeat(72)}`);
console.log(`REFERENCED (${referenced.length} files, ${(refTotal/1024/1024).toFixed(1)} MB total)`);
console.log("=".repeat(72));
for (const f of referenced) {
  const flag = f.sizeBytes > 200*1024 ? " *** LARGE" : "";
  console.log(`  ${f.sizeMB.padStart(5)} MB  ${f.rel}${flag}`);
}

// Write JSON for use by the delete/encode scripts
const output = { orphans, referenced };
fs.writeFileSync(
  path.resolve(__dirname, "image-scan-results.json"),
  JSON.stringify(output, null, 2)
);
console.log(`\nJSON written to scripts/image-scan-results.json`);
