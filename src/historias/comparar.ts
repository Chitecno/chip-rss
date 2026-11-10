import type { Article } from '../db/db';
import { el } from '../ui/dom';
import './comparar.css';

/**
 * "Cómo lo cuenta cada fuente": una línea por medio, con su título, para comparar de un vistazo.
 * Si un medio trae varias notas de la misma historia, va la más reciente.
 */

export type StoryLike = { articles: Article[] };

/** Una nota por fuente, la más reciente de cada una. */
export function onePerFeed(articles: Article[]): Article[] {
  const byFeed = new Map<string, Article>();
  for (const a of articles) {
    const seen = byFeed.get(a.feedId);
    if (!seen || a.published > seen.published) byFeed.set(a.feedId, a);
  }
  return [...byFeed.values()];
}

/**
 * La lista de comparación. `shown` es la nota que ya se está mostrando: su fuente queda afuera
 * (o marcada, con `markShown`). Con `max`, muestra hasta esa cantidad y avisa cuántas quedan.
 */
export function compareList(
  story: StoryLike,
  shown: Article,
  feedTitle: (id: string) => string,
  options: { max?: number; markShown?: boolean; className?: string } = {},
): HTMLElement | '' {
  const { max = Infinity, markShown = false, className = '' } = options;
  const all = onePerFeed(story.articles);
  const list = markShown ? all : all.filter((a) => a.feedId !== shown.feedId);
  if (list.length === 0 || (markShown && list.length < 2)) return '';

  const box = el('div', `comparar ${className}`.trim());
  box.append(el('p', 'comparar__titulo', markShown ? 'Cómo lo cuenta cada fuente' : 'También lo cuentan'));
  const ul = el('ul', 'comparar__lista');
  for (const a of list.slice(0, max)) {
    const li = el('li');
    li.append(el('span', 'comparar__fuente', feedTitle(a.feedId)));
    if (markShown && a.feedId === shown.feedId) {
      li.append(el('span', 'comparar__nota comparar__nota--actual', a.title));
      li.append(el('span', 'comparar__aca', ' (estás leyendo esta)'));
    } else {
      const link = el('a', 'comparar__nota', a.title);
      link.href = `#/nota/${a.id}`;
      li.append(link);
    }
    ul.append(li);
  }
  box.append(ul);
  if (list.length > max) box.append(el('p', 'comparar__mas', `y ${list.length - max} más`));
  return box;
}
