// Estrategia del atleta: qué modalidades se activan y en qué etapa, cómo se reparten
// los días y la periodización por bloques. Cada decisión lleva su razón.

import { NIVELES, MODALIDADES, etiquetaDe } from '../datos/catalogos.js';
import { hoyISO, sumarDias } from './calculos.js';

const nivelMin = (perfil, min) => NIVELES[perfil.nivel].orden >= NIVELES[min].orden;
const pt = (perfil, k) => perfil.puntuaciones[k] ?? 0;

const OBJ_FUERZA = ['ganar_fuerza', 'ganar_musculo', 'calistenia'];
const OBJ_CARDIO = ['resistencia', 'cardiovascular', 'militar', 'pruebas_fisicas', 'velocidad', 'agilidad'];

// ---------- Desbloqueo progresivo de modalidades ----------
// estado: 'activo' | 'progresivo' (empieza en una etapa básica) | 'bloqueado' | 'no_disponible'
export function desbloqueos(atleta, perfil, riesgo) {
  const eq = atleta.equipamiento?.items || [];
  const lugares = atleta.experiencia?.lugares || [];
  const alerta = riesgo.nivel === 'alerta';
  const evita = m => riesgo.evitar.has(m);
  const flex = atleta.pruebas?.flexiones;
  const flexNormales = flex?.variante === 'normal' ? flex.reps : 0;
  const dominadas = atleta.pruebas?.dominadas?.reps ?? 0;
  const r = {};

  const gym = lugares.includes('gimnasio') || eq.includes('maquinas') || eq.includes('barra');
  r.fuerza = { estado: 'activo', etapa: alerta ? 'Movimientos básicos sin carga' : 'Patrones básicos con técnica', motivo: 'La base de todo el programa.' };
  r.casa = { estado: 'activo', etapa: 'Peso corporal y material disponible', motivo: 'Funciona incluso sin ningún equipamiento.' };
  r.gimnasio = gym
    ? { estado: 'activo', etapa: alerta ? 'Máquinas guiadas, cargas ligeras' : 'Máquinas y pesos libres', motivo: 'Tienes acceso a gimnasio o material de carga.' }
    : { estado: 'no_disponible', motivo: 'No indicaste acceso a gimnasio ni barras: se trabaja la fuerza en casa.' };
  r.movilidad = { estado: 'activo', etapa: 'Diaria', motivo: 'Mejora la técnica y protege las articulaciones.' };

  // Calistenia por niveles
  let cal = 'Inicial: flexiones inclinadas, sentadillas, plancha, zancadas';
  if (dominadas >= 5 && flexNormales >= 20) cal = 'Avanzado: dominadas, fondos y variaciones avanzadas';
  else if (flexNormales >= 8) cal = 'Intermedio: flexiones normales, fondos adaptados, dominadas asistidas';
  r.calistenia = { estado: alerta ? 'bloqueado' : 'progresivo', etapa: cal,
    motivo: alerta ? 'Pendiente de valoración médica.' : 'Se desbloquean progresiones según tus repeticiones.',
    requisito: 'Siguiente nivel: 8 flexiones normales seguidas; después 20 flexiones y 5 dominadas.' };

  // Cardio
  const cardioEtapa = alerta || riesgo.bajoImpacto || pt(perfil, 'cardio') < 40
    ? 'Base: caminata, caminata rápida, bicicleta (bajo impacto)'
    : pt(perfil, 'cardio') < 65 ? 'Continuo: carrera suave y caminata rápida' : 'Intervalos y carrera';
  r.cardio = { estado: 'activo', etapa: cardioEtapa, motivo: 'La intensidad sube de forma gradual.' };

  // HIIT
  const hiitOk = !alerta && riesgo.nivel === 'normal' && nivelMin(perfil, 'intermedio') && pt(perfil, 'cardio') >= 50;
  r.hiit = hiitOk
    ? { estado: 'progresivo', etapa: evita('saltos') ? 'Intervalos de bajo impacto (bici, marcha rápida, sin saltos)' : 'Intervalos cortos', motivo: 'Tienes base cardiovascular suficiente.' }
    : { estado: 'bloqueado', motivo: 'Primero construimos la base aeróbica.', requisito: 'Cardio 50/100, nivel intermedio y terminar el mes de adaptación.' };

  r.funcional = { estado: alerta ? 'bloqueado' : 'progresivo', etapa: 'Patrones: empujar, tirar, agacharse, cargar, girar', motivo: 'Se integra poco a poco en circuitos.' };

  // Militar (solo condición física)
  r.militar = alerta
    ? { estado: 'bloqueado', motivo: 'Pendiente de valoración médica.' }
    : nivelMin(perfil, 'avanzado') && pt(perfil, 'core') >= 60 && !evita('arrastres')
      ? { estado: 'progresivo', etapa: 'Avanzado: marcha con carga ligera, circuitos por tiempo, arrastres en superficie segura', motivo: 'Tienes base de fuerza y core.' }
      : nivelMin(perfil, 'intermedio')
        ? { estado: 'progresivo', etapa: 'Intermedio: circuitos por tiempo y carrera', motivo: 'Base suficiente para circuitos.', requisito: 'Nivel avanzado y core 60/100 para marcha con carga.' }
        : { estado: 'progresivo', etapa: 'Base: marcha, flexiones, sentadillas, zancadas en circuitos suaves', motivo: 'Empezamos por la base.', requisito: 'Nivel intermedio para circuitos por tiempo.' };

  // Boxeo como acondicionamiento
  const saco = eq.includes('saco') && !evita('golpeo_saco');
  r.boxeo = alerta
    ? { estado: 'bloqueado', motivo: 'Pendiente de valoración médica.' }
    : { estado: 'progresivo',
        etapa: nivelMin(perfil, 'intermedio')
          ? `Combinaciones e intervalos por rondas${saco ? ' (sombra y saco)' : ' (sombra)'}`
          : 'Técnica: guardia, trabajo de pies, jab y cross en sombra',
        motivo: 'Coordinación, técnica y cardio sin impacto.',
        requisito: nivelMin(perfil, 'intermedio') ? '' : 'Nivel intermedio para combinaciones por intervalos.' };

  // Agilidad y velocidad
  r.agilidad = alerta
    ? { estado: 'bloqueado', motivo: 'Pendiente de valoración médica.' }
    : nivelMin(perfil, 'intermedio') && pt(perfil, 'coordinacion') >= 50 && !evita('saltos')
      ? { estado: 'progresivo', etapa: 'Dinámica: cambios de dirección al trote', motivo: 'Buen control y coordinación.' }
      : { estado: 'progresivo', etapa: 'Base: cambios de dirección caminando, pasos laterales', motivo: 'Primero control.', requisito: 'Coordinación 50/100 y nivel intermedio.' };
  r.velocidad = !alerta && nivelMin(perfil, 'intermedio') && !evita('carrera_intensa')
    ? { estado: 'progresivo', etapa: 'Técnica de carrera y aceleraciones cortas', motivo: 'Base suficiente.' }
    : { estado: 'bloqueado', motivo: 'La velocidad exige tendones y articulaciones adaptados.', requisito: 'Nivel intermedio y sin restricción de carrera.' };

  // Parkour: primero fundamentos, nunca saltos peligrosos al inicio
  if (alerta || riesgo.lesiones.includes('rodilla') || riesgo.lesiones.includes('tobillo')) {
    r.parkour = { estado: 'bloqueado', motivo: alerta ? 'Pendiente de valoración médica.' : 'Lesión de rodilla o tobillo: primero recuperarla.' };
  } else if (nivelMin(perfil, 'avanzado') && pt(perfil, 'coordinacion') >= 70 && pt(perfil, 'piernas') >= 60 && !evita('saltos')) {
    r.parkour = { estado: 'progresivo', etapa: 'Desplazamientos y saltos pequeños controlados', motivo: 'Fuerza, movilidad y control suficientes.' };
  } else if (nivelMin(perfil, 'intermedio') && pt(perfil, 'coordinacion') >= 60 && pt(perfil, 'movilidad') >= 50 && !evita('saltos')) {
    r.parkour = { estado: 'progresivo', etapa: 'Aterrizajes desde poca altura y saltos pequeños', motivo: 'Buen control corporal.', requisito: 'Nivel avanzado y coordinación 70/100 para desplazamientos.' };
  } else {
    r.parkour = { estado: 'progresivo', etapa: 'Fundamentos: equilibrio, control corporal, movilidad (sin saltos)', motivo: 'Lo seguro primero.', requisito: 'Nivel intermedio, coordinación 60/100, movilidad 50/100 y sin restricción de saltos.' };
  }
  if (r.parkour.estado !== 'bloqueado') r.parkour.nota = 'Siempre en superficies seguras; las habilidades de mayor riesgo, con supervisión.';

  for (const k of Object.keys(r)) r[k].seleccionada = (atleta.modalidades || []).includes(k);
  return r;
}

// ---------- Orientación según objetivos ----------
export function orientacion(atleta) {
  const { principal, seleccionados = [] } = atleta.objetivos || {};
  if (OBJ_FUERZA.includes(principal)) return 'fuerza';
  if (OBJ_CARDIO.includes(principal)) return 'cardio';
  if (!principal && seleccionados.some(o => OBJ_CARDIO.includes(o)) && !seleccionados.some(o => OBJ_FUERZA.includes(o))) return 'cardio';
  return 'recomposicion';
}

// Sesiones dedicadas de fuerza (F) y cardio (C) según días y orientación
const REPARTO = {
  fuerza:        { 1: [1, 0], 2: [2, 0], 3: [3, 0], 4: [3, 1], 5: [3, 2], 6: [4, 2] },
  recomposicion: { 1: [1, 0], 2: [2, 0], 3: [2, 1], 4: [3, 1], 5: [3, 2], 6: [3, 3] },
  cardio:        { 1: [1, 0], 2: [1, 1], 3: [2, 1], 4: [2, 2], 5: [2, 3], 6: [2, 4] },
};

export function crearEstrategia(atleta, perfil, riesgo) {
  const D = atleta.disponibilidad?.dias || 3;
  const min = atleta.disponibilidad?.minutos || 30;
  const orient = orientacion(atleta);
  const [F, C] = REPARTO[orient][D];
  const des = desbloqueos(atleta, perfil, riesgo);
  const sel = id => des[id]?.seleccionada && des[id].estado !== 'bloqueado' && des[id].estado !== 'no_disponible';
  const filas = [];
  const razones = [];

  filas.push({ id: 'fuerza', etiqueta: 'Fuerza', valor: `${F} ${F === 1 ? 'día' : 'días'}`,
    nota: D === 1 ? 'Sesión mixta de cuerpo completo con cardio al final' : 'Cuerpo completo en cada sesión' });

  if (sel('gimnasio') && F >= 2) {
    const g = Math.ceil(F / 2);
    filas.push({ id: 'gimnasio', etiqueta: 'Gimnasio', valor: `${g} de las sesiones de fuerza`, nota: `Las otras ${F - g} en casa como progresión real, no como día fácil` });
  }
  if (sel('calistenia')) filas.push({ id: 'calistenia', etiqueta: 'Calistenia', valor: `${Math.min(F, 2)} ${Math.min(F, 2) === 1 ? 'sesión' : 'sesiones'}`, nota: des.calistenia.etapa });

  const cardioTexto = C ? `${C} ${C === 1 ? 'día' : 'días'}` : 'Al final de las sesiones de fuerza';
  filas.push({ id: 'cardio', etiqueta: 'Cardio', valor: cardioTexto, nota: des.cardio.etapa });
  if (orient !== 'fuerza' || riesgo.bajoImpacto) {
    filas.push({ id: 'pasos', etiqueta: 'Movimiento diario', valor: 'Todos los días', nota: 'Caminar más cada semana, de forma progresiva' });
  }
  if (sel('hiit')) filas.push({ id: 'hiit', etiqueta: 'HIIT', valor: '1 sesión', nota: `Sustituye un día de cardio. ${des.hiit.etapa}` });
  filas.push({ id: 'movilidad', etiqueta: 'Movilidad', valor: 'Diaria', nota: '5–10 min en el calentamiento y en los días libres' });
  if (sel('boxeo')) filas.push({ id: 'boxeo', etiqueta: 'Boxeo', valor: D >= 5 ? '1–2 sesiones' : '1 sesión', nota: `Como acondicionamiento. ${des.boxeo.etapa}` });
  if (sel('militar')) filas.push({ id: 'militar', etiqueta: 'Entrenamiento tipo militar', valor: '1 circuito semanal', nota: des.militar.etapa });
  if (sel('funcional')) filas.push({ id: 'funcional', etiqueta: 'Entrenamiento funcional', valor: 'Progresivo', nota: 'Integrado en circuitos' });
  if (sel('agilidad')) filas.push({ id: 'agilidad', etiqueta: 'Agilidad', valor: '1 bloque corto', nota: des.agilidad.etapa });
  if (sel('velocidad')) filas.push({ id: 'velocidad', etiqueta: 'Velocidad', valor: '1 bloque corto', nota: des.velocidad.etapa });
  if (sel('parkour')) filas.push({ id: 'parkour', etiqueta: 'Parkour básico', valor: 'En el calentamiento', nota: des.parkour.etapa });

  // Por qué (cómo, cuándo, cuánto)
  if (orient === 'recomposicion') {
    razones.push('La fuerza es la prioridad: es lo que conserva y construye músculo mientras pierdes grasa. Si solo haces cardio, una parte de lo que pierdes es músculo.');
    razones.push('Cuerpo completo en cada sesión de fuerza: así cada músculo recibe estímulo 2–3 veces por semana, la frecuencia más eficaz para ganar músculo con pocos días.');
    razones.push('El cardio y caminar cada día suman gasto de energía sin quitar recuperación a la fuerza.');
    razones.push('La pérdida de grasa la decide sobre todo la alimentación (se trabajará en la fase de nutrición). El entrenamiento asegura que lo que pierdas sea grasa y no músculo.');
    razones.push('Ritmo realista y sostenible: alrededor de 0,5–1 % de tu peso por semana. Ir más rápido suele costar músculo y se recupera el peso.');
  } else if (orient === 'fuerza') {
    razones.push('Tu objetivo principal es fuerza o músculo: la mayoría de días son de fuerza, con cardio dosificado para no quitar recuperación.');
    razones.push('Cada músculo se entrena 2–3 veces por semana con progresión de una variable cada vez.');
  } else {
    razones.push('Tu objetivo principal es de resistencia: predominan los días de cardio, pero se mantienen 2 días de fuerza para proteger músculo y articulaciones.');
  }
  if (riesgo.nivel === 'alerta') razones.unshift('Hasta tener la valoración médica: solo actividad suave (caminata tranquila, movilidad y ejercicios básicos sin carga). Después se repiten las pruebas y se ajusta todo el plan.');
  if (riesgo.bajoImpacto) razones.push('Bajo impacto al principio: sin saltos ni carreras intensas hasta que articulaciones y tendones se adapten. No es entrenar menos, es entrenar sin lesionarse.');
  if (min <= 20) razones.push('Con sesiones cortas, fuerza y cardio se combinan en circuitos para aprovechar cada minuto.');
  else if (min >= 60) razones.push('Con 60 minutos o más, cabe fuerza y un bloque de cardio en la misma sesión.');
  if (perfil.areaMejorar) razones.push(`Se reforzará especialmente: ${perfil.areaMejorar.toLowerCase()}.`);

  return {
    fecha: new Date().toISOString(),
    orientacion: orient,
    diasSemana: D,
    minutosSesion: min,
    sesionesFuerza: F,
    sesionesCardio: C,
    filas,
    razones,
    desbloqueos: des,
  };
}

// ---------- Periodización ----------
export function crearPeriodizacion(perfil, riesgo, inicio = hoyISO()) {
  const principiante = perfil.nivel === 'principiante' || riesgo.bajoImpacto;
  const bloques = [
    { mes: 1, nombre: 'Adaptación', enfoque: 'Aprender la técnica, crear el hábito y preparar articulaciones y tendones.', esfuerzo: '5–6 de 10', descarga: false, reevaluar: true },
    { mes: 2, nombre: 'Desarrollo', enfoque: 'Más volumen: más series y repeticiones con buena técnica.', esfuerzo: '6–7 de 10', descarga: true },
    { mes: 3, nombre: 'Progresión', enfoque: 'Variantes más exigentes, más carga o más tiempo bajo tensión.', esfuerzo: '7–8 de 10', descarga: !principiante },
    { mes: 4, nombre: 'Mayor rendimiento', enfoque: 'Consolidar lo ganado e introducir los estímulos desbloqueados.', esfuerzo: '7–8 de 10', descarga: true, reevaluar: true },
  ];
  return {
    inicio,
    bloques: bloques.map((b, i) => ({
      ...b,
      desde: sumarDias(inicio, i * 28),
      hasta: sumarDias(inicio, i * 28 + 27),
      notaDescarga: b.descarga ? 'Semana 4: descarga (menos volumen) para recuperar y asimilar.' : '',
    })),
    nota: 'La intensidad no sube indefinidamente: tras cada ciclo se reevalúa y se planifica el siguiente.',
  };
}

export function bloqueActual(periodizacion, hoy = hoyISO()) {
  if (!periodizacion) return null;
  const dias = Math.floor((new Date(hoy) - new Date(periodizacion.inicio)) / 864e5);
  if (dias < 0) return null;
  const i = Math.min(3, Math.floor(dias / 28));
  return { ...periodizacion.bloques[i], semana: Math.floor((dias % 28) / 7) + 1, diaPrograma: dias + 1 };
}

export const etiquetaModalidad = id => etiquetaDe(MODALIDADES, id);
