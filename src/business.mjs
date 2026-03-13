export function safeTrim(value) {
  return String(value ?? "").trim();
}

export function parseNumeric(input) {
  const raw = safeTrim(input);
  if (!raw) return Number.NaN;

  const hasComma = raw.includes(",");
  const normalized = hasComma ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function annualSpreadToMonthly(annualPercent) {
  return (Math.pow(1 + annualPercent / 100, 1 / 12) - 1) * 100;
}

function normalizePaymentFrequencyStrict(value) {
  const normalized = safeTrim(value).toLowerCase();
  if (normalized === "mensal") return "mensal";
  if (normalized === "trimestral") return "trimestral";
  return "";
}

function normalizeRuleStrict(rule) {
  const value = safeTrim(rule).toLowerCase();
  if (value.includes("cdi") && value.includes("+3")) return "CDI+3";
  if (value.includes("cdi") && value.includes("+5")) return "CDI+5";
  if (value.includes("1%") || value.includes("1.0") || value.includes("1,0")) return "1% a.m.";
  return "";
}

export function normalizeRule(rule) {
  return normalizeRuleStrict(rule) || safeTrim(rule) || "CDI+3";
}

export function ruleRate(cdiPercent, rule) {
  if (rule === "CDI+3") return cdiPercent + annualSpreadToMonthly(3);
  if (rule === "CDI+5") return cdiPercent + annualSpreadToMonthly(5);
  if (rule === "1% a.m.") return 1;
  return cdiPercent;
}

function isValidMonthFormat(month) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

function isValidDateFormat(date) {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date);
}

function parseStartDate(input) {
  const raw = safeTrim(input);
  if (!raw) return null;

  if (isValidDateFormat(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
      dt.getUTCFullYear() !== year ||
      dt.getUTCMonth() !== month - 1 ||
      dt.getUTCDate() !== day
    ) {
      return null;
    }
    return { year, month, day, monthKey: `${year}-${String(month).padStart(2, "0")}` };
  }

  if (isValidMonthFormat(raw)) {
    const [year, month] = raw.split("-").map(Number);
    return { year, month, day: 1, monthKey: raw };
  }

  return null;
}

function monthDiff(startMonth, currentMonth) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [currentYear, currentMonthNumber] = currentMonth.split("-").map(Number);
  return (currentYear - startYear) * 12 + (currentMonthNumber - startMonthNumber);
}

function daysInMonthUTC(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidOptionalEmail(value) {
  const email = safeTrim(value).toLowerCase();
  if (!email) return true;
  return isValidEmail(email);
}

function validationError(code, file, line, field, message) {
  return { code, file, line, field, message };
}

function validateHeaders(headers, required, file) {
  const errors = [];
  required.forEach((col) => {
    if (!headers.includes(col)) {
      errors.push(
        validationError("MISSING_COLUMN", file, 1, col, `Coluna obrigatoria ausente: ${col}.`)
      );
    }
  });
  headers.forEach((col) => {
    if (!required.includes(col)) {
      errors.push(
        validationError("UNEXPECTED_COLUMN", file, 1, col, `Coluna nao prevista no contrato: ${col}.`)
      );
    }
  });
  return errors;
}

function validateInvestorDataset(file, headers, rows) {
  const required = [
    "email",
    "nome",
    "total_investido",
    "tipo_rendimento",
    "inicio_rendimento",
    "periodicidade_pagamento",
  ];
  const optional = ["usinas", "assessor", "master"];
  const errors = [];
  required.forEach((col) => {
    if (!headers.includes(col)) {
      errors.push(
        validationError("MISSING_COLUMN", file, 1, col, `Coluna obrigatoria ausente: ${col}.`)
      );
    }
  });
  headers.forEach((col) => {
    if (!required.includes(col) && !optional.includes(col)) {
      errors.push(
        validationError("UNEXPECTED_COLUMN", file, 1, col, `Coluna nao prevista no contrato: ${col}.`)
      );
    }
  });
  if (!rows.length) {
    errors.push(validationError("EMPTY_FILE", file, null, null, "Base sem linhas de dados."));
    return { data: [], errors };
  }

  const data = [];

  rows.forEach((row, index) => {
    const line = Number(row.__line) || index + 1;
    let hasRowError = false;
    const email = safeTrim(row.email).toLowerCase();
    if (!isValidEmail(email)) {
      errors.push(validationError("INVALID_EMAIL", file, line, "email", "E-mail invalido."));
      hasRowError = true;
    }

    const invested = parseNumeric(row.total_investido);
    if (!Number.isFinite(invested)) {
      errors.push(
        validationError(
          "INVALID_NUMBER",
          file,
          line,
          "total_investido",
          "Numero invalido em total_investido."
        )
      );
      hasRowError = true;
    }
    if (invested <= 0) {
      errors.push(
        validationError(
          "INVALID_NUMBER",
          file,
          line,
          "total_investido",
          "total_investido deve ser maior que zero."
        )
      );
      hasRowError = true;
    }

    const normalizedRule = normalizeRuleStrict(row.tipo_rendimento);
    if (!normalizedRule) {
      errors.push(
        validationError(
          "INVALID_RULE",
          file,
          line,
          "tipo_rendimento",
          "Tipo de rendimento fora das regras aceitas."
        )
      );
      hasRowError = true;
    }

    const paymentFrequency = normalizePaymentFrequencyStrict(row.periodicidade_pagamento);
    if (!paymentFrequency) {
      errors.push(
        validationError(
          "INVALID_PAYMENT_FREQUENCY",
          file,
          line,
          "periodicidade_pagamento",
          "Periodicidade de pagamento deve ser mensal ou trimestral."
        )
      );
      hasRowError = true;
    }

    const startRaw = safeTrim(row.inicio_rendimento);
    const parsedStart = parseStartDate(startRaw);
    if (!parsedStart) {
      errors.push(
        validationError(
          "INVALID_DATE",
          file,
          line,
          "inicio_rendimento",
          "Data fora do formato YYYY-MM ou YYYY-MM-DD."
        )
      );
      hasRowError = true;
    }

    const advisorEmail = safeTrim(row.assessor).toLowerCase();
    if (!isValidOptionalEmail(advisorEmail)) {
      errors.push(validationError("INVALID_EMAIL", file, line, "assessor", "E-mail invalido."));
      hasRowError = true;
    }

    const masterEmail = safeTrim(row.master).toLowerCase();
    if (!isValidOptionalEmail(masterEmail)) {
      errors.push(validationError("INVALID_EMAIL", file, line, "master", "E-mail invalido."));
      hasRowError = true;
    }

    if (!hasRowError) {
      data.push({
        id: `inv-${line ?? data.length + 2}`,
        email,
        name: safeTrim(row.nome) || "Investidor",
        invested,
        rule: normalizedRule,
        paymentFrequency,
        startMonth: parsedStart.monthKey,
        startDate: startRaw.length === 7 ? `${startRaw}-01` : startRaw,
        advisorEmail,
        masterEmail,
      });
    }
  });

  return { data, errors };
}

export function calculateHistory(investor, cdiSeries) {
  const parsedStart = parseStartDate(investor.startDate || investor.startMonth);
  const startMonth = parsedStart?.monthKey || "";
  const startDay = parsedStart?.day || 1;
  const paymentFrequency = normalizePaymentFrequencyStrict(investor.paymentFrequency) || "mensal";
  const scopedSeries = startMonth
    ? cdiSeries.filter((row) => row.month >= startMonth)
    : cdiSeries;
  let accumulated = 0;
  let payableCarry = 0;

  return scopedSeries.map((row) => {
    const appliedRate = ruleRate(row.cdi, investor.rule);
    let factor = 1;
    if (parsedStart && row.month === startMonth && startDay > 1) {
      const activeDays = daysInMonthUTC(parsedStart.year, parsedStart.month) - startDay + 1;
      factor = Math.max(0, Math.min(1, activeDays / daysInMonthUTC(parsedStart.year, parsedStart.month)));
    }
    const accruedDividend = investor.invested * (appliedRate / 100) * factor;
    payableCarry += accruedDividend;

    let dividend = accruedDividend;
    if (paymentFrequency === "trimestral") {
      const monthsSinceStart = parsedStart ? monthDiff(startMonth, row.month) : 0;
      const isQuarterClose = monthsSinceStart >= 0 && (monthsSinceStart + 1) % 3 === 0;
      dividend = isQuarterClose ? payableCarry : 0;
      if (isQuarterClose) {
        payableCarry = 0;
      }
    }

    accumulated += dividend;

    return {
      month: row.month,
      cdi: row.cdi,
      appliedRate,
      accruedDividend,
      dividend,
      accumulated,
    };
  });
}

export function resolveViewerScope(loginEmail, investors) {
  const email = safeTrim(loginEmail).toLowerCase();
  if (!email) return { role: "none", investors: [] };

  const all = Array.isArray(investors) ? investors : [];
  const ownMatches = all.filter((item) => item.email === email);
  const isMaster = all.some((item) => item.masterEmail && item.masterEmail === email);
  const advisorMatches = all.filter((item) => item.advisorEmail && item.advisorEmail === email);

  if (isMaster) {
    return { role: "master", investors: all };
  }

  if (advisorMatches.length) {
    const merged = [...advisorMatches, ...ownMatches];
    const unique = [...new Set(merged)];
    return { role: "assessor", investors: unique };
  }

  if (ownMatches.length) {
    return { role: "investor", investors: ownMatches };
  }

  return { role: "none", investors: [] };
}

export function validateInvestorRows(csvData) {
  const file = "investidores.csv";
  const headers = csvData?.headers || [];
  const rows = csvData?.rows || [];
  return validateInvestorDataset(file, headers, rows);
}

export function validateInvestorApiResponse(payload) {
  const file = "api/viewer";
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.investors)
      ? payload.investors
      : Array.isArray(payload?.data)
        ? payload.data
        : null;

  if (!source) {
    return {
      data: [],
      errors: [
        validationError(
          "INVALID_API_PAYLOAD",
          file,
          null,
          null,
          "Resposta da API deve ser um array ou objeto com a lista em investors/data."
        ),
      ],
    };
  }

  const rows = source.map((row, index) => {
    const raw = row || {};
    const mappedRow =
      "nome" in raw || "total_investido" in raw
        ? raw
        : {
            email: raw.email,
            nome: raw.name,
            total_investido: raw.invested,
            tipo_rendimento: raw.rule,
            inicio_rendimento: raw.startDate || raw.startMonth,
            periodicidade_pagamento: raw.paymentFrequency,
            assessor: raw.advisorEmail,
            master: raw.masterEmail,
          };

    return {
      ...mappedRow,
      id: raw.id,
      __line: index + 1,
    };
  });
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row || {})))].filter(
    (header) => header !== "__line" && header !== "id"
  );
  const validationRows = rows.map((row, index) => ({
    ...row,
    __line: index + 1,
  }));

  const result = validateInvestorDataset(file, headers, validationRows);
  result.data = result.data.map((item, index) => ({
    ...item,
    id: safeTrim(rows[index]?.id) || item.id,
  }));
  return result;
}

export function validateCdiRows(csvData) {
  const file = "cdi.csv";
  const required = ["mes", "cdi_percent"];
  const headers = csvData?.headers || [];
  const rows = csvData?.rows || [];
  const errors = validateHeaders(headers, required, file);
  if (!rows.length) {
    errors.push(validationError("EMPTY_FILE", file, null, null, "CSV sem linhas de dados."));
    return { data: [], errors };
  }

  const seenMonths = new Set();
  const data = [];
  rows.forEach((row) => {
    const line = Number(row.__line) || null;
    let hasRowError = false;
    const month = safeTrim(row.mes);
    if (!isValidMonthFormat(month)) {
      errors.push(validationError("INVALID_MONTH", file, line, "mes", "Mes fora do formato YYYY-MM."));
      hasRowError = true;
    } else if (seenMonths.has(month)) {
      errors.push(validationError("DUPLICATE_MONTH", file, line, "mes", `Mes duplicado: ${month}.`));
      hasRowError = true;
    } else {
      seenMonths.add(month);
    }

    const cdi = parseNumeric(row.cdi_percent);
    if (!Number.isFinite(cdi)) {
      errors.push(
        validationError(
          "INVALID_NUMBER",
          file,
          line,
          "cdi_percent",
          "Numero invalido em cdi_percent."
        )
      );
      hasRowError = true;
    }

    if (!hasRowError) {
      data.push({
        month,
        cdi,
      });
    }
  });

  data.sort((a, b) => a.month.localeCompare(b.month));
  return { data, errors };
}

export function validateIgpmRows(csvData) {
  const file = "igpm.csv";
  const required = ["mes", "igpm_percent"];
  const headers = csvData?.headers || [];
  const rows = csvData?.rows || [];
  const errors = validateHeaders(headers, required, file);
  if (!rows.length) {
    errors.push(validationError("EMPTY_FILE", file, null, null, "CSV sem linhas de dados."));
    return { data: [], errors };
  }

  const seenMonths = new Set();
  const data = [];
  rows.forEach((row) => {
    const line = Number(row.__line) || null;
    let hasRowError = false;
    const month = safeTrim(row.mes);
    if (!isValidMonthFormat(month)) {
      errors.push(validationError("INVALID_MONTH", file, line, "mes", "Mes fora do formato YYYY-MM."));
      hasRowError = true;
    } else if (seenMonths.has(month)) {
      errors.push(validationError("DUPLICATE_MONTH", file, line, "mes", `Mes duplicado: ${month}.`));
      hasRowError = true;
    } else {
      seenMonths.add(month);
    }

    const igpm = parseNumeric(row.igpm_percent);
    if (!Number.isFinite(igpm)) {
      errors.push(
        validationError(
          "INVALID_NUMBER",
          file,
          line,
          "igpm_percent",
          "Numero invalido em igpm_percent."
        )
      );
      hasRowError = true;
    }

    if (!hasRowError) {
      data.push({
        month,
        igpm,
      });
    }
  });

  data.sort((a, b) => a.month.localeCompare(b.month));
  return { data, errors };
}
