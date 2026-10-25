# chip-rss (nombre provisorio)

Lector de feeds RSS gratuito, local-first y con estética terminal/ASCII. Un proyecto de **Chip Tecno** (chiptecno.ar), creado por Gala "Chip" Cacchione.

## Por qué existe
RSS como herramienta contra la desinformación: cada persona elige y cura sus fuentes en vez de que un algoritmo elija por ella. La app es también una postura: sin cuentas, sin vigilancia, con datos portables.

## Cómo trabajar conmigo (Chip)
- Hablame en español rioplatense, informal.
- Antes de escribir código grande, proponeme el plan en el chat y esperá mi ok.
- Explicaciones cortas y sin tecnicismos innecesarios; iteramos rápido.
- Documentamos el proceso: cada etapa importante merece una nota en `DEVLOG.md` (fecha + qué hicimos + qué aprendimos), porque lo voy a publicar en chiptecno.ar.

## Decisiones tomadas
- **PWA**: una sola app web instalable en celu y escritorio. Sin tiendas de apps.
- **Local-first**: los datos viven en el dispositivo (IndexedDB). Sin servidor de datos ni cuentas.
- **Export/import OPML** + mini tutorial dentro de la app ("si borrás los datos del navegador, exportá antes").
- **Proxy CORS** mínimo (Cloudflare Worker gratuito) para poder leer feeds de otros sitios.
- Cada feed, etiqueta y artículo tiene **ID único (UUID) desde el día 1**, para preparar la sincronización de la v2.
- Publicación final en `chiptecno.ar` (subruta o subdominio, a definir).
- Repo público en GitHub desde el inicio (historial fechado).

## MVP
1. Agregar/quitar feeds. **Autodescubrimiento**: pegás la URL de un medio y la app encuentra su RSS (busca `<link rel="alternate">` y prueba `/feed`, `/rss`, `/rss.xml`, etc.).
2. **YouTube**: pegás la URL de un canal y se arma el feed del canal; se muestran miniaturas.
3. Fuentes **principales** y **secundarias**; **etiquetas** para agrupar.
4. Vistas: timeline, por etiqueta, solo principales.
5. Tarjetas con la **foto real** del artículo cuando el feed la trae (enclosure, media:content, media:thumbnail, primera imagen del contenido). Si no hay, placeholder ASCII.
6. Guardado local + export/import OPML.
7. Instalable (manifest + service worker, funciona offline).

## Personalización con sello Chip Tecno
- La persona bautiza su lector ("La [nombre] de Juana") → banner ASCII generado con ese nombre en una pantalla de arranque tipo boot.
- Temas: `chip tecno` (por defecto), `fósforo verde`, `ámbar`, `papel` (claro). Color de acento y tipografía ajustables.
- Sello fijo: línea de boot `// un proyecto chip tecno`, sección "acerca de" descriptiva (qué es y cómo se usa, sin editorializar), packs curados firmados por Chip.

## Futuro (no MVP)
- v2: sincronización entre dispositivos sin servidor que vigile (archivo en el propio Drive, código de emparejamiento, etc.).
- Packs curados compartibles e importables con un clic ("medios confiables LatAm", "tecnopolítica", "arte electrónico").
- Leer más tarde, notificaciones.

## Pendiente
- **Nombre definitivo**. Candidatos: Teletipo (favorito, pero la referencia es muy periodística), Galena, Onda Corta, Dial, Antena, Señal/Ruido. Buscamos algo más directo, en la línea de "sala de noticias".
