# Casos de Teste Funcionais - Regras Financeiras

## Premissas
- Principal base nos casos: `R$ 100.000,00`.
- Arredondamento monetario em 2 casas decimais.
- `spread_mensal_3 = 0,246627%` e `spread_mensal_5 = 0,407412%` (aprox.).

## Caso 1 - CDI+3 com CDI positivo
Entrada:
- tipo: `CDI+3`
- mes: `2026-01`
- cdi_percent: `0.87`

Esperado:
- taxa_aplicada_percent: `1.116627%`
- dividendo_brl: `1116.63`
- acumulado_brl: `1116.63`
- total_projetado_brl: `101116.63`

## Caso 2 - CDI+5 com CDI positivo
Entrada:
- tipo: `CDI+5`
- mes: `2026-01`
- cdi_percent: `0.87`

Esperado:
- taxa_aplicada_percent: `1.277412%`
- dividendo_brl: `1277.41`
- acumulado_brl: `1277.41`
- total_projetado_brl: `101277.41`

## Caso 3 - 1% a.m. ignora CDI
Entrada:
- tipo: `1% a.m.`
- mes: `2026-01`
- cdi_percent: `0.10`

Esperado:
- taxa_aplicada_percent: `1.00`
- dividendo_brl: `1000.00`

## Caso 4 - Acumulado em dois meses
Entrada:
- tipo: `1% a.m.`
- meses: `2026-01`, `2026-02`

Esperado:
- mes 1: dividendo `1000.00`, acumulado `1000.00`, total `101000.00`
- mes 2: dividendo `1000.00`, acumulado `2000.00`, total `102000.00`

## Caso 5 - Serie CDI fora de ordem
Entrada:
- meses: `2026-02`, `2026-01`

Esperado:
- calculo executado em ordem `2026-01`, `2026-02`

## Caso 6 - Erro de validacao por mes duplicado
Entrada CDI:
- `2026-01,0.87`
- `2026-01,0.90`

Esperado:
- erro `DUPLICATE_MONTH`

## Caso 7 - Erro de validacao por email duplicado
Entrada investidores:
- `ana@sunnyhub.com`
- `ANA@sunnyhub.com`

Esperado:
- erro `DUPLICATE_EMAIL`

## Caso 8 - CDI negativo
Entrada:
- tipo: `CDI+3`
- cdi_percent: `-0.20`

Esperado:
- taxa_aplicada_percent: `0.046627%`
- dividendo_brl: `46.63`
