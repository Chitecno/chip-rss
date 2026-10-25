import { listArticles, listFeeds, listTags, type Article, type Feed, type Tag } from '../db/db';
import { el, plural } from '../ui/dom';
import { LAYOUTS, renderLayout } from './layouts';
import { rankStories, type Topic, type Weights } from './relevance';
import { ROUTINE, type RoutineGroup } from './routine';
import { routineBox } from './routine-box';
import { groupStories, type Story } from './stories';
import { loadSettings, saveSettings, sectionsFor, selectEdition, type Selection } from './edition';
import { tokenize } from './text';
import './lab.css';

const WEIGHT_LABELS: [keyof Weights, string, string][] = [
  ['cobertura', 'cobertura', 'cuántas fuentes cuentan la historia'],
  ['recencia', 'recencia', 'qué tan nueva es'],
  ['principal', 'principales', 'si la cuenta una fuente principal'],
  ['volumen', 'volumen', 'baja a las fuentes que publican muchísimo'],
  ['temas', 'temas del día', 'si habla de lo que más aparece hoy'],
];

function range(label: string, hint: string, value: number, min: number, max: number, step: number, onInput: (v: number) => void) {
  const row = el('label', 'lab-range');
  const name = el('span', 'lab-range__name', label);
  const input = el('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const out = el('output', 'lab-range__value', String(value));
  input.addEventListener('input', () => {
    out.textContent = input.value;
    onInput(Number(input.value));
  });
  row.append(name, input, out, el('span', 'lab-range__hint web-small muted', hint));
  return row;
}

function checkbox(label: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const row = el('label', 'check');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.addEventListener('change', () => onChange(box.checked));
  row.append(box, document.createTextNode(` ${label}`));
  return row;
}

/** Laboratorio: probar formas de agrupar, ordenar y mostrar sin tocar la portada. */
export function createLab(): HTMLElement {
  const view = el('section', 'lab');
  const settings = loadSettings();
  let termFilter: Topic | null = null;

  const h1 = el('h1', 'web-title', 'Laboratorio');
  h1.tabIndex = -1;
  const intro = el(
    'p',
    'muted',
    'Pruebas para agrupar las notas que cuentan lo mismo, ordenarlas por relevancia y mostrarlas de otras formas. La pantalla de leer no cambia.',
  );

  const sourceNav = el('nav', 'chips');
  sourceNav.setAttribute('aria-label', 'Qué fuentes mirar');
  const layoutNav = el('nav', 'chips');
  layoutNav.setAttribute('aria-label', 'Presentación');

  const controls = el('details', 'lab-controls');
  controls.append(el('summary', 'term-button', '[ ajustar relevancia y agrupado ]'));
  const controlsBody = el('div', 'lab-controls__body');
  controls.append(controlsBody);

  const stats = el('p', 'band');
  const note = el('p', 'web-small muted');
  const cloudTitle = el('h2', 'section-title', 'temas del día');
  const cloud = el('div', 'lab-cloud');
  const filterLine = el('p', 'web-small');
  const routineSlot = el('div');
  const output = el('div', 'lab-output');
  view.append(h1, intro, sourceNav, layoutNav, controls, stats, note, cloudTitle, cloud, filterLine, routineSlot, output);

  let feeds: Feed[] = [];
  let tags: Tag[] = [];
  let allArticles: Article[] = [];

  // Lo que se recalcula cuando cambian las fuentes elegidas o la rutina.
  let selection: (Selection & { key: string }) | null = null;
  let grouped: { key: string; stories: Story[] } | null = null;

  const feedTitle = (id: string) => feeds.find((f) => f.id === id)?.title ?? '';

  function select() {
    const key = `${settings.filter}|${settings.routineApart}|${settings.windowHours}`;
    if (selection?.key === key) return selection;
    selection = { key, ...selectEdition(feeds, tags, allArticles, settings.filter, settings.routineApart, settings.windowHours) };
    grouped = null;
    return selection;
  }

  function invalidate() {
    selection = null;
    grouped = null;
    termFilter = null;
  }

  function chip(label: string, active: boolean, onClick: () => void): HTMLButtonElement {
    const b = el('button', 'chip', label);
    b.type = 'button';
    if (active) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', onClick);
    return b;
  }

  function renderSourceNav() {
    const pick = (filter: string) => () => {
      settings.filter = filter;
      saveSettings(settings);
      invalidate();
      renderSourceNav();
      renderCloud();
      draw();
    };
    sourceNav.replaceChildren(
      chip('todo', settings.filter === 'todo', pick('todo')),
      chip('* principales', settings.filter === 'principales', pick('principales')),
      ...tags.map((t) => chip(`#${t.name}`, settings.filter === t.id, pick(t.id))),
    );
  }

  function renderLayoutNav() {
    layoutNav.replaceChildren(
      ...LAYOUTS.map((l) =>
        chip(l.label, l.id === settings.layout, () => {
          settings.layout = l.id;
          saveSettings(settings);
          renderLayoutNav();
          draw();
        }),
      ),
    );
  }

  function renderControls() {
    controlsBody.replaceChildren(
      el('p', 'web-small muted', 'Cada peso va de 0 (no cuenta) a 2 (cuenta el doble).'),
      ...WEIGHT_LABELS.map(([key, label, hint]) =>
        range(label, hint, settings.weights[key], 0, 2, 0.5, (v) => {
          settings.weights[key] = v;
          saveSettings(settings);
          draw();
        }),
      ),
      el('p', 'web-small muted', 'Agrupado: qué tan parecidas tienen que ser dos notas para contar como la misma historia.'),
      range('parecido', 'más alto: agrupa menos, pero con más seguridad', settings.threshold, 0.1, 0.6, 0.05, (v) => {
        settings.threshold = v;
        saveSettings(settings);
        draw();
      }),
      range('ventana', 'horas máximas entre notas de una misma historia', settings.windowHours, 12, 96, 12, (v) => {
        settings.windowHours = v;
        saveSettings(settings);
        selection = null;
        draw();
      }),
      checkbox('mostrar por qué está cada historia', settings.showReasons, (v) => {
        settings.showReasons = v;
        saveSettings(settings);
        draw();
      }),
      checkbox('poner la rutina aparte (clima, dólar, horóscopo…)', settings.routineApart, (v) => {
        settings.routineApart = v;
        saveSettings(settings);
        invalidate();
        renderCloud();
        draw();
      }),
    );
    const words = el('details', 'lab-routine-words web-small');
    words.append(el('summary', 'muted', '[ qué cuenta como rutina ]'));
    const list = el('ul');
    for (const k of ROUTINE) list.append(el('li', 'muted', `${k.label}: ${k.words.join(', ')}`));
    words.append(list);
    controlsBody.append(words);
  }

  function renderCloud() {
    const { topics } = select();
    const max = Math.max(1, ...topics.map((t) => t.weight));
    cloud.replaceChildren(
      ...topics.map((t) => {
        const b = el('button', 'lab-word', t.label);
        b.type = 'button';
        b.dataset.level = String(Math.min(4, 1 + Math.floor((t.weight / max) * 4)));
        b.title = plural(t.feeds, 'fuente', 'fuentes');
        if (termFilter?.stem === t.stem) b.setAttribute('aria-pressed', 'true');
        b.addEventListener('click', () => {
          termFilter = termFilter?.stem === t.stem ? null : t;
          renderCloud();
          draw();
        });
        return b;
      }),
    );
    if (topics.length === 0) {
      cloud.append(el('p', 'muted web-small', 'Hace falta que varias de estas fuentes publiquen en los últimos días.'));
    }
  }

  function renderRoutine(routine: RoutineGroup[]) {
    routineSlot.replaceChildren(routineBox(routine, feedTitle));
  }

  function draw() {
    const sel = select();
    const groupKey = `${sel.key}|${settings.threshold}|${sel.windowHours}`;
    if (!grouped || grouped.key !== groupKey) {
      grouped = { key: groupKey, stories: groupStories(sel.news, { ...settings, windowHours: sel.windowHours }).stories };
    }
    let ranked = rankStories(grouped.stories, feeds, sel.topics, settings.weights, Date.now());

    filterLine.replaceChildren();
    if (termFilter) {
      const stem = termFilter.stem;
      ranked = ranked.filter((s) => s.articles.some((a) => tokenize(a.title).some((t) => t.stem === stem)));
      const clear = el('button', 'term-button', '[ x ]');
      clear.type = 'button';
      clear.setAttribute('aria-label', 'Sacar el filtro');
      clear.addEventListener('click', () => {
        termFilter = null;
        renderCloud();
        draw();
      });
      filterLine.append(`filtrando por: ${termFilter.label} `, clear);
    }

    const multi = grouped.stories.filter((s) => s.feedIds.size > 1).length;
    const routineCount = sel.routine.reduce((n, g) => n + g.articles.length, 0);
    stats.textContent =
      `${sel.label} · ${plural(sel.news.length + routineCount, 'nota', 'notas')} → ` +
      `${plural(grouped.stories.length, 'historia', 'historias')} · ${multi} con varias fuentes` +
      (routineCount ? ` · ${routineCount} de rutina aparte` : '');
    note.textContent =
      sel.windowHours > settings.windowHours
        ? `Estas fuentes publican poco: la ventana se agrandó a ${sel.windowHours} horas.`
        : '';
    if (sel.feeds.length === 0) note.textContent = 'Ninguna fuente tiene esta etiqueta todavía.';

    renderRoutine(sel.routine);
    output.replaceChildren(
      renderLayout(settings.layout, ranked, {
        feedTitle,
        showReasons: settings.showReasons,
        label: sel.label,
        topics: sel.topics,
        routine: sel.routine,
        sectionsOf: sectionsFor(feeds, tags),
      }),
    );
  }

  void (async () => {
    stats.textContent = 'armando historias…';
    [feeds, tags, allArticles] = await Promise.all([listFeeds(), listTags(), listArticles(undefined, 1200)]);
    if (settings.filter !== 'todo' && settings.filter !== 'principales' && !tags.some((t) => t.id === settings.filter)) {
      settings.filter = 'todo';
    }
    renderSourceNav();
    renderLayoutNav();
    renderControls();
    renderCloud();
    draw();
  })();

  return view;
}
