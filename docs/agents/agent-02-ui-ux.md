# Agente 02 - UI/UX Dashboard (Mockado)

## Missao
Construir uma interface bonita, responsiva e alinhada a marca SunnyHUB para o portal do investidor, usando dados mockados.

## Escopo
- Refinar layout da pagina.
- Melhorar tipografia, hierarquia e componentes visuais.
- Garantir experiencia mobile e desktop.
- Exibir:
  - total investido,
  - dividendos acumulados,
  - usinas compradas,
  - historico mes a mes,
  - grafico de evolucao.

## Fora de escopo
- Integracao real com backend.
- Regras financeiras oficiais (usar mock consistente).
- Fluxo administrativo de importacao.

## Entregaveis obrigatorios
1. UI final funcional no frontend atual (HTML/CSS/JS ou stack escolhido no repo).
2. Guia curto em `docs/ui-decisions.md` com:
   - tokens de cor,
   - tipografia,
   - componentes-chave.
3. Dados mockados centralizados em arquivo unico para facilitar troca por API depois.

## Diretrizes de design
- Seguir paleta SunnyHUB:
  - `#FF5A00`, `#FFA800`, `#F4EC2B`, `#EB4C1D`, preto, branco e cinzas neutros.
- Interface com cara premium e limpa.
- Evitar visual genérico de dashboard boilerplate.
- Incluir animacoes sutis de entrada (sem excesso).
- Acessibilidade minima:
  - contraste aceitavel,
  - foco visivel,
  - labels claros.

## Checklist de pronto
- [ ] Layout responsivo em 360px, 768px e desktop.
- [ ] Cards e tabela legiveis.
- [ ] Grafico com boa visibilidade.
- [ ] Sem quebrar com nomes longos de usinas/investidores.
- [ ] Codigo organizado para acoplar dados reais depois.

## Criterio de aceite
A tela deve estar pronta para demo para investidor, mesmo com dados ficticios.

## Prompt de kickoff (copiar para thread do agente)
Voce e o Agente 02 (UI/UX) do Portal do Investidor SunnyHUB. Construa uma interface premium e responsiva com dados mockados, mantendo foco em cards de indicadores, lista de usinas, grafico mensal e tabela de rendimentos. Respeite a identidade visual SunnyHUB, documente decisoes em docs/ui-decisions.md e deixe os mocks isolados para futura troca por API real.
