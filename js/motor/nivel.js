// Perfil del atleta: puntuaciones por capacidad, nivel orientativo, fortaleza y área a mejorar.
// El nivel combina pruebas, experiencia y seguridad: nunca se decide solo por peso o edad.
// Los baremos son orientativos (basados en tablas habituales de condición física, ajustadas por sexo y edad).

import { EXPERIENCIA, NIVELES } from '../datos/catalogos.js';

// Umbrales [regular, aceptable, bueno, muy bueno] para menores de 30 años.
const BAREMOS = {
  flexiones: { hombre: [10, 20, 30, 40], mujer: [5, 12, 20, 30] },
  sentadillas_libre: { hombre: [20, 30, 40, 50], mujer: [15, 25, 35, 45] },  // 60 s
  sentadillas_silla: { hombre: [10, 14, 18, 22], mujer: [9, 13, 17, 21] },   // 30 s
  plancha: { hombre: [20, 45, 90, 150], mujer: [20, 45, 90, 150] },           // segundos
  dominadas: { hombre: [1, 5, 10, 15], mujer: [1, 3, 6, 10] },
  cooper: { hombre: [1600, 2000, 2400, 2800], mujer: [1400, 1700, 2000, 2400] }, // metros en 12 min
  caminata1600: { hombre: [4.8, 5.6, 6.4, 7.4], mujer: [4.6, 5.4, 6.2, 7.0] },  // km/h
  caminata6: { hombre: [450, 525, 600, 675], mujer: [420, 495, 570, 640] },     // metros en 6 min
};
// Las pruebas de caminata ya son de baja exigencia: no se rebajan por edad
const SIN_AJUSTE_EDAD = ['caminata1600', 'caminata6'];

// Cuánto vale cada variante frente a la versión estándar
const EQUIVALENCIA = {
  flexiones: { normal: 1, rodillas: 0.6, inclinada: 0.4, pared: 0.25 },
  plancha: { normal: 1, rodillas: 0.6, inclinada: 0.35 },
};

// Techo de puntuación de las pruebas de caminata: no pueden demostrar capacidad de carrera
const TECHO_CARDIO = { caminata6: 60, caminata1600: 75, cooper: 100 };

const factorEdad = e => (!e || e < 30 ? 1 : e < 40 ? 0.95 : e < 50 ? 0.85 : e < 60 ? 0.75 : 0.65);

// Convierte un valor en 0–100 usando los 4 umbrales (interpolación por tramos)
function escala(valor, umbrales) {
  if (valor == null || isNaN(valor)) return null;
  const puntos = [[0, 0], [umbrales[0], 25], [umbrales[1], 50], [umbrales[2], 70], [umbrales[3], 88], [umbrales[3] * 1.4, 100]];
  if (valor >= puntos[5][0]) return 100;
  for (let i = 1; i < puntos.length; i++) {
    const [x1, y1] = puntos[i], [x0, y0] = puntos[i - 1];
    if (valor <= x1) return Math.round(y0 + ((valor - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 100;
}

const baremo = (clave, sexo, edad) => {
  const f = SIN_AJUSTE_EDAD.includes(clave) ? 1 : factorEdad(edad);
  return (BAREMOS[clave][sexo] || BAREMOS[clave].hombre).map(u => u * f);
};

export function puntuarPruebas(atleta) {
  const { sexo, edad } = atleta.personal;
  const pr = atleta.pruebas || {};
  const r = { superior: null, traccion: null, piernas: null, core: null, cardio: null, movilidad: null, coordinacion: null };

  if (pr.flexiones?.reps != null) {
    const eq = pr.flexiones.reps * (EQUIVALENCIA.flexiones[pr.flexiones.variante] ?? 1);
    r.superior = escala(eq, baremo('flexiones', sexo, edad));
  }
  if (pr.dominadas?.reps != null) {
    r.traccion = pr.dominadas.reps === 0 ? 10 : escala(pr.dominadas.reps, baremo('dominadas', sexo, edad));
  }
  if (pr.sentadillas?.reps != null) {
    const clave = pr.sentadillas.variante === 'silla' ? 'sentadillas_silla' : 'sentadillas_libre';
    r.piernas = escala(pr.sentadillas.reps, baremo(clave, sexo, edad));
  }
  if (pr.plancha?.seg != null) {
    const eq = pr.plancha.seg * (EQUIVALENCIA.plancha[pr.plancha.variante] ?? 1);
    r.core = escala(eq, baremo('plancha', sexo, edad));
  }
  const c = pr.cardio;
  if (c) {
    let v = null;
    if (c.tipo === 'cooper' && c.metros) v = escala(c.metros, baremo('cooper', sexo, edad));
    if (c.tipo === 'caminata6' && c.metros) v = escala(c.metros, baremo('caminata6', sexo, edad));
    if (c.tipo === 'caminata1600' && c.minutos) v = escala(1.6 / (c.minutos / 60), baremo('caminata1600', sexo, edad));
    if (v != null) r.cardio = Math.min(v, TECHO_CARDIO[c.tipo]);
  }
  const m = pr.movilidad;
  if (m) {
    const vals = ['hombros', 'cadera', 'tobillos', 'tronco'].map(k => m[k]).filter(Boolean);
    if (vals.length) r.movilidad = Math.round(((vals.reduce((a, b) => a + b, 0) / vals.length - 1) / 2) * 100);
  }
  const co = pr.coordinacion;
  if (co) {
    const eqs = [co.equilibrioIzq, co.equilibrioDer].filter(v => v != null);
    const partes = [];
    if (eqs.length) partes.push([escala(Math.min(...eqs), [8, 15, 25, 40]), 0.5]);
    if (co.cruzado) partes.push([((co.cruzado - 1) / 2) * 100, 0.25]);
    if (co.direccion) partes.push([((co.direccion - 1) / 2) * 100, 0.25]);
    if (partes.length) {
      const peso = partes.reduce((a, [, p]) => a + p, 0);
      r.coordinacion = Math.round(partes.reduce((a, [v, p]) => a + v * p, 0) / peso);
    }
  }
  return r;
}

const ETIQUETAS_AREA = {
  superior: 'Fuerza de empuje (pecho, hombros, tríceps)',
  traccion: 'Fuerza de tracción (espalda y bíceps)',
  piernas: 'Fuerza de piernas',
  core: 'Resistencia del core',
  cardio: 'Resistencia cardiovascular',
  movilidad: 'Movilidad',
  coordinacion: 'Equilibrio y coordinación',
};

const media = arr => { const v = arr.filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

export function calcularPerfil(atleta, riesgo) {
  const p = puntuarPruebas(atleta);
  const fuerza = media([p.superior, p.traccion, p.piernas, p.core]);
  const expPuntos = (EXPERIENCIA.find(e => e.id === atleta.experiencia?.tiempo)?.puntos ?? 0);
  // Muchos años sin entrenar reducen el peso de la experiencia pasada
  const inact = atleta.experiencia?.inactividad;
  const expAjustada = inact === 'mas5a' ? expPuntos * 0.4 : inact === '1a5a' ? expPuntos * 0.6 : inact === '6a12m' ? expPuntos * 0.8 : expPuntos;
  const experiencia = expAjustada * 20;

  const componentes = [[fuerza, 0.35], [p.cardio, 0.30], [p.movilidad, 0.15], [p.coordinacion, 0.10], [experiencia, 0.10]];
  const validos = componentes.filter(([v]) => v != null);
  const pesoTotal = validos.reduce((a, [, w]) => a + w, 0);
  const global = Math.round(validos.reduce((a, [v, w]) => a + v * w, 0) / pesoTotal);

  const pruebasHechas = Object.values(p).filter(v => v != null).length;
  const factores = [];

  let nivel = global < 40 ? 'principiante' : global < 62 ? 'intermedio' : global < 80 ? 'avanzado' : 'alto_rendimiento';
  const limitar = (max, motivo) => {
    if (NIVELES[nivel].orden > NIVELES[max].orden) { nivel = max; factores.push(motivo); }
  };
  if (riesgo.nivel === 'alerta') limitar('principiante', 'Pendiente de valoración médica: empezamos como principiante por seguridad.');
  if (pruebasHechas < 3) limitar('intermedio', 'Pocas pruebas realizadas: nivel provisional hasta completar la evaluación.');
  if (['nunca', 'menos3m', '3a6m'].includes(atleta.experiencia?.tiempo)) limitar('intermedio', 'Poca experiencia de entrenamiento: primero construimos la base.');
  if (['1a5a', 'mas5a'].includes(inact)) limitar('intermedio', 'Mucho tiempo sin entrenar: articulaciones y tendones necesitan readaptarse.');
  if (!['1a2a', 'mas2a'].includes(atleta.experiencia?.tiempo)) limitar('avanzado', 'Alto rendimiento requiere más de un año de entrenamiento constante.');

  // Fortaleza y área a mejorar entre las capacidades medidas
  const medidas = Object.entries(p).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]);
  const fortaleza = medidas.length ? ETIQUETAS_AREA[medidas[0][0]] : null;
  const areaMejorar = medidas.length > 1 ? ETIQUETAS_AREA[medidas[medidas.length - 1][0]] : null;

  return {
    fecha: new Date().toISOString(),
    nivel,
    global,
    condicionInicial: Math.max(1, Math.min(10, Math.round(global / 10))),
    puntuaciones: { ...p, fuerza: fuerza == null ? null : Math.round(fuerza), experiencia: Math.round(experiencia) },
    fortaleza,
    areaMejorar,
    areaMejorarClave: medidas.length > 1 ? medidas[medidas.length - 1][0] : null,
    pruebasHechas,
    confianza: pruebasHechas >= 5 ? 'alta' : pruebasHechas >= 3 ? 'media' : 'baja',
    factores,
  };
}

export const ETIQUETAS_CAPACIDAD = ETIQUETAS_AREA;
