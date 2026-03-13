# Deploy - Portal do Investidor em Subdominio

## Objetivo
Publicar o portal em `https://investidor.sunnyhub.com.br/` com frontend estatico e API de investidores sob a mesma origem.

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
- `dist/data/cdi.csv`
- `dist/data/igpm.csv`
- `dist/src/business.mjs`

## Publicacao
1. Criar/apontar DNS do subdominio `investidor.sunnyhub.com.br` para o servidor (A/AAAA ou CNAME).
2. Copiar o conteudo de `dist/` para o diretorio servido na raiz do subdominio.
3. Publicar a API de investidores no mesmo dominio, respondendo em `/api/health` e `/api/viewer`.
4. Garantir que os arquivos CSV de indices estejam publicos dentro de `/data/`.
5. Configurar certificado TLS para `investidor.sunnyhub.com.br`.
6. Validar acesso HTTPS:
   - `https://investidor.sunnyhub.com.br/`
   - `https://investidor.sunnyhub.com.br/api/health`
   - `https://investidor.sunnyhub.com.br/api/viewer?email=teste@empresa.com`
   - `https://investidor.sunnyhub.com.br/data/cdi.csv`
   - `https://investidor.sunnyhub.com.br/data/igpm.csv`

## Exemplo Nginx (subdominio)
```nginx
server {
    listen 443 ssl;
    server_name investidor.sunnyhub.com.br;

    root /var/www/sunnyhub/investidor;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

## Exemplo Apache (subdominio)
```apache
<VirtualHost *:443>
    ServerName investidor.sunnyhub.com.br
    DocumentRoot "/var/www/sunnyhub/investidor"

    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:3001/api/
    ProxyPassReverse /api/ http://127.0.0.1:3001/api/

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
2. Login funciona com emails existentes no backend de investidores.
3. Cards e tabela de historico aparecem com valores.
4. Logout funciona e retorna para tela inicial.
5. Testar em desktop e mobile.

## Processo de atualizacao de dados
1. Atualizar `data/investidores.csv` e rodar `npm run db:investors:reset` no host da API quando houver mudanca de investidores.
2. Atualizar o backend de investidores e/ou `data/cdi.csv` e `data/igpm.csv`.
3. Rodar `npm run test`.
4. Rodar `npm run build`.
5. Publicar novamente o conteudo de `dist/`.

## Rollback
Manter a versao anterior de `dist/` no servidor. Em caso de incidente:
1. Restaurar pasta anterior.
2. Limpar cache de CDN/proxy (se houver).
3. Revalidar URL `https://investidor.sunnyhub.com.br/`.

## Seguranca
CDI e IGP-M continuam publicos como CSV estatico, mas a API de investidores passa a ser a dependencia sensivel.
Se os dados forem sensiveis, proteger a rota backend em camada de servidor (SSO, auth corporativa, VPN ou restricao IP).
