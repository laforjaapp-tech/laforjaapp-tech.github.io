// FASE 5: objetivo dominante del atleta y prioridades del plan.
// A partir de lo que eligió en la FASE 1 se decide qué manda en el plan y qué combinación de disciplinas le sirve.

const PERDER = ['perder_grasa', 'bajar_peso'];
const MUSCULO = ['ganar_musculo', 'tonificar'];
const FUERZA = ['ganar_fuerza', 'calistenia', 'militar', 'preparacion_avanzada', 'pruebas_fisicas'];
const CONDICION = ['resistencia', 'cardiovascular', 'movilidad', 'mantener'];
const RENDIMIENTO = ['rendimiento_general', 'agilidad', 'velocidad'];

export const OBJETIVOS_DOMINANTES = {
  A: {
    nombre: 'Pérdida de grasa + conservación de músculo',
    prioridades: [
      { que: 'Alimentación', por: 'Un déficit moderado y sostenible es lo que más decide la pérdida de grasa.', afirmacion: 'balance_energetico' },
      { que: 'Entrenamiento de fuerza', por: 'Le dice al cuerpo que conserve (o gane) músculo mientras comes menos.', afirmacion: 'fuerza_y_cardio_juntos' },
      { que: 'Actividad aeróbica', por: 'Suma gasto de energía y mejora el corazón; caminar cada día cuenta.', afirmacion: 'guias_minimas' },
      { que: 'Recuperación', por: 'Dormir bien y descansar sostiene el plan y protege el músculo.', afirmacion: 'sueno' },
    ],
    combinacion: ['Fuerza', 'Cardio moderado', 'Actividad diaria', 'Alimentación adecuada'],
    nutricion: 'deficit',
    cardioPrioritario: false,
  },
  B: {
    nombre: 'Ganancia muscular + reducción moderada de grasa',
    prioridades: [
      { que: 'Fuerza / hipertrofia', por: 'El estímulo principal: series suficientes y progresivas para cada músculo.', afirmacion: 'volumen_hipertrofia' },
      { que: 'Proteína adecuada', por: 'Potencia lo que gana el entrenamiento de fuerza.', afirmacion: 'proteina' },
      { que: 'Alimentación', por: 'Sin déficit agresivo: comer poco frena la ganancia de músculo.', afirmacion: 'balance_energetico' },
      { que: 'Cardio dosificado', por: 'Para el corazón y la grasa, sin quitar recuperación a la fuerza.', afirmacion: 'concurrente' },
      { que: 'Recuperación', por: 'El músculo crece cuando descansas.', afirmacion: 'sueno' },
    ],
    combinacion: ['Fuerza / hipertrofia', 'Calistenia', 'Cardio dosificado', 'Alimentación suficiente'],
    nutricion: 'recomposicion',
    cardioPrioritario: false,
  },
  C: {
    nombre: 'Fuerza + condición física',
    prioridades: [
      { que: 'Fuerza', por: 'Movimientos grandes y progresables con más carga y menos repeticiones.', afirmacion: 'frecuencia_dos' },
      { que: 'Accesorios', por: 'Equilibran el cuerpo y apoyan los ejercicios principales.', afirmacion: 'fuerza_previene_lesiones' },
      { que: 'Cardio', por: 'Capacidad de trabajo sin interferir con la fuerza.', afirmacion: 'concurrente' },
      { que: 'Calistenia', por: 'Fuerza relativa y control del propio cuerpo.', afirmacion: 'cargas_en_casa' },
      { que: 'Movilidad', por: 'Rango de movimiento para entrenar con buena técnica.', afirmacion: 'programa_completo' },
    ],
    combinacion: ['Fuerza', 'Cardio', 'Calistenia', 'Movilidad'],
    nutricion: 'mantenimiento',
    cardioPrioritario: false,
  },
  D: {
    nombre: 'Condición física y salud cardiovascular',
    prioridades: [
      { que: 'Cardio', por: 'El objetivo principal: el corazón y la resistencia.', afirmacion: 'guias_minimas' },
      { que: 'Fuerza', por: 'Al menos 2 días para proteger músculo, huesos y articulaciones.', afirmacion: 'guias_minimas' },
      { que: 'Calistenia', por: 'Resistencia muscular y control corporal.', afirmacion: 'programa_completo' },
      { que: 'Movilidad', por: 'Moverte con soltura y sin molestias.', afirmacion: 'programa_completo' },
    ],
    combinacion: ['Fuerza', 'Cardio', 'Calistenia', 'Movilidad'],
    nutricion: 'mantenimiento',
    cardioPrioritario: true,
  },
  E: {
    nombre: 'Rendimiento físico general',
    prioridades: [
      { que: 'Fuerza', por: 'Base de todas las capacidades.', afirmacion: 'fuerza_previene_lesiones' },
      { que: 'Cardio', por: 'Capacidad de trabajo y recuperación entre esfuerzos.', afirmacion: 'guias_minimas' },
      { que: 'Agilidad', por: 'Coordinación, reacción y cambios de dirección.', afirmacion: 'programa_completo' },
      { que: 'Calistenia', por: 'Control del propio cuerpo.', afirmacion: 'cargas_en_casa' },
      { que: 'Movilidad', por: 'Rango de movimiento y prevención.', afirmacion: 'programa_completo' },
    ],
    combinacion: ['Fuerza', 'Cardio', 'Agilidad', 'Calistenia', 'Movilidad'],
    nutricion: 'mantenimiento',
    cardioPrioritario: false,
  },
};

// Qué manda en el plan: el objetivo principal y, si no hay, el primero elegido
export function objetivoDominante(atleta) {
  const { principal, seleccionados = [] } = atleta.objetivos || {};
  const todos = [principal, ...seleccionados].filter(Boolean);
  const obj = principal || seleccionados[0];
  let clave = 'D';
  if (PERDER.includes(obj)) clave = 'A';
  else if (MUSCULO.includes(obj)) clave = 'B';
  else if (FUERZA.includes(obj)) clave = 'C';
  else if (RENDIMIENTO.includes(obj)) clave = 'E';
  else if (CONDICION.includes(obj)) clave = 'D';
  const extra = todos.filter(o => o !== obj);
  return { clave, ...OBJETIVOS_DOMINANTES[clave], secundarios: extra };
}
