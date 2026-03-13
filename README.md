# Portal do Investidor SunnyHUB

Aplicacao web estatica para visualizacao de carteira de investidores com regras de rendimento (CDI+3, CDI+5 e 1% a.m.).

## Stack
- Frontend vanilla (`index.html`, `styles.css`, `app.js`)
- Regras de negocio em `src/business.mjs`
- Dados em CSV dentro de `data/`
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
2. Suba um servidor estatico no diretorio do projeto:
```bash
python3 -m http.server 5500
```
3. Abra no navegador:
`http://localhost:5500`

Observacao: abrir `index.html` direto em `file://` pode bloquear leitura dos CSVs via `fetch`.

## Scripts principais
- `npm test`: executa testes
- `npm run build`: gera `dist/` para deploy
- `npm run quality`: roda `lint + test + build`
- `npm run test:coverage`: testes com cobertura experimental do Node

## Dados usados em runtime
- `data/investidores.csv`
- `data/cdi.csv`
- `data/ipca.csv`
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
- `docs/data-contracts.md`
- `docs/financial-rules.md`
- `docs/quality-gates.md`
- `docs/ui-decisions.md`
