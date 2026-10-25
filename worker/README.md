# Proxy de chip-rss (Cloudflare Worker)

Los navegadores no dejan que una página lea contenido de otros sitios. Por eso la app publicada le pide los feeds a este intermediario, que va a buscarlos y se los devuelve. **No guarda nada.**

Reglas para que no lo use cualquiera:
- solo atiende pedidos que vienen de la app, por su dirección de origen;
- solo hace lecturas, solo de direcciones públicas de internet;
- lee hasta 5 MB y espera hasta 10 segundos.

Mientras se usa la app en la compu, este trabajo lo hace el proxy local (`dev/feed-proxy.ts`). Este es el mismo proxy, para cuando la app está publicada.

## Publicarlo (una sola vez)

Necesitás una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/sign-up).

1. En PowerShell, entrá a la carpeta del proxy:
   ```
   cd $HOME\Documents\chip-rss\worker
   ```
2. Iniciá sesión en Cloudflare. Se abre el navegador para que autorices:
   ```
   npx.cmd wrangler login
   ```
3. Publicá el proxy:
   ```
   npx.cmd wrangler deploy
   ```
   Al terminar muestra su dirección, algo como `https://chip-rss-proxy.TU-NOMBRE.workers.dev`.
4. Guardá esa dirección en GitHub, para que la app publicada sepa dónde está el proxy: **Settings → Secrets and variables → Actions → Variables → New repository variable**, con el nombre `PROXY_URL` y la dirección como valor.

## Cambiar desde dónde se puede usar

Las direcciones permitidas están al principio de `src/index.js`, en `ALLOWED_ORIGINS`. Si la app se publica en otra dirección, hay que sumarla ahí y volver a correr `npx.cmd wrangler deploy`.
