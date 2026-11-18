// CONTADOR DE PASOS con el sensor de movimiento del teléfono. Solo cuenta con LA FORJA abierta y la pantalla encendida
// (una página web no puede contar en segundo plano). Detecta cada paso como un pico en la aceleración.

let activo = false, alPaso = null, wakeLock = null;
let media = 9.8, ultimoPaso = 0, armado = true;

function alMovimiento(e) {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x == null) return;
  const mag = Math.hypot(a.x, a.y, a.z);
  media = media * 0.9 + mag * 0.1;            // nivel de reposo (la gravedad) que se va ajustando
  const v = mag - media, ahora = performance.now();
  // Un paso = la aceleración sube por encima del umbral; se vuelve a armar al bajar. Mínimo 0,3 s entre pasos.
  if (armado && v > 1.2 && ahora - ultimoPaso > 300) { ultimoPaso = ahora; armado = false; alPaso?.(); }
  else if (v < 0.3) armado = true;
}

export const podometroDisponible = () => typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
export const podometroActivo = () => activo;

// Debe llamarse al tocar un botón (el iPhone pide permiso en ese momento)
export async function iniciarPodometro(fnPaso) {
  if (!podometroDisponible()) return false;
  try {
    if (typeof DeviceMotionEvent.requestPermission === 'function' && (await DeviceMotionEvent.requestPermission()) !== 'granted') return false;
  } catch { return false; }
  // ¿Llegan datos de verdad? (una computadora dice tener el sensor, pero no manda nada)
  const hay = await new Promise(r => {
    const prueba = e => { if (e.accelerationIncludingGravity?.x != null) { window.removeEventListener('devicemotion', prueba); r(true); } };
    window.addEventListener('devicemotion', prueba);
    setTimeout(() => { window.removeEventListener('devicemotion', prueba); r(false); }, 2000);
  });
  if (!hay) return false;
  alPaso = fnPaso;
  if (!activo) window.addEventListener('devicemotion', alMovimiento);
  activo = true;
  await pedirPantalla();
  return true;
}
// Mantener la pantalla encendida mientras cuenta (si el teléfono lo permite); se vuelve a pedir al regresar a la app
async function pedirPantalla() { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { wakeLock = null; } }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (activo && !document.hidden) pedirPantalla(); });

export function detenerPodometro() {
  activo = false; alPaso = null;
  window.removeEventListener('devicemotion', alMovimiento);
  wakeLock?.release?.().catch(() => {}); wakeLock = null;
}
