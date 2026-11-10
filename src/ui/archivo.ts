import {
  createSection,
  deleteSection,
  listSaved,
  listSections,
  putSaved,
  removeSaved,
  renameSection,
  SectionError,
  type Saved,
  type Section,
} from '../db/db';
import { button, el, plural, shortDate } from './dom';
import { shareButton } from './compartir';

/** Qué se mira en el archivo: todo, lo que no tiene sección, o una sección. */
export type ArchivoFilter = 'todo' | 'sin' | string;

export function archivoHref(filter: ArchivoFilter): string {
  return filter === 'todo' ? '#/archivo' : `#/archivo?s=${encodeURIComponent(filter)}`;
}

function textInput(value: string, label: string, placeholder = ''): HTMLInputElement {
  const input = el('input', 'text-input');
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.setAttribute('aria-label', label);
  return input;
}

function inlineForm(input: HTMLInputElement, submitLabel: string, onSubmit: () => void, extra?: HTMLElement) {
  const form = el('form', 'inline-form');
  const submit = el('button', 'term-button', submitLabel);
  submit.type = 'submit';
  form.append(input, submit);
  if (extra) form.append(extra);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onSubmit();
  });
  return form;
}

/** El archivo: las notas guardadas, organizadas en secciones. */
export function createArchivo(filter: ArchivoFilter, onChange: () => void): HTMLElement {
  const view = el('section', 'archivo');
  const h1 = el('h1', 'web-title', 'Archivo');
  h1.tabIndex = -1;
  const band = el('p', 'band');
  const nav = el('nav', 'chips');
  nav.setAttribute('aria-label', 'Secciones del archivo');
  const status = el('p', 'status web-small');
  status.setAttribute('role', 'status');
  const list = el('ul', 'archivo__list');
  const sectionsTitle = el('h2', 'section-title', 'secciones');
  const sectionsNew = el('div');
  const sectionsList = el('ul', 'tags__list');
  view.append(h1, band, nav, status, list, sectionsTitle, sectionsNew, sectionsList);

  let renaming: string | null = null;
  const say = (msg: string, kind: 'info' | 'error' = 'info') => {
    status.textContent = msg;
    status.dataset.kind = kind;
  };
  const changed = async () => {
    onChange();
    await render();
  };

  function savedRow(saved: Saved, sections: Section[]): HTMLElement {
    const li = el('li', 'archivo__item');
    const title = el('a', 'archivo__title', saved.title);
    title.href = `#/archivo/${saved.id}`;
    const meta = el('p', 'archivo__meta web-small', `${saved.feedTitle} · ${shortDate.format(saved.published)}`);

    const actions = el('div', 'archivo__actions web-small');
    const label = el('label', 'archivo__move');
    label.append('sección: ');
    const select = el('select', 'archivo__select');
    select.setAttribute('aria-label', `Sección de ${saved.title}`);
    const none = el('option', undefined, 'sin sección');
    none.value = '';
    select.append(none);
    for (const s of sections) {
      const option = el('option', undefined, s.name);
      option.value = s.id;
      select.append(option);
    }
    select.value = saved.sectionId ?? '';
    select.addEventListener('change', async () => {
      await putSaved({ ...saved, sectionId: select.value || null });
      say(`moví "${saved.title}"`);
      await changed();
    });
    label.append(select);

    const remove = button('[ quitar ]', 'term-button');
    remove.setAttribute('aria-label', `Quitar de guardados: ${saved.title}`);
    remove.addEventListener('click', async () => {
      await removeSaved(saved.id);
      say(`quité "${saved.title}" del archivo`);
      await changed();
    });
    actions.append(label, shareButton(saved.title, saved.link), remove);
    li.append(title, meta, actions);
    return li;
  }

  function sectionRow(section: Section, count: number): HTMLElement {
    const row = el('li', 'tag-row');
    if (renaming === section.id) {
      const input = textInput(section.name, `Nuevo nombre para ${section.name}`);
      const cancel = button('[ cancelar ]', 'term-button muted');
      cancel.addEventListener('click', () => {
        renaming = null;
        void render();
      });
      row.append(
        inlineForm(
          input,
          '[ guardar ]',
          async () => {
            try {
              await renameSection(section.id, input.value);
              renaming = null;
              await changed();
            } catch (err) {
              say(err instanceof SectionError ? err.message : 'no pude renombrarla', 'error');
            }
          },
          cancel,
        ),
      );
      queueMicrotask(() => input.select());
      return row;
    }
    const name = el('span', undefined, `${section.name} `);
    name.append(el('span', 'muted', `(${plural(count, 'nota', 'notas')})`));
    const actions = el('span', 'fuente__actions web-small');
    const rename = button('[ renombrar ]', 'term-button');
    rename.addEventListener('click', () => {
      renaming = section.id;
      void render();
    });
    const remove = button('[ borrar ]', 'term-button');
    remove.setAttribute('aria-label', `Borrar la sección ${section.name}`);
    remove.addEventListener('click', async () => {
      if (!confirm(`¿Borrar la sección "${section.name}"? Las notas no se borran: quedan sin sección.`)) return;
      await deleteSection(section.id);
      say(`borré la sección "${section.name}"`);
      if (filter === section.id) location.hash = archivoHref('todo');
      else await changed();
    });
    actions.append(rename, remove);
    row.append(name, actions);
    return row;
  }

  async function render(): Promise<void> {
    const [saved, sections] = await Promise.all([listSaved(), listSections()]);
    const count = (sectionId: string | null) => saved.filter((s) => s.sectionId === sectionId).length;
    const current = sections.find((s) => s.id === filter);

    band.textContent = `${plural(saved.length, 'nota guardada', 'notas guardadas')} · ${plural(sections.length, 'sección', 'secciones')}`;

    const chip = (label: string, value: ArchivoFilter, active: boolean) => {
      const a = el('a', 'chip', label);
      a.href = archivoHref(value);
      if (active) a.setAttribute('aria-current', 'true');
      return a;
    };
    nav.replaceChildren(
      chip(`todo (${saved.length})`, 'todo', filter === 'todo' || (!current && filter !== 'sin')),
      chip(`sin sección (${count(null)})`, 'sin', filter === 'sin'),
      ...sections.map((s) => chip(`${s.name} (${count(s.id)})`, s.id, s.id === filter)),
    );

    const shown = filter === 'sin' ? saved.filter((s) => !s.sectionId) : current ? saved.filter((s) => s.sectionId === current.id) : saved;
    list.replaceChildren(...shown.map((s) => savedRow(s, sections)));
    if (saved.length === 0) {
      list.append(el('li', 'muted', 'Todavía no guardaste notas. Tocá [+] guardar en cualquier nota para que aparezca acá.'));
    } else if (shown.length === 0) {
      list.append(el('li', 'muted', 'No hay notas en esta sección.'));
    }

    const newSection = textInput('', 'Nueva sección', 'para leer después');
    sectionsNew.replaceChildren(
      inlineForm(newSection, '[ crear ]', async () => {
        try {
          const s = await createSection(newSection.value);
          say(`creé la sección "${s.name}"`);
          await changed();
        } catch (err) {
          say(err instanceof SectionError ? err.message : 'no pude crearla', 'error');
        }
      }),
    );
    sectionsList.replaceChildren(...sections.map((s) => sectionRow(s, count(s.id))));
    if (sections.length === 0) sectionsList.append(el('li', 'muted web-small', 'Todavía no hay secciones.'));
  }

  void render();
  return view;
}
