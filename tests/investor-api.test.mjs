import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { createInvestorRepository } from "../src/investor-repository.mjs";
import { createInvestorApiHandler } from "../server.mjs";

function createTempDatabase() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sunnyhub-investor-api-"));
  const dbPath = path.join(tempDir, "investidores.db");
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE investors (
      email TEXT NOT NULL,
      nome TEXT NOT NULL,
      total_investido REAL NOT NULL,
      tipo_rendimento TEXT NOT NULL,
      inicio_rendimento TEXT NOT NULL,
      fim_rendimento TEXT,
      periodicidade_pagamento TEXT NOT NULL,
      assessor TEXT,
      master TEXT
    );
  `);

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

  insert.run(
    "cliente1@empresa.com",
    "Cliente Um",
    50000,
    "CDI+5",
    "2025-08-01",
    null,
    "mensal",
    "assessor@empresa.com",
    "master@empresa.com"
  );
  insert.run(
    "cliente2@empresa.com",
    "Cliente Dois",
    100000,
    "CDI+3",
    "2025-09-15",
    null,
    "mensal",
    "assessor@empresa.com",
    "master@empresa.com"
  );
  insert.run(
    "assessor@empresa.com",
    "Conta do Assessor",
    30000,
    "1% a.m.",
    "2025-10-01",
    null,
    "trimestral",
    "assessor@empresa.com",
    "master@empresa.com"
  );

  db.close();
  return { dbPath, tempDir };
}

async function callHandler(handler, { method = "GET", url, headers = {} }) {
  const req = { method, url, headers };

  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      writeHead(statusCode, responseHeaders) {
        this.statusCode = statusCode;
        this.headers = responseHeaders;
      },
      end(body = "") {
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body,
        });
      },
    };

    handler(req, res);
  });
}

test("GET /api/health returns service status", async () => {
  const { dbPath, tempDir } = createTempDatabase();
  const repository = createInvestorRepository({ dbPath });
  const handler = createInvestorApiHandler(repository);

  try {
    const response = await callHandler(handler, { url: "/api/health" });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, "investor-api");
  } finally {
    repository.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/viewer returns investor scope for direct email", async () => {
  const { dbPath, tempDir } = createTempDatabase();
  const repository = createInvestorRepository({ dbPath });
  const handler = createInvestorApiHandler(repository);

  try {
    const response = await callHandler(handler, { url: "/api/viewer?email=cliente1@empresa.com" });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.role, "investor");
    assert.equal(body.count, 1);
    assert.equal(body.investors[0].email, "cliente1@empresa.com");
  } finally {
    repository.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/viewer returns advisor scope with advisor and clients", async () => {
  const { dbPath, tempDir } = createTempDatabase();
  const repository = createInvestorRepository({ dbPath });
  const handler = createInvestorApiHandler(repository);

  try {
    const response = await callHandler(handler, { url: "/api/viewer?email=assessor@empresa.com" });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.role, "assessor");
    assert.equal(body.count, 3);
  } finally {
    repository.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GET /api/viewer returns master scope with all rows", async () => {
  const { dbPath, tempDir } = createTempDatabase();
  const repository = createInvestorRepository({ dbPath });
  const handler = createInvestorApiHandler(repository);

  try {
    const response = await callHandler(handler, { url: "/api/viewer?email=master@empresa.com" });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.role, "master");
    assert.equal(body.count, 3);
  } finally {
    repository.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
