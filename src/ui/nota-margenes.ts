import { listArticles, listFeeds, listTags, type Article, type Feed } from '../db/db';
import { onePerFeed, type StoryLike } from '../historias/comparar';
import { el, shortDate } from './dom';

/**
 * Las dos columnas a la derecha de la nota en papel, para que la hoja mida lo mismo que la portada.
 * Primera: cómo cuentan la historia otras fuentes y, si no hay (o sobra lugar), más del mismo medio.
 * Segunda: notas de otros medios con la misma etiqueta.
 */

const EXCERPT = 220;

function excerpt(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= EXCERPT) return clean;
  return `${clean.slice(0, EXCERPT).replace(/\s+\S*$/, '')}…`;
}

function thumb(src: string): HTMLImageElement {
  const img = el('img', 'margen__foto');
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.src = src;
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

/** Una nota en el margen: medio, título con link y, si se pide, foto y comienzo del texto. */
function item(a: Article, feedTitle: string, full: boolean): HTMLElement {
  const box = el('div', 'margen__nota');
  box.append(el('p', 'margen__fuente', `${feedTitle} · ${shortDate.format(a.published)}`));
  const link = el('a', 'margen__titulo', a.title);
  link.href = `#/nota/${a.id}`;
  box.append(link);
  if (full) {
    if (a.image) box.append(thumb(a.image));
    if (a.summary) box.append(el('p', 'margen__texto', excerpt(a.summary)));
  }
  return box;
}

function block(title: string, items: HTMLElement[]): HTMLElement | null {
  if (items.length === 0) return null;
  const box = el('section', 'margen__bloque');
  box.append(el('h2', 'margen__seccion', title), ...items);
  return box;
}

export async function sourcesColumn(article: Article, feed: Feed | undefined, story: StoryLike | undefined): Promise<HTMLElement> {
  const aside = el('aside', 'nota__side nota__side--fuentes');
  const feeds = new Map((await listFeeds()).map((f) => [f.id, f.title]));
  const name = (id: string) => feeds.get(id) ?? '';

  // Las otras fuentes de la misma historia, con foto y el comienzo de su texto.
  const others = story ? onePerFeed(story.articles).filter((a) => a.feedId !== article.feedId) : [];
  const compare = block(
    'Cómo lo cuenta cada fuente',
    others.map((a) => item(a, name(a.feedId), true)),
  );
  if (compare) aside.append(compare);

  // Más del mismo medio: ocupa todo el margen si no hay otras fuentes, y si las hay, completa.
  const inStory = new Set(story?.articles.map((a) => a.id) ?? []);
  const howMany = others.length === 0 ? 5 : Math.max(2, 4 - others.length);
  const same = (await listArticles(new Set([article.feedId]), 30))
    .filter((a) => a.id !== article.id && !inStory.has(a.id))
    .slice(0, howMany);
  const more = block(
    `Más de ${feed?.title ?? 'este medio'}`,
    same.map((a, i) => item(a, name(a.feedId), others.length === 0 && i === 0)),
  );
  if (more) aside.append(more);
  return aside;
}

export async function tagColumn(article: Article, feed: Feed | undefined): Promise<HTMLElement> {
  const aside = el('aside', 'nota__side nota__side--etiqueta');
  // Notas de otros medios con la misma etiqueta. Si la fuente no tiene etiquetas, de todos los demás.
  const [feeds, tags] = await Promise.all([listFeeds(), listTags()]);
  // La primera etiqueta que le pusiste a la fuente.
  const tag = feed?.tagIds.map((id) => tags.find((t) => t.id === id)).find(Boolean);
  const pool = feeds.filter((f) => f.id !== article.feedId && (!tag || f.tagIds.includes(tag.id)));
  const names = new Map(feeds.map((f) => [f.id, f.title]));
  const near = onePerFeed(await listArticles(new Set(pool.map((f) => f.id)), 60))
    .sort((a, b) => b.published - a.published)
    .slice(0, 6);
  const related = block(
    tag ? `Más de #${tag.name}` : 'Otras noticias',
    near.map((a, i) => item(a, names.get(a.feedId) ?? '', i === 0)),
  );
  if (related) aside.append(related);
  return aside;
}
