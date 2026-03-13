import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { importInvestorsDatabase } from "../scripts/import-investors-db.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const sourceCsvPath = path.join(rootDir, "data", "investidores.csv");
const schemaPath = path.join(rootDir, "db", "schema.sql");

test("investor database import creates schema and preserves repeated emails", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "sunnyhub-investors-db-"));
  const dbPath = path.join(tempDir, "investidores.sqlite");

  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const result = await importInvestorsDatabase({
    csv: sourceCsvPath,
    db: dbPath,
    schema: schemaPath,
  });

  assert.equal(result.importedRows, 12);

  const db = new DatabaseSync(dbPath);
  try {
    const countRow = db.prepare("SELECT COUNT(*) AS total FROM investors").get();
    assert.equal(countRow.total, 12);

    const duplicateEmailRow = db
      .prepare("SELECT COUNT(*) AS total FROM investors WHERE email = ?")
      .get("igor@fielturismo.com.br");
    assert.equal(duplicateEmailRow.total, 3);

    const columns = db.prepare("PRAGMA table_info(investors)").all().map((row) => row.name);
    assert.deepEqual(columns, [
      "email",
      "nome",
      "total_investido",
      "tipo_rendimento",
      "inicio_rendimento",
      "fim_rendimento",
      "periodicidade_pagamento",
      "assessor",
      "master",
    ]);
  } finally {
    db.close();
  }
});

test("investor database import aborts when CSV validation fails", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "sunnyhub-investors-db-invalid-"));
  const csvPath = path.join(tempDir, "invalid-investidores.csv");
  const dbPath = path.join(tempDir, "investidores.sqlite");

  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const baseCsv = await readFile(sourceCsvPath, "utf8");
  const invalidCsv = baseCsv.replace(",mensal,", ",semestral,");
  await writeFile(csvPath, invalidCsv, "utf8");

  await assert.rejects(
    () =>
      importInvestorsDatabase({
        csv: csvPath,
        db: dbPath,
        schema: schemaPath,
      }),
    /INVALID_PAYMENT_FREQUENCY/
  );
});
