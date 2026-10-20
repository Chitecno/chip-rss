import DOMPurify from 'dompurify';
import { resolveUrl } from '../feeds/parse';

/**
 * Limpia el HTML de una nota antes de mostrarlo: fuera scripts, estilos, formularios,
 * iframes y todo lo que no sea texto, imágenes y links.
 */
export function sanitizeArticle(html: string, baseUrl: string): DocumentFragment {
  const clean = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'video', 'audio', 'svg', 'math', 'noscript'],
    FORBID_ATTR: ['style', 'class', 'id', 'width', 'height', 'srcset', 'sizes'],
  });

  // Arreglamos links e imágenes en un documento inerte, antes de que nada se cargue.
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  for (const a of Array.from(doc.querySelectorAll('a'))) {
    const href = resolveUrl(a.getAttribute('href') ?? '', baseUrl);
    if (!href) {
      a.removeAttribute('href');
      continue;
    }
    a.setAttribute('href', href);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
  const seen = new Set<string>();
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = resolveUrl(img.getAttribute('src') ?? '', baseUrl);
    // Logos, íconos, píxeles de seguimiento y fotos repetidas afuera.
    if (!src || seen.has(src) || /logo|icon|avatar|sprite|pixel|badge/i.test(src)) {
      img.remove();
      continue;
    }
    seen.add(src);
    img.setAttribute('src', src);
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.setAttribute('referrerpolicy', 'no-referrer');
    if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
  }

  // Links y listas que quedaron vacíos (eran íconos de compartir, por ejemplo).
  for (const node of Array.from(doc.querySelectorAll('a, li, ul, ol, figure, p')).reverse()) {
    if (!node.textContent?.trim() && !node.querySelector('img')) node.remove();
  }

  const fragment = document.createDocumentFragment();
  for (const node of Array.from(doc.body.childNodes)) fragment.append(document.importNode(node, true));
  return fragment;
}

export function textLength(html: string): number {
  return (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').trim().length;
}
