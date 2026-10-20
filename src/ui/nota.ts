import { getArticle, getFeed, type Article } from '../db/db';
import { loadReadable } from '../reader/content';
import { sanitizeArticle } from '../reader/sanitize';
import { button, el, longDate } from './dom';
import './nota.css';

function hero(src: string): HTMLImageElement {
  const img = el('img', 'nota__hero');
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.decoding = 'async';
  img.src = src;
  return img;
}

function summaryOf(article: Article): HTMLElement {
  return el('p', undefined, article.summary || 'Esta nota no trae texto.');
}

/** La nota abierta dentro de la app. */
export function renderNota(id: string, goBack: () => void): HTMLElement {
  const view = el('article', 'nota');
  const back = button('[ < volver ]', 'term-button nota__back');
  back.addEventListener('click', goBack);
  view.append(back);
  void fill(view, id);
  return view;
}

async function fill(view: HTMLElement, id: string): Promise<void> {
  const article = await getArticle(id);
  if (!article) {
    view.append(el('p', 'band', 'No encontré esa nota. Puede que hayas quitado su fuente.'));
    return;
  }
  const feed = await getFeed(article.feedId);
  const isVideo = /youtube\.com|youtu\.be/i.test(article.link);

  const meta = el('p', 'nota__meta web-small', `${feed?.title ?? ''} · ${longDate.format(article.published)}`);
  const title = el('h1', 'nota__title', article.title);
  title.tabIndex = -1;
  const status = el('p', 'nota__status web-small', 'trayendo la nota completa…');
  status.setAttribute('role', 'status');
  const body = el('div', 'nota__body');
  view.append(meta, title, status, body);

  if (article.link) {
    const original = el('p', 'nota__original');
    const a = el('a', undefined, isVideo ? 'ver el video en YouTube ↗' : 'ver en el sitio original ↗');
    a.href = article.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    original.append(a);
    view.append(original);
  }
  title.focus({ preventScroll: true });

  try {
    const readable = await loadReadable(article);
    if (article.image && (isVideo || !readable)) body.append(hero(article.image));
    if (!readable) {
      body.append(summaryOf(article));
      if (isVideo) status.remove();
      else status.textContent = 'Esta fuente solo trae un resumen.';
      return;
    }
    const content = sanitizeArticle(readable.html, readable.baseUrl);
    if (article.image && !isVideo && !content.querySelector('img')) body.append(hero(article.image));
    body.append(content);
    for (const img of Array.from(body.querySelectorAll('img'))) {
      img.addEventListener('error', () => img.remove(), { once: true });
    }
    if (readable.from === 'sitio') status.textContent = 'traída del sitio · queda guardada para leerla sin conexión';
    else status.remove();
  } catch (err) {
    status.textContent = `No pude traer la nota completa (${err instanceof Error ? err.message : 'error'}).`;
    status.dataset.kind = 'error';
    if (article.image) body.append(hero(article.image));
    body.append(summaryOf(article));
  }
}
