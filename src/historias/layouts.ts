import type { Article } from '../db/db';
import { asciiPlaceholder } from '../ui/ascii-placeholder';
import { el, shortDate } from '../ui/dom';
import type { Ranked, Topic } from './relevance';
import type { RoutineGroup } from './routine';
import { diario } from './diario';

/** Las formas de mostrar las historias en la pantalla de leer. */
export type LayoutName = 'diario' | 'revista' | 'teletipo';

export type LayoutContext = {
  feedTitle: (id: string) => string;
  showReasons: boolean;
  /** El menú de fuentes (todo, principales, etiquetas), que va adentro de cada formato. */
  filters?: HTMLElement;
  /** El botón de guardar de una nota (chico, para los lugares con poco espacio). */
  saveButton?: (article: Article, compact?: boolean) => HTMLElement;
  /** En qué página estamos y cuántas hay. */
  page?: number;
  pages?: number;
  /** Para el diario: qué fuentes se están mirando, los temas y la rutina del día, y las secciones. */
  label?: string;
  topics?: Topic[];
  routine?: RoutineGroup[];
  sectionsOf?: (story: Ranked) => string[];
};

/** La nota que encabeza la historia: la que tiene foto y más texto. */
function lead(story: Ranked): Article {
  return [...story.articles].sort(
    (a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)) || b.summary.length - a.summary.length,
  )[0];
}

function image(article: Article, className: string): HTMLElement {
  const box = el('a', className);
  box.href = `#/nota/${article.id}`;
  box.tabIndex = -1;
  box.setAttribute('aria-hidden', 'true');
  if (article.image) {
    const img = el('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = article.image;
    img.addEventListener('error', () => box.replaceChildren(asciiPlaceholder(article.id)), { once: true });
    box.append(img);
  } else {
    box.append(asciiPlaceholder(article.id));
  }
  return box;
}

function headline(article: Article, tag: 'h2' | 'h3' | 'h4', className: string): HTMLElement {
  const h = el(tag, className);
  const a = el('a', undefined, article.title);
  a.href = `#/nota/${article.id}`;
  h.append(a);
  return h;
}

/** "Página/12 · Chequeado · Infobae" y, si hay varias, la marca rosa con cuántas fuentes. */
function sources(story: Ranked, ctx: LayoutContext): HTMLElement {
  const line = el('p', 'lab-sources web-small');
  if (story.feedIds.size > 1) line.append(el('span', 'lab-count', `${story.feedIds.size} fuentes`), ' ');
  const names = [...story.feedIds].map(ctx.feedTitle).join(' · ');
  line.append(`${names} · ${shortDate.format(story.newest)}`);
  return line;
}

function reasons(story: Ranked, ctx: LayoutContext): HTMLElement | '' {
  if (!ctx.showReasons) return '';
  return el('p', 'lab-reasons web-small', `por qué: ${story.reasons.join(' · ')}`);
}

/** Si la historia tiene varias versiones, una lista desplegable para leer cada una. */
function versions(story: Ranked, ctx: LayoutContext): HTMLElement | '' {
  if (story.articles.length < 2) return '';
  const box = el('details', 'lab-versions web-small');
  box.append(el('summary', undefined, `[ ver las ${story.articles.length} versiones ]`));
  const list = el('ul');
  for (const a of story.articles) {
    const li = el('li');
    li.append(el('span', 'muted', `${ctx.feedTitle(a.feedId)}: `));
    const link = el('a', undefined, a.title);
    link.href = `#/nota/${a.id}`;
    li.append(link);
    list.append(li);
  }
  box.append(list);
  return box;
}

function storyBlock(story: Ranked, ctx: LayoutContext, size: 'xl' | 'l' | 'm' | 's', withImage: boolean): HTMLElement {
  const a = lead(story);
  const block = el('article', `lab-story lab-story--${size}`);
  if (withImage) block.append(image(a, 'lab-media'));
  block.append(headline(a, size === 'xl' ? 'h2' : size === 's' ? 'h4' : 'h3', 'lab-title'));
  if (size !== 's' && a.summary) block.append(el('p', 'lab-summary', a.summary));
  block.append(sources(story, ctx));
  if (ctx.saveButton) block.append(ctx.saveButton(a));
  const r = reasons(story, ctx);
  if (r) block.append(r);
  const v = versions(story, ctx);
  if (v) block.append(v);
  return block;
}

/** Revista: fotos grandes, una historia por bloque, alternando lados. */
function revista(stories: Ranked[], ctx: LayoutContext): HTMLElement {
  const page = el('div', 'revista');
  const withPhoto = stories.filter((s) => s.articles.some((a) => a.image));
  const [cover, ...rest] = withPhoto;
  if (cover) {
    const c = el('div', 'revista__cover');
    c.append(storyBlock(cover, ctx, 'xl', true));
    page.append(c);
  }
  rest.forEach((s, i) => {
    const row = el('div', `revista__row${i % 2 ? ' revista__row--flip' : ''}`);
    row.append(storyBlock(s, ctx, 'l', true));
    page.append(row);
  });
  const others = stories.filter((s) => !withPhoto.includes(s));
  if (others.length) {
    page.append(el('h2', 'section-title', 'más'));
    const more = el('div', 'revista__more');
    for (const s of others) more.append(storyBlock(s, ctx, 's', false));
    page.append(more);
  }
  return page;
}

/** Teletipo: una línea por historia, como un cable de agencia. */
function teletipo(stories: Ranked[], ctx: LayoutContext): HTMLElement {
  const list = el('ol', 'teletipo');
  const time = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  for (const s of stories) {
    const a = lead(s);
    const li = el('li', 'teletipo__row');
    li.append(el('span', 'teletipo__time muted', time.format(s.newest)));
    li.append(el('span', 'teletipo__source', [...s.feedIds].map(ctx.feedTitle)[0]?.slice(0, 18) ?? ''));
    const link = el('a', 'teletipo__title', a.title);
    link.href = `#/nota/${a.id}`;
    li.append(link);
    if (ctx.saveButton) li.append(ctx.saveButton(a, true));
    if (s.feedIds.size > 1) li.append(el('span', 'lab-count', `${s.feedIds.size} fuentes`));
    if (ctx.showReasons) li.append(el('span', 'teletipo__why web-small', s.reasons.join(' · ')));
    const v = versions(s, ctx);
    if (v) li.append(v);
    list.append(li);
  }
  return list;
}

export function renderLayout(name: LayoutName, stories: Ranked[], ctx: LayoutContext): HTMLElement {
  // El diario pone el menú de fuentes adentro de la hoja; los demás, arriba de todo.
  if (name === 'diario') return diario(stories, ctx);
  const wrap = el('div', 'formato');
  if (ctx.filters) wrap.append(ctx.filters);
  wrap.append(name === 'revista' ? revista(stories, ctx) : teletipo(stories, ctx));
  return wrap;
}
