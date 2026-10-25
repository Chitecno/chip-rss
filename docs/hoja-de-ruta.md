# Hoja de ruta

Qué está hecho y qué falta para la primera versión (el MVP, "producto mínimo viable": lo mínimo para que la app sirva de verdad).

**Estados:** ✅ hecho y probado · 🟡 está, pero falta una parte o falta probarlo · ⬜ todavía no está.

## Las funciones del MVP

| | Función | Estado |
| --- | --- | --- |
| ✅ | Agregar y quitar fuentes, con autodescubrimiento | Feeds directos, anunciados, rutas comunes, Arc, secciones y enlaces de la página. |
| ✅ | YouTube con miniaturas | Pegás el canal y se arma su feed. |
| ✅ | Fuentes principales y secundarias, y etiquetas | Se crean, renombran y borran. Las fuentes nuevas entran como secundarias. |
| ✅ | Vistas: timeline, por etiqueta, solo principales | Una sola pantalla con filtros arriba. |
| ✅ | Foto real de cada nota o placeholder ASCII | |
| ✅ | Guardado local | IndexedDB, con UUID en fuentes, etiquetas y notas. |
| ⬜ | Exportar e importar las fuentes (OPML), con aviso | Es lo que protege tus fuentes si se borran los datos del navegador. |
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
| ⬜ | Temas fósforo verde, ámbar y papel | Hoy está solo el tema chip tecno. |
| ⬜ | Color de acento y tipografía ajustables | Van en Ajustes. |
| ✅ | Línea `// un proyecto chip tecno` | |
| ⬜ | "Acerca de" con el manifiesto | |
| ⬜ | Packs de fuentes curados | |

## Lo que sigue, en orden

1. **Exportar e importar las fuentes (OPML),** con el aviso de "exportá antes".
2. **Confirmar la instalación y el modo sin conexión** en Chrome.
3. **Proxy en Cloudflare y publicación en chiptecno.ar.**
4. **Ajustes:** nombre del lector, temas, color de acento y tipografía.
5. **"Acerca de"** con el manifiesto.
6. **Elegir qué parte del laboratorio pasa a la pantalla de leer.**
7. **Nombre definitivo.**

## Más adelante

- Sincronizar entre dispositivos sin un servidor que vigile (un archivo en tu propio Drive, un código de emparejamiento…).
- Packs de fuentes para importar con un clic ("medios confiables LatAm", "tecnopolítica", "arte electrónico").
- Leer más tarde y notificaciones.
- Agrupar notas en distintos idiomas con un modelo chico que corra en el dispositivo.
- Comparar coberturas: ver lado a lado cómo cuenta cada medio la misma historia.
