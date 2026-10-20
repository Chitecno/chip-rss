import { listArticles, listFeeds, listTags, type Article, type Tag } from '../db/db';
import { asciiPlaceholder } from './ascii-placeholder';
import { el, plural, shortDate } from './dom';

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
  chips.setAttribute('aria-label', 'Filtrar el timeline');
  const band = el('p', 'band');
  const status = el('p', 'leer__status web-small muted');
  status.setAttribute('role', 'status');
  const empty = el('div');
  const list = el('div', 'timeline__list');
  view.append(chips, band, status, empty, list);

  let dirty = true;
  let current = '';

  return {
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
      const articles =
        selected.length === 0
          ? []
          : await listArticles(mode === 'todo' ? undefined : new Set(selected.map((f) => f.id)));

      chips.replaceChildren(
        chip('todo', 'todo', mode === 'todo'),
        chip('* principales', 'principales', mode === 'principales'),
        ...tags.map((t) => chip(`#${t.name}`, t.id, t.id === tag?.id)),
      );

      const label = mode === 'principales' ? 'principales' : tag ? `#${tag.name}` : 'todo';
      band.textContent =
        feeds.length === 0 ? 'Todavía no hay fuentes.' : `${plural(articles.length, 'artículo', 'artículos')} · ${label}`;

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

      const titles = new Map(feeds.map((f) => [f.id, f.title]));
      list.replaceChildren(...articles.map((a) => card(a, titles.get(a.feedId) ?? '')));
    },
  };
}
