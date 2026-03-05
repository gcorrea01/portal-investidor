# Quality Gates - Portal do Investidor SunnyHUB

## Objetivo
Definir o conjunto minimo de validacoes automaticas para evitar regressao basica antes de merge.

## Regras de aprovacao
- CI obrigatoria em status verde (`lint`, `test`, `build`).
- Pelo menos 1 aprovacao de PR para alteracoes de codigo.
- Comentarios de review criticos devem ser resolvidos antes do merge.
- Nao fazer merge com conflitos nao resolvidos.

## Cobertura minima (fase inicial)
- Meta inicial: `>= 50%` de cobertura de funcoes de negocio conforme testes forem adicionados.
- Medicao atual de referencia (fev/2026): ~68% de linhas em `src/business.mjs` com `npm run test:coverage`.
- Regra de transicao: enquanto a suite ainda e pequena, manter pelo menos 1 smoke test ativo cobrindo estrutura e assets principais.
- Meta evolutiva recomendada: subir para `>= 70%` quando modulos de calculo forem isolados.

## Convencoes de PR
- PR com escopo unico e descricao objetiva (o que mudou, por que mudou, como validar).
- Incluir evidencias de validacao local (comandos e resultado resumido).
- Se houver risco ou pendencia, registrar explicitamente na descricao da PR.
- Evitar PRs muito grandes; priorizar lotes pequenos e revisaveis.

## Comando unico de qualidade
Rodar localmente antes de abrir PR:

```bash
npm run quality
```

## Pipeline CI minima
A pipeline executa, nesta ordem:
1. `npm ci`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
