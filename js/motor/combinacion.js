// FASE 5: MOTOR DE COMBINACIÓN
// optimizeWorkoutCombination() decide QUÉ combinar hoy, EN QUÉ ORDEN y CUÁNTO tiempo lleva cada disciplina.
// Analiza: objetivo, nivel (fase), músculos y sesiones recientes, plan semanal, fatiga, sueño, dolor, tiempo,
// modalidades elegidas y desbloqueos. Cada bloque tiene una función y una razón para su posición.

import { PLANTILLAS, nombreSesion, enfoqueDe, ENFOQUES } from './plantillas.js';
import { planSemanal, conflicto, lunesDe } from './semana.js';
import { objetivoDominante } from './objetivos.js';
import { DISCIPLINAS } from '../datos/disciplinas.js';
import { afirmacion } from '../datos/evidencia.js';
import { sumarDias } from './calculos.js';

// Sesiones intensas que se sustituyen cuando hay fatiga, dolor o poco sueño
const VERSION_SUAVE = { hiit_core: 'cardio_movilidad', militar: 'cardio_movilidad', boxeo_cardio: 'cardio_movilidad', fuerza_metabolico: 'fuerza_core', fuerza_acondicionamiento: 'fuerza_core' };

// Orden general (punto 8): técnica y coordinación → fuerza → calistenia/accesorios → acondicionamiento y cardio → movilidad
const RANGO = { agilidad: 1, parkour: 1, fuerza: 2, calistenia: 3, core: 4, boxeo: 5, acondicionamiento: 5, hiit: 5, militar: 5, cardio: 6, caminata: 6, movilidad: 7 };

export function ordenarBloques(defs, objetivo) {
  const principal = defs[0]?.d;
  const rango = b => {
    if (b.d === principal && !['agilidad', 'parkour'].includes(b.d)) return 2;   // la disciplina principal de la sesión va primero tras lo técnico
    if (objetivo.cardioPrioritario && ['cardio', 'hiit'].includes(b.d) && !b.moderado) return 1.5;
    return RANGO[b.d] ?? 6;
  };
  return [...defs].sort((a, b) => rango(a) - rango(b));
}

// Por qué cada bloque está en su posición
function porQuePosicion(def, i, orden, objetivo) {
  const hayFuerza = orden.some(b => b.d === 'fuerza');
  const antes = orden.slice(0, i).map(b => b.d);
  switch (def.d) {
    case 'agilidad': case 'parkour':
      return { texto: 'Va primero: exige coordinación y reacción, que salen mejor sin fatiga y con menos riesgo.', afirmacion: 'programa_completo' };
    case 'fuerza':
      return orden.some(b => ['cardio', 'hiit', 'acondicionamiento', 'boxeo'].includes(b.d) && orden.indexOf(b) > i)
        ? { texto: `La fuerza va antes del cardio y del acondicionamiento: tu objetivo (${objetivo.nombre.toLowerCase()}) necesita que llegues fresco a los ejercicios que más exigen.`, afirmacion: 'fuerza_antes_cardio' }
        : { texto: 'Es el bloque principal: va justo después del calentamiento, cuando tienes más energía.', afirmacion: 'fuerza_y_cardio_juntos' };
    case 'calistenia':
      return antes.includes('fuerza')
        ? { texto: 'Después de la fuerza, como complemento: trabaja el tren superior y el control del cuerpo sin repetir los mismos músculos.', afirmacion: 'cargas_en_casa' }
        : { texto: 'Es el bloque principal de fuerza de hoy, con el peso del cuerpo.', afirmacion: 'cargas_en_casa' };
    case 'core':
      return { texto: 'El core va después de los ejercicios principales: si se cansa antes, pierdes estabilidad en ellos.', afirmacion: 'programa_completo' };
    case 'boxeo':
      return hayFuerza
        ? { texto: 'Después de la fuerza, como trabajo técnico e interválico: con el cuerpo caliente y sin restar calidad a la fuerza.', afirmacion: 'boxeo' }
        : { texto: 'Es el bloque principal: coordinación, pies y cardio por intervalos.', afirmacion: 'boxeo' };
    case 'cardio':
      if (i <= 1 && objetivo.cardioPrioritario && !def.moderado) return { texto: 'Tu objetivo principal es cardiovascular: el cardio va primero, cuando estás más fresco.', afirmacion: 'concurrente' };
      return hayFuerza || antes.length
        ? { texto: 'Al final y a ritmo moderado: suma gasto de energía y trabaja el corazón sin quitar calidad a lo anterior.', afirmacion: 'concurrente' }
        : { texto: 'Es el bloque principal de hoy: capacidad aeróbica.', afirmacion: 'guias_minimas' };
    case 'acondicionamiento': case 'hiit': case 'militar':
      return { texto: hayFuerza ? 'Después de la fuerza y con el volumen controlado: más gasto de energía sin convertir toda la sesión en un esfuerzo máximo.' : 'Es el bloque principal: capacidad de trabajo con intensidad controlada.', afirmacion: def.d === 'hiit' ? 'hiit_dosificado' : def.d === 'militar' ? 'militar' : 'no_hay_mejor_ejercicio' };
    case 'movilidad':
      return { texto: 'Al final, con los músculos calientes, para ganar rango de movimiento.', afirmacion: 'programa_completo' };
    case 'caminata':
      return { texto: 'Movimiento suave para que llegue sangre a los músculos sin añadir fatiga.', afirmacion: 'sueno' };
    default:
      return { texto: '', afirmacion: null };
  }
}

// Explicación de cada bloque: función de la disciplina + por qué va en ese lugar + nivel de evidencia
export function explicarBloques(defs, objetivo) {
  return defs.map((def, i) => {
    const disc = DISCIPLINAS[def.d === 'caminata' ? 'cardio' : def.d] || {};
    const pos = porQuePosicion(def, i, defs, objetivo);
    const af = afirmacion(pos.afirmacion || disc.afirmacion);
    return { d: def.d, funcion: disc.funcion || '', porQue: pos.texto, evidencia: af ? { id: af.id, nivel: af.nivel, etiqueta: af.etiqueta, icono: af.icono } : null };
  });
}

// Sesiones de fuerza/cardio ya hechas esta semana (de lunes a hoy)
function hechasSemana(sesiones, fecha) {
  const lunes = lunesDe(fecha);
  return sesiones.filter(s => s.fecha >= lunes && s.fecha < fecha && ['completada', 'incompleta'].includes(s.estado) && s.workout?.tipo !== 'recuperacion')
    .map(s => ({ tipo: s.workout.tipo, enfoque: s.workout.enfoque || 'completo' }));
}

export function optimizeWorkoutCombination(ctx, opciones = {}, extra = {}) {
  const { atleta, fecha, sesiones } = ctx;
  const objetivo = objetivoDominante(atleta);
  const razones = [];
  const plan = planSemanal(atleta, { fecha, per: ctx.per, items: ctx.items, diasEntreno: extra.diasEntreno });
  const analisis = {
    objetivo: objetivo.nombre, fase: ctx.fase, fatiga: ctx.fatiga, recuperacion: ctx.recuperacion.estado, dolor: !!ctx.dolorReciente,
    descarga: !!ctx.descarga, minutos: opciones.minutos || atleta.disponibilidad?.minutos || 30,
  };
  const resultado = (tipo, enfoque, motivo) => {
    const enf = enfoqueDe(tipo, enfoque);
    let defs = PLANTILLAS[tipo].bloques.map(b => ({ ...b }));
    // Cardio + movilidad con parkour desbloqueado: un bloque corto de parkour (control corporal, no "quemar más")
    if (tipo === 'cardio_movilidad' && ctx.parkourSeleccionado && ctx.nivelParkour) defs = [{ d: 'cardio', f: 0.6 }, { d: 'parkour', f: 0.2 }, { d: 'movilidad', f: 0.2 }];
    const orden = ordenarBloques(defs, objetivo);
    if (motivo) razones.unshift(motivo);
    return { tipo, enfoque: enf, nombre: nombreSesion(tipo, enf), bloques: orden, explicacion: explicarBloques(orden, objetivo), razones, objetivo, plan, analisis };
  };

  if (opciones.tipo && PLANTILLAS[opciones.tipo]) return resultado(opciones.tipo, opciones.enfoque, 'Elegiste este tipo de sesión.');
  if (ctx.recuperacion.estado === 'recuperacion') {
    razones.push(`Señales: ${ctx.recuperacion.senales.join(', ').toLowerCase()}.`, 'No se entrena más solo para mantener una racha.');
    return resultado('recuperacion', 'completo', ctx.recuperacion.mensaje);
  }
  if (ctx.dolorReciente) razones.push('Reportaste dolor: sesión prudente, con menos volumen y sin ejercicios intensos. Si el dolor aumenta durante un ejercicio, detente.');

  // Qué falta de la semana planificada
  const hechas = hechasSemana(sesiones, fecha);
  const pendientes = [...plan.sesiones];
  for (const h of hechas) {
    const k = pendientes.findIndex(p => p.tipo === h.tipo && p.enfoque === h.enfoque);
    const k2 = k >= 0 ? k : pendientes.findIndex(p => PLANTILLAS[p.tipo].grupo === PLANTILLAS[h.tipo]?.grupo);
    if (k2 >= 0) pendientes.splice(k2, 1);
  }
  if (!pendientes.length) return resultado('recuperacion', 'completo', 'Ya completaste los entrenamientos de esta semana. Hoy toca recuperación activa: el músculo crece cuando descansa.');

  // La de hoy según el plan; si hoy no tocaba, la siguiente pendiente
  const hoyIdx = plan.semana.findIndex(d => d.fecha === fecha);
  const planHoy = plan.semana[hoyIdx]?.sesion;
  let candidatos = pendientes;
  const k = planHoy ? pendientes.findIndex(p => p.tipo === planHoy.tipo && p.enfoque === planHoy.enfoque) : -1;
  if (k > 0) candidatos = [pendientes[k], ...pendientes.filter((_, i) => i !== k)];
  if (!planHoy) razones.push('Hoy no era día de entrenamiento en tu reparto semanal: se adelanta la siguiente sesión pendiente.');

  // Fatiga entre disciplinas: lo que hiciste ayer manda
  const ayer = ctx.ultima && ctx.ultima.fecha === sumarDias(fecha, -1) && ctx.ultima.workout ? { tipo: ctx.ultima.workout.tipo, enfoque: ctx.ultima.workout.enfoque || 'completo' } : null;
  let elegido = candidatos[0];
  if (ayer) {
    const sinChoque = candidatos.find(c => conflicto(ayer, c).puntos < 5);
    const choque = conflicto(ayer, elegido);
    if (choque.puntos >= 5 && sinChoque && sinChoque !== elegido) {
      razones.push(`${choque.motivo} Por eso hoy toca ${nombreSesion(sinChoque.tipo, sinChoque.enfoque).toLowerCase()} y se deja ${nombreSesion(elegido.tipo, elegido.enfoque).toLowerCase()} para otro día.`);
      elegido = sinChoque;
    } else if (choque.puntos >= 5) razones.push(`${choque.motivo} No hay otra sesión pendiente que encaje mejor: se hace en versión moderada.`);
  }
  let tipo = elegido.tipo;
  // Fatiga, dolor o descarga: versión suave de las sesiones intensas
  if ((ctx.fatiga || ctx.descarga) && VERSION_SUAVE[tipo]) {
    razones.push(`${ctx.descarga ? 'Semana de descarga' : 'Tu recuperación hoy no es la ideal'}: en vez de ${PLANTILLAS[tipo].nombre.toLowerCase()} se hace ${PLANTILLAS[VERSION_SUAVE[tipo]].nombre.toLowerCase()}.`);
    tipo = VERSION_SUAVE[tipo];
  }
  const grupo = PLANTILLAS[tipo].grupo;
  const restantes = pendientes.filter(p => p !== elegido);
  const quedanF = restantes.filter(p => PLANTILLAS[p.tipo].grupo === 'fuerza').length;
  if (grupo === 'fuerza') razones.push(`Tu objetivo es ${objetivo.nombre.toLowerCase()}: la fuerza es la base del entrenamiento. ${quedanF ? `Después de hoy ${quedanF === 1 ? 'queda 1 sesión' : `quedan ${quedanF} sesiones`} de fuerza esta semana.` : 'Es la última sesión de fuerza de la semana.'}`);
  else razones.push(`Sesión de ${PLANTILLAS[tipo].nombre.toLowerCase()} de tu reparto semanal: cada disciplina tiene una función en tu objetivo.`);
  if (elegido.experimento) razones.push('Semana de prueba del ciclo: se compara cómo respondes a esta variante.');
  return resultado(tipo, elegido.enfoque);
}

export { ENFOQUES };
