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
    <p>La idea de crear un administrador de noticias surge de la pregunta: <strong>¿cómo podemos informarnos mejor en este contexto horrible?</strong></p>
    <p>Las redes sociales nos acostumbraron a una información recortada y mediada por algoritmos, que generan <strong>burbujas informativas y cámaras de eco</strong>. A eso se suman las <strong>campañas de fake news</strong>, cada vez más frecuentes, y los <strong>resúmenes de IA, que alucinan y amplian el margen de desinformación</strong>.</p>
    <p><strong>Por eso es necesario recuperar el control del acceso a la información</strong>.</p>

    <h2 class="section-title">qué es</h2>
    <p>chip-rss es un <strong>lector de feeds RSS libre</strong>, pensado para que tengas una plataforma informativa con <strong>fuentes curadas por vos</strong>, <strong>sin algoritmos de personalización</strong>.</p>
    <p>Muchos sitios publican sus novedades en un formato llamado RSS: <strong>una lista que se actualiza sola</strong> con cada nota nueva, con su título, un resumen, la foto y el link. Esa lista se llama <strong>"feed"</strong>.</p>
    <p>Un lector de feeds <strong>junta en un solo lugar</strong> lo que publican los sitios que elegís: medios, blogs y canales de YouTube. Es una <strong>tecnología de 1999, en la que participó el hacktivista ${out('https://es.wikipedia.org/wiki/Aaron_Swartz', 'Aaron Swartz')} ♥</strong>, y nos recuerda que no hace falta reinventar la rueda para encontrar buenas soluciones.</p>

    <h2 class="section-title">cómo se usa</h2>
    <ul class="acerca__list">
      <li>En <a href="#/fuentes">fuentes</a>, <strong>pegá la dirección de un sitio</strong> y la app busca su feed. Funciona con medios y blogs, y en muchos casos también con una <strong>sección</strong> de un medio (por ejemplo, solo tecnología). También podés sumar <strong>canales de YouTube</strong>, autores de <strong>Medium</strong>, newsletters de <strong>Substack</strong> y novedades de proyectos en <strong>GitHub</strong>.</li>
      <li>Para cada fuente podés elegir si es <strong>principal o secundaria</strong>, ponerle <strong>etiquetas</strong> y organizarlas.</li>
      <li>En <a href="#/leer">leer</a> elegís el formato (<strong>timeline, diario, revista o teletipo</strong>) y, adentro de cada uno, tus filtros.</li>
      <li>Las notas se abren dentro de la app. Podés <strong>guardarlas para leerlas después</strong> y organizarlas en la pestaña <a href="#/archivo">archivo</a>.</li>
    </ul>

    <h2 class="section-title">cómo se gestionan tus datos</h2>
    <ul class="acerca__list">
      <li>Es una <strong>app local</strong>: tus fuentes, tus etiquetas y tus notas guardadas quedan en este navegador, en tu dispositivo. <strong>No se suben a ninguna nube y no hay cuentas.</strong></li>
      <li>Para leer los feeds de otros sitios, la app los pide a través de un intermediario que va a buscarlos y te los devuelve, <strong>sin guardar nada</strong>.</li>
      <li><strong>Importante:</strong> si borrás los datos del navegador, se borran tus fuentes. Podés <strong>exportar e importar</strong> tus fuentes, la configuración de etiquetas y tus guardados desde la sección <a href="#/fuentes">fuentes</a>. Al exportar se descarga un archivo <code>.opml</code>, que después podés importar en este u otro dispositivo. Tus fuentes también sirven en otros lectores de feeds.</li>
    </ul>

    <h2 class="section-title">un proyecto de chip tecno</h2>
    <p>Este proyecto es una <strong>demo para probar con la comunidad</strong>: <strong>cualquier comentario o aporte es bienvenido</strong>. El código está en ${out('https://github.com/Chitecno/chip-rss', 'GitHub')}.</p>
    <p>Chip Tecno es un sitio de <strong>tecnología alternativa para aliens y cyborgs</strong>. Podés apoyarlo siguiéndome como Chip Tecno en ${out('https://rebel.ar/@chiptecno', 'Mastodon')}, ${out('https://instagram.com/chiptecno', 'Instagram')} y ${out('https://youtube.com/@chiptecno', 'YouTube')}, o aportando un ${out('https://cafecito.app/chiptecno', 'cafecito')} :)</p>

    <p class="web-small muted">versión ${VERSION} · software libre, con licencia ${out('https://www.gnu.org/licenses/gpl-3.0.html', 'GPL 3.0')}</p>
  `;
  return page;
}
