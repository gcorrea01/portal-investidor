CREATE TABLE IF NOT EXISTS investors (
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  total_investido REAL NOT NULL CHECK (total_investido > 0),
  tipo_rendimento TEXT NOT NULL CHECK (
    tipo_rendimento = '1% a.m.'
    OR tipo_rendimento LIKE 'CDI+%'
    OR tipo_rendimento LIKE 'IPCA+%'
  ),
  inicio_rendimento TEXT NOT NULL,
  fim_rendimento TEXT,
  periodicidade_pagamento TEXT NOT NULL CHECK (periodicidade_pagamento IN ('mensal', 'trimestral')),
  assessor TEXT,
  master TEXT
);

CREATE INDEX IF NOT EXISTS idx_investors_email ON investors (email);
CREATE INDEX IF NOT EXISTS idx_investors_assessor ON investors (assessor);
CREATE INDEX IF NOT EXISTS idx_investors_master ON investors (master);
