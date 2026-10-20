import { listArticles, listFeeds, type Article, type Feed } from '../db/db';
import { el, plural } from '../ui/dom';
import { LAYOUTS, renderLayout, type LayoutName } from './layouts';
import { DEFAULT_WEIGHTS, rankStories, topicsOfTheDay, type Topic, type Weights } from './relevance';
import { groupStories, type GroupOptions, type Story } from './stories';
import { tokenize } from './text';
import './lab.css';

type Settings = GroupOptions & { layout: LayoutName; weights: Weights; showReasons: boolean };

const DEFAULTS: Settings = {
  layout: 'tapa',
  threshold: 0.25,
  windowHours: 48,
  weights: DEFAULT_WEIGHTS,
  showReasons: true,
};

const STORAGE_KEY = 'chip-rss:lab';

// Los ajustes del laboratorio se recuerdan en este navegador. Si no se puede, se usan los de siempre.
function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>;
    return { ...DEFAULTS, ...saved, weights: { ...DEFAULT_WEIGHTS, ...saved.weights } };
  } catch {
    return { ...DEFAULTS, weights: { ...DEFAULT_WEIGHTS } };
  }
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // sin almacenamiento: los ajustes duran hasta que cierres la pestaña
  }
}

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

  const layoutNav = el('nav', 'chips');
  layoutNav.setAttribute('aria-label', 'Presentación');

  const controls = el('details', 'lab-controls');
  controls.append(el('summary', 'term-button', '[ ajustar relevancia y agrupado ]'));
  const controlsBody = el('div', 'lab-controls__body');
  controls.append(controlsBody);

  const stats = el('p', 'band');
  const cloudTitle = el('h2', 'section-title', 'temas del día');
  const cloud = el('div', 'lab-cloud');
  const filterLine = el('p', 'web-small');
  const output = el('div', 'lab-output');
  view.append(h1, intro, layoutNav, controls, stats, cloudTitle, cloud, filterLine, output);

  let feeds: Feed[] = [];
  let articles: Article[] = [];
  let grouped: { key: string; stories: Story[] } | null = null;
  let topics: Topic[] = [];

  const feedTitle = (id: string) => feeds.find((f) => f.id === id)?.title ?? '';

  function renderLayoutNav() {
    layoutNav.replaceChildren(
      ...LAYOUTS.map((l) => {
        const b = el('button', 'chip', l.label);
        b.type = 'button';
        if (l.id === settings.layout) b.setAttribute('aria-current', 'true');
        b.addEventListener('click', () => {
          settings.layout = l.id;
          saveSettings(settings);
          renderLayoutNav();
          draw();
        });
        return b;
      }),
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
        draw();
      }),
    );
    const reasonsToggle = el('label', 'check');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = settings.showReasons;
    box.addEventListener('change', () => {
      settings.showReasons = box.checked;
      saveSettings(settings);
      draw();
    });
    reasonsToggle.append(box, document.createTextNode(' mostrar por qué está cada historia'));
    controlsBody.append(reasonsToggle);
  }

  function renderCloud() {
    const max = Math.max(1, ...topics.map((t) => t.weight));
    cloud.replaceChildren(
      ...topics.map((t) => {
        const b = el('button', 'lab-word', t.label);
        b.type = 'button';
        const level = Math.min(4, 1 + Math.floor((t.weight / max) * 4));
        b.dataset.level = String(level);
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
    if (topics.length === 0) cloud.append(el('p', 'muted web-small', 'Hace falta que varias fuentes publiquen en las últimas 24 horas.'));
  }

  function draw() {
    const key = `${settings.threshold}|${settings.windowHours}`;
    if (!grouped || grouped.key !== key) grouped = { key, stories: groupStories(articles, settings).stories };
    const now = Date.now();
    let ranked = rankStories(grouped.stories, feeds, topics, settings.weights, now);

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
    stats.textContent = `${plural(articles.length, 'nota', 'notas')} → ${plural(grouped.stories.length, 'historia', 'historias')} · ${plural(multi, 'con varias fuentes', 'con varias fuentes')}`;
    output.replaceChildren(renderLayout(settings.layout, ranked, { feedTitle, showReasons: settings.showReasons }));
  }

  void (async () => {
    stats.textContent = 'armando historias…';
    [feeds, articles] = await Promise.all([listFeeds(), listArticles(undefined, 800)]);
    topics = topicsOfTheDay(articles, Date.now());
    renderLayoutNav();
    renderControls();
    renderCloud();
    draw();
  })();

  return view;
}
