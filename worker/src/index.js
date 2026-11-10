/**
 * Proxy de chip-rss para publicar la app: un Cloudflare Worker.
 *
 * Los navegadores no dejan que una página lea contenido de otros sitios, así que la app le pide
 * los feeds a este intermediario, que va a buscarlos y se los devuelve. No guarda nada.
 *
 * Reglas para que no sea un proxy abierto:
 * - solo atiende pedidos que vienen de la app (por su dirección de origen);
 * - solo lecturas, solo http/https y nada de direcciones internas, tampoco después de una redirección;
 * - lee hasta 5 MB y espera hasta 10 segundos.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = 'chip-rss/0.1 (+https://chiptecno.ar)';
const ACCEPT =
  'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5';

// Desde dónde puede usarse: la app publicada y la app corriendo en la compu.
const ALLOWED_ORIGINS = new Set([
  'https://chitecno.github.io',
  'https://chiptecno.ar',
  'http://localhost:5173',
  'http://localhost:4173',
]);

function allowedOrigin(origin) {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (ALLOWED_ORIGINS.has(url.origin)) return url.origin;
    if (url.protocol === 'https:' && url.hostname.endsWith('.chiptecno.ar')) return url.origin;
  } catch {
    // origen inválido
  }
  return null;
}

class ProxyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isPrivateHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || /\.(localhost|local|internal|lan|home)$/.test(host)) return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (host.includes(':')) {
    if (host.startsWith('::ffff:')) return isPrivateHost(host.slice(7));
    return host === '::' || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80');
  }
  return false;
}

function checkUrl(url) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ProxyError(400, 'solo se pueden leer direcciones http o https');
  }
  if (isPrivateHost(url.hostname)) throw new ProxyError(403, 'esa dirección no está permitida');
}

async function readLimited(response) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new ProxyError(413, 'el archivo es demasiado grande');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function textResponse(status, message, headers) {
  return new Response(message, { status, headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' } });
}

export default {
  async fetch(request) {
    const origin = allowedOrigin(request.headers.get('Origin'));
    const cors = origin
      ? { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-expose-headers': 'x-final-url' }
      : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: origin ? 204 : 403,
        headers: { ...cors, 'access-control-allow-methods': 'GET', 'access-control-max-age': '86400' },
      });
    }
    if (!origin) return textResponse(403, 'este intermediario es solo para la app chip-rss', cors);

    try {
      if (request.method !== 'GET') throw new ProxyError(405, 'solo se aceptan lecturas');
      const target = new URL(request.url).searchParams.get('url');
      if (!target) throw new ProxyError(400, 'falta la dirección a leer');

      let url;
      try {
        url = new URL(target);
      } catch {
        throw new ProxyError(400, 'esa dirección no es válida');
      }

      let upstream;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        checkUrl(url);
        try {
          upstream = await fetch(url, {
            redirect: 'manual',
            headers: { 'user-agent': USER_AGENT, accept: ACCEPT },
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
        } catch {
          throw new ProxyError(504, 'el sitio no respondió');
        }
        const location = upstream.headers.get('location');
        if (upstream.status >= 300 && upstream.status < 400 && location) {
          url = new URL(location, url);
          upstream = undefined;
          continue;
        }
        break;
      }
      if (!upstream) throw new ProxyError(508, 'demasiadas redirecciones');

      if (Number(upstream.headers.get('content-length') ?? 0) > MAX_BYTES) {
        throw new ProxyError(413, 'el archivo es demasiado grande');
      }
      const body = await readLimited(upstream);

      return new Response(body, {
        status: upstream.status,
        headers: {
          ...cors,
          'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
          // La app necesita la dirección final (después de redirecciones) para resolver links relativos.
          'x-final-url': url.href,
          'cache-control': 'public, max-age=300',
        },
      });
    } catch (err) {
      const status = err instanceof ProxyError ? err.status : 502;
      return textResponse(status, err instanceof ProxyError ? err.message : 'no se pudo leer el sitio', cors);
    }
  },
};
