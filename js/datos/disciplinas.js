// Disciplina de cada bloque de la sesión: qué se está entrenando en esa parte y PARA QUÉ (FASE 5: ninguna disciplina sin función).

import { ejercicioPorId } from './ejercicios.js';

export const DISCIPLINAS = {
  calentamiento: { nombre: 'Calentamiento', icono: '🔥', detalle: 'Movilidad y activación',
    funcion: 'Preparar articulaciones, músculos y corazón para el trabajo principal y practicar su técnica sin carga.', afirmacion: 'programa_completo' },
  fuerza: { nombre: 'Fuerza', icono: '🏋️',
    funcion: 'Estimular la fuerza y la masa muscular: es lo que conserva el músculo cuando pierdes grasa.', afirmacion: 'fuerza_y_cardio_juntos' },
  calistenia: { nombre: 'Calistenia', icono: '🤸', detalle: 'Fuerza con el peso del cuerpo',
    funcion: 'Fuerza relativa, control corporal, core y resistencia muscular con progresiones de peso corporal.', afirmacion: 'cargas_en_casa' },
  core: { nombre: 'Core', icono: '🧱', detalle: 'Abdomen, zona lumbar y estabilidad',
    funcion: 'Estabilidad del tronco para proteger la espalda y transmitir fuerza entre piernas y brazos.', afirmacion: 'programa_completo' },
  cardio: { nombre: 'Cardio', icono: '🏃', detalle: 'Resistencia del corazón y los pulmones',
    funcion: 'Desarrollar la capacidad aeróbica y aumentar el gasto de energía.', afirmacion: 'guias_minimas' },
  hiit: { nombre: 'HIIT', icono: '⚡', detalle: 'Intervalos de alta intensidad',
    funcion: 'Mejorar la condición cardiovascular en poco tiempo. Se limita porque cansa más y no quema más grasa que el cardio moderado.', afirmacion: 'hiit_dosificado' },
  acondicionamiento: { nombre: 'Acondicionamiento', icono: '🔥', detalle: 'Circuito para quemar grasa y ganar resistencia',
    funcion: 'Circuito metabólico: más gasto de energía y capacidad de trabajo, con el volumen controlado.', afirmacion: 'no_hay_mejor_ejercicio' },
  boxeo: { nombre: 'Boxeo', icono: '🥊', detalle: 'Técnica y acondicionamiento',
    funcion: 'Coordinación, trabajo de pies, agilidad y cardio por intervalos. No todos los días.', afirmacion: 'boxeo' },
  militar: { nombre: 'Preparación tipo militar', icono: '🎖️', detalle: 'Solo condición física',
    funcion: 'Acondicionamiento general y capacidad de trabajo. Nunca justo después de un día pesado de piernas.', afirmacion: 'militar' },
  parkour: { nombre: 'Parkour básico', icono: '🦘', detalle: 'Aterrizajes, equilibrio y obstáculos',
    funcion: 'Control corporal, equilibrio, coordinación y confianza al moverte. No se usa para "quemar más".', afirmacion: 'parkour' },
  agilidad: { nombre: 'Agilidad', icono: '⚡', detalle: 'Coordinación, reacción y cambios de dirección',
    funcion: 'Coordinación, reacción y cambios de dirección: capacidades neuromotoras.', afirmacion: 'programa_completo' },
  movilidad: { nombre: 'Movilidad', icono: '🧘', detalle: 'Articulaciones sueltas y buena postura',
    funcion: 'Mejorar el rango de movimiento y preparar el cuerpo para entrenar mejor.', afirmacion: 'programa_completo' },
  enfriamiento: { nombre: 'Enfriamiento', icono: '❄️', detalle: 'Estiramientos y respiración',
    funcion: 'Bajar pulsaciones, soltar los músculos trabajados y empezar a recuperar.', afirmacion: 'programa_completo' },
};

// Clave de disciplina de un bloque (un circuito de fuerza sigue siendo fuerza aunque su formato sea de acondicionamiento)
export const claveDisciplina = bloque => bloque.id === 'fuerza' ? 'fuerza' : bloque.tipo;

export function disciplinaDe(bloque) {
  const clave = claveDisciplina(bloque);
  const d = DISCIPLINAS[clave] || { nombre: bloque.titulo, icono: '🔥' };
  if (clave !== 'fuerza') return d;
  const equipos = (bloque.items || []).map(it => ejercicioPorId[it.ejercicioId]?.equipo || '');
  const detalle = equipos.every(x => !x) ? 'Con el peso del cuerpo'
    : equipos.some(x => x.includes('maquinas')) ? 'Gimnasio: máquinas y pesas' : 'Con pesas y material';
  return { ...d, detalle };
}

export const textoDisciplina = d => `${d.icono} ${d.nombre}${d.detalle ? ` · ${d.detalle}` : ''}`;
