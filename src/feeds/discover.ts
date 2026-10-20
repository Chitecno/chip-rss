import { FetchError, fetchText } from './proxy';
import { parseFeed, resolveUrl, type ParsedFeed } from './parse';

// La última es la de Arc, el sistema que usan varios medios grandes (Página/12, entre otros).
const COMMON_PATHS = ['/feed', '/rss', '/rss.xml', '/feed.xml', '/atom.xml', '/index.xml', '/arc/outboundfeeds/rss/'];
const MAX_LINKED = 6;
const FEED_TYPES = /(rss|atom)\+xml|application\/xml|text\/xml/i;

export type Discovered = { feedUrl: string; feed: ParsedFeed };

function normalizeInput(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = resolveUrl(withScheme, 'https://invalid/');
  if (!url || !trimmed) throw new FetchError('esa dirección no es válida');
  return url;
}

async function tryFeed(url: string): Promise<Discovered | null> {
  try {
    const res = await fetchText(url);
    const feed = parseFeed(res.text, res.finalUrl);
    return feed ? { feedUrl: res.finalUrl, feed } : null;
  } catch {
    return null;
  }
}

/**
 * Autodescubrimiento: si la dirección ya es un feed, listo. Si es la página de un medio,
 * busca el <link rel="alternate"> que anuncia su feed y, si no hay, prueba las rutas de siempre.
 */
export async function discoverFeed(raw: string, onStep?: (msg: string) => void): Promise<Discovered> {
  const url = normalizeInput(raw);
  onStep?.(`leyendo ${url}`);
  const page = await fetchText(url);

  const direct = parseFeed(page.text, page.finalUrl);
  if (direct) return { feedUrl: page.finalUrl, feed: direct };

  const doc = new DOMParser().parseFromString(page.text, 'text/html');
  const announced = Array.from(doc.querySelectorAll('link[rel~="alternate"][href]'))
    .filter((l) => FEED_TYPES.test(l.getAttribute('type') ?? ''))
    .map((l) => resolveUrl(l.getAttribute('href') ?? '', page.finalUrl))
    .filter(Boolean);

  const origin = new URL(page.finalUrl).origin;
  // Último recurso: enlaces del mismo sitio que digan rss, feed o atom.
  const linked = Array.from(doc.querySelectorAll('a[href]'))
    .map((a) => resolveUrl(a.getAttribute('href') ?? '', page.finalUrl))
    .filter((href) => href.startsWith(origin) && /rss|feed|atom/i.test(new URL(href).pathname))
    .slice(0, MAX_LINKED);
  // Si pegaste una sección (tn.com.ar/tecno), primero buscamos el feed de esa sección y no el del
  // sitio entero: el que anuncia la página suele ser el general.
  const section = new URL(page.finalUrl).pathname.split('/').filter(Boolean)[0];
  const sectionFeeds = section
    ? [
        `${origin}/arc/outboundfeeds/rss/category/${section}/?outputType=xml`,
        `${origin}/${section}/feed/`,
        `${origin}/category/${section}/feed/`,
      ]
    : [];
  const candidates = [...new Set([...sectionFeeds, ...announced, ...COMMON_PATHS.map((p) => origin + p), ...linked])];

  for (const candidate of candidates) {
    onStep?.(`probando ${candidate}`);
    const found = await tryFeed(candidate);
    if (found) return found;
  }
  throw new FetchError('no encontré un feed en esa dirección');
}
