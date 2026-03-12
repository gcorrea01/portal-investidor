# Deploy - Portal do Investidor em Subdominio

## Objetivo
Publicar o portal em `https://investidor.sunnyhub.com.br/` usando hosting estatico.

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
1. Criar/apontar DNS do subdominio `investidor.sunnyhub.com.br` para o servidor (A/AAAA ou CNAME).
2. Copiar o conteudo de `dist/` para o diretorio servido na raiz do subdominio.
3. Garantir que os arquivos CSV estejam publicos dentro de `/data/`.
4. Configurar certificado TLS para `investidor.sunnyhub.com.br`.
5. Validar acesso HTTPS:
   - `https://investidor.sunnyhub.com.br/`
   - `https://investidor.sunnyhub.com.br/data/investidores.csv`
   - `https://investidor.sunnyhub.com.br/data/cdi.csv`

## Exemplo Nginx (subdominio)
```nginx
server {
    listen 443 ssl;
    server_name investidor.sunnyhub.com.br;

    root /var/www/sunnyhub/investidor;
    index index.html;
    try_files $uri $uri/ =404;
}
```

## Exemplo Apache (subdominio)
```apache
<VirtualHost *:443>
    ServerName investidor.sunnyhub.com.br
    DocumentRoot "/var/www/sunnyhub/investidor"

    <Directory "/var/www/sunnyhub/investidor">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

## Redirect opcional do site principal
Se quiser manter a URL antiga como atalho:

- `https://sunnyhub.com.br/investidor/` -> `https://investidor.sunnyhub.com.br/`

Exemplo Nginx:
```nginx
location = /investidor/ {
    return 301 https://investidor.sunnyhub.com.br/;
}
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
3. Revalidar URL `https://investidor.sunnyhub.com.br/`.

## Seguranca
Atualmente os CSVs ficam acessiveis para qualquer usuario que tenha acesso ao endpoint do subdominio.
Se os dados forem sensiveis, proteger a rota em camada de servidor (SSO, auth corporativa, VPN ou restricao IP).
