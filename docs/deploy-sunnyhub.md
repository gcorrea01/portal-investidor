# Deploy - Portal do Investidor em sunnyhub.com.br

## Objetivo
Publicar o portal em `https://sunnyhub.com.br/investidor/` usando hosting estatico.

## Artefato de deploy
Gerar build local:

```bash
npm run build
```

Pasta gerada: `dist/`

Estrutura minima esperada:
- `dist/index.html`
- `dist/styles.css`
- `dist/app.js`
- `dist/data/investidores.csv`
- `dist/data/cdi.csv`
- `dist/src/business.mjs`

## Publicacao
1. Copiar o conteudo de `dist/` para o diretorio servido em `/investidor/`.
2. Garantir que os arquivos CSV estejam publicos dentro de `/investidor/data/`.
3. Validar acesso HTTPS:
   - `https://sunnyhub.com.br/investidor/`
   - `https://sunnyhub.com.br/investidor/data/investidores.csv`
   - `https://sunnyhub.com.br/investidor/data/cdi.csv`

## Exemplo Nginx
```nginx
location /investidor/ {
    alias /var/www/sunnyhub/investidor/;
    index index.html;
    try_files $uri $uri/ =404;
}
```

## Exemplo Apache
```apache
Alias /investidor/ "/var/www/sunnyhub/investidor/"
<Directory "/var/www/sunnyhub/investidor/">
    Options Indexes FollowSymLinks
    AllowOverride None
    Require all granted
</Directory>
```

## Checklist de validacao pos-deploy
1. Tela carrega sem erro de console.
2. Login funciona com emails existentes em `investidores.csv`.
3. Cards e tabela de historico aparecem com valores.
4. Logout funciona e retorna para tela inicial.
5. Testar em desktop e mobile.

## Processo de atualizacao de dados
1. Atualizar `data/investidores.csv` e/ou `data/cdi.csv`.
2. Rodar `npm run test`.
3. Rodar `npm run build`.
4. Publicar novamente o conteudo de `dist/`.

## Rollback
Manter a versao anterior de `dist/` no servidor. Em caso de incidente:
1. Restaurar pasta anterior.
2. Limpar cache de CDN/proxy (se houver).
3. Revalidar URL `/investidor/`.

## Seguranca
Atualmente os CSVs ficam acessiveis para qualquer usuario que tenha acesso ao endpoint `/investidor/`.
Se os dados forem sensiveis, proteger a rota em camada de servidor (SSO, auth corporativa, VPN ou restricao IP).
