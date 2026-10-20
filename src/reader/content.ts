import { Readability } from '@mozilla/readability';
import { saveArticle, type Article } from '../db/db';
import { fetchText } from '../feeds/proxy';
import { textLength } from './sanitize';
import { arcContent } from './arc';

// Si el feed trae menos texto que esto, es un resumen y conviene ir a buscar la nota.
const ENOUGH_TEXT = 600;
// Subirlo cuando mejora la limpieza: las notas guardadas con una versión vieja se vuelven a traer.
const READER_VERSION = 5;

// Títulos que marcan que la nota terminó y empieza lo que el sitio agrega abajo.
const TAIL = /^(temas en esta nota|últimas noticias|lo más (leído|visto)|más leídas|te puede interesar|también te puede interesar|seguí leyendo|leé también|notas relacionadas|noticias relacionadas|relacionad[ao]s|recomendad[ao]s)\b/i;

/** Corta la nota en el primer título de "lo que sigue" y borra todo lo de abajo. */
function trimTail(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const marker = Array.from(doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, strong, span')).find((n) =>
    TAIL.test(n.textContent?.trim() ?? ''),
  );
  if (!marker) return html;
  let node: Element | null = marker;
  while (node && node !== doc.body) {
    while (node.nextSibling) node.nextSibling.remove();
    const parent: Element | null = node.parentElement;
    if (node === marker) node.remove();
    node = parent;
  }
  return doc.body.innerHTML;
}

// Lo que nunca es parte de la nota: menús, pies, barras de compartir, newsletters, relacionadas.
const NOISE = [
  'header',
  'nav',
  'footer',
  'aside',
  'form',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[class*="share" i]',
  '[class*="social" i]',
  '[class*="related" i]',
  '[class*="newsletter" i]',
  '[class*="logo" i]',
  '[class*="breadcrumb" i]',
  '[aria-label*="breadcrumb" i]',
  '[id*="share" i]',
].join(',');

export type ReadableContent = { html: string; from: 'feed' | 'sitio'; baseUrl: string };

function isVideo(link: string): boolean {
  return /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(link);
}

/**
 * Devuelve la nota para leerla dentro de la app:
 * 1. la que ya trajimos del sitio (queda guardada, sirve sin conexión);
 * 2. la que trae el feed, si está completa;
 * 3. si no, va al sitio: si es de Arc lee sus datos, y si no saca el texto principal
 *    con Readability (lo mismo que usa Firefox para su modo lectura).
 */
export async function loadReadable(article: Article): Promise<ReadableContent | null> {
  const baseUrl = article.link || location.href;
  if (article.fullContent && article.fullContentVersion === READER_VERSION) {
    return { html: article.fullContent, from: 'sitio', baseUrl };
  }

  const fromFeed = article.content && textLength(article.content) >= ENOUGH_TEXT;
  if (fromFeed || !article.link || isVideo(article.link)) {
    return article.content ? { html: article.content, from: 'feed', baseUrl } : null;
  }

  const page = await fetchText(article.link);

  const arc = arcContent(page.text);
  if (arc && textLength(arc) >= 200) {
    await saveArticle({ ...article, fullContent: arc, fullContentVersion: READER_VERSION });
    return { html: arc, from: 'sitio', baseUrl: page.finalUrl };
  }

  const doc = new DOMParser().parseFromString(page.text, 'text/html');
  // Para que Readability resuelva bien los links e imágenes relativos.
  const base = doc.createElement('base');
  base.href = page.finalUrl;
  doc.head.prepend(base);
  for (const node of Array.from(doc.querySelectorAll(NOISE))) {
    // No borramos el contenedor principal aunque su clase diga "share" o similar.
    if (!node.matches('body, main, article')) node.remove();
  }

  const parsed = new Readability(doc).parse();
  if (!parsed?.content || textLength(parsed.content) < 200) {
    return article.content ? { html: article.content, from: 'feed', baseUrl } : null;
  }
  const html = trimTail(parsed.content);
  await saveArticle({ ...article, fullContent: html, fullContentVersion: READER_VERSION });
  return { html, from: 'sitio', baseUrl: page.finalUrl };
}
