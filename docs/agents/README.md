# Orquestracao de Agentes - Portal do Investidor SunnyHUB

Este pacote contem apenas agentes que podem iniciar **agora**, sem depender da entrega de outros.

## Agentes para iniciar agora

1. **Agente 01 - Contratos de Dados e Regras Financeiras**
   - Arquivo: `docs/agents/agent-01-data-contracts.md`
   - Motivo: define formatos e regras base para todo o resto.

2. **Agente 02 - UI/UX Dashboard (com dados mockados)**
   - Arquivo: `docs/agents/agent-02-ui-ux.md`
   - Motivo: pode evoluir visual e componentes sem API final.

3. **Agente 03 - DevOps e Qualidade Base**
   - Arquivo: `docs/agents/agent-03-devops-qa.md`
   - Motivo: CI, padrao de qualidade e esteira podem ser criados sem bloqueio.

## Agentes para iniciar depois (dependentes)

- Ingestao CSV real (depende dos contratos finalizados pelo Agente 01).
- Motor de calculo persistente no backend (depende dos contratos do Agente 01).
- Auth integrada ao banco final (depende da modelagem persistida e/ou escolha final de provider).

## Regra de trabalho para todas as threads

- Cada agente trabalha apenas no proprio escopo.
- Nao alterar sem necessidade arquivos de outro agente.
- Sempre registrar no PR ou resumo final:
  - o que foi feito,
  - o que ficou pendente,
  - riscos/decisoes.
