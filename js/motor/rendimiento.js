// FASE 5: progreso multidimensional. El progreso no se mide solo con la báscula:
// fuerza (peso y repeticiones), cuerpo (peso, cintura y tendencia), cardio (minutos y sesiones),
// calistenia (variantes y repeticiones), boxeo (rondas, minutos y combinaciones) y movilidad.

import { ejercicioPorId, familia } from '../datos/ejercicios.js';
import { evolucionPeso } from './calculos.js';
import { lunesDe } from './semana.js';
import { fmtPeso, fmtCambioPeso } from './unidades.js';

const cerrada = s => ['completada', 'incompleta'].includes(s.estado);
const gruposDe = s => Object.values(s.ejecucion?.grupos || {});
const red1 = v => Math.round(v * 10) / 10;
const CADENAS_CALISTENIA = ['flexion', 'dominada', 'remo_invertido', 'fondos', 'plancha', 'sentadilla'];

// Mejor serie de un ejercicio en una sesión (más peso; a igual peso, más repeticiones o más tiempo)
const valor = x => (x.peso || 0) * 1000 + (x.reps || 0) + (x.segundos || 0) / 10;
const mejorSerie = series => series.reduce((m, x) => valor(x) > valor(m) ? x : m);

function cambio(ini, act, atleta) {
  const partes = [];
  if (act.peso && ini.peso && act.peso !== ini.peso) partes.push(fmtCambioPeso(act.peso - ini.peso, atleta));
  if (act.reps != null && ini.reps != null && act.reps !== ini.reps) partes.push(`${act.reps > ini.reps ? '+' : ''}${act.reps - ini.reps} repeticiones`);
  if (act.segundos != null && ini.segundos != null && act.segundos !== ini.segundos) partes.push(`${act.segundos > ini.segundos ? '+' : ''}${act.segundos - ini.segundos} s`);
  const sube = valor(act) > valor(ini), baja = valor(act) < valor(ini);
  return { texto: partes.join(' · ') || 'igual', tendencia: sube ? 'mejora' : baja ? 'baja' : 'igual' };
}

const marcaTexto = (m, atleta) => [m.peso ? fmtPeso(m.peso, atleta) : '', m.reps != null ? `${m.reps} repeticiones` : '', m.segundos != null ? `${m.segundos} s` : ''].filter(Boolean).join(' × ') || '—';

export function resumenRendimiento(atleta, sesiones = [], mediciones = [], { desde = null, hasta = null } = {}) {
  const hechas = sesiones.filter(s => cerrada(s) && (!desde || s.fecha >= desde) && (!hasta || s.fecha <= hasta)).sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Fuerza y calistenia: primera y última marca de cada ejercicio
  const marcas = {};
  for (const s of hechas) {
    if (s.ejecucion) {
      for (const g of gruposDe(s)) {
        if (g.formato !== 'series' || !['fuerza', 'calistenia', 'core'].includes(g.tipoBloque)) continue;
        const series = (g.series || []).filter(x => x.reps != null || x.segundos != null);
        if (series.length) { const m = mejorSerie(series); (marcas[g.ejercicioId] ||= []).push({ fecha: s.fecha, peso: m.peso || null, reps: m.reps ?? null, segundos: m.segundos ?? null }); }
      }
    } else {
      // Sesiones registradas sin el modo guiado
      for (const [id, r] of Object.entries(s.resultado?.ejercicios || {})) {
        const reps = Math.max(0, ...(r.repsHechas || []).filter(Number.isFinite));
        if (reps || r.peso) (marcas[id] ||= []).push({ fecha: s.fecha, peso: r.peso || null, reps: reps || null, segundos: null });
      }
    }
  }
  const fuerza = [], calistenia = [];
  for (const [id, lista] of Object.entries(marcas)) {
    const e = ejercicioPorId[id];
    if (!e) continue;
    const ini = lista[0], act = lista[lista.length - 1];
    const item = { id, nombre: e.nombre, inicio: marcaTexto(ini, atleta), actual: marcaTexto(act, atleta), sesiones: lista.length, cambio: cambio(ini, act, atleta) };
    (e.categorias.includes('calistenia') && !e.equipo ? calistenia : fuerza).push(item);
  }
  // Calistenia: en qué variante de cada cadena de progresión estás
  const cadenas = CADENAS_CALISTENIA.map(f => {
    const est = atleta.progresion?.[f];
    const e = est && ejercicioPorId[est.ejercicioId];
    if (!e) return null;
    return { familia: f, id: e.id, ejercicio: e.nombre, paso: e.paso, de: familia(f).length };
  }).filter(Boolean);

  // Cardio: minutos reales (modo guiado) o planificados (registro manual) por semana
  const porSemana = {};
  let cardioMin = 0, cardioSesiones = 0;
  for (const s of hechas) {
    let m = 0;
    if (s.ejecucion) for (const g of gruposDe(s)) { if (g.tipoBloque === 'cardio') m += (g.series || []).reduce((a, x) => a + (x.segundos || 0), 0) / 60; }
    else m = (s.workout?.bloques || []).filter(b => b.tipo === 'cardio').reduce((a, b) => a + b.minutos, 0);
    if (m > 0) { cardioMin += m; cardioSesiones++; const k = lunesDe(s.fecha); porSemana[k] = (porSemana[k] || 0) + m; }
  }

  // Boxeo: rondas, minutos y combinaciones practicadas
  let rondas = 0, boxeoMin = 0;
  const combinaciones = new Set();
  for (const s of hechas) {
    for (const g of gruposDe(s)) if (g.formato === 'rondas') { rondas += (g.series || []).length; boxeoMin += (g.series || []).reduce((a, x) => a + (x.segundos || 0), 0) / 60; }
    if (gruposDe(s).some(g => g.formato === 'rondas') || (!s.ejecucion && s.workout?.bloques?.some(b => b.tipo === 'boxeo')))
      for (const b of s.workout?.bloques || []) for (const r of b.rondas || []) combinaciones.add(r.combinacion);
  }

  // Movilidad: sesiones con bloque de movilidad (los rangos articulares aún no se registran)
  const movilidad = hechas.filter(s => s.workout?.bloques?.some(b => b.tipo === 'movilidad')).length;

  // Cuerpo: peso y cintura
  const peso = evolucionPeso(mediciones);
  const conCintura = mediciones.filter(m => m.cintura).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cintura = conCintura.length ? { inicial: conCintura[0], actual: conCintura[conCintura.length - 1], cambio: red1(conCintura[conCintura.length - 1].cintura - conCintura[0].cintura) } : null;

  const semanas = Object.values(porSemana);
  return {
    sesiones: hechas.length,
    fuerza: fuerza.sort((a, b) => b.sesiones - a.sesiones),
    calistenia: { ejercicios: calistenia.sort((a, b) => b.sesiones - a.sesiones), cadenas },
    cardio: { minutos: Math.round(cardioMin), sesiones: cardioSesiones, mediaSemanal: semanas.length ? Math.round(semanas.reduce((a, b) => a + b, 0) / semanas.length) : 0 },
    boxeo: { rondas, minutos: Math.round(boxeoMin), combinaciones: [...combinaciones] },
    movilidad: { sesiones: movilidad, nota: 'Los rangos de movimiento todavía no se registran: se cuentan las sesiones de movilidad.' },
    cuerpo: { peso, cintura },
  };
}
