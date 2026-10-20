import {
  createTag,
  deleteTag,
  getFeed,
  listFeeds,
  listTags,
  removeFeed,
  renameTag,
  saveFeed,
  TagError,
  type Feed,
  type Tag,
} from '../db/db';
import { addFeedFromInput } from '../feeds/refresh';
import { button, el, plural } from './dom';

type State = {
  editing: string | null; // fuente con el editor de etiquetas abierto
  renaming: string | null; // fuente que se está renombrando
  renamingTag: string | null;
};

function textInput(value: string, label: string, placeholder = ''): HTMLInputElement {
  const input = el('input', 'text-input');
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', label);
  return input;
}

/** Un formulario de una línea: campo + botón, que también se manda con Enter. */
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

/** Pantalla de gestión: agregar fuentes, principal o secundaria, etiquetas, renombrar, quitar. */
export function createFuentes(onChange: () => void): HTMLElement {
  const view = el('section', 'fuentes');
  view.innerHTML = `
    <h1 class="web-title" tabindex="-1">Tus fuentes</h1>
    <form class="add-feed" novalidate>
      <label class="add-feed__label" for="feed-url">&gt; pegá la dirección de un medio o de su feed</label>
      <div class="inline-form">
        <input id="feed-url" class="text-input" type="text" inputmode="url" autocomplete="off"
          autocapitalize="off" spellcheck="false" placeholder="pagina12.com.ar" />
        <button type="submit" class="term-button">[ agregar ]</button>
      </div>
    </form>
    <p class="status web-small" role="status" aria-live="polite"></p>
    <p class="band"></p>
    <ul class="fuentes__list"></ul>
    <h2 class="section-title">etiquetas</h2>
    <div class="tags__new"></div>
    <ul class="tags__list"></ul>
  `;

  const addForm = view.querySelector<HTMLFormElement>('.add-feed')!;
  const addInput = addForm.querySelector<HTMLInputElement>('input')!;
  const addButton = addForm.querySelector<HTMLButtonElement>('button')!;
  const status = view.querySelector<HTMLElement>('.status')!;
  const band = view.querySelector<HTMLElement>('.band')!;
  const list = view.querySelector<HTMLElement>('.fuentes__list')!;
  const tagsNew = view.querySelector<HTMLElement>('.tags__new')!;
  const tagsList = view.querySelector<HTMLElement>('.tags__list')!;

  const state: State = { editing: null, renaming: null, renamingTag: null };

  const say = (msg: string, kind: 'info' | 'error' = 'info') => {
    status.textContent = msg;
    status.dataset.kind = kind;
  };

  const changed = async (focusKey?: string) => {
    onChange();
    await render(focusKey);
  };

  // Para cambios chicos sobre una fuente: la leemos fresca, la modificamos y la guardamos.
  const updateFeed = async (id: string, change: (f: Feed) => Feed, focusKey?: string) => {
    const feed = await getFeed(id);
    if (!feed) return;
    await saveFeed(change(feed));
    await changed(focusKey);
  };

  function feedRow(feed: Feed, tags: Tag[]): HTMLElement {
    const row = el('li', 'fuente');
    const names = new Map(tags.map((t) => [t.id, t.name]));

    // Nombre (o el campo para renombrar) + principal
    const head = el('div', 'fuente__head');
    if (state.renaming === feed.id) {
      const input = textInput(feed.title, `Nuevo nombre para ${feed.title}`);
      const cancel = button('[ cancelar ]', 'term-button muted');
      cancel.addEventListener('click', () => {
        state.renaming = null;
        void render(`rename-${feed.id}`);
      });
      head.append(
        inlineForm(input, '[ guardar ]', () => {
          const title = input.value.trim();
          if (!title) return say('el nombre no puede quedar vacío', 'error');
          state.renaming = null;
          void updateFeed(feed.id, (f) => ({ ...f, title }), `rename-${feed.id}`);
        }, cancel),
      );
      queueMicrotask(() => input.select());
    } else {
      const name = el('a', 'fuente__name', feed.title);
      name.href = feed.siteUrl;
      name.target = '_blank';
      name.rel = 'noopener noreferrer';
      head.append(name);
    }
    const principal = button(feed.principal ? '[*] principal' : '[ ] principal', 'term-button toggle', `principal-${feed.id}`);
    principal.setAttribute('aria-pressed', String(feed.principal));
    principal.setAttribute('aria-label', `${feed.title}: fuente principal`);
    principal.addEventListener('click', () =>
      updateFeed(feed.id, (f) => ({ ...f, principal: !f.principal }), `principal-${feed.id}`),
    );
    head.append(principal);
    row.append(head);

    const tagNames = feed.tagIds.map((id) => names.get(id)).filter(Boolean);
    row.append(el('p', 'fuente__tags web-small', tagNames.length ? tagNames.map((n) => `#${n}`).join(' ') : 'sin etiquetas'));
    if (feed.lastError) row.append(el('p', 'fuente__error web-small', `! ${feed.lastError}`));

    // Acciones
    const actions = el('div', 'fuente__actions web-small');
    const editTags = button(state.editing === feed.id ? '[ listo ]' : '[ etiquetas ]', 'term-button', `tags-${feed.id}`);
    editTags.setAttribute('aria-expanded', String(state.editing === feed.id));
    editTags.addEventListener('click', () => {
      state.editing = state.editing === feed.id ? null : feed.id;
      void render(`tags-${feed.id}`);
    });
    const rename = button('[ renombrar ]', 'term-button', `rename-${feed.id}`);
    rename.addEventListener('click', () => {
      state.renaming = feed.id;
      void render();
    });
    const remove = button('[ quitar ]', 'term-button');
    remove.setAttribute('aria-label', `Quitar ${feed.title}`);
    remove.addEventListener('click', async () => {
      if (!confirm(`¿Quitar "${feed.title}" y sus artículos?`)) return;
      await removeFeed(feed.id);
      say(`quité ${feed.title}`);
      await changed();
    });
    actions.append(editTags, rename, remove);
    row.append(actions);

    // Editor de etiquetas
    if (state.editing === feed.id) {
      const editor = el('fieldset', 'fuente__editor');
      editor.append(el('legend', 'web-small muted', `etiquetas de ${feed.title}`));
      for (const tag of tags) {
        const label = el('label', 'check');
        const box = el('input');
        box.type = 'checkbox';
        box.checked = feed.tagIds.includes(tag.id);
        box.dataset.key = `check-${feed.id}-${tag.id}`;
        box.addEventListener('change', () =>
          updateFeed(
            feed.id,
            (f) => ({
              ...f,
              tagIds: box.checked ? [...new Set([...f.tagIds, tag.id])] : f.tagIds.filter((t) => t !== tag.id),
            }),
            `check-${feed.id}-${tag.id}`,
          ),
        );
        label.append(box, document.createTextNode(` #${tag.name}`));
        editor.append(label);
      }
      const input = textInput('', 'Nueva etiqueta', tags.length ? 'nueva etiqueta' : 'medios');
      editor.append(
        inlineForm(input, '[ crear y sumar ]', async () => {
          try {
            const tag = await createTag(input.value);
            await updateFeed(feed.id, (f) => ({ ...f, tagIds: [...f.tagIds, tag.id] }), `check-${feed.id}-${tag.id}`);
            say(`sumé #${tag.name} a ${feed.title}`);
          } catch (err) {
            say(err instanceof TagError ? err.message : 'no pude crear la etiqueta', 'error');
          }
        }),
      );
      row.append(editor);
    }
    return row;
  }

  function tagRow(tag: Tag, count: number): HTMLElement {
    const row = el('li', 'tag-row');
    if (state.renamingTag === tag.id) {
      const input = textInput(tag.name, `Nuevo nombre para #${tag.name}`);
      const cancel = button('[ cancelar ]', 'term-button muted');
      cancel.addEventListener('click', () => {
        state.renamingTag = null;
        void render(`tag-rename-${tag.id}`);
      });
      row.append(
        inlineForm(input, '[ guardar ]', async () => {
          try {
            await renameTag(tag.id, input.value);
            state.renamingTag = null;
            await changed(`tag-rename-${tag.id}`);
          } catch (err) {
            say(err instanceof TagError ? err.message : 'no pude renombrarla', 'error');
          }
        }, cancel),
      );
      queueMicrotask(() => input.select());
      return row;
    }
    const name = el('span', undefined, `#${tag.name} `);
    name.append(el('span', 'muted', `(${plural(count, 'fuente', 'fuentes')})`));
    const actions = el('span', 'fuente__actions web-small');
    const rename = button('[ renombrar ]', 'term-button', `tag-rename-${tag.id}`);
    rename.addEventListener('click', () => {
      state.renamingTag = tag.id;
      void render();
    });
    const remove = button('[ borrar ]', 'term-button');
    remove.setAttribute('aria-label', `Borrar #${tag.name}`);
    remove.addEventListener('click', async () => {
      if (!confirm(`¿Borrar #${tag.name}? Las fuentes no se borran, solo pierden la etiqueta.`)) return;
      await deleteTag(tag.id);
      say(`borré #${tag.name}`);
      await changed();
    });
    actions.append(rename, remove);
    row.append(name, actions);
    return row;
  }

  async function render(focusKey?: string): Promise<void> {
    const [feeds, tags] = await Promise.all([listFeeds(), listTags()]);
    const principales = feeds.filter((f) => f.principal).length;
    band.textContent =
      feeds.length === 0
        ? 'Todavía no hay fuentes.'
        : `${plural(feeds.length, 'fuente', 'fuentes')} · ${plural(principales, 'principal', 'principales')}`;
    list.replaceChildren(...feeds.map((f) => feedRow(f, tags)));

    const newTag = textInput('', 'Nueva etiqueta', 'tecnopolítica');
    tagsNew.replaceChildren(
      inlineForm(newTag, '[ crear ]', async () => {
        try {
          const tag = await createTag(newTag.value);
          say(`creé #${tag.name}`);
          await changed();
        } catch (err) {
          say(err instanceof TagError ? err.message : 'no pude crear la etiqueta', 'error');
        }
      }),
    );
    tagsList.replaceChildren(
      ...tags.map((t) => tagRow(t, feeds.filter((f) => f.tagIds.includes(t.id)).length)),
    );
    if (tags.length === 0) tagsList.append(el('li', 'muted web-small', 'Todavía no hay etiquetas.'));

    if (focusKey) view.querySelector<HTMLElement>(`[data-key="${focusKey}"]`)?.focus();
  }

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!addInput.value.trim()) return say('pegá una dirección primero', 'error');
    addButton.disabled = true;
    try {
      const result = await addFeedFromInput(addInput.value, (msg) => say(`${msg}…`));
      addInput.value = '';
      if (result.existed) {
        say(`${result.feed.title} ya estaba en tus fuentes`);
      } else {
        // Recién agregada: abrimos sus etiquetas para acomodarla ahí mismo.
        state.editing = result.feed.id;
        say(`listo: sumé ${result.feed.title} (${plural(result.added, 'artículo', 'artículos')}). Elegí si es principal y qué etiquetas lleva.`);
      }
      await changed(`principal-${result.feed.id}`);
    } catch (err) {
      say(err instanceof Error ? err.message : 'algo salió mal', 'error');
    } finally {
      addButton.disabled = false;
    }
  });

  void render();
  return view;
}
