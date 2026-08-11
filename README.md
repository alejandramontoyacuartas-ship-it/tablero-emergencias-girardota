# Tablero de Atención de Emergencias — Girardota (CMGRD)

Tablero web para la **exposición ante el Consejo Municipal de Gestión del Riesgo de Desastres (CMGRD)**
de Girardota, sobre la **atención de emergencias del sismo del 10 de agosto de 2026** (Antioquia).

Es una **pieza independiente del geoportal**, pero **se nutre de la información del geoportal de Gestión del
Riesgo** (SAT La Correa): zonas de amenaza, puntos críticos, antecedentes, emergencias históricas del Cuerpo
de Bomberos, red hídrica y subcuencas. Lleva la **identidad oficial de la Alcaldía de Girardota** (logo y colores).
Inspirado en el modelo de administración de emergencias de Itagüí (ArcGIS Dashboards), reconstruido como
página web autónoma (HTML + JavaScript), lista para publicar en **GitHub Pages**.

## Qué hace

- **Ingreso manual de reportes** con formulario que cambia según el sector.
- **Pestañas** (resumen + atención + 3 sectores):
  - 📊 **Resumen general** — todos los reportes (KPIs, gráficos, mapa, tabla).
  - 🛠️ **Atención en campo** — lista de trabajo para el equipo: reportes **pendientes** ordenados por
    prioridad y antigüedad, con mapa de pendientes y acciones **Atender** (abrir y actualizar) y **Cerrar**
    (marcar atendido). Depende de lo ingresado en "Nuevo reporte".
  - 🏫 **Escuelas / Educación** — institución, carácter (pública/privada), afectaciones, operatividad, estudiantes afectados.
  - 🏛️ **Infraestructura pública** — tipo de edificio, secretaría responsable, afectaciones, operatividad, estado estructural.
  - ⚠️ **Reportes de afectaciones** — nombre, teléfono, vereda/barrio, sector/comunidad, tipo, viviendas y personas afectadas.
- **Selección de institución educativa por menús desplegables:** en la pestaña de Educación se elige
  **Institución Educativa → Sede/Escuela** (las 4 IE de Girardota con todas sus sedes), y se **autocompleta**
  la zona y la vereda/barrio.
- **Flujo de atención y cierre de reportes:** desde "Nuevo reporte" se puede **cargar y editar un reporte
  ya generado** (selector al inicio del formulario). Al atenderlo se registran **atendido por**, **observaciones
  de la atención** y, con **"Marcar atendido y cerrar"**, el reporte pasa a estado **Atendido** con **fecha de
  atención** sellada automáticamente. Los cerrados salen de la lista de pendientes.
- **Capa hídrica del geoportal** como contexto en el mapa: se activa/desactiva desde el **menú de capas**
  (botón arriba a la derecha del mapa). Es la única capa del geoportal incluida, porque el tablero registra
  solo información de la emergencia del sismo.
- **Coordenadas** (opcionales; si no se indican, el punto se ubica en el centroide de la vereda/barrio).
- **Fotos** (se comprimen automáticamente antes de guardar).
- **Mapa** de Girardota (límite municipal, perímetro urbano, 25 veredas y 17 barrios) con marcadores por estado.
- **KPIs y gráficos** por estado, prioridad, tipo, operatividad, ubicación, etc.
- **Filtros** por zona, ubicación, estado, prioridad y búsqueda de texto.
- **Exportar CSV** de lo que esté filtrado.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura y estilos del tablero (identidad oficial de Girardota). |
| `app.js` | Lógica: datos, KPIs, gráficos, mapa, formulario, filtros, CSV, capas del geoportal. |
| `geodata.js` | Límites de Girardota (GeoJSON embebido: municipio, perímetro, veredas, barrios). |
| `geoportal.js` | Capa hídrica (subcuencas / quebradas) extraída del geoportal de Gestión del Riesgo. |
| `logo_girardota_blanco.png` | Escudo + logotipo oficial (blanco) para el encabezado. |

Librerías por CDN: [Leaflet](https://leafletjs.com) (mapa) y [Chart.js](https://www.chartjs.org) (gráficos).

## Cómo verlo en el computador

```bash
cd tablero-emergencias-girardota
python -m http.server 5601
```

Luego abre <http://localhost:5601> en el navegador.

## Publicar en GitHub Pages

1. Crear un repositorio (p. ej. `tablero-emergencias-girardota`) en la cuenta de GitHub.
2. Subir estos archivos (`index.html`, `app.js`, `geodata.js`, `README.md`).
3. En **Settings → Pages**, elegir la rama `main` y carpeta `/root`.
4. Quedará publicado en `https://<usuario>.github.io/tablero-emergencias-girardota/`.

## Dónde se guardan los datos

Por ahora los reportes se guardan en el **navegador del dispositivo** (`localStorage`): son privados de ese equipo.
Sirve para una persona o un puesto de mando. **No se comparten entre dispositivos.**

### Para uso multiusuario EN VIVO (varias personas alimentando el mismo tablero)

Conectar **Firebase (Firestore)** — mismo enfoque usado en el tablero de la Feria del Chicharrón:

1. Crear proyecto en Firebase y una base Firestore.
2. Reemplazar en `app.js` las funciones `load()` / `save()` por lectura/escritura en Firestore
   (colección `reportes`), y usar `onSnapshot` para que el tablero se actualice solo.
3. Las fotos conviene subirlas a **Firebase Storage** y guardar solo la URL (en vez de la imagen en base64),
   para no llenar el almacenamiento.

> El modelo de datos de cada reporte ya está pensado para esa migración (un documento por reporte).

## Capa hídrica del Geoportal

La única capa de contexto es la **red hídrica (subcuencas / quebradas)**, extraída del geoportal local
(`js/data.js`) hacia `geoportal.js` (~340 KB, 16 quebradas con nombre). Se activa desde el **menú de capas**
del mapa. Se descartaron a propósito el SAT, las emergencias de Bomberos, las zonas de amenaza y los puntos
críticos: este tablero registra **solo** información de la emergencia del sismo.

Para **actualizar la capa** cuando el geoportal cambie: volver a exportar `red_subcuencas` desde `js/data.js`.

## Datos de ejemplo

Al abrir por primera vez se cargan 13 reportes de ejemplo (marcados con la etiqueta **ej.**).
Con el botón **🧹 Borrar todo** se eliminan y puedes empezar a cargar los reportes reales.
