import { rm } from "node:fs/promises";
import path from "node:path";

import { importInvestorsDatabase } from "./import-investors-db.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const defaultDbPath = path.join(rootDir, "data", "investidores.sqlite");

function parseArgs(argv) {
  const options = {
    db: defaultDbPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--db" && next) {
      options.db = path.resolve(next);
      index += 1;
    }
  }

  return options;
}

async function resetDatabase(options = {}) {
  const dbPath = options.db ? path.resolve(options.db) : defaultDbPath;
  await rm(dbPath, { force: true });
  return importInvestorsDatabase({ ...options, db: dbPath });
}

if (import.meta.main) {
  try {
    const result = await resetDatabase(parseArgs(process.argv.slice(2)));
    console.log(`Banco recriado em ${result.dbPath} com ${result.importedRows} linha(s).`);
  } catch (error) {
    console.error(error.message || "Falha ao recriar banco de investidores.");
    process.exitCode = 1;
  }
}
