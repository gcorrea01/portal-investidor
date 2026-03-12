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
- `data/igpm.csv`

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
