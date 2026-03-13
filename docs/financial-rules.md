# Regras Financeiras Oficiais - Portal do Investidor SunnyHUB

## Objetivo
Definir regras matematicas unicas para calculo mensal de dividendos.

## Entradas por investidor
- `principal`: valor de `total_investido` (BRL).
- `tipo_rendimento`: `CDI+N`, `IPCA+N` ou `1% a.m.`. Exemplos atuais: `CDI+3`, `CDI+5`, `CDI+7`, `IPCA+9`.
- `inicio_rendimento`: data inicial da apuracao.
- `fim_rendimento`: data final opcional da apuracao.
- `periodicidade_pagamento`: `mensal` ou `trimestral`.
- Serie mensal de CDI: pares (`mes`, `cdi_percent`).

## Convencoes
- `cdi_percent` e taxas de saida sao percentuais mensais.
- Exemplo: `0.87` equivale a `0,87%` no mes.
- Calculo ocorre mes a mes em ordem crescente de `mes`.
- Dividendo mensal nao capitaliza o principal (juros simples sobre principal fixo).

## Conversao de spread anual para taxa mensal
Para regras `CDI+N`, converter o spread anual para a periodicidade aplicavel por equivalencia composta:

`spread_mensal_percent = ((1 + spread_anual/100)^(1/12) - 1) * 100`

Onde:
- em `CDI+3`, `spread_anual = 3`
- em `CDI+5`, `spread_anual = 5`
- em `CDI+7`, `spread_anual = 7`
- em qualquer `CDI+N`, `spread_anual = N`

Valores de referencia aproximados:
- `spread_mensal_3 ~= 0.246627%`
- `spread_mensal_5 ~= 0.407412%`

## Taxa aplicada por tipo
- `CDI+N` com pagamento `mensal`: `taxa_aplicada_percent = cdi_percent + spread_mensal_N`
- `IPCA+N` com pagamento `mensal`: `taxa_aplicada_percent = ipca_percent + spread_mensal_N`
- `1% a.m.`: `taxa_aplicada_percent = 1.00`

## Calculo mensal
Para cada mes `m`:

1. `dividendo_m = principal * (taxa_aplicada_percent_m / 100)`
2. `acumulado_m = soma(dividendo_i) para todo i <= m`
3. `total_projetado_m = principal + acumulado_m`

## Regra de pagamento
- `mensal`: o valor calculado no mes e pago no proprio mes.
- Se houver `fim_rendimento`, a ultima competencia mensal e limitada por essa data. Se o encerramento ocorrer no meio do mes, aplicar proporcionalidade no ultimo mes.
- `trimestral`: o valor continua sendo apurado por janelas de 3 meses, contadas a partir de `inicio_rendimento`, mas o pagamento ocorre no mes seguinte ao fechamento dessa janela.
- Exemplo: competencia `jul/ago/set` paga em `out`; `out/nov/dez` paga em `jan`.
- Para `CDI+N` com `trimestral`, a taxa do trimestre e calculada como:
  - CDI trimestral efetivo da janela de 3 meses
  - mais o spread efetivo de `N% a.a.` convertido para o trimestre
- No mes de pagamento trimestral, o valor pago corresponde ao trimestre imediatamente anterior.
- Se o primeiro mes for parcial por conta de `inicio_rendimento` em `YYYY-MM-DD`, a proporcionalidade desse primeiro mes entra normalmente no primeiro fechamento trimestral.
- Se houver `fim_rendimento`, a ultima janela pode ser parcial. Nesse caso, o sistema gera um pagamento final no mes seguinte ao ultimo mes de competencia apurado.
- Para `1% a.m.` com `trimestral`, o sistema continua acumulando os 3 meses e pagando no mes seguinte ao fechamento do trimestre.
- No frontend, investimentos trimestrais devem exibir apenas os meses em que ha pagamento efetivo.

## Convencao de arredondamento
- Internamente: manter precisao de ponto flutuante durante o calculo do mes.
- Exibicao e persistencia monetaria: arredondar para 2 casas decimais (centavos, half-up).
- Exibicao de taxa percentual: arredondar para 4 casas quando necessario para auditoria e 2 casas na UI.

## Estrutura de saida mensal (registro calculado)
| Campo | Tipo | Descricao |
| --- | --- | --- |
| `mes` | string | `YYYY-MM` |
| `cdi_percent` | numero | CDI do mes de entrada |
| `taxa_aplicada_percent` | numero | Taxa efetiva usada no mes |
| `accrued_dividend_brl` | numero | Rendimento apurado no mes, independentemente da data de pagamento |
| `dividendo_brl` | numero | Dividendo do mes |
| `acumulado_brl` | numero | Soma de dividendos ate o mes |
| `total_projetado_brl` | numero | `principal + acumulado_brl` |

## Casos de borda
- Serie CDI vazia: retornar lista vazia de resultados.
- Meses fora de ordem: ordenar antes de calcular.
- Mes duplicado: erro de validacao, nao calcular.
- `principal <= 0`: erro de validacao.
- `cdi_percent` negativo: permitido; taxa aplicada pode reduzir o dividendo (ainda respeitando formula oficial).
