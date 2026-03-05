# Agente 01 - Contratos de Dados e Regras Financeiras

## Missao
Definir de forma fechada os contratos de dados (CSV) e as regras de calculo de rendimento mensal para o Portal do Investidor.

## Escopo
- Especificar CSV de investidores.
- Especificar CSV de CDI mensal.
- Definir regras de normalizacao/validacao de dados.
- Definir regra matematica oficial para:
  - `CDI+3`
  - `CDI+5`
  - `1% a.m.`
- Definir estrutura de saida mensal (campos calculados por mes).

## Fora de escopo
- Implementar API definitiva.
- Implementar persistencia real em banco.
- Implementar UI final.

## Entregaveis obrigatorios
1. Documento `docs/data-contracts.md` com:
   - colunas obrigatorias/opcionais,
   - tipos,
   - exemplos validos e invalidos,
   - regras de erro.
2. Documento `docs/financial-rules.md` com:
   - formulas explicitas,
   - convencao de arredondamento,
   - casos de borda.
3. Arquivos de exemplo:
   - `docs/examples/investidores.exemplo.csv`
   - `docs/examples/cdi.exemplo.csv`
4. Casos de teste funcionais em markdown:
   - `docs/examples/financial-test-cases.md`

## Regras tecnicas
- Trabalhar em PT-BR e nomenclatura consistente.
- Mes no formato `YYYY-MM`.
- Valores monetarios em BRL.
- Percentuais em decimal percentual no CSV (ex.: `0.87` = 0,87%).
- Se campo de usinas tiver multiplas entradas: separador oficial `|`.

## Checklist de pronto
- [ ] Contratos sem ambiguidade.
- [ ] Regras de calculo com formula unica por tipo de rendimento.
- [ ] Casos de erro mapeados (email duplicado, mes duplicado, valor invalido, coluna ausente).
- [ ] Exemplos de CSV validos para desbloquear desenvolvimento paralelo.

## Criterio de aceite
Outro agente deve conseguir implementar parser e calculo sem fazer nenhuma pergunta adicional.

## Prompt de kickoff (copiar para thread do agente)
Voce e o Agente 01 do projeto Portal do Investidor SunnyHUB. Sua missao e definir os contratos de dados e as regras financeiras oficiais. Gere os arquivos:
- docs/data-contracts.md
- docs/financial-rules.md
- docs/examples/investidores.exemplo.csv
- docs/examples/cdi.exemplo.csv
- docs/examples/financial-test-cases.md
Use linguagem objetiva, sem ambiguidades, incluindo exemplos validos/invalidos e formulas finais para CDI+3, CDI+5 e 1% a.m. Nao implemente backend/UI; foque 100% na especificacao.
