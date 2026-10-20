/**
 * Proxy mínimo para desarrollo: el navegador no deja que la app lea feeds de otros sitios
 * (CORS), así que el servidor local los pide por ella. En producción esto lo hace un
 * Cloudflare Worker con las mismas reglas.
 *
 * Reglas para que no sea un proxy abierto: solo GET, solo http/https, nada de direcciones
 * internas (tampoco después de una redirección), hasta 5 MB y 10 segundos.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = 'chip-rss/0.0.1 (+https://chiptecno.ar)';
const ACCEPT =
  'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5';

class ProxyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
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
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

async function assertPublic(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ProxyError(400, 'solo se pueden leer direcciones http o https');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: string[];
  try {
    addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  } catch {
    throw new ProxyError(502, 'no encontré ese sitio');
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new ProxyError(403, 'esa dirección no está permitida');
  }
}

async function readLimited(res: Response): Promise<Buffer> {
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
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
  return Buffer.concat(chunks);
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'GET') throw new ProxyError(405, 'solo se aceptan lecturas');
    const target = new URL(req.url ?? '', 'http://localhost').searchParams.get('url');
    if (!target) throw new ProxyError(400, 'falta la dirección a leer');

    let url: URL;
    try {
      url = new URL(target);
    } catch {
      throw new ProxyError(400, 'esa dirección no es válida');
    }

    let upstream: Response | undefined;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublic(url);
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

    res.statusCode = upstream.status;
    res.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/octet-stream');
    // La app necesita la dirección final (después de redirecciones) para resolver links relativos.
    res.setHeader('x-final-url', url.href);
    res.setHeader('access-control-expose-headers', 'x-final-url');
    res.setHeader('cache-control', 'no-store');
    res.end(body);
  } catch (err) {
    res.statusCode = err instanceof ProxyError ? err.status : 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(err instanceof ProxyError ? err.message : 'no se pudo leer el sitio');
  }
}

export function feedProxy(req: IncomingMessage, res: ServerResponse): void {
  void handle(req, res);
}
