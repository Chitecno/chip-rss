import { VERSION } from '../config';
import { el } from './dom';

// Links que se abren afuera de la app.
const out = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;

/** Acerca de: por qué existe, qué es, cómo se usa y qué pasa con tus datos. Texto de Chip. */
export function createAcerca(): HTMLElement {
  const page = el('section', 'acerca');
  page.innerHTML = `
    <h1 class="web-title" tabindex="-1">Acerca de</h1>

    <h2 class="section-title">por qué</h2>
    <p>La idea de crear un nuevo lector de feeds surge de una pregunta: ¿cómo podemos informarnos mejor en este contexto horrible? Entre información recortada por las redes sociales, manipulada por algoritmos, campañas de desinformación crecientes y resúmenes de IA que alucinan, es necesario recuperar el control.</p>

    <h2 class="section-title">qué es</h2>
    <p>chip-rss es un lector de feeds RSS libre, pensado para que tengas una plataforma informativa con fuentes curadas por vos, sin algoritmos de personalización.</p>
    <p>Muchos sitios publican sus novedades en un formato llamado RSS: una lista que se actualiza sola con cada nota nueva, con su título, un resumen, la foto y el link. Esa lista se llama "feed".</p>
    <p>Un lector de feeds junta en un solo lugar lo que publican los sitios que elegís: medios, blogs y canales de YouTube. Es una tecnología de 1999, en la que participó el hacktivista ${out('https://es.wikipedia.org/wiki/Aaron_Swartz', 'Aaron Swartz')} ♥, y nos recuerda que no hace falta reinventar la rueda para encontrar buenas soluciones.</p>

    <h2 class="section-title">cómo se usa</h2>
    <ul class="acerca__list">
      <li>En <a href="#/fuentes">fuentes</a>, pegá la dirección de un sitio y la app busca su feed.</li>
      <li>Para cada fuente podés elegir si es principal o secundaria, ponerle etiquetas y organizarlas.</li>
      <li>En <a href="#/leer">leer</a> elegís el formato (timeline, diario, revista o teletipo) y, adentro de cada uno, tus filtros.</li>
      <li>Las notas se abren dentro de la app. Podés guardarlas para leerlas después y organizarlas en la pestaña <a href="#/archivo">archivo</a>.</li>
    </ul>

    <h2 class="section-title">cómo se gestionan tus datos</h2>
    <ul class="acerca__list">
      <li>Es una app local: tus fuentes, tus etiquetas y tus notas guardadas quedan en este navegador, en tu dispositivo. No se suben a ninguna nube y no hay cuentas.</li>
      <li>Para leer los feeds de otros sitios, la app los pide a través de un intermediario que va a buscarlos y te los devuelve, sin guardar nada.</li>
      <li><strong>Importante:</strong> si borrás los datos del navegador, se borran tus fuentes. Podés exportar e importar tus fuentes, la configuración de etiquetas y tus guardados desde la sección <a href="#/fuentes">fuentes</a>. Al exportar se descarga un archivo <code>.opml</code>, que después podés importar en este u otro dispositivo. Tus fuentes también sirven en otros lectores de feeds.</li>
    </ul>

    <h2 class="section-title">un proyecto de chip tecno</h2>
    <p>Este proyecto es una demo para probar con la comunidad: cualquier comentario o aporte es bienvenido. El código está en ${out('https://github.com/Chitecno/chip-rss', 'GitHub')}.</p>
    <p>Chip Tecno es un sitio de tecnología alternativa para aliens y cyborgs. Podés apoyarlo siguiéndome como Chip Tecno en ${out('https://rebel.ar/@chiptecno', 'Mastodon')}, ${out('https://instagram.com/chiptecno', 'Instagram')} y ${out('https://youtube.com/@chiptecno', 'YouTube')}, o aportando un ${out('https://cafecito.app/chiptecno', 'cafecito')} :)</p>

    <p class="web-small muted">versión ${VERSION} · software libre, con licencia ${out('https://www.gnu.org/licenses/gpl-3.0.html', 'GPL 3.0')}</p>
  `;
  return page;
}
