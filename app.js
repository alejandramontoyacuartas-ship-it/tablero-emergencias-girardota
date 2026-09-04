/* ============================================================
   Tablero de atención de emergencias — Girardota
   Sismo del 10 de agosto de 2026
   Datos manuales en localStorage. Estructura lista para migrar a Firebase.
   ============================================================ */

const STORE_KEY = "girardota_emergencias_v2";

const SECTORS = {
  afectaciones: {
    label: "Afectaciones generales",
    tipos: ["Afectación en vivienda", "Colapso estructural", "Movimiento en masa / deslizamiento",
            "Personas heridas / atrapadas", "Evacuación", "Grietas / fisuras", "Otro"]
  },
  educacion: {
    label: "Educación / Escuelas",
    tipos: ["Daño estructural en sede", "Sede inhabilitada", "Afectación en muros / techos",
            "Suspensión de clases", "Afectación de mobiliario", "Sin afectación (revisión)", "Otro"]
  },
  infraestructura: {
    label: "Infraestructura pública",
    tipos: ["Vías / puentes", "Edificio público / administrativo", "Acueducto / alcantarillado",
            "Energía eléctrica", "Telecomunicaciones", "Centro de salud", "Parque / espacio público", "Otro"]
  }
};

// Instituciones Educativas de Girardota y sus sedes (ubic = vereda/barrio oficial para el mapa)
const EDU_IE = {
  "I.E. Manuel José Sierra": [
    { sede: "Sede Central Manuel José Sierra (Urbana)", zona: "Urbano", ubic: "Centro", dir: "Carrera 10A 10D-12" },
    { sede: "Sede Escuela Rural Jamundí", zona: "Rural", ubic: "Jamundi" },
    { sede: "Sede Escuela Rural La Mata", zona: "Rural", ubic: "La Mata" },
    { sede: "Sede Escuela Rural San Esteban", zona: "Rural", ubic: "San Esteban" },
    { sede: "Sede Escuela Rural La Holanda", zona: "Rural", ubic: "La Holanda", dir: "Holanda Baja" },
    { sede: 'Sede Escuela Rural "Simón Urrea"', zona: "Rural", ubic: "El Barro" },
    { sede: 'Escuela Rural "Gabriel Sierra"', zona: "Rural", ubic: "Portachuelo" },
    { sede: "Escuela Rural Holanda Alta", zona: "Rural", ubic: "La Holanda" },
    { sede: 'Sede Escuela Rural "Luz Pérez de Vega"', zona: "Rural", ubic: "El Totumo" }
  ],
  "I.E. Atanasio Girardot": [
    { sede: "Sede Central Atanasio Girardot (Urbana)", zona: "Urbano", ubic: "Centro", dir: "Carrera 11 No. 16-11" },
    { sede: "Sede Escuela Rural Olaya Herrera", zona: "Rural", ubic: "Juan Cojo" },
    { sede: "Sede Escuela Rural La Manga", zona: "Rural", ubic: "Manga Arriba" },
    { sede: "Sede Girardota La Nueva (Urbana)", zona: "Urbano", ubic: "Girardota La Nueva", dir: "Carrera 17 No. 12A-063" },
    { sede: "Escuela Rural San José", zona: "Rural", ubic: "Las Cuchillas" }
  ],
  "I.E. Nuestra Señora del Carmen": [
    { sede: "Sede Central Nuestra Señora del Carmen (Rural)", zona: "Rural", ubic: "Encenillos" },
    { sede: "Sede Escuela Rural El Palmar", zona: "Rural", ubic: "El Palmar" },
    { sede: "Sede Escuela Rural La Meseta", zona: "Rural", ubic: "La Meseta" },
    { sede: "Sede Escuela Rural San Diego", zona: "Rural", ubic: "San Diego" },
    { sede: 'Sede Escuela Rural "Jerónimo Vanegas"', zona: "Rural", ubic: "El Cano" },
    { sede: "Sede Escuela Rural El Yarumo", zona: "Rural", ubic: "El Yarumo" }
  ],
  "I.E. San Andrés": [
    { sede: "Sede Central San Andrés (Rural)", zona: "Rural", ubic: "San Andres" },
    { sede: "Sede Escuela Rural La Peña", zona: "Rural", ubic: "La Palma" },
    { sede: "Sede Escuela Rural Mercedes Abrego", zona: "Rural", ubic: "Mercedes Abrego" },
    { sede: "Escuela Rural El Socorro", zona: "Rural", ubic: "El Socorro" },
    { sede: "Escuela Rural La Matica Baja", zona: "Rural", ubic: "La Matica" },
    { sede: "Escuela Rural Potrerito", zona: "Rural", ubic: "Potrerito" },
    { sede: 'Sede Escuela Rural "Hernando Arturo Castrillón Marín"', zona: "Rural", ubic: "El Paraiso" }
  ],
  "Otra / privada": []
};

const ESTADOS = ["Reportado", "En atención", "Inspeccionado", "Crítico", "Atendido"];
const ESTADO_COLOR = { "Reportado": "#3aa0ff", "En atención": "#ffd21e", "Inspeccionado": "#ff8a3a", "Crítico": "#e5484d", "Atendido": "#35c46b" };
const ESTADO_BADGE = { "Reportado": "b-reportado", "En atención": "b-atencion", "Inspeccionado": "b-inspeccionado", "Crítico": "b-critico", "Atendido": "b-atendido" };
// Etiqueta visible de cada estado (el valor interno se mantiene por compatibilidad)
const ESTADO_LABEL = { "Reportado": "Reportado", "En atención": "En atención", "Inspeccionado": "Con afectaciones - Monitoreo", "Crítico": "Crítico", "Atendido": "Atendido" };
function estadoLabel(e) { return ESTADO_LABEL[e] || e; }
// Conteo por estado usando la ETIQUETA visible (para que los gráficos coincidan con la leyenda)
function countByEstado(rows) {
  const m = {};
  for (const r of rows) { const k = estadoLabel(r.estado || "Sin dato"); m[k] = (m[k] || 0) + 1; }
  return m;
}
const ESTADO_COLOR_LABEL = {};
Object.keys(ESTADO_COLOR).forEach(e => { ESTADO_COLOR_LABEL[estadoLabel(e)] = ESTADO_COLOR[e]; });
const PRIOR_COLOR = { "Alta": "#e5484d", "Media": "#f5a623", "Baja": "#35c46b" };
const OPER_COLOR = { "Operativa": "#35c46b", "Parcialmente operativa": "#f5a623", "No operativa": "#e5484d" };

let DATA = [];
let currentTab = "resumen";
let map, geoLayer, markerLayer;
let charts = {};
let centroids = {}; // nombre -> [lat,lon]
let ubicList = [];  // {nombre, tipo, zona}
let pendingFotos = []; // dataURLs en edición actual

/* ---------- Utilidades ---------- */
const $ = (s) => document.querySelector(s);
const el = (id) => document.getElementById(id);
function uid() { return "R" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
function fmtDate(iso) { const d = new Date(iso); return d.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }

/* ---------- Fotos: compresión y previsualización ---------- */
function resizeImage(file, maxPx = 900, quality = 0.6) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > h && w > maxPx) { h = Math.round(h * maxPx / w); w = maxPx; }
        else if (h > maxPx) { w = Math.round(w * maxPx / h); h = maxPx; }
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
async function handleFotoInput(ev) {
  const files = Array.from(ev.target.files || []);
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    const url = await resizeImage(f);
    if (url) pendingFotos.push(url);
  }
  ev.target.value = "";
  renderFotoPreview();
}
function renderFotoPreview() {
  el("fotoPreview").innerHTML = pendingFotos.map((u, i) =>
    `<div class="thumb"><img src="${u}"><b data-fdel="${i}">×</b></div>`).join("");
  el("fotoPreview").querySelectorAll("[data-fdel]").forEach(b =>
    b.onclick = () => { pendingFotos.splice(+b.dataset.fdel, 1); renderFotoPreview(); });
}

/* ---------- Geometría: centroides y listas ---------- */
function polyCentroid(coords) {
  // coords: array de anillos; usamos el anillo exterior
  const ring = coords[0];
  let x = 0, y = 0, n = 0;
  for (const [lon, lat] of ring) { x += lon; y += lat; n++; }
  return [y / n, x / n];
}
function buildGeoIndex() {
  const feats = (window.GIRARDOTA_GEO && window.GIRARDOTA_GEO.features) || [];
  for (const f of feats) {
    const p = f.properties || {};
    if ((p.tipo === "vereda" || p.tipo === "barrio") && p.nombre) {
      let c = null;
      try {
        c = f.geometry.type === "Polygon" ? polyCentroid(f.geometry.coordinates)
          : polyCentroid(f.geometry.coordinates[0]);
      } catch (e) { c = null; }
      if (c) centroids[p.nombre] = c;
      ubicList.push({ nombre: p.nombre, tipo: p.tipo, zona: p.tipo === "barrio" ? "Urbano" : "Rural" });
    }
  }
  ubicList.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/* ---------- Almacenamiento ---------- */
function load() {
  try { DATA = JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch (e) { DATA = []; }
  // Modo NUBE: la fuente compartida es Firestore. Arrancamos con la carga
  // inicial para que algo se vea, y la suscripción (boot) la refina en vivo.
  if (window.CLOUD && CLOUD.enabled) {
    DATA = (window.REPORTES_INICIALES || []).slice();
    return;
  }
  // Carga inicial (registro fotográfico de Escuelas). Se re-siembra cuando el
  // conjunto inicial cambia (REPORTES_BUILD distinto), salvo que ya existan
  // reportes ingresados manualmente (id que no empieza por "EDU"), para no perderlos.
  const savedBuild = localStorage.getItem(STORE_KEY + "_build");
  const curBuild = window.REPORTES_BUILD || "";
  const hasManual = DATA.some(r => !/^(EDU|INF|AFEC)\d+$/.test(r.id || ""));
  if (window.REPORTES_INICIALES && (!DATA.length || (savedBuild !== curBuild && !hasManual))) {
    DATA = window.REPORTES_INICIALES.slice();
    localStorage.setItem(STORE_KEY + "_build", curBuild);
    save();
  }
}
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(DATA));
  } catch (e) {
    alert("El almacenamiento del navegador está lleno (probablemente por las fotos). " +
      "Exporta a CSV y/o elimina reportes antiguos. Para muchas fotos conviene conectar Firebase.");
  }
  el("storeInfo").textContent = "· " + DATA.length + " reportes almacenados.";
}

/* ---------- Datos de ejemplo (borrables) ---------- */
function seedDemo() {
  const mk = (o) => Object.assign({
    id: uid(), fecha: new Date(2026, 7, 10, 8, 0).toISOString(),
    heridos: 0, personas: 0, estudiantes: 0, vivAfect: 0, vivEvac: 0,
    visita: "Sí", reportante: "CMGRD Girardota", telefono: "", sectorLocal: "",
    caracter: "", operativa: "", estadoInfra: "", tipoEdificio: "", secretaria: "",
    institucion: "", sede: "",
    atendidoPor: "", obsAtencion: "", fechaAtencion: "",
    lat: null, lon: null, fotos: [], demo: true
  }, o);
  return [
    mk({ sector: "educacion", institucion: "I.E. Manuel José Sierra", sede: "Sede Central Manuel José Sierra (Urbana)", sitio: "Sede Central Manuel José Sierra (Urbana)", tipo: "Daño estructural en sede", caracter: "Pública", operativa: "No operativa", estadoInfra: "Uso restringido", zona: "Urbano", ubic: "Centro", estado: "Inspeccionado", prioridad: "Alta", estudiantes: 420, personas: 12, desc: "Fisuras en muros del bloque nuevo; se suspenden clases." }),
    mk({ sector: "educacion", institucion: "I.E. Manuel José Sierra", sede: "Sede Escuela Rural San Esteban", sitio: "Sede Escuela Rural San Esteban", tipo: "Suspensión de clases", caracter: "Pública", operativa: "No operativa", estadoInfra: "En evaluación", zona: "Rural", ubic: "San Esteban", estado: "Reportado", prioridad: "Media", estudiantes: 85, desc: "Caída de tejas; revisión pendiente." }),
    mk({ sector: "educacion", institucion: "I.E. Atanasio Girardot", sede: "Sede Central Atanasio Girardot (Urbana)", sitio: "Sede Central Atanasio Girardot (Urbana)", tipo: "Afectación en muros / techos", caracter: "Pública", operativa: "Parcialmente operativa", estadoInfra: "Habitable", zona: "Urbano", ubic: "Centro", estado: "En atención", prioridad: "Media", estudiantes: 610, desc: "Grietas en aula múltiple." }),
    mk({ sector: "educacion", institucion: "I.E. San Andrés", sede: "Sede Central San Andrés (Rural)", sitio: "Sede Central San Andrés (Rural)", tipo: "Sin afectación (revisión)", caracter: "Pública", operativa: "Operativa", estadoInfra: "Sin daño", zona: "Rural", ubic: "San Andres", estado: "Atendido", prioridad: "Baja", estudiantes: 0, desc: "Revisión sin hallazgos." }),
    mk({ sector: "infraestructura", tipo: "Vías / puentes", sitio: "Puente vereda Juan Cojo", tipoEdificio: "Vía / puente", secretaria: "Infraestructura / Obras Públicas", operativa: "No operativa", estadoInfra: "Uso restringido", zona: "Rural", ubic: "Juan Cojo", estado: "Inspeccionado", prioridad: "Alta", personas: 0, desc: "Agrietamiento en estribo; paso restringido." }),
    mk({ sector: "infraestructura", tipo: "Edificio público / administrativo", sitio: "Casa de la Cultura", tipoEdificio: "Cultural / deportivo", secretaria: "Cultura y Deporte", operativa: "Parcialmente operativa", estadoInfra: "Uso restringido", zona: "Urbano", ubic: "Centro", estado: "En atención", prioridad: "Media", desc: "Desprendimiento de cielo raso." }),
    mk({ sector: "infraestructura", tipo: "Acueducto / alcantarillado", sitio: "Bocatoma La Holanda", tipoEdificio: "Servicios públicos", secretaria: "Servicios Públicos", operativa: "No operativa", estadoInfra: "En evaluación", zona: "Rural", ubic: "La Holanda", estado: "Reportado", prioridad: "Alta", personas: 300, desc: "Turbiedad y posible ruptura de tubería." }),
    mk({ sector: "infraestructura", tipo: "Centro de salud", sitio: "Hospital San Rafael", tipoEdificio: "Salud", secretaria: "Salud", operativa: "Operativa", estadoInfra: "Sin daño", zona: "Urbano", ubic: "Centro", estado: "Atendido", prioridad: "Media", desc: "Revisión estructural sin daños mayores." }),
    mk({ sector: "afectaciones", tipo: "Afectación en vivienda", sitio: "Casa familia Restrepo", sectorLocal: "Parte alta", zona: "Urbano", ubic: "El Salado", estado: "Reportado", prioridad: "Alta", vivAfect: 8, vivEvac: 3, personas: 24, heridos: 1, reportante: "Ana Restrepo", telefono: "300 123 4567", desc: "Grietas en varias viviendas ladera." }),
    mk({ sector: "afectaciones", tipo: "Movimiento en masa / deslizamiento", sitio: "Sector La Loma", sectorLocal: "La loma", zona: "Rural", ubic: "Loma de los Ochoa", estado: "En atención", prioridad: "Alta", vivAfect: 4, vivEvac: 4, personas: 15, reportante: "Líder comunal", telefono: "301 555 2020", desc: "Deslizamiento activado por el sismo." }),
    mk({ sector: "afectaciones", tipo: "Colapso estructural", sitio: "Vivienda barrio Aurelio Mejía", zona: "Urbano", ubic: "Aurelio Mejia", estado: "Inspeccionado", prioridad: "Alta", vivAfect: 2, vivEvac: 2, personas: 7, heridos: 2, desc: "Colapso parcial de muro." }),
    mk({ sector: "afectaciones", tipo: "Grietas / fisuras", sitio: "Conjunto Guaduales", zona: "Urbano", ubic: "Guaduales", estado: "Reportado", prioridad: "Media", vivAfect: 5, personas: 18, desc: "Fisuras no estructurales." }),
    mk({ sector: "afectaciones", tipo: "Evacuación", sitio: "Vivienda vereda Potrerito", zona: "Rural", ubic: "Potrerito", estado: "Atendido", prioridad: "Baja", vivAfect: 1, vivEvac: 1, personas: 3, desc: "Familia reubicada preventivamente." })
  ];
}

/* ============================================================
   FILTRADO
   ============================================================ */
function getFilters() {
  return {
    zona: el("fZona").value,
    ubic: el("fUbic").value,
    estado: el("fEstado").value,
    prioridad: el("fPrioridad").value,
    q: el("fBuscar").value.trim().toLowerCase()
  };
}
function filtered(ignoreEstado) {
  const f = getFilters();
  return DATA.filter(r => {
    if (currentTab !== "resumen" && currentTab !== "atencion" && r.sector !== currentTab) return false;
    if (currentTab !== "resumen" && currentTab !== "atencion" && r.campo) return false; // los eventos de atención en campo solo van en la pestaña Atención
    if (f.zona && r.zona !== f.zona) return false;
    if (f.ubic && r.ubic !== f.ubic) return false;
    if (!ignoreEstado && f.estado && r.estado !== f.estado) return false;
    if (f.prioridad && r.prioridad !== f.prioridad) return false;
    if (f.q) {
      const hay = (r.sitio + " " + r.desc + " " + r.tipo + " " + r.ubic + " " + (r.reportante || "")).toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });
}

/* ============================================================
   KPIs
   ============================================================ */
function renderKPIs(rows) {
  const n = rows.length;
  const by = (e) => rows.filter(r => r.estado === e).length;
  const pend = by("Reportado");
  const aten = by("En atención");
  const insp = by("Inspeccionado");
  const hecho = by("Atendido");
  const crit = by("Crítico");
  const alta = rows.filter(r => r.prioridad === "Alta").length;
  // "Atendidas" = todo lo ya visitado/clasificado en campo: atendido + con afectaciones + crítico
  const atendidasTot = hecho + insp + crit;

  let cards = [
    { cls: "total", ic: "⚠️", num: n, lab: "Total reportado", est: "" },
    { cls: "rep", ic: "📍", num: pend, lab: "Para atención", est: "Reportado" },
    { cls: "aten", ic: "🛠️", num: aten, lab: "En atención", est: "En atención" },
    { cls: "insp", ic: "🔎", num: insp, lab: "Con afectaciones (atendidas)", est: "Inspeccionado" },
    { cls: "crit", ic: "🔴", num: crit, lab: "Crítico (atendido)", est: "Crítico" },
    { cls: "hecho", ic: "✅", num: atendidasTot, lab: "Atendidas (total)", est: "" }
  ];

  const noOper = rows.filter(r => r.operativa === "No operativa").length;
  if (currentTab === "educacion") {
    const est = rows.reduce((s, r) => s + (+r.estudiantes || 0), 0);
    const sedes = new Set(rows.map(r => r.sitio)).size;
    cards = [
      { cls: "rep", ic: "🏫", num: n, lab: "Reportes educativos" },
      { cls: "insp", ic: "🏫", num: sedes, lab: "Sedes involucradas" },
      { cls: "rep", ic: "🚫", num: noOper, lab: "Sedes no operativas" },
      { cls: "rep", ic: "🎒", num: est, lab: "Estudiantes afectados" },
      { cls: "hecho", ic: "✅", num: atendidasTot, lab: "Atendidas" }
    ];
  } else if (currentTab === "infraestructura") {
    cards = [
      { cls: "rep", ic: "🏛️", num: n, lab: "Reportes infraestr." },
      { cls: "rep", ic: "🚫", num: noOper, lab: "No operativas" },
      { cls: "rep", ic: "🔴", num: alta, lab: "Prioridad alta" },
      { cls: "aten", ic: "🛠️", num: aten, lab: "En atención" },
      { cls: "hecho", ic: "✅", num: atendidasTot, lab: "Atendidas" }
    ];
  } else if (currentTab === "afectaciones") {
    const vivA = rows.reduce((s, r) => s + (+r.vivAfect || 0), 0);
    const vivE = rows.reduce((s, r) => s + (+r.vivEvac || 0), 0);
    // Verificado en campo = ya tuvo visita (visita "Sí") o su estado implica intervención en terreno.
    const visitado = r => String(r.visita || "").toLowerCase().startsWith("s") || r.estado === "Inspeccionado" || r.estado === "Atendido";
    const perVerif = rows.reduce((s, r) => s + (visitado(r) ? (+r.personas || 0) : 0), 0);
    const perPend = rows.reduce((s, r) => s + (!visitado(r) ? (+r.personas || 0) : 0), 0);
    const her = rows.reduce((s, r) => s + (+r.heridos || 0), 0);
    cards = [
      { cls: "rep", ic: "⚠️", num: n, lab: "Reportes" },
      { cls: "rep", ic: "🏠", num: vivA, lab: "Viviendas afectadas" },
      { cls: "aten", ic: "📦", num: vivE, lab: "Viviendas evacuadas" },
      { cls: "hecho", ic: "👥", num: perVerif, lab: "Personas verificadas (con visita)" },
      { cls: "aten", ic: "🕒", num: perPend, lab: "Personas reportadas pendientes" },
      { cls: "rep", ic: "🚑", num: her, lab: "Heridos" }
    ];
  }

  const fe = el("fEstado").value;
  el("kpis").innerHTML = cards.map(c => {
    const attr = c.est ? ` data-estado="${c.est}"` : "";
    const cl = "kpi " + c.cls + (c.est ? " click" : "") + (c.est && fe === c.est ? " active" : "");
    return `<div class="${cl}"${attr}><div class="ic">${c.ic}</div>
      <div><div class="num">${c.num}</div><div class="lab">${c.lab}</div></div></div>`;
  }).join("");
}

/* ============================================================
   GRÁFICOS
   ============================================================ */
function countBy(rows, key) {
  const m = {};
  for (const r of rows) { const k = r[key] || "Sin dato"; m[k] = (m[k] || 0) + 1; }
  return m;
}
function sumBy(rows, keyGroup, keyVal) {
  const m = {};
  for (const r of rows) { const k = r[keyGroup] || "Sin dato"; m[k] = (m[k] || 0) + (+r[keyVal] || 0); }
  return m;
}
function topN(obj, n) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function destroyCharts() { for (const k in charts) { charts[k].destroy(); } charts = {}; }

const baseOpts = (extra = {}) => Object.assign({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: "#c8d6e0", font: { size: 10 }, boxWidth: 12 } } },
  scales: {}
}, extra);
const axisColor = { ticks: { color: "#93a7b6", font: { size: 10 } }, grid: { color: "#22323f" } };

function doughnut(id, obj, colorMap) {
  const labels = Object.keys(obj), vals = Object.values(obj);
  const colors = labels.map(l => (colorMap && colorMap[l]) || pickColor(l));
  charts[id] = new Chart(el(id), {
    type: "doughnut",
    data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderColor: "#0e1620", borderWidth: 2 }] },
    options: baseOpts({ cutout: "60%", plugins: { legend: { position: "right", labels: { color: "#c8d6e0", font: { size: 10 }, boxWidth: 12 } } } })
  });
}
function barH(id, entries, color) {
  charts[id] = new Chart(el(id), {
    type: "bar",
    data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: color || "#16b3b3", borderRadius: 3 }] },
    options: baseOpts({ indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: axisColor, y: axisColor } })
  });
}
function barV(id, obj, colorMap) {
  const labels = Object.keys(obj);
  charts[id] = new Chart(el(id), {
    type: "bar",
    data: { labels, datasets: [{ data: Object.values(obj), backgroundColor: labels.map(l => (colorMap && colorMap[l]) || "#16b3b3"), borderRadius: 3 }] },
    options: baseOpts({ plugins: { legend: { display: false } }, scales: { x: axisColor, y: axisColor } })
  });
}
const PALETTE = ["#16b3b3", "#3aa0ff", "#f5a623", "#e5484d", "#35c46b", "#a06bff", "#ff7ab6", "#7fd8d8", "#ffa94d", "#8cc6ff"];
const _pc = {};
function pickColor(k) { if (!_pc[k]) { _pc[k] = PALETTE[Object.keys(_pc).length % PALETTE.length]; } return _pc[k]; }

function card(title, canvasId, sm) {
  return `<div class="card"><h3>${title}</h3><div class="chartbox ${sm ? "sm" : ""}"><canvas id="${canvasId}"></canvas></div></div>`;
}

function renderCharts(rows) {
  destroyCharts();
  const L = el("colLeft"), R = el("colRight");

  if (currentTab === "resumen") {
    L.innerHTML = card("Reportes por sector", "cSector") + card("Estado de atención", "cEstado", true) + card("Prioridad", "cPrior", true);
    R.innerHTML = card("Tipo de emergencia", "cTipo") + card("¿Requiere visita técnica?", "cVisita", true) + card("Animales afectados", "cAnim", true);
    const secMap = countBy(rows, "sector");
    barV("cSector", { "Educación": secMap.educacion || 0, "Infraestr.": secMap.infraestructura || 0, "Afectaciones": secMap.afectaciones || 0 },
      { "Educación": "#3aa0ff", "Infraestr.": "#a06bff", "Afectaciones": "#f5a623" });
    doughnut("cEstado", countByEstado(rows), ESTADO_COLOR_LABEL);
    doughnut("cPrior", countBy(rows, "prioridad"), PRIOR_COLOR);
    barH("cTipo", topN(countBy(rows, "tipoEvento"), 8), "#16b3b3");
    doughnut("cVisita", countBy(rows, "visita"), { "Sí": "#e5484d", "No": "#35c46b" });
    doughnut("cAnim", countBy(rows, "animales"), { "Sin animales afectados": "#8CC63F", "Con animales afectados": "#f5a623", "Sin dato": "#7a8a97" });

  } else if (currentTab === "educacion") {
    L.innerHTML = card("Estado de atención", "cEstado", true) + card("Operatividad de sedes", "cOper", true) + card("Carácter (pública/privada)", "cCar", true);
    R.innerHTML = card("Estudiantes afectados por ubicación", "cEst") + card("Tipo de afectación", "cTipo") + card("Reportes por ubicación", "cUbic");
    doughnut("cEstado", countByEstado(rows), ESTADO_COLOR_LABEL);
    doughnut("cOper", countBy(rows, "operativa"), OPER_COLOR);
    doughnut("cCar", countBy(rows, "caracter"), { "Pública": "#16b3b3", "Privada": "#a06bff", "Mixta": "#f5a623" });
    barH("cEst", topN(sumBy(rows, "ubic", "estudiantes"), 7), "#f5a623");
    barH("cTipo", topN(countBy(rows, "tipo"), 7), "#3aa0ff");
    barH("cUbic", topN(countBy(rows, "ubic"), 7), "#16b3b3");

  } else if (currentTab === "infraestructura") {
    L.innerHTML = card("Estado de atención", "cEstado", true) + card("Operatividad", "cOper", true) + card("Estado estructural", "cEstr", true);
    R.innerHTML = card("Tipo de infraestructura afectada", "cTipo") + card("Reportes por secretaría", "cSec") + card("Reportes por ubicación", "cUbic");
    doughnut("cEstado", countByEstado(rows), ESTADO_COLOR_LABEL);
    doughnut("cOper", countBy(rows, "operativa"), OPER_COLOR);
    doughnut("cEstr", countBy(rows, "estadoInfra"), null);
    barH("cTipo", topN(countBy(rows, "tipo"), 8), "#a06bff");
    barH("cSec", topN(countBy(rows, "secretaria"), 7), "#3aa0ff");
    barH("cUbic", topN(countBy(rows, "ubic"), 7), "#16b3b3");

  } else if (currentTab === "afectaciones") {
    L.innerHTML = card("Estado de atención", "cEstado", true) + card("Prioridad", "cPrior", true) + card("Tipo de afectación", "cTipo") + card("Animales afectados", "cAnim", true);
    R.innerHTML = card("Viviendas afectadas por ubicación", "cViv") + card("Tipo de estructura", "cEstr") + card("Viviendas: afectadas vs evacuadas", "cVE", true);
    doughnut("cEstado", countByEstado(rows), ESTADO_COLOR_LABEL);
    doughnut("cPrior", countBy(rows, "prioridad"), PRIOR_COLOR);
    barH("cTipo", topN(countBy(rows, "tipo"), 7), "#f5a623");
    doughnut("cAnim", countBy(rows, "animales"), { "Sin animales afectados": "#8CC63F", "Con animales afectados": "#f5a623", "Sin dato": "#7a8a97" });
    barH("cViv", topN(sumBy(rows, "ubic", "vivAfect"), 7), "#e5484d");
    barH("cEstr", topN(countBy(rows, "tipoEstructura"), 8), "#3aa0ff");
    const vA = rows.reduce((s, r) => s + (+r.vivAfect || 0), 0), vE = rows.reduce((s, r) => s + (+r.vivEvac || 0), 0);
    barV("cVE", { "Afectadas": vA, "Evacuadas": vE }, { "Afectadas": "#e5484d", "Evacuadas": "#f5a623" });
  }
}

/* ============================================================
   MAPA
   ============================================================ */
function initMap() {
  map = L.map("map", { zoomControl: true }).setView([6.379, -75.445], 12);

  // ---- Capas base seleccionables ----
  const mapaBase = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Mosaicos &copy; Esri &mdash; Esri, DeLorme, HERE", maxZoom: 20, maxNativeZoom: 16
  });
  const satelital = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Imágenes &copy; Esri, Maxar, Earthstar Geographics", maxZoom: 20
  });
  const terreno = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenTopoMap (CC-BY-SA)", maxZoom: 17
  });
  const mapaClaro = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Mosaicos &copy; Esri &mdash; Esri, DeLorme, HERE", maxZoom: 20, maxNativeZoom: 16
  });
  mapaBase.addTo(map);
  baseLayers = { "🗺️ Mapa base": mapaBase, "🛰️ Satelital": satelital, "⛰️ Terreno": terreno, "☀️ Mapa claro": mapaClaro };

  const geo = window.GIRARDOTA_GEO;
  geoLayer = L.geoJSON(geo, {
    style: (f) => {
      const t = f.properties.tipo;
      if (t === "limite_municipal") return { color: "#ffffff", weight: 2.5, fill: false };
      if (t === "perimetro_urbano") return { color: "#16b3b3", weight: 1.5, fill: false, dashArray: "4 4" };
      if (t === "vereda") return { color: "#3a5566", weight: 0.7, fillColor: "#16323f", fillOpacity: 0.25 };
      if (t === "barrio") return { color: "#4a6b7d", weight: 0.6, fillColor: "#1c3947", fillOpacity: 0.35 };
      return { color: "#666", weight: 1 };
    },
    onEachFeature: (f, lyr) => {
      const p = f.properties;
      if (p.tipo === "vereda" || p.tipo === "barrio")
        lyr.bindTooltip(p.nombre + " (" + p.tipo + ")", { sticky: true });
    }
  }).addTo(map);
  try {
    map.fitBounds(geoLayer.getBounds(), { padding: [10, 10] });
    // Este encuadre queda como zoom mínimo: no se puede alejar más
    map.setMinZoom(map.getZoom());
    // Limitar el paneo alrededor de Girardota
    map.setMaxBounds(geoLayer.getBounds().pad(0.25));
    map.options.maxBoundsViscosity = 0.7;
  } catch (e) {}
  markerLayer = L.layerGroup().addTo(map);
  buildGeoportalLayers();
  addLegend();
}

/* ---------- Leyenda del mapa ---------- */
function addLegend() {
  const legend = L.control({ position: "bottomleft" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "map-legend");
    div.innerHTML =
      `<div class="lg-title">Leyenda</div>
       <div class="lg-sec">Capas del mapa</div>
       <div class="lg-row"><i class="lg-line" style="background:#2a8cff"></i>Río Aburrá (Medellín)</div>
       <div class="lg-row"><i class="lg-line" style="background:#B4E64D"></i>Límites veredales</div>`;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  legend.addTo(map);
}

/* ---------- Capas base + capa hídrica del Geoportal ---------- */
let geoOverlays = {};
let baseLayers = {};
function buildGeoportalLayers() {
  const GP = window.GEOPORTAL || {};

  // Límites veredales oficiales (desde geodata.js)
  const geoBase = window.GIRARDOTA_GEO;
  if (geoBase) {
    const veredas = { type: "FeatureCollection", features: geoBase.features.filter(f => f.properties.tipo === "vereda") };
    geoOverlays["🗺️ Límites veredales"] = L.geoJSON(veredas, {
      style: { color: "#B4E64D", weight: 2.2, opacity: 1, fill: true, fillColor: "#B4E64D", fillOpacity: 0.05 },
      onEachFeature: (f, l) => l.bindTooltip(f.properties.nombre, { sticky: true })
    });
  }

  // Red hídrica (quebradas / subcuencas) — verde limón de la marca
  if (GP.red_subcuencas) geoOverlays["💧 Red hídrica (quebradas)"] = L.geoJSON(GP.red_subcuencas, {
    style: { color: "#8CC63F", weight: 1.8, opacity: 1 },
    onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Nombre || "Cauce"}</b>`)
  });

  // Red Hídrica Municipal (drenajes)
  if (GP.red_hidrica_muni) geoOverlays["💧 Red Hídrica Muni (drenajes)"] = L.geoJSON(GP.red_hidrica_muni, {
    style: { color: "#6FB63A", weight: 0.9, opacity: 0.9 }
  });

  // Red oficial CORANTIOQUIA
  if (GP.red_oficial_corantioquia) geoOverlays["🐊 Red oficial CORANTIOQUIA"] = L.geoJSON(GP.red_oficial_corantioquia, {
    style: { color: "#D6F06B", weight: 1.5, opacity: 1 },
    onEachFeature: (f, l) => { const n = f.properties.NMG; if (n) l.bindPopup(`<b>${n}</b>`); }
  });

  // Río Aburrá (cauce principal): SIEMPRE visible (capa fija, no aparece en el control).
  // Fuente: red oficial CORANTIOQUIA, cauce con NMG "Medellin" (el tronco del río, ~11 km),
  // no la subcuenca completa (que traía toda la red de afluentes).
  if (GP.red_oficial_corantioquia) {
    const rio = { type: "FeatureCollection", features: GP.red_oficial_corantioquia.features.filter(f => (f.properties.NMG || "").trim().toLowerCase() === "medellin") };
    if (rio.features.length) {
      L.geoJSON(rio, {
        style: { color: "#2a8cff", weight: 3.6, opacity: 0.97 },
        onEachFeature: (f, l) => l.bindTooltip("Río Aburrá (Río Medellín)", { sticky: true })
      }).addTo(map);
    }
  }

  // Menú de capas: capas base (radio) + capas de contexto (checkbox)
  L.control.layers(baseLayers, geoOverlays, { collapsed: true, position: "topright" }).addTo(map);
}

// Diagnóstico según estado (color). Aplica a TODOS los sectores:
// educación, infraestructura y reportes de afectaciones.
const RISK = {
  "Reportado": "Reportado, sin evaluar",
  "En atención": "En atención",
  "Inspeccionado": "Sin evacuación, con recomendaciones de intervención estructural",
  "Crítico": "Crítico – en riesgo",
  "Atendido": "Sin riesgo"
};
const RISK_ICON = { "Reportado": "📍", "En atención": "🛠️", "Inspeccionado": "🟠", "Crítico": "⛔", "Atendido": "✅" };
function riskText(r) { return RISK[r.estado] || r.estado; }
function riskLabel(r) { return (RISK_ICON[r.estado] || "•") + " " + riskText(r); }

function renderMap(rows) {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  const seen = {};
  for (const r of rows) {
    let lat = r.lat, lon = r.lon;
    if (lat == null || lon == null) continue; // sin coordenadas exactas -> no se dibuja en el mapa
    // Separar puntos que caen casi en el mismo lugar (evita que se monten unos sobre otros)
    const gkey = lat.toFixed(4) + "," + lon.toFixed(4);
    const idx = seen[gkey] || 0; seen[gkey] = idx + 1;
    if (idx > 0) { const ang = idx * 1.7, rad = 0.0003 * (1 + Math.floor(idx / 6)); lat += Math.sin(ang) * rad; lon += Math.cos(ang) * rad; }
    const color = ESTADO_COLOR[r.estado] || "#16b3b3";
    const size = 15; // todos los puntos calientes del mismo tamaño (pequeños, evitan encimarse)
    const icon = L.divIcon({
      className: "heatpt",
      html: `<b style="--c:${color}"></b>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2]
    });
    const mk = L.marker([lat, lon], { icon });
    mk.bindPopup(
      `<b>${r.sitio}</b><br>${r.tipo}<br>` +
      `<b>Ubicación:</b> ${r.ubic} (${r.zona})<br>` +
      `<b>Estado:</b> ${r.estado} · <b>Prioridad:</b> ${r.prioridad}<br>` +
      `<b>Diagnóstico:</b> ${riskText(r)}<br>` +
      (r.institucion ? `<b>Institución:</b> ${r.institucion}<br>` : "") +
      (r.caracter ? `<b>Carácter:</b> ${r.caracter}<br>` : "") +
      (r.tipoEdificio ? `<b>Tipo edificio:</b> ${r.tipoEdificio}<br>` : "") +
      (r.secretaria ? `<b>Secretaría:</b> ${r.secretaria}<br>` : "") +
      (r.operativa ? `<b>Operatividad:</b> ${r.operativa}<br>` : "") +
      (r.estadoInfra ? `<b>Estado infraestructura:</b> ${r.estadoInfra}<br>` : "") +
      (r.estudiantes ? `<b>Estudiantes:</b> ${r.estudiantes}<br>` : "") +
      (r.vivAfect ? `<b>Viviendas afectadas:</b> ${r.vivAfect}<br>` : "") +
      (r.personas ? `<b>Personas:</b> ${r.personas}<br>` : "") +
      (r.animales === "Con animales afectados" ? `<b>Animales afectados:</b> ${r.animalesNum || "Sí"}<br>` : "") +
      (r.reportante ? `<b>Reporta:</b> ${r.reportante}${r.telefono ? " · " + r.telefono : ""}<br>` : "") +
      (r.desc ? `<i>${r.desc}</i>` : "") +
      (r.fotos && r.fotos.length ? `<div class="popup-fotos">${r.fotos.map(u => `<img src="${u}">`).join("")}</div>` : "")
    );
    // Tooltip al pasar el mouse: nombre de la institución + estado de riesgo
    const nombre = r.institucion || r.sitio;
    mk.bindTooltip(`<b>${nombre}</b><br>${riskLabel(r)}`, { direction: "top", offset: [0, -8], opacity: 0.95 });
    markerLayer.addLayer(mk);
  }
}

/* Mapa de la pestaña Necesidades: SOLO puntos de necesidades (EDAN),
   nunca los puntos de atención. Si un registro no tiene coordenadas,
   no se dibuja (mapa en blanco). */
function renderNeedsMap(rows) {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  const seen = {};
  for (const n of rows) {
    let lat = n.lat, lon = n.lon;
    if (lat == null || lon == null) continue; // sin coordenadas -> no se dibuja
    const gkey = lat.toFixed(4) + "," + lon.toFixed(4);
    const idx = seen[gkey] || 0; seen[gkey] = idx + 1;
    if (idx > 0) { const ang = idx * 1.7, rad = 0.0003 * (1 + Math.floor(idx / 6)); lat += Math.sin(ang) * rad; lon += Math.cos(ang) * rad; }
    const color = INMUEBLE_COLOR[n.estadoInmueble] || "#16b3b3";
    const size = 15;
    const icon = L.divIcon({ className: "heatpt", html: `<b style="--c:${color}"></b>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    const nec = EDAN_NEC.filter(x => n[x.k]).map(x => x.lab).join(", ") || "—";
    const nombre = (`${n.nombres || ""} ${n.apellidos || ""}`).trim() || "Registro EDAN";
    const mk = L.marker([lat, lon], { icon });
    mk.bindPopup(
      `<b>${nombre}</b><br>` +
      (n.numDoc ? `<b>Doc.:</b> ${n.tipoDoc || ""} ${n.numDoc}<br>` : "") +
      `<b>Ubicación:</b> ${n.ubic || "—"} (${n.zona || "—"})<br>` +
      (n.sitio ? `${n.sitio}<br>` : "") +
      `<b>Propiedad:</b> ${n.propiedad || "—"} · <b>Inmueble:</b> ${n.estadoInmueble || "—"}<br>` +
      `<b>Necesidades:</b> ${nec}` +
      (n.telefono ? `<br><b>Tel.:</b> ${n.telefono}` : "") +
      (n.obs ? `<br><i>${n.obs}</i>` : "")
    );
    mk.bindTooltip(`<b>${nombre}</b><br>${n.estadoInmueble || ""}`, { direction: "top", offset: [0, -8], opacity: 0.95 });
    markerLayer.addLayer(mk);
  }
}

/* ============================================================
   TABLA
   ============================================================ */
const SECTOR_LABEL = { educacion: "Educación", infraestructura: "Infraestructura", afectaciones: "Afectación" };
function operCell(v) {
  if (!v) return "—";
  const cls = v === "Operativa" ? "oper-si" : v === "No operativa" ? "oper-no" : "oper-par";
  return `<span class="${cls}">${v}</span>`;
}
function fotoCell(r) { return r.fotos && r.fotos.length ? `📷 ${r.fotos.length}` : "—"; }
function estadoCell(r) { return `<span class="badge ${ESTADO_BADGE[r.estado]}">${estadoLabel(r.estado)}</span>`; }
function ubicCell(r) { return `${r.ubic}<br><span style="color:var(--muted);font-size:10px">${r.zona}</span>`; }
function sitioCell(r) { return `${r.sitio}${r.demo ? '<span class="tag-demo">ej.</span>' : ""}`; }
function contactoCell(r) { return r.reportante ? `${r.reportante}${r.telefono ? "<br><span style='color:var(--muted);font-size:10px'>" + r.telefono + "</span>" : ""}` : "—"; }

function renderTable(rows) {
  // columnas por pestaña
  let cols;
  if (currentTab === "educacion") {
    const eduInst = r => `${r.institucion || r.sitio}${r.demo ? '<span class="tag-demo">ej.</span>' : ""}` +
      (r.sede ? `<br><span style="color:var(--muted);font-size:10px">${r.sede}</span>` : "");
    cols = [["Fecha", r => fmtDate(r.fecha)], ["Institución / sede", eduInst], ["Carácter", r => r.caracter || "—"],
      ["Tipo", r => r.tipo], ["Ubicación", ubicCell], ["Estado", estadoCell],
      ["Operativa", r => operCell(r.operativa)], ["Estudiantes", r => r.estudiantes || 0], ["📷", fotoCell]];
  } else if (currentTab === "infraestructura") {
    cols = [["Fecha", r => fmtDate(r.fecha)], ["Sitio", sitioCell], ["Tipo edificio", r => r.tipoEdificio || "—"],
      ["Secretaría", r => r.secretaria || "—"], ["Ubicación", ubicCell], ["Estado", estadoCell],
      ["Operativa", r => operCell(r.operativa)], ["Estado infra.", r => r.estadoInfra || "—"], ["📷", fotoCell]];
  } else if (currentTab === "afectaciones") {
    // Tabla acorde a la necesidad de atención: contacto + ubicación
    cols = [["Nombre", r => r.reportante || "—"],
      ["Teléfono", r => r.telefono ? `<b>${r.telefono}</b>` : "—"],
      ["Vereda / Barrio", ubicCell],
      ["Sector", r => r.sectorLocal || "—"],
      ["Tipo", r => r.tipo], ["Estado", estadoCell],
      ["Prioridad", r => { const p = r.prioridad || "Media"; return `<span class="p-${p.toLowerCase()}">${p}</span>`; }], ["📷", fotoCell]];
  } else {
    cols = [["Fecha", r => fmtDate(r.fecha)], ["Sitio", sitioCell], ["Peticionario", contactoCell], ["Sector", r => SECTOR_LABEL[r.sector] || r.sector],
      ["Tipo", r => r.tipo], ["Ubicación", ubicCell], ["Estado", estadoCell],
      ["Prioridad", r => { const p = r.prioridad || "Media"; return `<span class="p-${p.toLowerCase()}">${p}</span>`; }], ["Personas", r => r.personas || 0], ["📷", fotoCell]];
  }
  cols.push(["", r => `<span class="row-act" data-edit="${r.id}">✎</span> <span class="row-act" data-del="${r.id}">🗑</span>`]);

  el("tbl").querySelector("thead").innerHTML = "<tr>" + cols.map(c => `<th>${c[0]}</th>`).join("") + "</tr>";
  const tb = el("tbl").querySelector("tbody");
  if (!rows.length) { tb.innerHTML = `<tr><td colspan="${cols.length}"><div class="empty">Sin reportes para este filtro. Usa “＋ Nuevo reporte”.</div></td></tr>`; return; }
  rows = rows.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  tb.innerHTML = rows.map(r => "<tr>" + cols.map(c => `<td>${c[1](r)}</td>`).join("") + "</tr>").join("");
  tb.querySelectorAll("[data-del]").forEach(b => b.onclick = () => delReport(b.dataset.del));
  tb.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openModal(b.dataset.edit));
}

/* ============================================================
   RENDER PRINCIPAL
   ============================================================ */
function render() {
  if (currentTab === "necesidades") { renderNecesidades(); return; }
  if (currentTab === "atencion") { renderAtencion(); return; }
  const base = filtered(true);   // ignora el filtro de estado (para contar por estado)
  const rows = filtered();       // aplica todo (mapa + tabla)
  renderKPIs(base);
  renderCharts(rows);
  renderMap(rows);
  renderTable(rows);
  const tabLabel = { resumen: "Todos los reportes", educacion: "Reportes de Educación / Escuelas",
    infraestructura: "Reportes de Infraestructura pública", afectaciones: "Reportes de afectaciones" }[currentTab];
  el("tblTitle").textContent = "Detalle · " + tabLabel + " (" + rows.length + ")";
  el("mapTitle").textContent = "Mapa · " + tabLabel;
}

/* ============================================================
   PESTAÑA ATENCIÓN EN CAMPO — lista de pendientes para el equipo
   ============================================================ */
const PRANK = { "Alta": 0, "Media": 1, "Baja": 2 };
function renderAtencion() {
  // Solo los eventos marcados como atención en campo (emergencias atendidas en sitio)
  const rows = filtered().filter(r => r.campo);
  const by = e => rows.filter(r => r.estado === e).length;

  const cards = [
    { cls: "total", ic: "🚨", num: rows.length, lab: "Atenciones en campo" },
    { cls: "aten", ic: "🛠️", num: by("En atención"), lab: "En atención" },
    { cls: "insp", ic: "🔎", num: by("Inspeccionado"), lab: "Con afectaciones" },
    { cls: "crit", ic: "🔴", num: by("Crítico"), lab: "Críticas" },
    { cls: "hecho", ic: "✅", num: by("Atendido"), lab: "Atendidas" }
  ];
  el("kpis").innerHTML = cards.map(c =>
    `<div class="kpi ${c.cls}"><div class="ic">${c.ic}</div><div><div class="num">${c.num}</div><div class="lab">${c.lab}</div></div></div>`).join("");

  destroyCharts();
  el("colLeft").innerHTML = card("Por estado", "aEstado", true) + card("Por prioridad", "aPrior", true) + card("Por tipo de emergencia", "aTipo");
  el("colRight").innerHTML = card("Por ubicación", "aUbic") + card("Por zona", "aZona", true);
  doughnut("aEstado", countByEstado(rows), ESTADO_COLOR_LABEL);
  doughnut("aPrior", countBy(rows, "prioridad"), PRIOR_COLOR);
  barH("aTipo", topN(countBy(rows, "tipoEvento"), 8), "#f5a623");
  barH("aUbic", topN(countBy(rows, "ubic"), 8), "#3aa0ff");
  doughnut("aZona", countBy(rows, "zona"), { "Urbano": "#8CC63F", "Rural": "#3aa0ff" });

  renderMap(rows);

  const cols = ["Fecha", "Evento", "Tipo de emergencia", "Ubicación", "Estado", "Atendido por", "📷", "Acción"];
  el("tbl").querySelector("thead").innerHTML = "<tr>" + cols.map(c => `<th>${c}</th>`).join("") + "</tr>";
  const tb = el("tbl").querySelector("tbody");
  const list = rows.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (!list.length) { tb.innerHTML = `<tr><td colspan="${cols.length}"><div class="empty">Sin atenciones en campo registradas.</div></td></tr>`; }
  else tb.innerHTML = list.map(r => `<tr>
    <td>${fmtDate(r.fecha)}</td>
    <td>${sitioCell(r)}</td>
    <td>${r.tipoEvento || r.tipo}</td>
    <td>${ubicCell(r)}</td>
    <td>${estadoCell(r)}</td>
    <td>${r.atendidoPor || "—"}</td>
    <td>${fotoCell(r)}</td>
    <td><div class="wl-actions">
      <button class="btn sm att" data-atender="${r.id}">Ver / Actualizar</button>
      ${r.estado !== "Atendido" ? `<button class="btn sm close" data-cerrar="${r.id}">Cerrar</button>` : ""}
    </div></td></tr>`).join("");
  tb.querySelectorAll("[data-atender]").forEach(b => b.onclick = () => openModal(b.dataset.atender));
  tb.querySelectorAll("[data-cerrar]").forEach(b => b.onclick = () => closeReport(b.dataset.cerrar));

  el("tblTitle").textContent = "Atenciones en campo (" + list.length + ")";
  el("mapTitle").textContent = "Mapa · atenciones en campo";
}

function closeReport(id) {
  const r = DATA.find(x => x.id === id); if (!r) return;
  const who = prompt("Cerrar reporte: ¿quién lo atendió? (equipo/persona)", r.atendidoPor || "Comisión CMGRD");
  if (who === null) return;
  r.atendidoPor = who.trim();
  r.estado = "Atendido";
  if (!r.fechaAtencion) r.fechaAtencion = new Date().toISOString();
  save(); render();
}

/* ============================================================
   NECESIDADES — Registro EDAN (Evaluación de Daños y Análisis de
   Necesidades) · formato VOL-3 FR-1703-SMD-08. Un registro por
   persona/hogar afectado por el sismo.
   ============================================================ */
// Las 4 necesidades EDAN (AHE = Asistencia Humanitaria de Emergencia)
const EDAN_NEC = [
  { k: "ahAlim", lab: "AHE Alimentaria" },
  { k: "ahNoAlim", lab: "AHE No Alimentaria" },
  { k: "matRehab", lab: "Mat. rehab. vivienda" },
  { k: "subArriendo", lab: "Subsidio de arriendo" }
];
const INMUEBLE_COLOR = {
  "Habitable": "#35c46b", "Uso restringido": "#f5a623", "No habitable": "#e5484d",
  "Colapsado": "#e5484d", "En evaluación": "#3aa0ff"
};
const PROP_COLOR = { "Propia": "#35c46b", "Arriendo": "#f5a623", "Familiar": "#3aa0ff", "Otro": "#a06bff" };
const GENERO_COLOR = { "Femenino": "#ff7ab6", "Masculino": "#3aa0ff", "Otro": "#a06bff" };
const STORE_NEC = "girardota_necesidades_v3";
let NEEDS = [];

// Sin datos precargados: los registros EDAN se ingresan manualmente.
function NEEDS_SEED() { return (window.NECESIDADES_INICIALES || []).slice(); }
function loadNeeds() {
  // Modo NUBE: los registros EDAN vienen de Firestore (suscripción en boot).
  if (window.CLOUD && CLOUD.enabled) { NEEDS = []; return; }
  try { NEEDS = JSON.parse(localStorage.getItem(STORE_NEC)) || []; } catch (e) { NEEDS = []; }
  // Carga inicial EDAN: se re-siembra cuando cambia el build, salvo que ya
  // existan registros ingresados manualmente (id que no empieza por "EDAN").
  const savedB = localStorage.getItem(STORE_NEC + "_build");
  const curB = window.REPORTES_BUILD || "";
  const hasManual = NEEDS.some(n => !/^EDAN\d+$/.test(n.id || ""));
  if (window.NECESIDADES_INICIALES && (!NEEDS.length || (savedB !== curB && !hasManual))) {
    NEEDS = NEEDS_SEED();
    localStorage.setItem(STORE_NEC + "_build", curB);
    saveNeeds();
  }
}
function saveNeeds() { try { localStorage.setItem(STORE_NEC, JSON.stringify(NEEDS)); } catch (e) {} }

function needsFiltered() {
  const f = getFilters();
  return NEEDS.filter(n => {
    if (f.zona && n.zona !== f.zona) return false;
    if (f.ubic && n.ubic !== f.ubic) return false;
    if (f.q) {
      const hay = ((n.nombres || "") + " " + (n.apellidos || "") + " " + (n.numDoc || "") + " " + (n.ubic || "") + " " + (n.sitio || "") + " " + (n.obs || "")).toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });
}

// Grupos etarios EDAN
function edadGrupo(e) { e = +e || 0; return e < 6 ? "0-5" : e < 18 ? "6-17" : e < 60 ? "18-59" : "60+"; }

function renderNecesidades() {
  const rows = needsFiltered();
  const cnt = k => rows.filter(n => n[k]).length;
  const cards = [
    { cls: "total", ic: "📋", num: rows.length, lab: "Registros EDAN" },
    { cls: "rep", ic: "🍲", num: cnt("ahAlim"), lab: "AHE Alimentaria" },
    { cls: "aten", ic: "📦", num: cnt("ahNoAlim"), lab: "AHE No Alimentaria" },
    { cls: "insp", ic: "🧱", num: cnt("matRehab"), lab: "Mat. rehab. vivienda" },
    { cls: "crit", ic: "🏠", num: cnt("subArriendo"), lab: "Subsidio arriendo" }
  ];
  el("kpis").innerHTML = cards.map(c => `<div class="kpi ${c.cls}"><div class="ic">${c.ic}</div><div><div class="num">${c.num}</div><div class="lab">${c.lab}</div></div></div>`).join("");

  destroyCharts();
  el("colLeft").innerHTML = card("Necesidades (EDAN)", "nGnec") + card("Estado del inmueble", "nGinm", true) + card("Propiedad del inmueble", "nGprop", true);
  el("colRight").innerHTML = card("Registros por ubicación", "nGubic") + card("Por género", "nGgen", true) + card("Grupos etarios", "nGedad", true);
  barH("nGnec", EDAN_NEC.map(n => [n.lab, cnt(n.k)]), "#16b3b3");
  doughnut("nGinm", countBy(rows, "estadoInmueble"), INMUEBLE_COLOR);
  doughnut("nGprop", countBy(rows, "propiedad"), PROP_COLOR);
  barH("nGubic", topN(countBy(rows, "ubic"), 8), "#3aa0ff");
  doughnut("nGgen", countBy(rows, "genero"), GENERO_COLOR);
  const edad = {}; rows.forEach(n => { const g = edadGrupo(n.edad); edad[g] = (edad[g] || 0) + 1; });
  barV("nGedad", edad, { "0-5": "#8CC63F", "6-17": "#3aa0ff", "18-59": "#16b3b3", "60+": "#a06bff" });

  renderNeedsMap(rows); // SOLO puntos de necesidades (EDAN); en blanco si no hay coordenadas
  el("mapTitle").textContent = "Mapa · necesidades (EDAN) — solo puntos de necesidades";

  const necChips = n => { const c = EDAN_NEC.filter(x => n[x.k]).map(x => `<span class="badge b-atencion">${x.lab.replace("AHE ", "").replace("Mat. rehab. vivienda", "Mat.").replace("Subsidio de arriendo", "Arriendo")}</span>`); return c.length ? c.join(" ") : "—"; };
  const cols = [
    ["Nombre", n => (`${n.nombres || ""} ${n.apellidos || ""}`).trim() || "—"],
    ["Documento", n => n.numDoc ? `${n.tipoDoc || ""} ${n.numDoc}` : "—"],
    ["Parentesco", n => n.parentesco || "—"],
    ["Género / Edad", n => `${n.genero || "—"}${n.edad ? " · " + n.edad : ""}`],
    ["Ubicación", ubicCell],
    ["Propiedad", n => n.propiedad || "—"],
    ["Estado inmueble", n => `<span class="badge" style="background:${INMUEBLE_COLOR[n.estadoInmueble] || "#556"}22;color:${INMUEBLE_COLOR[n.estadoInmueble] || "#889"};border:1px solid ${INMUEBLE_COLOR[n.estadoInmueble] || "#556"}55">${n.estadoInmueble || "—"}</span>`],
    ["Necesidades", necChips],
    ["", n => `<span class="row-act" data-editnec="${n.id}">✎</span> <span class="row-act" data-delnec="${n.id}">🗑</span>`]];
  el("tbl").querySelector("thead").innerHTML = "<tr>" + cols.map(c => `<th>${c[0]}</th>`).join("") + "</tr>";
  const tb = el("tbl").querySelector("tbody");
  if (!rows.length) tb.innerHTML = `<tr><td colspan="${cols.length}"><div class="empty">Sin registros EDAN. Usa “＋ Nuevo registro EDAN”.</div></td></tr>`;
  else tb.innerHTML = rows.map(n => "<tr>" + cols.map(c => `<td>${c[1](n)}</td>`).join("") + "</tr>").join("");
  tb.querySelectorAll("[data-editnec]").forEach(b => b.onclick = () => openNec(b.dataset.editnec));
  tb.querySelectorAll("[data-delnec]").forEach(b => b.onclick = () => { if (confirm("¿Eliminar este registro EDAN?")) { const did = b.dataset.delnec; NEEDS = NEEDS.filter(x => x.id !== did); if (window.CLOUD && CLOUD.enabled) CLOUD.delEdan(did); saveNeeds(); render(); } });

  el("tblTitle").textContent = "Registro EDAN — Evaluación de Daños y Análisis de Necesidades (" + rows.length + ")";
}

/* ---- Modal de registro EDAN ---- */
function openNec(id) {
  el("modalNecBg").classList.add("open");
  const set = (k, v) => { const e = el(k); if (e) e.value = v; };
  if (id) {
    const n = NEEDS.find(x => x.id === id); if (!n) return;
    el("necTitle").textContent = "Editar registro EDAN"; el("nId").value = n.id;
    set("nNombres", n.nombres || ""); set("nApellidos", n.apellidos || "");
    set("nTipoDoc", n.tipoDoc || "CC"); set("nNumDoc", n.numDoc || "");
    set("nParentesco", n.parentesco || "Jefe de hogar"); set("nGenero", n.genero || "Femenino");
    set("nEdad", n.edad || ""); set("nEtnia", n.etnia || "Ninguna");
    set("nEstadoSalud", n.estadoSalud || "Sano"); set("nRegimen", n.regimen || "Subsidiado");
    set("nZona", n.zona || "Urbano"); set("nUbic", n.ubic || ""); set("nSitio", n.sitio || "");
    set("nPropiedad", n.propiedad || "Propia"); set("nEstadoInmueble", n.estadoInmueble || "En evaluación");
    el("nAhAlim").checked = !!n.ahAlim; el("nAhNoAlim").checked = !!n.ahNoAlim;
    el("nMatRehab").checked = !!n.matRehab; el("nSubArriendo").checked = !!n.subArriendo;
    set("nLat", n.lat != null ? n.lat : ""); set("nLon", n.lon != null ? n.lon : "");
    set("nTelefono", n.telefono || ""); set("nObs", n.obs || "");
  } else {
    el("necTitle").textContent = "Nuevo registro EDAN"; el("formNec").reset(); el("nId").value = "";
  }
}
function closeNec() { el("modalNecBg").classList.remove("open"); }
function saveNec(e) {
  e.preventDefault();
  const id = el("nId").value;
  const rec = {
    id: id || uid(), fecha: id ? NEEDS.find(x => x.id === id).fecha : new Date().toISOString(),
    nombres: el("nNombres").value.trim(), apellidos: el("nApellidos").value.trim(),
    tipoDoc: el("nTipoDoc").value, numDoc: el("nNumDoc").value.trim(),
    parentesco: el("nParentesco").value, genero: el("nGenero").value,
    edad: +el("nEdad").value || "", etnia: el("nEtnia").value,
    estadoSalud: el("nEstadoSalud").value, regimen: el("nRegimen").value,
    zona: el("nZona").value, ubic: el("nUbic").value, sitio: el("nSitio").value.trim(),
    propiedad: el("nPropiedad").value, estadoInmueble: el("nEstadoInmueble").value,
    ahAlim: el("nAhAlim").checked, ahNoAlim: el("nAhNoAlim").checked,
    matRehab: el("nMatRehab").checked, subArriendo: el("nSubArriendo").checked,
    telefono: el("nTelefono").value.trim(), obs: el("nObs").value.trim()
  };
  const _c = readCoords(el("nLat").value, el("nLon").value); // normaliza a WGS84 [lat,lon]
  rec.lat = _c.lat; rec.lon = _c.lon;
  if (_c.warn) { if (!confirm("Las coordenadas caen fuera de Girardota. ¿Guardar de todos modos?")) return; }
  if (id) { const i = NEEDS.findIndex(x => x.id === id); NEEDS[i] = rec; } else { NEEDS.push(rec); }
  saveNeeds();
  if (window.CLOUD && CLOUD.enabled) CLOUD.putEdan(rec);
  closeNec(); render();
}

/* ============================================================
   COORDENADAS — Sistema del tablero: WGS84 (EPSG:4326), grados
   decimales, orden [lat, lon] (Leaflet). Toda coordenada que
   entre (foto o ingreso manual) se normaliza a este sistema.
   ============================================================ */
const GIRA_BOX = { latMin: 6.28, latMax: 6.52, lonMin: -75.62, lonMax: -75.33 };
function parseCoord(s) {
  if (s == null) return null;
  s = String(s).trim(); if (!s) return null;
  const hemi = (s.match(/([NSEWnsew])\s*$/) || [, ""])[1].toUpperCase();
  let v;
  // Grados-minutos-segundos: 6°22'31.4"N  /  75°26'47.8"W
  const dms = s.match(/(-?\d+(?:[.,]\d+)?)\s*[°º]\s*(\d+(?:[.,]\d+)?)\s*['´′]\s*(\d+(?:[.,]\d+)?)?/);
  if (dms) {
    v = parseFloat(dms[1].replace(",", ".")) + parseFloat(dms[2].replace(",", ".")) / 60 + parseFloat((dms[3] || "0").replace(",", ".")) / 3600;
  } else {
    v = parseFloat(s.replace(",", "."));
    if (isNaN(v)) return null;
  }
  // Hemisferio (S/W = negativo, N/E = positivo) tiene prioridad sobre el signo
  if (hemi === "S" || hemi === "W") v = -Math.abs(v);
  else if (hemi === "N" || hemi === "E") v = Math.abs(v);
  return v;
}
// Separa un texto pegado en (lat, lon): admite coma/; o dos tokens con N/S/E/W,
// e ignora el margen de error "±100.00m".
function splitCoordPair(s) {
  s = String(s || "").replace(/±\s*[\d.,]+\s*m?/ig, " ").trim();
  if (/[,;]/.test(s)) { const p = s.split(/[,;]/); if (p.length >= 2) return [p[0].trim(), p.slice(1).join(" ").trim()]; }
  const m = s.match(/([-\d.,°º'´′"”″\s]*[NSEWnsew])\s*([-\d.,°º'´′"”″\s]*[NSEWnsew])/);
  if (m) return [m[1].trim(), m[2].trim()];
  const nums = s.match(/-?\d+(?:[.,]\d+)?/g);
  if (nums && nums.length >= 2) return [nums[0], nums[1]];
  return null;
}
function normalizeLatLon(latRaw, lonRaw) {
  let lat = parseCoord(latRaw), lon = parseCoord(lonRaw);
  if (lat == null || lon == null) return { lat: null, lon: null, warn: false };
  const looksLat = v => Math.abs(v) >= 4 && Math.abs(v) <= 9;
  const looksLon = v => Math.abs(v) >= 70 && Math.abs(v) <= 79;
  // Corregir inversión lat/lon (si vienen al revés)
  if (looksLon(lat) && looksLat(lon)) { const t = lat; lat = lon; lon = t; }
  // Signos: Girardota es Norte (lat +) y Oeste (lon -)
  if (looksLat(lat)) lat = Math.abs(lat);
  if (looksLon(lon)) lon = -Math.abs(lon);
  const inBox = lat >= GIRA_BOX.latMin && lat <= GIRA_BOX.latMax && lon >= GIRA_BOX.lonMin && lon <= GIRA_BOX.lonMax;
  return { lat: +lat.toFixed(6), lon: +lon.toFixed(6), warn: !inBox };
}
// Permite pegar el par completo en el campo de latitud (Google Maps o app GPS):
// "6.375451, -75.446302"  ·  "6.372628N 75.449117W"  ·  "6°22'21\"N 75°26'57\"W ±100m"
function readCoords(latRaw, lonRaw) {
  if (!String(lonRaw || "").trim()) {
    const pair = splitCoordPair(latRaw);
    if (pair) { latRaw = pair[0]; lonRaw = pair[1]; }
  }
  return normalizeLatLon(latRaw, lonRaw);
}

/* ============================================================
   FORMULARIO / MODAL
   ============================================================ */
function updateSectorFields(sector) {
  document.querySelectorAll("#form [data-sectors]").forEach(node => {
    const list = node.getAttribute("data-sectors").split(/\s+/);
    node.style.display = list.includes(sector) ? "" : "none";
  });
  el("lblSitio").textContent = sector === "educacion" ? "Institución / sede educativa *"
    : sector === "infraestructura" ? "Infraestructura / sitio *" : "Sitio / dirección *";
}
function fillTipos(sector) {
  const sel = el("iTipo"); sel.innerHTML = "";
  SECTORS[sector].tipos.forEach(t => { const o = document.createElement("option"); o.textContent = t; sel.appendChild(o); });
  updateSectorFields(sector);
}

/* ---- Instituciones / sedes educativas ---- */
function fillInstituciones() {
  const sel = el("iInstitucion"); sel.innerHTML = "";
  Object.keys(EDU_IE).forEach(ie => { const o = document.createElement("option"); o.textContent = ie; sel.appendChild(o); });
}
function fillSedes(ie) {
  const sel = el("iSede"); sel.innerHTML = "";
  const sedes = EDU_IE[ie] || [];
  if (!sedes.length) { // "Otra / privada": sin lista, sitio libre
    const o = document.createElement("option"); o.value = ""; o.textContent = "— Escribir en “Institución / sede” —"; sel.appendChild(o);
    return;
  }
  sedes.forEach(s => { const o = document.createElement("option"); o.value = s.sede; o.textContent = s.sede; sel.appendChild(o); });
}
function applySede() {
  const ie = el("iInstitucion").value;
  const s = (EDU_IE[ie] || []).find(x => x.sede === el("iSede").value);
  if (!s) return; // Otra/privada -> el usuario escribe el sitio
  el("iSitio").value = s.sede;
  el("iZona").value = s.zona;
  if ([...el("iUbic").options].some(o => o.value === s.ubic)) el("iUbic").value = s.ubic;
  if (ie !== "Otra / privada") el("iCaracter").value = "Pública";
}
function fillUbicOptions(selectEl, includeAll) {
  selectEl.innerHTML = includeAll ? '<option value="">Todas</option>' : "";
  const grpB = document.createElement("optgroup"); grpB.label = "Barrios (urbano)";
  const grpV = document.createElement("optgroup"); grpV.label = "Veredas (rural)";
  ubicList.forEach(u => {
    const o = document.createElement("option"); o.value = u.nombre; o.textContent = u.nombre;
    (u.tipo === "barrio" ? grpB : grpV).appendChild(o);
  });
  selectEl.appendChild(grpB); selectEl.appendChild(grpV);
}
function fillLoadExisting() {
  const sel = el("iLoadExisting"); if (!sel) return;
  const items = DATA.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  sel.innerHTML = '<option value="">— Crear reporte nuevo —</option>' + items.map(r =>
    `<option value="${r.id}">${(r.estado === "Atendido" ? "✅ " : "⏳ ")}${r.sitio} · ${r.ubic} · ${r.estado} (${SECTOR_LABEL[r.sector] || r.sector})</option>`).join("");
}
function openModal(id) {
  el("modalBg").classList.add("open");
  el("wrapLoadExisting").style.display = id ? "none" : "";
  if (!id) fillLoadExisting();
  if (id) {
    const r = DATA.find(x => x.id === id); if (!r) return;
    el("modalTitle").textContent = "Editar / atender reporte";
    el("iAtendidoPor").value = r.atendidoPor || ""; el("iObsAtencion").value = r.obsAtencion || "";
    el("iFechaAtencion").value = r.fechaAtencion ? fmtDate(r.fechaAtencion) : "";
    el("fId").value = r.id; el("iSector").value = r.sector; fillTipos(r.sector);
    el("iTipo").value = r.tipo; el("iSitio").value = r.sitio; el("iZona").value = r.zona;
    el("iUbic").value = r.ubic; el("iEstado").value = r.estado; el("iPrioridad").value = r.prioridad;
    el("iVisita").value = r.visita; el("iPersonas").value = r.personas || 0; el("iHeridos").value = r.heridos || 0;
    el("iEstudiantes").value = r.estudiantes || 0; el("iVivAfect").value = r.vivAfect || 0; el("iVivEvac").value = r.vivEvac || 0;
    el("iTipoEvento").value = r.tipoEvento || "Afectación por sismo";
    el("iAnimales").value = r.animales || "Sin animales afectados"; el("iAnimalesNum").value = r.animalesNum || 0;
    el("iTipoEstructura").value = r.tipoEstructura || "";
    el("iSectorLocal").value = r.sectorLocal || ""; el("iCaracter").value = r.caracter || "Pública";
    el("iOperativa").value = r.operativa || "Operativa"; el("iEstadoInfra").value = r.estadoInfra || "Sin daño";
    el("iTipoEdificio").value = r.tipoEdificio || "Administrativo"; el("iSecretaria").value = r.secretaria || "";
    el("iTelefono").value = r.telefono || "";
    el("iLat").value = r.lat ?? ""; el("iLon").value = r.lon ?? ""; el("iDesc").value = r.desc || ""; el("iReportante").value = r.reportante || "";
    if (r.sector === "educacion") {
      el("iInstitucion").value = EDU_IE[r.institucion] ? r.institucion : "Otra / privada";
      fillSedes(el("iInstitucion").value);
      if (r.sede && [...el("iSede").options].some(o => o.value === r.sede)) el("iSede").value = r.sede;
    }
    pendingFotos = (r.fotos || []).slice();
  } else {
    el("modalTitle").textContent = "Nuevo reporte de emergencia";
    el("form").reset(); el("fId").value = "";
    el("iSector").value = SECTORS[currentTab] ? currentTab : "afectaciones";
    fillTipos(el("iSector").value);
    if (el("iSector").value === "educacion") { fillSedes(el("iInstitucion").value); applySede(); }
    pendingFotos = [];
  }
  renderFotoPreview();
}
function closeModal() { el("modalBg").classList.remove("open"); }

function saveForm(e) {
  e.preventDefault();
  const id = el("fId").value;
  const sector = el("iSector").value;
  const _coords = readCoords(el("iLat").value, el("iLon").value); // normaliza a WGS84 [lat,lon]
  if (_coords.lat != null && _coords.warn &&
    !confirm("⚠️ Las coordenadas quedan FUERA del área de Girardota.\nlat " + _coords.lat + ", lon " + _coords.lon + "\n\n¿Guardar de todos modos?")) return;
  const rec = {
    id: id || uid(),
    fecha: id ? DATA.find(x => x.id === id).fecha : new Date().toISOString(),
    sector, tipo: el("iTipo").value, sitio: el("iSitio").value.trim(),
    zona: el("iZona").value, ubic: el("iUbic").value, estado: el("iEstado").value, prioridad: el("iPrioridad").value,
    visita: el("iVisita").value,
    personas: +el("iPersonas").value || 0, heridos: +el("iHeridos").value || 0, estudiantes: +el("iEstudiantes").value || 0,
    vivAfect: +el("iVivAfect").value || 0, vivEvac: +el("iVivEvac").value || 0,
    tipoEvento: el("iTipoEvento").value,
    animales: el("iAnimales").value, animalesNum: +el("iAnimalesNum").value || 0,
    tipoEstructura: (sector === "afectaciones") ? el("iTipoEstructura").value : "",
    sectorLocal: sector === "afectaciones" ? el("iSectorLocal").value.trim() : "",
    caracter: sector === "educacion" ? el("iCaracter").value : "",
    institucion: sector === "educacion" ? el("iInstitucion").value : "",
    sede: sector === "educacion" ? (el("iSede").value || el("iSitio").value.trim()) : "",
    tipoEdificio: sector === "infraestructura" ? el("iTipoEdificio").value : "",
    secretaria: sector === "infraestructura" ? el("iSecretaria").value : "",
    operativa: (sector === "educacion" || sector === "infraestructura") ? el("iOperativa").value : "",
    estadoInfra: (sector === "educacion" || sector === "infraestructura") ? el("iEstadoInfra").value : "",
    telefono: el("iTelefono").value.trim(),
    lat: _coords.lat, lon: _coords.lon,
    desc: el("iDesc").value.trim(), reportante: el("iReportante").value.trim(),
    atendidoPor: el("iAtendidoPor").value.trim(), obsAtencion: el("iObsAtencion").value.trim(),
    fotos: pendingFotos.slice(), demo: false
  };
  const prev = id ? DATA.find(x => x.id === id) : null;
  rec.fechaAtencion = prev ? (prev.fechaAtencion || "") : "";
  if (rec.estado === "Atendido" && !rec.fechaAtencion) rec.fechaAtencion = new Date().toISOString();
  if (id) { const i = DATA.findIndex(x => x.id === id); DATA[i] = rec; }
  else { DATA.push(rec); }
  save();
  if (window.CLOUD && CLOUD.enabled) CLOUD.putReporte(rec);
  closeModal();
  // quedarse en Atención/Resumen; si no, ir a la pestaña del sector para ver el reporte
  if (currentTab === "atencion" || currentTab === "resumen" || rec.sector === currentTab) render();
  else setTab(rec.sector);
}

function closeFromModal() {
  if (!el("iAtendidoPor").value.trim()) {
    alert('Antes de cerrar, indica quién atendió el reporte en “Atendido por”.');
    el("iAtendidoPor").focus(); return;
  }
  el("iEstado").value = "Atendido";
  saveForm(new Event("submit"));
}
function delReport(id) {
  if (!confirm("¿Eliminar este reporte?")) return;
  DATA = DATA.filter(x => x.id !== id);
  if (window.CLOUD && CLOUD.enabled) CLOUD.delReporte(id);
  save(); render();
}

/* ============================================================
   EXPORTAR CSV
   ============================================================ */
function exportCSV() {
  const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  if (currentTab === "necesidades") {
    const rows = needsFiltered();
    const cols = ["fecha", "nombres", "apellidos", "tipoDoc", "numDoc", "parentesco", "genero", "edad", "etnia",
      "estadoSalud", "regimen", "zona", "ubic", "sitio", "propiedad", "estadoInmueble",
      "ahAlim", "ahNoAlim", "matRehab", "subArriendo", "telefono", "lat", "lon", "obs"];
    const head = ["Fecha", "Nombres", "Apellidos", "Tipo doc", "Número doc", "Parentesco", "Género", "Edad", "Etnia",
      "Estado de salud", "Régimen de salud", "Zona", "Vereda/Barrio", "Dirección", "Propiedad inmueble", "Estado inmueble",
      "AHE Alimentaria", "AHE No Alimentaria", "Mat. rehab. vivienda", "Subsidio arriendo", "Teléfono", "Latitud", "Longitud", "Observaciones"];
    const bk = { ahAlim: 1, ahNoAlim: 1, matRehab: 1, subArriendo: 1 };
    const csv = [head.join(",")].concat(rows.map(r => cols.map(c => esc(bk[c] ? (r[c] ? "SI" : "NO") : r[c])).join(","))).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "edan_necesidades_girardota.csv"; a.click();
    return;
  }
  const rows = filtered();
  const cols = ["fecha", "sector", "tipo", "tipoEvento", "sitio", "institucion", "sede", "zona", "ubic", "sectorLocal",
    "estado", "prioridad", "operativa", "estadoInfra", "secretaria", "caracter", "personas", "heridos", "estudiantes",
    "vivAfect", "vivEvac", "animales", "lat", "lon", "reportante", "telefono", "desc"];
  const csv = [cols.join(",")].concat(rows.map(r => cols.map(c => esc(r[c])).join(","))).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "emergencias_girardota_" + currentTab + ".csv"; a.click();
}

/* ============================================================
   TABS + EVENTOS
   ============================================================ */
function setTab(t) {
  currentTab = t;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === t));
  el("btnNuevo").textContent = (t === "necesidades") ? "＋ Nuevo registro EDAN" : "＋ Nuevo reporte";
  render();
  setTimeout(() => map && map.invalidateSize(), 60);
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => setTab(b.dataset.tab));
  ["fZona", "fUbic", "fEstado", "fPrioridad"].forEach(id => el(id).onchange = render);
  el("fBuscar").oninput = render;
  el("btnFiltrar").onclick = render;
  el("btnClear").onclick = () => { ["fZona", "fUbic", "fEstado", "fPrioridad", "fBuscar"].forEach(id => el(id).value = ""); render(); };
  el("kpis").onclick = (e) => {
    const tile = e.target.closest("[data-estado]"); if (!tile) return;
    const est = tile.dataset.estado;
    el("fEstado").value = (el("fEstado").value === est) ? "" : est; // clic de nuevo = quitar filtro
    render();
  };
  el("btnNuevo").onclick = () => currentTab === "necesidades" ? openNec() : openModal();
  el("btnCancel").onclick = closeModal;
  el("formNec").onsubmit = saveNec;
  el("btnNecCancel").onclick = closeNec;
  el("modalNecBg").onclick = (e) => { if (e.target === el("modalNecBg")) closeNec(); };
  el("modalBg").onclick = (e) => { if (e.target === el("modalBg")) closeModal(); };
  el("iSector").onchange = () => fillTipos(el("iSector").value);
  el("iInstitucion").onchange = () => { fillSedes(el("iInstitucion").value); applySede(); };
  el("iSede").onchange = applySede;
  el("iFotos").onchange = handleFotoInput;
  el("iLoadExisting").onchange = () => { const v = el("iLoadExisting").value; if (v) openModal(v); };
  el("btnCerrar").onclick = closeFromModal;
  el("form").onsubmit = saveForm;
  el("btnCSV").onclick = exportCSV;
  el("btnDemo").onclick = () => {
    if (window.CLOUD && CLOUD.enabled) {
      alert("En modo compartido (nube) no se puede borrar todo de golpe, para no afectar a los demás. Elimina los reportes uno por uno con el ícono 🗑.");
      return;
    }
    if (confirm("Esto borra TODOS los reportes almacenados en este dispositivo. ¿Continuar?")) {
      DATA = []; localStorage.removeItem(STORE_KEY); save(); render();
    }
  };
}

/* ---------- Init ---------- */
function boot() {
  buildGeoIndex();
  fillUbicOptions(el("fUbic"), true);
  fillUbicOptions(el("iUbic"), false);
  fillUbicOptions(el("nUbic"), false);
  fillInstituciones();
  fillSedes(el("iInstitucion").value);
  fillTipos("afectaciones");
  load();
  loadNeeds();
  initMap();
  bindEvents();
  clearFilters();   // los filtros siempre arrancan limpios (evita que el navegador restaure uno viejo)
  render();
  startCloudSync();
}

/* ---------- Nube: suscripciones en vivo (multiusuario) ---------- */
function startCloudSync() {
  if (!(window.CLOUD && CLOUD.enabled)) return;
  setCloudBadge("Conectando…");
  // Reportes: base = carga inicial, sobreescrita por lo que haya en la nube.
  CLOUD.subReportes(function (cloudDocs) {
    const map = {};
    (window.REPORTES_INICIALES || []).forEach(r => { map[r.id] = r; });
    cloudDocs.forEach(d => {
      if (!d || d.id == null) return;
      if (d.__deleted) delete map[d.id]; else map[d.id] = d;
    });
    DATA = Object.keys(map).map(k => map[k]);
    setCloudBadge("En vivo");
    render();
  });
  // EDAN (Necesidades): fuente 100% nube.
  CLOUD.subEdan(function (docs) {
    NEEDS = docs.filter(d => d && !d.__deleted);
    render();
  });
}
function setCloudBadge(txt) {
  const s = el("storeInfo"); if (!s) return;
  s.innerHTML = '· <span style="color:var(--lime);font-weight:700">☁ ' + txt + '</span> · datos compartidos';
}
function clearFilters() { ["fZona", "fUbic", "fEstado", "fPrioridad", "fBuscar"].forEach(id => { if (el(id)) el(id).value = ""; }); }
document.addEventListener("DOMContentLoaded", boot);
// Si el navegador restaura la página desde caché (bfcache), limpiar filtros y re-render
window.addEventListener("pageshow", function (e) { if (e.persisted) { clearFilters(); if (window.map) render(); } });
