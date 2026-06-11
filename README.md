# Rastreio Online — PWA Wrapper

**Identidade:** Azul Royal `#1565C0` · Verde Limão `#8BC34A`  
**Alvo:** `http://www.brgps.com/#/login`

---

## Estrutura de Arquivos

```
rastreio-online-pwa/
├── index.html          ← App principal + Splash Screen
├── manifest.json       ← Configuração do PWA
├── sw.js               ← Service Worker (cache + instalabilidade)
├── generate-icons.js   ← Script para gerar ícones PNG
└── icons/              ← (criar depois com o script abaixo)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-180.png
    ├── icon-192.png    ← ícone principal Android
    └── icon-512.png    ← ícone splash Android / Play Store
```

---

## 1. Gerar os Ícones

### Usando sua imagem `image_1299af.png`:
```bash
npm install sharp
node generate-icons.js image_1299af.png
```

### Sem imagem (gera placeholder colorido):
```bash
node generate-icons.js
```

---

## 2. Testar Localmente

> ⚠️ Service Workers só funcionam em **localhost** ou **HTTPS**.  
> Para HTTP em IPs locais (ex: `192.168.x.x`), use a flag do Chrome abaixo.

### Opção A — `http-server` (mais simples):
```bash
npm install -g http-server
http-server . -p 8080 --cors
# Acesse: http://localhost:8080
```

### Opção B — `live-server`:
```bash
npm install -g live-server
live-server --port=8080
```

### Opção C — Python (se já tiver instalado):
```bash
python3 -m http.server 8080
# Acesse: http://localhost:8080
```

### Como testar o comportamento de instalação (Android):
1. Abra `http://localhost:8080` no Chrome do Android (via USB debugging)
2. Acesse `chrome://flags` → habilite **"Insecure origins treated as secure"**
3. Adicione `http://SEU-IP:8080` à lista
4. Volte ao app → um banner "Adicionar à tela inicial" deve aparecer

---

## 3. Resolver o Mixed Content (HTTP vs HTTPS)

Quando seu PWA estiver em produção com **HTTPS**, o iframe tentará carregar
`http://www.brgps.com` e será **bloqueado pelo navegador** (Mixed Content).

### Solução: Proxy Reverso com Nginx

Adicione isso no seu `nginx.conf` dentro do bloco `server { }` do seu domínio:

```nginx
location /proxy/ {
    proxy_pass          http://www.brgps.com/;
    proxy_set_header    Host www.brgps.com;
    proxy_set_header    X-Real-IP $remote_addr;
    proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_http_version  1.1;

    # Remove headers que bloqueiam exibição em iframe
    proxy_hide_header   X-Frame-Options;
    proxy_hide_header   Content-Security-Policy;

    # Reescreve referências internas do site
    sub_filter_once     off;
    sub_filter          'http://www.brgps.com' '';
    sub_filter          'href="/'             'href="/proxy/';
    sub_filter          'src="/'              'src="/proxy/';
}
```

Depois do deploy, o código já aponta automaticamente para `/proxy/` quando
detecta que está rodando em HTTPS.

### Alternativa: Cloudflare Worker (gratuito)

Se o seu domínio usar Cloudflare, siga as instruções detalhadas no arquivo `sw.js`.

---

## 4. Deploy em Produção

### Vercel:
```bash
npm install -g vercel
vercel --prod
```

### Netlify:
Arraste a pasta para `app.netlify.com/drop`

### VPS / cPanel:
Faça upload de todos os arquivos para a raiz do seu domínio via FTP.  
Certifique-se de que o SSL/HTTPS está ativo.

---

## 5. Checklist de Instalabilidade PWA

- [ ] Servido via **HTTPS** (ou localhost)
- [ ] `manifest.json` acessível em `/manifest.json`
- [ ] `sw.js` registrado e ativo (verificar em DevTools → Application → Service Workers)
- [ ] Pasta `icons/` com `icon-192.png` e `icon-512.png`
- [ ] `start_url` carregando corretamente
- [ ] `display: standalone` no manifest

**Verificar no Chrome DevTools:**  
`F12 → Application → Manifest` — deve mostrar todos os campos sem erros  
`F12 → Application → Service Workers` — deve mostrar "Activated and running"  
`F12 → Lighthouse → PWA` — rode o audit para checagem completa

---

## 6. Suporte a iOS (Safari / "Adicionar à Tela de Início")

O iOS não mostra banner automático. O usuário precisa:  
1. Abrir o Safari  
2. Tocar no botão **Compartilhar** (ícone de caixa com seta)  
3. Tocar em **"Adicionar à Tela de Início"**

As metas `apple-mobile-web-app-*` no `index.html` garantem que o app rode
em tela cheia no iPhone/iPad.

---

*Gerado para Rastreio Online · São Luís, MA*
