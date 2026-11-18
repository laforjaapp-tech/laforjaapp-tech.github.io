// FASE 4 — SUEÑO, DESCANSO Y RECUPERACIÓN
// ENTRENAMIENTO + ALIMENTACIÓN + HIDRATACIÓN + SUEÑO + DESCANSO = RECUPERACIÓN Y PROGRESO.
// La puntuación de recuperación es un indicador orientativo de la app, no una medición médica.
// No es una fórmula rígida: combina lo que haya disponible y lo explica.

import { sumarDias } from './calculos.js';
import { aMinutos } from './nutricion.js';

// ---------- Sueño ----------
export function duracionSueno(horaDormir, horaDespertar) {
  if (!horaDormir || !horaDespertar) return null;
  let d = aMinutos(horaDespertar) - aMinutos(horaDormir);
  if (d <= 0) d += 1440;
  return d;
}
export const textoDuracion = min => (min == null ? '—' : `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')} min` : ''}`);
export const objetivoSueno = edad => (edad >= 65 ? { min: 7, max: 8 } : { min: 7, max: 9 });

export function suenoPorDefecto(atleta) {
  return {
    horaDormir: '22:30', horaDespertar: '06:30',
    recordatorio: { activo: true, minutosAntes: 60, silencioso: false, dias: [0, 1, 2, 3, 4, 5, 6] },
    ...objetivoSueno(atleta.personal?.edad),
  };
}

// ---------- Puntuación orientativa de recuperación ----------
const lim = v => Math.max(0, Math.min(100, Math.round(v)));
const PESOS = { sueno: 0.30, sensaciones: 0.30, entrenamiento: 0.15, hidratacion: 0.10, descanso: 0.10, movilidad: 0.05 };

// datos: { fecha, registroHoy, suenoAnoche, metaSueno, aguaAyerPct, sesiones (cerradas), diasEntreno }
export function puntuacionRecuperacion({ fecha, registroHoy = null, suenoAnoche = null, metaSueno = { min: 7, max: 9 }, aguaAyerPct = null, sesiones = [] }) {
  const comp = [];
  // Sueño: duración y calidad (registro de sueño o, si no hay, lo respondido en el chequeo)
  const horas = suenoAnoche?.duracionMin != null ? suenoAnoche.duracionMin / 60 : registroHoy?.suenoHoras ?? null;
  const calidad = suenoAnoche?.calidad ?? registroHoy?.calidadSueno ?? null;
  if (horas != null || calidad != null) {
    const pDur = horas == null ? null : lim(((horas - 4) / (metaSueno.min - 4)) * 100);
    const pCal = calidad == null ? null : lim(((calidad - 1) / 9) * 100);
    const v = pDur != null && pCal != null ? pDur * 0.6 + pCal * 0.4 : pDur ?? pCal;
    comp.push({ id: 'sueno', nombre: 'Sueño', valor: lim(v), texto: [horas != null ? `${textoDuracion(Math.round(horas * 60))}` : null, calidad != null ? `calidad ${calidad}/10` : null].filter(Boolean).join(' · ') });
  } else comp.push({ id: 'sueno', nombre: 'Sueño', valor: null, texto: 'Sin registrar' });

  // Sensaciones: fatiga, energía y músculos (chequeo diario)
  if (registroHoy?.fatiga) {
    const f = ((10 - registroHoy.fatiga) / 9) * 100;
    const e = registroHoy.energia ? ((registroHoy.energia - 1) / 9) * 100 : f;
    const m = registroHoy.dolorMuscular ? ((10 - registroHoy.dolorMuscular) / 9) * 100 : f;
    comp.push({ id: 'sensaciones', nombre: 'Fatiga y músculos', valor: lim((f + e + m) / 3), texto: `fatiga ${registroHoy.fatiga}/10 · músculos ${registroHoy.dolorMuscular ?? '—'}/10 · energía ${registroHoy.energia ?? '—'}/10` });
  } else comp.push({ id: 'sensaciones', nombre: 'Fatiga y músculos', valor: null, texto: 'Responde "¿Cómo te sientes hoy?"' });

  // Carga de entrenamiento de los últimos 3 días
  const recientes = sesiones.filter(s => s.fecha < fecha && s.fecha >= sumarDias(fecha, -3));
  const carga = recientes.reduce((a, s) => {
    const dias = Math.round((new Date(fecha) - new Date(s.fecha)) / 864e5);
    const esf = s.resultado?.general?.esfuerzo ?? 6;
    const min = s.duracionSeg ? s.duracionSeg / 60 : s.workout?.duracion || 45;
    return a + esf * (min / 45) * ({ 1: 1, 2: 0.6, 3: 0.3 }[dias] || 0);
  }, 0);
  comp.push({ id: 'entrenamiento', nombre: 'Entrenamiento reciente', valor: lim(100 - carga * 4), texto: recientes.length ? `${recientes.length} ${recientes.length === 1 ? 'sesión' : 'sesiones'} en los últimos 3 días` : 'Sin sesiones en los últimos 3 días' });

  // Hidratación de ayer
  comp.push(aguaAyerPct == null ? { id: 'hidratacion', nombre: 'Hidratación (ayer)', valor: null, texto: 'Sin registros de agua' }
    : { id: 'hidratacion', nombre: 'Hidratación (ayer)', valor: lim(aguaAyerPct), texto: `${aguaAyerPct}% de tu meta` });

  // Descanso: días seguidos entrenando
  let seguidos = 0;
  for (let d = 1; d <= 7; d++) { if (sesiones.some(s => s.fecha === sumarDias(fecha, -d))) seguidos++; else break; }
  comp.push({ id: 'descanso', nombre: 'Descanso', valor: lim(100 - Math.max(0, seguidos - 1) * 22), texto: seguidos ? `${seguidos} ${seguidos === 1 ? 'día' : 'días'} seguidos entrenando` : 'Ayer descansaste' });

  // Movilidad en los últimos 2 días
  const mov = sesiones.some(s => s.fecha >= sumarDias(fecha, -2) && (s.resumen?.categorias?.movilidad > 0 || s.workout?.bloques?.some(b => ['enfriamiento', 'movilidad'].includes(b.tipo))));
  comp.push({ id: 'movilidad', nombre: 'Movilidad', valor: mov ? 100 : 60, texto: mov ? 'Hiciste movilidad estos días' : 'Unos minutos de movilidad ayudan' });

  const disponibles = comp.filter(c => c.valor != null);
  const suma = disponibles.reduce((a, c) => a + PESOS[c.id], 0);
  let puntuacion = suma ? lim(disponibles.reduce((a, c) => a + c.valor * PESOS[c.id], 0) / suma) : null;
  const dolor = registroHoy?.dolorArticular === 'si';
  if (dolor && puntuacion != null) puntuacion = Math.min(puntuacion, 50);
  const sinChequeo = !registroHoy;
  return { puntuacion, ...nivelRecuperacion(puntuacion, dolor), componentes: comp, dolor, parcial: sinChequeo };
}

export function nivelRecuperacion(p, dolor = false) {
  if (p == null) return { nivel: 'sin_datos', etiqueta: 'Sin datos', recomendacion: 'Registra tu sueño y responde cómo te sientes hoy para calcularla.' };
  if (dolor) return { nivel: 'baja', etiqueta: 'Con dolor', recomendacion: 'Reportaste dolor: hoy no se fuerza. Sesión suave o descanso; si el dolor persiste o aumenta, consulta a un profesional.' };
  if (p >= 80) return { nivel: 'buena', etiqueta: 'Buena', recomendacion: 'Buena recuperación: el motor puede seguir con la progresión planificada.' };
  if (p >= 65) return { nivel: 'aceptable', etiqueta: 'Aceptable', recomendacion: 'Recuperación aceptable: entrena con normalidad y escucha a tu cuerpo.' };
  if (p >= 45) return { nivel: 'moderada', etiqueta: 'Moderada', recomendacion: 'Recuperación moderada: conviene una sesión más ligera.' };
  return { nivel: 'baja', etiqueta: 'Baja', recomendacion: 'Recuperación baja: hoy prioriza el descanso o la recuperación activa.' };
}

// ---------- Día de entrenamiento o de descanso ----------
export const diaSemana = fecha => new Date(fecha + 'T12:00:00').getDay();
export const esDiaEntreno = (perfilNut, fecha) => (perfilNut?.diasEntreno || []).includes(diaSemana(fecha));

// ---------- Conexión entre módulos: consejos según lo que viene ----------
export function consejosDelDia({ fecha, perfilNut, sleepGoal, suenoAnoche, sesionHoy, sesionAyer, recuperacion }) {
  const c = [];
  const manana = sumarDias(fecha, 1);
  if (esDiaEntreno(perfilNut, manana)) c.push(`🏋️ Mañana sueles entrenar: intenta acostarte a tu hora (${sleepGoal?.horaDormir || '22:30'}) y no saltes la cena, con proteína y algo de carbohidrato.`);
  if (suenoAnoche?.duracionMin != null && suenoAnoche.duracionMin < (sleepGoal?.min || 7) * 60 - 60) c.push('🌙 Dormiste menos de lo habitual: el motor lo tiene en cuenta para la sesión de hoy. Si puedes, acuéstate un poco antes esta noche.');
  const esf = sesionAyer?.resultado?.general?.esfuerzo;
  if (esf >= 8) c.push('💪 Ayer entrenaste fuerte: hoy reparte bien la proteína en tus comidas y mantén el agua.');
  if (sesionHoy?.workout?.tipo === 'recuperacion' || recuperacion?.nivel === 'baja') c.push('🧘 Hoy la recuperación es parte de tu progreso.');
  if (['completada', 'incompleta'].includes(sesionHoy?.estado)) c.push('🍽️ Ya entrenaste hoy: tu próxima comida forma parte de tu recuperación.');
  return c;
}

// ---------- Resúmenes ----------
const promedio = l => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);

// datos de los últimos 7 días (hasta 'fecha' incluida)
export function resumenSemana({ fecha, atleta, sesiones = [], aguaPorDia = {}, metaAguaPorDia = {}, comidas = [], suenos = [], mediciones = [] }) {
  const desde = sumarDias(fecha, -6);
  const enRango = f => f >= desde && f <= fecha;
  const ses = sesiones.filter(s => enRango(s.fecha) && ['completada', 'incompleta'].includes(s.estado));
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));
  const pctAgua = dias.map(d => (metaAguaPorDia[d] ? Math.min(100, ((aguaPorDia[d] || 0) / metaAguaPorDia[d]) * 100) : 0));
  const com = comidas.filter(c => enRango(c.fecha) && c.tipo !== 'extra');
  const hechas = com.filter(c => ['completada', 'mitad', 'diferente'].includes(c.estado)).length;
  const sue = suenos.filter(s => enRango(s.fecha) && s.duracionMin);   // las noches sin despertar marcado no cuentan
  const med = [...mediciones].filter(m => m.peso).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pesoAct = med[med.length - 1];
  const pesoAnt = [...med].reverse().find(m => m.fecha <= desde) || med[0];
  const cint = med.filter(m => m.cintura);
  return {
    dias,
    entrenamientos: { hechos: ses.length, plan: atleta.disponibilidad?.dias || 3, minutos: Math.round(ses.reduce((a, s) => a + (s.duracionSeg ? s.duracionSeg / 60 : s.workout?.duracion || 0), 0)) },
    hidratacion: { pct: Math.round(promedio(pctAgua) || 0), porDia: dias.map((d, i) => ({ fecha: d, pct: Math.round(pctAgua[i]), ml: aguaPorDia[d] || 0 })) },
    comidas: { registradas: hechas, planificadas: com.length, pct: com.length ? Math.round((hechas / com.length) * 100) : 0 },
    sueno: { promedioMin: sue.length ? Math.round(promedio(sue.map(s => s.duracionMin))) : null, noches: sue.length, porDia: dias.map(d => ({ fecha: d, min: suenos.find(s => s.fecha === d)?.duracionMin || 0 })) },
    descanso: { dias: dias.filter(d => !ses.some(s => s.fecha === d)).length },
    peso: pesoAct ? { actual: pesoAct.peso, cambio: pesoAnt && pesoAnt !== pesoAct ? Math.round((pesoAct.peso - pesoAnt.peso) * 10) / 10 : null } : null,
    cintura: cint.length ? { actual: cint[cint.length - 1].cintura, cambio: cint.length > 1 ? Math.round((cint[cint.length - 1].cintura - cint[0].cintura) * 10) / 10 : null } : null,
    fase: atleta.fase?.numero || 1,
  };
}

// ---------- ¿Dónde estás fallando con el sueño? ----------
// Hora de acostarse en minutos "desde el mediodía" para promediar horas que cruzan la medianoche
const desdeMediodia = h => { const m = aMinutos(h); return m < 720 ? m + 1440 : m; };
const aHoraDia = m => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };

export function analizarSueno(logs = [], meta = { min: 7, max: 9, horaDormir: '22:30', horaDespertar: '06:30' }, dias = 14) {
  const noches = [...logs].filter(l => l.duracionMin && l.horaDormir && l.horaDespertar).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, dias);
  if (noches.length < 3) return { suficiente: false, noches: noches.length, hallazgos: [], bien: [] };
  const prom = l => l.reduce((a, b) => a + b, 0) / l.length;
  const dur = noches.map(n => n.duracionMin);
  const acostar = noches.map(n => desdeMediodia(n.horaDormir));
  const despertar = noches.map(n => aMinutos(n.horaDespertar));
  const promDur = prom(dur), promAcostar = prom(acostar), promDesp = prom(despertar);
  const desv = Math.sqrt(prom(acostar.map(x => (x - promAcostar) ** 2)));
  const cortas = noches.filter(n => n.duracionMin < meta.min * 60).length;
  const retraso = Math.round(promAcostar - desdeMediodia(meta.horaDormir || '22:30'));
  const finde = noches.filter(n => [0, 6].includes(new Date(n.fecha + 'T12:00:00').getDay()));
  const semana = noches.filter(n => ![0, 6].includes(new Date(n.fecha + 'T12:00:00').getDay()));
  const cal = noches.filter(n => n.calidad).map(n => n.calidad);
  const desps = noches.filter(n => n.despertares != null).map(n => n.despertares);
  const hallazgos = [], bien = [];

  if (promDur < meta.min * 60 - 15) hallazgos.push({ icono: '⏳', texto: `Duermes en promedio ${textoDuracion(Math.round(promDur))}: menos de las ${meta.min} h de tu objetivo (${cortas} de ${noches.length} noches cortas).`, consejo: `Adelanta tu hora de acostarte 15–30 minutos esta semana; la hora de despertar casi nunca se puede mover.` });
  else bien.push(`Duración promedio adecuada: ${textoDuracion(Math.round(promDur))}.`);
  if (retraso > 30) hallazgos.push({ icono: '🕚', texto: `Te acuestas en promedio a las ${aHoraDia(promAcostar)}, unos ${retraso} minutos después de tu objetivo (${meta.horaDormir}).`, consejo: 'Usa el recordatorio de sueño: 60 minutos antes, luces bajas y fuera pantallas; deja lista la ropa y lo del día siguiente.' });
  else bien.push(`Te acuestas cerca de tu hora objetivo (promedio ${aHoraDia(promAcostar)}).`);
  if (desv > 60) hallazgos.push({ icono: '🔀', texto: `Tu hora de acostarte cambia mucho de un día a otro (más o menos ${Math.round(desv)} minutos).`, consejo: 'Un horario regular, incluso el fin de semana, mejora la calidad del sueño y la energía para entrenar.' });
  if (finde.length && semana.length) {
    const dif = Math.round(prom(finde.map(n => desdeMediodia(n.horaDormir))) - prom(semana.map(n => desdeMediodia(n.horaDormir))));
    if (dif > 75) hallazgos.push({ icono: '📅', texto: `El fin de semana te acuestas unos ${dif} minutos más tarde que entre semana.`, consejo: 'Intenta que la diferencia no pase de una hora: así el lunes no cuesta tanto.' });
  }
  if (desps.length >= 3 && prom(desps) >= 2) hallazgos.push({ icono: '🌗', texto: `Te despiertas en promedio ${prom(desps).toFixed(1).replace('.', ',')} veces por noche.`, consejo: 'Evita cafeína después del mediodía, cenas muy pesadas y mucho líquido justo antes de dormir. Si roncas fuerte o despiertas cansado a menudo, coméntalo con tu médico.' });
  if (cal.length >= 3 && prom(cal) <= 5) hallazgos.push({ icono: '😴', texto: `Calificas tu sueño con ${prom(cal).toFixed(1).replace('.', ',')}/10 en promedio.`, consejo: 'Habitación oscura, fresca y silenciosa; misma hora de despertar cada día. Si dura semanas, consúltalo con un profesional.' });
  else if (cal.length >= 3) bien.push(`Calidad del sueño: ${prom(cal).toFixed(1).replace('.', ',')}/10.`);
  return {
    suficiente: true, noches: noches.length, hallazgos, bien,
    promedios: { duracion: Math.round(promDur), acostarse: aHoraDia(promAcostar), despertar: aHoraDia(promDesp), cortas },
  };
}

// Fecha de la noche al pulsar "Me voy a dormir": antes del mediodía cuenta para hoy; después, para mañana
export const fechaDeLaNoche = (fechaHoy, hora) => (aMinutos(hora) < 720 ? fechaHoy : sumarDias(fechaHoy, 1));
