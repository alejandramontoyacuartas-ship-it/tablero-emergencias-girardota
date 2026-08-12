/* ============================================================
   SINCRONIZACIÓN CON LA NUBE (Firebase / Firestore)
   ------------------------------------------------------------
   Fuente compartida y en vivo para el tablero:
   - Colección "reportes": reportes de Escuelas / Infraestructura /
     Afectaciones / Atención en campo (deltas sobre la carga inicial).
   - Colección "edan": registro EDAN (Necesidades).

   Si Firebase no está configurado (firebase-config.js con "PEGA_..."),
   window.CLOUD.enabled = false y el tablero usa localStorage (solo este
   equipo). No rompe nada.
   ============================================================ */
(function () {
  window.CLOUD = { enabled: false };
  var cfg = window.FIREBASE_CONFIG;

  if (!cfg || !cfg.apiKey || String(cfg.apiKey).indexOf("PEGA_") === 0) {
    console.info("[CLOUD] Firebase no configurado — modo local (localStorage).");
    return;
  }
  if (typeof firebase === "undefined" || !firebase.firestore) {
    console.warn("[CLOUD] SDK de Firebase no cargó — modo local.");
    return;
  }

  try {
    firebase.initializeApp(cfg);
    var db = firebase.firestore();
    var C = window.CLOUD;
    C.enabled = true;
    C.db = db;
    C.COL_REP = "reportes";
    C.COL_EDAN = "edan";

    function docsOf(snap) { var a = []; snap.forEach(function (d) { a.push(d.data()); }); return a; }

    // Suscripciones en vivo (onSnapshot): se disparan al conectar y en cada cambio.
    C.subReportes = function (cb) {
      return db.collection(C.COL_REP).onSnapshot(
        function (snap) { cb(docsOf(snap)); },
        function (err) { console.error("[CLOUD] suscripción reportes:", err); }
      );
    };
    C.subEdan = function (cb) {
      return db.collection(C.COL_EDAN).onSnapshot(
        function (snap) { cb(docsOf(snap)); },
        function (err) { console.error("[CLOUD] suscripción edan:", err); }
      );
    };

    // Escrituras (un documento por registro; id del registro = id del documento).
    C.putReporte = function (rec) {
      return db.collection(C.COL_REP).doc(String(rec.id)).set(rec).catch(function (e) {
        console.error("[CLOUD] guardar reporte:", e);
        alert("No se pudo guardar en la nube (posiblemente el reporte tiene fotos muy pesadas: máx. ~1 MB por reporte). Quedó guardado en este equipo; usa menos fotos o más livianas para compartirlo.");
      });
    };
    C.delReporte = function (id) {
      // Tumba (tombstone): oculta el reporte para todos, incluso si venía de la carga inicial.
      return db.collection(C.COL_REP).doc(String(id)).set({ id: id, __deleted: true }).catch(function (e) {
        console.error("[CLOUD] borrar reporte:", e);
      });
    };
    C.putEdan = function (rec) {
      return db.collection(C.COL_EDAN).doc(String(rec.id)).set(rec).catch(function (e) {
        console.error("[CLOUD] guardar EDAN:", e);
        alert("No se pudo guardar el registro EDAN en la nube. Quedó guardado en este equipo.");
      });
    };
    C.delEdan = function (id) {
      return db.collection(C.COL_EDAN).doc(String(id)).delete().catch(function (e) {
        console.error("[CLOUD] borrar EDAN:", e);
      });
    };

    console.info("[CLOUD] Firebase conectado ·", cfg.projectId);
  } catch (e) {
    console.error("[CLOUD] error de inicialización:", e);
    window.CLOUD = { enabled: false };
  }
})();
