# Tablero de Atención de Emergencias — Girardota (CMGRD)

Pieza para la exposición ante el **Consejo Municipal de Gestión del Riesgo de Desastres (CMGRD)** de
Girardota — sismo del 10 de agosto de 2026. Web autónoma (HTML/JS + Leaflet + Chart.js), lista para GitHub Pages.

## REGLA FIJA — Sistema de coordenadas (OBLIGATORIA)

**Todo registro que entre al tablero — foto (EXIF), ingreso manual, pegado de Google Maps o importación —
DEBE quedar en el sistema del tablero: WGS84 (EPSG:4326), grados decimales, orden `[lat, lon]` (el que usa Leaflet).**

Antes de guardar cualquier coordenada hay que **revisar y ajustar**:
- Convertir GMS (`6°22'31"N`, `75°26'47"W`) → grados decimales.
- Corregir inversión lat/lon (Girardota: lat ≈ +6.3…6.45, lon ≈ −75.5…−75.4).
- Corregir signos: latitud **Norte (+)**, longitud **Oeste (−)**.
- Validar dentro del área de Girardota; si cae fuera, **avisar** antes de guardar.

En el código esto lo hacen `parseCoord()`, `normalizeLatLon()` y `readCoords()` en `app.js`
(caja `GIRA_BOX`). El ingreso manual pasa por `readCoords()` en `saveForm()`. Las importaciones desde
fotos deben convertir a WGS84 decimal antes de crear el registro. **No romper esta regla.**

## Archivos
- `index.html` — estructura + estilos (identidad oficial de Girardota).
- `app.js` — lógica: datos, KPIs, gráficos, mapa (capas base + contexto + leyenda), formulario, filtros, atención.
- `geodata.js` — límites de Girardota (municipio, perímetro, 25 veredas, 17 barrios).
- `geoportal.js` — capas hídricas del geoportal (subcuencas, red muni, CORANTIOQUIA).
- `reportes_iniciales.js` — carga inicial (registro fotográfico de escuelas). Se siembra si `localStorage` está vacío.

## Datos
- Reportes en `localStorage` (`girardota_emergencias_v2`), un objeto por reporte.
- Estados y colores: Reportado (azul), En atención (amarillo), Inspeccionado (naranja), Crítico (rojo), Atendido (verde).
- Diagnóstico por estado (tooltip + popup, los 3 sectores): ver constante `RISK` en `app.js`.
