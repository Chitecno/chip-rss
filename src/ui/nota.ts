import { getArticle, getFeed, getSaved, listSections, removeSaved } from '../db/db';
import { loadReadable } from '../reader/content';
import { sanitizeArticle } from '../reader/sanitize';
import { button, el, longDate } from './dom';
import { loadSaveState, saveButton } from './guardar';
import './nota.css';

function hero(src: string): HTMLImageElement {
  const img = el('img', 'nota__hero');
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.decoding = 'async';
  img.src = src;
  return img;
}

function summaryOf(text: string): HTMLElement {
  return el('p', undefined, text || 'Esta nota no trae texto.');
}

function originalLink(link: string): HTMLElement {
  const isVideo = /youtube\.com|youtu\.be/i.test(link);
  const original = el('p', 'nota__original');
  const a = el('a', undefined, isVideo ? 'ver el video en YouTube ↗' : 'ver en el sitio original ↗');
  a.href = link;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  original.append(a);
  return original;
}

function topBar(goBack: () => void): HTMLElement {
  const bar = el('div', 'nota__bar');
  const back = button('[ < volver ]', 'term-button nota__back');
  back.addEventListener('click', goBack);
  bar.append(back);
  return bar;
}

/** La nota abierta dentro de la app. */
export function renderNota(id: string, goBack: () => void, onSavedChange: () => void): HTMLElement {
  const view = el('article', 'nota');
  const bar = topBar(goBack);
  view.append(bar);
  void fill(view, bar, id, onSavedChange);
  return view;
}

async function fill(view: HTMLElement, bar: HTMLElement, id: string, onSavedChange: () => void): Promise<void> {
  const article = await getArticle(id);
  if (!article) {
    view.append(el('p', 'band', 'No encontré esa nota. Puede que hayas quitado su fuente.'));
    return;
  }
  const feed = await getFeed(article.feedId);
  const isVideo = /youtube\.com|youtu\.be/i.test(article.link);
  bar.append(saveButton(article, feed?.title ?? '', await loadSaveState(onSavedChange)));

  const meta = el('p', 'nota__meta web-small', `${feed?.title ?? ''} · ${longDate.format(article.published)}`);
  const title = el('h1', 'nota__title', article.title);
  title.tabIndex = -1;
  const status = el('p', 'nota__status web-small', 'trayendo la nota completa…');
  status.setAttribute('role', 'status');
  const body = el('div', 'nota__body');
  view.append(meta, title, status, body);
  if (article.link) view.append(originalLink(article.link));
  title.focus({ preventScroll: true });

  try {
    const readable = await loadReadable(article);
    if (article.image && (isVideo || !readable)) body.append(hero(article.image));
    if (!readable) {
      body.append(summaryOf(article.summary));
      if (isVideo) status.remove();
      else status.textContent = 'Esta fuente solo trae un resumen.';
      return;
    }
    showContent(body, readable.html, readable.baseUrl, isVideo ? undefined : article.image);
    if (readable.from === 'sitio') status.textContent = 'traída del sitio · queda guardada para leerla sin conexión';
    else status.remove();
  } catch (err) {
    status.textContent = `No pude traer la nota completa (${err instanceof Error ? err.message : 'error'}).`;
    status.dataset.kind = 'error';
    if (article.image) body.append(hero(article.image));
    body.append(summaryOf(article.summary));
  }
}

function showContent(body: HTMLElement, html: string, baseUrl: string, image?: string): void {
  const content = sanitizeArticle(html, baseUrl);
  if (image && !content.querySelector('img')) body.append(hero(image));
  body.append(content);
  for (const img of Array.from(body.querySelectorAll('img'))) {
    img.addEventListener('error', () => img.remove(), { once: true });
  }
}

/** Una nota guardada en el archivo: se lee de la copia, aunque la fuente ya no esté. */
export function renderGuardada(id: string, goBack: () => void, onSavedChange: () => void): HTMLElement {
  const view = el('article', 'nota');
  const bar = topBar(goBack);
  view.append(bar);
  void (async () => {
    const [saved, sections] = await Promise.all([getSaved(id), listSections()]);
    if (!saved) {
      view.append(el('p', 'band', 'Esa nota ya no está en el archivo.'));
      return;
    }
    const section = sections.find((s) => s.id === saved.sectionId);
    const remove = button('[ quitar de guardados ]', 'term-button guardar__boton');
    remove.addEventListener('click', async () => {
      await removeSaved(saved.id);
      onSavedChange();
      goBack();
    });
    bar.append(remove);

    const meta = el(
      'p',
      'nota__meta web-small',
      `${saved.feedTitle} · ${longDate.format(saved.published)} · en el archivo: ${section?.name ?? 'sin sección'}`,
    );
    const title = el('h1', 'nota__title', saved.title);
    title.tabIndex = -1;
    const body = el('div', 'nota__body');
    view.append(meta, title, body);
    if (saved.content) showContent(body, saved.content, saved.link || location.href, saved.image);
    else {
      if (saved.image) body.append(hero(saved.image));
      body.append(summaryOf(saved.summary));
    }
    if (saved.link) view.append(originalLink(saved.link));
    title.focus({ preventScroll: true });
  })();
  return view;
}
