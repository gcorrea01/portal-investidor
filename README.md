# Portal do Investidor SunnyHUB

Aplicacao web estatica para visualizacao de carteira de investidores com regras de rendimento (CDI+3, CDI+5 e 1% a.m.).

## Stack
- Frontend vanilla (`index.html`, `styles.css`, `app.js`)
- Regras de negocio em `src/business.mjs`
- Backend HTTP para investidores
- CDI e IGP-M em CSV dentro de `data/`
- Testes com `node --test`

## Requisitos
- Node.js 20+ (recomendado)
- npm

Para os scripts de banco de dados desta entrega, a validacao foi feita em `Node.js v25.5.0`, usando o modulo nativo `node:sqlite`.

## Rodar localmente
1. Instale dependencias:
```bash
npm install
```
2. Crie ou recrie o banco local de investidores:
```bash
npm run db:investors:reset
```
3. Suba a API de investidores:
```bash
npm run serve:api
```
4. Em outro terminal, suba um servidor estatico no diretorio do projeto:
```bash
python3 -m http.server 5500
```
5. Abra no navegador:
`http://localhost:5500`

Observacao: em ambiente local, o frontend usa `http://localhost:3001` ou `http://127.0.0.1:3001` por padrao para a API. Em producao, o default continua sendo a mesma origem do site.

## Scripts principais
- `npm run serve:api`: sobe o backend minimo de investidores em `http://localhost:3001`
- `npm test`: executa testes
- `npm run build`: gera `dist/` para deploy
- `npm run quality`: roda `lint + test + build`
- `npm run test:coverage`: testes com cobertura experimental do Node

## Dados usados em runtime
- `GET /api/health`
- `GET /api/viewer?email=<email>`
- `data/cdi.csv`
- `data/igpm.csv`

## Banco de investidores
- Schema inicial: [`db/schema.sql`](/Users/gcorrea/Desktop/portal-investidor/db/schema.sql)
- Banco local padrao: `data/investidores.sqlite`
- Tabela unica: `investors`

Comandos:
- `npm run db:investors:import`: cria o schema se necessario, limpa a tabela e importa `data/investidores.csv`
- `npm run db:investors:reset`: remove o banco local e recria tudo do zero

Observacoes:
- O import reaproveita `validateInvestorRows` antes de inserir no banco.
- O banco permite multiplas linhas com o mesmo `email`.
- O contrato das colunas armazenadas permanece: `email`, `nome`, `total_investido`, `tipo_rendimento`, `inicio_rendimento`, `periodicidade_pagamento`, `assessor`, `master`.
- O backend HTTP usa esses mesmos defaults, entao `npm run db:investors:reset` seguido de `npm run serve:api` ja deixa o ambiente local pronto.

## Contrato esperado da API
O frontend consome o backend existente nestes formatos:

- `GET /api/health` -> `200` com `{ "ok": true, "service": "investor-api" }`
- `GET /api/viewer?email=<email>` -> `200` com `{ "role": "investor|assessor|master", "investors": [...] }`

Cada item em `investors` deve conter:
- `id`
- `email`
- `name`
- `invested`
- `rule`
- `startMonth`
- `startDate`
- `paymentFrequency`
- `advisorEmail`
- `masterEmail`

Fonte recomendada das series mensais:
- CDI: Banco Central / SGS
- IGP-M: FGV IBRE (fonte primária) e Banco Central / SGS serie 189 para distribuicao estruturada

## Build de producao
```bash
npm run build
```
Artefato final: pasta `dist/`.

## Deploy no site institucional
Guia completo em [docs/deploy-sunnyhub.md](docs/deploy-sunnyhub.md).
Destino recomendado: `https://investidor.sunnyhub.com.br/`.

## Documentacao complementar
- `docs/backend-api.md`
- `docs/data-contracts.md`
- `docs/financial-rules.md`
- `docs/quality-gates.md`
- `docs/ui-decisions.md`
