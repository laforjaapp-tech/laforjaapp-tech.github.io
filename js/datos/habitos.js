// FASE 4: lectura y guardado de alimentación, libreta, agua, sueño, recuperación, suplementos, compras
// y seguimiento (frutas, café, azúcar, vitaminas, rachas). Une los datos guardados con los motores.

import * as BD from './almacen.js';
import { platoPorId, alimentoPorId } from './alimentos.js';
import { alternativas, platosParecidos, listaComprasDesde, nombreComida, totales, aMinutos } from '../motor/nutricion.js';
import { prepararPlan, semanaDe } from '../motor/planComidas.js';
import { metaAgua, necesitaPausasAgua, INTENSOS } from '../motor/hidratacion.js';
import { suenoPorDefecto, duracionSueno, puntuacionRecuperacion, esDiaEntreno, resumenSemana, fechaDeLaNoche } from '../motor/recuperacion.js';
import { COMIDO } from '../motor/ajusteDiario.js';
import { RECORDATORIOS_DEFECTO } from '../motor/recordatorios.js';
import { contadoresDia, totalesLineas, logros } from '../motor/seguimiento.js';
import { hoyISO, sumarDias } from '../motor/calculos.js';
import { totalPasos, kcalPasos, kmPasos, metaPasos, minutosPasos, actividadPorPasos } from '../motor/pasos.js';
import { recetasPara } from './recetas.js';

const SEMANAS = 4;
// Versión del armado del menú: al cambiarla, cada teléfono rehace las comidas futuras que aún no anotó
// (2: el menú respeta las calorías de la meta y los límites de la nutrióloga)
const MOTOR_MENU = 2;
const uno = async (almacen, atletaId) => (await BD.porAtleta(almacen, atletaId))[0] || null;
const horaAhora = () => new Date().toTimeString().slice(0, 5);
export const lunesDe = fecha => { const d = new Date(fecha + 'T12:00:00'); return sumarDias(fecha, -((d.getDay() + 6) % 7)); };
const cerrada = s => ['completada', 'incompleta'].includes(s.estado);

// =====================================================================
// Perfil nutricional, preferencias, restricciones y alergias
// =====================================================================
export async function datosNutricion(atleta) {
  const [perfil, preferencias, restricciones, alergias] = await Promise.all([
    uno('nutrition_profiles', atleta.id), uno('food_preferences', atleta.id),
    BD.porAtleta('food_restrictions', atleta.id), BD.porAtleta('allergies', atleta.id),
  ]);
  const pais = (atleta.personal?.pais || '').toLowerCase();
  const cultura = /domin|puerto|cuba|rep[uú]blica/.test(pais) || !pais ? 'caribe'
    : /m[eé]xic|colomb|venez|per[uú]|chile|argent|ecuad|guatem|hond|salv|nicar|costa|panam|bolivia|paragu|urugu/.test(pais) ? 'latina' : 'general';
  return { perfil, preferencias: preferencias || { atletaId: atleta.id, patron: 'omnivoro', favoritos: [], cultura }, restricciones, alergias };
}

export async function guardarPreferencias(atleta, { perfil, preferencias, alergias, rechazados, reducir }) {
  const actual = await datosNutricion(atleta);
  await BD.guardar('nutrition_profiles', { ...(actual.perfil || {}), ...perfil, atletaId: atleta.id });
  await BD.guardar('food_preferences', { ...(actual.preferencias || {}), ...preferencias, atletaId: atleta.id });
  // Alergias y restricciones se reemplazan por lo elegido
  await BD.borrarVarios('allergies', actual.alergias.map(a => a.id));
  await BD.guardarVarios('allergies', alergias.map(a => ({ atletaId: atleta.id, ...a })));
  await BD.borrarVarios('food_restrictions', actual.restricciones.map(r => r.id));
  await BD.guardarVarios('food_restrictions', [
    ...rechazados.map(id => ({ atletaId: atleta.id, alimentoId: id, tipo: 'rechazar' })),
    ...reducir.map(id => ({ atletaId: atleta.id, alimentoId: id, tipo: 'reducir' })),
  ]);
  return asegurarPlan(atleta, { forzar: true });
}

// ❤️ Libreta de gustos: lo que le gusta comer, escrito con sus palabras (lo lee su nutricionista)
export async function guardarGustos(atleta, gustos, nuevosFavoritos = []) {
  const { preferencias } = await datosNutricion(atleta);
  const favoritos = [...new Set([...(preferencias.favoritos || []), ...nuevosFavoritos])];
  await BD.guardar('food_preferences', { ...preferencias, atletaId: atleta.id, gustos: { ...gustos, actualizado: new Date().toISOString() }, favoritos });
  return nuevosFavoritos.length ? asegurarPlan(atleta, { forzar: true }) : null;
}

// =====================================================================
// Plan: necesidades + 4 semanas de menú
// =====================================================================
// Genera las semanas que falten y, si cambian las necesidades (p. ej. cambió el peso) o las preferencias,
// rehace las comidas futuras que aún no se registraron. Las ya registradas nunca se tocan.
export async function asegurarPlan(atleta, { forzar = false } = {}) {
  const d = await datosNutricion(atleta);
  if (!d.perfil) return { configurado: false, ...d };
  const perfil = d.perfil;
  // Lo que indicó su nutrióloga desde su panel (lo baja js/nube/seguimiento.js) manda sobre el cálculo, y sus
  // RECETAS entran al menú como platos (con la porción ajustada a su meta)
  const [ind, recetas] = await Promise.all([indicacionesDe(atleta), recetasPara(atleta)]);
  const plan = prepararPlan({ atleta, perfil, preferencias: d.preferencias, restricciones: d.restricciones, alergias: d.alergias, ind, recetas: recetas.lista });
  const { nec, filtro } = plan;
  const planes = (await BD.porAtleta('nutrition_plans', atleta.id)).sort((a, b) => a.creado.localeCompare(b.creado));
  let planNut = planes[planes.length - 1];
  if (!planNut || planNut.kcal !== nec.kcal || planNut.proteina !== nec.proteina || planNut.objetivo !== nec.objetivo) {
    planNut = await BD.guardar('nutrition_plans', { atletaId: atleta.id, ...nec });
  }
  const firma = [MOTOR_MENU, nec.kcal, nec.proteina, ind?.version || '', recetas.version, plan.perfilPlan.comidas, (perfil.diasEntreno || []).join(','), perfil.horaEntreno, JSON.stringify(perfil.horarios)].join('|');
  const hoy = hoyISO();
  const lunes = lunesDe(hoy);
  const semanas = (await BD.porAtleta('meal_plans', atleta.id)).sort((a, b) => a.inicio.localeCompare(b.inicio));
  let usoPrevio = semanas.filter(s => s.inicio < lunes).pop()?.uso || {};
  for (let k = 0; k < SEMANAS; k++) {
    const inicio = sumarDias(lunes, 7 * k);
    const existente = semanas.find(s => s.inicio === inicio);
    if (existente && existente.firma === firma && !forzar) { usoPrevio = existente.uso || usoPrevio; continue; }
    const sem = semanaDe(plan, { inicio, semilla: `${atleta.id}|${forzar ? Date.now() : ''}`, usoPrevio });
    usoPrevio = sem.uso;
    await guardarSemana(atleta.id, existente, inicio, sem, inicio < hoy ? hoy : inicio, firma, planNut.id);
  }
  return { configurado: true, ...d, nec, filtro, planNut, indicaciones: ind };
}

// Ajustes de la nutrióloga guardados en este teléfono, si son para esta persona
export async function indicacionesDe(atleta) {
  const ind = await BD.obtener('ajustes', 'indicaciones');
  return ind?.atletaId === atleta.id ? ind : null;
}

async function guardarSemana(atletaId, existente, inicio, sem, desde, firma, planNutId) {
  const plan = await BD.guardar('meal_plans', { ...(existente || {}), atletaId, inicio, fin: sumarDias(inicio, 6), firma, uso: sem.uso, nutritionPlanId: planNutId });
  const previas = await BD.porIndice('meals', 'mealPlanId', plan.id);
  const quitar = previas.filter(m => m.fecha >= desde && m.estado === 'planificada' && m.tipo !== 'extra');
  const conservar = previas.filter(m => !quitar.includes(m));
  for (const m of quitar) await BD.borrarVarios('meal_items', (await BD.porIndice('meal_items', 'mealId', m.id)).map(i => i.id));
  await BD.borrarVarios('meals', quitar.map(m => m.id));
  const nuevas = [], items = [];
  for (const dia of sem.dias) {
    if (dia.fecha < desde) continue;
    for (const c of dia.comidas) {
      if (conservar.some(m => m.fecha === dia.fecha && m.tipo === c.tipo)) continue;
      const meal = { id: BD.nuevoId(), atletaId, mealPlanId: plan.id, fecha: dia.fecha, tipo: c.tipo, hora: c.hora, platoId: c.platoId, recetaId: c.recetaId, nombre: c.nombre,
        totales: c.totales, pre: c.pre, post: c.post, movida: !!c.movida, indicada: !!c.indicada, avisoIndicada: c.avisoIndicada || null, entreno: dia.entreno, estado: 'planificada', registro: null };
      nuevas.push(meal);
      c.items.forEach(it => items.push({ atletaId, mealId: meal.id, ...it }));
    }
  }
  await BD.guardarVarios('meals', nuevas);
  await BD.guardarVarios('meal_items', items);
}

// Comidas (plan y libreta) con sus alimentos entre dos fechas incluidas
export async function comidasEntre(atletaId, desde, hasta) {
  const [meals, items] = await Promise.all([BD.porAtleta('meals', atletaId), BD.porAtleta('meal_items', atletaId)]);
  const porComida = {};
  for (const it of items) (porComida[it.mealId] ||= []).push(it);
  return meals.filter(m => m.fecha >= desde && m.fecha <= hasta)
    .map(m => ({ ...m, items: porComida[m.id] || [] }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || aMinutos(a.registro?.horaComida || a.hora) - aMinutos(b.registro?.horaComida || b.hora));
}

// Marcar una comida del plan: completada | mitad | no_realizada | diferente | planificada (deshacer)
export async function registrarComida(meal, estado, registro = null) {
  const { items, ...m } = meal;
  m.estado = estado;
  const ahora = horaAhora();
  // Hora en que se comió: la planificada, o la de ahora si se marca antes (sirve para "tiempo sin comer")
  const horaComida = m.fecha === hoyISO() && aMinutos(ahora) < aMinutos(m.hora) ? ahora : m.hora;
  m.registro = estado === 'planificada' ? null
    : estado === 'no_realizada' ? { hora: ahora }
    : { ...(registro || {}), hora: ahora, horaComida: registro?.horaComida || horaComida };
  await BD.guardar('meals', m);
}

// Última vez que se comió algo (comidas marcadas y anotaciones de la libreta), hasta "ahora"
export function ultimaIngesta(comidas, ahora = new Date()) {
  const hoy = hoyISO();
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  let ultima = null, sello = -Infinity;
  for (const c of comidas) {
    if (!(c.tipo === 'extra' || COMIDO.includes(c.estado))) continue;
    if (c.tipo === 'extra' && c.registro?.soloBebida) continue;   // un café o un refresco no cortan el "tiempo sin comer"
    const h = aMinutos(c.registro?.horaComida || c.hora);
    const dias = Math.round((new Date(hoy + 'T12:00:00') - new Date(c.fecha + 'T12:00:00')) / 864e5);
    const t = -dias * 1440 + h;
    if (t <= minAhora && t > sello) { sello = t; ultima = c; }
  }
  return ultima ? { comida: ultima, minutos: minAhora - sello } : null;
}

// =====================================================================
// 📒 Libreta: todo lo que se come o bebe fuera del plan
// =====================================================================
// lineas: lo reconocido en el texto [{ id, cantidad, conAzucar }] (pizza, refresco, café, fruta…)
export async function agregarAnotacion(atletaId, fecha, { texto, lineas = [], porcion = '', nota = '', horaComida }) {
  const hora = horaComida || horaAhora();
  const t = lineas.length ? totalesLineas(lineas) : null;
  const soloBebida = lineas.length > 0 && lineas.every(l => /^(cola|refresco|refresco_zero|jugo|malta|energizante|cafe_leche|cafecito|te|cerveza|ron|vino)$/.test(l.id));
  return BD.guardar('meals', {
    atletaId, mealPlanId: null, fecha, tipo: 'extra', hora, nombre: texto, estado: 'diferente', totales: t,
    registro: { texto, lineas, porcion, nota, horaComida: hora, totales: t, soloBebida },
  });
}
export const borrarAnotacion = id => BD.borrar('meals', id);

// =====================================================================
// CAMBIAR un alimento del plan
// =====================================================================
// Si "rechazar", deja de aparecer y se sustituye en todas las comidas futuras.
export async function cambiarAlimento(atleta, meal, item, nuevo, { rechazar = false, filtro }) {
  await reemplazarEnComida(meal, item, nuevo);
  if (!rechazar) return;
  await BD.guardar('food_restrictions', { atletaId: atleta.id, alimentoId: item.alimentoId, tipo: 'rechazar' });
  const filtroNuevo = { ...filtro, permitido: id => id !== item.alimentoId && filtro.permitido(id) };
  const futuras = (await comidasEntre(atleta.id, hoyISO(), '9999-12-31')).filter(m => m.estado === 'planificada' && m.id !== meal.id);
  for (const m of futuras) {
    for (const it of m.items.filter(i => i.alimentoId === item.alimentoId)) {
      const alt = alternativas(m, it, filtroNuevo, 1)[0];
      if (alt) await reemplazarEnComida(m, it, alt);
    }
  }
}

// Cambiar la comida entera por otro plato parecido ("No lo tengo" / "No me lo comí")
export async function cambiarPlato(meal, opcion) {
  const guardada = await BD.obtener('meals', meal.id);
  if (!guardada) return;
  await BD.borrarVarios('meal_items', (await BD.porIndice('meal_items', 'mealId', meal.id)).map(i => i.id));
  await BD.guardarVarios('meal_items', opcion.items.map(({ id, ...it }) => ({ ...it, atletaId: guardada.atletaId, mealId: meal.id })));
  await BD.guardar('meals', { ...guardada, platoId: opcion.platoId, nombre: opcion.nombre, totales: opcion.totales, estado: 'planificada', registro: null, cambiada: true });
}

// 🚫 Mi lista de lo que no como: se guarda y esos alimentos se sustituyen en todas las comidas futuras
// (por uno parecido del mismo tipo; si no hay, se cambia el plato entero).
export async function guardarNoComo(atleta, ids, filtro) {
  const actuales = (await BD.porAtleta('food_restrictions', atleta.id)).filter(r => r.tipo === 'rechazar');
  const nuevos = new Set(ids);
  await BD.borrarVarios('food_restrictions', actuales.filter(r => !nuevos.has(r.alimentoId)).map(r => r.id));
  const ya = new Set(actuales.map(r => r.alimentoId));
  await BD.guardarVarios('food_restrictions', ids.filter(id => !ya.has(id)).map(id => ({ atletaId: atleta.id, alimentoId: id, tipo: 'rechazar' })));
  const f = { ...filtro, permitido: id => !nuevos.has(id) && filtro.permitido(id), elegible: id => !nuevos.has(id) && filtro.elegible(id) };
  const futuras = (await comidasEntre(atleta.id, hoyISO(), '9999-12-31')).filter(m => m.estado === 'planificada' && m.tipo !== 'extra');
  for (const m of futuras) {
    for (const it of m.items.filter(i => nuevos.has(i.alimentoId))) {
      const alt = alternativas(m, it, f, 1)[0];
      if (alt) { await reemplazarEnComida(m, it, alt); continue; }
      const otro = platosParecidos(m, f, 1)[0];
      if (otro) { await cambiarPlato(m, otro); break; }
    }
  }
}

async function reemplazarEnComida(meal, item, nuevo) {
  const items = meal.items.map(i => (i.id === item.id ? { ...i, alimentoId: nuevo.alimentoId, g: nuevo.g } : i));
  await BD.guardar('meal_items', { ...item, alimentoId: nuevo.alimentoId, g: nuevo.g });
  const plato = platoPorId[meal.platoId];
  const { items: _, ...m } = meal;
  m.nombre = plato ? nombreComida(plato, items) : m.nombre;
  m.totales = totales(items);
  await BD.guardar('meals', m);
  Object.assign(meal, { items, nombre: m.nombre, totales: m.totales });
}

// =====================================================================
// 🛒 Lista de compras
// =====================================================================
export async function listaCompras(atleta, inicio, { regenerar = false } = {}) {
  const listas = await BD.porAtleta('shopping_lists', atleta.id);
  let lista = listas.find(l => l.semanaInicio === inicio);
  let items = lista ? await BD.porIndice('shopping_list_items', 'listaId', lista.id) : [];
  if (!lista || regenerar) {
    lista = await BD.guardar('shopping_lists', { ...(lista || {}), atletaId: atleta.id, semanaInicio: inicio, nombre: `Semana del ${inicio}`, generado: new Date().toISOString() });
    const comidas = (await comidasEntre(atleta.id, inicio, sumarDias(inicio, 6))).filter(m => m.tipo !== 'extra' && m.estado !== 'no_realizada');
    const calc = listaComprasDesde(comidas.flatMap(m => m.items));
    const perfil = await uno('nutrition_profiles', atleta.id);
    const previos = Object.fromEntries(items.filter(i => i.alimentoId).map(i => [i.alimentoId, i]));
    const nuevos = calc.map(c => {
      const p = previos[c.alimentoId];
      return { ...(p || {}), atletaId: atleta.id, listaId: lista.id, alimentoId: c.alimentoId, nombre: p?.editado ? p.nombre : c.nombre, categoria: c.categoria,
        cantidad: p?.editado ? p.cantidad : c.cantidad, calculado: c.cantidad, comprado: !!p?.comprado, manual: false,
        precio: p?.precio ?? perfil?.precios?.[c.alimentoId] ?? null, precioRef: c.precioRef };
    });
    const quitar = items.filter(i => !i.manual && !nuevos.some(n => n.id === i.id));
    await BD.borrarVarios('shopping_list_items', quitar.map(i => i.id));
    await BD.guardarVarios('shopping_list_items', nuevos);
    items = [...nuevos, ...items.filter(i => i.manual)];
  }
  return { lista, items };
}

export async function guardarItemCompra(atleta, item) {
  const g = await BD.guardar('shopping_list_items', item);
  if (item.alimentoId && item.precio != null) {   // el precio se recuerda para las próximas listas
    const perfil = await uno('nutrition_profiles', atleta.id);
    if (perfil) { perfil.precios = { ...(perfil.precios || {}), [item.alimentoId]: item.precio }; await BD.guardar('nutrition_profiles', perfil); }
  }
  return g;
}
export const borrarItemCompra = id => BD.borrar('shopping_list_items', id);

// =====================================================================
// 💧 Agua
// =====================================================================
export async function configAgua(atletaId) {
  return (await uno('hydration_goals', atletaId)) || { atletaId, clima: 'calor', sudoracion: 'media', personalizadoMl: null };
}
export const guardarConfigAgua = cfg => BD.guardar('hydration_goals', cfg);

// Entrenamiento del día para la meta de agua: la sesión de hoy o, si es día de entreno, la duración habitual
function entrenoDelDia(atleta, perfilNut, sesiones, fecha) {
  const s = sesiones.find(x => x.fecha === fecha && x.workout && x.workout.tipo !== 'recuperacion');
  if (s) return { minutos: s.duracionSeg ? Math.round(s.duracionSeg / 60) : s.workout.duracion, intenso: INTENSOS.includes(s.workout.tipo) };
  if (esDiaEntreno(perfilNut, fecha)) return { minutos: atleta.disponibilidad?.minutos || 45, intenso: false };
  return null;
}

// La meta (o el límite de líquidos) que indicó su nutrióloga manda sobre la calculada y la elegida por ella
export const aguaIndicada = ind => (ind?.agua_ml ? { ml: ind.agua_ml, maximo: !!ind.agua_maximo, por: ind.por || 'Tu nutrióloga' } : null);

export async function aguaDelDia(atleta, fecha = hoyISO(), contexto = null) {
  const [cfg, logs, sesiones, perfilNut, ind] = contexto
    ? [contexto.cfg, contexto.logs, contexto.sesiones, contexto.perfilNut, contexto.ind]
    : await Promise.all([configAgua(atleta.id), BD.porAtleta('hydration_logs', atleta.id), BD.porAtleta('sesiones', atleta.id), uno('nutrition_profiles', atleta.id), indicacionesDe(atleta)]);
  const meta = metaAgua(atleta, cfg, entrenoDelDia(atleta, perfilNut, sesiones, fecha), aguaIndicada(ind));
  const delDia = logs.filter(l => l.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora));
  return { meta, cfg, logs: delDia, consumido: delDia.reduce((a, l) => a + l.ml, 0) };
}

export function registrarAgua(atletaId, ml, fecha = hoyISO(), hora = horaAhora()) {
  return BD.guardar('hydration_logs', { atletaId, ml: Math.round(ml), fecha, hora });
}
export const borrarAgua = id => BD.borrar('hydration_logs', id);
export const aguaDe = atletaId => BD.porAtleta('hydration_logs', atletaId);

// =====================================================================
// 🌙 Sueño
// =====================================================================
export async function metaSuenoDe(atleta) { return (await uno('sleep_goals', atleta.id)) || { atletaId: atleta.id, ...suenoPorDefecto(atleta) }; }
export const guardarMetaSueno = g => BD.guardar('sleep_goals', g);
export const sueniosDe = atletaId => BD.porAtleta('sleep_logs', atletaId);

// fecha = día en que se despierta. Actualiza también el chequeo de ese día (lo lee el motor de entrenamiento).
export async function registrarSueno(atletaId, { fecha, horaDormir, horaDespertar, calidad, despertares }) {
  const previo = (await BD.porAtleta('sleep_logs', atletaId)).find(s => s.fecha === fecha);
  const duracionMin = duracionSueno(horaDormir, horaDespertar);
  const log = await BD.guardar('sleep_logs', { ...(previo || {}), atletaId, fecha, horaDormir, horaDespertar, duracionMin,
    calidad: calidad || previo?.calidad || null, despertares: despertares ?? previo?.despertares ?? null, pendiente: false });
  const reg = (await BD.porAtleta('registrosDiarios', atletaId)).find(r => r.fecha === fecha);
  if (reg) { reg.suenoHoras = Math.round((duracionMin / 60) * 10) / 10; if (log.calidad) reg.calidadSueno = log.calidad; await BD.guardar('registrosDiarios', reg); }
  return log;
}

// Botones "🌙 Me voy a dormir" y "☀️ Me desperté": guardan la hora real
export async function marcarDormir(atletaId) {
  const hora = horaAhora();
  const fecha = fechaDeLaNoche(hoyISO(), hora);
  const previo = (await BD.porAtleta('sleep_logs', atletaId)).find(s => s.fecha === fecha);
  return BD.guardar('sleep_logs', { ...(previo || {}), atletaId, fecha, horaDormir: hora, horaDespertar: null, duracionMin: null, pendiente: true });
}
export async function marcarDesperte(atletaId) {
  const fecha = hoyISO();
  const previo = (await BD.porAtleta('sleep_logs', atletaId)).find(s => s.fecha === fecha);
  if (!previo?.horaDormir) return null;
  return registrarSueno(atletaId, { fecha, horaDormir: previo.horaDormir, horaDespertar: horaAhora() });
}
export async function nocheEnCurso(atletaId) {
  const hoy = hoyISO();
  return (await BD.porAtleta('sleep_logs', atletaId)).find(s => s.pendiente && (s.fecha === hoy || s.fecha === sumarDias(hoy, 1))) || null;
}
// Sugerencia para el chequeo: lo registrado en "Mi sueño" de anoche
export async function suenoSugerido(atletaId, fecha = hoyISO()) {
  const s = (await BD.porAtleta('sleep_logs', atletaId)).find(x => x.fecha === fecha);
  if (!s) return null;
  return { horas: s.duracionMin ? Math.round((s.duracionMin / 60) * 10) / 10 : null, calidad: s.calidad, horaDormir: s.horaDormir, horaDespertar: s.horaDespertar };
}

// =====================================================================
// 🧘 Recuperación
// =====================================================================
export async function recuperacionDelDia(atleta, fecha = hoyISO(), registroHoyExtra = null) {
  const [registros, suenos, sesiones, meta, logsAgua, cfgAgua, perfilNut] = await Promise.all([
    BD.porAtleta('registrosDiarios', atleta.id), BD.porAtleta('sleep_logs', atleta.id), BD.porAtleta('sesiones', atleta.id),
    metaSuenoDe(atleta), BD.porAtleta('hydration_logs', atleta.id), configAgua(atleta.id), uno('nutrition_profiles', atleta.id),
  ]);
  const ind = await indicacionesDe(atleta);
  const registroHoy = registroHoyExtra || registros.find(r => r.fecha === fecha) || null;
  const aguaAyer = await aguaDelDia(atleta, sumarDias(fecha, -1), { cfg: cfgAgua, logs: logsAgua, sesiones, perfilNut, ind });
  const aguaAyerPct = aguaAyer.logs.length ? Math.round((aguaAyer.consumido / aguaAyer.meta.ml) * 100) : null;
  return puntuacionRecuperacion({
    fecha, registroHoy, suenoAnoche: suenos.find(s => s.fecha === fecha && s.duracionMin) || null, metaSueno: meta, aguaAyerPct,
    sesiones: sesiones.filter(cerrada),
  });
}

// Chequeo diario "¿Cómo te sientes hoy?": se guarda en registrosDiarios (lo lee el motor de entrenamiento)
// con la puntuación de recuperación, y queda en recovery_logs. Si trae horas de sueño, también en "Mi sueño".
export async function guardarChequeo(atleta, fecha, datos) {
  const { horaDormir, horaDespertar, ...resto } = datos;
  if (horaDormir && horaDespertar) await registrarSueno(atleta.id, { fecha, horaDormir, horaDespertar, calidad: resto.calidadSueno });
  const previo = (await BD.porAtleta('registrosDiarios', atleta.id)).find(r => r.fecha === fecha);
  const registro = { ...(previo || {}), atletaId: atleta.id, fecha, ...resto };
  const rec = await recuperacionDelDia(atleta, fecha, registro);
  registro.recuperacion = rec.puntuacion;
  await BD.guardar('registrosDiarios', registro);
  const logPrevio = (await BD.porAtleta('recovery_logs', atleta.id)).find(r => r.fecha === fecha);
  await BD.guardar('recovery_logs', { ...(logPrevio || {}), atletaId: atleta.id, fecha, puntuacion: rec.puntuacion, nivel: rec.nivel, componentes: rec.componentes });
  return { registro, recuperacion: rec };
}

// =====================================================================
// 💊 Suplementos y vitaminas
// =====================================================================
export async function suplementos(atletaId) {
  const [lista, recs] = await Promise.all([BD.porAtleta('supplements', atletaId), BD.porAtleta('supplement_reminders', atletaId)]);
  return lista.map(s => {
    const r = recs.find(x => x.supplementId === s.id);
    return { ...s, recordatorio: !!r?.activo, dias: r?.dias || [], recordatorioId: r?.id };
  });
}
export async function guardarSuplemento(atletaId, datos, { recordatorio, dias }) {
  const { recordatorioId, recordatorio: _r, dias: _d, tomado: _t, ...sup } = datos;
  const s = await BD.guardar('supplements', { ...sup, atletaId });
  await BD.guardar('supplement_reminders', { ...(recordatorioId ? { id: recordatorioId } : {}), atletaId, supplementId: s.id, hora: s.hora, dias: dias || [], activo: !!recordatorio });
  return s;
}
export async function borrarSuplemento(atletaId, id) {
  const recs = (await BD.porAtleta('supplement_reminders', atletaId)).filter(r => r.supplementId === id);
  await BD.borrarVarios('supplement_reminders', recs.map(r => r.id));
  await BD.borrar('supplements', id);
}
// "Ya la tomé": registro de cada toma (fecha y hora)
export const tomasDe = atletaId => BD.porAtleta('supplement_logs', atletaId);
export async function marcarToma(atletaId, supplementId, fecha = hoyISO()) {
  const previa = (await tomasDe(atletaId)).find(t => t.supplementId === supplementId && t.fecha === fecha);
  if (previa) return BD.borrar('supplement_logs', previa.id);   // segundo toque: desmarcar
  return BD.guardar('supplement_logs', { atletaId, supplementId, fecha, hora: horaAhora() });
}

// =====================================================================
// 🔔 Recordatorios
// =====================================================================
export async function configRecordatorios(atletaId) {
  const g = await BD.obtener('ajustes', `recordatorios:${atletaId}`);
  const base = JSON.parse(JSON.stringify(RECORDATORIOS_DEFECTO));
  for (const k of Object.keys(base)) base[k] = { ...base[k], ...(g?.config?.[k] || {}) };
  return { id: `recordatorios:${atletaId}`, config: base, enviados: g?.enviados || {} };
}
export const guardarConfigRecordatorios = r => BD.guardar('ajustes', r);

export async function estadoRecordatorios(atleta, fecha = hoyISO()) {
  const [rec, agua, sueno, sups, sesiones, comidas, perfilNut, noches] = await Promise.all([
    configRecordatorios(atleta.id), aguaDelDia(atleta, fecha), metaSuenoDe(atleta), suplementos(atleta.id),
    BD.porAtleta('sesiones', atleta.id), comidasEntre(atleta.id, fecha, fecha), uno('nutrition_profiles', atleta.id),
    BD.porAtleta('sleep_logs', atleta.id),
  ]);
  const sesionHoy = sesiones.find(s => s.fecha === fecha);
  const ultimo = agua.logs[agua.logs.length - 1];
  const entrenoHoy = esDiaEntreno(perfilNut, fecha) || (!!sesionHoy && sesionHoy.workout?.tipo !== 'recuperacion');
  return {
    rec, fecha, config: rec.config, enviados: rec.enviados,
    aguaMl: agua.consumido, metaAgua: agua.meta.ml, ultimoAgua: ultimo ? aMinutos(ultimo.hora) : null,
    entrenoHoy, sesionHecha: !!sesionHoy && cerrada(sesionHoy), horaEntreno: perfilNut?.horaEntreno || null,
    comidas: comidas.filter(c => c.tipo !== 'extra'), sueno, suplementos: sups,
    diaRecuperacion: sesionHoy?.workout?.tipo === 'recuperacion' || (!!perfilNut && !esDiaEntreno(perfilNut, fecha)),
    // Para los avisos con la app cerrada (motor/agenda.js)
    sesionEmpezada: !!sesionHoy && (sesionHoy.estado === 'en_curso' || cerrada(sesionHoy)),
    aguaMaximo: !!agua.meta.maximo, aguaLogs: agua.logs.map(l => ({ min: aMinutos(l.hora), ml: l.ml })),
    nocheMarcada: noches.some(n => n.fecha === sumarDias(fecha, 1) && n.horaDormir),   // la noche que empieza este día
  };
}

export async function marcarEnviados(rec, claves) {
  const limite = sumarDias(hoyISO(), -2);
  const enviados = Object.fromEntries(Object.entries(rec.enviados || {}).filter(([k]) => (k.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '9999') >= limite));
  claves.forEach(k => { enviados[k] = true; });
  rec.enviados = enviados;
  await BD.guardar('ajustes', { id: rec.id, config: rec.config, enviados });
}

// =====================================================================
// 📋 Seguimiento del día y de varios días (frutas, café, azúcar, vitaminas, rachas)
// =====================================================================
export async function seguimientoDelDia(atleta, fecha = hoyISO(), medico = {}) {
  const [comidas, sups, tomas, sueno] = await Promise.all([
    comidasEntre(atleta.id, sumarDias(fecha, -1), fecha), suplementos(atleta.id), tomasDe(atleta.id), metaSuenoDe(atleta),
  ]);
  const delDia = comidas.filter(c => c.fecha === fecha);
  return {
    contadores: contadoresDia({ comidas: delDia, suplementos: sups, tomas: tomas.filter(t => t.fecha === fecha), horaDormir: sueno.horaDormir, medico }),
    sinComer: fecha === hoyISO() ? ultimaIngesta(comidas) : null,
  };
}

// Días anteriores para rachas y logros: { fecha: { anotado, completo, aguaOk, frutasOk, cafeOk, sinRefresco } }
export async function historialSeguimiento(atleta, hasta = hoyISO(), n = 30, medico = {}) {
  const desde = sumarDias(hasta, -(n - 1));
  const [comidas, logs, cfg, sesiones, perfilNut, sups, tomas] = await Promise.all([
    comidasEntre(atleta.id, desde, hasta), BD.porAtleta('hydration_logs', atleta.id), configAgua(atleta.id),
    BD.porAtleta('sesiones', atleta.id), uno('nutrition_profiles', atleta.id), suplementos(atleta.id), tomasDe(atleta.id),
  ]);
  const ind = await indicacionesDe(atleta);
  const dias = {}, detalle = {};
  for (let i = 0; i < n; i++) {
    const f = sumarDias(desde, i);
    const delDia = comidas.filter(c => c.fecha === f);
    const plan = delDia.filter(c => c.tipo !== 'extra');
    const anotado = delDia.some(c => c.tipo === 'extra' || c.estado !== 'planificada');
    const ct = contadoresDia({ comidas: delDia, suplementos: sups, tomas: tomas.filter(t => t.fecha === f), medico });
    const agua = await aguaDelDia(atleta, f, { cfg, logs, sesiones, perfilNut, ind });
    dias[f] = {
      anotado, completo: plan.length > 0 && plan.every(c => c.estado !== 'planificada'),
      aguaOk: agua.consumido >= agua.meta.ml * 0.9, frutasOk: ct.frutas.porciones >= ct.frutas.meta.min,
      cafeOk: anotado && !ct.cafe.pasado, sinRefresco: anotado && ct.refrescos === 0,
    };
    detalle[f] = { ct, agua };
  }
  return { dias, detalle, logros: logros(dias, hasta) };
}

// =====================================================================
// 📊 Resúmenes
// =====================================================================
export async function resumenDelDia(atleta, fecha = hoyISO()) {
  const [nut, agua, sueno, sesiones, rec, compras, listas, suenos, seg] = await Promise.all([
    datosNutricion(atleta), aguaDelDia(atleta, fecha), metaSuenoDe(atleta), BD.porAtleta('sesiones', atleta.id),
    recuperacionDelDia(atleta, fecha), BD.porAtleta('shopping_list_items', atleta.id), BD.porAtleta('shopping_lists', atleta.id),
    BD.porAtleta('sleep_logs', atleta.id), seguimientoDelDia(atleta, fecha),
  ]);
  const comidas = (await comidasEntre(atleta.id, fecha, fecha)).filter(c => c.tipo !== 'extra');
  const sesionHoy = sesiones.filter(s => s.fecha === fecha).sort((a, b) => (cerrada(b) ? 1 : 0) - (cerrada(a) ? 1 : 0))[0] || null;
  const listaSemana = listas.find(l => l.semanaInicio === lunesDe(fecha));
  return {
    fecha, configurado: !!nut.perfil, sesionHoy, diaEntreno: esDiaEntreno(nut.perfil, fecha),
    comidas: { total: comidas.length, registradas: comidas.filter(c => c.estado !== 'planificada').length, lista: comidas },
    sinComer: seg.sinComer, contadores: seg.contadores,
    agua: { consumido: agua.consumido, meta: agua.meta.ml },
    sueno: { meta: sueno, anoche: suenos.find(s => s.fecha === fecha && s.duracionMin) || null },
    recuperacion: rec,
    compras: { pendientes: listaSemana ? compras.filter(i => i.listaId === listaSemana.id && !i.comprado).length : null },
    pasos: await pasosDelDia(atleta, fecha),
  };
}

export async function resumenDeLaSemana(atleta, fecha = hoyISO()) {
  const desde = sumarDias(fecha, -6);
  const [sesiones, suenos, mediciones, hist] = await Promise.all([
    BD.porAtleta('sesiones', atleta.id), BD.porAtleta('sleep_logs', atleta.id), BD.porAtleta('mediciones', atleta.id), historialSeguimiento(atleta, fecha, 7),
  ]);
  const comidas = await comidasEntre(atleta.id, desde, fecha);
  const aguaPorDia = {}, metaAguaPorDia = {};
  for (const [f, x] of Object.entries(hist.detalle)) { aguaPorDia[f] = x.agua.consumido; metaAguaPorDia[f] = x.agua.meta.ml; }
  const base = resumenSemana({ fecha, atleta, sesiones, aguaPorDia, metaAguaPorDia, comidas, suenos, mediciones });
  const dets = Object.values(hist.detalle);
  const prom = f => Math.round((dets.reduce((a, x) => a + f(x), 0) / dets.length) * 10) / 10;
  return {
    ...base,
    frutas: { promedio: prom(x => x.ct.frutas.porciones), dias: Object.values(hist.dias).filter(d => d.frutasOk).length },
    cafe: { tazas: prom(x => x.ct.cafe.tazas), cafeina: Math.round(prom(x => x.ct.cafe.cafeina)) },
    azucar: { cucharaditas: prom(x => x.ct.azucar.cucharaditas) },
    suplementos: { tomados: dets.reduce((a, x) => a + x.ct.suplementos.tomados, 0), posibles: dets.reduce((a, x) => a + x.ct.suplementos.total, 0) },
  };
}

export { necesitaPausasAgua, alimentoPorId };

// =====================================================================
// Pasos: los que cuenta la app (con la pantalla abierta) y el total que la persona copia de su teléfono
// =====================================================================
const registroPasos = async (atletaId, fecha) => (await BD.porAtleta('steps', atletaId)).find(r => r.fecha === fecha) || null;

export async function pasosDelDia(atleta, fecha = hoyISO()) {
  const todos = (await BD.porAtleta('steps', atleta.id)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const r = todos.find(x => x.fecha === fecha) || null;
  const pasos = totalPasos(r);
  const previos = todos.filter(x => x.fecha < fecha && x.fecha >= sumarDias(fecha, -7));
  return {
    fecha, pasos, app: r?.app || 0, manual: r?.manual ?? null,
    meta: metaPasos(atleta, previos), kcal: kcalPasos(pasos, atleta.personal?.peso, atleta.personal?.estatura), km: kmPasos(pasos, atleta.personal?.estatura), minutos: minutosPasos(pasos),
    semana: Array.from({ length: 7 }, (_, i) => { const f = sumarDias(fecha, i - 6); return { fecha: f, pasos: totalPasos(todos.find(x => x.fecha === f)) }; }),
    sugerida: actividadPorPasos(todos.filter(x => x.fecha <= fecha && x.fecha > sumarDias(fecha, -14))),
  };
}

// Suma pasos contados por la app (se llama cada pocos pasos mientras cuenta)
let colaPasos = Promise.resolve();
export function sumarPasosApp(atletaId, n, fecha = hoyISO()) {
  colaPasos = colaPasos.then(async () => {
    const r = (await registroPasos(atletaId, fecha)) || { atletaId, fecha, app: 0, manual: null };
    r.app = (r.app || 0) + n;
    return BD.guardar('steps', r);
  }).catch(() => {});
  return colaPasos;
}

// Total de hoy copiado del teléfono (Salud, Google Fit, el reloj…)
export function anotarPasos(atletaId, total, fecha = hoyISO()) {
  colaPasos = colaPasos.then(async () => {
    const r = (await registroPasos(atletaId, fecha)) || { atletaId, fecha, app: 0, manual: null };
    r.manual = total;
    return BD.guardar('steps', r);
  }).catch(() => {});
  return colaPasos;
}

// Al llegar a la meta, el día cuenta como día activo en el reto
export async function marcarRetoPorPasos(atletaId, fecha = hoyISO()) {
  for (const r of (await BD.porAtleta('retos', atletaId)).filter(x => !x.completado)) {
    const dia = r.dias.find(d => d.fecha === fecha);
    if (dia && !dia.hecho.actividad) { dia.hecho.actividad = true; await BD.guardar('retos', r); }
  }
}
