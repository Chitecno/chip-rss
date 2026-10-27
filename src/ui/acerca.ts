import { el } from './dom';

/** Acerca de: qué es la app y cómo se usa, sin más. */
export function createAcerca(): HTMLElement {
  const page = el('section', 'acerca');
  page.innerHTML = `
    <h1 class="web-title" tabindex="-1">Acerca de</h1>

    <h2 class="section-title">qué es</h2>
    <p>chip-rss es un lector de feeds RSS. Muchos sitios publican sus novedades en un formato llamado RSS. Un lector junta en un solo lugar lo que publican los sitios que elegís: medios, blogs y canales de YouTube.</p>

    <h2 class="section-title">cómo se usa</h2>
    <ul class="acerca__list">
      <li>En <a href="#/fuentes">fuentes</a>, pegá la dirección de un sitio y la app busca su feed.</li>
      <li>Cada fuente puede ser <strong>principal</strong> o <strong>secundaria</strong>, y tener <strong>etiquetas</strong>.</li>
      <li>En <a href="#/leer">leer</a> elegís el formato (timeline, diario, revista o teletipo) y, adentro de cada uno, filtrás por principales o por etiqueta.</li>
      <li>Las notas se abren dentro de la app. Al final de cada una está el link al sitio original.</li>
    </ul>

    <h2 class="section-title">tus datos</h2>
    <ul class="acerca__list">
      <li>Es una app local: tus fuentes, tus etiquetas y las notas guardadas quedan en este navegador, en tu dispositivo. No se suben a ninguna nube y no hay cuentas.</li>
      <li>Para leer los feeds de otros sitios, la app los pide a través de un intermediario que va a buscarlos y te los devuelve, sin guardar nada.</li>
      <li>Si borrás los datos del navegador, se borran tus fuentes. Antes, exportalas desde <a href="#/fuentes">fuentes</a>.</li>
    </ul>

    <p class="web-small muted">Un proyecto de Chip Tecno.</p>
  `;
  return page;
}
