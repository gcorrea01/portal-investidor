import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "LOGOTIPO LARANJA.png",
];

test("core files exist", async () => {
  await Promise.all(requiredFiles.map((file) => access(path.join(rootDir, file))));
});

test("index references local assets that exist", async () => {
  const indexPath = path.join(rootDir, "index.html");
  const html = await readFile(indexPath, "utf8");

  const assetRegex = /(?:src|href)=["']\.\/?([^"']+)["']/g;
  const assetPaths = [];
  let match;

  while ((match = assetRegex.exec(html))) {
    assetPaths.push(match[1]);
  }

  const localAssets = assetPaths.filter((asset) => !asset.startsWith("http"));

  await Promise.all(localAssets.map((asset) => access(path.join(rootDir, decodeURIComponent(asset)))));
  assert.ok(localAssets.length > 0, "Expected at least one local asset reference");
});

test("app runtime depends on investidores.csv for public investor data", async () => {
  const appPath = path.join(rootDir, "app.js");
  const appSource = await readFile(appPath, "utf8");

  assert.match(appSource, /data\/investidores\.csv/);
});
