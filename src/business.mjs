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

export function calculateHistory(investor, cdiSeries) {
  const parsedStart = parseStartDate(investor.startDate || investor.startMonth);
  const startMonth = parsedStart?.monthKey || "";
  const startDay = parsedStart?.day || 1;
  const scopedSeries = startMonth
    ? cdiSeries.filter((row) => row.month >= startMonth)
    : cdiSeries;
  let accumulated = 0;

  return scopedSeries.map((row) => {
    const appliedRate = ruleRate(row.cdi, investor.rule);
    let factor = 1;
    if (parsedStart && row.month === startMonth && startDay > 1) {
      const activeDays = daysInMonthUTC(parsedStart.year, parsedStart.month) - startDay + 1;
      factor = Math.max(0, Math.min(1, activeDays / daysInMonthUTC(parsedStart.year, parsedStart.month)));
    }
    const dividend = investor.invested * (appliedRate / 100) * factor;
    accumulated += dividend;

    return {
      month: row.month,
      cdi: row.cdi,
      appliedRate,
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
  const required = ["email", "nome", "total_investido", "tipo_rendimento", "inicio_rendimento"];
  const optional = ["usinas", "assessor", "master"];
  const headers = csvData?.headers || [];
  const rows = csvData?.rows || [];
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
    errors.push(validationError("EMPTY_FILE", file, null, null, "CSV sem linhas de dados."));
    return { data: [], errors };
  }

  const data = [];

  rows.forEach((row) => {
    const line = Number(row.__line) || null;
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
        startMonth: parsedStart.monthKey,
        startDate: startRaw.length === 7 ? `${startRaw}-01` : startRaw,
        advisorEmail,
        masterEmail,
      });
    }
  });

  return { data, errors };
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
