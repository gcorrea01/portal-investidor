# UI Decisions - Portal do Investidor SunnyHUB

## Tokens de cor
- `--orange: #FF5A00` (acao primaria, destaques)
- `--amber: #FFA800` (gradientes de acao)
- `--yellow: #F4EC2B` (acento de fundo)
- `--burnt: #EB4C1D` (apoio para bordas/chips)
- `--ink: #121212` (texto principal)
- `--paper: #FFFFFF` (superficie)
- `--fog: #F4F4F4` (apoio neutro)
- `--line: #ECECEC` (divisorias)

## Tipografia
- Titulos: `Space Grotesk` (peso 500-700).
- Interface e conteudo: `Outfit` (peso 400-800).
- Objetivo: contraste entre identidade premium (titulos) e leitura confortavel (corpo).

## Componentes-chave
- Topbar com marca, hierarquia de titulo e CTA secundario (`Sair`).
- Meta pills no cabecalho do dashboard (quantidade de usinas e periodo analisado).
- Cards KPI com destaque de valor financeiro e leitura rapida.
- Subpainel de usinas com lista resiliente para nomes longos.
- Subpainel de grafico de dividendos em canvas com linha e area em gradiente SunnyHUB, eixo monetario e destaque de pico.
- Tabela de rendimento mensal com colunas de CDI, taxa aplicada, dividendo e acumulado.
- Estado de status global para feedback de erro/sucesso.

## Decisoes de UX e responsividade
- Layout fluido com `grid` e colapso para coluna unica em telas menores.
- Foco visivel em botoes e campos com `outline` de alto contraste.
- Animacao curta de entrada (`rise`) e hover sutil em botoes para reforcar percepcao de qualidade.
- Quebra de palavras habilitada para usinas/valores/textos longos sem romper o layout.
- Cabecalho de tabela fixo durante rolagem e estados visuais de hover/linha alternada para leitura financeira.
