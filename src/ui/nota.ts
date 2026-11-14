import { getArticle, getFeed, getSaved, listSections, removeSaved, type Article, type Feed } from '../db/db';
import { compareList, type StoryLike } from '../historias/comparar';
import { feedContent, isComplete } from '../reader/content';
import { sanitizeArticle } from '../reader/sanitize';
import { button, el, longDate } from './dom';
import { loadSaveState } from './guardar';
import { noteActions } from './acciones';
import { shareButton } from './compartir';
import { sourcesColumn, tagColumn } from './nota-margenes';
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

/**
 * El recuadro del comienzo: siempre invita a leer la nota en el sitio del medio.
 * Si el RSS trae solo un resumen, avisa que la nota completa está allá.
 */
function sourceBox(link: string, complete: boolean): HTMLElement {
  const box = el('p', complete ? 'nota__fuente-original' : 'nota__fuente-original nota__fuente-original--resumen');
  const a = el(
    'a',
    undefined,
    complete
      ? 'Podés apoyar a este medio leyendo este artículo en su sitio original ↗'
      : 'Este RSS no trae la nota completa, pero la podés leer en el sitio original ↗',
  );
  a.href = link;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  box.append(a);
  return box;
}

function topBar(goBack: () => void): HTMLElement {
  const bar = el('div', 'nota__bar');
  const back = button('[ < volver ]', 'term-button nota__back');
  back.addEventListener('click', goBack);
  bar.append(back);
  return bar;
}

/** Busca la historia de una nota: todas las fuentes que la cuentan. */
export type StoryLookup = (
  articleId: string,
) => Promise<{ story: StoryLike; feedTitle: (id: string) => string } | undefined>;

/** La nota abierta dentro de la app. Con `paper`, en la hoja clara del diario. */
export function renderNota(
  id: string,
  goBack: () => void,
  onSavedChange: () => void,
  storyFor: StoryLookup,
  paper = false,
): HTMLElement {
  const view = el('article', paper ? 'nota nota--papel papel' : 'nota');
  const bar = topBar(goBack);
  view.append(bar);
  void fill(view, id, onSavedChange, storyFor, paper);
  return view;
}

/** Si otras fuentes cuentan la misma historia, un recuadro con el título de cada una. */
async function comparison(article: Article, storyFor: StoryLookup): Promise<HTMLElement | ''> {
  const found = await storyFor(article.id);
  if (!found) return '';
  return compareList(found.story, article, found.feedTitle, { markShown: true, className: 'comparar--nota' });
}

/**
 * En papel, la hoja mide lo mismo que la portada: la nota a la izquierda y dos columnas a la derecha.
 * Devuelve la columna de la nota.
 */
async function paperSheet(view: HTMLElement, article: Article, feed: Feed | undefined, storyFor: StoryLookup): Promise<HTMLElement> {
  const sheet = el('div', 'nota__hoja');
  const main = el('div', 'nota__main');
  const found = await storyFor(article.id);
  const [sources, related] = await Promise.all([sourcesColumn(article, feed, found?.story), tagColumn(article, feed)]);
  sheet.append(main, sources, related);
  view.append(sheet);
  return main;
}

async function fill(
  view: HTMLElement,
  id: string,
  onSavedChange: () => void,
  storyFor: StoryLookup,
  paper: boolean,
): Promise<void> {
  const article = await getArticle(id);
  if (!article) {
    view.append(el('p', 'band', 'No encontré esa nota. Puede que hayas quitado su fuente.'));
    return;
  }
  const feed = await getFeed(article.feedId);
  const isVideo = /youtube\.com|youtu\.be/i.test(article.link);
  // Debajo del título: el medio, la fecha y, en la misma línea, guardar y compartir esta nota.
  const meta = el('div', 'nota__meta-row');
  meta.append(
    el('p', 'nota__meta web-small', `${feed?.title ?? ''} · ${longDate.format(article.published)}`),
    noteActions(article, feed?.title ?? '', await loadSaveState(onSavedChange)),
  );
  const title = el('h1', 'nota__title', article.title);
  title.tabIndex = -1;
  const body = el('div', 'nota__body');
  const column = paper ? await paperSheet(view, article, feed, storyFor) : view;
  column.append(title, meta);
  // Solo lo que trae el RSS. Arriba, la invitación al sitio original (los videos ya llevan a YouTube).
  const readable = feedContent(article);
  if (article.link && !isVideo) column.append(sourceBox(article.link, Boolean(readable?.complete)));
  // En papel, las otras fuentes van en el costado derecho.
  const compare = paper ? '' : await comparison(article, storyFor);
  if (compare) column.append(compare);
  column.append(body);
  // El link de abajo queda solo para los videos: las notas ya tienen el recuadro arriba.
  if (article.link && isVideo) column.append(originalLink(article.link));
  title.focus({ preventScroll: true });

  if (article.image && (isVideo || !readable)) body.append(hero(article.image));
  if (readable) showContent(body, readable.html, article.link || location.href, isVideo ? undefined : article.image);
  else body.append(summaryOf(article.summary));
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
    const actions = el('span', 'acciones');
    actions.append(shareButton(saved.title, saved.link), remove);
    bar.append(actions);

    const meta = el(
      'p',
      'nota__meta web-small',
      `${saved.feedTitle} · ${longDate.format(saved.published)} · en el archivo: ${section?.name ?? 'sin sección'}`,
    );
    const title = el('h1', 'nota__title', saved.title);
    title.tabIndex = -1;
    const body = el('div', 'nota__body');
    view.append(meta, title);
    if (saved.link && !/youtube\.com|youtu\.be/i.test(saved.link)) view.append(sourceBox(saved.link, isComplete(saved.content)));
    view.append(body);
    if (saved.content) showContent(body, saved.content, saved.link || location.href, saved.image);
    else {
      if (saved.image) body.append(hero(saved.image));
      body.append(summaryOf(saved.summary));
    }
    if (saved.link && /youtube\.com|youtu\.be/i.test(saved.link)) view.append(originalLink(saved.link));
    title.focus({ preventScroll: true });
  })();
  return view;
}
