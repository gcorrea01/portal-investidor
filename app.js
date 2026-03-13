import {
  calculateHistory,
  safeTrim,
  validateCdiRows,
  validateInvestorApiResponse,
  validateIgpmRows,
} from "./src/business.mjs";

const DATA_FILES = {
  cdi: "./data/cdi.csv",
  igpm: "./data/igpm.csv",
};

function defaultApiBaseUrl() {
  const { hostname, protocol } = window.location;
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

  if (isLocalHost) {
    return `${protocol}//${hostname}:3001`;
  }

  return "";
}

const DEFAULT_API_BASE_URL = defaultApiBaseUrl();

const API_CONFIG = {
  health:
    window.SUNNY_PORTAL_CONFIG?.investorsHealthApiUrl ||
    document.body.dataset.investorsHealthApiUrl ||
    `${DEFAULT_API_BASE_URL}/api/health`,
  viewer:
    window.SUNNY_PORTAL_CONFIG?.investorsViewerApiUrl ||
    document.body.dataset.investorsViewerApiUrl ||
    `${DEFAULT_API_BASE_URL}/api/viewer`,
};

const state = {
  cdiSeries: [],
  igpmSeries: [],
  viewerRole: "none",
  accessibleInvestors: [],
  currentInvestor: null,
  history: [],
  backendReady: false,
};

const els = {
  loginPanel: document.getElementById("loginPanel"),
  dashboardPanel: document.getElementById("dashboardPanel"),
  logoutBtn: document.getElementById("logoutBtn"),
  status: document.getElementById("status"),
  bootErrors: document.getElementById("bootErrors"),
  loginForm: document.getElementById("loginForm"),
  emailInput: document.getElementById("emailInput"),
  investorEmail: document.getElementById("investorEmail"),
  investorName: document.getElementById("investorName"),
  investorRule: document.getElementById("investorRule"),
  viewerBadge: document.getElementById("viewerBadge"),
  investorPeriod: document.getElementById("investorPeriod"),
  accountSwitchWrap: document.getElementById("accountSwitchWrap"),
  accountSelect: document.getElementById("accountSelect"),
  kpiInvested: document.getElementById("kpiInvested"),
  kpiDividends: document.getElementById("kpiDividends"),
  kpiProjected: document.getElementById("kpiProjected"),
  historyTableBody: document.getElementById("historyTableBody"),
  dividendChart: document.getElementById("dividendChart"),
};

function setStatus(message, kind = "") {
  const text = safeTrim(message);
  els.status.textContent = text;
  els.status.classList.remove("ok", "error");
  els.status.classList.toggle("hidden", !text);
  if (text && kind) {
    els.status.classList.add(kind);
  }
}

function renderBootErrors(errors) {
  if (!errors.length) {
    els.bootErrors.innerHTML = "";
    els.bootErrors.classList.add("hidden");
    els.bootErrors.classList.remove("error");
    return;
  }

  const items = errors
    .map((error) => {
      const lineLabel = error.line ? `linha ${error.line}` : "arquivo";
      const fieldLabel = error.field ? `, campo ${error.field}` : "";
      return `<li>[${error.code}] ${error.file} - ${lineLabel}${fieldLabel}: ${error.message}</li>`;
    })
    .join("");

  els.bootErrors.innerHTML = `<p>Falha ao carregar os dados base:</p><ul>${items}</ul>`;
  els.bootErrors.classList.remove("hidden");
  els.bootErrors.classList.add("error");
}

async function fetchInvestorScope(email) {
  let response;

  try {
    response = await fetch(`${API_CONFIG.viewer}?email=${encodeURIComponent(email)}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error("Nao foi possivel conectar ao backend de investidores.");
  }

  if (response.status === 404) {
    return {
      role: "none",
      investors: [],
      errors: [],
    };
  }

  if (!response.ok) {
    throw new Error(`API de investidores indisponivel (${response.status}).`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("API de investidores retornou JSON invalido.");
  }

  const investorValidation = validateInvestorApiResponse(payload?.investors ?? payload?.data ?? []);
  return {
    role: safeTrim(payload?.role).toLowerCase() || "none",
    investors: investorValidation.data,
    errors: investorValidation.errors,
  };
}

async function checkBackendHealth() {
  let response;

  try {
    response = await fetch(API_CONFIG.health, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error(
      "Backend de investidores indisponivel. Verifique a API antes de liberar o portal."
    );
  }

  if (!response.ok) {
    throw new Error(`Healthcheck do backend falhou (${response.status}).`);
  }
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

  const headers = rows[0].map((h) => safeTrim(h).toLowerCase());
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

function brl(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function pct(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function monthLabel(monthValue) {
  const [year, month] = safeTrim(monthValue).split("-");
  if (!year || !month) return monthValue;
  return `${month}/${year.slice(-2)}`;
}

function logout() {
  state.viewerRole = "none";
  state.accessibleInvestors = [];
  state.currentInvestor = null;
  state.history = [];
  els.loginForm.reset();
  if (els.accountSelect) {
    els.accountSelect.innerHTML = "";
  }
  if (els.accountSwitchWrap) {
    els.accountSwitchWrap.classList.add("hidden");
  }
  els.loginPanel.classList.remove("hidden");
  els.dashboardPanel.classList.add("hidden");
  els.logoutBtn.classList.add("hidden");
  setStatus("Sessao encerrada.", "ok");
}

function roleLabel(role) {
  if (role === "master") return "Master";
  if (role === "assessor") return "Assessor";
  if (role === "investor") return "Investidor";
  return "-";
}

function renderAccountSwitcher(activeId) {
  if (!els.accountSelect || !els.accountSwitchWrap) return;

  const canSwitch = state.accessibleInvestors.length > 1;
  if (!canSwitch) {
    els.accountSwitchWrap.classList.add("hidden");
    els.accountSelect.innerHTML = "";
    return;
  }

  els.accountSwitchWrap.classList.remove("hidden");
  els.accountSelect.innerHTML = state.accessibleInvestors
    .map(
      (investor) =>
        `<option value="${investor.id}" ${investor.id === activeId ? "selected" : ""}>
          ${investor.name} (${investor.email})
        </option>`
    )
    .join("");
}

function renderHistoryTable(history) {
  els.historyTableBody.innerHTML = "";

  history.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.month}</td>
      <td>${pct(item.cdi)}</td>
      <td>${pct(item.appliedRate)}</td>
      <td>${brl(item.dividend)}</td>
      <td>${brl(item.accumulated)}</td>
    `;
    els.historyTableBody.appendChild(tr);
  });
}

function renderChart(history) {
  const canvas = els.dividendChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = { top: 28, right: 24, bottom: 42, left: 52 };

  ctx.clearRect(0, 0, width, height);

  if (!history.length) return;

  const values = history.map((h) => h.dividend);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = Math.max(maxValue - minValue, 1);

  const xStep = (width - pad.left - pad.right) / Math.max(history.length - 1, 1);

  ctx.strokeStyle = "#e8e8e8";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + ((height - pad.top - pad.bottom) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  }

  ctx.beginPath();
  history.forEach((point, i) => {
    const x = pad.left + i * xStep;
    const y =
      height -
      pad.bottom -
      ((point.dividend - minValue) / range) * (height - pad.top - pad.bottom);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#ff5a00");
  gradient.addColorStop(1, "#ffa800");

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.stroke();

  history.forEach((point, i) => {
    const x = pad.left + i * xStep;
    const y =
      height -
      pad.bottom -
      ((point.dividend - minValue) / range) * (height - pad.top - pad.bottom);

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#eb4c1d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (history.length <= 10 || i % 2 === 0 || i === history.length - 1) {
      ctx.fillStyle = "#666";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(point.month.slice(2), x, height - 16);
    }
  });
}

function showDashboard(investor) {
  const history = calculateHistory(investor, state.cdiSeries);
  state.currentInvestor = investor;
  state.history = history;

  const totalDividends = history.length ? history[history.length - 1].accumulated : 0;
  const projected = investor.invested + totalDividends;

  els.investorEmail.textContent = investor.email;
  els.investorName.textContent = investor.name;
  els.investorRule.textContent = investor.rule;
  if (els.viewerBadge) {
    els.viewerBadge.textContent = roleLabel(state.viewerRole);
  }
  const periodStart = history[0]?.month || "-";
  const periodEnd = history[history.length - 1]?.month || "-";
  els.investorPeriod.textContent = `Periodo: ${monthLabel(periodStart)} a ${monthLabel(periodEnd)}`;
  els.kpiInvested.textContent = brl(investor.invested);
  els.kpiDividends.textContent = brl(totalDividends);
  els.kpiProjected.textContent = brl(projected);

  renderAccountSwitcher(investor.id);
  renderHistoryTable(history);
  renderChart(history);

  els.loginPanel.classList.add("hidden");
  els.dashboardPanel.classList.remove("hidden");
  els.logoutBtn.classList.remove("hidden");
}

function handleLogin(event) {
  event.preventDefault();

  if (!state.backendReady || !state.cdiSeries.length) {
    setStatus("Dados ainda nao estao disponiveis. Tente novamente em instantes.", "error");
    return;
  }

  const email = safeTrim(els.emailInput.value).toLowerCase();

  if (!email) {
    setStatus("Informe um e-mail valido.", "error");
    return;
  }

  renderBootErrors([]);

  fetchInvestorScope(email)
    .then((scope) => {
      if (scope.errors.length) {
        renderBootErrors(scope.errors);
        setStatus("API retornou investidores fora do contrato esperado.", "error");
        return;
      }

      if (!scope.investors.length) {
        setStatus("E-mail nao encontrado na API de investidores.", "error");
        return;
      }

      state.viewerRole = scope.role;
      state.accessibleInvestors = scope.investors;

      const preferred = scope.investors.find((item) => item.email === email) || scope.investors[0];

      showDashboard(preferred);
      setStatus(
        `Acesso ${roleLabel(scope.role).toLowerCase()} liberado para ${scope.investors.length} conta(s).`,
        "ok"
      );
    })
    .catch((error) => {
      setStatus(error.message || "Falha ao consultar investidores no backend.", "error");
    });

  setStatus("Consultando acesso no backend...", "");
}

async function bootstrapData() {
  try {
    setStatus("Carregando backend, CDI e IGP-M...", "");

    const [, cdiResponse, igpmResponse] = await Promise.all([
      checkBackendHealth(),
      fetch(DATA_FILES.cdi, { cache: "no-store" }),
      fetch(DATA_FILES.igpm, { cache: "no-store" }),
    ]);

    if (!cdiResponse.ok || !igpmResponse.ok) {
      throw new Error(
        "Nao foi possivel ler os CSVs em data/cdi.csv e data/igpm.csv."
      );
    }

    const [cdiText, igpmText] = await Promise.all([cdiResponse.text(), igpmResponse.text()]);

    const cdiValidation = validateCdiRows(parseCSV(cdiText));
    const igpmValidation = validateIgpmRows(parseCSV(igpmText));
    const errors = [...cdiValidation.errors, ...igpmValidation.errors];

    if (errors.length) {
      renderBootErrors(errors);
      setStatus(`Falha na carga inicial: ${errors.length} erro(s) encontrado(s).`, "error");
      return;
    }

    renderBootErrors([]);
    state.cdiSeries = cdiValidation.data;
    state.igpmSeries = igpmValidation.data;
    state.backendReady = true;
    setStatus("", "");
  } catch (error) {
    state.backendReady = false;
    renderBootErrors([
      {
        code: "BOOT_FAIL",
        file: "bootstrap",
        line: null,
        field: null,
        message: error.message || "Erro desconhecido ao carregar dados iniciais.",
      },
    ]);
    setStatus("Erro ao carregar dados iniciais do portal. Confira API e arquivos de indices.", "error");
  }
}

els.loginForm.addEventListener("submit", handleLogin);
els.logoutBtn.addEventListener("click", logout);
if (els.accountSelect) {
  els.accountSelect.addEventListener("change", (event) => {
    const selectedId = safeTrim(event.target.value);
    const investor = state.accessibleInvestors.find((item) => item.id === selectedId);
    if (!investor) return;
    showDashboard(investor);
  });
}

window.addEventListener("resize", () => {
  if (!state.currentInvestor) return;
  renderChart(state.history);
});

bootstrapData();
