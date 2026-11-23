// Permite usar la app sin internet. Al cambiar archivos, subir VERSION para renovar la copia.
const VERSION = 'la-forja-v12';
// Lista generada con todos los archivos de la app (incluye los modelos 3D y la librería three)
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/estilos.css', 'icons/forja-192.png', 'icons/forja-512.png', 'icons/forja-maskable-512.png', 'icons/forja.svg',
  'icons/emblema.svg', 'fonts/archivo-ancha-900.woff2', 'fonts/atkinson-400.woff2', 'fonts/atkinson-700.woff2', 'fonts/baloo2-800.woff2',
  'fonts/barlow-400.woff2', 'fonts/barlow-500.woff2', 'fonts/barlow-700.woff2', 'fonts/barlow-condensed-600.woff2',
  'fonts/barlow-condensed-800.woff2', 'fonts/barlow-condensed-800i.woff2', 'fonts/bebas-neue-400.woff2', 'fonts/inter-400.woff2',
  'fonts/inter-700.woff2', 'fonts/lexend-400.woff2', 'fonts/lexend-600.woff2', 'fonts/montserrat-500.woff2', 'fonts/montserrat-900.woff2',
  'fonts/nunito-400.woff2', 'fonts/nunito-700.woff2', 'fonts/outfit-800.woff2', 'fonts/plus-jakarta-500.woff2', 'fonts/plus-jakarta-800.woff2',
  'fonts/sora-700.woff2', 'js/app.js', 'js/datos/alimentos.js', 'js/datos/almacen.js', 'js/datos/catalogos.js', 'js/datos/comunes.js',
  'js/datos/disciplinas.js', 'js/datos/educacion.js', 'js/datos/ejercicios.js', 'js/datos/evidencia.js', 'js/datos/habitos.js',
  'js/datos/modelo.js', 'js/datos/nutrientes.js', 'js/datos/poses.js', 'js/datos/progresiones.js', 'js/motor/adaptacion.js',
  'js/motor/ajusteDiario.js', 'js/motor/alarmas.js', 'js/motor/calculos.js', 'js/motor/combinacion.js', 'js/motor/ejecucion.js',
  'js/motor/estrategia.js', 'js/motor/fases.js', 'js/motor/generador.js', 'js/motor/hidratacion.js', 'js/motor/historial.js',
  'js/motor/index.js', 'js/motor/nivel.js', 'js/motor/nutricion.js', 'js/motor/objetivos.js', 'js/motor/optimizador.js',
  'js/motor/pasos.js', 'js/motor/plantillas.js', 'js/motor/prescripcion.js', 'js/motor/pruebas.js', 'js/motor/recordatorios.js',
  'js/motor/recuperacion.js', 'js/motor/rendimiento.js', 'js/motor/retos.js', 'js/motor/seguimiento.js', 'js/motor/seguridad.js',
  'js/motor/semana.js', 'js/motor/sesiones.js', 'js/motor/unidades.js', 'js/ui/atleta3d.js', 'js/ui/ciencia.js', 'js/ui/componentes.js',
  'js/ui/cronometro.js', 'js/ui/equipo.js', 'js/ui/figura.js', 'js/ui/notificaciones.js', 'js/ui/podometro.js', 'js/ui/tecnica.js',
  'js/ui/temas.js', 'js/ui/voz.js', 'js/vendor/supabase/supabase.js', 'js/nube/cliente.js', 'js/nube/acceso.js', 'js/nube/seguimiento.js', 'js/nube/avisos.js', 'js/motor/agenda.js', 'js/ui/alarma.js', 'js/ui/pedidoAvisos.js', 'js/vistas/cuenta.js', 'js/vistas/ficha.js', 'js/ui/conversacion.js', 'js/motor/alertas.js',
  'js/motor/recetas.js', 'js/datos/recetas.js', 'js/nube/recetas.js', 'js/ui/lectorReceta.js', 'js/vistas/recetas.js',
  'js/datos/dietas.js', 'js/motor/planComidas.js', 'js/motor/revisionPlan.js', 'js/vistas/plan-doctora.js',
  'js/vendor/three/BufferGeometryUtils.js', 'js/vendor/three/GLTFLoader.js', 'js/vendor/three/three.module.min.js',
  'js/vistas/alimentacion.js', 'js/vistas/biblioteca.js', 'js/vistas/bienestar.js', 'js/vistas/cuestionario.js', 'js/vistas/entrenar.js',
  'js/vistas/hoy.js', 'js/vistas/inicio.js', 'js/vistas/perfil.js', 'js/vistas/plan.js', 'js/vistas/progreso.js', 'js/vistas/pruebas.js',
  'js/vistas/reto.js', 'assets/atleta-hombre.glb', 'assets/atleta-mujer.glb',
];

// Los modelos 3D (4 MB cada uno) no se precargan: se guardan la primera vez que se usan, solo el del sexo de la persona.
// Lo mismo el lector de recetas (js/vendor/tesseract, unos 10 MB): solo lo usa la doctora y se guarda la primera vez.
const PRECARGA = ARCHIVOS.filter(a => !a.endsWith('.glb'));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECARGA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero la red (para recibir mejoras), y si no hay conexión o tarda más de 3 s, la copia guardada.
// Los archivos propios se piden siempre comprobando con el servidor (no-cache): así nunca se mezclan piezas de versiones distintas.
// Solo se guardan respuestas buenas (nunca un error ni la página de inicio de sesión de un wifi público).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url), propio = url.origin === self.location.origin;
  const pedir = () => fetch(propio ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : e.request).then(r => {
    if (r.ok && r.type === 'basic') { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); }
    return r;
  });
  e.respondWith((async () => {
    const guardada = await caches.match(e.request);
    if (!guardada) return pedir().catch(() => Response.error());
    // Los modelos 3D solo cambian cuando cambia la versión: con copia guardada se usan al instante (sin volver a bajarlos)
    if (url.pathname.endsWith('.glb')) return guardada;
    // Lo demás: se espera la red un máximo de 3 s
    const limite = new Promise(r => setTimeout(() => r(null), 3000));
    try { return (await Promise.race([pedir(), limite])) || guardada; } catch { return guardada; }
  })());
});

// Avisos con la app cerrada (los manda la nube: supabase/avisos.sql).
// ALARMA (comida, entreno, sueño…): queda fija en pantalla y vibra fuerte; la nube la vuelve a mandar cada minuto
// hasta que se toque "✅ Ya lo hice" o "🔕 Apagar". Si la app está abierta a la vista, sale la alarma de pantalla completa.
// Los de la doctora quedan en pantalla hasta que los toca.
const NUBE = 'https://anmpadbswghupwagerkz.supabase.co';
const CLAVE_PUBLICA = 'sb_publishable_IPpiPnxxz4AChlf3g5meyw_iebnViqP';
const PANTALLA = { comida: 'comida', agua: 'bienestar', sueno: 'bienestar', entreno: 'hoy' };   // dónde se anota cada actividad
const VIBRAR_ALARMA = [900, 300, 900, 300, 900, 300, 1500];

const callar = (ficha, minutos = null) => fetch(`${NUBE}/rest/v1/rpc/apagar_aviso`, {
  method: 'POST', headers: { apikey: CLAVE_PUBLICA, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_ficha: ficha, p_minutos: minutos }),
}).catch(() => {});

self.addEventListener('push', e => {
  let d;
  try { d = e.data.json(); } catch { d = { titulo: 'LA FORJA', cuerpo: e.data ? e.data.text() : '' }; }
  const alarma = !!d.alarma && !!d.ficha;
  e.waitUntil((async () => {
    if (alarma) {
      const vista = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).find(c => c.visibilityState === 'visible');
      if (vista) { vista.postMessage({ alarma: { ...d, ir: PANTALLA[d.tipo] || '' } }); return; }
    }
    const acciones = !d.ficha ? [] : alarma ? [{ action: 'hecho', title: '✅ Ya lo hice' }, { action: 'apagar', title: '🔕 Apagar' }]
      : [{ action: 'apagar', title: '🔕 Apagar este recordatorio' }];
    await self.registration.showNotification(alarma ? `⏰ ${d.titulo || 'LA FORJA'}` : (d.titulo || 'LA FORJA'), {
      body: d.cuerpo || '', icon: 'icons/forja-192.png', badge: 'icons/forja-192.png',
      tag: d.tema || undefined, renotify: !!d.tema, requireInteraction: alarma || !!d.doctora, silent: false,
      vibrate: alarma ? VIBRAR_ALARMA : [200, 100, 200],
      data: { ficha: d.ficha || null, alarma, ir: d.doctora ? 'alertas' : alarma ? (PANTALLA[d.tipo] || '') : '' },
      actions: acciones,
    });
  })());
});

// Abre (o enfoca) LA FORJA en la pantalla indicada
function abrirEn(ir) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    const abierta = lista.find(c => 'focus' in c);
    if (abierta) { if (ir) abierta.postMessage({ ir }); return abierta.focus(); }
    return self.clients.openWindow(ir ? `./?ir=${ir}` : './');
  });
}

// "🔕 Apagar": la nube la calla unos minutos (alarma) o del todo (aviso normal), sin abrir la app.
// "✅ Ya lo hice" (o tocar la alarma): se calla 10 minutos y abre la app donde se anota; si no se anota, vuelve a sonar.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const datos = e.notification.data || {};
  if (e.action === 'apagar' && datos.ficha) return e.waitUntil(callar(datos.ficha));
  if (datos.alarma && datos.ficha) return e.waitUntil(Promise.all([callar(datos.ficha, 10), abrirEn(datos.ir)]));
  e.waitUntil(abrirEn(datos.ir));
});
