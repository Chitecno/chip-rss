import type { Article } from '../db/db';
import { renderBanner } from '../boot/banner';
import { READER_NAME } from '../config';
import { el } from '../ui/dom';
import type { Ranked } from './relevance';
import type { LayoutContext } from './layouts';
import { isShared } from './edition';
import './diario.css';

/**
 * Diario en papel: una hoja clara sobre el fondo de la app, con cabezal, orejas,
 * columnas angostas separadas por filetes, fotos tramadas como impresas y breves.
 */

const editionDate = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const time = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function lead(story: Ranked): Article {
  return [...story.articles].sort(
    (a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)) || b.summary.length - a.summary.length,
  )[0];
}

function link(article: Article, text: string, className?: string): HTMLAnchorElement {
  const a = el('a', className, text);
  a.href = `#/nota/${article.id}`;
  return a;
}

/** La marca rosa: cuántas fuentes cuentan la historia. */
function sharedMark(story: Ranked): HTMLElement | '' {
  return isShared(story) ? el('span', 'lab-count diario__count', `${story.feedIds.size} fuentes`) : '';
}

/** Volanta: la línea chiquita en mayúsculas arriba del título. */
function kicker(story: Ranked, ctx: LayoutContext): HTMLElement {
  const sections = ctx.sectionsOf?.(story) ?? [];
  const p = el('p', 'diario__kicker');
  const mark = sharedMark(story);
  if (mark) p.append(mark, ' ');
  p.append(sections.length ? sections[0] : ctx.feedTitle(lead(story).feedId));
  return p;
}

/** La foto en blanco y negro con trama de puntos, como impresa. */
function photo(article: Article, className: string): HTMLElement | '' {
  if (!article.image) return '';
  const box = link(article, '', `diario__photo ${className}`);
  box.tabIndex = -1;
  box.setAttribute('aria-hidden', 'true');
  const img = el('img');
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = article.image;
  img.addEventListener('error', () => box.remove(), { once: true });
  box.append(img);
  return box;
}

/** "También lo cuentan: Xataka, Genbeta", con un link a cada versión. */
function alsoIn(story: Ranked, shown: Article, ctx: LayoutContext): HTMLElement | '' {
  const others = story.articles.filter((a) => a.id !== shown.id);
  if (others.length === 0) return '';
  const line = el('p', 'diario__also');
  line.append('También lo cuentan: ');
  others.forEach((a, i) => {
    if (i) line.append(', ');
    line.append(link(a, ctx.feedTitle(a.feedId)));
  });
  return line;
}

function byline(article: Article, ctx: LayoutContext): HTMLElement {
  return el('p', 'diario__byline', `${ctx.feedTitle(article.feedId)} · ${time.format(article.published)}`);
}

function opening(story: Ranked, ctx: LayoutContext): HTMLElement {
  const a = lead(story);
  const art = el('article', 'diario__lead');
  // Los títulos muy largos van un poco más chicos para no comerse la página.
  const h = el('h2', a.title.length > 90 ? 'diario__h1 diario__h1--long' : 'diario__h1');
  h.append(link(a, a.title));
  art.append(kicker(story, ctx), h);
  const p = photo(a, 'diario__photo--lead');
  if (p) art.append(p);
  const text = el('div', 'diario__text diario__text--cols');
  // La letra capital queda rara si el texto empieza con comillas: se las sacamos.
  const body = el('p', 'diario__dropcap', (a.summary || a.title).replace(/^[\s"'“”‘’«»]+/, ''));
  text.append(body);
  art.append(text, byline(a, ctx));
  const also = alsoIn(story, a, ctx);
  if (also) art.append(also);
  art.append(link(a, 'Seguí leyendo →', 'diario__more'));
  return art;
}

function item(story: Ranked, ctx: LayoutContext, size: 'm' | 's', withPhoto: boolean): HTMLElement {
  const a = lead(story);
  const art = el('article', `diario__item diario__item--${size}`);
  const h = el('h3', 'diario__h2');
  h.append(link(a, a.title));
  art.append(kicker(story, ctx), h);
  if (withPhoto) {
    const p = photo(a, 'diario__photo--small');
    if (p) art.append(p);
  }
  if (a.summary) art.append(el('p', 'diario__text', a.summary));
  art.append(byline(a, ctx));
  const also = alsoIn(story, a, ctx);
  if (also) art.append(also);
  return art;
}

function ears(ctx: LayoutContext): [HTMLElement, HTMLElement] {
  const left = el('aside', 'diario__ear');
  left.append(el('p', 'diario__ear-title', 'Temas del día'));
  const topics = (ctx.topics ?? []).slice(0, 6).map((t) => t.label);
  left.append(el('p', undefined, topics.length ? topics.join(' · ') : 'Sin temas todavía.'));

  const right = el('aside', 'diario__ear');
  right.append(el('p', 'diario__ear-title', 'La rutina'));
  const routine = (ctx.routine ?? []).map((g) => `${g.kind.label} (${g.articles.length})`);
  right.append(el('p', undefined, routine.length ? routine.join(' · ') : 'Nada de rutina hoy.'));
  return [left, right];
}

export function diario(stories: Ranked[], ctx: LayoutContext): HTMLElement {
  const page = el('div', 'diario papel');
  const number = ctx.page ?? 1;
  const date = editionDate.format(Date.now());
  const pageInfo = ctx.pages && ctx.pages > 1 ? ` · página ${number} de ${ctx.pages}` : '';

  if (number === 1) {
    const head = el('header', 'diario__head');
    const [left, right] = ears(ctx);
    const plate = el('div', 'diario__plate');
    plate.append(renderBanner(READER_NAME, window.innerWidth < 640));
    head.append(left, plate, right);
    page.append(head);
  } else {
    // Las páginas interiores llevan un cabezal chico, como en un diario.
    const head = el('header', 'diario__head diario__head--inner');
    head.append(el('p', 'diario__inner-name', READER_NAME));
    page.append(head);
  }
  const folio = el(
    'p',
    'diario__folio',
    `${date.charAt(0).toUpperCase()}${date.slice(1)} · ${ctx.label ?? 'todas las fuentes'}${pageInfo}`,
  );
  page.append(folio);
  // El menú de fuentes como la barra de secciones de un diario.
  if (ctx.filters) {
    const bar = el('div', 'diario__sections');
    bar.append(ctx.filters);
    page.append(bar);
  }

  const [first, ...rest] = stories;
  if (!first) {
    page.append(el('p', 'diario__empty', 'Todavía no hay historias para esta edición.'));
    return page;
  }

  const shown = new Set<string>([first.key]);
  const front = el('section', 'diario__front');
  front.append(opening(first, ctx));
  const side = el('div', 'diario__side');
  rest.slice(0, 3).forEach((s, i) => {
    side.append(item(s, ctx, 'm', i === 0));
    shown.add(s.key);
  });
  front.append(side);
  page.append(front);

  const second = rest.slice(3, 7);
  if (second.length) {
    const row = el('section', 'diario__row');
    for (const s of second) {
      row.append(item(s, ctx, 's', true));
      shown.add(s.key);
    }
    page.append(row);
  }

  // Secciones: las etiquetas como en un diario ("Tecnología", "Medios"…), si hay más de una.
  if (ctx.sectionsOf) {
    const bySection = new Map<string, Ranked[]>();
    for (const s of rest) {
      if (shown.has(s.key)) continue;
      const name = ctx.sectionsOf(s)[0];
      if (!name) continue;
      bySection.set(name, [...(bySection.get(name) ?? []), s]);
    }
    const sections = [...bySection.entries()].filter(([, list]) => list.length >= 2);
    if (sections.length > 1) {
      for (const [name, list] of sections.slice(0, 4)) {
        const sec = el('section', 'diario__section');
        sec.append(el('h2', 'diario__section-title', name));
        const row = el('div', 'diario__row diario__row--plain');
        for (const s of list.slice(0, 4)) {
          row.append(item(s, ctx, 's', false));
          shown.add(s.key);
        }
        sec.append(row);
        page.append(sec);
      }
    }
  }

  const briefs = rest.filter((s) => !shown.has(s.key));
  if (briefs.length) {
    const sec = el('section', 'diario__section');
    sec.append(el('h2', 'diario__section-title', 'Breves'));
    const list = el('ul', 'diario__briefs');
    for (const s of briefs) {
      const a = lead(s);
      const li = el('li');
      const mark = sharedMark(s);
      if (mark) li.append(mark, ' ');
      li.append(link(a, a.title, 'diario__brief-title'));
      li.append(el('span', 'diario__byline', ` ${ctx.feedTitle(a.feedId)}${s.feedIds.size > 1 ? ` y ${s.feedIds.size - 1} más` : ''}`));
      list.append(li);
    }
    sec.append(list);
    page.append(sec);
  }
  return page;
}
