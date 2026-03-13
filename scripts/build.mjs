import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const staticEntries = [
  "index.html",
  "styles.css",
  "app.js",
  "LOGOTIPO LARANJA.png",
  "data/investidores.csv",
  "data/cdi.csv",
  "data/ipca.csv",
  "data/igpm.csv",
  "src",
];

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await Promise.all(
    staticEntries.map(async (entry) => {
      const src = path.join(rootDir, entry);
      const dest = path.join(distDir, entry);
      await mkdir(path.dirname(dest), { recursive: true });
      return cp(src, dest, { recursive: true });
    })
  );

  console.log(`Build concluido em ${distDir}`);
}

main().catch((error) => {
  console.error("Falha no build:", error);
  process.exitCode = 1;
});
