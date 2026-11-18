// Prescripción: cuántas series, repeticiones, tiempo y descanso, y cómo progresan.
// Regla de oro: cambiar UNA variable cada vez (repeticiones → series → variante).

import { ejercicioPorId, familia } from '../datos/ejercicios.js';
import { orientacion } from './estrategia.js';

// Qué tipo de adaptación busca la fuerza según el objetivo
export function objetivoFuerza(atleta) {
  const p = atleta.objetivos?.principal;
  if (p === 'ganar_fuerza') return 'fuerza';
  const o = orientacion(atleta);
  if (o === 'cardio') return 'resistencia';
  return 'hipertrofia';   // ganar músculo, tonificar, recomposición: el rango que más músculo construye
}

const RANGOS = {
  fuerza: { cargado: [5, 8], corporal: [6, 10], descanso: 120 },
  hipertrofia: { cargado: [8, 12], corporal: [8, 15], descanso: 75 },
  resistencia: { cargado: [12, 20], corporal: [12, 20], descanso: 45 },
};
const SEGUNDOS_POR_FASE = { 1: [20, 40], 2: [30, 50], 3: [40, 60], 4: [45, 75], 5: [60, 90] };
const SERIES_POR_FASE = { 1: 2, 2: 3, 3: 3, 4: 3, 5: 4 };
const RPE_POR_FASE = { 1: '5–6', 2: '6–7', 3: '7–8', 4: '7–8', 5: '8–9' };

export function rangoPara(ej, atleta, fase) {
  if (ej.dosis === 'tiempo') return { tipo: 'segundos', min: SEGUNDOS_POR_FASE[fase][0], max: SEGUNDOS_POR_FASE[fase][1], paso: 5 };
  const obj = objetivoFuerza(atleta);
  const cargado = /mancuernas|barra(?!_)|kettlebell|maquinas/.test(ej.equipo);   // las bandas cuentan como peso corporal
  let [min, max] = RANGOS[obj][cargado ? 'cargado' : 'corporal'];
  if (fase === 1) [min, max] = obj === 'resistencia' ? [10, 15] : [8, 12];   // aprender técnica: cargas moderadas
  if (ej.patron === 'aislamiento') [min, max] = [Math.max(min, 10), Math.max(max, 15)];
  return { tipo: 'reps', min, max, paso: 2 };
}

export const seriesBase = fase => SERIES_POR_FASE[fase] || 3;
export const seriesMaximas = fase => seriesBase(fase) + 1;

export function descansoPara(ej, atleta, fase) {
  const obj = objetivoFuerza(atleta);
  let d = RANGOS[obj].descanso;
  if (ej.patron === 'aislamiento' || ej.patron === 'core') d = Math.min(d, 60);
  if (fase === 1) d = Math.max(d, 60);
  return d;
}

// Estado inicial de una familia: en qué ejercicio empieza y con qué volumen
export function estadoInicial(ejercicioId, atleta, fase) {
  const ej = ejercicioPorId[ejercicioId];
  const r = rangoPara(ej, atleta, fase);
  return { ejercicioId, pasoActual: ej.paso, series: seriesBase(fase), valor: r.min, tempo: 'normal', historial: [], ascensos: 0, ascensosFase: 0, desde: new Date().toISOString() };
}

// Aplica la decisión de adaptación (de adaptacion.decidirAjuste) a un estado de progresión.
// permitido(ej) indica si un ejercicio de la familia está disponible para este atleta.
export function aplicarAjuste(estado, accion, atleta, fase, permitido = () => true, { dominado = true } = {}) {
  const ej = ejercicioPorId[estado.ejercicioId];
  const r = rangoPara(ej, atleta, fase);
  const sMax = seriesMaximas(fase), sBase = seriesBase(fase);
  const cadena = familia(ej.familia);
  const idx = cadena.findIndex(x => x.id === ej.id);
  const sig = cadena.slice(idx + 1).find(x => x.paso > ej.paso && permitido(x));
  const ant = [...cadena.slice(0, idx)].reverse().find(x => x.paso < ej.paso && permitido(x));
  const n = { ...estado };
  const unidad = r.tipo === 'segundos' ? 's' : ' repeticiones';
  const pasoValor = accion === 'progresion_pequena' ? (r.tipo === 'segundos' ? 5 : 1) : r.paso * (r.tipo === 'segundos' ? 2 : 1);

  if (accion === 'progresar' || accion === 'progresion_pequena') {
    if (n.valor + pasoValor <= r.max) {
      n.valor += pasoValor;
      return { estado: n, cambio: 'repeticiones', mensaje: `${ej.nombre}: subimos a ${n.valor}${unidad}.` };
    }
    if (n.series < sMax) {
      n.series += 1; n.valor = Math.round((r.min + r.max) / 2);
      return { estado: n, cambio: 'series', mensaje: `${ej.nombre}: añadimos una serie (${n.series} × ${n.valor}${r.tipo === 'segundos' ? ' s' : ''}).` };
    }
    if (sig && !dominado) {
      return { estado: n, cambio: null, mensaje: `${ej.nombre}: consolidamos unas sesiones más antes de pasar a ${sig.nombre}.` };
    }
    if (sig) {
      const rs = rangoPara(sig, atleta, fase);
      Object.assign(n, { ejercicioId: sig.id, pasoActual: sig.paso, series: sBase, valor: rs.min, tempo: 'normal', historial: [],
        ascensos: (n.ascensos || 0) + 1, ascensosFase: (n.ascensosFase || 0) + 1, desde: new Date().toISOString() });
      return { estado: n, cambio: 'variante', mensaje: `Has dominado ${ej.nombre}. Siguiente paso: ${sig.nombre}.` };
    }
    if (n.tempo !== 'lento') {
      n.tempo = 'lento';
      return { estado: n, cambio: 'tiempo bajo tensión', mensaje: `${ej.nombre}: bajada lenta de 3 segundos para seguir progresando.` };
    }
    if (n.avisoMaximo) return { estado: n, cambio: null, mensaje: '' };
    n.avisoMaximo = true;
    return { estado: n, cambio: null, mensaje: `${ej.nombre}: estás en el máximo de esta fase; la siguiente fase traerá nuevas variantes.` };
  }
  if (accion === 'reducir') {
    if (n.series > Math.max(1, sBase - 1)) { n.series -= 1; return { estado: n, cambio: 'series', mensaje: `${ej.nombre}: una serie menos para recuperar.` }; }
    if (n.valor - r.paso >= r.min) { n.valor -= r.paso; return { estado: n, cambio: 'repeticiones', mensaje: `${ej.nombre}: bajamos a ${n.valor}${unidad}.` }; }
    if (ant) {
      const ra = rangoPara(ant, atleta, fase);
      Object.assign(n, { ejercicioId: ant.id, pasoActual: ant.paso, series: sBase, valor: Math.round((ra.min + ra.max) / 2), tempo: 'normal', historial: [] });
      return { estado: n, cambio: 'variante', mensaje: `${ej.nombre} fue demasiado exigente: volvemos a ${ant.nombre} para consolidar.` };
    }
    return { estado: n, cambio: null, mensaje: `${ej.nombre}: mantenemos la versión más sencilla con más descanso.` };
  }
  return { estado: n, cambio: null, mensaje: '' };   // mantener / detener_progresion
}

// Prescripción final de un ejercicio en la sesión de hoy
export function prescribir(ejercicioId, estado, atleta, { fase, descarga = false, fatiga = false }) {
  const ej = ejercicioPorId[ejercicioId];
  const r = rangoPara(ej, atleta, fase);
  let series = estado?.ejercicioId === ejercicioId ? estado.series : seriesBase(fase);
  let valor = estado?.ejercicioId === ejercicioId ? estado.valor : r.min;
  const notas = [];
  if (descarga) { series = Math.max(1, series - 1); notas.push('Semana de descarga: una serie menos.'); }
  if (fatiga) { series = Math.max(1, series - 1); notas.push('Volumen reducido por fatiga.'); }
  const tempo = estado?.ejercicioId === ejercicioId && estado.tempo === 'lento' ? 'Bajada lenta (3 s)' : '';
  const descanso = descansoPara(ej, atleta, fase);
  const rpe = descarga || fatiga ? '5–6' : RPE_POR_FASE[fase];
  return {
    ejercicioId, series,
    reps: r.tipo === 'reps' ? valor : null,
    segundos: r.tipo === 'segundos' ? valor : null,
    porLado: ej.unilateral,
    descanso, rpe, tempo, notas,
    texto: `${series} × ${r.tipo === 'reps' ? valor : valor + ' s'}${ej.unilateral ? ' por lado' : ''}`,
  };
}

// Duración estimada (segundos) de un ejercicio por series
export function duracionSeries(p) {
  const trabajo = p.segundos ?? p.reps * 3.5;
  const lados = p.porLado ? 2 : 1;
  return p.series * (trabajo * lados + 10) + (p.series - 1) * p.descanso + 30;   // +30 s de preparación/cambio
}
