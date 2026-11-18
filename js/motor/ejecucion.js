// FASE 3: lo que ocurre durante y después del entrenamiento guiado.
// Resumen, calorías aproximadas, mensajes, recuperación y traducción de lo realizado a datos para el motor.

import { ejercicioPorId } from '../datos/ejercicios.js';
import { sumarDias } from './calculos.js';
import { metaAgua } from './hidratacion.js';

// ---------- Motivación (sin repetir seguido) ----------
// Frases de la voz: ánimo de gimnasio con tigueraje dominicano y humor sano, siempre con respeto.
// Animan a dar un poco más, pero nunca a ignorar el dolor (revisado por readaptación y por el publicista).
const FRASES = {
  trabajo: ['¡Vamos!', 'Controla el movimiento.', 'Excelente trabajo.', '¡No pierdas la técnica!', 'Respira.', 'Recuerda por qué comenzaste.', 'Cada repetición cuenta.', 'Calidad antes que velocidad.', 'Tú puedes con esto.', 'Firme y controlado.',
    '¡No te pares!', '¡Eso es, sigue así!', '¡Buen ritmo!', '¡Con todo!', '¡Así se hace!', '¡Dale, que tú puedes!', '¡Mantén la postura!', '¡Aquí no se afloja la técnica!', '¡Hoy le ganas al de ayer!', '¡Vamo arriba!', '¡Tú tá duro!', '¡Sin miedo al éxito!'],
  final: ['Una repetición más.', 'Ya casi.', 'Termina bien, con técnica.', '¡Vamos, falta poco!', '¡No te canses ahora!', '¡Las últimas, las más limpias!', '¡Dale, mi pana, que ya casi!', '¡Controlado hasta el final!',
    '¡Ya lo tienes en el bolsillo, no lo sueltes!', '¡Esto ya es de bajada!', '¡Lo último se hace con orgullo!'],
  // Mientras la figura cuenta las repeticiones
  empuje: ['¡Vamos!', '¡No te pares!', '¡Eso es!', '¡Tú puedes!', '¡Fuerza!', '¡Firme y respirando!', '¡Buen ritmo!', '¡Así se hace!', '¡No aflojes!', '¡Dale, dale!', '¡Ahí mismo!', '¡Con técnica!', '¡Respira y sigue!', '¡Pa lante, que tú puedes!',
    '¡Hoy sí se puede!', '¡Una más que ayer!', '¡Un poquito más que la semana pasada!', '¡Músculo cansado, técnica firme!', '¡Termina lo que empezaste!', '¡Cada repetición limpia es fuerza que se queda!',
    '¡Dale, que esto es tuyo!', '¡Con calma, pero sin parar!', '¡Tú no viniste a mirar, viniste a darle!', '¡Así mismo, ahí es!',
    // Tigueraje dominicano (con respeto)
    '¡Dale, mi pana!', '¡Vamo arriba!', '¡Tú tá duro!', '¡Eso tá jevi!', '¡Rómpela!', '¡Sin miedo al éxito!', '¡Ponte pa tu número!', '¡Mete mano, que tú puedes!', '¡Sácale el jugo!', '¡Tú tá en algo!', '¡Ahí, ahí, a lo grande!'],
  descanso: ['Respira.', 'Recupera.', 'Prepárate para la siguiente serie.', 'El descanso también forma parte del entrenamiento.', 'Suelta los hombros y respira hondo.', 'Bebe un poco de agua.',
    'Descansa: el descanso también construye.', 'Toma agüita, que esto sigue.', 'Recupera bien; el sofá, después de la ducha.', 'Respira, que el aire es gratis.', 'Sacude los brazos, que ahorita volvemos.',
    'Respira con calma, que aquí nadie está apurado.', 'Bebe tu agüita, que te la ganaste.', 'Cansancio sí, dolor no. Si algo duele de verdad, para.', 'Mueve los hombros, que ahorita seguimos.'],
  // Con humor, para acompañar y sacar una sonrisa sin perder el ritmo
  jocoso: ['¡Sudas porque estás trabajando!', '¡Si fuera fácil, todo el mundo estuviera en forma!', '¡El sofá puede esperar!', '¡Tus músculos trabajan y tú los diriges!',
    '¡Esa ropa va a tener que acostumbrarse a ti!', '¡Ni el apagón te para!', '¡Cada día te mueves mejor!', '¡Mañana te vas a acordar de mí, pero con orgullo!',
    '¡Ese esfuerzo de hoy es la fuerza de mañana!', '¡Que se entere el barrio de que estás entrenando!', '¡Con más ganas que un motoconcho en hora pico!', '¡El dominó puede esperar, esto no!'],
};
const ultimas = [];
// Qué dice la voz en cada repetición: el número y, en los momentos clave, ánimo de gimnasio.
// sexo: para decir "campeón" o "campeona". Devuelve { texto, fuerte } (fuerte = frase de ánimo, se dice aunque corte otra).
// regalo: al llegar a la meta se ofrece una repetición más "de regalo" (solo a quien puede: ver regaloPermitido en entrenar.js)
export function animoRepeticion(k, meta, sexo = 'hombre', { regalo = false, cuidado = '' } = {}) {
  const campeon = (sexo === 'mujer' ? ['campeona', 'guerrera', 'mi reina'] : ['campeón', 'tíguere', 'mi pana'])[k % 3];
  const faltan = meta - k;
  if (k > meta) return { texto: `¡Bien hecha, ${campeon}! Si la hiciste, toca el botón de más para sumarla. Serie completada.`, fuerte: true };
  if (k === meta) return regalo
    ? { texto: `¡${k}! ¡Eso es! Si te sale limpia y sin dolor, regálame una más. Si no, serie completada.`, fuerte: true }
    : { texto: `¡${k}! ¡Eso es, ${campeon}! Serie lista. Toca el botón de serie completada.`, fuerte: true };
  if (k === 1) return { texto: cuidado ? `1. ${cuidado}` : `1. ¡Arrancamos! Yo cuento contigo.`, fuerte: true };
  if (faltan === 1) return { texto: `${k}. ¡La última de la serie, dale!`, fuerte: true };
  if (faltan === 3 && meta >= 6) return { texto: `${k}. ¡Tres más, bien hechas!`, fuerte: true };
  if (faltan === 5 && meta >= 10) return { texto: `${k}. ¡Faltan cinco, vamos!`, fuerte: true };
  if (k === Math.floor(meta / 2) && meta >= 8) return { texto: `${k}. ¡Ya vas por la mitad, lo que queda es de bajada!`, fuerte: true };
  if (k > 1 && k % 3 === 0) return { texto: `${k}. ${paraSexo(frase(k % 6 === 0 ? 'jocoso' : 'empuje'), sexo)}`, fuerte: true };
  return { texto: String(k), fuerte: false };
}

// Las frases van igual para hombre y mujer; solo cambia la terminación donde hace falta
export const paraSexo = (t, sexo) => (sexo === 'mujer' ? t.replace('tá duro', 'tá dura') : t);

export function frase(tipo) {
  const lista = FRASES[tipo] || FRASES.trabajo;
  const opciones = lista.filter(f => !ultimas.includes(f));
  const f = (opciones.length ? opciones : lista)[Math.floor(Math.random() * (opciones.length || lista.length))];
  ultimas.push(f); if (ultimas.length > 4) ultimas.shift();
  return f;
}

// ---------- Categorías del resumen ----------
const CATEGORIA = {
  fuerza: 'fuerza', calistenia: 'fuerza',
  cardio: 'cardio', hiit: 'cardio', boxeo: 'cardio', acondicionamiento: 'cardio', militar: 'cardio', agilidad: 'cardio',
  core: 'core',
  calentamiento: 'movilidad', enfriamiento: 'movilidad', movilidad: 'movilidad', parkour: 'movilidad',
};

// ---------- Calorías: MET × peso (kg) × horas. Solo es una estimación. ----------
const MET_BLOQUE = { calentamiento: 3.5, enfriamiento: 2.3, movilidad: 2.5, fuerza: 5, calistenia: 5, core: 3.8, acondicionamiento: 8, hiit: 8, militar: 7, boxeo: 7, agilidad: 6, parkour: 5 };
const MET_CARDIO = { caminata: 3.5, caminata_rapida: 4.3, caminata_inclinada: 6, marcha_sitio: 4, step_aerobico: 5, bicicleta: 6, trote_suave: 7, carrera_continua: 9, saltar_cuerda: 10, marcha_rapida: 4.5, marcha_mochila: 6 };

export function estimarCalorias(segundosPorPaso, pesoKg) {
  if (!pesoKg || pesoKg < 30) return null;
  let kcal = 0;
  for (const { paso, segundos } of segundosPorPaso) {
    const met = paso.tipoBloque === 'cardio' ? (MET_CARDIO[paso.ejercicioId] || 5) : (MET_BLOQUE[paso.tipoBloque] || 4);
    kcal += met * pesoKg * (segundos / 3600);
  }
  return Math.round(kcal / 10) * 10;
}

// ---------- Resumen de lo realizado ----------
// ej: estado de ejecución guardado por la pantalla de entrenamiento
export function resumenEjecucion(pasos, ej, pesoKg) {
  const activos = pasos.filter(p => ['ejercicio', 'ronda', 'intervalo'].includes(p.tipo));
  const total = activos.reduce((a, p) => a + p.estimado, 0) || 1;
  const hechos = new Set(ej.hechos || []);
  const hecho = activos.filter(p => hechos.has(p.indice)).reduce((a, p) => a + p.estimado, 0);
  const grupos = Object.values(ej.grupos || {});
  const principales = grupos.filter(g => !g.guiado && g.series.length);
  const series = principales.reduce((a, g) => a + g.series.length, 0);
  const repeticiones = principales.reduce((a, g) => a + g.series.reduce((s, x) => s + (x.reps || 0), 0), 0);
  const categorias = { fuerza: 0, cardio: 0, core: 0, movilidad: 0 };
  const tiempos = [];
  for (const p of pasos) {
    if (!hechos.has(p.indice) || p.tipo === 'descanso') continue;
    const seg = ej.segundosPaso?.[p.indice] ?? p.estimado;
    const cat = CATEGORIA[p.tipoBloque];
    if (cat) categorias[cat] += seg / 60;
    tiempos.push({ paso: p, segundos: seg });
  }
  // los descansos de cada bloque también cuentan como tiempo de sesión para la estimación de gasto
  for (const p of pasos) if (p.tipo === 'descanso' && hechos.has(p.indice)) tiempos.push({ paso: { ...p, tipoBloque: 'enfriamiento' }, segundos: ej.segundosPaso?.[p.indice] ?? p.estimado });
  const duracionSeg = Math.max(0, Math.round(((ej.fin ? new Date(ej.fin) : new Date()) - new Date(ej.inicio)) / 1000 - (ej.pausadoSeg || 0)));
  return {
    duracionSeg,
    porcentaje: Math.min(100, Math.floor((hecho / total) * 100)),
    ejercicios: principales.length,
    series,
    repeticiones,
    categorias,
    calorias: estimarCalorias(tiempos, pesoKg),
  };
}

export function mensajeFinal(porcentaje) {
  if (porcentaje >= 100) return 'Excelente trabajo. Completaste el 100 % de la sesión.';
  if (porcentaje >= 80) return `Muy buen entrenamiento: completaste el ${porcentaje} % de la sesión. Lo que hiciste cuenta.`;
  return 'Hoy no completaste toda la sesión. No pasa nada. Registramos lo realizado y adaptaremos el próximo entrenamiento.';
}

// ---------- Datos para el motor (FASE 2) ----------
const RPE_SENSACION = { muy_facil: 4, facil: 5, adecuado: 6.5, dificil: 8, muy_dificil: 9.5 };

export function resultadoParaMotor(workout, ej, { energia = null, esfuerzo = null } = {}) {
  const ejercicios = {};
  let dolor = false, problemas = false, completas = true;
  const sensaciones = [];
  for (const g of Object.values(ej.grupos || {})) {
    if (!g.feedback || g.guiado) continue;
    const fb = g.feedback;
    if (fb.dolor === 'si') dolor = true;
    sensaciones.push(fb.sensacion);
    if (g.formato !== 'series') continue;   // circuitos, rondas e intervalos: cuentan para la valoración general
    const objetivoSeries = g.objetivo.series * (g.objetivo.porLado ? 2 : 1);
    const hechas = g.series.length;
    const repsOk = g.series.every(s => g.objetivo.reps != null ? (s.reps ?? 0) >= g.objetivo.reps : (s.segundos ?? 0) >= g.objetivo.segundos * 0.9);
    const seriesCompletas = hechas >= objetivoSeries;
    const repsCompletas = repsOk && fb.repsCompletas !== 'no';
    if (!seriesCompletas || !repsCompletas) completas = false;
    if (fb.tecnica !== 'si') problemas = true;
    ejercicios[g.ejercicioId] = {
      sensacion: fb.sensacion,
      seriesCompletas, repsCompletas,
      completo: seriesCompletas && repsCompletas,
      problemas: fb.tecnica !== 'si',
      tecnica: fb.tecnica,
      dolor: fb.dolor === 'si',
      rpe: RPE_SENSACION[fb.sensacion] ?? 6.5,
      objetivo: g.objetivo.reps != null ? `${g.objetivo.series} × ${g.objetivo.reps}` : `${g.objetivo.series} × ${g.objetivo.segundos} s`,
      repsHechas: g.series.map(s => s.reps ?? (s.segundos != null ? `${s.segundos} s` : null)),
      peso: Math.max(0, ...g.series.map(s => s.peso || 0)) || null,
    };
  }
  const rpes = sensaciones.map(s => RPE_SENSACION[s]).filter(Boolean);
  const moda = sensaciones.sort((a, b) => sensaciones.filter(x => x === b).length - sensaciones.filter(x => x === a).length)[0];
  return {
    estricto: true,
    general: {
      sensacion: moda || 'adecuado',
      seriesCompletas: completas, repsCompletas: completas, problemas,
      energia: energia ?? 7,
      esfuerzo: esfuerzo ?? (rpes.length ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length) : 6),
      dolor,
    },
    ejercicios,
  };
}

// ---------- Recuperación ----------
const hora = d => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
const dia = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });

// metaMl: la meta de agua de hoy ya calculada (aguaDelDia: clima, entrenamiento y meta personal)
export function recomendacionesRecuperacion(atleta, workout, resumen, fin = new Date(), metaMl = null) {
  const litros = String(Math.round((metaMl ?? metaAgua(atleta).ml) / 100) / 10).replace('.', ',');
  const comida = new Date(fin.getTime() + 2 * 3600e3);
  const separacion = Math.max(1, Math.round(7 / (atleta.disponibilidad?.dias || 3)));
  const proxima = sumarDias(workout.fecha, separacion);
  const enfrio = resumen.categorias.movilidad > 0;
  return [
    { icono: '💧', titulo: 'Hidratación', texto: `Bebe unos 400–600 ml de agua en la próxima hora. Tu meta del día: unos ${litros} litros.` },
    { icono: '🧘', titulo: 'Enfriamiento', texto: enfrio ? 'Ya hiciste el enfriamiento. Si notas rigidez, 5 minutos más de estiramientos suaves.' : 'Haz 5 minutos de caminata suave y estiramientos antes de sentarte.' },
    { icono: '🍽️', titulo: 'Alimentación', texto: fin.getHours() >= 21 || fin.getHours() < 5
      ? 'Si ya es tarde, algo ligero con proteína (un yogur, un vaso de leche o huevo) antes de dormir, y desayuno completo mañana.'
      : `Haz una comida con proteína (huevo, pollo, pescado, legumbres o lácteos) y verduras antes de las ${hora(comida)}.` },
    { icono: '😴', titulo: 'Descanso', texto: `Esta noche, entre 7 y 9 horas de sueño: es cuando el músculo se recupera. Próximo entrenamiento recomendado: ${dia(proxima)}.` },
  ];
}

// Peso usado la última vez en un ejercicio (para proponerlo de nuevo)
export function pesoAnterior(atleta, ejercicioId) {
  const fam = ejercicioPorId[ejercicioId]?.familia;
  const e = atleta.progresion?.[fam];
  return e && e.ejercicioId === ejercicioId ? e.ultimoPeso || null : null;
}
