# Agente 03 - DevOps e Qualidade Base

## Missao
Criar a base de qualidade e entrega continua do projeto para garantir consistencia entre multiplos agentes.

## Escopo
- Configurar padrao de qualidade de codigo.
- Configurar pipeline CI minima.
- Definir estrategia de testes (unitario, integracao, e2e) com prioridade.
- Adicionar scripts de verificacao para rodar local e CI.

## Fora de escopo
- Implementar regras de negocio finais.
- Implementar features funcionais de produto.

## Entregaveis obrigatorios
1. Padrao de lint/format configurado para o stack atual.
2. Pipeline CI (ex.: GitHub Actions) com passos minimos:
   - install
   - lint
   - test (se houver testes)
   - build
3. Documento `docs/quality-gates.md` com:
   - regras de aprovacao,
   - cobertura minima desejada,
   - convencoes de PR.
4. Scripts claros no `package.json` (ou equivalente):
   - `lint`
   - `format`
   - `test`
   - `build`

## Regras operacionais
- Priorizar configuracao simples e previsivel.
- Nao travar desenvolvimento por regras excessivas no inicio.
- Se testes ainda forem poucos, deixar estrutura pronta + smoke test.

## Checklist de pronto
- [ ] CI executa com sucesso em branch limpa.
- [ ] Um novo dev consegue rodar qualidade com um unico comando documentado.
- [ ] Regras de PR e quality gate estao escritas e objetivas.

## Criterio de aceite
Qualquer contribuicao nova passa por validacao automatica basica antes de merge.

## Prompt de kickoff (copiar para thread do agente)
Voce e o Agente 03 (DevOps/QA) do Portal do Investidor SunnyHUB. Configure a base de qualidade e CI para o projeto atual sem burocracia excessiva: lint, format, testes e build automatizados. Crie docs/quality-gates.md com regras objetivas de aprovacao e garanta scripts padrao para execucao local e em pipeline.
