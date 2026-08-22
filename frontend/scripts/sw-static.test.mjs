import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("cache name is derived from the injected build id", () => {
  assert.match(source, /const SITEFLOW_BUILD_ID = "[^"]*";/);
  assert.match(source, /const CACHE_NAME = `siteflow-shell-\$\{SITEFLOW_BUILD_ID\}`;/);
});

test("no hardcoded eternal version string remains", () => {
  assert.doesNotMatch(source, /siteflow-shell-v1/);
});

test("navigation and HTML requests are network-first with cache fallback", () => {
  const navBlock = source.slice(
    source.indexOf("async function networkFirst"),
    source.indexOf("async function staleWhileRevalidate")
  );
  const fetchPos = navBlock.indexOf("await fetch(request)");
  const cacheMatchPos = navBlock.indexOf("cache.match(request)");
  assert.ok(fetchPos !== -1, "networkFirst must fetch first");
  assert.ok(cacheMatchPos !== -1);
  assert.ok(fetchPos < cacheMatchPos, "fetch must precede cache lookup");
});

test("RSC payloads bypass cache-first", () => {
  assert.match(source, /url\.searchParams\.has\("_rsc"\)/);
  const routing = source.slice(
    source.indexOf('self.addEventListener("fetch"'),
    source.indexOf("event.respondWith(staleWhileRevalidate")
  );
  assert.match(routing, /isHtmlRequest\(event\.request\) \|\| isRscRequest\(event\.request, url\)/);
  assert.match(routing, /networkFirst\(event\.request\)/);
});

test("other GETs use stale-while-revalidate instead of bare cache-first", () => {
  const swrBlock = source.slice(
    source.indexOf("async function staleWhileRevalidate"),
    source.indexOf('self.addEventListener("fetch"')
  );
  assert.ok(swrBlock.length > 0, "staleWhileRevalidate helper must exist");
  assert.match(swrBlock, /return cached \|\| network;/);
  assert.match(swrBlock, /cache\.put\(request, response\.clone\(\)\)/);
});

test("offline fallback is the dedicated offline page, never /login", () => {
  const navBlock = source.slice(
    source.indexOf("async function networkFirst"),
    source.indexOf("async function staleWhileRevalidate")
  );
  assert.match(source.replace(navBlock, ""), /const OFFLINE_URL = "\/offline";/);
  assert.match(navBlock, /cache\.match\(OFFLINE_URL\)/);
  const fetchListener = source.slice(
    source.indexOf('self.addEventListener("fetch"'),
    source.indexOf('self.addEventListener("push"')
  );
  assert.doesNotMatch(fetchListener, /\/login/);
  assert.doesNotMatch(navBlock, /\/login/);
});

test("offline page precached alongside the app shell", () => {
  const shell = source.slice(source.indexOf("const APP_SHELL"), source.indexOf("];"));
  assert.match(shell, /"\/offline"/);
});

test("activate still purges caches from previous build ids", () => {
  assert.match(source, /\.filter\(\(key\) => key !== CACHE_NAME\)/);
});
