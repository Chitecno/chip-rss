# chip-rss

Lector de feeds RSS gratuito, local-first y con estética terminal. Un proyecto de [Chip Tecno](https://chiptecno.ar).

> Nombre provisorio. La app está en desarrollo: todavía no está publicada y se usa desde el código, en la propia computadora.

## Por qué existe

RSS como herramienta contra la desinformación: cada persona elige y cura sus fuentes, en vez de que un algoritmo elija por ella. La app es también una postura: sin cuentas, sin vigilancia, con datos portables.

## Qué hace

- **Agregar fuentes pegando la dirección de un medio.** La app busca sola su feed, también el de una sección (por ejemplo, la de tecnología de un diario) o el de un canal de YouTube.
- **Fuentes principales y secundarias, y etiquetas** para agrupar. El timeline se filtra por etiqueta o por principales.
- **Tarjetas con la foto real** de cada nota cuando el feed la trae. Si no la trae, un dibujo ASCII.
- **Leer la nota completa dentro de la app,** sin salir al sitio. Queda guardada para leerla sin conexión.
- **Elegir el formato de lectura:**
  - **timeline:** la lista de siempre;
  - **diario:** una hoja de papel con cabezal, columnas, fotos tramadas y breves;
  - **revista:** fotos grandes;
  - **teletipo:** una línea por historia.
- **Historias:** en diario, revista y teletipo, las notas de distintas fuentes que cuentan lo mismo se juntan en una sola historia. La rutina (clima, dólar, horóscopo…) va aparte.
- **Exportar e importar tus fuentes** en un archivo OPML, con toda tu configuración: nombres, principales y etiquetas.
- **Todo queda en tu dispositivo.** No hay cuentas ni servidor que guarde tus datos.

## Cómo probarla

Necesitás una computadora con [Node.js](https://nodejs.org) (versión LTS) y [Git](https://git-scm.com).

```bash
git clone https://github.com/Chitecno/chip-rss.git
cd chip-rss
npm install
npm run app
```

Después abrí `http://localhost:4173` en Chrome. En Windows, si PowerShell no deja correr `npm`, usá `npm.cmd`.

La [guía de uso](docs/guia-de-uso.md) explica cada paso sin dar nada por sabido.

## Documentación

- [Guía de uso](docs/guia-de-uso.md): instalarla, abrirla y usarla, paso a paso.
- [Cómo funciona](docs/como-funciona.md): las ideas detrás de la app y los problemas que resolvimos.
- [Hoja de ruta](docs/hoja-de-ruta.md): qué está hecho y qué falta para la primera versión.
- [Cómo trabajamos](docs/como-trabajamos.md): qué es cada cosa en GitHub (commit, main, pull request…).
- [DEVLOG](DEVLOG.md): la bitácora pública del proceso.

## Estructura del proyecto

```
src/
  boot/      pantalla de arranque y banner ASCII
  themes/    temas de color
  ui/        pantallas: leer, fuentes, nota, menú
  feeds/     buscar, leer y entender feeds
  reader/    traer y limpiar la nota completa
  historias/ agrupar historias, rutina, temas del día y los formatos diario, revista y teletipo
  opml/      exportar e importar las fuentes
  db/        guardado local (IndexedDB)
dev/         proxy local para leer feeds de otros sitios
public/      íconos de la app
docs/        documentación
```

## Hecho con

Vite y TypeScript, sin framework. La app es una PWA, es decir, una página web que se instala como aplicación. También usa:
- [idb](https://github.com/jakearchibald/idb) para el guardado local;
- [Readability](https://github.com/mozilla/readability) y [DOMPurify](https://github.com/cure53/DOMPurify) para leer y limpiar las notas;
- [figlet](https://github.com/patorjk/figlet.js) para el banner ASCII;
- la tipografía [Anonymous Pro](https://fonts.google.com/specimen/Anonymous+Pro).

## Licencia

Todavía sin definir.
