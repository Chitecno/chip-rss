# Cómo funciona

Las ideas detrás de la app y los problemas que hubo que resolver para que funcione.

## Local-first: tus datos en tu dispositivo

La app no tiene cuentas ni un servidor que guarde lo que leés. Las fuentes, las etiquetas y las notas se guardan en el navegador, en una base de datos local (IndexedDB). Cada fuente, etiqueta y nota tiene un identificador único (un UUID), para que en el futuro se puedan sincronizar entre dispositivos sin un servidor que vigile.

## El proxy: por qué hace falta un intermediario

Por seguridad, los navegadores no dejan que una página lea contenido de otros sitios (se llama CORS). Por eso, para leer el feed de un medio, la app se lo pide a un intermediario, el proxy, que va a buscarlo y se lo devuelve.

El proxy tiene reglas para que nadie pueda usarlo para otra cosa:
- solo hace lecturas;
- solo va a direcciones públicas de internet, nunca a la red de tu casa, ni siquiera si un sitio lo redirige ahí;
- lee hasta 5 MB y espera hasta 10 segundos.

Hoy el proxy funciona dentro del servidor local de la app. Para publicarla, va a pasar a un Cloudflare Worker, un servicio gratuito.

## Cómo encuentra los feeds

Casi nadie sabe cuál es el feed de un medio. Por eso no hace falta pegar el feed: alcanza con la dirección del medio, y la app lo busca sola. Prueba en este orden:

1. **¿Ya es un feed?** Si pegaste un RSS o un Atom, lo lee directo.
2. **¿Es una sección?** Si pegaste algo como `tn.com.ar/tecno`, busca primero el feed de esa sección y no el del sitio entero.
3. **¿La página anuncia su feed?** Muchas páginas tienen una etiqueta oculta (`<link rel="alternate">`) que dice dónde está. Los canales de YouTube la tienen: por eso funcionan sin hacer nada especial.
4. **Las rutas de siempre:** `/feed`, `/rss`, `/rss.xml`, `/feed.xml`, `/atom.xml`, `/index.xml`.
5. **La ruta de Arc:** `/arc/outboundfeeds/rss/`. Arc es el sistema que usan varios medios grandes y no anuncia su feed.
6. **Último recurso:** enlaces de la misma página que digan "rss", "feed" o "atom".

De cada nota toma título, link, fecha, resumen y foto. La foto la busca donde el feed la traiga (enclosure, media:content, media:thumbnail, o la primera imagen del texto). Si no hay, la tarjeta muestra un halftone ASCII.

## Leer la nota dentro de la app

Cuando abrís una nota, la app arma la versión completa:

1. Si el feed trae la nota entera, usa esa.
2. Si trae solo un resumen, va al sitio y saca el texto principal con Readability, lo mismo que usa Firefox para su modo lectura.
3. Si el sitio está hecho con Arc, lee la nota de los datos que el sitio deja en la página para dibujarla.

La nota queda guardada: se puede volver a leer sin conexión.

## Privacidad y seguridad

- **Todo lo que llega de un feed se muestra como texto,** nunca como código. Un feed malicioso no puede meter nada en la app.
- **Las notas traídas de otros sitios se limpian** antes de mostrarse: se sacan scripts, estilos, formularios e iframes, y quedan solo el texto, las fotos y los links.
- **La app no avisa desde dónde se miran las fotos ni los links** (se llama "no referrer"). Igual, cargar una foto le avisa a su sitio que alguien la miró: es el precio de ver la foto real.
- **El proxy no es abierto:** ver las reglas más arriba.

## Historias, rutina y formatos

En la pantalla de leer se elige el formato: timeline (todas las notas), diario, revista o teletipo. En los últimos tres, las notas se agrupan en historias y la rutina va aparte.

### Historias: la misma noticia en varios medios

La app compara las palabras de los títulos y resúmenes, sin inteligencia artificial. Las palabras raras pesan más que las comunes: "mandíbula" dice mucho más que "gobierno". Si dos notas de medios distintos se parecen lo suficiente, se juntan en una historia, con la marca de cuántas fuentes la cuentan.

Para no armar cadenas que no tienen sentido (A se parece a B y B a C, pero A nada que ver con C), dos grupos se juntan solo si se parecen en promedio. Y una historia lleva como máximo tres notas de un mismo medio.

### Relevancia que se puede explicar

Las historias se ordenan por estos criterios, y cada historia sabe por qué quedó donde quedó (por ejemplo: "4 fuentes · hace 3 h · tema del día: dibu, fractura"):

| Criterio | Qué mide |
| --- | --- |
| Cobertura | Cuántas fuentes cuentan la historia. |
| Recencia | Qué tan nueva es. |
| Principales | Si la cuenta una fuente principal. |
| Volumen | Le baja el peso a las fuentes que publican muchísimo, para que no tapen al resto. |
| Temas del día | Si habla de lo que más aparece hoy. |


### Temas del día

Palabras de los títulos de las últimas horas que aparecen en varias fuentes y que antes no aparecían tanto. "Gobierno" está siempre; un tema puntual de hoy, no.

### La rutina del día

Clima, dólar, horóscopo, quinielas, tablas de posiciones, agenda de TV, efemérides y tapas de diarios: notas que todos los medios publican igual todos los días. Se reconocen por frases del título ("clima hoy en", "dólar hoy", "jornada financiera") y van a una caja aparte.

### El diario en papel

Una hoja clara sobre el fondo negro de la app, con el tema "papel":
- arriba, un cabezal con el nombre en ASCII y dos "orejas" a los costados: los temas del día y la rutina;
- la historia más relevante abre con un título grande, foto y texto en dos columnas con letra capital;
- al lado, una columna con tres historias; abajo, una fila de cuatro, separadas por filetes;
- si las fuentes tienen varias etiquetas, cada etiqueta es una sección, como en un diario ("Tecnología", "Medios"…);
- al final, los breves en tres columnas.

Las fotos salen en blanco y negro con una trama de puntos encima, para que parezcan impresas.

### Por etiqueta

Si elegís una etiqueta, como `#tecnología`, las historias y los temas salen solo de esas fuentes. Si publican poco, la ventana de tiempo se agranda sola: una historia puede tardar días en llegar a varios medios chicos.

## Exportar e importar

Las fuentes se exportan en OPML, el formato que entienden casi todos los lectores de RSS. Cada fuente lleva su nombre, la dirección del feed y la del sitio, y sus etiquetas: como carpetas, para los otros lectores, y como "category".

Lo propio de chip-rss va en atributos con el prefijo `chip:`. Los otros lectores los ignoran:
- los identificadores únicos de cada fuente y etiqueta;
- si la fuente es principal;
- todas las etiquetas, también las que no se usan;
- el formato de lectura elegido.

Al importar, si una fuente ya está, vale lo que dice el archivo. Si el archivo viene de otro lector y no dice qué fuentes son principales, se respeta lo que ya estaba.

## Problemas que resolvimos

| Problema | Cómo lo resolvimos |
| --- | --- |
| Hay medios grandes que no anuncian su feed. | Probamos las rutas habituales y la de Arc. |
| Al pegar una sección, el sitio anunciaba el feed general. | Primero se busca el feed de la sección. |
| Muchos medios publican en ISO-8859-1 y las tildes salían rotas. | Se lee la codificación antes de decodificar el texto. |
| Hay feeds sin fotos. | Placeholder ASCII que se adapta al tamaño de la tarjeta. |
| Tocar una nota sacaba a la persona de la app y al volver se recargaba todo. | Lectura interna, guardada, que vuelve al mismo lugar del timeline. |
| Algunos sitios dibujan la nota con JavaScript y en la página llega solo el copete. | Para Arc, se leen los datos que el sitio deja en la página. |
| El modo lectura se quedaba con logos, botones de compartir y "Últimas noticias". | Se sacan menús, pies y barras de compartir, y la nota se corta en títulos como "Temas en esta nota". |
| Una nota de otro sitio puede traer código peligroso. | Limpieza con DOMPurify antes de mostrarla. |
| Algunos feeds (YouTube, sobre todo) fallan de vez en cuando sin motivo. | La app reintenta una vez antes de marcar el error. |
| Notas en serie de un mismo medio ("Clima hoy en…" ×7) se agrupaban como una historia. | Tope de tres notas por medio en cada historia. |
| Los temas del día eran "domingo", "octubre" o el año. | Se descartan días, meses, años y palabras genéricas. |
| La rutina se llevaba noticias, como una nota sobre el cambio climático. | Reglas estrictas, por frases de servicio y no por palabras sueltas. |

## Límites conocidos

- **El agrupado por palabras no cruza idiomas.** Una nota en inglés y su versión en castellano no se juntan. Para eso haría falta un modelo que entienda significado; uno chico podría correr en el dispositivo sin mandar nada afuera.
- **A veces junta notas que solo comparten una frase.** Con pocas fuentes conviene subir el umbral de parecido.
- **Algunas fotos son muy pesadas** para el celu.
