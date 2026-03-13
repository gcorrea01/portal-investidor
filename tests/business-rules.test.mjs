import test from "node:test";
import assert from "node:assert/strict";

import {
  annualSpreadToMonthly,
  annualSpreadToPeriod,
  calculateHistory,
  parseNumeric,
  resolveViewerScope,
  ruleRate,
  validateCdiRows,
  validateIpcaRows,
  validateInvestorApiResponse,
  validateIgpmRows,
  validateInvestorRows,
} from "../src/business.mjs";

test("parseNumeric supports pt-BR integer and decimal formats", () => {
  assert.equal(parseNumeric("150000"), 150000);
  assert.equal(parseNumeric("150.000,75"), 150000.75);
  assert.equal(parseNumeric("  0,87  "), 0.87);
  assert.ok(Number.isNaN(parseNumeric("")));
  assert.ok(Number.isNaN(parseNumeric("abc")));
});

test("CDI+3 rate matches CDI plus monthly equivalent spread", () => {
  const cdi = 0.87;
  const expectedSpread = annualSpreadToMonthly(3);
  const appliedRate = ruleRate(cdi, "CDI+3");

  assert.ok(Math.abs(appliedRate - (cdi + expectedSpread)) < 1e-12);
});

test("CDI+5 rate matches CDI plus monthly equivalent spread", () => {
  const cdi = 0.84;
  const expectedSpread = annualSpreadToMonthly(5);
  const appliedRate = ruleRate(cdi, "CDI+5");

  assert.ok(Math.abs(appliedRate - (cdi + expectedSpread)) < 1e-12);
});

test("CDI+7 rate matches CDI plus monthly equivalent spread", () => {
  const cdi = 0.91;
  const expectedSpread = annualSpreadToMonthly(7);
  const appliedRate = ruleRate(cdi, "CDI+7");

  assert.ok(Math.abs(appliedRate - (cdi + expectedSpread)) < 1e-12);
});

test("1% a.m. rule always applies fixed 1 percent", () => {
  assert.equal(ruleRate(0.4, "1% a.m."), 1);
  assert.equal(ruleRate(1.2, "1% a.m."), 1);
});

test("IPCA+9 rate matches IPCA plus monthly equivalent spread", () => {
  const ipca = 0.56;
  const expectedSpread = annualSpreadToMonthly(9);
  const appliedRate = ruleRate(ipca, "IPCA+9");

  assert.ok(Math.abs(appliedRate - (ipca + expectedSpread)) < 1e-12);
});

test("calculateHistory keeps simple-interest principal and accumulated dividends", () => {
  const investor = {
    invested: 1000,
    rule: "1% a.m.",
    startMonth: "2026-01",
  };

  const cdiSeries = [
    { month: "2026-01", cdi: 0.9 },
    { month: "2026-02", cdi: 0.8 },
  ];

  const history = calculateHistory(investor, cdiSeries);

  assert.equal(history.length, 2);
  assert.equal(history[0].dividend, 10);
  assert.equal(history[0].accumulated, 10);
  assert.equal(history[1].dividend, 10);
  assert.equal(history[1].accumulated, 20);
});

test("calculateHistory starts at investor start month", () => {
  const investor = {
    invested: 1000,
    rule: "1% a.m.",
    startMonth: "2026-02",
  };

  const cdiSeries = [
    { month: "2026-01", cdi: 0.9 },
    { month: "2026-02", cdi: 0.8 },
    { month: "2026-03", cdi: 0.7 },
  ];

  const history = calculateHistory(investor, cdiSeries);

  assert.equal(history.length, 2);
  assert.equal(history[0].month, "2026-02");
  assert.equal(history[1].month, "2026-03");
});

test("calculateHistory applies pro rata on first month when start is mid-month", () => {
  const investor = {
    invested: 1000,
    rule: "1% a.m.",
    startDate: "2026-02-15",
  };

  const cdiSeries = [
    { month: "2026-02", cdi: 0.8 },
    { month: "2026-03", cdi: 0.7 },
  ];

  const history = calculateHistory(investor, cdiSeries);

  assert.equal(history.length, 2);
  assert.ok(Math.abs(history[0].dividend - 5) < 1e-9);
  assert.ok(Math.abs(history[1].dividend - 10) < 1e-9);
});

test("calculateHistory applies end date to monthly investment", () => {
  const investor = {
    invested: 1000,
    rule: "1% a.m.",
    startDate: "2026-01-01",
    endDate: "2026-02-10",
    paymentFrequency: "mensal",
  };

  const cdiSeries = [
    { month: "2026-01", cdi: 0.8 },
    { month: "2026-02", cdi: 0.7 },
    { month: "2026-03", cdi: 0.6 },
  ];

  const history = calculateHistory(investor, cdiSeries);

  assert.equal(history.length, 2);
  assert.equal(history[0].month, "2026-01");
  assert.equal(history[0].dividend, 10);
  assert.ok(Math.abs(history[1].dividend - (10 / 28) * 10) < 1e-9);
});

test("calculateHistory pays final partial trimestre in month after end date", () => {
  const investor = {
    invested: 1000,
    rule: "1% a.m.",
    paymentFrequency: "trimestral",
    startDate: "2026-01-01",
    endDate: "2026-02-10",
  };

  const cdiSeries = [
    { month: "2026-01", cdi: 0.8 },
    { month: "2026-02", cdi: 0.7 },
    { month: "2026-03", cdi: 0.6 },
  ];

  const history = calculateHistory(investor, cdiSeries);

  assert.equal(history.length, 1);
  assert.equal(history[0].month, "2026-03");
  assert.ok(Math.abs(history[0].dividend - (10 + (10 / 28) * 10)) < 1e-9);
});

test("calculateHistory pays CDI+7 trimestral with quarter rate on quarter close", () => {
  const investor = {
    invested: 1000,
    rule: "CDI+7",
    paymentFrequency: "trimestral",
    startDate: "2026-01-01",
  };

  const cdiSeries = [
    { month: "2026-01", cdi: 1 },
    { month: "2026-02", cdi: 1 },
    { month: "2026-03", cdi: 1 },
  ];

  const history = calculateHistory(investor, cdiSeries);
  const expectedQuarterCdiRate = ((1 + 0.01) ** 3 - 1) * 100;
  const expectedQuarterSpread = annualSpreadToPeriod(7, 4);
  const expectedAppliedRate = expectedQuarterCdiRate + expectedQuarterSpread;

  assert.equal(history.length, 1);
  assert.equal(history[0].month, "2026-04");
  assert.ok(Math.abs(history[0].appliedRate - expectedAppliedRate) < 1e-9);
  assert.ok(Math.abs(history[0].dividend - 1000 * (expectedAppliedRate / 100)) < 1e-9);
  assert.ok(Math.abs(history[0].accumulated - history[0].dividend) < 1e-9);
});

test("calculateHistory pays CDI+3 trimestral with quarter rate on quarter close", () => {
  const investor = {
    invested: 1000,
    rule: "CDI+3",
    paymentFrequency: "trimestral",
    startDate: "2026-01-01",
  };

  const cdiSeries = [
    { month: "2026-01", cdi: 0.8 },
    { month: "2026-02", cdi: 0.9 },
    { month: "2026-03", cdi: 1.0 },
  ];

  const history = calculateHistory(investor, cdiSeries);
  const expectedQuarterCdiRate = ((1 + 0.008) * (1 + 0.009) * (1 + 0.01) - 1) * 100;
  const expectedQuarterSpread = annualSpreadToPeriod(3, 4);
  const expectedAppliedRate = expectedQuarterCdiRate + expectedQuarterSpread;

  assert.equal(history.length, 1);
  assert.equal(history[0].month, "2026-04");
  assert.ok(Math.abs(history[0].appliedRate - expectedAppliedRate) < 1e-9);
  assert.ok(Math.abs(history[0].dividend - 1000 * (expectedAppliedRate / 100)) < 1e-9);
});

test("calculateHistory pays CDI+5 trimestral with quarter rate on quarter close", () => {
  const investor = {
    invested: 1000,
    rule: "CDI+5",
    paymentFrequency: "trimestral",
    startDate: "2026-01-01",
  };

  const cdiSeries = [
    { month: "2026-01", cdi: 0.8 },
    { month: "2026-02", cdi: 0.9 },
    { month: "2026-03", cdi: 1.0 },
  ];

  const history = calculateHistory(investor, cdiSeries);
  const expectedQuarterCdiRate = ((1 + 0.008) * (1 + 0.009) * (1 + 0.01) - 1) * 100;
  const expectedQuarterSpread = annualSpreadToPeriod(5, 4);
  const expectedAppliedRate = expectedQuarterCdiRate + expectedQuarterSpread;

  assert.equal(history.length, 1);
  assert.equal(history[0].month, "2026-04");
  assert.ok(Math.abs(history[0].appliedRate - expectedAppliedRate) < 1e-9);
  assert.ok(Math.abs(history[0].dividend - 1000 * (expectedAppliedRate / 100)) < 1e-9);
});

test("calculateHistory does not expose incomplete future quarter without end date", () => {
  const investor = {
    invested: 1000,
    rule: "CDI+7",
    paymentFrequency: "trimestral",
    startDate: "2025-07-01",
  };

  const cdiSeries = [
    { month: "2025-07", cdi: 1 },
    { month: "2025-08", cdi: 1 },
    { month: "2025-09", cdi: 1 },
    { month: "2025-10", cdi: 1 },
    { month: "2025-11", cdi: 1 },
    { month: "2025-12", cdi: 1 },
    { month: "2026-01", cdi: 1 },
    { month: "2026-02", cdi: 1 },
  ];

  const history = calculateHistory(investor, cdiSeries);

  assert.deepEqual(
    history.map((item) => item.month),
    ["2025-10", "2026-01"]
  );
});

test("validateCdiRows rejects duplicate month", () => {
  const csvData = {
    headers: ["mes", "cdi_percent"],
    rows: [
      { __line: 2, mes: "2026-01", cdi_percent: "0.87" },
      { __line: 3, mes: "2026-01", cdi_percent: "0.84" },
    ],
  };

  const result = validateCdiRows(csvData);
  assert.ok(result.errors.some((error) => error.code === "DUPLICATE_MONTH"));
});

test("validateCdiRows rejects invalid month format", () => {
  const csvData = {
    headers: ["mes", "cdi_percent"],
    rows: [{ __line: 2, mes: "2026-13", cdi_percent: "0.87" }],
  };

  const result = validateCdiRows(csvData);
  assert.ok(result.errors.some((error) => error.code === "INVALID_MONTH"));
});

test("validateIgpmRows accepts valid monthly series", () => {
  const csvData = {
    headers: ["mes", "igpm_percent"],
    rows: [
      { __line: 2, mes: "2025-12", igpm_percent: "0.94" },
      { __line: 3, mes: "2026-01", igpm_percent: "0.27" },
    ],
  };

  const result = validateIgpmRows(csvData);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data.length, 2);
});

test("validateIgpmRows rejects duplicate month", () => {
  const csvData = {
    headers: ["mes", "igpm_percent"],
    rows: [
      { __line: 2, mes: "2026-01", igpm_percent: "0.27" },
      { __line: 3, mes: "2026-01", igpm_percent: "1.06" },
    ],
  };

  const result = validateIgpmRows(csvData);
  assert.ok(result.errors.some((error) => error.code === "DUPLICATE_MONTH"));
});

test("validateIpcaRows accepts valid monthly series", () => {
  const csvData = {
    headers: ["mes", "ipca_percent"],
    rows: [
      { __line: 2, mes: "2025-12", ipca_percent: "0.33" },
      { __line: 3, mes: "2026-01", ipca_percent: "0.33" },
    ],
  };

  const result = validateIpcaRows(csvData);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data.length, 2);
});

test("validateInvestorRows accepts IPCA+9 mensal", () => {
  const csvData = {
    headers: [
      "email",
      "nome",
      "total_investido",
      "tipo_rendimento",
      "inicio_rendimento",
      "periodicidade_pagamento",
    ],
    rows: [
      {
        __line: 2,
        email: "ipca@x.com",
        nome: "Cliente IPCA",
        total_investido: "1000",
        tipo_rendimento: "IPCA+9",
        inicio_rendimento: "2026-01-01",
        periodicidade_pagamento: "mensal",
      },
    ],
  };

  const result = validateInvestorRows(csvData);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data[0].rule, "IPCA+9");
});

test("validateInvestorRows accepts optional assessor/master and repeated investor email", () => {
  const csvData = {
    headers: [
      "email",
      "nome",
      "total_investido",
      "tipo_rendimento",
      "inicio_rendimento",
      "periodicidade_pagamento",
      "assessor",
      "master",
    ],
    rows: [
      {
        __line: 2,
        email: "igor@fielturismo.com.br",
        nome: "Conta A",
        total_investido: "50000",
        tipo_rendimento: "CDI+5",
        inicio_rendimento: "2025-08",
        periodicidade_pagamento: "mensal",
        assessor: "assessor@empresa.com",
        master: "master@empresa.com",
      },
      {
        __line: 3,
        email: "igor@fielturismo.com.br",
        nome: "Conta B",
        total_investido: "100000",
        tipo_rendimento: "CDI+5",
        inicio_rendimento: "2026-01",
        periodicidade_pagamento: "mensal",
        assessor: "assessor@empresa.com",
        master: "master@empresa.com",
      },
    ],
  };

  const result = validateInvestorRows(csvData);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data.length, 2);
});

test("validateInvestorRows accepts CDI+7 trimestral", () => {
  const csvData = {
    headers: [
      "email",
      "nome",
      "total_investido",
      "tipo_rendimento",
      "inicio_rendimento",
      "periodicidade_pagamento",
    ],
    rows: [
      {
        __line: 2,
        email: "cliente@x.com",
        nome: "Cliente",
        total_investido: "1000",
        tipo_rendimento: "CDI+7",
        inicio_rendimento: "2026-01-01",
        periodicidade_pagamento: "trimestral",
      },
    ],
  };

  const result = validateInvestorRows(csvData);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data[0].rule, "CDI+7");
});

test("validateInvestorRows accepts optional fim_rendimento", () => {
  const csvData = {
    headers: [
      "email",
      "nome",
      "total_investido",
      "tipo_rendimento",
      "inicio_rendimento",
      "fim_rendimento",
      "periodicidade_pagamento",
    ],
    rows: [
      {
        __line: 2,
        email: "cliente@x.com",
        nome: "Cliente",
        total_investido: "1000",
        tipo_rendimento: "CDI+4",
        inicio_rendimento: "2026-01-01",
        fim_rendimento: "2026-06-15",
        periodicidade_pagamento: "mensal",
      },
    ],
  };

  const result = validateInvestorRows(csvData);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data[0].endDate, "2026-06-15");
});

test("validateInvestorRows rejects fim_rendimento before inicio_rendimento", () => {
  const csvData = {
    headers: [
      "email",
      "nome",
      "total_investido",
      "tipo_rendimento",
      "inicio_rendimento",
      "fim_rendimento",
      "periodicidade_pagamento",
    ],
    rows: [
      {
        __line: 2,
        email: "cliente@x.com",
        nome: "Cliente",
        total_investido: "1000",
        tipo_rendimento: "CDI+4",
        inicio_rendimento: "2026-06-15",
        fim_rendimento: "2026-06-10",
        periodicidade_pagamento: "mensal",
      },
    ],
  };

  const result = validateInvestorRows(csvData);
  assert.ok(result.errors.some((error) => error.code === "INVALID_DATE_RANGE"));
});

test("validateInvestorRows rejects impossible start date", () => {
  const csvData = {
    headers: [
      "email",
      "nome",
      "total_investido",
      "tipo_rendimento",
      "inicio_rendimento",
      "periodicidade_pagamento",
    ],
    rows: [
      {
        __line: 2,
        email: "ana@x.com",
        nome: "Ana",
        total_investido: "1000",
        tipo_rendimento: "CDI+3",
        inicio_rendimento: "2026-02-31",
        periodicidade_pagamento: "mensal",
      },
    ],
  };

  const result = validateInvestorRows(csvData);
  assert.ok(result.errors.some((error) => error.code === "INVALID_DATE"));
});

test("validateInvestorApiResponse accepts array payload with current investor fields", () => {
  const payload = [
    {
      email: "ana@sunnyhub.com",
      nome: "Ana Duarte",
      total_investido: "150000.00",
      tipo_rendimento: "CDI+3",
      inicio_rendimento: "2025-09-18",
      periodicidade_pagamento: "mensal",
      assessor: "assessor@sunnyhub.com",
      master: "master@sunnyhub.com",
    },
  ];

  const result = validateInvestorApiResponse(payload);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].email, "ana@sunnyhub.com");
});

test("validateInvestorApiResponse accepts normalized backend viewer payload", () => {
  const payload = {
    investors: [
      {
        id: "inv-7",
        email: "bruno@sunnyhub.com",
        name: "Bruno Siqueira",
        invested: 90000,
        rule: "CDI+5",
        startDate: "2025-10-01",
        paymentFrequency: "trimestral",
        advisorEmail: "assessor@sunnyhub.com",
        masterEmail: "master@sunnyhub.com",
      },
    ],
  };

  const result = validateInvestorApiResponse(payload);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data[0].id, "inv-7");
  assert.equal(result.data[0].paymentFrequency, "trimestral");
});

test("validateInvestorApiResponse rejects payload without investors list", () => {
  const result = validateInvestorApiResponse({ items: [] });
  assert.ok(result.errors.some((error) => error.code === "INVALID_API_PAYLOAD"));
});

test("resolveViewerScope returns only associated rows for assessor", () => {
  const investors = [
    { id: "1", email: "a@x.com", advisorEmail: "assessor@x.com", masterEmail: "master@x.com" },
    { id: "2", email: "b@x.com", advisorEmail: "assessor@x.com", masterEmail: "master@x.com" },
    { id: "3", email: "c@x.com", advisorEmail: "outro@x.com", masterEmail: "master@x.com" },
  ];

  const result = resolveViewerScope("assessor@x.com", investors);
  assert.equal(result.role, "assessor");
  assert.equal(result.investors.length, 2);
});

test("resolveViewerScope returns all rows for master", () => {
  const investors = [
    { id: "1", email: "a@x.com", advisorEmail: "assessor@x.com", masterEmail: "master@x.com" },
    { id: "2", email: "b@x.com", advisorEmail: "assessor@x.com", masterEmail: "master@x.com" },
  ];

  const result = resolveViewerScope("master@x.com", investors);
  assert.equal(result.role, "master");
  assert.equal(result.investors.length, 2);
});
