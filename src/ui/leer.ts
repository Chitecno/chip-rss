import { listArticles, listFeeds, listTags, type Article, type Tag } from '../db/db';
import { buildEdition, loadSettings, sectionsFor } from '../lab/edition';
import { renderLayout, type LayoutName } from '../lab/layouts';
import { routineBox } from '../lab/routine-box';
import '../lab/lab.css';
import { asciiPlaceholder } from './ascii-placeholder';
import { el, plural, shortDate } from './dom';

/** Cómo se muestra "leer": la lista de siempre o las historias como diario, revista o teletipo. */
type Format = 'timeline' | LayoutName;

const FORMATS: { id: Format; label: string }[] = [
  { id: 'timeline', label: 'timeline' },
  { id: 'tapa', label: 'diario' },
  { id: 'revista', label: 'revista' },
  { id: 'teletipo', label: 'teletipo' },
];

const FORMAT_KEY = 'chip-rss:leer-formato';

// El formato elegido se recuerda en este navegador.
function loadFormat(): Format {
  try {
    const saved = localStorage.getItem(FORMAT_KEY);
    return FORMATS.some((f) => f.id === saved) ? (saved as Format) : 'timeline';
  } catch {
    return 'timeline';
  }
}

function saveFormat(format: Format): void {
  try {
    localStorage.setItem(FORMAT_KEY, format);
  } catch {
    // sin almacenamiento: vale hasta cerrar la pestaña
  }
}

export type LeerView = {
  el: HTMLElement;
  /** Muestra el timeline con un filtro: 'todo', 'principales' o el id de una etiqueta. */
  show(filter: string): Promise<void>;
  /** Avisa que cambiaron los datos: la próxima vez se vuelve a armar. */
  invalidate(): void;
  setStatus(msg: string): void;
};

function card(article: Article, feedTitle: string): HTMLElement {
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

  const meta = el('p', 'card__meta web-small', `${feedTitle} · ${shortDate.format(article.published)}`);
  const title = el('h3', 'card__title');
  const link = el('a', undefined, article.title);
  link.href = href;
  title.append(link);

  node.append(media, meta, title);
  if (article.summary) node.append(el('p', 'card__summary', article.summary));
  return node;
}

function chip(label: string, filter: string, active: boolean): HTMLAnchorElement {
  const a = el('a', 'chip', label);
  a.href = filter === 'todo' ? '#/leer' : `#/leer?f=${encodeURIComponent(filter)}`;
  if (active) a.setAttribute('aria-current', 'true');
  return a;
}

function emptyState(text: string, linkText: string): HTMLElement {
  const box = el('div', 'leer__empty');
  box.append(el('p', undefined, text));
  const a = el('a', 'term-button', linkText);
  a.href = '#/fuentes';
  box.append(a);
  return box;
}

export function createLeer(): LeerView {
  const view = el('section', 'leer');
  view.setAttribute('aria-label', 'Leer');
  const chips = el('nav', 'chips');
  chips.setAttribute('aria-label', 'Filtrar por fuentes');
  const formats = el('nav', 'chips leer__formats');
  formats.setAttribute('aria-label', 'Formato');
  const band = el('p', 'band');
  const status = el('p', 'leer__status web-small muted');
  status.setAttribute('role', 'status');
  const empty = el('div');
  const content = el('div', 'leer__content');
  view.append(chips, formats, band, status, empty, content);

  let dirty = true;
  let current = '';
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
          void api.show(current);
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
    },
    setStatus(msg) {
      status.textContent = msg;
    },
    async show(filter) {
      if (!dirty && filter === current) return;
      dirty = false;
      current = filter;

      const [feeds, tags] = await Promise.all([listFeeds(), listTags()]);
      const tag: Tag | undefined = tags.find((t) => t.id === filter);
      const mode = filter === 'principales' ? 'principales' : tag ? 'tag' : 'todo';
      const selected =
        mode === 'principales'
          ? feeds.filter((f) => f.principal)
          : mode === 'tag'
            ? feeds.filter((f) => f.tagIds.includes(tag!.id))
            : feeds;

      chips.replaceChildren(
        chip('todo', 'todo', mode === 'todo'),
        chip('* principales', 'principales', mode === 'principales'),
        ...tags.map((t) => chip(`#${t.name}`, t.id, t.id === tag?.id)),
      );

      if (feeds.length === 0) {
        empty.replaceChildren(emptyState('Pegá la dirección de un medio y la app busca su feed.', '[ agregar fuentes ]'));
      } else if (selected.length === 0) {
        empty.replaceChildren(
          mode === 'principales'
            ? emptyState('Todavía no marcaste ninguna fuente como principal.', '[ elegir en fuentes ]')
            : emptyState('Ninguna fuente tiene esta etiqueta todavía.', '[ etiquetar en fuentes ]'),
        );
      } else {
        empty.replaceChildren();
      }

      const label = mode === 'principales' ? 'principales' : tag ? `#${tag.name}` : 'todo';
      const titles = new Map(feeds.map((f) => [f.id, f.title]));
      const feedTitle = (id: string) => titles.get(id) ?? '';

      if (feeds.length === 0 || selected.length === 0) {
        band.textContent = feeds.length === 0 ? 'Todavía no hay fuentes.' : `0 artículos · ${label}`;
        content.replaceChildren();
        return;
      }

      if (format === 'timeline') {
        const articles = await listArticles(mode === 'todo' ? undefined : new Set(selected.map((f) => f.id)));
        band.textContent = `${plural(articles.length, 'artículo', 'artículos')} · ${label}`;
        const list = el('div', 'timeline__list');
        list.append(...articles.map((a) => card(a, feedTitle(a.feedId))));
        content.replaceChildren(list);
        return;
      }

      // Diario, revista y teletipo: las historias agrupadas, con los ajustes del laboratorio.
      const articles = await listArticles(undefined, 800);
      const edition = buildEdition(feeds, tags, articles, filter, loadSettings());
      band.textContent = `${plural(edition.ranked.length, 'historia', 'historias')} · ${label}`;
      const layout = renderLayout(format, edition.ranked, {
        feedTitle,
        showReasons: false,
        label: edition.label,
        topics: edition.topics,
        routine: edition.routine,
        sectionsOf: sectionsFor(feeds, tags),
      });
      // En el diario la rutina ya está en la oreja del cabezal; en los demás va en su caja.
      content.replaceChildren(...(format === 'tapa' ? [] : [routineBox(edition.routine, feedTitle)]), layout);
    },
  };
  return api;
}
