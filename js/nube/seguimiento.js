// Seguimiento: el teléfono de la clienta sube a la nube una copia de sus registros para que su doctora los vea.
// Se sube solo lo que cambió desde la última vez (cada registro guarda su hora en "actualizado") y los borrados.
// Solo se sube la persona de este aparato que está conectada a la cuenta (en un teléfono puede haber varias).

import * as BD from '../datos/almacen.js';
import { nube, limiteDeEspera } from './cliente.js';
import { novedades } from './acceso.js';
import { hoyISO, sumarDias, evolucionPeso } from '../motor/calculos.js';
import { COMIDO } from '../motor/ajusteDiario.js';
import { totalPasos } from '../motor/pasos.js';

// Los mismos nombres que acepta la nube (almacenes_seguimiento en supabase/esquema.sql)
const ALMACENES = ['atletas', 'mediciones', 'evaluaciones', 'retos', 'sesiones', 'retroalimentacion', 'registrosDiarios',
  'nutrition_profiles', 'nutrition_plans', 'meals', 'meal_items', 'food_preferences', 'food_restrictions', 'allergies',
  'hydration_goals', 'hydration_logs', 'sleep_goals', 'sleep_logs', 'recovery_logs', 'supplements', 'supplement_logs', 'steps'];
const POR_ENVIO = 300;
const ESPERA_MS = 20000;
const PAUSA_MS = 30000;   // tras un cambio se espera un poco: así varios cambios seguidos salen juntos
const BORRADOS = 'la-forja-nube-borrados';
const MENSAJE_AVISADO = 'la-forja-mensaje-avisado';

let estado = null;        // { id: 'nube', cuenta, atletaId, subido }
let temporizador = null, subiendo = null, otraVez = false;

const leerBorrados = () => { try { return JSON.parse(localStorage.getItem(BORRADOS)) || []; } catch { return []; } };
const guardarBorrados = l => { try { l.length ? localStorage.setItem(BORRADOS, JSON.stringify(l)) : localStorage.removeItem(BORRADOS); } catch {} };

// La sesión de entrenamiento lleva todo el guion de ejercicios: a la doctora le basta con el resultado
function recortar(almacen, r) {
  if (almacen === 'atletas') { const { foto, ...resto } = r; return resto; }
  if (almacen === 'sesiones') {
    const w = r.workout || {};
    return { id: r.id, atletaId: r.atletaId, fecha: r.fecha, estado: r.estado, inicio: r.inicio, fin: r.fin, duracionSeg: r.duracionSeg,
      resumen: r.resumen, comentarios: r.comentarios, general: r.resultado?.general || null, actualizado: r.actualizado,
      workout: { nombre: w.nombre, tipo: w.tipo, objetivo: w.objetivo, duracion: w.duracion, lugar: w.lugar, dificultad: w.dificultad } };
  }
  return r;
}

// Del menú solo interesa lo pasado y la semana que viene (el resto se rehace a menudo)
const comidaVisible = m => m.fecha <= sumarDias(hoyISO(), 7);

async function registrosDe(atletaId, desde) {
  const salida = [];
  const comidas = await BD.porAtleta('meals', atletaId);
  const comidasOk = new Set(comidas.filter(comidaVisible).map(m => m.id));
  for (const almacen of ALMACENES) {
    let lista = almacen === 'atletas' ? [await BD.obtener('atletas', atletaId)].filter(Boolean)
      : almacen === 'meals' ? comidas : await BD.porAtleta(almacen, atletaId);
    if (almacen === 'meals') lista = lista.filter(m => comidasOk.has(m.id));
    if (almacen === 'meal_items') lista = lista.filter(i => comidasOk.has(i.mealId));
    if (desde) lista = lista.filter(r => !r.actualizado || r.actualizado >= desde);
    for (const r of lista) salida.push({ almacen, datos: recortar(almacen, r) });
  }
  return salida;
}

// Lo que la doctora ve en su lista sin abrir la ficha (se calcula en el teléfono con los datos completos)
async function resumen(atletaId) {
  const hoy = hoyISO(), hace7 = sumarDias(hoy, -6);
  const [a, mediciones, sesiones, comidas, agua, suenos, pasos, registros] = await Promise.all([
    BD.obtener('atletas', atletaId), BD.porAtleta('mediciones', atletaId), BD.porAtleta('sesiones', atletaId), BD.porAtleta('meals', atletaId),
    BD.porAtleta('hydration_logs', atletaId), BD.porAtleta('sleep_logs', atletaId), BD.porAtleta('steps', atletaId), BD.porAtleta('registrosDiarios', atletaId),
  ]);
  const evo = evolucionPeso(mediciones);
  const hechas = sesiones.filter(s => ['completada', 'incompleta'].includes(s.estado)).map(s => s.fecha).sort();
  const comidasHechas = comidas.filter(m => m.tipo === 'extra' || COMIDO.includes(m.estado) || m.estado === 'no_realizada').map(m => m.fecha).sort();
  const semana = arr => arr.filter(x => x.fecha >= hace7 && x.fecha <= hoy);
  const noches = semana(suenos).filter(s => s.duracionMin);
  const diasPasos = semana(pasos).map(totalPasos).filter(n => n > 0);
  const dolor = [...sesiones.filter(s => s.resultado?.general?.dolor).map(s => s.fecha), ...registros.filter(r => r.dolorArticular === 'si' || r.dolorMuscular >= 7).map(r => r.fecha)].sort().pop() || null;
  return {
    nombre: a?.personal?.nombre || '', unidades: a?.unidades || null,
    peso: evo?.actual.peso ?? a?.personal?.peso ?? null, pesoInicial: evo?.inicial.peso ?? null, pesoFecha: evo?.actual.fecha ?? null,
    cambio30: evo?.hay30 ? evo.cambio30dias : null,
    ultimoEntreno: hechas.pop() || null, entrenos7: sesiones.filter(s => s.estado === 'completada' && s.fecha >= hace7).length, diasSemana: a?.disponibilidad?.dias || null,
    ultimaComida: comidasHechas.filter(f => f <= hoy).pop() || null, diasComidas7: new Set(comidasHechas.filter(f => f >= hace7 && f <= hoy)).size,
    agua7: Math.round(semana(agua).reduce((t, l) => t + (l.ml || 0), 0) / 7),
    sueno7: noches.length ? Math.round(noches.reduce((t, s) => t + s.duracionMin, 0) / noches.length / 6) / 10 : null,
    pasos7: diasPasos.length ? Math.round(diasPasos.reduce((t, n) => t + n, 0) / diasPasos.length) : null,
    dolor, abrio: hoy,
  };
}

async function subirAhora() {
  if (!estado?.atletaId) return;
  const marca = new Date().toISOString();
  const desdeCero = !estado.subido;
  // Dueño y doctora: se respaldan TODAS las personas de este aparato (no tienen doctora que las vea)
  const ids = estado.todas ? (await BD.todos('atletas')).map(x => x.id) : [estado.atletaId];
  const registros = (await Promise.all(ids.map(id => registrosDe(id, estado.subido)))).flat();
  const borrados = leerBorrados();
  const envios = [];
  for (let i = 0; i < registros.length; i += POR_ENVIO) envios.push(registros.slice(i, i + POR_ENVIO));
  if (!envios.length) envios.push([]);
  const res = estado.todas ? null : await resumen(estado.atletaId);
  for (let i = 0; i < envios.length; i++) {
    const ultimo = i === envios.length - 1;
    const { error } = await nube.rpc('subir_datos', {
      p_registros: envios[i], p_borrados: i === 0 ? borrados : [], p_resumen: ultimo ? res : null, p_desde_cero: desdeCero && i === 0,
    }).abortSignal(limiteDeEspera(ESPERA_MS));
    if (error) throw error;
  }
  guardarBorrados(leerBorrados().slice(borrados.length));   // los que llegaron mientras se subía se quedan para la próxima
  estado.subido = marca;
  await BD.guardar('ajustes', estado);
}

// Sube ya (o en cuanto termine la subida en curso). Devuelve true si llegó; sin internet se intenta la próxima vez.
export function subir() {
  clearTimeout(temporizador); temporizador = null;
  if (subiendo) { otraVez = true; return subiendo; }
  subiendo = subirAhora().then(() => true, e => { console.warn('Seguimiento: no se pudo subir', e); return false; }).finally(() => {
    subiendo = null;
    if (otraVez) { otraVez = false; subir(); }
  });
  return subiendo;
}

function alCambiar(tipo, almacen, ids) {
  if (almacen === 'ajustes' || !estado?.atletaId) return;
  if (tipo === 'borrado') guardarBorrados([...leerBorrados(), ...ids.map(id => ({ almacen, id }))]);
  if (!temporizador) temporizador = setTimeout(subir, PAUSA_MS);
}

// Empieza a vigilar los cambios de la persona conectada a esta cuenta de clienta.
// atleta: la persona abierta; si la cuenta aún no tiene persona en este aparato, queda conectada esa.
// Dueño y doctora: copia de respaldo de todas las personas del aparato (para recuperarlas en otro aparato o dirección).
export async function activarSeguimiento(cuenta, atleta) {
  const todas = cuenta.rol !== 'clienta';
  const previo = await BD.obtener('ajustes', 'nube');
  estado = previo?.cuenta === cuenta.cuenta && !!previo.todas === todas && (await BD.obtener('atletas', previo.atletaId)) ? previo : null;
  if (!estado && atleta) estado = await BD.guardar('ajustes', { id: 'nube', cuenta: cuenta.cuenta, atletaId: atleta.id, subido: null, todas });
  if (!estado) return null;
  BD.vigilarCambios(alCambiar);
  subir();
  return estado.atletaId;
}

// Desde "Mi cuenta": la doctora pasa a ver a otra persona de este aparato (se borra lo subido de la anterior)
export async function cambiarPersona(cuenta, atletaId) {
  estado = await BD.guardar('ajustes', { id: 'nube', cuenta: cuenta.cuenta, atletaId, subido: null });
  await BD.borrar('ajustes', 'indicaciones').catch(() => {});   // los ajustes de la doctora eran para la otra persona
  await revisarNovedades();
  guardarBorrados([]);
  BD.vigilarCambios(alCambiar);
  await subir();
}

// Mensajes sin leer y ajustes del plan que puso la doctora. Los ajustes se guardan en el teléfono para la persona
// conectada (así valen sin internet) y el plan de comidas los aplica (datos/habitos.js).
// Devuelve { sinLeer, mensajeNuevo, planCambio, indicaciones }, o null si no se pudo consultar.
export async function revisarNovedades() {
  let n;
  try { n = await novedades(); } catch { return null; }
  let planCambio = false, indicaciones = null;
  if (estado?.atletaId) {
    const previo = await BD.obtener('ajustes', 'indicaciones');
    indicaciones = n.indicaciones ? { id: 'indicaciones', atletaId: estado.atletaId, ...n.indicaciones, version: n.indicaciones.actualizado } : null;
    planCambio = (previo?.version || null) !== (indicaciones?.version || null) || (!!indicaciones && previo?.atletaId !== estado.atletaId);
    if (indicaciones && planCambio) await BD.guardar('ajustes', indicaciones);
    if (!indicaciones && previo) await BD.borrar('ajustes', 'indicaciones');
  }
  // El aviso de "mensaje nuevo" sale una sola vez por mensaje
  let avisado = null;
  try { avisado = localStorage.getItem(MENSAJE_AVISADO); } catch {}
  const mensajeNuevo = n.sin_leer > 0 && n.ultimo_mensaje !== avisado;
  if (mensajeNuevo) try { localStorage.setItem(MENSAJE_AVISADO, n.ultimo_mensaje); } catch {}
  return { sinLeer: n.sin_leer, mensajeNuevo, planCambio, indicaciones };
}

// Recuperar mis datos: en un aparato (o una dirección de la app) sin ninguna persona guardada, la clienta baja la copia
// que su teléfono subió. Lo planificado que no se hizo (menú pendiente, entreno sin empezar) no se baja: la app lo
// vuelve a armar. Dueño y doctora recuperan todas las personas que respaldaron. Devuelve la primera, o null si no hay nada.
export async function recuperarDeLaNube(cuenta) {
  const { data, error } = await nube.rpc('mis_datos').abortSignal(limiteDeEspera(ESPERA_MS));
  if (error) throw error;
  const atleta = data?.atletas?.[0];
  if (!atleta?.id) return null;
  const pendiente = r => r.estado === 'planificada' || r.estado === 'en_curso';
  const comidasFuera = new Set((data.meals || []).filter(m => m.tipo !== 'extra' && pendiente(m)).map(m => m.id));
  for (const almacen of ALMACENES) {
    let lista = (data[almacen] || []).filter(r => r?.id);
    if (almacen === 'meals') lista = lista.filter(m => !comidasFuera.has(m.id));
    if (almacen === 'meal_items') lista = lista.filter(i => !comidasFuera.has(i.mealId));
    if (almacen === 'sesiones') lista = lista.filter(s => !pendiente(s)).map(({ general, ...s }) => ({ ...s, resultado: general ? { general } : null }));
    if (lista.length) await BD.guardarVarios(almacen, lista);
  }
  // Queda conectada a la cuenta: la próxima subida reemplaza la copia de la nube con lo de este aparato
  await BD.guardar('ajustes', { id: 'nube', cuenta: cuenta.cuenta, atletaId: atleta.id, subido: null, todas: cuenta.rol !== 'clienta' });
  await BD.guardar('ajustes', { ...((await BD.obtener('ajustes', 'app')) || {}), id: 'app', atletaActual: atleta.id });
  return atleta;
}

export const personaConectada = () => estado?.atletaId || null;
export const ultimaSubida = () => estado?.subido || null;

// Al salir de la cuenta, este aparato deja de subir
export async function apagarSeguimiento() {
  clearTimeout(temporizador); temporizador = null;
  BD.vigilarCambios(null);
  estado = null;
  guardarBorrados([]);
  try { localStorage.removeItem(MENSAJE_AVISADO); } catch {}
  await BD.borrar('ajustes', 'nube').catch(() => {});
  await BD.borrar('ajustes', 'indicaciones').catch(() => {});
}
