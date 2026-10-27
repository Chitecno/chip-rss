# DEVLOG

Bitácora de construcción de chip-rss. Cada etapa importante: fecha, qué hicimos y qué aprendimos.

---

## 2026-10-17 · La base

### Qué hicimos

- Definimos el stack: una PWA hecha con **Vite + TypeScript**, sin framework. Liviana, rápida de arrancar y con tipos que nos ordenan los datos desde el día 1 (cada feed, etiqueta y artículo va a tener su UUID).
- Armamos la estructura de carpetas: arranque, temas, interfaz, feeds, base de datos local, OPML y el proxy aparte.
- Hicimos la **pantalla de arranque**: líneas tipo boot que aparecen de a una y un banner en **ANSI Shadow** con el nombre del lector, con la capa glitch (un fantasma rosa y otro cian corridos). Cierra con la franja rosa y `[ enter ] para entrar`.
- Las líneas de boot no son decorado: chequean de verdad si el navegador tiene almacenamiento local, modo offline y conexión. Es lo que la app necesita para ser local-first.
- Aplicamos el sistema de diseño de Chip Tecno en su **modo Terminal**: fondo negro, cian para lo que se lee, rosa solo en franjas, esquinas rectas, sin sombras, todo enmarcado en `#`. Los colores quedaron como variables, así sumar los temas fósforo, ámbar y papel es agregar un archivo.
- Configuramos la app para que se pueda instalar y funcione sin conexión (manifest + service worker) y le hicimos un primer ícono.

### Qué aprendimos

- La tipografía **Anonymous Pro** viaja dentro de la app en vez de cargarse desde Google Fonts. Por dos razones: tiene que andar offline, y una app que dice "sin vigilancia" no debería avisarle a nadie cada vez que se abre.
- **ANSI Shadow no tiene minúsculas, acentos ni Ñ.** "La Peña de Juana" sale como "LA PENA DE JUANA". Para el bautismo del lector vamos a tener que dibujar la Ñ a mano o avisarlo.
- El banner se achica solo para entrar en la pantalla del celu, y en pantallas angostas cada palabra va en su renglón.
- Si la persona tiene activado "reducir movimiento" en su sistema, el arranque aparece de una y el glitch queda quieto.
- Al probarlo en tamaño celu, las líneas de chequeo se cortaban a la mitad. Ahora tienen un ancho fijo y los puntitos se acomodan según el resultado ("ok", "con señal", "0 feeds").
- El Enter para entrar no siempre respondía: el botón y el teclado se pisaban. Ahora los dos llevan al mismo lugar.

### Lo que sigue

- Probar en Chrome que la app se instale y funcione sin conexión (el navegador de pruebas no deja registrar el service worker).
- Subir el repo público a GitHub.

---

## 2026-10-17 · Los primeros feeds

### Qué hicimos

- Ya se pueden **agregar fuentes**: pegás la dirección de un medio, la app busca su feed, lo guarda y arma el timeline con tarjetas.
- **Autodescubrimiento** en tres pasos. Si la dirección ya es un feed, listo. Si es la página del medio, busca el feed que la página anuncia. Si no anuncia ninguno, prueba las rutas de siempre (`/feed`, `/rss`, `/rss.xml`…) y, como último recurso, los enlaces de la página que digan "rss" o "feed".
- Lee **RSS y Atom**, y saca la foto real de cada artículo de donde la traiga el feed. Si no trae, la tarjeta muestra un **halftone ASCII** que se densifica hacia los bordes, como en el sistema de diseño.
- Todo se guarda en el navegador (**IndexedDB**) y cada feed y cada artículo tiene su **UUID**. Al entrar, la app busca novedades en todas las fuentes.
- La línea "tus fuentes" del arranque ahora cuenta los feeds de verdad.
- Armamos un **proxy** dentro del servidor de desarrollo. Los navegadores no dejan que una página lea contenido de otros sitios, así que alguien tiene que ir a buscarlo. Lo limitamos para que no sea un proxy abierto: solo lecturas, nada de direcciones internas (ni siquiera después de una redirección), hasta 5 MB y 10 segundos.
- Probamos con Página/12, Chequeado, Hacker News y el canal de YouTube de Chip Tecno. Los cuatro andan.

### Qué aprendimos

- **YouTube vino de regalo**: la página de un canal anuncia su feed, así que el autodescubrimiento lo encuentra solo, con miniaturas y todo.
- **Página/12 no anuncia su feed.** Usa Arc, un sistema que usan varios medios grandes, y el feed está en `/arc/outboundfeeds/rss/`. Sumamos esa ruta a la lista de pruebas.
- **No todos los feeds traen fotos.** El de Chequeado no trae ni foto ni resumen, solo el título. Para esos casos está el placeholder ASCII. Más adelante podemos ir a buscar la foto a la nota.
- Muchos medios todavía publican en ISO-8859-1 y no en UTF-8. Si no se lee la codificación antes, las tildes salen rotas.
- Las fotos se piden sin decirle al medio desde dónde se ven (`referrerpolicy="no-referrer"`). Igual, cargar una foto le avisa al sitio que alguien la miró: es el precio de ver la foto real.
- Todo lo que llega de un feed se muestra como texto y nunca como código. Así un feed malicioso no puede meter nada en la app.

### Lo que sigue

- Pasar el proxy a un Cloudflare Worker para publicar la app.
- Etapas cortas: fuentes principales y secundarias, etiquetas, exportar e importar OPML.
- Poder renombrar una fuente: el feed de Página/12 se llama "El Mundo | Página|12".
- Algunas fotos de Página/12 pesan muchísimo. En el celu conviene pedirlas más chicas.

---

## 2026-10-18 · Etiquetas, menú y leer adentro

### Qué hicimos

- **Etiquetas en las fuentes.** Cada fuente puede tener varias (Chequeado: `#medios` y `#chequeo`) y sus artículos las heredan. Se crean, se renombran y se borran desde la pantalla de fuentes. Si borrás una etiqueta, las fuentes no se borran: solo la pierden.
- **Principal o secundaria** es otra cosa: dice cuánto te importa una fuente, no de qué trata. Las fuentes nuevas entran como secundarias, así lo principal se elige a propósito.
- **Menú con cuatro pantallas**: leer, fuentes, ajustes y acerca de. Las vistas de timeline, por etiqueta y solo principales son una sola pantalla con filtros arriba. En el celu el menú se abre como una lista de terminal.
- Cada pantalla tiene su dirección (`#/leer`, `#/fuentes`, `#/nota/…`), así que el botón de volver del celu o del navegador funciona.
- Al agregar una fuente se abren ahí mismo sus etiquetas, para acomodarla sin ir a otro lado. También se puede **renombrar**.
- **Las notas se leen dentro de la app.** Antes, tocar una nota te mandaba al sitio, y al volver había que cargar todo de nuevo. Ahora se abre adentro y al volver quedás en el mismo lugar del timeline.
- Para armar la nota completa hay tres caminos. Si el feed trae la nota entera, se usa esa. Si trae solo un resumen, la app va a buscarla al sitio y saca el texto principal con Readability, lo mismo que usa Firefox para su modo lectura. Si el sitio está hecho con Arc, como Página/12, la lee de los datos que el sitio deja en la página.
- Las notas que se traen del sitio **quedan guardadas**, así que se pueden leer sin conexión.
- Sacamos de la pantalla de arranque una frase que no correspondía. El arranque queda por ahora, pero no va a estar en la versión final.

### Qué aprendimos

- **Muchos sitios no tienen la nota en su página.** Página/12 manda un HTML con el copete y la foto, y el resto lo dibuja con JavaScript a partir de datos escondidos en la misma página. Un lector de feeds tiene que saber leer esos datos.
- El modo lectura no es magia: se queda también con logos, botones de compartir y "Últimas noticias". Hubo que enseñarle qué es basura: menús, pies, barras de compartir, y cortar la nota cuando aparecen títulos como "Temas en esta nota".
- Una nota traída de otro sitio puede traer cualquier cosa, incluso código. Antes de mostrarla se limpia: solo quedan texto, fotos y links, y los links se abren aparte.
- **YouTube a veces responde 404 en sus feeds sin motivo.** La app ahora reintenta una vez antes de marcar el error.
- La app no le avisa a ningún sitio desde dónde se miran sus fotos ni sus links: lo configuramos para toda la página, no foto por foto.

### Lo que sigue

- Ajustes: nombre del lector, tema, exportar e importar OPML con el aviso de "exportá antes".
- Pasar el proxy a un Cloudflare Worker para publicar la app.
- Los textos de "acerca de" (el manifiesto) los escribe Chip.

---

## 2026-10-18 · Laboratorio: historias, relevancia y tapas

### Qué hicimos

- Armamos un **laboratorio**, una pantalla aparte para probar ideas sin tocar la de leer.
- **Agrupar historias:** si varias fuentes cuentan la misma noticia, la app las junta en una sola historia con la marca "4 fuentes" y la lista de versiones para leer cada una. No hay IA: compara las palabras de títulos y resúmenes, y las palabras raras pesan más que las comunes. "Dibu" y "mandíbula" dicen mucho más que "gobierno".
- **Relevancia que se puede explicar:** cada historia muestra por qué está donde está, por ejemplo "4 fuentes · hace 3 h · tema del día: dibu, fractura". Los pesos se ajustan a mano:
  - **cobertura:** cuántas fuentes cuentan la historia;
  - **recencia:** qué tan nueva es;
  - **principales:** si la cuenta una fuente principal;
  - **volumen:** le baja el peso a las fuentes que publican muchísimo, para que un medio que saca cien notas por día no tape al resto;
  - **temas del día:** si habla de lo que más aparece hoy.
- **Temas del día:** una nube con las palabras que aparecen hoy en varias fuentes y que antes no aparecían tanto. Tocás una y filtra.
- **Cuatro presentaciones** con los mismos datos:
  - **tapa de diario:** cabezal ASCII, apertura grande, columna lateral, segunda línea y breves;
  - **revista:** fotos grandes, alternando lados;
  - **teletipo:** una línea por historia, como un cable de agencia;
  - **la grilla de siempre**, pero por historias.
- Para probar sumamos medios que cubren lo mismo: elDiarioAR, Infobae, La Nación, Clarín, Perfil y Tiempo Argentino. Seis de siete se encontraron solos; Ámbito no anuncia su feed.

### Qué aprendimos

- Con 521 notas de 11 fuentes salieron 20 historias con varias fuentes. Las mejores, de verdad la misma noticia: Dibu Martínez (7 notas en 4 medios), las protestas en Francia, Trump y las sanciones a Rusia, Malvinas en el Tribunal del Mar, la salud del papa.
- **El umbral de parecido es un equilibrio.** Muy alto, la misma noticia queda partida en dos. Muy bajo, se mezclan notas que solo comparten una palabra, como "madre" el Día de la Madre. Quedó en 0.25 y se puede mover.
- Hay medios que publican notas en serie con la misma plantilla ("Clima hoy en…" ×7). Pusimos un tope de tres notas por medio en cada historia para que no se cuelen todas juntas.
- Para la nube hubo que sacar días, meses, años y palabras que están en todas las notas. Si no, el tema del día era "domingo".
- Que la relevancia se pueda leer y ajustar es lo que la separa de un algoritmo de plataforma: no decide por vos, te muestra cómo ordena y vos movés las perillas.

### Lo que sigue

- Elegir qué presentación queda y llevarla a la pantalla de leer.
- Comparar coberturas: ver lado a lado cómo cuenta la misma historia cada medio.
- Bajarle el peso a las notas de plantilla (clima, horóscopo, resultados).

---

## 2026-10-19 · La rutina aparte y las historias por tema

### Qué hicimos

- **La rutina va aparte.** Hay notas que todos los medios publican igual todos los días: clima, dólar, horóscopo, quinielas, tablas de posiciones, agenda de TV, efemérides, tapas de los diarios. No son malas, pero no son "la noticia". Ahora el laboratorio las saca de la tapa y las pone en una caja, "la rutina del día", con una línea por tema. La lista de palabras que cuentan como rutina está a la vista.
- **Historias dentro de una etiqueta.** En el laboratorio se puede elegir `#tecnología` (o cualquier etiqueta) y el agrupado y los temas del día se calculan solo con esas fuentes. Así se ve qué historias levantaron varios medios de tecnología a la vez.
- Como los medios chicos publican menos que los diarios, cuando las fuentes elegidas publican poco la ventana de tiempo se agranda sola: una historia puede tardar días en llegar a varios de ellos.
- Probamos con nueve medios de tecnología en castellano: Xataka, Genbeta, Hipertextual, Computer Hoy, Applesfera, MuyComputer, WWWhat's new, Wired en Español y El País. Salieron historias de verdad compartidas: el evento de Apple del 28 de octubre (cuatro medios), el Tesla Roadster 2 y el plan del iPhone Duo.
- Subimos el proyecto a un repositorio de git, con su historial.

### Qué aprendimos

- **Las reglas de rutina tienen que ser estrictas.** La primera versión mandaba a rutina cualquier nota con la palabra "clima", incluida una sobre el cambio climático. Ahora busca frases de servicio ("clima hoy en", "pronóstico del tiempo", "dólar hoy", "jornada financiera"). Preferimos que se escape algo de rutina a esconder una noticia.
- No todo lo que tiene "dólar" en el título es rutina: "Espert, a un paso de ser procesado por los 200 mil dólares" es noticia. Y el riesgo país en máximos del año también: varios medios lo cubren y se agrupa como historia.
- **El agrupado por palabras no cruza idiomas.** Una nota en inglés y su versión en castellano no se juntan. Para eso haría falta un modelo que entienda significado.
- A veces junta notas que solo comparten una frase ("número de teléfono"). Con pocas fuentes conviene subir un poco el umbral de parecido.

### Lo que sigue

- Subir el repositorio a GitHub, público.
- Elegir la presentación que queda y llevarla a la pantalla de leer.
- Comparar coberturas: ver lado a lado cómo cuenta cada medio la misma historia.

---

## 2026-10-25 · Formatos para leer y un diario en papel

### Qué hicimos

- **La pantalla de leer ahora tiene formatos:** timeline (la lista de siempre), diario, revista y teletipo. Los filtros de fuentes siguen andando en todos y el formato elegido queda guardado.
- En diario, revista y teletipo las notas se agrupan en historias y la rutina va aparte, con los mismos ajustes que se mueven en el laboratorio.
- **Rediseñamos el diario para que parezca impreso.** Antes se parecía demasiado a la revista. Ahora es una hoja clara sobre el fondo negro de la app:
  - cabezal con el nombre en ASCII y dos "orejas" a los costados, con los temas del día y la rutina;
  - folio con la fecha de la edición;
  - apertura con título grande, foto y texto en dos columnas con letra capital;
  - columna lateral y filas separadas por filetes;
  - secciones por etiqueta y breves en tres columnas.
- **Sumamos el tema papel:** fondo claro y tinta negra. Por ahora lo usa el diario; más adelante va a poder elegirse para toda la app.
- Ordenamos la documentación: un README como portada del repositorio y una carpeta `docs` con la guía de uso, cómo funciona, la hoja de ruta y cómo trabajamos con GitHub.

### Qué aprendimos

- **Lo que hace que algo parezca un diario no son las fotos grandes sino la estructura:** columnas angostas, filetes finos entre ellas, títulos que cruzan columnas, una volanta chiquita arriba del título y una letra capital al empezar el texto.
- **Las fotos parecen impresas sin tocarlas:** en blanco y negro, con más contraste y una trama de puntos encima.
- Un mismo juego de colores puede vivir en toda la app o en una sola pieza. El tema papel está armado así: la hoja del diario lo usa sin cambiar el resto.
- Los títulos muy largos se comen la página en la apertura: van un poco más chicos.

---

## 2026-10-25 · Respaldo de fuentes y orden en el proyecto

### Qué hicimos

- **Exportar e importar las fuentes**, en Ajustes. El archivo es un OPML, el formato que entienden casi todos los lectores de RSS. Lleva las fuentes con el nombre que les pusiste, si son principales o secundarias, todas las etiquetas y el formato de lectura elegido. Al importar, se restaura todo y se vuelven a bajar las notas.
- **El menú de fuentes** (todo, principales, etiquetas) pasó a estar adentro de cada formato. En el diario es la barra de secciones, debajo del cabezal.
- **"Acerca de"** es ahora una descripción básica: qué es la app, cómo se usa y qué pasa con tus datos.
- **Sacamos el laboratorio de la app.** Era una pantalla de pruebas y quedó guardada en su propia rama. Lo que servía, como agrupar historias o separar la rutina, ya es parte de leer.
- **Ordenamos cómo trabajamos.** `main` queda solo con la última versión probada. El trabajo de todos los días va en una rama `desarrollo`, y las pruebas en ramas aparte.

### Qué aprendimos

- **Un OPML puede llevar más de lo que dice el estándar sin romper nada.** Lo propio de chip-rss va en atributos con un prefijo propio (`chip:`). Los otros lectores los ignoran, y chip-rss los usa para restaurar todo como estaba.
- Con archivos de otros lectores, las carpetas se convierten en etiquetas. Como esos archivos no dicen qué fuentes son principales, se respeta lo que ya estaba.
- Probamos el viaje de ida y vuelta: exportar de un navegador e importar en otro vacío. Volvieron las 9 fuentes con sus nombres, principales, etiquetas y formato.
- Probar ideas directo en la app la ensucia. Para eso están las ramas: se prueba aparte y entra solo lo que funciona.

---

## 2026-10-25 · Varias fuentes, a la vista y en páginas

### Qué hicimos

- **La marca de cuántas fuentes cuentan lo mismo está en todos los formatos,** también en el timeline, con links a las otras versiones. Sumamos un filtro, **varias fuentes**, para ver solo esas historias.
- **Las historias se arman con todas las fuentes,** aunque haya una etiqueta elegida. Si una nota de `#tecnología` también la cuenta una fuente que no tiene esa etiqueta, la historia muestra las dos.
- **Las historias compartidas de la última semana van primero.**
- **Todo el contenido, en páginas.** Ningún formato recorta: lo que no entra va a la página siguiente. En el diario, desde la página 2 el cabezal es chico, como en las páginas interiores de un diario.

### Qué aprendimos

- **Una función puede estar y no verse.** La marca de varias fuentes seguía en el código, pero con medios de tecnología había una sola historia compartida, y quedaba en el puesto 125. Los formatos mostraban solo las primeras, así que nunca aparecía.
- Filtrar antes de agrupar esconde coincidencias. Hay que agrupar con todo y filtrar después.
- **Leer desde un lector le saca visitas al sitio.** El feed lo publica el medio a propósito, pero cuando la nota se lee en la app no se cargan sus estadísticas ni su publicidad. Y cuando el feed trae solo un resumen y la app va a buscar la nota completa, va más allá de lo que el medio decidió compartir. Queda como decisión pendiente.

---

## 2026-10-25 · Más fácil de abrir, y lista para publicar

### Qué hicimos

- **Un ícono en el escritorio** que prende la app y la abre en el navegador con doble clic. Sin PowerShell.
- **El proxy para publicar:** el mismo intermediario que trae los feeds, pero para correr en Cloudflare, gratis. Solo atiende pedidos que vienen de la app.
- **Publicación automática:** cada vez que algo entra a main, GitHub arma la app y la publica en GitHub Pages.
- Lo probamos de punta a punta en la compu: la app armada pidió los feeds al proxy nuevo, sin errores.

### Qué aprendimos

- **Una app web se puede publicar casi en cualquier lado,** porque son archivos. Lo único que necesita un servidor es el intermediario que trae los feeds.
- **Un proxy público tiene que tener reglas,** si no, cualquiera lo puede usar para lo que quiera. El nuestro solo responde a la app, solo lee, y nunca entra a redes internas.
- **El modo sin conexión funciona,** y hasta demasiado: el navegador siguió mostrando la versión vieja guardada hasta que se actualizó. Es lo esperado en una app instalable, y conviene saberlo al probar.

---

## 2026-10-26 · El proxy, en internet

### Qué hicimos

- Creamos la cuenta de Cloudflare y **publicamos el proxy** en `chip-rss-proxy.chiptecno.workers.dev`.
- Lo probamos en vivo: trae los feeds cuando el pedido viene de la app y rechaza los pedidos de otros sitios, los que no dicen de dónde vienen y los que apuntan a redes internas.
- Armamos la app apuntando al proxy real y funcionó: pidió los feeds por Cloudflare, sin errores.
- Cargamos la dirección del proxy en la configuración de GitHub, para que la publicación automática la use.

### Qué aprendimos

- **Publicar un Worker es rápido:** se inicia sesión una vez desde la terminal (se autoriza en el navegador), se elige un nombre para el espacio en workers.dev y el proxy queda en internet en segundos.
- **El nombre que se elige en workers.dev es público:** queda en la dirección del proxy.
- **GitHub pide un permiso aparte** para tocar los archivos de publicación automática. Es una protección: así nada puede cambiar cómo se publica un proyecto sin que alguien lo autorice.

---

## 2026-10-27 · Versión 0.1.0: el archivo, software libre y correcciones

### Qué hicimos

- **El archivo:** cada nota tiene un botón para guardarla. Al tocarlo se elige en qué sección va, o se crea una nueva ahí mismo. En la pestaña **archivo** están todas las notas guardadas, organizadas en secciones que se crean, renombran y borran como carpetas.
- **Lo guardado entra en el respaldo:** el archivo `.opml` lleva ahora las fuentes, las etiquetas, el formato de lectura y las notas guardadas con sus secciones.
- **chip-rss es software libre**, con licencia GPL 3.0.
- **Versión 0.1.0**, la primera demo para probar con la comunidad. El número vive en un solo lugar y la app lo muestra en el arranque y en "Acerca de".
- **"Acerca de" con texto de Chip:** por qué existe, qué es RSS, cómo se usa, qué pasa con los datos, y cómo apoyar a Chip Tecno.
- **Correcciones:** la app usa todo el ancho de la pantalla en compu, las fotos del diario van originales y sin filtro, exportar e importar pasaron a la pantalla de fuentes, y el arranque perdió una línea que sobraba.

### Qué aprendimos

- **Guardar una nota es guardar una copia.** Si solo se guardara un puntero a la nota, se perdería cuando la fuente se quita o el medio la saca de su feed.
- **"Libre" es una palabra con contenido legal:** sin una licencia, un código publicado se puede mirar pero no reutilizar. La GPL deja usarlo, estudiarlo y modificarlo, con una condición: las versiones modificadas que se distribuyan también tienen que ser libres.
- **RSS es de 1999,** y en su versión 1.0 participó Aaron Swartz. No hace falta inventar nada nuevo para informarse mejor: muchas veces alcanza con recuperar herramientas que ya existen.

---

## 2026-10-27 · Compartir, y un disquete

### Qué hicimos

- **Compartir:** al lado de guardar, cada nota tiene un botón para copiar el link, mandarla por WhatsApp o por mail, y en el celu, abrir el menú de compartir del sistema. Siempre se comparte el link al sitio original.
- **Íconos en pixel art:** un disquete para guardar y una flecha saliendo de una bandeja para compartir. Están dibujados con cuadraditos y toman el color del texto, así funcionan en cualquier tema.
- Guardar y compartir usan el mismo menú chico, que se cierra al tocar afuera o con Escape. Nunca quedan dos abiertos a la vez.

### Qué aprendimos

- **El sistema de diseño de Chip Tecno no usa emoji:** el guiño es ASCII o pixel. Por eso el disquete no es 💾 sino un dibujito de 12 × 12 cuadraditos, que se ve igual en cualquier compu y en cualquier celu.
- **Para compartir por WhatsApp o mail no hace falta ninguna conexión especial:** alcanza con un link armado de una forma particular (`wa.me/?text=…` o `mailto:…`), y la compu o el celu abren la app que corresponde.
