import { exportOpml, importOpml, OpmlError } from '../opml/opml';
import { button, el, plural } from './dom';

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Baja un archivo sin salir de la app. */
function download(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/x-opml;charset=utf-8' }));
  const a = el('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Ajustes: por ahora, el respaldo de las fuentes. */
export function createAjustes(onChange: () => void): HTMLElement {
  const page = el('section', 'ajustes');
  const h1 = el('h1', 'web-title', 'Ajustes');
  h1.tabIndex = -1;

  const title = el('h2', 'section-title', 'tus fuentes');
  const warning = el(
    'p',
    'band',
    'Tus fuentes se guardan solo en este navegador. Si borrás los datos del navegador, se borran. Exportalas antes para tener un respaldo.',
  );
  const explain = el(
    'p',
    'muted',
    'El archivo es un OPML, el formato que entienden casi todos los lectores de RSS. Lleva tus fuentes con el nombre que les pusiste, si son principales o secundarias, sus etiquetas y el formato de lectura que elegiste. Las notas no van en el archivo: al importarlo se vuelven a bajar de cada fuente.',
  );

  const status = el('p', 'status web-small');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const say = (msg: string, kind: 'info' | 'error' = 'info') => {
    status.textContent = msg;
    status.dataset.kind = kind;
  };

  const exportButton = button('[ exportar fuentes ]');
  exportButton.addEventListener('click', async () => {
    try {
      const { text, feeds, tags } = await exportOpml();
      if (feeds === 0) return say('todavía no hay fuentes para exportar', 'error');
      download(text, `chip-rss-fuentes-${today()}.opml`);
      say(`listo: bajé un archivo con ${plural(feeds, 'fuente', 'fuentes')} y ${plural(tags, 'etiqueta', 'etiquetas')}`);
    } catch {
      say('no pude armar el archivo', 'error');
    }
  });

  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.opml,.xml,text/xml,text/x-opml,application/xml';
  fileInput.hidden = true;
  const importButton = button('[ importar fuentes ]');
  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    importButton.disabled = true;
    exportButton.disabled = true;
    try {
      const result = await importOpml(await file.text(), (msg) => say(`${msg}…`));
      const parts = [plural(result.added, 'fuente nueva', 'fuentes nuevas'), plural(result.updated, 'actualizada', 'actualizadas')];
      if (result.tags) parts.push(plural(result.tags, 'etiqueta nueva', 'etiquetas nuevas'));
      if (result.failed.length) parts.push(`${result.failed.length} con errores`);
      say(`listo: ${parts.join(' · ')}`);
      onChange();
    } catch (err) {
      say(err instanceof OpmlError ? err.message : 'no pude leer el archivo', 'error');
    } finally {
      importButton.disabled = false;
      exportButton.disabled = false;
    }
  });

  const actions = el('div', 'ajustes__actions');
  actions.append(exportButton, importButton, fileInput);

  const note = el(
    'p',
    'web-small muted',
    'Al importar, si una fuente ya estaba, queda como dice el archivo: su nombre, si es principal y sus etiquetas.',
  );

  page.append(h1, title, warning, explain, actions, status, note);
  return page;
}
