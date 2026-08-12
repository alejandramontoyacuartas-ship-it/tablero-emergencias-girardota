/* ============================================================
   CONFIGURACIÓN DE FIREBASE
   ------------------------------------------------------------
   Pega aquí los datos de TU proyecto Firebase:
   Consola Firebase → ⚙ Configuración del proyecto →
   "Tus apps" → (app web </>) → SDK config.

   Mientras estos valores tengan "PEGA_...", el tablero funciona
   SOLO local (en este navegador). Al pegar los datos reales,
   queda multiusuario y en vivo: cualquiera que ingrese
   información la almacena en la nube y todos la ven.
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "PEGA_TU_API_KEY",
  authDomain: "PEGA_TU_PROYECTO.firebaseapp.com",
  projectId: "PEGA_TU_PROYECTO",
  storageBucket: "PEGA_TU_PROYECTO.appspot.com",
  messagingSenderId: "PEGA_TU_SENDER_ID",
  appId: "PEGA_TU_APP_ID"
};
