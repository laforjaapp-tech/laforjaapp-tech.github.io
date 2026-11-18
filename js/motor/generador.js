// MOTOR DE ENTRENAMIENTO
// Responde cada día: "¿Cuál es el estímulo de entrenamiento más apropiado para esta persona hoy?"
// Considera objetivo, nivel, fase, periodización, tiempo, equipo, lugar, historial, fatiga, sueño,
// dolor y desbloqueos. No asigna rutinas por día de la semana.

import { EJERCICIOS, ejercicioPorId, familia, fichaEjercicio, NOMBRES_GRUPO } from '../datos/ejercicios.js';
import { estadoInicial } from './prescripcion.js';
import { estadoRecuperacion } from './adaptacion.js';
import { evaluarDesbloqueos, restriccionesActuales, nivelParkour, desbloqueado, estructuraPeriodizacion, FASES } from './fases.js';
import { volumenMuscular } from './historial.js';
import { hoyISO, sumarDias } from './calculos.js';
import * as B from './sesiones.js';
import { PLANTILLAS, ENFOQUES } from './plantillas.js';
import { optimizeWorkoutCombination } from './combinacion.js';
import { DISCIPLINAS, claveDisciplina } from '../datos/disciplinas.js';
import { afirmacion } from '../datos/evidencia.js';

const GYM = ['maquinas', 'barra', 'mancuernas', 'banco', 'kettlebell', 'barra_dominadas', 'bandas', 'bicicleta', 'caminadora', 'cuerda'];

// Tipos de sesión (FASE 5: definidos como plantillas de combinación en plantillas.js)
export const TIPOS_SESION = PLANTILLAS;

const FAMILIAS_PATRON = {
  rodilla: ['sentadilla', 'prensa', 'zancada'],
  rodilla_uni: ['zancada', 'sentadilla'],
  bisagra: ['peso_muerto', 'puente', 'swing'],
  empuje_h: ['flexion', 'press_pecho', 'press_pecho_maq'],
  empuje_v: ['press_hombro', 'fondos'],
  traccion_h: ['remo', 'remo_invertido', 'remo_maq', 'remo_suelo', 'face_pull'],
  traccion_v: ['dominada', 'jalon'],
  core: ['plancha', 'core_control', 'plancha_lateral', 'pallof', 'elevaciones'],
  carga: ['cargar'],
  pantorrilla: ['talones'],
  brazos: ['biceps', 'triceps'],
};
// Patrón muscular para compensar desequilibrios
const PATRON_DE_GRUPO = {
  pecho: 'empuje_h', espalda: 'traccion_h', hombros: 'empuje_v', biceps: 'traccion_v', triceps: 'empuje_v',
  core: 'core', gluteos: 'bisagra', cuadriceps: 'rodilla', isquiotibiales: 'bisagra', pantorrillas: 'pantorrilla',
};

// Equipo utilizable hoy según el lugar elegido
export function equipoDisponible(atleta, lugar) {
  const items = (atleta.equipamiento?.items || []).filter(i => !['ninguno', 'otro'].includes(i));
  const lugares = atleta.experiencia?.lugares || [];
  const set = new Set(items);
  if (lugar === 'gimnasio') GYM.forEach(x => set.add(x));
  if (lugar === 'parque' || (lugar !== 'gimnasio' && lugares.includes('parque'))) { set.add('barra_dominadas'); set.add('banco'); }
  return set;
}
export const tieneGimnasio = atleta =>
  (atleta.experiencia?.lugares || []).includes('gimnasio') || (atleta.equipamiento?.items || []).includes('maquinas');

const cumpleEquipo = (req, set) => !req || req.split('|').some(op => op.split('+').every(x => set.has(x)));

// Estado inicial de cada familia a partir de las pruebas físicas
function pasoInicialDesdePruebas(fam, atleta) {
  const pr = atleta.pruebas || {};
  const mapa = {
    flexion: () => { const f = pr.flexiones; if (!f) return null;
      const base = { pared: 'flexion_pared', inclinada: 'flexion_inclinada', rodillas: 'flexion_rodillas', normal: 'flexion' }[f.variante];
      const sube = f.reps >= 15; const c = familia('flexion'); const i = c.findIndex(e => e.id === base);
      return sube && c[i + 1] && c[i + 1].paso <= 4 ? c[i + 1].id : base; },
    sentadilla: () => { const s = pr.sentadillas; if (!s) return null;
      if (s.variante === 'silla') return s.reps >= 14 ? 'sentadilla_corporal' : 'sentadilla_silla';
      return s.reps >= 40 ? 'sentadilla_pausa' : 'sentadilla_corporal'; },
    plancha: () => { const p = pr.plancha; if (!p) return null; return { inclinada: 'plancha_inclinada', rodillas: 'plancha_rodillas', normal: 'plancha' }[p.variante]; },
    dominada: () => { const d = pr.dominadas; if (!d) return null; return d.reps >= 5 ? 'dominada' : d.reps >= 1 ? 'dominada_asistida' : 'colgado_activo'; },
  };
  return mapa[fam]?.() || null;
}

// ---------- Contexto y selector ----------
function crearContexto(atleta, historial, opciones) {
  const fecha = opciones.fecha || hoyISO();
  const items = evaluarDesbloqueos(atleta);
  const restricciones = restriccionesActuales(atleta, items);
  const fase = atleta.fase?.numero || 1;
  const per = estructuraPeriodizacion(atleta, fecha);
  const sesiones = (historial.sesiones || []).filter(s => ['completada', 'incompleta'].includes(s.estado)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ultima = sesiones[sesiones.length - 1];
  const recuperacion = estadoRecuperacion(historial.registrosDiarios || [], sesiones.slice(-3).map(s => ({ fecha: s.fecha, esfuerzo: s.resultado?.general?.esfuerzo ?? 6 })));
  const registroHoy = (historial.registrosDiarios || []).find(r => r.fecha === fecha);
  const dolorReciente = (ultima?.resultado?.general?.dolor && ultima.fecha >= sumarDias(fecha, -3)) || registroHoy?.dolorArticular === 'si';
  const lugar = opciones.lugar || 'auto';
  const equipo = equipoDisponible(atleta, lugar);
  const recientes = new Set((ultima?.workout?.bloques || []).flatMap(b => b.items.map(i => i.ejercicioId)));
  const decisiones = [];
  const progresion = atleta.progresion ||= {};

  const ctx = {
    atleta, fecha, fase, items, restricciones, equipo, lugar, per,
    descarga: !!per?.descarga, fatiga: recuperacion.estado !== 'normal' || !!dolorReciente,
    recuperacion, dolorReciente, sesiones, ultima, decisiones,
    nivelParkour: nivelParkour(items), parkourSeleccionado: (atleta.modalidades || []).includes('parkour'),
    contador: clave => sesiones.filter(s => s.workout?.bloques?.some(b => b.tipo === clave)).length,
  };

  // Motor de decisión (punto 23): ¿puede?, ¿tiene el equipo?, ¿es de su nivel?, ¿está restringido?
  function disponible(ej) {
    if (!ej) return { ok: false, motivo: 'No existe' };
    const choque = ej.evitarSi.find(r => restricciones.has(r));
    if (choque) return { ok: false, motivo: `Restricción de seguridad (${choque})` };
    if (!cumpleEquipo(ej.equipo, ctx.equipo)) return { ok: false, motivo: 'Sin el equipamiento necesario hoy' };
    const est = progresion[ej.familia];
    const probado = est && ej.paso <= (est.pasoActual ?? 0);
    if (ej.nivel > fase && !probado) return { ok: false, motivo: `Se desbloquea en la fase ${ej.nivel}` };
    if (ej.impacto === 'alto' && !desbloqueado(items, 'hiit') && !ej.categorias.includes('parkour')) return { ok: false, motivo: 'Necesita base cardiovascular (HIIT bloqueado)' };
    return { ok: true };
  }

  // Ejercicio de una familia según su estado de progresión (con alternativa si el actual no es posible hoy)
  function deFamilia(fam) {
    const cadena = familia(fam);
    if (!cadena.length) return null;
    if (!progresion[fam]) {
      const validos = cadena.filter(e => disponible(e).ok && e.nivel <= fase);
      const desdePrueba = ejercicioPorId[pasoInicialDesdePruebas(fam, atleta)];
      // Fase 1: siempre la variante más sencilla. Desde la fase 2: la más exigente de un nivel por debajo de la fase
      // (así quien ya entrena empieza con carga, pero con margen).
      const porFase = fase === 1 ? validos[0]
        : [...validos].sort((a, b) => b.paso - a.paso || b.nivel - a.nivel).find(e => e.nivel <= fase - 1) || validos[0];
      let inicial = desdePrueba || porFase;
      if (desdePrueba && porFase && porFase.paso > desdePrueba.paso && disponible(porFase).ok) inicial = porFase;
      if (!inicial) return null;   // nada apropiado en esta familia: no se crea estado
      progresion[fam] = estadoInicial(inicial.id, atleta, fase);
    }
    const est = progresion[fam];
    const actual = ejercicioPorId[est.ejercicioId];
    if (disponible(actual).ok) return actual;
    // Alternativa: el paso más alto disponible por debajo, luego cualquiera disponible de la familia
    const alt = [...cadena].reverse().find(e => e.paso <= actual.paso && disponible(e).ok) || cadena.find(e => disponible(e).ok);
    decisiones.push(alt
      ? `${actual.nombre} no es posible hoy (${disponible(actual).motivo.toLowerCase()}): se usa ${alt.nombre}.`
      : `${actual.nombre} no es posible hoy y no hay alternativa en su familia.`);
    return alt || null;
  }

  function porPatron(patron, { excluirFamilias = new Set() } = {}) {
    let fams = (FAMILIAS_PATRON[patron] || []).filter(f => !excluirFamilias.has(f));
    // Variación por mesociclo: a partir de la fase 2, el ejercicio principal alterna entre familias válidas
    const validas = fams.filter(f => deFamiliaSilencioso(f));
    if (!validas.length) return null;
    if (fase >= 2 && validas.length > 1 && per) {
      const k = (per.mesociclo.numero - 1) % Math.min(2, validas.length);
      fams = [validas[k], ...validas.filter((_, i) => i !== k)];
    } else fams = validas;
    // En el gimnasio se priorizan las familias con carga
    if (lugar === 'gimnasio') fams.sort((a, b) => Number(!!ejCandidato(b)?.equipo) - Number(!!ejCandidato(a)?.equipo));
    for (const f of fams) { const e = deFamilia(f); if (e) return e; }
    return null;
  }
  const ejCandidato = f => progresion[f] ? ejercicioPorId[progresion[f].ejercicioId] : familia(f).find(e => disponible(e).ok);
  const deFamiliaSilencioso = f => familia(f).some(e => disponible(e).ok && (e.nivel <= fase || progresion[f]));

  // Varios ejercicios de una lista, evitando repetir los de la última sesión cuando hay alternativas
  function variosDe(ids, n) {
    const validos = [...new Set(ids)].map(id => ejercicioPorId[id]).filter(e => e && disponible(e).ok);
    const nuevos = validos.filter(e => !recientes.has(e.id));
    return [...nuevos, ...validos.filter(e => recientes.has(e.id))].slice(0, n);
  }
  const primeroDisponible = ids => ids.find(id => disponible(ejercicioPorId[id]).ok) || ids[ids.length - 1];
  function rotar(ids, clave) {
    if (!ids.length) return null;
    return ejercicioPorId[ids[ctx.contador(clave) % ids.length]];
  }

  ctx.sel = { disponible, deFamilia, porPatron, variosDe, primeroDisponible, rotar };
  return ctx;
}

// Filtro para la progresión: solo se avanza a ejercicios de la fase actual, seguros y con equipo disponible (casa o gimnasio)
export function filtroProgresion(atleta) {
  const ctx = crearContexto(atleta, {}, { lugar: 'casa' });
  ctx.equipo = new Set([...equipoDisponible(atleta, 'casa'), ...(tieneGimnasio(atleta) ? equipoDisponible(atleta, 'gimnasio') : [])]);
  return ej => ej.nivel <= ctx.fase && ctx.sel.disponible(ej).ok;
}

// Tiempo máximo útil por fase: nunca se rellena tiempo sin motivo
const TOPE_MINUTOS = { 1: 50, 2: 60, 3: 75, 4: 90, 5: 100 };

export function generateWorkout(atleta, historial = {}, opciones = {}) {
  const ctx = crearContexto(atleta, historial, opciones);
  // FASE 5: el motor de combinación decide qué disciplinas, con qué enfoque y en qué orden
  const combinacion = optimizeWorkoutCombination(ctx, opciones, { diasEntreno: historial.diasEntreno });
  const { tipo, enfoque, razones } = combinacion;
  // Lugar automático: con casa y gimnasio, las sesiones de fuerza se reparten según la estrategia
  if (ctx.lugar === 'auto') {
    const lugares = atleta.experiencia?.lugares || [];
    const soloGym = tieneGimnasio(atleta) && !lugares.some(l => l !== 'gimnasio');
    let lugarAuto = 'casa';
    if (soloGym) lugarAuto = 'gimnasio';
    else if (tieneGimnasio(atleta) && TIPOS_SESION[tipo].grupo === 'fuerza') {
      const objetivoGym = Math.ceil((atleta.plan?.estrategia?.sesionesFuerza || 2) / 2);
      const inicio = ctx.per?.microciclo?.inicio || sumarDias(ctx.fecha, -6);
      const enGym = ctx.sesiones.filter(s => s.fecha >= inicio && s.workout?.lugar === 'gimnasio').length;
      lugarAuto = enGym < objetivoGym ? 'gimnasio' : 'casa';
      razones.push(lugarAuto === 'gimnasio' ? 'Hoy toca gimnasio: permite progresar con carga.' : 'Hoy en casa: el peso corporal y tu material también hacen progresar.');
    }
    ctx.lugar = lugarAuto;
    ctx.equipo = equipoDisponible(atleta, lugarAuto);
  }
  const disponibles = opciones.minutos || atleta.disponibilidad?.minutos || 30;
  const tope = TOPE_MINUTOS[ctx.fase];
  let minutos = Math.min(disponibles, tope);
  if (tipo === 'recuperacion') minutos = Math.min(minutos, 30);
  if (ctx.fatiga && tipo !== 'recuperacion') minutos = Math.round(minutos * 0.8);
  const avisos = [];
  if (disponibles > minutos && tipo !== 'recuperacion') avisos.push(`Tienes ${disponibles} min, pero en tu fase actual ${minutos} min bastan: más tiempo no daría más resultado y sí más fatiga.`);
  if (ctx.descarga) avisos.push('Semana de descarga: menos volumen para recuperar y asimilar lo entrenado.');
  if (ctx.recuperacion.estado === 'precaucion') avisos.push(ctx.recuperacion.mensaje);

  // Reparto del tiempo
  const corta = minutos <= 20;
  const cal = corta ? 3 : minutos >= 45 ? 7 : 5;
  const enf = corta ? 2 : minutos >= 45 ? 5 : 4;
  const T = Math.max(6, minutos - cal - enf);
  const bloques = [];
  const fuerzaPatrones = foco => {
    const vol = volumenMuscular(ctx.sesiones.filter(s => s.fecha >= sumarDias(ctx.fecha, -7)));
    const base = ENFOQUES[foco]?.patrones || ENFOQUES.completo.patrones;
    // Desequilibrios de la semana: se refuerzan si encajan en el enfoque de hoy
    const deficit = vol.desequilibrios.filter(d => PATRON_DE_GRUPO[d.grupo] && (foco === 'completo' || base.includes(PATRON_DE_GRUPO[d.grupo])));
    if (deficit.length) avisos.push(`Equilibrio semanal: se refuerza ${deficit.map(d => NOMBRES_GRUPO[d.grupo].toLowerCase()).join(', ')}.`);
    const [primero, ...resto] = base;
    return [...new Set([primero, ...deficit.map(d => PATRON_DE_GRUPO[d.grupo]), ...resto])];
  };
  const CALISTENIA = ['flexion', 'dominada', 'remo_invertido', 'fondos', 'elevaciones', 'plancha'];
  const METABOLICO = ['mountain_climber', 'mountain_climber_inclinado', 'burpee_sin_salto', 'kettlebell_swing', 'paseo_granjero', 'skater_bajo', 'zancada_caminando', 'step_up', 'jumping_jack_bajo', 'plancha_toques', 'gateo_oso'];
  const tituloFuerza = { completo: 'Fuerza', superior: 'Fuerza · tren superior', inferior: 'Fuerza · piernas' }[enfoque] || 'Fuerza';
  // Un constructor por disciplina (sesiones.js); cada bloque recibe los minutos que le da la plantilla
  const construir = {
    fuerza: m => corta
      ? B.circuito(ctx, { id: 'fuerza', titulo: 'Circuito de fuerza', minutos: m, pool: fuerzaPatrones(enfoque).map(p => ctx.sel.porPatron(p)?.id).filter(Boolean), n: 5 })
      : B.bloqueSeries(ctx, { id: 'fuerza', titulo: tituloFuerza, tipo: 'fuerza', minutos: m, patrones: fuerzaPatrones(enfoque) }),
    core: m => B.core(ctx, m),
    calistenia: m => B.bloqueSeries(ctx, { id: 'calistenia', titulo: 'Calistenia', tipo: 'calistenia', minutos: m,
      familias: tipo === 'agilidad_calistenia' ? ['flexion', 'dominada', 'remo_invertido', 'sentadilla', 'plancha', 'fondos'] : CALISTENIA }),
    cardio: (m, def) => B.cardio(ctx, m, { moderado: !!def.moderado }),
    acondicionamiento: m => B.circuito(ctx, { minutos: m, pool: METABOLICO, n: 4 }),
    boxeo: m => B.boxeo(ctx, m),
    agilidad: m => B.agilidad(ctx, m),
    militar: m => B.militar(ctx, m),
    hiit: m => B.hiit(ctx, m),
    parkour: m => B.parkour(ctx, m),
    movilidad: m => B.movilidad(ctx, m),
    caminata: m => {
      const c = B.cardio({ ...ctx, fatiga: true }, m);
      if (c) { c.titulo = 'Caminata suave'; c.items = [{ ...c.items[0], ejercicioId: 'caminata', nombre: 'Caminata', minutos: c.minutos }]; }
      return c;
    },
  };
  const add = b => { if (b && b.items?.length) bloques.push(b); };
  // Sesiones muy cortas de fuerza: un único circuito con todo el tiempo
  const defs = corta && PLANTILLAS[tipo].grupo === 'fuerza' ? [{ d: 'fuerza', f: 1 }] : combinacion.bloques;
  for (const def of defs) add(construir[def.d]?.(Math.max(3, Math.round(T * def.f)), def));
  const primero = bloques.filter(b => b.formato === 'series').flatMap(b => b.items).find(i => ['rodilla', 'empuje_h', 'bisagra'].includes(ejercicioPorId[i.ejercicioId]?.patron));
  bloques.unshift(B.calentamiento(ctx, cal, primero?.ejercicioId));
  const grupos = [...new Set(bloques.flatMap(b => b.items).flatMap(i => ejercicioPorId[i.ejercicioId]?.principal || []))];
  bloques.push(B.enfriamiento(ctx, enf, grupos));

  // Explicación de cada ejercicio
  for (const b of bloques) for (const it of b.items) it.explicacion = explicar(it, b);
  const musculos = {};
  for (const b of bloques) for (const it of b.items) {
    const e = ejercicioPorId[it.ejercicioId]; const s = it.series || (b.vueltas || 1);
    e.principal.forEach(g => { musculos[g] = (musculos[g] || 0) + s; });
    e.secundarios.forEach(g => { musculos[g] = (musculos[g] || 0) + s * 0.5; });
  }

  const duracion = bloques.reduce((a, b) => a + b.minutos, 0);
  const faseInfo = FASES[ctx.fase - 1];
  const dificultad = ['Inicial', 'Básica', 'Intermedia', 'Exigente', 'Avanzada'][Math.max(0, ctx.fase - 1 - (ctx.descarga || ctx.fatiga ? 1 : 0))];
  return {
    version: 2,
    fecha: ctx.fecha,
    tipo,
    enfoque,
    nombre: combinacion.nombre,
    objetivo: objetivoTexto(tipo, enfoque),
    lugar: ctx.lugar,
    duracion,
    dificultad,
    fase: { numero: ctx.fase, nombre: faseInfo.nombre },
    periodizacion: ctx.per ? { mesociclo: ctx.per.mesociclo.nombre, semana: ctx.per.microciclo.semana, tipoSemana: ctx.per.microciclo.tipo } : null,
    recuperacion: ctx.recuperacion.estado,
    razones,
    combinacion: porQueCombinacion(combinacion, bloques),
    decisiones: ctx.decisiones,
    avisos,
    bloques,
    musculos,
  };
}
export const generarEntrenamiento = generateWorkout;

function objetivoTexto(tipo, enfoque) {
  const zona = { superior: 'del tren superior', inferior: 'de las piernas' }[enfoque] || 'en todo el cuerpo';
  return {
    fuerza_core: `Construir fuerza y músculo ${zona} y un core estable.`,
    fuerza_cardio: `Fuerza para conservar y ganar músculo ${zona} + cardio moderado para sumar gasto de energía.`,
    fuerza_metabolico: `Fuerza ${zona} + un circuito corto y cardio moderado: más gasto de energía con el volumen controlado.`,
    fuerza_acondicionamiento: 'Fuerza para conservar y ganar músculo + acondicionamiento para aumentar el gasto energético.',
    fuerza_calistenia: 'Fuerza de piernas y progresión en las habilidades de calistenia.',
    fuerza_boxeo: `Fuerza ${zona} + boxeo técnico para coordinación, pies y cardio por intervalos.`,
    calistenia_cardio: 'Fuerza relativa con el peso del cuerpo, cardio moderado y un core estable.',
    cardio_movilidad: 'Mejorar la capacidad cardiovascular y la movilidad sin castigar las articulaciones.',
    boxeo_cardio: 'Coordinación, técnica y cardio a través del boxeo, con un cierre de core.',
    agilidad_calistenia: 'Agilidad, coordinación y control del propio cuerpo.',
    militar: 'Capacidad de trabajo, resistencia y fuerza en circuito.',
    hiit_core: 'Intervalos intensos para mejorar la condición cardiovascular en poco tiempo.',
    recuperacion: 'Recuperar: mover el cuerpo suave para que llegue sangre a los músculos sin añadir fatiga.',
  }[tipo];
}

// "¿Por qué esta combinación?": qué objetivo cumple cada bloque y por qué va en ese orden (punto 35)
function porQueCombinacion(c, bloques) {
  const evidencia = id => { const a = afirmacion(id); return a ? { id: a.id, nivel: a.nivel, etiqueta: a.etiqueta, icono: a.icono } : null; };
  const porDisciplina = Object.fromEntries(c.explicacion.map(x => [x.d, x]));
  const fijos = {
    calentamiento: { funcion: DISCIPLINAS.calentamiento.funcion, porQue: 'Siempre primero: prepara el cuerpo y practica el primer ejercicio sin carga.', evidencia: evidencia('programa_completo') },
    enfriamiento: { funcion: DISCIPLINAS.enfriamiento.funcion, porQue: 'Siempre al final: baja las pulsaciones y empieza la recuperación.', evidencia: evidencia('programa_completo') },
  };
  return {
    objetivo: c.objetivo.nombre,
    clave: c.objetivo.clave,
    prioridades: c.objetivo.prioridades.map(p => p.que),
    bloques: bloques.map(b => {
      const clave = claveDisciplina(b);
      const x = fijos[clave] || porDisciplina[c.tipo === 'recuperacion' && clave === 'cardio' ? 'caminata' : clave] || {};
      return { titulo: b.titulo, disciplina: clave, funcion: x.funcion || '', porQue: x.porQue || '', evidencia: x.evidencia || null };
    }),
  };
}

// ¿Qué vas a hacer? ¿Qué trabaja? ¿Para qué sirve? ¿Cómo? ¿Qué evitar? ¿Cuánto? ¿Cuánto descansar?
function explicar(it, bloque) {
  const f = fichaEjercicio(it.ejercicioId);
  const trabaja = [...f.principal, ...f.secundarios].map(g => NOMBRES_GRUPO[g]).filter(Boolean);
  const capac = f.capacidades.map(c => ({ cardio: 'capacidad cardiovascular', movilidad: 'movilidad', equilibrio: 'equilibrio', coordinacion: 'coordinación', agilidad: 'agilidad' }[c]));
  let cuanto = it.texto
    || (it.intervalos ? `${it.intervalos.repeticiones} × (${it.intervalos.rapido / 60} min rápido + ${it.intervalos.suave / 60} min suave)` : '')
    || (it.minutos ? `${it.minutos} min` : '')
    || (bloque.formato === 'circuito' ? `${it.segundos} s por estación · ${bloque.vueltas} vueltas` : '')
    || (bloque.formato === 'rondas' ? bloque.resumen : '')
    || (it.segundos ? `${it.segundos} s${it.porLado ? ' por lado' : ''}` : '')
    || (it.reps ? `${it.series || 1} × ${it.reps}` : '');
  if (it.tempo) cuanto += ` · ${it.tempo}`;
  const descanso = it.descanso != null ? `${it.descanso} s entre series`
    : bloque.formato === 'circuito' ? `${bloque.descanso} s entre estaciones, ${bloque.descansoVuelta} s entre vueltas`
      : bloque.formato === 'rondas' ? `${bloque.rondas?.[0]?.descanso || 60} s entre rondas` : 'Sin pausas: es continuo';
  return {
    que: f.que,
    trabaja: trabaja.length ? trabaja.join(', ') : capac.join(', ') || 'Cuerpo completo',
    sirve: f.sirve,
    como: f.como,
    evitar: f.errores,
    respiracion: f.respiracion,
    sentir: f.sentir,
    cuanto,
    descanso,
    rpe: it.rpe ? `Esfuerzo objetivo: ${it.rpe} de 10 (que te queden 2–4 repeticiones en reserva)` : '',
    precauciones: f.precauciones,
  };
}

// ---------- FASE 3: la sesión como secuencia lineal de pasos ----------
// Cada paso: { tipo: 'bloque'|'ejercicio'|'descanso'|'ronda'|'intervalo', modo: 'reps'|'tiempo',
//   bloqueIdx, itemIdx, grupo, pideFeedback, ejercicioId, nombre, serie, de, lado, reps, segundos,
//   vuelta, vueltas, estacion, estaciones, combinacion, estimado (s), siguiente }
// grupo: unidad que se valora al terminar (un ejercicio por series, un circuito, unas rondas, un bloque de cardio).
const GUIADOS = ['calentamiento', 'enfriamiento', 'movilidad'];
const conCarga = id => /mancuernas|barra(?!_)|kettlebell|maquinas/.test(ejercicioPorId[id]?.equipo || '');

export function secuenciaEjecucion(w) {
  const pasos = [];
  const push = p => pasos.push(p);
  w.bloques.forEach((b, bi) => {
    const base = { bloque: b.id, bloqueIdx: bi, tituloBloque: b.titulo, tipoBloque: b.tipo, formato: b.formato };
    const guiado = GUIADOS.includes(b.tipo) || b.formato === 'guiado';
    push({ ...base, tipo: 'bloque', nombre: b.titulo, minutos: b.minutos, estimado: 4 });
    if (b.formato === 'rondas') {
      b.rondas.forEach((r, k) => {
        push({ ...base, tipo: 'ronda', modo: 'tiempo', grupo: `b${bi}`, pideFeedback: true, itemIdx: null,
          ejercicioId: r.ejercicioId, nombre: `Ronda ${r.numero}`, combinacion: r.combinacion, foco: r.foco,
          segundos: r.segundos, serie: r.numero, de: b.rondas.length, estimado: r.segundos });
        if (r.descanso) push({ ...base, tipo: 'descanso', grupo: `b${bi}`, segundos: r.descanso, estimado: r.descanso, entreRondas: true });
      });
    } else if (b.formato === 'circuito') {
      for (let v = 1; v <= b.vueltas; v++) {
        b.items.forEach((it, i) => {
          const seg = it.segundos ?? (it.minutos ? it.minutos * 60 : 30);
          push({ ...base, tipo: 'ejercicio', modo: 'tiempo', grupo: `b${bi}`, pideFeedback: true, itemIdx: i,
            ejercicioId: it.ejercicioId, nombre: it.nombre, segundos: seg, vuelta: v, vueltas: b.vueltas,
            estacion: i + 1, estaciones: b.items.length, nota: it.nota, estimado: seg });
          const ultimo = i === b.items.length - 1;
          const d = it.descanso ?? b.descanso;
          if (!ultimo && d) push({ ...base, tipo: 'descanso', grupo: `b${bi}`, segundos: d, estimado: d });
        });
        if (v < b.vueltas && b.descansoVuelta) push({ ...base, tipo: 'descanso', grupo: `b${bi}`, segundos: b.descansoVuelta, estimado: b.descansoVuelta, entreVueltas: true });
      }
    } else if (b.formato === 'intervalos') {
      const it = b.items[0], iv = it.intervalos;
      for (let k = 1; k <= iv.repeticiones; k++) {
        push({ ...base, tipo: 'intervalo', modo: 'tiempo', grupo: `b${bi}`, pideFeedback: true, itemIdx: 0, ejercicioId: it.ejercicioId,
          nombre: it.nombre, ritmo: 'vivo', segundos: iv.rapido, serie: k, de: iv.repeticiones, estimado: iv.rapido });
        push({ ...base, tipo: 'intervalo', modo: 'tiempo', grupo: `b${bi}`, pideFeedback: true, itemIdx: 0, ejercicioId: it.ejercicioId,
          nombre: it.nombre, ritmo: 'suave', segundos: iv.suave, serie: k, de: iv.repeticiones, estimado: iv.suave });
      }
    } else {
      b.items.forEach((it, ii) => {
        const series = it.series || 1;
        const grupo = guiado ? `b${bi}` : `b${bi}i${ii}`;
        const seg = it.segundos ?? (it.minutos ? it.minutos * 60 : null);
        const modo = it.reps != null ? 'reps' : 'tiempo';
        for (let s = 1; s <= series; s++) {
          const lados = it.porLado && (it.segundos || it.reps) ? ['izquierdo', 'derecho'] : [null];
          for (const lado of lados) {
            push({ ...base, tipo: 'ejercicio', modo, grupo, pideFeedback: !guiado, guiado, itemIdx: ii,
              ejercicioId: it.ejercicioId, nombre: it.nombre, lado, serie: s, de: series,
              reps: it.reps ?? null, segundos: modo === 'tiempo' ? (seg ?? 30) : null, descanso: it.descanso ?? null,
              tempo: it.tempo || '', nota: it.nota, pesoAplicable: !guiado && conCarga(it.ejercicioId),
              estimado: modo === 'reps' ? it.reps * 3.5 : (seg ?? 30) });
          }
          if (s < series && it.descanso) push({ ...base, tipo: 'descanso', grupo, segundos: it.descanso, estimado: it.descanso, entreSeries: true });
        }
      });
    }
  });
  const activos = ['ejercicio', 'ronda', 'intervalo'];
  pasos.forEach((p, i) => {
    p.indice = i;
    const sig = pasos.slice(i + 1).find(x => activos.includes(x.tipo));
    p.siguiente = sig ? { nombre: sig.nombre, ejercicioId: sig.ejercicioId, combinacion: sig.combinacion || null, grupo: sig.grupo } : null;
  });
  return pasos;
}

// Alternativas para "Cambiar ejercicio": mismo patrón de movimiento y, si es posible, mismo músculo principal.
export function alternativasPara(atleta, ejercicioId, lugar = 'casa') {
  const ctx = crearContexto(atleta, {}, { lugar });
  const ej = ejercicioPorId[ejercicioId];
  if (!ej) return [];
  const prog = atleta.progresion || {};
  const nivelOk = e => e.nivel <= ctx.fase || (prog[e.familia] && e.paso <= (prog[e.familia].pasoActual ?? 0));
  const comunes = e => e.principal.filter(g => ej.principal.includes(g)).length;
  return EJERCICIOS
    .filter(e => e.id !== ej.id && ctx.sel.disponible(e).ok && nivelOk(e) &&
      (e.patron === ej.patron || (comunes(e) > 0 && e.dosis === ej.dosis)) && e.dosis !== 'minutos' === (ej.dosis !== 'minutos'))
    .map(e => {
      const mismaFamilia = e.familia === ej.familia;
      const motivo = mismaFamilia && e.paso < ej.paso ? 'Versión más sencilla del mismo movimiento'
        : mismaFamilia ? 'Variante del mismo movimiento'
          : comunes(e) ? `Trabaja el mismo músculo (${e.principal.filter(g => ej.principal.includes(g)).map(g => NOMBRES_GRUPO[g].toLowerCase()).join(', ')})`
            : 'Mismo tipo de movimiento';
      const puntos = (mismaFamilia && e.paso < ej.paso ? 30 : mismaFamilia ? 20 : 0) + comunes(e) * 10 + (e.patron === ej.patron ? 5 : 0) - Math.abs(e.paso - ej.paso);
      return { ejercicio: e, motivo, puntos, equipo: e.equipo };
    })
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 5);
}

export { explicar };
