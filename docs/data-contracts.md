# Contratos de Dados - Portal do Investidor SunnyHUB

## Objetivo
Definir contratos fechados para ingestao de dados via CSV no portal.

## Convencoes gerais
- Codificacao: UTF-8.
- Separador de colunas: virgula `,`.
- Cabecalho obrigatorio na primeira linha.
- Valores textuais com virgula interna devem usar aspas duplas.
- Mes no formato `YYYY-MM`.
- Valores monetarios em BRL com ponto como separador decimal (ex.: `150000.50`).
- Percentuais em decimal percentual (ex.: `0.87` significa `0,87%`).
- Em campos com multiplos itens, usar separador oficial `|`.

## CSV 1: Investidores

### Nome sugerido
`investidores.csv`

### Colunas obrigatorias
| Coluna | Tipo | Regra |
| --- | --- | --- |
| `email` | string | Obrigatorio, formato de e-mail valido, comparacao case-insensitive, unico no arquivo. |
| `nome` | string | Obrigatorio, tamanho minimo 2 caracteres apos trim. |
| `total_investido` | numero | Obrigatorio, decimal em BRL, maior que 0. |
| `tipo_rendimento` | string | Obrigatorio, apenas: `CDI+3`, `CDI+5`, `1% a.m.` (aceita variacoes e normaliza). |
| `usinas` | string | Obrigatorio (pode vazio), lista separada por `|` sem itens vazios intermediarios. |

### Colunas opcionais
Nenhuma. Colunas extras devem gerar erro de contrato para evitar ambiguidade.

### Regras de normalizacao
- `email`: aplicar `trim` + `lowercase` antes de validar unicidade.
- `nome`: aplicar `trim` e colapsar espacos duplicados internos.
- `tipo_rendimento`: aplicar `trim`; mapear variacoes abaixo para canonical:
  - entradas contendo `cdi` e `+3` -> `CDI+3`
  - entradas contendo `cdi` e `+5` -> `CDI+5`
  - entradas contendo `1%`, `1.0`, `1,0` e `a.m` -> `1% a.m.`
- `usinas`: aplicar `trim`, dividir por `|`, remover espacos laterais por item, remover itens vazios nas pontas. Itens vazios no meio (ex.: `UFV A||UFV B`) devem gerar erro.

### Exemplo valido
```csv
email,nome,total_investido,tipo_rendimento,usinas
ana@sunnyhub.com,Ana Duarte,150000.00,CDI+3,UFV Sol Nascente I|UFV Horizonte
bruno@sunnyhub.com,Bruno Siqueira,90000.00,CDI+5,UFV Aurora
carla@sunnyhub.com,Carla Menezes,65000.00,1% a.m.,UFV Horizonte|UFV Vale Verde
```

### Exemplos invalidos
```csv
email,nome,total_investido,tipo_rendimento,usinas
ana@sunnyhub.com,Ana Duarte,150000.00,CDI+3,UFV A
ANA@sunnyhub.com,Ana D.,120000.00,CDI+5,UFV B
```
Erro: email duplicado apos normalizacao (`ana@sunnyhub.com`).

```csv
email,nome,total_investido,tipo_rendimento,usinas
joao@sunnyhub.com,Joao,0,CDI+3,UFV A
```
Erro: `total_investido` deve ser maior que zero.

```csv
email,nome,total_investido,tipo_rendimento,usinas
maria@sunnyhub.com,Maria,100000.00,CDI+7,UFV A
```
Erro: `tipo_rendimento` invalido.

## CSV 2: CDI mensal

### Nome sugerido
`cdi.csv`

### Colunas obrigatorias
| Coluna | Tipo | Regra |
| --- | --- | --- |
| `mes` | string | Obrigatorio, formato `YYYY-MM`, unico no arquivo. |
| `cdi_percent` | numero | Obrigatorio, percentual mensal em decimal percentual. |

### Colunas opcionais
Nenhuma. Colunas extras devem gerar erro de contrato.

### Regras de normalizacao
- `mes`: aplicar `trim` e validar regex `^\\d{4}-(0[1-9]|1[0-2])$`.
- `cdi_percent`: aplicar `trim`, converter para numero decimal percentual com ponto decimal.
- Ordenacao final recomendada: crescente por `mes`.

### Exemplo valido
```csv
mes,cdi_percent
2025-09,0.86
2025-10,0.88
2025-11,0.90
2025-12,0.89
2026-01,0.87
```

### Exemplos invalidos
```csv
mes,cdi_percent
2025/09,0.86
```
Erro: formato de `mes` invalido.

```csv
mes,cdi_percent
2025-09,abc
```
Erro: `cdi_percent` nao numerico.

```csv
mes,cdi_percent
2025-09,0.86
2025-09,0.88
```
Erro: mes duplicado.

## Matriz de erros obrigatoria
| Codigo | Cenario |
| --- | --- |
| `MISSING_COLUMN` | Coluna obrigatoria ausente em qualquer CSV. |
| `UNEXPECTED_COLUMN` | Coluna extra fora do contrato. |
| `INVALID_EMAIL` | E-mail invalido. |
| `DUPLICATE_EMAIL` | E-mail duplicado apos normalizacao. |
| `INVALID_MONTH` | Mes fora de `YYYY-MM`. |
| `DUPLICATE_MONTH` | Mes repetido no CSV de CDI. |
| `INVALID_NUMBER` | Numero invalido em campos numericos. |
| `INVALID_RULE` | Tipo de rendimento fora das regras aceitas. |
| `INVALID_PLANTS_FIELD` | Campo `usinas` com separacao invalida. |
| `EMPTY_FILE` | CSV sem linhas de dados. |
