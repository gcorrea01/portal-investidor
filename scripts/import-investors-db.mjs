import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { safeTrim, validateInvestorRows } from "../src/business.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const defaultDbPath = path.join(rootDir, "data", "investidores.sqlite");
const defaultCsvPath = path.join(rootDir, "data", "investidores.csv");
const defaultSchemaPath = path.join(rootDir, "db", "schema.sql");

function parseArgs(argv) {
  const options = {
    db: defaultDbPath,
    csv: defaultCsvPath,
    schema: defaultSchemaPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--db" && next) {
      options.db = path.resolve(next);
      index += 1;
      continue;
    }

    if (arg === "--csv" && next) {
      options.csv = path.resolve(next);
      index += 1;
      continue;
    }

    if (arg === "--schema" && next) {
      options.schema = path.resolve(next);
      index += 1;
      continue;
    }
  }

  return options;
}

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      if (row.some((cell) => safeTrim(cell) !== "")) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => safeTrim(cell) !== "")) rows.push(row);
  }

  if (!rows.length) return { headers: [], rows: [] };

  const headers = rows[0].map((header) => safeTrim(header).toLowerCase());
  const parsedRows = rows.slice(1).map((line, idx) => {
    const entry = {};
    headers.forEach((header, cellIdx) => {
      entry[header] = safeTrim(line[cellIdx]);
    });
    entry.__line = idx + 2;
    return entry;
  });

  return { headers, rows: parsedRows };
}

function toDbInvestor(row) {
  return {
    email: row.email,
    nome: row.name,
    total_investido: row.invested,
    tipo_rendimento: row.rule,
    inicio_rendimento: row.startDate,
    fim_rendimento: row.endDate || null,
    periodicidade_pagamento: row.paymentFrequency,
    assessor: row.advisorEmail || null,
    master: row.masterEmail || null,
  };
}

function formatValidationErrors(errors) {
  return errors
    .map((error) => {
      const line = error.line ? `linha ${error.line}` : "arquivo";
      const field = error.field ? `, campo ${error.field}` : "";
      return `[${error.code}] ${line}${field}: ${error.message}`;
    })
    .join("\n");
}

export async function importInvestorsDatabase(options = {}) {
  const resolved = {
    db: options.db ? path.resolve(options.db) : defaultDbPath,
    csv: options.csv ? path.resolve(options.csv) : defaultCsvPath,
    schema: options.schema ? path.resolve(options.schema) : defaultSchemaPath,
  };

  const [schemaSql, csvText] = await Promise.all([
    readFile(resolved.schema, "utf8"),
    readFile(resolved.csv, "utf8"),
  ]);

  const csvData = parseCSV(csvText);
  const validation = validateInvestorRows(csvData);
  if (validation.errors.length) {
    throw new Error(`Falha na validacao do CSV de investidores:\n${formatValidationErrors(validation.errors)}`);
  }

  await mkdir(path.dirname(resolved.db), { recursive: true });

  const db = new DatabaseSync(resolved.db);

  try {
    db.exec(schemaSql);
    db.exec("BEGIN");
    db.exec("DELETE FROM investors");

    const insert = db.prepare(`
      INSERT INTO investors (
        email,
        nome,
        total_investido,
        tipo_rendimento,
        inicio_rendimento,
        fim_rendimento,
        periodicidade_pagamento,
        assessor,
        master
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const row of validation.data) {
      const investor = toDbInvestor(row);
      insert.run(
        investor.email,
        investor.nome,
        investor.total_investido,
        investor.tipo_rendimento,
        investor.inicio_rendimento,
        investor.fim_rendimento,
        investor.periodicidade_pagamento,
        investor.assessor,
        investor.master
      );
    }

    db.exec("COMMIT");

    return {
      dbPath: resolved.db,
      importedRows: validation.data.length,
    };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Ignore rollback failures when no transaction is active.
    }
    throw error;
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  try {
    const result = await importInvestorsDatabase(parseArgs(process.argv.slice(2)));
    console.log(`Banco atualizado em ${result.dbPath} com ${result.importedRows} linha(s).`);
  } catch (error) {
    console.error(error.message || "Falha ao importar investidores para o banco.");
    process.exitCode = 1;
  }
}
