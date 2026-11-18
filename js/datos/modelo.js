// Estructura de datos del atleta. Es el "contrato" que leen todas las fases:
// el motor de entrenamiento, nutrición, progreso, etc. trabajan sobre este objeto.

export const VERSION_MODELO = 1;

export function atletaNuevo() {
  return {
    versionModelo: VERSION_MODELO,
    estado: 'borrador',   // 'borrador' mientras hace el cuestionario, 'evaluado' al terminar
    pasoActual: 0,

    personal: { nombre: '', edad: null, sexo: '', peso: null, estatura: null, pais: '', ciudad: '' },

    // Todo opcional
    composicion: { grasa: null, musculo: null, cintura: null, pecho: null, cadera: null, brazo: null, muslo: null },

    objetivos: { seleccionados: [], principal: '' },

    resultadoDeseado: {
      descripcion: { m3: '', m6: '', m12: '' },  // "¿Cómo quieres verte y sentirte?"
      metas: { m3: {}, m6: {}, m12: {} },        // { flexiones: 20, plancha: 60, ... }
      personalizados: { m3: '', m6: '', m12: '' }, // objetivos propios, uno por línea
    },

    experiencia: { tiempo: '', inactividad: '', lugares: [] },

    equipamiento: { items: [], otro: '' },

    seguridad: {
      lesiones: [], lesionOtra: '', lesionDetalle: '',
      cuestionario: {},          // respuestas Sí/No de PREGUNTAS_SEGURIDAD
      tieneCondicion: null, condiciones: [], condicionOtra: '',
    },

    disponibilidad: { dias: null, minutos: null, horarios: [] },

    modalidades: [],

    habitos: { suenoHoras: null, calidadSueno: null, actividad: '' },

    // Resultados de las pruebas físicas iniciales (null = no realizada)
    pruebas: {
      flexiones: null,     // { variante: 'normal'|'rodillas'|'inclinada', reps }
      sentadillas: null,   // { variante: 'libre'|'silla', reps }  (en 60 s)
      plancha: null,       // { variante: 'normal'|'rodillas', seg }
      dominadas: null,     // { reps }
      cardio: null,        // { tipo: 'caminata6'|'caminata1600'|'cooper', minutos, metros, fc, rpe }
      movilidad: null,     // { hombros, cadera, tobillos, tronco }  1 a 3 cada uno
      coordinacion: null,  // { equilibrioIzq, equilibrioDer, cruzado, direccion }
    },

    estadoPruebas: {},   // { flexiones: 'hecha' | 'omitida', ... }

    perfil: null,    // resultado calculado por el motor (nivel, puntuaciones, fortaleza...)
    plan: null,      // estrategia + periodización calculadas por el motor
  };
}

// Pasos del cuestionario, en orden. Las vistas y el progreso usan esta lista.
export const PASOS = [
  'personal', 'composicion', 'objetivos', 'resultado', 'experiencia',
  'equipamiento', 'seguridad', 'disponibilidad', 'modalidades', 'habitos', 'pruebas',
];
