/** Lee feeds RSS 2.0, RSS 1.0 (RDF) y Atom con el DOMParser del navegador. */

export type ParsedItem = {
  guid: string;
  title: string;
  link: string;
  summary: string;
  /** HTML completo si el feed lo trae (content:encoded, <content> de Atom, descripción de YouTube). */
  content?: string;
  image?: string;
  published: number;
};

export type ParsedFeed = {
  title: string;
  siteUrl: string;
  items: ParsedItem[];
};

const SUMMARY_MAX = 280;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;

/** Resuelve un link relativo; devuelve '' si no es http/https (nada de javascript: ni data:). */
export function resolveUrl(href: string, base: string): string {
  try {
    const url = new URL(href.trim(), base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

// Comparamos por nombre local para no depender de los prefijos (media:, content:, dc:).
function kids(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === name);
}

function kid(el: Element, name: string): Element | undefined {
  return kids(el, name)[0];
}

function text(el: Element | undefined): string {
  return el?.textContent?.trim() ?? '';
}

function htmlToText(html: string): string {
  if (!/[<&]/.test(html)) return html.replace(/\s+/g, ' ').trim();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function firstImage(html: string, base: string): string {
  if (!html.includes('<img')) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const src = doc.querySelector('img[src]')?.getAttribute('src');
  return src ? resolveUrl(src, base) : '';
}

/** Texto plano (como la descripción de un video) a párrafos HTML. */
function textToHtml(s: string): string {
  const escaped = s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  return escaped
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function truncate(s: string): string {
  return s.length > SUMMARY_MAX ? `${s.slice(0, SUMMARY_MAX - 1).trimEnd()}…` : s;
}

function parseDate(s: string): number {
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

/** media:content y media:thumbnail, también dentro de media:group (así vienen los de YouTube). */
function mediaImage(el: Element, base: string): string {
  for (const scope of [el, ...kids(el, 'group')]) {
    for (const c of kids(scope, 'content')) {
      const url = c.getAttribute('url');
      if (!url) continue;
      const type = c.getAttribute('type') ?? '';
      const medium = c.getAttribute('medium') ?? '';
      if (medium === 'image' || type.startsWith('image/') || (!medium && !type && IMAGE_EXT.test(url))) {
        return resolveUrl(url, base);
      }
    }
    const thumb = kid(scope, 'thumbnail')?.getAttribute('url');
    if (thumb) return resolveUrl(thumb, base);
  }
  return '';
}

function rssLink(el: Element, base: string): string {
  // En RSS 2.0 puede haber un <atom:link> vacío al lado del <link> de verdad.
  const link = kids(el, 'link').find((l) => text(l));
  return link ? resolveUrl(text(link), base) : '';
}

function rssItem(item: Element, base: string): ParsedItem {
  const link = rssLink(item, base);
  const ref = link || base;
  const encoded = text(kid(item, 'encoded'));
  const description = text(kid(item, 'description'));
  const enclosure = kids(item, 'enclosure')
    .find((e) => (e.getAttribute('type') ?? '').startsWith('image/') || IMAGE_EXT.test(e.getAttribute('url') ?? ''))
    ?.getAttribute('url');
  const image =
    (enclosure && resolveUrl(enclosure, ref)) || mediaImage(item, ref) || firstImage(encoded || description, ref);
  const title = htmlToText(text(kid(item, 'title')));
  return {
    guid: text(kid(item, 'guid')) || link || title,
    title: title || '(sin título)',
    link,
    summary: truncate(htmlToText(description || encoded)),
    content: encoded || description || undefined,
    image: image || undefined,
    published: parseDate(text(kid(item, 'pubDate')) || text(kid(item, 'date'))),
  };
}

function atomLink(el: Element, base: string): string {
  const links = kids(el, 'link');
  const alt = links.find((l) => (l.getAttribute('rel') ?? 'alternate') === 'alternate') ?? links[0];
  const href = alt?.getAttribute('href');
  return href ? resolveUrl(href, base) : '';
}

function atomEntry(entry: Element, base: string): ParsedItem {
  const link = atomLink(entry, base);
  const ref = link || base;
  const content = text(kid(entry, 'content'));
  // YouTube trae la descripción del video como texto plano dentro de media:group.
  const mediaDescription = text(kid(kid(entry, 'group') ?? entry, 'description'));
  const summary = text(kid(entry, 'summary')) || mediaDescription;
  const enclosure = kids(entry, 'link')
    .find((l) => l.getAttribute('rel') === 'enclosure' && (l.getAttribute('type') ?? '').startsWith('image/'))
    ?.getAttribute('href');
  const image = (enclosure && resolveUrl(enclosure, ref)) || mediaImage(entry, ref) || firstImage(content || summary, ref);
  const title = htmlToText(text(kid(entry, 'title')));
  return {
    guid: text(kid(entry, 'id')) || link || title,
    title: title || '(sin título)',
    link,
    summary: truncate(htmlToText(summary || content)),
    content: content || (mediaDescription ? textToHtml(mediaDescription) : '') || summary || undefined,
    image: image || undefined,
    published: parseDate(text(kid(entry, 'published')) || text(kid(entry, 'updated'))),
  };
}

function parseXml(xml: string): Document | null {
  const parser = new DOMParser();
  let doc = parser.parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length === 0) return doc;
  // Muchos feeds traen &nbsp; o & sueltos, que en XML son errores. Probamos una vez arreglándolos.
  const fixed = xml
    .replace(/&nbsp;/g, '&#160;')
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, '&amp;');
  doc = parser.parseFromString(fixed, 'application/xml');
  return doc.getElementsByTagName('parsererror').length === 0 ? doc : null;
}

/** Devuelve null si el texto no es un feed. */
export function parseFeed(xml: string, feedUrl: string): ParsedFeed | null {
  if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(xml.slice(0, 4096))) return null;
  const doc = parseXml(xml);
  if (!doc) return null;
  const root = doc.documentElement;
  const fallbackTitle = new URL(feedUrl).hostname.replace(/^www\./, '');

  if (root.localName === 'feed') {
    const siteUrl = atomLink(root, feedUrl) || feedUrl;
    return {
      title: htmlToText(text(kid(root, 'title'))) || fallbackTitle,
      siteUrl,
      items: kids(root, 'entry').map((e) => atomEntry(e, siteUrl)),
    };
  }

  if (root.localName === 'rss' || root.localName === 'RDF') {
    const channel = kid(root, 'channel');
    if (!channel) return null;
    const siteUrl = rssLink(channel, feedUrl) || feedUrl;
    // En RSS 1.0 los <item> están al lado del <channel>, no adentro.
    const parent = root.localName === 'RDF' ? root : channel;
    return {
      title: htmlToText(text(kid(channel, 'title'))) || fallbackTitle,
      siteUrl,
      items: kids(parent, 'item').map((i) => rssItem(i, siteUrl)),
    };
  }

  return null;
}
