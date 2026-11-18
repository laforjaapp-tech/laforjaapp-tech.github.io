// CUESTIONARIO DE SOLO TOCAR: una pregunta por pantalla, opciones grandes y la app lee en voz alta.
// Cada respuesta se guarda al momento; si se cierra la app, sigue en la primera pregunta sin contestar.
// Por dentro el peso va en kg y la estatura en cm (lo que usa el motor); en pantalla, en lo que elija la persona.

import * as C from '../datos/catalogos.js';
import { esc, leerRuta, ponerRuta } from '../ui/componentes.js';
import { evaluarRiesgo } from '../motor/seguridad.js';
import { hablar, callar, configurarVoz, vozActiva, vozDisponible } from '../ui/voz.js';
import { htmlQuien } from '../ui/equipo.js';
import * as U from '../motor/unidades.js';

const QUIEN = 'movilidad';   // la guía de movilidad (Thamar o Lucas, ver ui/equipo.js) hace las preguntas
const CLAVE_VOZ = 'la-forja-voz-preguntas';
export function vozPreguntasGuardada() { try { return localStorage.getItem(CLAVE_VOZ) !== '0'; } catch { return true; } }
export function guardarVozPreguntas(on) { try { localStorage.setItem(CLAVE_VOZ, on ? '1' : '0'); } catch { /* sin almacenamiento */ } }

const BLOQUES = [
  { id: 'tu', icono: '👤', nombre: 'Tú' }, { id: 'meta', icono: '🎯', nombre: 'Meta' }, { id: 'salud', icono: '❤️', nombre: 'Salud' },
  { id: 'exp', icono: '💪', nombre: 'Experiencia' }, { id: 'tiempo', icono: '⏰', nombre: 'Tiempo' }, { id: 'dia', icono: '🌙', nombre: 'Día a día' },
];

// ---------- Opciones con dibujo ----------
const op = (id, icono, etiqueta, extra = {}) => ({ id, icono, etiqueta, ...extra });
const OBJ_ICONOS = {
  perder_grasa: '⚖️', bajar_peso: '📉', ganar_musculo: '💪', ganar_fuerza: '🏋️', tonificar: '✨', resistencia: '🔋', velocidad: '⚡', agilidad: '🤸',
  cardiovascular: '❤️', movilidad: '🧘', rendimiento_general: '🏅', preparacion_avanzada: '🔥', militar: '🎖️', calistenia: '🤾', pruebas_fisicas: '📋', mantener: '✅',
};
const OBJ_TEXTO = {
  perder_grasa: 'Bajar de peso y grasa', bajar_peso: 'Bajar de peso', ganar_musculo: 'Ganar músculo', ganar_fuerza: 'Ganar fuerza', tonificar: 'Tonificar',
  resistencia: 'Más resistencia', velocidad: 'Más velocidad', agilidad: 'Más agilidad', cardiovascular: 'Mejorar salud y resistencia', movilidad: 'Moverme mejor',
  rendimiento_general: 'Mejor forma física general', preparacion_avanzada: 'Preparación física avanzada', militar: 'Preparación tipo militar',
  calistenia: 'Calistenia', pruebas_fisicas: 'Prepararme para pruebas físicas', mantener: 'Mantenerme',
};
const PRINCIPALES = ['perder_grasa', 'ganar_musculo', 'ganar_fuerza', 'cardiovascular', 'movilidad', 'mantener'];
const objetivos = ids => ids.map(id => op(id, OBJ_ICONOS[id], OBJ_TEXTO[id]));
const OBJ_TODOS = C.OBJETIVOS.map(o => o.id);

const PAISES = [op('República Dominicana', '🇩🇴', 'República Dominicana'), op('Estados Unidos', '🇺🇸', 'Estados Unidos'), op('Puerto Rico', '🇵🇷', 'Puerto Rico'),
  op('España', '🇪🇸', 'España'), op('Otro', '🌎', 'Otro país')];
const ZONAS_OTRAS = ['Pie', 'Mano', 'Muslo', 'Pantorrilla', 'Barriga o hernia', 'Pecho', 'Otra zona'].map(z => op(z, '📍', z));
const LESION_ICONOS = { rodilla: '🦵', tobillo: '🦶', cadera: '🦴', espalda: '🔙', hombro: '💪', codo: '🦾', muneca: '✋', cuello: '🧣', otra: '➕' };
const EXPERIENCIA = [op('nunca', '🌱', 'Nunca he entrenado'), op('menos3m', '🐣', 'Menos de 3 meses'), op('3a6m', '📅', 'De 3 a 6 meses'),
  op('6a12m', '🗓️', 'De 6 meses a un año'), op('1a2a', '🏃', 'De 1 a 2 años'), op('mas2a', '🏆', 'Más de 2 años')];
const INACTIVIDAD = [op('activo', '🔥', 'Entreno ahora'), op('menos6m', '⏳', 'Menos de 6 meses'), op('6a12m', '📆', 'De 6 meses a un año'),
  op('1a5a', '🕰️', 'De 1 a 5 años'), op('mas5a', '💤', 'Más de 5 años')];
const LUGARES = [op('casa', '🏠', 'En casa'), op('gimnasio', '🏋️', 'En el gimnasio'), op('parque', '🌳', 'En un parque'), op('calle', '🛣️', 'En la calle')];
const EQUIPO_ICONOS = { ninguno: '🙌', colchoneta: '🧘', bandas: '🎗️', mancuernas: '🏋️', kettlebell: '🔔', barra: '➖', barra_dominadas: '🧗', banco: '🪑',
  cuerda: '🪢', bicicleta: '🚲', caminadora: '🏃', maquinas: '⚙️', saco: '🥊' };
const EQUIPO_TEXTO = { ninguno: 'Nada, solo mi cuerpo', mancuernas: 'Mancuernas (pesitas)', kettlebell: 'Pesa rusa (kettlebell)', barra: 'Barra de pesas', cuerda: 'Cuerda de saltar' };
const EQUIPO = C.EQUIPAMIENTO.filter(e => e.id !== 'otro').map(e => op(e.id, EQUIPO_ICONOS[e.id], EQUIPO_TEXTO[e.id] || e.etiqueta, { exclusivo: e.exclusivo }));
const EQUIPO_GIMNASIO = ['maquinas', 'barra', 'mancuernas', 'banco', 'kettlebell', 'barra_dominadas', 'caminadora', 'bicicleta', 'colchoneta', 'cuerda', 'bandas'];
const MINUTOS = [op(15, '⏱️', '15 minutos'), op(20, '⏱️', '20 minutos'), op(30, '⏱️', 'Media hora'), op(45, '⏱️', '45 minutos'),
  op(60, '🕐', '1 hora'), op(90, '🕜', 'Hora y media'), op(120, '🕑', 'Más de hora y media')];
const HORAS = [op('manana', '🌅', 'En la mañana'), op('mediodia', '☀️', 'Al mediodía'), op('tarde', '🌇', 'En la tarde'), op('noche', '🌙', 'En la noche'), op('igual', '🤷', 'Me da igual')];
const MOD_ICONOS = { fuerza: '🏋️', gimnasio: '🏢', casa: '🏠', calistenia: '🤸', cardio: '🏃', hiit: '⚡', funcional: '🔄', militar: '🎖️', boxeo: '🥊',
  agilidad: '🐇', velocidad: '💨', movilidad: '🧘', parkour: '🧗' };
const MOD_TEXTO = { casa: 'Ejercicio en casa', hiit: 'Intervalos intensos (HIIT)', funcional: 'Funcional', militar: 'Tipo militar' };
const MODALIDADES = [op('auto', '✨', 'No sé, elige tú', { exclusivo: true }),
  ...C.MODALIDADES.map(m => op(m.id, MOD_ICONOS[m.id], MOD_TEXTO[m.id] || m.etiqueta, { mas: !['fuerza', 'casa', 'cardio', 'movilidad', 'boxeo', 'calistenia'].includes(m.id) }))];
const ACTIVIDAD = [op('sedentaria', '🪑', 'Casi todo el día sentado'), op('ligera', '🚶', 'Camino un poco'), op('activa', '🧍', 'De pie o caminando mucho'), op('muy_activa', '🔨', 'Trabajo físico')];
const SUENO = [op(4, '😴', 'Menos de 5 horas'), op(5, '🛏️', '5 horas'), op(6, '🛏️', '6 horas'), op(7, '🛏️', '7 horas'), op(8, '🛏️', '8 horas'), op(9, '🛌', '9 horas o más')];
const CALIDAD = [op(1, '😫', 'Muy mal'), op(2, '😕', 'Mal'), op(3, '😐', 'Regular'), op(4, '🙂', 'Bien'), op(5, '😄', 'Muy bien')];
const CONDICIONES = [...C.CONDICIONES_MEDICAS.map(c => op(c.id, { cardiaca: '❤️', respiratoria: '🫁', metabolica: '🩸', articular: '🦴', neurologica: '🧠', otra: '➕' }[c.id],
  { cardiaca: 'Corazón o presión', respiratoria: 'De los pulmones, como asma', metabolica: 'Azúcar o tiroides, como diabetes', articular: 'Huesos o articulaciones', neurologica: 'Del cerebro, como epilepsia o derrame', otra: 'Otra' }[c.id])),
  op('nd', '🤐', 'Prefiero no decirlo', { exclusivo: true })];

// Preguntas de salud (Sí/No), con el texto corto del redactor
const SALUD = {
  corazon: '¿Algún médico te ha diagnosticado presión alta o problemas del corazón?',
  dolor_pecho: '¿Sientes dolor en el pecho, ya sea en reposo, en tu día a día o al hacer ejercicio?',
  mareo: '¿En el último año te has desmayado, o te has mareado tanto que perdiste el equilibrio?',
  cronica: '¿Tienes otra enfermedad crónica diagnosticada, aparte del corazón o la presión?',
  medicacion: '¿Tomas medicinas fijas, todos los días, para alguna enfermedad?',
  embarazo: '¿Estás embarazada o diste a luz en los últimos 6 meses?',
  cirugia: '¿Te operaron en los últimos 6 meses?',
};
const VOZ_SALUD = { cronica: 'Por ejemplo, diabetes o asma.' };

const esMujer = a => a.personal.sexo === 'mujer';
const conProblema = a => ['corazon', 'cronica', 'medicacion'].some(k => a.seguridad.cuestionario[k] === 'si');

// ---------- Las preguntas, en orden ----------
// tipo: texto | unica | varias | edad | peso | estatura | sino | aviso
const PREGUNTAS = [
  { id: 'nombre', bloque: 'tu', tipo: 'texto', ruta: 'personal.nombre', texto: '¿Cómo te llamas?', voz: '¿Cómo te llamas? Escribe tu nombre.', error: 'Escribe tu nombre.' },
  { id: 'sexo', bloque: 'tu', tipo: 'unica', ruta: 'personal.sexo', texto: '¿Eres hombre o mujer?', grande: true, opciones: [op('hombre', '👨', 'Hombre'), op('mujer', '👩', 'Mujer')] },
  { id: 'edad', bloque: 'tu', tipo: 'edad', ruta: 'personal.edad', texto: '¿Cuántos años tienes?', voz: a => `Mucho gusto, ${a.personal.nombre}. ¿Cuántos años tienes?` },
  { id: 'peso', bloque: 'tu', tipo: 'peso', ruta: 'personal.peso', texto: '¿Cuánto pesas ahora?', ayuda: 'Un número aproximado está bien. Es solo para ajustar tu plan.', voz: '¿Cuánto pesas ahora? Un número aproximado está bien. Es solo para ajustar tu plan.' },
  { id: 'estatura', bloque: 'tu', tipo: 'estatura', ruta: 'personal.estatura', texto: '¿Cuánto mides?' },
  { id: 'pais', bloque: 'tu', tipo: 'unica', ruta: 'personal.pais', texto: '¿En qué país vives?', opcional: true, opciones: PAISES },

  { id: 'principal', bloque: 'meta', tipo: 'unica', ruta: 'objetivos.principal', texto: '¿Qué es lo más importante para ti?', ayuda: 'Toca una. Después puedes añadir más.',
    opciones: objetivos([...PRINCIPALES, ...OBJ_TODOS.filter(o => !PRINCIPALES.includes(o))]).map(o => ({ ...o, mas: !PRINCIPALES.includes(o.id) })), verMas: 'Ver más metas' },
  { id: 'otrasMetas', bloque: 'meta', tipo: 'varias', texto: '¿Algo más que quieras lograr?', ayuda: 'Toca todas las que quieras, o salta.', opcional: true,
    opciones: a => objetivos(OBJ_TODOS.filter(o => o !== a.objetivos.principal)),
    leer: a => a.objetivos.seleccionados.filter(o => o !== a.objetivos.principal),
    poner: (a, v) => { a.objetivos.seleccionados = [a.objetivos.principal, ...v.filter(o => o !== a.objetivos.principal)]; } },

  ...Object.keys(SALUD).map((k, i) => ({
    id: `salud_${k}`, bloque: 'salud', tipo: 'sino', ruta: `seguridad.cuestionario.${k}`, texto: SALUD[k],
    antes: i === 0 ? 'Estas preguntas son para cuidarte.' : '', vozExtra: VOZ_SALUD[k] || '', ayuda: VOZ_SALUD[k] || '',
    si: k === 'embarazo' ? esMujer : null,
  })),
  { id: 'condiciones', bloque: 'salud', tipo: 'varias', ruta: 'seguridad.condiciones', texto: '¿De qué tipo es tu problema de salud?', ayuda: 'Solo para cuidarte. Toca una o varias.',
    voz: '¿De qué tipo es tu problema de salud? Puede ser del corazón o la presión, de los pulmones, del azúcar o la tiroides, de huesos o articulaciones, del cerebro, u otra. Toca una o varias.',
    si: conProblema, opciones: CONDICIONES,
    leer: a => (a.respondidas?.includes('condiciones') && !(a.seguridad.condiciones || []).length ? ['nd'] : a.seguridad.condiciones),
    poner: (a, v) => { a.seguridad.condiciones = v.filter(x => x !== 'nd'); } },
  { id: 'lesiones', bloque: 'salud', tipo: 'varias', ruta: 'seguridad.lesiones', texto: '¿Te duele algo o tienes alguna lesión ahora?', ayuda: 'Toca todas las zonas que te molesten.',
    opciones: [op('ninguna', '👍', 'Nada, estoy bien', { exclusivo: true }), ...C.LESIONES.map(l => op(l.id, LESION_ICONOS[l.id], l.id === 'otra' ? 'Otra zona' : l.etiqueta))] },
  { id: 'lesionOtra', bloque: 'salud', tipo: 'unica', ruta: 'seguridad.lesionOtra', texto: '¿En qué otra zona?', si: a => a.seguridad.lesiones.includes('otra'), opciones: ZONAS_OTRAS },

  { id: 'tiempo', bloque: 'exp', tipo: 'unica', ruta: 'experiencia.tiempo', texto: 'En toda tu vida, ¿cuánto tiempo has hecho ejercicio?', opciones: EXPERIENCIA },
  { id: 'inactividad', bloque: 'exp', tipo: 'unica', ruta: 'experiencia.inactividad', texto: '¿Cuánto tiempo llevas sin hacer ejercicio seguido?', si: a => a.experiencia.tiempo !== 'nunca', opciones: INACTIVIDAD },
  { id: 'lugares', bloque: 'exp', tipo: 'varias', ruta: 'experiencia.lugares', texto: '¿Dónde vas a entrenar?', ayuda: 'Toca uno o varios.', opciones: LUGARES },
  { id: 'equipo', bloque: 'exp', tipo: 'varias', ruta: 'equipamiento.items', texto: '¿Qué tienes para entrenar?',
    ayuda: 'Si no tienes nada, no pasa nada: con tu cuerpo basta.', voz: '¿Qué tienes para entrenar? Si no tienes nada, no pasa nada: con tu cuerpo basta. Toca todo lo que tengas.',
    si: a => !soloGimnasio(a), opciones: EQUIPO },

  { id: 'dias', bloque: 'tiempo', tipo: 'unica', ruta: 'disponibilidad.dias', texto: '¿Cuántos días a la semana puedes entrenar?', circulos: true,
    opciones: C.DIAS_SEMANA.map(n => op(n, '', String(n), { nota: n === 3 ? 'Recomendado' : '' })), voz: '¿Cuántos días a la semana puedes entrenar? Del uno al seis. Tres es lo recomendado para empezar.' },
  { id: 'minutos', bloque: 'tiempo', tipo: 'unica', ruta: 'disponibilidad.minutos', texto: '¿Cuánto tiempo tienes cada día?', opciones: MINUTOS,
    voz: '¿Cuánto tiempo tienes cada día? Desde 15 minutos hasta más de hora y media.' },
  { id: 'hora', bloque: 'tiempo', tipo: 'unica', texto: '¿A qué hora prefieres entrenar?', opciones: HORAS,
    leer: a => (a.disponibilidad.horarios?.[0] || (a.respondidas?.includes('hora') ? 'igual' : '')),
    poner: (a, v) => { a.disponibilidad.horarios = v === 'igual' ? [] : [v]; } },

  { id: 'modalidades', bloque: 'dia', tipo: 'varias', texto: '¿Qué tipo de ejercicio te llama la atención?', ayuda: 'Algunos se abren cuando tu cuerpo esté listo.', opciones: MODALIDADES, verMas: 'Ver más tipos',
    voz: '¿Qué tipo de ejercicio te llama la atención? Toca todos los que quieras. Si no sabes, toca: no sé, elige tú.',
    leer: a => (a.modalidadesAuto ? ['auto'] : a.modalidades), poner: (a, v) => { a.modalidadesAuto = v.includes('auto'); a.modalidades = a.modalidadesAuto ? modalidadesAuto(a) : v; } },
  { id: 'actividad', bloque: 'dia', tipo: 'unica', ruta: 'habitos.actividad', texto: '¿Cómo es tu día normal?', opciones: ACTIVIDAD },
  { id: 'sueno', bloque: 'dia', tipo: 'unica', ruta: 'habitos.suenoHoras', texto: '¿Cuántas horas duermes normalmente?', opciones: SUENO,
    voz: '¿Cuántas horas duermes normalmente? Desde menos de cinco hasta nueve o más.' },
  { id: 'calidad', bloque: 'dia', tipo: 'unica', ruta: 'habitos.calidadSueno', texto: '¿Qué tal duermes?', opcional: true, opciones: CALIDAD, caras: true },
  { id: 'riesgo', bloque: 'dia', tipo: 'aviso', texto: 'Antes de empezar', si: a => !!evaluarRiesgo(a).mensaje && evaluarRiesgo(a).nivel !== 'normal' },
];

const soloGimnasio = a => a.experiencia.lugares.length > 0 && a.experiencia.lugares.every(l => l === 'gimnasio');
function modalidadesAuto(a) {
  const l = a.experiencia.lugares;
  return ['fuerza', 'cardio', 'movilidad', ...(l.some(x => x !== 'gimnasio') || !l.length ? ['casa'] : []), ...(l.includes('gimnasio') ? ['gimnasio'] : [])];
}

const visible = (p, a) => !p.si || p.si(a);
const opcionesDe = (p, a) => (typeof p.opciones === 'function' ? p.opciones(a) : p.opciones || []);
function valorDe(p, a) { return p.leer ? p.leer(a) : p.ruta ? leerRuta(a, p.ruta) : null; }
function ponerValor(p, a, v) { if (p.poner) p.poner(a, v); else ponerRuta(a, p.ruta, v); }
const tieneValor = v => (Array.isArray(v) ? v.length > 0 : v != null && v !== '');
const respondida = (p, a) => p.tipo === 'aviso' ? a.respondidas?.includes(p.id) : (tieneValor(valorDe(p, a)) || (p.opcional && a.respondidas?.includes(p.id)));

// Datos que salen de varias respuestas: se recalculan siempre al avanzar
function completar(a) {
  const s = a.seguridad;
  // "¿Tienes alguna condición médica?" se deduce de las preguntas de salud.
  // A quien hizo el cuestionario antiguo (otra pregunta aparte) no se le quita la condición que declaró.
  const nuevo = a.respondidas?.includes('salud_corazon');
  s.tieneCondicion = conProblema(a) || (!nuevo && s.tieneCondicion === 'si') ? 'si' : 'no';
  if (s.tieneCondicion === 'no') s.condiciones = [];
  if (!esMujer(a)) delete s.cuestionario.embarazo;
  if (!s.lesiones.includes('otra')) s.lesionOtra = '';
  if (a.experiencia.tiempo === 'nunca') a.experiencia.inactividad = '';
  // Solo gimnasio: el equipo del gimnasio se pone solo (y se quita si luego elige entrenar también en otro sitio)
  if (soloGimnasio(a) && (a.equipoAuto || !a.equipamiento.items.length)) { a.equipamiento.items = EQUIPO_GIMNASIO; a.equipoAuto = true; }
  else if (!soloGimnasio(a) && a.equipoAuto) { a.equipamiento.items = []; a.equipoAuto = false; }
  if (a.modalidadesAuto) a.modalidades = modalidadesAuto(a);
  const o = a.objetivos;
  if (o.principal && !o.seleccionados.includes(o.principal)) o.seleccionados = [o.principal, ...o.seleccionados];
  o.seleccionados = o.seleccionados.filter((x, i, l) => l.indexOf(x) === i);
}

// Cuestionario terminado (también el de antes, de 10 pasos)
export const cuestionarioTerminado = a => !!a.cuestionarioHecho || (a.cuestionarioHecho == null && (a.pasoActual || 0) >= 10);

// ---------- Vista ----------
export function vistaCuestionario(raiz, atleta, { guardar, alTerminar, alSalir, empezarEnFinal = false }) {
  const a = atleta;
  a.unidades = U.unidadesDe(a);
  a.respondidas ||= [];
  const lista = () => PREGUNTAS.filter(p => visible(p, a));
  let indice = empezarEnFinal ? lista().length : Math.max(0, lista().findIndex(p => !respondida(p, a)));
  if (!empezarEnFinal && lista().every(p => respondida(p, a))) indice = lista().length;
  let verMas = false, turno = 0, avanzando = false;
  const reanuda = indice > 0 && indice < lista().length;
  configurarVoz(vozPreguntasGuardada());

  const guardarYa = () => { completar(a); return guardar(a); };
  const marcar = p => { if (!a.respondidas.includes(p.id)) a.respondidas.push(p.id); };

  async function avanzar(p) {
    if (avanzando) return;
    avanzando = true;
    marcar(p);
    await guardarYa();
    indice = lista().indexOf(p) + 1;
    verMas = false; avanzando = false;
    pintar();
  }
  async function atras() {
    callar();
    if (indice === 0) return alSalir();
    indice--; verMas = false;
    pintar();
  }

  function pintar(primeraVez = false, { callado = false } = {}) {
    turno++;
    const ps = lista();
    if (indice >= ps.length) return pintarFinal();
    const p = ps[indice];
    const bloque = BLOQUES.findIndex(b => b.id === p.bloque);
    const pct = Math.round((indice / ps.length) * 100);
    const animo = primeraVez && reanuda ? 'Seguimos donde lo dejaste.' : p.antes || animoDe(indice, ps.length);
    raiz.innerHTML = `<section class="pantalla cuestionario" data-tipo="${p.tipo}">
      <div class="cq-cabecera">
        <button type="button" class="cq-atras" id="cq-atras" aria-label="${indice === 0 ? 'Salir' : 'Pregunta anterior'}">←</button>
        <ol class="cq-bloques" aria-label="Avance">${BLOQUES.map((b, i) => `<li class="${i < bloque ? 'hecho' : i === bloque ? 'actual' : ''}" title="${b.nombre}"><span aria-hidden="true">${b.icono}</span><small>${b.nombre}</small></li>`).join('')}</ol>
        ${vozDisponible() ? `<button type="button" class="cq-voz${vozActiva() ? ' on' : ''}" id="cq-voz" aria-pressed="${vozActiva()}" aria-label="Leer en voz alta">${vozActiva() ? '🔊' : '🔇'}</button>` : ''}
      </div>
      <div class="progreso" aria-hidden="true"><div class="barra" style="width:${Math.max(3, pct)}%"></div></div>
      ${animo ? `<p class="cq-animo">${esc(animo)}</p>` : ''}
      <h1 class="cq-pregunta" id="cq-pregunta">${esc(p.texto)}</h1>
      ${p.ayuda ? `<p class="cq-ayuda">${esc(p.ayuda)}</p>` : ''}
      <div class="cq-cuerpo" id="cq-cuerpo">${cuerpo(p)}</div>
      <p class="error" id="cq-error" role="alert"></p>
      <div class="cq-pie">
        ${vozDisponible() ? '<button type="button" class="cq-repetir" id="cq-repetir">🔊 Repetir</button>' : '<span></span>'}
        ${p.opcional ? '<button type="button" class="cq-saltar" id="cq-saltar">Saltar →</button>' : ''}
        ${['varias', 'texto', 'edad', 'peso', 'estatura', 'aviso'].includes(p.tipo) ? `<button type="button" class="btn cq-listo" id="cq-listo">${p.tipo === 'aviso' ? 'Entendido →' : 'Listo ✓'}</button>`
          : tieneValor(valorDe(p, a)) ? '<button type="button" class="btn cq-listo" id="cq-listo">Seguir →</button>' : ''}
      </div>
    </section>`;
    montar(p);
    window.scrollTo(0, 0);
    if (!callado) leer(p, animo);
  }

  // ---- Cuerpo de cada tipo de pregunta ----
  function botonOpcion(o, elegida, p) {
    return `<button type="button" class="cq-op${elegida ? ' activo' : ''}${o.mas && !verMas && !elegida ? ' oculta' : ''}" data-v="${esc(o.id)}"${o.exclusivo ? ' data-exclusivo="1"' : ''} aria-pressed="${elegida}">
      ${o.icono ? `<span class="cq-op-icono" aria-hidden="true">${o.icono}</span>` : ''}<span class="cq-op-texto">${esc(o.etiqueta)}</span>${o.nota ? `<small class="cq-op-nota">${esc(o.nota)}</small>` : ''}
    </button>`;
  }
  function cuerpo(p) {
    const v = valorDe(p, a);
    switch (p.tipo) {
      case 'texto':
        return `<input class="cq-texto" id="cq-texto" type="text" autocomplete="given-name" maxlength="40" value="${esc(v || '')}" placeholder="Tu nombre">`;
      case 'unica': case 'varias': {
        const ops = opcionesDe(p, a), sel = p.tipo === 'varias' ? (v || []) : [v];
        const hayMas = ops.some(o => o.mas && !sel.includes(o.id));
        return `<div class="cq-opciones${p.grande ? ' grande' : ''}${p.circulos ? ' circulos' : ''}${p.caras ? ' caras' : ''}" data-multi="${p.tipo === 'varias' ? 1 : 0}">
          ${ops.map(o => botonOpcion(o, sel.includes(o.id), p)).join('')}</div>
          ${hayMas && !verMas ? `<button type="button" class="cq-vermas" id="cq-vermas">${esc(p.verMas || 'Ver más')} ▾</button>` : ''}`;
      }
      case 'sino':
        return `<div class="cq-opciones sino">${botonOpcion(op('no', '🙂', 'No'), v === 'no')}${botonOpcion(op('si', '✋', 'Sí'), v === 'si')}</div>`;
      case 'edad':
        return selectorNumero({ valor: v ?? 45, unidad: 'años', saltos: [40, 50, 60, 70] });
      case 'peso': {
        const u = a.unidades.peso;
        const inicial = v != null ? U.pesoEnUnidad(v, u) : (u === 'lb' ? (esMujer(a) ? 165 : 190) : (esMujer(a) ? 75 : 86));
        return interruptor('peso', [['lb', 'Libras'], ['kg', 'Kilos']], u) + selectorNumero({ valor: inicial, unidad: u === 'lb' ? 'libras' : 'kilos', pasos: [10, 1], decimales: u === 'kg' });
      }
      case 'estatura': {
        const u = a.unidades.estatura;
        if (u === 'cm') return interruptor('estatura', [['pies', 'Pies y pulgadas'], ['cm', 'Centímetros']], u) + selectorNumero({ valor: v ? Math.round(v) : (esMujer(a) ? 160 : 173), unidad: 'cm', pasos: [5, 1] });
        const pp = v ? U.piesPulgDe(v) : (esMujer(a) ? { pies: 5, pulg: 3 } : { pies: 5, pulg: 8 });
        return interruptor('estatura', [['pies', 'Pies y pulgadas'], ['cm', 'Centímetros']], u) + `
          <p class="cq-sub">Pies</p>
          <div class="cq-opciones circulos" data-grupo="pies">${[4, 5, 6, 7].map(n => botonOpcion(op(n, '', `${n}′`), pp.pies === n)).join('')}</div>
          <p class="cq-sub">Pulgadas</p>
          <div class="cq-opciones circulos chicos" data-grupo="pulg">${Array.from({ length: 12 }, (_, n) => botonOpcion(op(n, '', `${n}″`), pp.pulg === n)).join('')}</div>
          <p class="cq-resultado" id="cq-est">${pp.pies} pies ${pp.pulg} pulgadas</p>`;
      }
      case 'aviso': {
        const r = evaluarRiesgo(a);
        return `<div class="nota ${r.nivel === 'alerta' ? 'peligro' : 'precaucion'} cq-aviso">${r.nivel === 'alerta'
          ? 'Antes de pruebas o ejercicio intenso, necesitas el visto bueno de un médico. Mientras tanto, empezamos muy suave: caminar y movilidad.'
          : 'Coméntale a tu médico que vas a empezar a entrenar. Iremos con calma y con ejercicios de prueba muy suaves.'}</div>`;
      }
    }
    return '';
  }
  const interruptor = (q, ops, actual) => `<div class="cq-unidad" role="group" aria-label="Unidad">${ops.map(([id, t]) =>
    `<button type="button" data-unidad="${q}:${id}" class="${id === actual ? 'activo' : ''}" aria-pressed="${id === actual}">${t}</button>`).join('')}</div>`;
  const selectorNumero = ({ valor, unidad, saltos = [], pasos = [1], decimales = false }) => `
    <div class="cq-numero">
      <button type="button" class="cq-mas" data-suma="-${pasos[pasos.length - 1]}" aria-label="Menos ${pasos[pasos.length - 1]}">−</button>
      <label class="cq-valor"><input id="cq-num" type="text" inputmode="${decimales ? 'decimal' : 'numeric'}" value="${esc(String(valor).replace('.', ','))}" aria-label="${unidad}"><span>${unidad}</span></label>
      <button type="button" class="cq-mas" data-suma="${pasos[pasos.length - 1]}" aria-label="Más ${pasos[pasos.length - 1]}">+</button>
    </div>
    ${pasos.length > 1 ? `<div class="cq-saltos">${pasos.slice(0, -1).map(s => `<button type="button" data-suma="-${s}">−${s}</button><button type="button" data-suma="${s}">+${s}</button>`).join('')}</div>` : ''}
    ${saltos.length ? `<div class="cq-saltos">${saltos.map(s => `<button type="button" data-fijar="${s}">${s}</button>`).join('')}</div>` : ''}`;

  // ---- Eventos ----
  function montar(p) {
    const c = raiz.querySelector('#cq-cuerpo'), err = raiz.querySelector('#cq-error');
    const fallo = t => { err.textContent = t; vibrar(40); hablar(t, { quien: QUIEN, globo: false }); };
    raiz.querySelector('#cq-atras').onclick = atras;
    const bVoz = raiz.querySelector('#cq-voz');
    if (bVoz) bVoz.onclick = () => {
      const on = !vozActiva(); configurarVoz(on); guardarVozPreguntas(on);
      bVoz.textContent = on ? '🔊' : '🔇'; bVoz.classList.toggle('on', on); bVoz.setAttribute('aria-pressed', on);
      if (on) leer(p); else callar();
    };
    // Repetir: vuelve a leer sin borrar lo que ya marcó
    const bRep = raiz.querySelector('#cq-repetir');
    if (bRep) bRep.onclick = () => { if (!vozActiva()) { configurarVoz(true); guardarVozPreguntas(true); if (bVoz) { bVoz.textContent = '🔊'; bVoz.classList.add('on'); } } callar(); turno++; leer(p); };
    const bSaltar = raiz.querySelector('#cq-saltar');
    if (bSaltar) bSaltar.onclick = () => { callar(); avanzar(p); };
    raiz.querySelector('#cq-vermas')?.addEventListener('click', e => { verMas = true; c.querySelectorAll('.cq-op.oculta').forEach(b => b.classList.remove('oculta')); e.target.remove(); });

    if (p.tipo === 'unica' || p.tipo === 'sino') {
      c.querySelectorAll('.cq-opciones > .cq-op').forEach(b => b.onclick = () => {
        callar(); turno++;
        c.querySelectorAll('.cq-op').forEach(x => { x.classList.toggle('activo', x === b); x.setAttribute('aria-pressed', x === b); });
        vibrar(15);
        const o = [...opcionesDe(p, a), op('si'), op('no')].find(x => String(x.id) === b.dataset.v);
        ponerValor(p, a, o ? o.id : b.dataset.v);
        setTimeout(() => avanzar(p), 400);
      });
      raiz.querySelector('#cq-listo')?.addEventListener('click', () => { callar(); avanzar(p); });
    }
    if (p.tipo === 'varias') {
      const sel = new Set(valorDe(p, a) || []);
      const ops = opcionesDe(p, a);
      c.querySelectorAll('.cq-op').forEach(b => b.onclick = () => {
        callar(); turno++;
        const id = ops.find(o => String(o.id) === b.dataset.v).id;
        if (sel.has(id)) sel.delete(id);
        else {
          if (b.dataset.exclusivo) sel.clear();
          else ops.filter(o => o.exclusivo).forEach(o => sel.delete(o.id));
          sel.add(id);
        }
        c.querySelectorAll('.cq-op').forEach(x => { const on = sel.has(ops.find(o => String(o.id) === x.dataset.v).id); x.classList.toggle('activo', on); x.setAttribute('aria-pressed', on); });
        vibrar(15); err.textContent = '';
      });
      raiz.querySelector('#cq-listo').onclick = () => {
        if (!sel.size && !p.opcional) return fallo('Toca al menos una respuesta.');
        ponerValor(p, a, [...sel]); callar(); avanzar(p);
      };
    }
    if (p.tipo === 'texto') {
      const inp = c.querySelector('#cq-texto');
      const ok = () => {
        const t = inp.value.trim();
        if (!t) return fallo(p.error);
        ponerValor(p, a, t.charAt(0).toUpperCase() + t.slice(1)); callar(); avanzar(p);
      };
      raiz.querySelector('#cq-listo').onclick = ok;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
      if (!vozActiva()) inp.focus({ preventScroll: true });
    }
    if (['edad', 'peso'].includes(p.tipo) || (p.tipo === 'estatura' && a.unidades.estatura === 'cm')) {
      const inp = c.querySelector('#cq-num');
      const dec = p.tipo === 'peso' && a.unidades.peso === 'kg';
      c.querySelectorAll('[data-suma]').forEach(b => b.onclick = () => {
        const n = (U.leerNumero(inp.value) || 0) + Number(b.dataset.suma);
        inp.value = String(dec ? Math.round(n * 10) / 10 : Math.round(n)).replace('.', ',');
        vibrar(10); err.textContent = '';
      });
      c.querySelectorAll('[data-fijar]').forEach(b => b.onclick = () => { inp.value = b.dataset.fijar; vibrar(10); });
      inp.addEventListener('focus', () => inp.select());
      raiz.querySelector('#cq-listo').onclick = () => {
        const n = U.leerNumero(inp.value);
        if (p.tipo === 'edad') {
          if (!n || n < 14 || n > 100) return fallo('Revisa tu edad: entre 14 y 100 años.');
          ponerValor(p, a, Math.round(n));
        } else if (p.tipo === 'peso') {
          const u = a.unidades.peso, [mi, ma] = U.RANGO_PESO[u];
          if (!n || n < mi || n > ma) return fallo(`Revisa tu peso: entre ${mi} y ${ma} ${u === 'lb' ? 'libras' : 'kilos'}.`);
          ponerValor(p, a, U.kgDe(n, u));
        } else {
          if (!n || n < U.RANGO_CM[0] || n > U.RANGO_CM[1]) return fallo('Revisa tu estatura: entre 120 y 230 centímetros.');
          ponerValor(p, a, Math.round(n));
        }
        callar(); avanzar(p);
      };
    }
    if (p.tipo === 'estatura' && a.unidades.estatura === 'pies') {
      const pp = valorDe(p, a) ? U.piesPulgDe(valorDe(p, a)) : (esMujer(a) ? { pies: 5, pulg: 3 } : { pies: 5, pulg: 8 });
      c.querySelectorAll('[data-grupo] .cq-op').forEach(b => b.onclick = () => {
        callar(); turno++;
        const g = b.closest('[data-grupo]');
        g.querySelectorAll('.cq-op').forEach(x => x.classList.toggle('activo', x === b));
        pp[g.dataset.grupo] = Number(b.dataset.v);
        ponerValor(p, a, U.cmDe(pp.pies, pp.pulg));   // así no se pierde si cambia a centímetros
        c.querySelector('#cq-est').textContent = `${pp.pies} pies ${pp.pulg} pulgadas`;
        vibrar(10);
      });
      raiz.querySelector('#cq-listo').onclick = () => {
        const cm = U.cmDe(pp.pies, pp.pulg);
        if (cm < U.RANGO_CM[0] || cm > U.RANGO_CM[1]) return fallo('Revisa tu estatura.');
        ponerValor(p, a, cm); callar(); avanzar(p);
      };
    }
    c.querySelectorAll('[data-unidad]').forEach(b => b.onclick = () => {
      const [q, u] = b.dataset.unidad.split(':');
      if (a.unidades[q] === u) return;
      // Se pasa lo que ya estaba escrito a la otra unidad
      const inp = c.querySelector('#cq-num');
      // Si tocó la unidad, es que el número escrito está en la nueva unidad: se queda igual
      if (q === 'peso' && inp) { const n = U.leerNumero(inp.value); if (n) ponerValor(p, a, U.kgDe(n, u)); }
      if (q === 'estatura' && inp) { const n = U.leerNumero(inp.value); if (n) ponerValor(p, a, n); }
      a.unidades = { ...a.unidades, [q]: u };
      pintar(false, { callado: true });
    });
    if (p.tipo === 'aviso') raiz.querySelector('#cq-listo').onclick = () => { callar(); avanzar(p); };
  }

  // ---- Voz: lee la pregunta y, si son pocas, las opciones (resaltando la que lee) ----
  function leer(p, animo = '') {
    if (!vozActiva()) return;
    const mio = turno;
    const base = typeof p.voz === 'function' ? p.voz(a) : p.voz;
    const pregunta = [animo, base || p.texto, p.vozExtra].filter(Boolean).join(' ');
    const ops = ['unica', 'varias', 'sino'].includes(p.tipo) && !p.voz ? [...raiz.querySelectorAll('#cq-cuerpo > .cq-opciones > .cq-op:not(.oculta)')] : [];
    const cola = ops.length && ops.length <= 6 ? ops : [];
    let cierre = p.tipo === 'varias' ? 'Toca todas las que quieras.' : ['edad', 'peso'].includes(p.tipo) ? 'Usa los botones de más y menos.' : '';
    if (p.tipo === 'aviso') cierre = raiz.querySelector('.cq-aviso')?.textContent || '';
    if (p.tipo === 'unica' && ops.length > 6) cierre = 'Mira las opciones y toca la tuya.';
    hablar(pregunta, { quien: QUIEN, globo: false, alTerminar: () => siguiente(0) });
    function siguiente(i) {
      if (mio !== turno) return;
      raiz.querySelectorAll('.cq-op.leyendo').forEach(b => b.classList.remove('leyendo'));
      if (i < cola.length) {
        const b = cola[i];
        return hablar(b.querySelector('.cq-op-texto').textContent, { quien: QUIEN, globo: false, interrumpir: false,
          alEmpezar: () => { if (mio === turno) b.classList.add('leyendo'); }, alTerminar: () => siguiente(i + 1) });
      }
      if (cierre && i === cola.length) hablar(cierre, { quien: QUIEN, globo: false, interrumpir: false });
    }
  }

  // ---- Final: resumen y seguir ----
  function pintarFinal() {
    turno++;
    completar(a);
    const ps = lista();
    const capsula = (id, texto) => `<button type="button" class="cq-capsula" data-ir="${id}">${esc(texto)} <span aria-hidden="true">✎</span></button>`;
    const etq = (ops, v) => ops.find(o => String(o.id) === String(v))?.etiqueta || '';
    const r = evaluarRiesgo(a);
    raiz.innerHTML = `<section class="pantalla cuestionario final">
      <div class="progreso" aria-hidden="true"><div class="barra" style="width:100%"></div></div>
      <h1 class="cq-pregunta">¡Listo, ${esc(a.personal.nombre)}! Ya te conocemos.</h1>
      <p class="cq-ayuda">${r.nivel === 'alerta' ? 'Empezamos suave, mientras hablas con tu médico.' : 'Tu plan ya está listo. Si quieres afinarlo, haz 3 pruebas sencillas.'}</p>
      <p class="cq-sub">Toca cualquier dato para cambiarlo:</p>
      <div class="cq-resumen">
        ${capsula('edad', `${a.personal.edad} años`)}
        ${capsula('peso', U.fmtPeso(a.personal.peso, a))}
        ${capsula('estatura', U.fmtEstatura(a.personal.estatura, a))}
        ${capsula('principal', `🎯 ${OBJ_TEXTO[a.objetivos.principal] || ''}`)}
        ${capsula('lugares', a.experiencia.lugares.map(l => etq(LUGARES, l)).join(' · '))}
        ${capsula('dias', `${a.disponibilidad.dias} días a la semana`)}
        ${capsula('minutos', etq(MINUTOS, a.disponibilidad.minutos))}
        ${capsula('lesiones', a.seguridad.lesiones.includes('ninguna') ? 'Sin lesiones' : 'Molestias: ' + a.seguridad.lesiones.map(l => l === 'otra' ? a.seguridad.lesionOtra || 'otra' : C.etiquetaDe(C.LESIONES, l)).join(', '))}
      </div>
      <div class="cq-pie final">
        <button type="button" class="cq-atras texto" id="cq-atras">← Atrás</button>
        <button type="button" class="cq-capsula" id="cq-pruebas">🧪 Hacer 3 pruebas (10 min)</button>
        <button type="button" class="btn grande" id="cq-seguir">▶ Ver mi plan</button>
      </div>
    </section>`;
    raiz.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => { indice = ps.findIndex(p => p.id === b.dataset.ir); pintar(); });
    raiz.querySelector('#cq-atras').onclick = () => { indice = ps.length - 1; pintar(); };
    const terminar = async pruebas => { callar(); a.cuestionarioHecho = true; await guardarYa(); alTerminar({ pruebas }); };
    raiz.querySelector('#cq-seguir').onclick = () => terminar(false);
    raiz.querySelector('#cq-pruebas').onclick = () => terminar(true);
    window.scrollTo(0, 0);
    hablar(`¡Listo, ${a.personal.nombre}! Ya te conocemos. Si algo está mal, tócalo para cambiarlo. Si todo está bien, toca ver mi plan.`, { quien: QUIEN, globo: false });
  }

  pintar(true);
  return () => { turno++; callar(); };
}

function animoDe(i, total) {
  if (i === 0) return '';
  if (i === total - 1) return 'Última pregunta.';
  const pct = i / total, ant = (i - 1) / total;
  if (ant < 0.25 && pct >= 0.25) return 'Buen comienzo.';
  if (ant < 0.5 && pct >= 0.5) return 'Ya vas por la mitad.';
  if (ant < 0.75 && pct >= 0.75) return '¡Ya casi!';
  return '';
}
const vibrar = ms => { try { navigator.vibrate?.(ms); } catch { /* sin vibración */ } };

// Para el que lo abre por primera vez: quién pregunta
export const htmlAnfitriona = texto => htmlQuien(QUIEN, { texto });
