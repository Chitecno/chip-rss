import { listArticles, listFeeds, listTags, type Article, type Tag } from '../db/db';
import { buildEdition, isShared, sectionsFor } from '../historias/edition';
import { renderLayout } from '../historias/layouts';
import type { Ranked } from '../historias/relevance';
import { routineBox } from '../historias/routine-box';
import '../historias/historias.css';
import { asciiPlaceholder } from './ascii-placeholder';
import { el, plural, shortDate } from './dom';
import { FORMATS, loadFormat, saveFormat, type Format } from './preferencias';
import { loadSaveState } from './guardar';
import { noteActions } from './acciones';

/** Qué se está mirando: el filtro de fuentes, la página y si son solo las historias compartidas. */
export type LeerRoute = { filter: string; page: number; shared: boolean };

export type LeerView = {
  el: HTMLElement;
  show(route: LeerRoute): Promise<void>;
  /** Avisa que cambiaron los datos: la próxima vez se vuelve a armar. */
  invalidate(): void;
  setStatus(msg: string): void;
};

// Cuántas cosas entran en cada página, según el formato. Todo se muestra: lo que no entra, va a la página siguiente.
const PAGE_SIZE: Record<Format, number> = { timeline: 48, diario: 40, revista: 16, teletipo: 60 };

export function leerHref(route: LeerRoute): string {
  const params = new URLSearchParams();
  if (route.filter !== 'todo') params.set('f', route.filter);
  if (route.shared) params.set('c', '1');
  if (route.page > 1) params.set('p', String(route.page));
  const query = params.toString();
  return query ? `#/leer?${query}` : '#/leer';
}

/** "También en: Xataka, Genbeta", con un link a cada versión. */
function otherVersions(story: Ranked, shown: Article, feedTitle: (id: string) => string): HTMLElement {
  const line = el('p', 'card__also web-small');
  line.append('También en: ');
  story.articles
    .filter((a) => a.id !== shown.id)
    .forEach((a, i) => {
      if (i) line.append(', ');
      const link = el('a', undefined, feedTitle(a.feedId));
      link.href = `#/nota/${a.id}`;
      line.append(link);
    });
  return line;
}

function card(
  article: Article,
  feedTitle: (id: string) => string,
  story: Ranked | undefined,
  actions: (article: Article) => HTMLElement,
): HTMLElement {
  const node = el('article', 'card');
  const href = `#/nota/${article.id}`;

  // La imagen también abre la nota, pero el lector de pantalla solo anuncia el título.
  const media = el('a', 'card__media');
  media.href = href;
  media.tabIndex = -1;
  media.setAttribute('aria-hidden', 'true');
  if (article.image) {
    const img = el('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.src = article.image;
    img.addEventListener('error', () => media.replaceChildren(asciiPlaceholder(article.id)), { once: true });
    media.append(img);
  } else {
    media.append(asciiPlaceholder(article.id));
  }

  const meta = el('p', 'card__meta web-small');
  if (story && isShared(story)) meta.append(el('span', 'lab-count', `${story.feedIds.size} fuentes`), ' ');
  meta.append(`${feedTitle(article.feedId)} · ${shortDate.format(article.published)}`);
  const title = el('h3', 'card__title');
  const link = el('a', undefined, article.title);
  link.href = href;
  title.append(link);

  node.append(media, meta, title);
  if (article.summary) node.append(el('p', 'card__summary', article.summary));
  if (story && isShared(story)) node.append(otherVersions(story, article, feedTitle));
  node.append(actions(article));
  return node;
}

function emptyState(text: string, linkText: string, href = '#/fuentes'): HTMLElement {
  const box = el('div', 'leer__empty');
  box.append(el('p', undefined, text));
  const a = el('a', 'term-button', linkText);
  a.href = href;
  box.append(a);
  return box;
}

/** Los números de página: anterior, 1 … 4 5 6 … 12, siguiente. */
function pager(route: LeerRoute, pages: number): HTMLElement | '' {
  if (pages <= 1) return '';
  const nav = el('nav', 'pager');
  nav.setAttribute('aria-label', 'Páginas');
  const go = (page: number, label: string, extra = '') => {
    const a = el('a', `pager__link ${extra}`.trim(), label);
    a.href = leerHref({ ...route, page });
    return a;
  };
  if (route.page > 1) nav.append(go(route.page - 1, '[ < anterior ]', 'pager__step'));
  const numbers = new Set([1, pages, route.page - 1, route.page, route.page + 1].filter((n) => n >= 1 && n <= pages));
  let last = 0;
  for (const n of [...numbers].sort((a, b) => a - b)) {
    if (n - last > 1) nav.append(el('span', 'pager__gap', '…'));
    if (n === route.page) {
      const current = el('span', 'pager__current', String(n));
      current.setAttribute('aria-current', 'page');
      nav.append(current);
    } else {
      const a = go(n, String(n));
      a.setAttribute('aria-label', `Página ${n}`);
      nav.append(a);
    }
    last = n;
  }
  if (route.page < pages) nav.append(go(route.page + 1, '[ siguiente > ]', 'pager__step'));
  return nav;
}

export function createLeer(): LeerView {
  const view = el('section', 'leer');
  view.setAttribute('aria-label', 'Leer');
  const formats = el('nav', 'chips leer__formats');
  formats.setAttribute('aria-label', 'Formato');
  const band = el('p', 'band');
  const status = el('p', 'leer__status web-small muted');
  status.setAttribute('role', 'status');
  const content = el('div', 'leer__content');
  view.append(formats, band, status, content);

  let dirty = true;
  let current: LeerRoute = { filter: 'todo', page: 1, shared: false };
  let currentKey = '';
  let format = loadFormat();

  const renderFormats = () => {
    formats.replaceChildren(
      el('span', 'leer__formats-label web-small muted', 'formato:'),
      ...FORMATS.map((f) => {
        const b = el('button', 'chip', f.label);
        b.type = 'button';
        if (f.id === format) b.setAttribute('aria-current', 'true');
        b.addEventListener('click', () => {
          if (f.id === format) return;
          format = f.id;
          saveFormat(format);
          renderFormats();
          dirty = true;
          // Al cambiar de formato se vuelve a la primera página.
          if (current.page > 1) location.hash = leerHref({ ...current, page: 1 });
          else void api.show(current);
        });
        return b;
      }),
    );
  };
  renderFormats();

  const api: LeerView = {
    el: view,
    invalidate() {
      dirty = true;
      format = loadFormat();
      renderFormats();
    },
    setStatus(msg) {
      status.textContent = msg;
    },
    async show(route) {
      const key = `${route.filter}|${route.page}|${route.shared}`;
      if (!dirty && key === currentKey) return;
      dirty = false;
      current = route;
      currentKey = key;

      const [feeds, tags, articles] = await Promise.all([listFeeds(), listTags(), listArticles(undefined, Infinity)]);
      const tag: Tag | undefined = tags.find((t) => t.id === route.filter);
      const mode = route.filter === 'principales' ? 'principales' : tag ? 'tag' : 'todo';
      const titles = new Map(feeds.map((f) => [f.id, f.title]));
      const feedTitle = (id: string) => titles.get(id) ?? '';
      // Qué notas ya están guardadas, para los botones de guardar y compartir.
      const saveState = await loadSaveState(() => {});
      const actions = (a: Article, compact = false) => noteActions(a, feedTitle(a.feedId), saveState, compact);

      if (feeds.length === 0) {
        band.textContent = 'Todavía no hay fuentes.';
        content.replaceChildren(emptyState('Pegá la dirección de un medio y la app busca su feed.', '[ agregar fuentes ]'));
        return;
      }

      // Las historias se arman con todas las fuentes, aunque haya una etiqueta elegida.
      const edition = buildEdition(feeds, tags, articles, route.filter, route.shared);

      // El menú de fuentes va adentro de cada formato.
      const filters = el('nav', 'chips leer__filters');
      filters.setAttribute('aria-label', 'Filtrar por fuentes');
      const chip = (label: string, filter: string, active: boolean) => {
        const a = el('a', 'chip', label);
        a.href = leerHref({ filter, page: 1, shared: route.shared });
        if (active) a.setAttribute('aria-current', 'true');
        return a;
      };
      const sharedToggle = el('a', 'chip leer__shared', `${route.shared ? '[x]' : '[ ]'} varias fuentes (${edition.sharedCount})`);
      sharedToggle.href = leerHref({ ...route, page: 1, shared: !route.shared });
      sharedToggle.setAttribute('aria-pressed', String(route.shared));
      sharedToggle.title = 'Ver solo las historias que cuentan dos o más fuentes';
      filters.append(
        chip('todo', 'todo', mode === 'todo'),
        chip('* principales', 'principales', mode === 'principales'),
        ...tags.map((t) => chip(`#${t.name}`, t.id, t.id === tag?.id)),
        sharedToggle,
      );

      const label = mode === 'principales' ? 'principales' : tag ? `#${tag.name}` : 'todo';
      if (edition.feeds.length === 0) {
        band.textContent = `0 artículos · ${label}`;
        content.replaceChildren(
          filters,
          mode === 'principales'
            ? emptyState('Todavía no marcaste ninguna fuente como principal.', '[ elegir en fuentes ]')
            : emptyState('Ninguna fuente tiene esta etiqueta todavía.', '[ etiquetar en fuentes ]'),
        );
        return;
      }

      // Qué se pagina: notas en el timeline, historias en los demás formatos.
      const ids = new Set(edition.feeds.map((f) => f.id));
      const inSharedStory = (a: Article) => {
        const story = edition.storyOf.get(a.id);
        return story ? isShared(story) : false;
      };
      const notes = articles.filter((a) => ids.has(a.feedId) && (!route.shared || inSharedStory(a)));
      const total = format === 'timeline' ? notes.length : edition.ranked.length;
      const size = PAGE_SIZE[format];
      const pages = Math.max(1, Math.ceil(total / size));
      const page = Math.min(Math.max(1, route.page), pages);
      const from = (page - 1) * size;
      const pageRoute = { ...route, page };

      const unit = format === 'timeline' ? ['artículo', 'artículos'] : ['historia', 'historias'];
      band.textContent =
        `${plural(total, unit[0], unit[1])} · ${label}` +
        (edition.sharedCount ? ` · ${plural(edition.sharedCount, 'contada por varias fuentes', 'contadas por varias fuentes')}` : '') +
        (pages > 1 ? ` · página ${page} de ${pages}` : '');

      if (total === 0 && route.shared) {
        content.replaceChildren(
          filters,
          emptyState('Ninguna historia de estas fuentes la cuentan dos o más fuentes.', '[ ver todas ]', leerHref({ ...route, page: 1, shared: false })),
        );
        return;
      }

      if (format === 'timeline') {
        const list = el('div', 'timeline__list');
        list.append(...notes.slice(from, from + size).map((a) => card(a, feedTitle, edition.storyOf.get(a.id), actions)));
        content.replaceChildren(filters, list, pager(pageRoute, pages));
        return;
      }

      // Diario, revista y teletipo: las historias, con la rutina aparte.
      const layout = renderLayout(format, edition.ranked.slice(from, from + size), {
        feedTitle,
        showReasons: false,
        filters,
        actions,
        page,
        pages,
        label: edition.label,
        topics: edition.topics,
        routine: edition.routine,
        sectionsOf: sectionsFor(feeds, tags),
      });
      // En el diario la rutina ya está en la oreja del cabezal; en los demás va en su caja, en la última página.
      const routine = format !== 'diario' && page === pages ? [routineBox(edition.routine, feedTitle)] : [];
      content.replaceChildren(layout, pager(pageRoute, pages), ...routine);
    },
  };
  return api;
}
