import { DatabaseSync } from "node:sqlite";

import { safeTrim } from "./business.mjs";

const DEFAULT_TABLE_NAME = "investors";

function normalizeEmail(email) {
  return safeTrim(email).toLowerCase();
}

function mapInvestorRow(row) {
  const email = normalizeEmail(row.email);
  const startRaw = safeTrim(row.inicio_rendimento);
  return {
    id: `inv-${row.row_id}`,
    email,
    name: safeTrim(row.nome) || "Investidor",
    invested: Number(row.total_investido),
    rule: safeTrim(row.tipo_rendimento),
    startMonth: startRaw.length >= 7 ? startRaw.slice(0, 7) : "",
    startDate: startRaw,
    paymentFrequency: safeTrim(row.periodicidade_pagamento),
    advisorEmail: normalizeEmail(row.assessor),
    masterEmail: normalizeEmail(row.master),
  };
}

export function createInvestorRepository({
  dbPath,
  tableName = DEFAULT_TABLE_NAME,
}) {
  const db = new DatabaseSync(dbPath);

  const selectColumns = `
    rowid AS row_id,
    email,
    nome,
    total_investido,
    tipo_rendimento,
    inicio_rendimento,
    periodicidade_pagamento,
    assessor,
    master
  `;

  const statements = {
    health: db.prepare("SELECT 1 AS ok"),
    own: db.prepare(
      `SELECT ${selectColumns}
       FROM ${tableName}
       WHERE lower(email) = ?
       ORDER BY lower(nome), row_id`
    ),
    advisor: db.prepare(
      `SELECT ${selectColumns}
       FROM ${tableName}
       WHERE lower(assessor) = ?
       ORDER BY lower(nome), row_id`
    ),
    masterCheck: db.prepare(
      `SELECT 1 AS found
       FROM ${tableName}
       WHERE lower(master) = ?
       LIMIT 1`
    ),
    all: db.prepare(
      `SELECT ${selectColumns}
       FROM ${tableName}
       ORDER BY lower(nome), row_id`
    ),
  };

  return {
    close() {
      db.close();
    },
    healthCheck() {
      return statements.health.get();
    },
    getViewerScopeByEmail(email) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return {
          queryEmail: "",
          role: "none",
          investors: [],
        };
      }

      const ownRows = statements.own.all(normalizedEmail).map(mapInvestorRow);
      const isMaster = Boolean(statements.masterCheck.get(normalizedEmail));

      if (isMaster) {
        return {
          queryEmail: normalizedEmail,
          role: "master",
          investors: statements.all.all().map(mapInvestorRow),
        };
      }

      const advisorRows = statements.advisor.all(normalizedEmail).map(mapInvestorRow);
      if (advisorRows.length) {
        const seenIds = new Set();
        const investors = [...advisorRows, ...ownRows].filter((item) => {
          if (seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });

        return {
          queryEmail: normalizedEmail,
          role: "assessor",
          investors,
        };
      }

      if (ownRows.length) {
        return {
          queryEmail: normalizedEmail,
          role: "investor",
          investors: ownRows,
        };
      }

      return {
        queryEmail: normalizedEmail,
        role: "none",
        investors: [],
      };
    },
  };
}
