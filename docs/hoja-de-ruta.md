# Hoja de ruta

Qué está hecho y qué falta para la primera versión (el MVP, "producto mínimo viable": lo mínimo para que la app sirva de verdad).

**Estados:** ✅ hecho y probado · 🟡 está, pero falta una parte o falta probarlo · ⬜ todavía no está.

## Las funciones del MVP

| | Función | Estado |
| --- | --- | --- |
| ✅ | Agregar y quitar fuentes, con autodescubrimiento | Feeds directos, anunciados, rutas comunes, Arc, secciones y enlaces de la página. |
| ✅ | YouTube con miniaturas | Pegás el canal y se arma su feed. |
| ✅ | Fuentes principales y secundarias, y etiquetas | Se crean, renombran y borran. Las fuentes nuevas entran como secundarias. |
| ✅ | Vistas: timeline, por etiqueta, solo principales | Una sola pantalla con filtros arriba, y cuatro formatos: timeline, diario, revista y teletipo. |
| ✅ | Foto real de cada nota o placeholder ASCII | |
| ✅ | Guardado local | IndexedDB, con UUID en fuentes, etiquetas y notas. |
| ✅ | Exportar e importar las fuentes (OPML), con aviso | En Ajustes. Lleva nombres, principales, etiquetas y el formato de lectura. |
| 🟡 | Instalable y que funcione sin conexión | Está configurado y se arma con `npm.cmd run app`. Falta confirmarlo en Chrome y en el celu. |

## Para publicarla

| | Qué | Estado |
| --- | --- | --- |
| ⬜ | Proxy en un Cloudflare Worker | Hoy el proxy vive en la computadora: sin él, la app publicada no puede leer feeds. |
| ⬜ | Publicación en chiptecno.ar | Depende del proxy. Hasta entonces, la app no se puede usar en el celu. |
| ✅ | Código público en GitHub | Este repositorio. |

## El sello Chip Tecno

| | Qué | Estado |
| --- | --- | --- |
| 🟡 | Bautizar el lector y verlo en un banner ASCII | El banner existe, con un nombre fijo. Falta que cada persona lo elija. |
| 🟡 | Temas fósforo verde, ámbar y papel | El tema papel ya está, y lo usa el diario. Falta poder elegirlo para toda la app, y faltan fósforo y ámbar. |
| ⬜ | Color de acento y tipografía ajustables | Van en Ajustes. |
| ✅ | Línea `// un proyecto chip tecno` | |
| ✅ | "Acerca de" | Qué es la app, cómo se usa y qué pasa con tus datos. |
| ⬜ | Packs de fuentes curados | |

## Lo que sigue, en orden

1. **Confirmar la instalación y el modo sin conexión** en Chrome.
2. **Proxy en Cloudflare y publicación en chiptecno.ar.**
3. **Ajustes:** nombre del lector, temas, color de acento y tipografía.
4. **Afinar el diario en papel.**
5. **Nombre definitivo.**

## Para revisar

- **La nota completa traída del sitio.** Hoy, cuando el feed trae solo un resumen y abrís la nota, la app pide la página al sitio del medio, saca el texto principal y lo guarda. Eso va más allá de lo que el medio publica en su feed y le saca la visita. Hay que decidir si queda así, si se elige por fuente o si la nota muestra solo lo que trae el feed.

## Más adelante

- Sincronizar entre dispositivos sin un servidor que vigile (un archivo en tu propio Drive, un código de emparejamiento…).
- Packs de fuentes para importar con un clic ("medios confiables LatAm", "tecnopolítica", "arte electrónico").
- Leer más tarde y notificaciones.
- Agrupar notas en distintos idiomas con un modelo chico que corra en el dispositivo.
- Comparar coberturas: ver lado a lado cómo cuenta cada medio la misma historia.
