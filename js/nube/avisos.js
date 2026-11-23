// Avisos con la app cerrada (Web Push): este teléfono se apunta para recibirlos y sube la agenda de hoy y mañana.
// Lo demás lo hace la nube (supabase/avisos.sql y supabase/functions/avisar). Android y PC: sí. iPhone: con iOS 16.4
// o más nuevo y LA FORJA instalada en la pantalla de inicio. Donde no se puede, quedan las alarmas del calendario.

import * as BD from '../datos/almacen.js';
import { nube, limiteDeEspera } from './cliente.js';
import { estadoRecordatorios } from '../datos/habitos.js';
import { agendaDelDia } from '../motor/agenda.js';
import { hoyISO, sumarDias } from '../motor/calculos.js';

const VAPID_PUBLICA = 'BC-LtspcRdzNcmrmVAbFkXgQFmPE8wmzeyV6XABkV7_Bj_RQ7iWWa-QFPfGZVDxy-T9cfqZv5Ycx7G5EakoHcZs';
const ESPERA_MS = 20000;
const COBERTURA = 'la-forja-avisos';   // tipos que ya avisa la nube (para no repetirlos con la app abierta)

const deBase64Url = s => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
};
const esIPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

// 'activos' | 'apagados' | 'bloqueados' | 'instalar' (iPhone sin instalar) | 'no_disponible'
export async function estadoAvisos() {
  const posible = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!posible) return esIPhone() && !instalada() ? 'instalar' : 'no_disponible';
  if (Notification.permission === 'denied') return 'bloqueados';
  const reg = await navigator.serviceWorker.getRegistration();
  const sus = await reg?.pushManager.getSubscription();
  return sus && Notification.permission === 'granted' ? 'activos' : 'apagados';
}
export const nubeAvisa = () => { try { return localStorage.getItem(COBERTURA) === '1'; } catch { return false; } };

async function guardar(sus) {
  const j = sus.toJSON();
  const { error } = await nube.rpc('guardar_suscripcion', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth })
    .abortSignal(limiteDeEspera(ESPERA_MS));
  if (error) throw error;
  try { localStorage.setItem(COBERTURA, '1'); } catch {}
}

// Pide permiso y apunta este teléfono a la cuenta conectada. Devuelve el estado final.
export async function activarAvisos() {
  const est = await estadoAvisos();
  if (est === 'no_disponible' || est === 'instalar' || est === 'bloqueados') return est;
  if (await Notification.requestPermission() !== 'granted') return Notification.permission === 'denied' ? 'bloqueados' : 'apagados';
  const reg = await navigator.serviceWorker.ready;
  const sus = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deBase64Url(VAPID_PUBLICA) });
  await guardar(sus);
  return 'activos';
}

// Al abrir la app: si el teléfono ya estaba apuntado, se confirma para esta cuenta (por si cambió de cuenta o la nube la borró)
export async function renovarAvisos() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sus = await reg?.pushManager?.getSubscription();
    if (sus && Notification.permission === 'granted') await guardar(sus);
  } catch (e) { console.warn('Avisos:', e); }
}

// Al salir de la cuenta: este teléfono deja de recibir los avisos de esa cuenta
export async function apagarAvisos() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sus = await reg?.pushManager?.getSubscription();
    if (sus) {
      await nube.rpc('quitar_suscripcion', { p_endpoint: sus.endpoint }).abortSignal(limiteDeEspera(ESPERA_MS));
      await sus.unsubscribe();
    }
  } catch (e) { console.warn('Avisos:', e); }
  try { localStorage.removeItem(COBERTURA); } catch {}
}

// Sube las actividades de hoy y de los 2 días siguientes de la persona conectada (con lo ya marcado):
// así los recordatorios siguen llegando aunque no abra la app un par de días
export async function subirAgenda(atletaId) {
  const atleta = atletaId && await BD.obtener('atletas', atletaId);
  if (!atleta || atleta.estado !== 'evaluado') return;
  const hoy = hoyISO(), dias = [hoy, sumarDias(hoy, 1), sumarDias(hoy, 2)];
  const items = [];
  for (const fecha of dias) items.push(...agendaDelDia(await estadoRecordatorios(atleta, fecha)));
  // Una sola actividad por clave: dos iguales hacían que la nube rechazara toda la agenda
  const unicos = [...new Map(items.map(x => [x.clave, x])).values()];
  const { error } = await nube.rpc('subir_agenda', { p_items: unicos, p_dias: dias }).abortSignal(limiteDeEspera(ESPERA_MS));
  if (error) throw error;
}

// Alarma con la app abierta: "Apagar" la calla unos minutos; "Ya lo hice" (minutos = 10) mientras se anota la actividad
export async function callarAlarma(ficha, minutos = null) {
  const { error } = await nube.rpc('apagar_aviso', { p_ficha: ficha, p_minutos: minutos }).abortSignal(limiteDeEspera(ESPERA_MS));
  if (error) throw error;
}
