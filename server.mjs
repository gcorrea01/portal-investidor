import http from "node:http";
import { URL } from "node:url";

import { createInvestorRepository } from "./src/investor-repository.mjs";

const DEFAULT_PORT = 3001;
const DEFAULT_DB_PATH = "./data/investidores.sqlite";
const DEFAULT_TABLE_NAME = "investors";

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

export function createInvestorApiHandler(repository, host = "127.0.0.1") {
  return (req, res) => {
    try {
      if (!req.url) {
        json(res, 400, {
          error: "BAD_REQUEST",
          message: "URL da requisicao ausente.",
        });
        return;
      }

      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
      }

      const requestUrl = new URL(req.url, `http://${req.headers.host || host}`);

      if (req.method === "GET" && requestUrl.pathname === "/api/health") {
        repository.healthCheck();
        json(res, 200, {
          ok: true,
          service: "investor-api",
        });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/viewer") {
        const email = requestUrl.searchParams.get("email") || "";
        if (!email.trim()) {
          json(res, 400, {
            error: "MISSING_EMAIL",
            message: "Informe o parametro email.",
          });
          return;
        }

        const scope = repository.getViewerScopeByEmail(email);
        if (!scope.investors.length) {
          json(res, 404, {
            queryEmail: scope.queryEmail,
            role: "none",
            investors: [],
            message: "Nenhum registro encontrado para o email informado.",
          });
          return;
        }

        json(res, 200, {
          queryEmail: scope.queryEmail,
          role: scope.role,
          count: scope.investors.length,
          investors: scope.investors,
        });
        return;
      }

      json(res, 404, {
        error: "NOT_FOUND",
        message: "Endpoint nao encontrado.",
      });
    } catch (error) {
      json(res, 500, {
        error: "INTERNAL_ERROR",
        message: error.message || "Falha interna ao consultar investidores.",
      });
    }
  };
}

export function startInvestorApiServer({
  port = DEFAULT_PORT,
  host = "127.0.0.1",
  dbPath = DEFAULT_DB_PATH,
  tableName = DEFAULT_TABLE_NAME,
} = {}) {
  const repository = createInvestorRepository({ dbPath, tableName });
  const server = http.createServer(createInvestorApiHandler(repository, host));

  server.on("close", () => {
    repository.close();
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        server,
        repository,
        host,
        port: typeof address === "object" && address ? address.port : port,
      });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const host = process.env.HOST || "127.0.0.1";
  const dbPath = process.env.INVESTOR_DB_PATH || DEFAULT_DB_PATH;
  const tableName = process.env.INVESTOR_DB_TABLE || DEFAULT_TABLE_NAME;

  startInvestorApiServer({ port, host, dbPath, tableName })
    .then(({ port: activePort, host: activeHost }) => {
      process.stdout.write(`Investor API listening on http://${activeHost}:${activePort}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
