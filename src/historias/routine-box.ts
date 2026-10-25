import { el, plural } from '../ui/dom';
import type { RoutineGroup } from './routine';

/** La caja "la rutina del día": una línea por tema que se despliega con sus notas. */
export function routineBox(routine: RoutineGroup[], feedTitle: (id: string) => string): HTMLElement {
  const box = el('section', 'lab-routine');
  if (routine.length === 0) return box;
  box.append(el('h2', 'section-title', 'la rutina del día'));
  const list = el('ul', 'lab-routine__list');
  for (const g of routine) {
    const item = el('li');
    const details = el('details');
    details.append(el('summary', undefined, `${g.kind.label} · ${plural(g.articles.length, 'nota', 'notas')}`));
    const inner = el('ul', 'lab-routine__items web-small');
    for (const a of g.articles) {
      const li = el('li');
      li.append(el('span', 'muted', `${feedTitle(a.feedId)}: `));
      const link = el('a', undefined, a.title);
      link.href = `#/nota/${a.id}`;
      li.append(link);
      inner.append(li);
    }
    details.append(inner);
    item.append(details);
    list.append(item);
  }
  box.append(list);
  return box;
}
