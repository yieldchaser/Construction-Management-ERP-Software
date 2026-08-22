import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ASSIGNMENT = /const SITEFLOW_BUILD_ID = "[^"]*";/;

const swPath = new URL("../public/sw.js", import.meta.url);
let source = readFileSync(swPath, "utf8");

if (!ASSIGNMENT.test(source)) {
  console.error('inject-sw-build-id: could not find the `const SITEFLOW_BUILD_ID = "..."` assignment in public/sw.js');
  process.exit(1);
}

const buildId = createHash("sha256")
  .update(`${process.cwd()}:${Date.now()}`)
  .digest("hex")
  .slice(0, 16);

source = source.replace(ASSIGNMENT, `const SITEFLOW_BUILD_ID = "${buildId}";`);
writeFileSync(swPath, source);

console.log(`inject-sw-build-id: stamped siteflow-shell-${buildId}`);
