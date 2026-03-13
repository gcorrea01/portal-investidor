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

export function annualSpreadToPeriod(annualPercent, periodsPerYear) {
  return (Math.pow(1 + annualPercent / 100, 1 / periodsPerYear) - 1) * 100;
}

function annualSpreadForEffectiveMonths(annualPercent, effectiveMonths) {
  return (Math.pow(1 + annualPercent / 100, effectiveMonths / 12) - 1) * 100;
}

function normalizePaymentFrequencyStrict(value) {
  const normalized = safeTrim(value).toLowerCase();
  if (normalized === "mensal") return "mensal";
  if (normalized === "trimestral") return "trimestral";
  return "";
}

function extractCdiSpread(rule) {
  const value = safeTrim(rule).toLowerCase();
  const match = value.match(/cdi\s*\+\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return Number.NaN;

  const spread = Number(match[1].replace(",", "."));
  return Number.isFinite(spread) ? spread : Number.NaN;
}

function extractIpcaSpread(rule) {
  const value = safeTrim(rule).toLowerCase();
  const match = value.match(/ipca\s*\+\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return Number.NaN;

  const spread = Number(match[1].replace(",", "."));
  return Number.isFinite(spread) ? spread : Number.NaN;
}

function isIgpmRule(rule) {
  return /^igp-?m$/i.test(safeTrim(rule));
}

function normalizeRuleStrict(rule) {
  const value = safeTrim(rule).toLowerCase();
  const spread = extractCdiSpread(rule);
  if (Number.isFinite(spread)) return `CDI+${spread}`;
  const ipcaSpread = extractIpcaSpread(rule);
  if (Number.isFinite(ipcaSpread)) return `IPCA+${ipcaSpread}`;
  if (isIgpmRule(value)) return "IGPM";
  if (value.includes("1%") || value.includes("1.0") || value.includes("1,0")) return "1% a.m.";
  return "";
}

export function normalizeRule(rule) {
  return normalizeRuleStrict(rule) || safeTrim(rule) || "CDI+3";
}

export function ruleRate(cdiPercent, rule) {
  const cdiSpread = extractCdiSpread(rule);
  if (Number.isFinite(cdiSpread)) return cdiPercent + annualSpreadToMonthly(cdiSpread);
  const ipcaSpread = extractIpcaSpread(rule);
  if (Number.isFinite(ipcaSpread)) return cdiPercent + annualSpreadToMonthly(ipcaSpread);
  if (isIgpmRule(rule)) return 1;
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

function parseOptionalDate(input) {
  const raw = safeTrim(input);
  if (!raw) return null;
  return parseStartDate(raw);
}

function monthDiff(startMonth, currentMonth) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [currentYear, currentMonthNumber] = currentMonth.split("-").map(Number);
  return (currentYear - startYear) * 12 + (currentMonthNumber - startMonthNumber);
}

function addMonths(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const baseIndex = year * 12 + (monthNumber - 1) + offset;
  const nextYear = Math.floor(baseIndex / 12);
  const nextMonth = (baseIndex % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function daysInMonthUTC(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isQuarterClose(monthsSinceStart) {
  return monthsSinceStart >= 0 && (monthsSinceStart + 1) % 3 === 0;
}

function isQuarterlyCdiRule(rule, paymentFrequency) {
  return paymentFrequency === "trimestral" && Number.isFinite(extractCdiSpread(rule));
}

function compoundedPercent(values) {
  return (
    values.reduce((accumulator, value) => accumulator * (1 + value / 100), 1) - 1
  ) * 100;
}

function buildAccrualSeries(rateSeries, parsedStart, parsedEnd) {
  const startMonth = parsedStart?.monthKey || "";
  const endMonth = parsedEnd?.monthKey || "";

  return rateSeries
    .filter((row) => {
      if (startMonth && row.month < startMonth) return false;
      if (endMonth && row.month > endMonth) return false;
      return true;
    })
    .map((row) => {
      let factor = 1;

      if (parsedStart && row.month === parsedStart.monthKey && parsedStart.day > 1) {
        const monthDays = daysInMonthUTC(parsedStart.year, parsedStart.month);
        const activeDays = monthDays - parsedStart.day + 1;
        factor *= Math.max(0, Math.min(1, activeDays / monthDays));
      }

      if (parsedEnd && row.month === parsedEnd.monthKey) {
        const monthDays = daysInMonthUTC(parsedEnd.year, parsedEnd.month);
        factor *= Math.max(0, Math.min(1, parsedEnd.day / monthDays));
      }

      return {
        month: row.month,
        cdi: row.cdi ?? row.igpm,
        factor,
      };
    })
    .filter((row) => row.factor > 0);
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
  const optional = ["fim_rendimento", "usinas", "assessor", "master"];
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
    if (normalizedRule === "IGPM" && paymentFrequency && paymentFrequency !== "mensal") {
      errors.push(
        validationError(
          "INVALID_PAYMENT_FREQUENCY",
          file,
          line,
          "periodicidade_pagamento",
          "Investimentos IGPM devem usar periodicidade mensal."
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

    const endRaw = safeTrim(row.fim_rendimento);
    const parsedEnd = parseOptionalDate(endRaw);
    if (endRaw && !parsedEnd) {
      errors.push(
        validationError(
          "INVALID_DATE",
          file,
          line,
          "fim_rendimento",
          "Data fora do formato YYYY-MM ou YYYY-MM-DD."
        )
      );
      hasRowError = true;
    }

    const parsedStartUtc = parsedStart
      ? Date.UTC(parsedStart.year, parsedStart.month - 1, parsedStart.day)
      : null;
    const parsedEndUtc = parsedEnd ? Date.UTC(parsedEnd.year, parsedEnd.month - 1, parsedEnd.day) : null;
    if (parsedStartUtc !== null && parsedEndUtc !== null && parsedEndUtc < parsedStartUtc) {
      errors.push(
        validationError(
          "INVALID_DATE_RANGE",
          file,
          line,
          "fim_rendimento",
          "fim_rendimento nao pode ser anterior a inicio_rendimento."
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
        endMonth: parsedEnd?.monthKey || "",
        endDate: endRaw ? (endRaw.length === 7 ? `${endRaw}-01` : endRaw) : "",
        advisorEmail,
        masterEmail,
      });
    }
  });

  return { data, errors };
}

export function calculateHistory(investor, rateSeries) {
  const parsedStart = parseStartDate(investor.startDate || investor.startMonth);
  const parsedEnd = parseOptionalDate(investor.endDate || investor.endMonth);
  const paymentFrequency = normalizePaymentFrequencyStrict(investor.paymentFrequency) || "mensal";
  const accrualSeries = buildAccrualSeries(rateSeries, parsedStart, parsedEnd);
  let accumulated = 0;
  const history = [];

  if (paymentFrequency === "mensal") {
    if (isIgpmRule(investor.rule)) {
      let igpmAdjustmentFactor = 1;
      accrualSeries.forEach((row, index) => {
        if (index > 0 && index % 12 === 0) {
          const previousWindow = accrualSeries.slice(index - 12, index);
          const annualIgpmRate = compoundedPercent(previousWindow.map((item) => item.cdi));
          if (annualIgpmRate > 0) {
            igpmAdjustmentFactor *= 1 + annualIgpmRate / 100;
          }
        }

        const appliedRate = 1 * igpmAdjustmentFactor;
        const accruedDividend = investor.invested * (appliedRate / 100) * row.factor;
        const dividend = accruedDividend;
        accumulated += dividend;
        history.push({
          month: row.month,
          cdi: row.cdi,
          appliedRate,
          accruedDividend,
          dividend,
          accumulated,
        });
      });

      return history;
    }

    accrualSeries.forEach((row) => {
      const appliedRate = ruleRate(row.cdi, investor.rule);
      const accruedDividend = investor.invested * (appliedRate / 100) * row.factor;
      const dividend = accruedDividend;
      accumulated += dividend;
      history.push({
        month: row.month,
        cdi: row.cdi,
        appliedRate,
        accruedDividend,
        dividend,
        accumulated,
      });
    });

    return history;
  }

  for (let index = 0; index < accrualSeries.length; index += 3) {
    const window = accrualSeries.slice(index, index + 3);
    if (!window.length) continue;
    const isPartialFinalWindow = window.length < 3;
    if (isPartialFinalWindow && !parsedEnd) {
      continue;
    }
    const paymentMonth = addMonths(window[window.length - 1].month, 1);

    if (isQuarterlyCdiRule(investor.rule, paymentFrequency)) {
      const cdiRate = compoundedPercent(window.map((item) => item.cdi * item.factor));
      const spread = extractCdiSpread(investor.rule);
      const effectiveMonths = window.reduce((total, item) => total + item.factor, 0);
      const spreadRate = annualSpreadForEffectiveMonths(spread, effectiveMonths);
      const appliedRate = cdiRate + spreadRate;
      const accruedDividend = investor.invested * (appliedRate / 100);
      const dividend = accruedDividend;
      accumulated += dividend;
      history.push({
        month: paymentMonth,
        cdi: cdiRate,
        appliedRate,
        accruedDividend,
        dividend,
        accumulated,
      });
      continue;
    }

    const accruedDividend = window.reduce((total, row) => {
      const appliedRate = ruleRate(row.cdi, investor.rule);
      return total + investor.invested * (appliedRate / 100) * row.factor;
    }, 0);
    const dividend = accruedDividend;
    accumulated += dividend;
    history.push({
      month: paymentMonth,
      cdi: compoundedPercent(window.map((row) => row.cdi * row.factor)),
      appliedRate: window.reduce((total, row) => total + ruleRate(row.cdi, investor.rule) * row.factor, 0),
      accruedDividend,
      dividend,
      accumulated,
    });
  }

  return history;
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
            fim_rendimento: raw.endDate || raw.endMonth,
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

export function validateIpcaRows(csvData) {
  const file = "ipca.csv";
  const required = ["mes", "ipca_percent"];
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

    const ipca = parseNumeric(row.ipca_percent);
    if (!Number.isFinite(ipca)) {
      errors.push(
        validationError(
          "INVALID_NUMBER",
          file,
          line,
          "ipca_percent",
          "Numero invalido em ipca_percent."
        )
      );
      hasRowError = true;
    }

    if (!hasRowError) {
      data.push({
        month,
        cdi: ipca,
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
