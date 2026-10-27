import {
  createSection,
  listSaved,
  listSections,
  removeSaved,
  saveArticleCopy,
  SectionError,
  type Article,
  type Saved,
  type Section,
} from '../db/db';
import { button, el } from './dom';
import { ICONO_GUARDAR } from './iconos';
import { attachMenu } from './menu';
import './guardar.css';

/** Qué notas están guardadas y en qué secciones. Se carga una vez por pantalla. */
export type SaveState = {
  byArticle: Map<string, Saved>;
  sections: Section[];
  /** Avisa que cambió el archivo (para que otras pantallas se vuelvan a armar). */
  onChange: () => void;
};

export async function loadSaveState(onChange: () => void): Promise<SaveState> {
  const [saved, sections] = await Promise.all([listSaved(), listSections()]);
  return { byArticle: new Map(saved.map((s) => [s.articleId, s])), sections, onChange };
}

/**
 * El botón de guardar de una nota (con el disquete). Abre un menú para elegir en qué sección
 * del archivo va; si ya está guardada, para moverla o sacarla.
 */
export function saveButton(article: Article, feedTitle: string, state: SaveState, compact = false): HTMLElement {
  const wrap = el('span', 'guardar');
  const trigger = button('', `term-button guardar__boton${compact ? ' guardar__boton--chico' : ''}`);

  const paint = () => {
    const saved = state.byArticle.get(article.id);
    trigger.innerHTML = `${ICONO_GUARDAR}${compact ? (saved ? '<span aria-hidden="true">✓</span>' : '') : `<span>${saved ? 'guardada' : 'guardar'}</span>`}`;
    trigger.setAttribute('aria-label', saved ? `Guardada: ${article.title}. Mover o quitar` : `Guardar: ${article.title}`);
    trigger.title = saved ? 'Guardada en el archivo' : 'Guardar en el archivo';
    trigger.classList.toggle('guardar__boton--activo', Boolean(saved));
  };
  paint();

  attachMenu(wrap, trigger, (close) => {
    const current = state.byArticle.get(article.id);
    const done = () => {
      state.onChange();
      paint();
      close();
      trigger.focus();
    };
    const saveIn = async (sectionId: string | null) => {
      state.byArticle.set(article.id, await saveArticleCopy(article, feedTitle, sectionId));
      done();
    };

    const menu = el('div', 'guardar__menu');
    menu.setAttribute('role', 'group');
    menu.setAttribute('aria-label', 'Guardar en el archivo');
    menu.append(el('p', 'menu__titulo', current ? 'mover a:' : 'guardar en:'));

    const option = (label: string, sectionId: string | null) => {
      const isHere = Boolean(current) && current!.sectionId === sectionId;
      const b = button(`${isHere ? '> ' : '  '}${label}`, 'term-button menu__opcion');
      if (isHere) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => void saveIn(sectionId));
      return b;
    };
    menu.append(option('sin sección', null), ...state.sections.map((s) => option(s.name, s.id)));

    // Crear una sección nueva ahí mismo.
    const form = el('form', 'guardar__nueva');
    const input = el('input', 'text-input');
    input.type = 'text';
    input.placeholder = 'nueva sección';
    input.setAttribute('aria-label', 'Nombre de la nueva sección');
    const create = el('button', 'term-button', '[ crear ]');
    create.type = 'submit';
    const error = el('p', 'guardar__error');
    form.append(input, create, error);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const section = await createSection(input.value);
        state.sections = [...state.sections, section].sort((a, b) => a.name.localeCompare(b.name, 'es'));
        await saveIn(section.id);
      } catch (err) {
        error.textContent = err instanceof SectionError ? err.message : 'no pude crearla';
      }
    });
    menu.append(form);

    if (current) {
      const remove = button('[ quitar de guardados ]', 'term-button guardar__quitar');
      remove.addEventListener('click', async () => {
        await removeSaved(current.id);
        state.byArticle.delete(article.id);
        done();
      });
      menu.append(remove);
    }
    return menu;
  });

  wrap.append(trigger);
  return wrap;
}
