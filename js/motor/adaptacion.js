// Inteligencia de adaptación. En esta fase solo existe la lógica; las pantallas de
// entrenamiento y de "¿Cómo te fue?" se conectarán aquí en las siguientes fases.

import { GRUPOS_MUSCULARES } from '../datos/catalogos.js';

export const SENSACIONES = [
  { id: 'muy_facil', etiqueta: 'Muy fácil' },
  { id: 'facil', etiqueta: 'Fácil' },
  { id: 'adecuado', etiqueta: 'Adecuado' },
  { id: 'dificil', etiqueta: 'Difícil' },
  { id: 'muy_dificil', etiqueta: 'Muy difícil' },
];

// Retroalimentación de una sesión:
// { sensacion, seriesCompletas, repsCompletas, problemas, energia (1-10), esfuerzo (1-10), dolor }
// Devuelve qué hacer en la próxima sesión y por qué.
export function decidirAjuste(fb) {
  if (fb.dolor) {
    return { accion: 'detener_progresion', mensaje: 'Reportaste dolor: no subimos la dificultad. Revisa los avisos de seguridad y, si el dolor persiste, consulta a un profesional.' };
  }
  if (!fb.seriesCompletas || !fb.repsCompletas) {
    if (['dificil', 'muy_dificil'].includes(fb.sensacion) || fb.esfuerzo >= 9) {
      return { accion: 'reducir', mensaje: 'No completaste todo y fue muy exigente: bajamos volumen o dificultad y damos más descanso.' };
    }
    return { accion: 'mantener', mensaje: 'No completaste todo: repetimos la misma carga y analizamos la técnica antes de cambiar nada.' };
  }
  if (fb.problemas) return { accion: 'mantener', mensaje: 'Hubo dificultades con algún ejercicio: mantenemos y revisamos la técnica.' };
  switch (fb.sensacion) {
    case 'muy_facil':
    case 'facil':
      return { accion: 'progresar', mensaje: 'Completaste todo con margen: progresión moderada (una sola variable).' };
    case 'adecuado':
      return fb.esfuerzo <= 6 && fb.energia >= 6
        ? { accion: 'progresion_pequena', mensaje: 'Sesión adecuada y con energía: progresión pequeña.' }
        : { accion: 'mantener', mensaje: 'Sesión adecuada: mantenemos para consolidar.' };
    case 'dificil':
      return { accion: 'mantener', mensaje: 'Fue difícil pero lo completaste: mantenemos hasta que resulte adecuado.' };
    default:
      return { accion: 'reducir', mensaje: 'Fue muy difícil: reducimos volumen o dificultad y aumentamos la recuperación.' };
  }
}

// "No adaptación": detecta cuando un ejercicio ya está dominado.
// historial: últimas sesiones de ESE ejercicio con su retroalimentación, de la más antigua a la más reciente.
export function detectarDominio(historial, sesionesNecesarias = 3) {
  const ult = historial.slice(-sesionesNecesarias);
  if (ult.length < sesionesNecesarias) return { dominado: false };
  const ok = ult.every(s =>
    s.seriesCompletas && s.repsCompletas && !s.problemas && !s.dolor &&
    s.esfuerzo >= 4 && s.esfuerzo <= 7 && (s.energia ?? 7) >= 6 &&
    ['muy_facil', 'facil', 'adecuado'].includes(s.sensacion));
  return ok
    ? { dominado: true, mensaje: 'Has dominado esta progresión. Vamos a aumentar ligeramente el desafío.' }
    : { dominado: false };
}

// Cambia UNA sola variable cada vez, en este orden de prioridad.
// estado: { reps, series, tempo (seg de bajada), paso (índice en la cadena de progresión) }
// limites del paso actual: { repsMax, seriesMax, tempoMax }
export function siguienteVariable(estado, limites) {
  if (estado.reps < limites.repsMax) return { ...estado, reps: estado.reps + 1, cambio: 'repeticiones' };
  if (estado.series < limites.seriesMax) return { ...estado, series: estado.series + 1, reps: limites.repsMin ?? estado.reps, cambio: 'series' };
  if ((estado.tempo ?? 2) < (limites.tempoMax ?? 4)) return { ...estado, tempo: (estado.tempo ?? 2) + 1, cambio: 'tiempo bajo tensión' };
  return { ...estado, paso: estado.paso + 1, reps: limites.repsMin ?? 8, series: limites.seriesMin ?? 2, tempo: 2, cambio: 'variante' };
}

// Descanso inteligente. registros: [{ fecha, suenoHoras, fatiga 1-10, dolorMuscular 1-10, energia 1-10,
//   calidadSueno 1-10, recuperacion 0-100 (FASE 4) }]
// sesiones: [{ fecha, esfuerzo 1-10 }] de los últimos días
export function estadoRecuperacion(registros = [], sesiones = []) {
  const r = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-3);
  const s = [...sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-3);
  const senales = [];
  if (r.filter(x => x.suenoHoras != null && x.suenoHoras < 6).length >= 2) senales.push('Poco sueño varios días');
  const hoy = r[r.length - 1];
  if (hoy?.fatiga >= 7) senales.push('Fatiga alta');
  if (hoy?.dolorMuscular >= 7) senales.push('Dolor muscular alto');
  if (hoy?.energia != null && hoy.energia <= 3) senales.push('Energía muy baja');
  // FASE 4: calidad del sueño y puntuación de recuperación (sueño, agua, carga, descanso)
  if (hoy?.calidadSueno != null && hoy.calidadSueno <= 3) senales.push('Sueño de mala calidad');
  if (hoy?.recuperacion != null && hoy.recuperacion < 45) senales.push('Recuperación baja');
  if (s.length === 3 && s.every(x => x.esfuerzo >= 8)) senales.push('Tres sesiones seguidas muy exigentes');

  if (senales.length >= 2) return { estado: 'recuperacion', senales, mensaje: 'Hoy vamos a priorizar recuperación.' };
  if (senales.length === 1) return { estado: 'precaucion', senales, mensaje: 'Entrenamiento con intensidad moderada hoy.' };
  return { estado: 'normal', senales, mensaje: '' };
}

// Equilibrio semanal por grupo muscular.
// sesiones: [{ ejercicios: [{ grupos: ['pecho', 'triceps'], series: 3 }], capacidades: ['cardio'] }]
export function balanceSemanal(sesiones = []) {
  const volumen = Object.fromEntries(GRUPOS_MUSCULARES.map(g => [g, 0]));
  const capacidades = { movilidad: 0, cardio: 0, equilibrio: 0 };
  for (const s of sesiones) {
    for (const e of s.ejercicios || []) for (const g of e.grupos || []) if (g in volumen) volumen[g] += e.series || 0;
    for (const c of s.capacidades || []) if (c in capacidades) capacidades[c]++;
  }
  const alertas = [];
  for (const [g, v] of Object.entries(volumen)) if (v === 0) alertas.push(`Sin trabajo esta semana: ${g}`);
  const empuje = volumen.pecho + volumen.hombros, traccion = volumen.espalda;
  if (empuje > 0 && traccion < empuje * 0.7) alertas.push('Más empuje que tracción: añadir trabajo de espalda');
  const anterior = volumen.cuadriceps, posterior = volumen.isquiotibiales + volumen.gluteos;
  if (anterior > 0 && posterior < anterior * 0.7) alertas.push('Más cuádriceps que cadena posterior: añadir glúteos e isquiotibiales');
  for (const [c, v] of Object.entries(capacidades)) if (v === 0) alertas.push(`Sin trabajo de ${c} esta semana`);
  return { volumen, capacidades, alertas };
}
