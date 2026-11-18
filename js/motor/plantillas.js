// FASE 5: plantillas de sesión. Cada tipo de sesión dice qué disciplinas combina y en qué proporción del tiempo.
// d = disciplina (constructor de bloque), f = fracción del tiempo principal, moderado = cardio continuo sin intervalos.
// grupo: fuerza (entrenamiento de resistencia), cardio o recuperación. intenso / impacto: cuidan la fatiga entre días.

export const PLANTILLAS = {
  fuerza_core: { nombre: 'Fuerza + core', grupo: 'fuerza',
    bloques: [{ d: 'fuerza', f: 0.78 }, { d: 'core', f: 0.22 }] },
  fuerza_cardio: { nombre: 'Fuerza + core + cardio moderado', grupo: 'fuerza', minimo: 30,
    bloques: [{ d: 'fuerza', f: 0.6 }, { d: 'core', f: 0.12 }, { d: 'cardio', f: 0.28, moderado: true }] },
  fuerza_metabolico: { nombre: 'Fuerza + circuito + cardio', grupo: 'fuerza', intenso: true, minimo: 40,
    bloques: [{ d: 'fuerza', f: 0.5 }, { d: 'acondicionamiento', f: 0.25 }, { d: 'cardio', f: 0.25, moderado: true }] },
  fuerza_acondicionamiento: { nombre: 'Fuerza + acondicionamiento', grupo: 'fuerza', intenso: true, minimo: 30,
    bloques: [{ d: 'fuerza', f: 0.6 }, { d: 'acondicionamiento', f: 0.4 }] },
  fuerza_calistenia: { nombre: 'Fuerza + calistenia', grupo: 'fuerza', minimo: 30, enfoque: 'inferior',
    bloques: [{ d: 'fuerza', f: 0.6 }, { d: 'calistenia', f: 0.4 }] },
  fuerza_boxeo: { nombre: 'Fuerza + boxeo técnico', grupo: 'fuerza', minimo: 35,
    bloques: [{ d: 'fuerza', f: 0.67 }, { d: 'boxeo', f: 0.33 }] },
  calistenia_cardio: { nombre: 'Calistenia + cardio + core', grupo: 'fuerza', minimo: 30,
    bloques: [{ d: 'calistenia', f: 0.45 }, { d: 'cardio', f: 0.35, moderado: true }, { d: 'core', f: 0.2 }] },
  cardio_movilidad: { nombre: 'Cardio + movilidad', grupo: 'cardio',
    bloques: [{ d: 'cardio', f: 0.75 }, { d: 'movilidad', f: 0.25 }] },
  boxeo_cardio: { nombre: 'Boxeo + cardio + core', grupo: 'cardio', intenso: true,
    bloques: [{ d: 'boxeo', f: 0.55 }, { d: 'cardio', f: 0.3, moderado: true }, { d: 'core', f: 0.15 }] },
  agilidad_calistenia: { nombre: 'Agilidad + calistenia', grupo: 'cardio',
    bloques: [{ d: 'agilidad', f: 0.4 }, { d: 'calistenia', f: 0.6 }] },
  militar: { nombre: 'Circuito tipo militar', grupo: 'cardio', intenso: true, impacto: true, piernas: true,
    bloques: [{ d: 'militar', f: 0.75 }, { d: 'core', f: 0.25 }] },
  hiit_core: { nombre: 'HIIT + core', grupo: 'cardio', intenso: true, impacto: true,
    bloques: [{ d: 'hiit', f: 0.55 }, { d: 'core', f: 0.25 }, { d: 'movilidad', f: 0.2 }] },
  recuperacion: { nombre: 'Recuperación activa', grupo: 'recuperacion',
    bloques: [{ d: 'caminata', f: 0.55 }, { d: 'movilidad', f: 0.45 }] },
};

// Enfoque de la fuerza: cuerpo completo, tren superior o piernas
export const ENFOQUES = {
  completo: { nombre: 'cuerpo completo', patrones: ['rodilla', 'empuje_h', 'bisagra', 'traccion_h', 'traccion_v', 'empuje_v', 'rodilla_uni', 'carga'] },
  superior: { nombre: 'tren superior', patrones: ['empuje_h', 'traccion_h', 'empuje_v', 'traccion_v', 'brazos', 'carga'] },
  inferior: { nombre: 'piernas', patrones: ['rodilla', 'bisagra', 'rodilla_uni', 'pantorrilla', 'carga'] },
};

export const enfoqueDe = (tipo, enfoque) => PLANTILLAS[tipo]?.enfoque || enfoque || 'completo';

export function nombreSesion(tipo, enfoque) {
  const p = PLANTILLAS[tipo];
  if (!p) return 'Entrenamiento';
  const e = enfoqueDe(tipo, enfoque);
  if (p.grupo !== 'fuerza' || e === 'completo' || !p.bloques.some(b => b.d === 'fuerza')) return p.nombre;
  return p.nombre.replace('Fuerza', e === 'superior' ? 'Fuerza tren superior' : 'Fuerza de piernas');
}

// Músculos que estimula cada bloque (para contar la frecuencia semanal por grupo)
const ESTIMULO = {
  fuerza: { completo: ['pecho', 'espalda', 'hombros', 'cuadriceps', 'gluteos', 'isquiotibiales'], superior: ['pecho', 'espalda', 'hombros', 'biceps', 'triceps'], inferior: ['cuadriceps', 'gluteos', 'isquiotibiales', 'pantorrillas'] },
  calistenia: ['pecho', 'espalda', 'hombros', 'triceps', 'biceps', 'core'],
  core: ['core'],
  militar: ['pecho', 'cuadriceps', 'gluteos', 'hombros', 'core'],
  hiit: ['cuadriceps', 'gluteos', 'core'],
  acondicionamiento: ['cuadriceps', 'gluteos', 'hombros', 'core'],
  boxeo: ['hombros', 'core'],
};
export function estimulosDe(tipo, enfoque) {
  const p = PLANTILLAS[tipo];
  if (!p) return [];
  const e = enfoqueDe(tipo, enfoque);
  return [...new Set(p.bloques.flatMap(b => b.d === 'fuerza' ? ESTIMULO.fuerza[e] : ESTIMULO[b.d] || []))];
}

// Músculos grandes que trabajan con carga real (fuerza, calistenia, circuito militar): no deben repetirse en días seguidos
const GRANDES = ['pecho', 'espalda', 'hombros', 'cuadriceps', 'gluteos', 'isquiotibiales'];
export function musculosCargados(tipo, enfoque) {
  const p = PLANTILLAS[tipo];
  if (!p) return [];
  const e = enfoqueDe(tipo, enfoque);
  return [...new Set(p.bloques.flatMap(b => b.d === 'fuerza' ? ESTIMULO.fuerza[e] : ['calistenia', 'militar'].includes(b.d) ? ESTIMULO[b.d] : []))].filter(g => GRANDES.includes(g));
}

// Carga para las piernas y el impacto: base de las reglas de fatiga entre días
export function cargaDe(tipo, enfoque) {
  const p = PLANTILLAS[tipo] || {};
  const e = enfoqueDe(tipo, enfoque);
  const fuerzaPiernas = p.bloques?.some(b => b.d === 'fuerza') && e !== 'superior';
  return { piernas: !!(p.piernas || fuerzaPiernas), impacto: !!p.impacto, intenso: !!p.intenso, grupo: p.grupo, enfoque: e };
}
