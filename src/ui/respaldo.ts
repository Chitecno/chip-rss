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

/** El respaldo de tus fuentes: exportar e importar. Un recuadro arriba en la pantalla de fuentes. */
export function respaldoSection(onChange: () => void): HTMLElement {
  const page = el('section', 'respaldo');
  page.setAttribute('aria-label', 'Respaldo');

  const title = el('h2', 'respaldo__title', 'respaldo');
  const warning = el(
    'p',
    'respaldo__warning',
    'Tus fuentes y tus notas guardadas viven solo en este navegador. Si borrás los datos del navegador, se borran: exportalas para tener un respaldo.',
  );
  const explain = el(
    'p',
    undefined,
    'Se descarga un archivo .opml, el formato que entienden casi todos los lectores de RSS. Lleva tus fuentes con el nombre que les pusiste, si son principales o secundarias, sus etiquetas, el formato de lectura que elegiste y tu archivo de notas guardadas, con sus secciones. Las demás notas no van: al importarlo se vuelven a bajar de cada fuente.',
  );

  const status = el('p', 'status web-small');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const say = (msg: string, kind: 'info' | 'error' = 'info') => {
    status.textContent = msg;
    status.dataset.kind = kind;
  };

  const exportButton = button('[ exportar ]');
  exportButton.addEventListener('click', async () => {
    try {
      const { text, feeds, tags, saved } = await exportOpml();
      if (feeds === 0 && saved === 0) return say('todavía no hay nada para exportar', 'error');
      download(text, `chip-rss-${today()}.opml`);
      say(
        `listo: bajé un archivo con ${plural(feeds, 'fuente', 'fuentes')}, ${plural(tags, 'etiqueta', 'etiquetas')} y ${plural(saved, 'nota guardada', 'notas guardadas')}`,
      );
    } catch {
      say('no pude armar el archivo', 'error');
    }
  });

  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = '.opml,.xml,text/xml,text/x-opml,application/xml';
  fileInput.hidden = true;
  const importButton = button('[ importar ]');
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
      if (result.saved) parts.push(plural(result.saved, 'nota guardada', 'notas guardadas'));
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

  const actions = el('div', 'respaldo__actions');
  actions.append(exportButton, importButton, fileInput);

  const note = el('p', undefined, 'Al importar, si una fuente o una nota guardada ya estaba, queda como dice el archivo.');

  // La explicación larga, plegada: el recuadro queda chico y los botones a la vista.
  const more = el('details', 'respaldo__more web-small muted');
  more.append(el('summary', undefined, '¿qué lleva el archivo?'), explain, note);

  page.append(title, warning, actions, status, more);
  return page;
}
