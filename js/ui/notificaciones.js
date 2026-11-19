// FASE 4: muestra los recordatorios (agua, comida, sueño, suplementos, entrenamiento, recuperación).
// Revisa cada minuto mientras LA FORJA está abierta (también en segundo plano, si el sistema lo permite).
// Si el usuario dio permiso, usa la notificación del sistema; además muestra un aviso dentro de la app.

import { recordatoriosPendientes } from '../motor/recordatorios.js';
import { estadoRecordatorios, marcarEnviados, registrarAgua } from '../datos/habitos.js';
import { esc, aviso } from './componentes.js';
import { nubeAvisa } from '../nube/avisos.js';

// Estos ya los manda la nube a este teléfono (también con la app cerrada): con la app abierta solo se muestran dentro
const DE_LA_NUBE = av => ['comida', 'entreno', 'agua'].includes(av.tipo) || av.clave.startsWith('sueno:');

let alRegistrarAgua = null;   // la app refresca la pantalla tras registrar agua desde el aviso

let temporizador = null;

export const permisoNotificaciones = () => ('Notification' in window ? Notification.permission : 'no_disponible');
export async function pedirPermiso() {
  if (!('Notification' in window)) return 'no_disponible';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

async function mostrar(av, atletaId) {
  if (permisoNotificaciones() === 'granted' && !(nubeAvisa() && DE_LA_NUBE(av))) {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const opciones = { body: av.cuerpo, tag: av.clave, silent: av.silencioso, icon: 'icons/forja-192.png', badge: 'icons/forja-192.png' };
      if (reg) await reg.showNotification(`${av.icono} ${av.titulo}`, opciones);
      else new Notification(`${av.icono} ${av.titulo}`, opciones);
    } catch { /* si falla, queda el aviso dentro de la app */ }
  }
  if (document.visibilityState === 'visible') bannerEnApp(av, atletaId);
}

export function bannerEnApp(av, atletaId = null) {
  const el = document.createElement('div');
  el.className = 'recordatorio-app';
  el.setAttribute('role', 'status');
  const agua = av.tipo === 'agua' && atletaId;
  el.innerHTML = `<span class="ra-icono">${av.icono}</span><span class="ra-texto"><strong>${esc(av.titulo)}</strong>${av.cuerpo ? `<br><span>${esc(av.cuerpo)}</span>` : ''}
    ${agua ? '<span class="ra-agua"><button type="button" class="btn mini" data-ml="250">Tomé 250 ml</button><button type="button" class="btn mini" data-ml="500">Tomé 500 ml</button><button type="button" class="btn mini sec" data-ml="otra">Otra cantidad</button></span>' : ''}</span>
    <button type="button" class="btn mini sec" data-cerrar aria-label="Cerrar">✕</button>`;
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-cerrar]')) return el.remove();
    const b = e.target.closest('[data-ml]'); if (!b) return;
    let ml = Number(b.dataset.ml);
    if (b.dataset.ml === 'otra') ml = Number(String(prompt('¿Cuántos ml tomaste?', '300') || '').replace(',', '.'));
    if (!(ml >= 10 && ml <= 3000)) return;
    await registrarAgua(atletaId, Math.round(ml));
    el.remove();
    aviso(`💧 ${Math.round(ml)} ml registrados`);
    alRegistrarAgua?.();
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), agua ? 60000 : 12000);
}

export async function revisarAhora(atleta) {
  if (!atleta?.id || atleta.estado !== 'evaluado') return [];
  const estado = await estadoRecordatorios(atleta);
  const lista = recordatoriosPendientes(new Date(), estado);
  if (!lista.length) return [];
  await marcarEnviados(estado.rec, lista.map(a => a.clave));
  for (const av of lista) await mostrar(av, atleta.id);
  return lista;
}

export function iniciarRecordatorios(obtenerAtleta, alAgua = null) {
  alRegistrarAgua = alAgua;
  detenerRecordatorios();
  const tic = () => revisarAhora(obtenerAtleta()).catch(e => console.warn('Recordatorios:', e));
  tic();
  temporizador = setInterval(tic, 60 * 1000);
}
export function detenerRecordatorios() { clearInterval(temporizador); temporizador = null; }
