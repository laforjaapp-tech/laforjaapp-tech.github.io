// Fases del atleta (1 Adaptación … 5 Avanzado), desbloqueos y estructura de periodización.
// Un atleta nunca salta fases: sube de una en una cuando cumple TODOS los criterios.

import { hoyISO, sumarDias } from './calculos.js';
import { ADAPTACIONES_LESION } from './seguridad.js';

export const FASES = [
  { numero: 1, nombre: 'ADAPTACIÓN', objetivo: 'Aprender técnica y crear hábito.' },
  { numero: 2, nombre: 'BASE', objetivo: 'Desarrollar fuerza y resistencia.' },
  { numero: 3, nombre: 'DESARROLLO', objetivo: 'Aumentar capacidad.' },
  { numero: 4, nombre: 'RENDIMIENTO', objetivo: 'Introducir mayor variedad y complejidad.' },
  { numero: 5, nombre: 'AVANZADO', objetivo: 'Calistenia avanzada, acondicionamiento y modalidades adicionales.' },
];

// Fase de entrada según la evaluación. Nadie empieza en Rendimiento ni Avanzado.
export function faseInicial(perfil) {
  if (perfil.riesgo?.nivel === 'alerta') return 1;
  return { principiante: 1, intermedio: 2, avanzado: 3, alto_rendimiento: 3 }[perfil.nivel] || 1;
}

const REQUISITOS_ASCENSO = {
  1: { semanas: 4, sesiones: 10, ascensos: 1 },
  2: { semanas: 6, sesiones: 16, ascensos: 2 },
  3: { semanas: 8, sesiones: 20, ascensos: 3 },
  4: { semanas: 8, sesiones: 24, ascensos: 3, capacidades: 60 },
};

// ¿Puede pasar a la siguiente fase? sesiones = sesiones completadas del atleta
export function criteriosAscenso(atleta, sesiones = []) {
  const f = atleta.fase?.numero || 1;
  if (f >= 5) return { puede: false, criterios: [], final: true };
  const req = REQUISITOS_ASCENSO[f];
  const desde = atleta.fase?.desde || atleta.creado || hoyISO();
  const semanas = Math.floor((Date.now() - new Date(desde).getTime()) / (7 * 864e5));
  const enFase = sesiones.filter(s => s.estado === 'completada' && s.fecha >= desde.slice(0, 10));
  const ascensos = Object.values(atleta.progresion || {}).reduce((a, e) => a + (e.ascensosFase || 0), 0);
  const hace14 = sumarDias(hoyISO(), -14);
  const dolorReciente = sesiones.some(s => s.fecha >= hace14 && s.resultado?.general?.dolor);
  const dias = atleta.disponibilidad?.dias || 3;
  const planificadas = Math.max(1, Math.min(semanas, 8) * dias);
  const recientes = sesiones.filter(s => s.estado === 'completada' && s.fecha >= sumarDias(hoyISO(), -Math.min(semanas, 8) * 7)).length;
  const adherencia = semanas ? Math.min(100, Math.round((recientes / planificadas) * 100)) : 0;

  const criterios = [
    { texto: `Llevar al menos ${req.semanas} semanas en la fase`, actual: `${semanas} semanas`, cumplido: semanas >= req.semanas },
    { texto: `Completar ${req.sesiones} entrenamientos en esta fase`, actual: `${enFase.length}`, cumplido: enFase.length >= req.sesiones },
    { texto: 'Constancia de al menos 70 % de los entrenamientos planificados', actual: `${adherencia} %`, cumplido: adherencia >= 70 },
    { texto: `Dominar ${req.ascensos} ${req.ascensos === 1 ? 'progresión' : 'progresiones'} (subir de variante)`, actual: `${ascensos}`, cumplido: ascensos >= req.ascensos },
    { texto: 'Sin dolor reportado en las últimas 2 semanas', actual: dolorReciente ? 'Hubo dolor' : 'Sin dolor', cumplido: !dolorReciente },
  ];
  if (req.capacidades) {
    const p = atleta.perfil?.puntuaciones || {};
    const ok = (p.fuerza ?? 0) >= req.capacidades && (p.cardio ?? 0) >= req.capacidades;
    criterios.push({ texto: `Reevaluación con fuerza y cardio de ${req.capacidades}/100 o más`, actual: `Fuerza ${p.fuerza ?? '–'} · Cardio ${p.cardio ?? '–'}`, cumplido: ok });
  }
  if (atleta.perfil?.riesgo?.nivel === 'alerta') criterios.push({ texto: 'Valoración médica favorable y nueva evaluación', actual: 'Pendiente', cumplido: false });
  return { puede: criterios.every(c => c.cumplido), criterios };
}

// ---------- Desbloqueos ----------
const pasoFamilia = (atleta, fam) => {
  const e = atleta.progresion?.[fam];
  return e ? (e.pasoActual ?? 0) : 0;
};

export function evaluarDesbloqueos(atleta) {
  const f = atleta.fase?.numero || 1;
  const p = atleta.perfil?.puntuaciones || {};
  const riesgo = atleta.perfil?.riesgo || {};
  const lesiones = riesgo.lesiones || [];
  const alerta = riesgo.nivel === 'alerta';
  const req = (texto, cumplido) => ({ texto, cumplido: !!cumplido });
  const items = [];
  const add = (id, nombre, icono, requisitos, mensaje, extra = {}) =>
    items.push({ id, nombre, icono, requisitos, mensaje, desbloqueado: requisitos.every(r => r.cumplido), ...extra });

  // Impacto: saltos y carrera para quien empezó con bajo impacto
  if (riesgo.bajoImpacto) {
    add('impacto', 'Ejercicios con impacto (saltos y carrera)', '🦵', [
      req('Fase 3 — Desarrollo o superior', f >= 3),
      req('Fuerza de piernas de 50/100 o más', (p.piernas ?? 0) >= 50),
      req('Sin lesión de rodilla ni tobillo', !lesiones.includes('rodilla') && !lesiones.includes('tobillo')),
      req('Sin alerta médica', !alerta),
    ], 'Primero articulaciones y tendones fuertes; después, el impacto.');
  }
  add('carrera', 'Carrera continua', '🏃', [
    req('Fase 2 — Base o superior', f >= 2),
    req('Cardio de 45/100 o más', (p.cardio ?? 0) >= 45),
    req('Sin lesión de rodilla ni tobillo', !lesiones.includes('rodilla') && !lesiones.includes('tobillo')),
    req(riesgo.bajoImpacto ? 'Ejercicios con impacto desbloqueados' : 'Sin restricción de impacto', !riesgo.bajoImpacto || items.find(i => i.id === 'impacto')?.desbloqueado),
  ], 'Pasamos de caminar a trotar cuando el corazón y las piernas estén listos.');
  add('hiit', 'Circuito de alta intensidad (HIIT)', '🔥', [
    req('Fase 2 — Base o superior', f >= 2),
    req('Base cardiovascular suficiente (cardio 50/100)', (p.cardio ?? 0) >= 50),
    req('Sin alerta médica', !alerta),
  ], 'Necesitas una base cardiovascular suficiente.');
  add('flexion_completa', 'Flexiones completas', '💪', [
    req('Llegar a la flexión normal en tu progresión', (atleta.progresion?.flexion?.pasoActual ?? 0) >= 4 || atleta.pruebas?.flexiones?.variante === 'normal'),
  ], 'Pared → inclinada → rodillas → completa.');
  add('dominadas', 'Dominadas', '🧗', [
    req('Fase 3 — Desarrollo o superior', f >= 3),
    req('Completar colgado activo y dominadas negativas', pasoFamilia(atleta, 'dominada') >= 3 || (atleta.pruebas?.dominadas?.reps ?? 0) >= 1),
    req('Sin lesión de hombro ni codo', !lesiones.includes('hombro') && !lesiones.includes('codo')),
  ], 'Completa primero las progresiones necesarias.');
  add('dominadas_avanzadas', 'Dominadas avanzadas (lastradas)', '🏋️', [
    req('Fase 5 — Avanzado', f >= 5),
    req('Dominada estricta dominada en tu progresión', pasoFamilia(atleta, 'dominada') >= 4 && (atleta.progresion?.dominada?.valor ?? 0) >= 8),
  ], 'Completa primero las progresiones necesarias.');
  add('calistenia_avanzada', 'Calistenia avanzada', '🤸', [
    req('Fase 4 — Rendimiento o superior', f >= 4),
    req('Flexión con pausa o superior', pasoFamilia(atleta, 'flexion') >= 5),
    req('Dominada estricta', pasoFamilia(atleta, 'dominada') >= 4),
  ], 'Pino, fondos en paralelas y variantes avanzadas llegan con la base completa.');
  add('marcha_carga', 'Marcha con carga', '🎒', [
    req('Fase 3 — Desarrollo o superior', f >= 3),
    req('Core de 60/100 o más', (p.core ?? 0) >= 60),
    req('Sin lesión de espalda ni rodilla', !lesiones.includes('espalda') && !lesiones.includes('rodilla')),
  ], 'La carga a la espalda llega con un core fuerte.');

  // Parkour por niveles A–D
  const parkourBase = !alerta && !lesiones.includes('rodilla') && !lesiones.includes('tobillo');
  const impactoOk = !riesgo.bajoImpacto || items.find(i => i.id === 'impacto')?.desbloqueado;
  add('parkour_a', 'Parkour A — Equilibrio y control', '🧘', [req('Sin lesión de rodilla ni tobillo ni alerta médica', parkourBase)], 'Equilibrio y control corporal primero.', { parkour: 'A' });
  add('parkour_b', 'Parkour B — Desplazamientos', '🚶', [
    req('Parkour A desbloqueado', parkourBase), req('Fase 2 — Base o superior', f >= 2), req('Coordinación de 50/100 o más', (p.coordinacion ?? 0) >= 50),
  ], 'Pasos de obstáculo bajos y gateos.', { parkour: 'B' });
  add('parkour_c', 'Parkour C — Saltos pequeños y aterrizajes', '🦘', [
    req('Parkour B desbloqueado', parkourBase && f >= 2 && (p.coordinacion ?? 0) >= 50), req('Fase 3 — Desarrollo o superior', f >= 3),
    req('Coordinación 60/100 y piernas 55/100', (p.coordinacion ?? 0) >= 60 && (p.piernas ?? 0) >= 55), req('Impacto permitido', impactoOk),
  ], 'Necesitas mejorar equilibrio, fuerza y control de aterrizaje.', { parkour: 'C' });
  const dCriterios = [
    req('Parkour C desbloqueado', parkourBase && f >= 3 && (p.coordinacion ?? 0) >= 60 && (p.piernas ?? 0) >= 55 && impactoOk),
    req('Fase 4 — Rendimiento o superior', f >= 4), req('Coordinación de 70/100 o más', (p.coordinacion ?? 0) >= 70),
    req('Confirmas superficie segura y supervisión presencial', atleta.confirmaciones?.parkourD),
  ];
  add('parkour_d', 'Parkour D — Movimientos complejos', '⚡', dCriterios,
    'Alto riesgo: nunca se desbloquea solo. Requiere confirmar supervisión presencial y superficie segura.', { parkour: 'D', requiereConfirmacion: dCriterios.slice(0, 3).every(r => r.cumplido) && !atleta.confirmaciones?.parkourD });

  return items;
}

export const desbloqueado = (items, id) => !!items.find(i => i.id === id)?.desbloqueado;

export function nivelParkour(items) {
  return ['D', 'C', 'B', 'A'].find(n => items.find(i => i.parkour === n)?.desbloqueado) || null;
}

// Restricciones efectivas hoy: las de lesión son permanentes; las de bajo impacto se levantan al desbloquear "impacto"
export function restriccionesActuales(atleta, items) {
  const riesgo = atleta.perfil?.riesgo || {};
  const set = new Set((riesgo.lesiones || []).flatMap(l => [l, ...(ADAPTACIONES_LESION[l]?.evitar || [])]));
  if (riesgo.bajoImpacto && !desbloqueado(items, 'impacto')) { set.add('saltos'); set.add('carrera_intensa'); }
  if (!desbloqueado(items, 'carrera')) set.add('carrera_intensa');
  if (!desbloqueado(items, 'marcha_carga')) set.add('marcha_carga');
  return set;
}

// ---------- Periodización: macrociclo → mesociclo → microciclo → sesión ----------
export function estructuraPeriodizacion(atleta, hoy = hoyISO()) {
  const per = atleta.plan?.periodizacion;
  if (!per) return null;
  const dias = Math.max(0, Math.floor((new Date(hoy) - new Date(per.inicio)) / 864e5));
  const numMacro = Math.floor(dias / 112);              // 16 semanas por macrociclo
  const enMacro = dias % 112;
  const iMeso = Math.floor(enMacro / 28);
  const semana = Math.floor((enMacro % 28) / 7) + 1;
  const meso = per.bloques[iMeso];
  const inicioMacro = sumarDias(per.inicio, numMacro * 112);
  const inicioMicro = sumarDias(per.inicio, Math.floor(dias / 7) * 7);
  const descarga = meso.descarga && semana === 4;
  return {
    macrociclo: { numero: numMacro + 1, inicio: inicioMacro, fin: sumarDias(inicioMacro, 111), objetivo: atleta.plan.estrategia?.orientacion },
    mesociclo: { numero: iMeso + 1, ...meso },
    microciclo: { semana, semanaPrograma: Math.floor(dias / 7) + 1, inicio: inicioMicro, fin: sumarDias(inicioMicro, 6), tipo: descarga ? 'descarga' : 'carga' },
    descarga,
  };
}
