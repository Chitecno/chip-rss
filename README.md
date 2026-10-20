# chip-rss

Lector de feeds RSS gratuito, local-first y con estética terminal. Sin cuentas, sin vigilancia: tus fuentes y tus datos viven en tu equipo.

Un proyecto de [Chip Tecno](https://chiptecno.ar).

> Nombre provisorio.

## Correrlo en tu compu

Necesitás [Node.js](https://nodejs.org) (versión LTS).

```bash
npm install
npm run dev
```

Para armar la versión publicable: `npm run build` (queda en `dist/`).

## Estructura

```
src/
  boot/      pantalla de arranque y banner ASCII
  themes/    temas de color (chip tecno, y más adelante fósforo, ámbar, papel)
  ui/        pantallas y piezas de la interfaz
  feeds/     buscar, leer y entender feeds
  db/        guardado local (IndexedDB)
  opml/      exportar e importar tus fuentes
dev/         proxy local para leer feeds de otros sitios mientras desarrollamos
worker/      el mismo proxy para producción (Cloudflare Worker, pendiente)
public/      íconos de la app
```

El proceso de construcción está contado en [DEVLOG.md](DEVLOG.md).
