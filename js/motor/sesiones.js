// Constructores de bloques de una sesión. Cada bloque devuelve:
// { id, titulo, tipo, formato: 'series'|'circuito'|'rondas'|'continuo'|'intervalos'|'guiado', minutos, items, ... }
// Reciben ctx (armado por el generador) con el selector de ejercicios ya filtrado por seguridad, equipo y nivel.

import { ejercicioPorId } from '../datos/ejercicios.js';
import { prescribir, duracionSeries } from './prescripcion.js';

const min = s => Math.round(s / 60);
const item = (id, extra) => ({ ejercicioId: id, nombre: ejercicioPorId[id].nombre, ...extra });

// ---------- Calentamiento ----------
export function calentamiento(ctx, minutos, primerEjercicio) {
  const items = [];
  const pulso = ctx.sel.primeroDisponible(['marcha_sitio', 'jumping_jack_bajo']);
  items.push(item(pulso, { segundos: minutos >= 6 ? 120 : 60, nota: 'Ritmo suave que va subiendo.' }));
  for (const id of ['circulos_hombro', 'gato_camello', 'tobillo_pared', 'flexores_cadera']) {
    if (items.length >= (minutos >= 6 ? 5 : 3)) break;
    if (ctx.sel.disponible(ejercicioPorId[id]).ok) items.push(item(id, { segundos: 40, porLado: ejercicioPorId[id].unilateral }));
  }
  if (ctx.parkourSeleccionado && ctx.nivelParkour) items.push(item('equilibrio_una_pierna', { segundos: 20, porLado: true, nota: 'Fundamento de parkour: equilibrio.' }));
  if (primerEjercicio) items.push(item(primerEjercicio, { series: 1, reps: 8, nota: 'Serie de aproximación muy suave, solo para preparar el movimiento.' }));
  return { id: 'calentamiento', titulo: 'Calentamiento', tipo: 'calentamiento', formato: 'guiado', minutos, items };
}

// ---------- Enfriamiento ----------
export function enfriamiento(ctx, minutos, grupos = []) {
  const ids = ['respiracion_diafragmatica'];
  if (grupos.some(g => ['isquiotibiales', 'gluteos', 'cuadriceps'].includes(g))) ids.unshift('isquios_estiramiento', 'flexores_cadera');
  if (grupos.some(g => ['pecho', 'espalda', 'hombros'].includes(g))) ids.unshift('apertura_toracica');
  ids.unshift('postura_nino');
  const lista = [...new Set(ids)].filter(id => ctx.sel.disponible(ejercicioPorId[id]).ok).slice(0, minutos >= 6 ? 5 : 3);
  return { id: 'enfriamiento', titulo: 'Enfriamiento', tipo: 'enfriamiento', formato: 'guiado', minutos,
    items: lista.map(id => item(id, { segundos: id === 'respiracion_diafragmatica' ? 60 : 45, porLado: ejercicioPorId[id].unilateral })) };
}

// ---------- Fuerza por series ----------
// patrones: orden de prioridad. Añade ejercicios mientras quepan en el tiempo: nunca rellena.
export function bloqueSeries(ctx, { id, titulo, tipo, minutos, patrones, familias }) {
  const items = [];
  let usado = 0;
  const usadas = new Set();
  const lista = familias ? familias.map(f => ({ familia: f })) : patrones.map(p => ({ patron: p }));
  for (const obj of lista) {
    const ej = obj.familia ? ctx.sel.deFamilia(obj.familia) : ctx.sel.porPatron(obj.patron, { excluirFamilias: usadas });
    if (!ej || items.some(i => i.ejercicioId === ej.id)) continue;
    const p = prescribir(ej.id, ctx.atleta.progresion?.[ej.familia], ctx.atleta, ctx);
    const seg = duracionSeries(p);
    if (usado + seg > minutos * 60 + 45) continue;   // no cabe: probamos el siguiente patrón
    usado += seg; usadas.add(ej.familia);
    items.push(item(ej.id, { ...p, familia: ej.familia }));
  }
  return { id, titulo, tipo, formato: 'series', minutos: Math.max(1, min(usado)), items };
}

// ---------- Circuito por tiempo ----------
export function circuito(ctx, { id = 'acondicionamiento', titulo = 'Acondicionamiento', minutos, pool, n = 5 }) {
  const [trabajo, descanso] = { 1: [30, 30], 2: [35, 25], 3: [40, 20], 4: [40, 20], 5: [45, 15] }[ctx.fase];
  const todos = ctx.sel.variosDe(pool, n);
  if (!todos.length) return null;
  const pausaVuelta = ctx.fase <= 2 ? 90 : 60;
  const maxVueltas = ctx.fase <= 1 ? 3 : 5;
  // Elige cuántos ejercicios usar para aprovechar el tiempo sin pasarse (mínimo 3)
  let mejor = null;
  for (let k = todos.length; k >= Math.min(3, todos.length); k--) {
    const vuelta = k * (trabajo + descanso);
    const v = Math.max(1, Math.min(maxVueltas, Math.floor((minutos * 60 + pausaVuelta) / (vuelta + pausaVuelta))));
    const dur = v * vuelta + (v - 1) * pausaVuelta;
    if (dur <= minutos * 60 + 30 && (!mejor || dur > mejor.dur)) mejor = { k, v, vuelta, dur };
  }
  mejor ||= { k: Math.min(3, todos.length), v: 1, vuelta: Math.min(3, todos.length) * (trabajo + descanso) };
  mejor.dur = mejor.v * mejor.vuelta + (mejor.v - 1) * pausaVuelta;
  const elegidos = todos.slice(0, mejor.k);
  const vueltas = mejor.v, duracion = mejor.dur;
  return { id, titulo, tipo: 'acondicionamiento', formato: 'circuito', minutos: min(duracion),
    trabajo, descanso, vueltas, descansoVuelta: pausaVuelta,
    resumen: `${trabajo} s trabajo · ${descanso} s descanso · ${elegidos.length} ejercicios · ${vueltas} ${vueltas === 1 ? 'vuelta' : 'vueltas'}`,
    items: elegidos.map(e => item(e.id, { segundos: trabajo, descanso, porLado: false })) };
}

// ---------- Cardio ----------
// moderado: continuo a ritmo cómodo (cuando acompaña a la fuerza no se hacen intervalos)
export function cardio(ctx, minutos, { moderado = false } = {}) {
  const opciones = ['caminata_rapida', 'bicicleta', 'caminata_inclinada', 'trote_suave', 'carrera_continua', 'step_aerobico', 'marcha_sitio'];
  const ej = ctx.sel.rotar(opciones.filter(id => ctx.sel.disponible(ejercicioPorId[id]).ok), 'cardio');
  if (!ej) return null;
  const intervalos = !moderado && ctx.fase >= 2 && !ctx.fatiga && !ctx.descarga && minutos >= 10 && (ctx.atleta.perfil?.puntuaciones?.cardio ?? 0) >= 45;
  if (intervalos) {
    const [rapido, suave] = ctx.fase >= 3 ? [180, 90] : [120, 120];
    const reps = Math.max(2, Math.floor((minutos * 60) / (rapido + suave)));
    return { id: 'cardio', titulo: 'Cardio', tipo: 'cardio', formato: 'intervalos', minutos: min(reps * (rapido + suave)),
      resumen: `${reps} × (${rapido / 60} min ritmo vivo + ${suave / 60} min suave)`,
      intensidad: 'Ritmo vivo: esfuerzo 7/10, frases cortas. Suave: recuperas el aliento.',
      items: [item(ej.id, { intervalos: { repeticiones: reps, rapido, suave } })] };
  }
  return { id: 'cardio', titulo: 'Cardio', tipo: 'cardio', formato: 'continuo', minutos,
    resumen: `${minutos} min continuos`,
    intensidad: ctx.fatiga ? 'Suave: esfuerzo 4/10, puedes conversar.' : 'Zona cómoda: esfuerzo 5–6/10, puedes hablar con frases cortas.',
    items: [item(ej.id, { minutos })] };
}

// ---------- HIIT ----------
export function hiit(ctx, minutos) {
  const bajo = ctx.restricciones.has('saltos');
  const pool = bajo
    ? ['jumping_jack_bajo', 'mountain_climber_inclinado', 'skater_bajo', 'golpes_al_aire', 'burpee_sin_salto', 'marcha_sitio']
    : ['jumping_jack', 'mountain_climber', 'skater_bajo', 'golpes_al_aire', 'burpee_sin_salto', 'sentadilla_salto', 'burpee', 'kettlebell_swing'];
  const [trabajo, descanso] = ctx.fase >= 5 ? [40, 20] : ctx.fase >= 3 ? [30, 20] : [30, 30];
  const elegidos = ctx.sel.variosDe(pool, 4);
  const vuelta = elegidos.length * (trabajo + descanso);
  const vueltas = Math.max(2, Math.min(4, Math.floor((minutos * 60 + 60) / (vuelta + 60))));
  return { id: 'hiit', titulo: bajo ? 'HIIT de bajo impacto' : 'HIIT', tipo: 'hiit', formato: 'circuito', minutos: min(vueltas * vuelta + (vueltas - 1) * 60),
    trabajo, descanso, vueltas, descansoVuelta: 60,
    resumen: `${trabajo} s a esfuerzo alto (8/10) · ${descanso} s de pausa · ${vueltas} vueltas`,
    items: elegidos.map(e => item(e.id, { segundos: trabajo, descanso })) };
}

// ---------- Boxeo por rondas ----------
const COMBOS = {
  tecnica: ['Guardia + desplazamiento adelante y atrás', 'Jab + desplazamiento', 'Jab → desplazamiento → jab', 'Jab + cross', 'Jab + cross + salida lateral', 'Doble jab + cross'],
  intermedio: ['Jab + cross + hook', 'Jab + cross + salida lateral', 'Esquiva + cross', 'Bloqueo + jab + cross', 'Jab + uppercut + hook', 'Jab + cross + hook + desplazamiento'],
  avanzado: ['Jab + cross + hook + cross', 'Doble jab + cross + esquiva + cross', 'Jab + cross + uppercut + hook', 'Esquiva + hook + cross + salida', 'Combinaciones libres con cambios de distancia', 'Ronda de ritmo alto: golpes rectos continuos'],
};
export function boxeo(ctx, minutos) {
  const nivel = ctx.fase >= 4 ? 'avanzado' : ctx.fase >= 2 ? 'intermedio' : 'tecnica';
  const ronda = { tecnica: 120, intermedio: 150, avanzado: 180 }[nivel];
  const descanso = ctx.fase >= 4 ? 45 : 60;
  const rondas = Math.max(2, Math.min(ctx.fase >= 4 ? 8 : 6, Math.floor((minutos * 60 + descanso) / (ronda + descanso))));
  const saco = ctx.sel.disponible(ejercicioPorId.boxeo_saco).ok;
  const desplaz = ctx.contador('boxeo');   // variación: cada sesión empieza en otra combinación
  const combos = COMBOS[nivel];
  const lista = Array.from({ length: rondas }, (_, i) => {
    const combo = combos[(desplaz + i) % combos.length];
    const enSaco = saco && i % 2 === 1;
    return { numero: i + 1, segundos: ronda, descanso: i < rondas - 1 ? descanso : 0, combinacion: combo,
      ejercicioId: enSaco ? 'boxeo_saco' : 'boxeo_sombra', foco: enSaco ? 'En saco, golpes controlados' : 'Sombra con desplazamiento' };
  });
  return { id: 'boxeo', titulo: 'Boxeo', tipo: 'boxeo', formato: 'rondas', minutos: min(rondas * ronda + (rondas - 1) * descanso),
    resumen: `${rondas} rondas de ${ronda / 60} min · ${descanso} s de descanso`,
    intensidad: 'Técnica antes que fuerza: golpes rápidos y controlados, guardia siempre arriba.',
    rondas: lista, items: [item('boxeo_guardia_pies', {}), ...[...new Set(lista.map(r => r.ejercicioId))].map(id => item(id, {}))] };
}

// ---------- Tipo militar ----------
export function militar(ctx, minutos) {
  const estaciones = ctx.sel.variosDe([
    ctx.sel.deFamilia('flexion')?.id, ctx.sel.deFamilia('sentadilla')?.id, 'zancada_caminando', 'zancada_estatica',
    ctx.sel.deFamilia('plancha')?.id, 'mountain_climber', 'mountain_climber_inclinado', 'burpee_sin_salto', 'gateo_oso', 'paseo_granjero', 'remo_invertido_barra',
  ].filter(Boolean), 5);
  const traslado = ctx.sel.primeroDisponible(['marcha_mochila', 'carrera_continua', 'trote_suave', 'marcha_rapida']);
  const [trabajo, descanso] = ctx.fase >= 4 ? [45, 15] : ctx.fase >= 2 ? [40, 20] : [30, 30];
  const traslMin = ctx.fase >= 3 ? 3 : 2;
  const vuelta = estaciones.length * (trabajo + descanso) + traslMin * 60;
  const vueltas = Math.max(1, Math.min(5, Math.floor((minutos * 60) / vuelta)));
  return { id: 'militar', titulo: 'Circuito tipo militar', tipo: 'militar', formato: 'circuito', minutos: min(vueltas * vuelta),
    trabajo, descanso, vueltas, descansoVuelta: 0,
    resumen: `${estaciones.length} estaciones × ${trabajo} s + ${traslMin} min de ${ejercicioPorId[traslado].nombre.toLowerCase()} · ${vueltas} vueltas`,
    intensidad: 'Ritmo constante y sostenible: capacidad de trabajo, no agotamiento.',
    items: [...estaciones.map(e => item(e.id, { segundos: trabajo, descanso })), item(traslado, { minutos: traslMin, nota: 'Entre vueltas' })] };
}

// ---------- Parkour ----------
const PARKOUR = {
  A: ['equilibrio_una_pierna', 'caminar_linea', 'cuadrupedia_baja', 'levantarse_suelo'],
  B: ['equilibrio_bordillo', 'paso_obstaculo', 'gateo_oso', 'caminar_linea'],
  C: ['aterrizaje_suave', 'salto_pequeno_aterrizaje', 'paso_obstaculo', 'equilibrio_bordillo'],
  D: ['salto_precision', 'salto_pequeno_aterrizaje', 'paso_obstaculo', 'gateo_oso'],
};
export function parkour(ctx, minutos) {
  const nivel = ctx.nivelParkour;
  if (!nivel) return null;
  const elegidos = ctx.sel.variosDe(PARKOUR[nivel], minutos >= 10 ? 4 : 3);
  return { id: 'parkour', titulo: `Parkour nivel ${nivel}`, tipo: 'parkour', formato: 'series', minutos,
    intensidad: 'Calidad y control en cada repetición. Superficie segura siempre.',
    items: elegidos.map(e => item(e.id, e.dosis === 'tiempo' ? { series: 3, segundos: 30, descanso: 45, porLado: e.unilateral, texto: `3 × 30 s${e.unilateral ? ' por lado' : ''}` }
      : { series: 3, reps: 5, descanso: 60, porLado: e.unilateral, texto: '3 × 5' })) };
}

// ---------- Agilidad ----------
export function agilidad(ctx, minutos) {
  const elegidos = ctx.sel.variosDe(['escalera_imaginaria', 'pasos_laterales', 'cambio_direccion_trote', 'cambio_direccion_caminando', 'reaccion_senal', 'toque_cruzado'], minutos >= 10 ? 4 : 3);
  return { id: 'agilidad', titulo: 'Agilidad y coordinación', tipo: 'agilidad', formato: 'series', minutos,
    intensidad: 'Rápido pero preciso: si pierdes el control, baja la velocidad.',
    items: elegidos.map(e => item(e.id, { series: 3, segundos: 25, descanso: 40, texto: '3 × 25 s' })) };
}

// ---------- Core ----------
export function core(ctx, minutos) {
  return bloqueSeries(ctx, { id: 'core', titulo: 'Core', tipo: 'core', minutos, patrones: ['core', 'core', 'core'] });
}

// ---------- Movilidad ----------
export function movilidad(ctx, minutos) {
  const elegidos = ctx.sel.variosDe(['cadera_90_90', 'apertura_toracica', 'deslizamiento_pared', 'tobillo_pared', 'gato_camello', 'flexores_cadera', 'isquios_estiramiento', 'bisagra_palo'], Math.max(3, Math.min(6, Math.round(minutos / 1.5))));
  return { id: 'movilidad', titulo: 'Movilidad', tipo: 'movilidad', formato: 'guiado', minutos,
    items: elegidos.map(e => item(e.id, { segundos: 60, porLado: e.unilateral })) };
}
