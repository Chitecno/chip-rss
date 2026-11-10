import type { Article } from '../db/db';
import { saveButton, type SaveState } from './guardar';
import { shareButton } from './compartir';
import { el } from './dom';

/** Lo que se puede hacer con una nota, a mano: guardarla y compartirla. */
export function noteActions(article: Article, feedTitle: string, state: SaveState, compact = false): HTMLElement {
  const actions = el('span', `acciones${compact ? ' acciones--chico' : ''}`);
  actions.append(saveButton(article, feedTitle, state, compact), shareButton(article.title, article.link, compact));
  return actions;
}
