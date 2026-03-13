# Backend API - Investidores

## Objetivo
Expor um backend minimo para consultar investidores a partir do banco, sem ler `data/investidores.csv` no frontend.

## Banco esperado
- Caminho padrao: `./data/investidores.sqlite`
- Tabela padrao: `investors`

Colunas esperadas:
- `email`
- `nome`
- `total_investido`
- `tipo_rendimento`
- `inicio_rendimento`
- `periodicidade_pagamento`
- `assessor`
- `master`

## Como rodar
```bash
npm run serve:api
```

Variaveis opcionais:
- `PORT`: porta do servidor. Padrao `3001`.
- `HOST`: host do servidor. Padrao `127.0.0.1`.
- `INVESTOR_DB_PATH`: caminho do arquivo SQLite. Padrao `./data/investidores.sqlite`.
- `INVESTOR_DB_TABLE`: nome da tabela. Padrao `investors`.

## Endpoints

### `GET /api/health`
Retorna status basico do servico.

Exemplo de resposta:
```json
{
  "ok": true,
  "service": "investor-api"
}
```

### `GET /api/viewer?email=<email>`
Retorna o escopo visivel para o email informado, preservando a regra atual:
- `investor`: linhas do proprio email
- `assessor`: linhas onde o email e assessor, somadas as proprias
- `master`: todas as linhas

Exemplo de resposta:
```json
{
  "queryEmail": "assessor@empresa.com",
  "role": "assessor",
  "count": 2,
  "investors": [
    {
      "id": "inv-12",
      "email": "cliente@empresa.com",
      "name": "Cliente Exemplo",
      "invested": 50000,
      "rule": "CDI+5",
      "startMonth": "2025-08",
      "startDate": "2025-08-01",
      "paymentFrequency": "mensal",
      "advisorEmail": "assessor@empresa.com",
      "masterEmail": "master@empresa.com"
    }
  ]
}
```

## Respostas de erro
- `400` quando `email` nao for informado
- `404` quando nao houver registro para o email consultado
- `404` para endpoint inexistente
- `500` quando o banco estiver indisponivel ou mal configurado

## Observacoes
- O backend devolve apenas os campos necessarios para reproduzir a logica atual do portal.
- Ainda nao existe autenticacao forte; o acesso continua baseado em email.
