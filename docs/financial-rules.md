# Regras Financeiras Oficiais - Portal do Investidor SunnyHUB

## Objetivo
Definir regras matematicas unicas para calculo mensal de dividendos.

## Entradas por investidor
- `principal`: valor de `total_investido` (BRL).
- `tipo_rendimento`: `CDI+3`, `CDI+5` ou `1% a.m.`.
- `periodicidade_pagamento`: `mensal` ou `trimestral`.
- Serie mensal de CDI: pares (`mes`, `cdi_percent`).

## Convencoes
- `cdi_percent` e taxas de saida sao percentuais mensais.
- Exemplo: `0.87` equivale a `0,87%` no mes.
- Calculo ocorre mes a mes em ordem crescente de `mes`.
- Dividendo mensal nao capitaliza o principal (juros simples sobre principal fixo).

## Conversao de spread anual para taxa mensal
Para regras `CDI+3` e `CDI+5`, converter spread anual para mensal por equivalencia composta:

`spread_mensal_percent = ((1 + spread_anual/100)^(1/12) - 1) * 100`

Onde:
- para `CDI+3`: `spread_anual = 3`
- para `CDI+5`: `spread_anual = 5`

Valores de referencia aproximados:
- `spread_mensal_3 ~= 0.246627%`
- `spread_mensal_5 ~= 0.407412%`

## Taxa aplicada por tipo
- `CDI+3`: `taxa_aplicada_percent = cdi_percent + spread_mensal_3`
- `CDI+5`: `taxa_aplicada_percent = cdi_percent + spread_mensal_5`
- `1% a.m.`: `taxa_aplicada_percent = 1.00`

## Calculo mensal
Para cada mes `m`:

1. `dividendo_m = principal * (taxa_aplicada_percent_m / 100)`
2. `acumulado_m = soma(dividendo_i) para todo i <= m`
3. `total_projetado_m = principal + acumulado_m`

## Regra de pagamento
- `mensal`: o valor calculado no mes e pago no proprio mes.
- `trimestral`: o valor calculado continua sendo apurado mes a mes, mas o pagamento ocorre apenas a cada 3 meses, contado a partir de `inicio_rendimento`.
- Em meses nao pagadores do investimento `trimestral`, o valor pago no mes e `0`, mas o valor fica carregado para o fechamento do trimestre.
- No mes de fechamento trimestral, o pagamento corresponde a soma dos 3 meses apurados desde o ultimo pagamento.
- Se o primeiro mes for parcial por conta de `inicio_rendimento` em `YYYY-MM-DD`, a proporcionalidade desse primeiro mes entra normalmente no primeiro fechamento trimestral.

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
