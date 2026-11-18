// FASE 4 — MOTOR DE NUTRICIÓN
// Calcula energía y nutrientes ORIENTATIVOS a partir del perfil del atleta (no solo del peso), arma
// menús variados con comida dominicana accesible respetando alergias, preferencias, salud y presupuesto,
// y genera la lista de compras. Nada de esto es una dieta terapéutica ni una prescripción.
// Revisado por la nutricionista deportiva del proyecto (déficit moderado, proteína con peso ajustado,
// mínimos por comida, carbohidratos ≥ 130 g, avisos médicos, comidas alrededor del entrenamiento).

import {
  ALIMENTOS, alimentoPorId, PLATOS, platoPorId, porcionBase, permitidoPorPatron, categoriaCompra,
  COMIDAS_POR_DIA, REPARTO_COMIDAS, ANTES_DE_ENTRENAR, PLANTILLAS_HORARIO, ALERGENOS,
} from '../datos/alimentos.js';
import { nutrientePorId } from '../datos/nutrientes.js';
import { imc } from './calculos.js';
import { fmtPeso } from './unidades.js';

export const OBJETIVOS_NUT = [
  { id: 'perdida_grasa', etiqueta: 'Pérdida de grasa', ajuste: -0.20, gkg: 1.8 },
  { id: 'recomposicion', etiqueta: 'Recomposición corporal', ajuste: -0.10, gkg: 1.8 },
  { id: 'mantenimiento', etiqueta: 'Mantenimiento', ajuste: 0, gkg: 1.6 },
  { id: 'ganancia_muscular', etiqueta: 'Ganancia muscular', ajuste: 0.10, gkg: 1.8 },
  { id: 'rendimiento', etiqueta: 'Rendimiento', ajuste: 0, gkg: 1.6 },
];
export const objetivoNut = id => OBJETIVOS_NUT.find(o => o.id === id) || OBJETIVOS_NUT[2];

const FACTOR_ACTIVIDAD = { sedentaria: 1.2, ligera: 1.375, activa: 1.55, muy_activa: 1.725 };
const r5 = v => Math.round(v / 5) * 5;
const r50 = v => Math.round(v / 50) * 50;

// =====================================================================
// Utilidades de hora
// =====================================================================
export const aMinutos = hhmm => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const aHora = min => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

// =====================================================================
// Objetivo y perfil nutricional inicial (a partir de la FASE 1)
// =====================================================================
export function objetivoDesdeFase1(atleta) {
  const { principal, seleccionados = [] } = atleta.objetivos || {};
  const obj = principal || seleccionados[0];
  const valorImc = imc(atleta.personal?.peso, atleta.personal?.estatura);
  if (['perder_grasa', 'bajar_peso'].includes(obj)) return 'perdida_grasa';
  if (obj === 'tonificar') return 'recomposicion';
  if (['ganar_musculo', 'ganar_fuerza', 'calistenia'].includes(obj)) return valorImc >= 27 ? 'recomposicion' : 'ganancia_muscular';
  if (!obj || ['mantener', 'movilidad'].includes(obj)) return 'mantenimiento';
  return 'rendimiento';
}

// Días de la semana en los que suele entrenar (0 = domingo … 6 = sábado)
export function diasEntrenoPorDefecto(dias) {
  return ({ 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] })[dias || 3] || [1, 3, 5];
}
export function horaEntrenoPorDefecto(horarios = []) {
  return ({ manana: '06:00', mediodia: '12:00', tarde: '17:30', noche: '19:30' })[horarios[0]] || '17:30';
}

export function perfilNutricionalInicial(atleta) {
  return {
    objetivo: objetivoDesdeFase1(atleta),
    comidas: 4,   // patrón dominicano: desayuno, almuerzo fuerte, merienda y cena ligera
    plantilla: 'normal',
    horarios: { ...PLANTILLAS_HORARIO[0].horarios },
    diasEntreno: diasEntrenoPorDefecto(atleta.disponibilidad?.dias),
    horaEntreno: horaEntrenoPorDefecto(atleta.disponibilidad?.horarios),
    presupuesto: { nivel: 'medio', monto: null, moneda: 'RD$' },
    precios: {},
  };
}

// =====================================================================
// Seguridad: condiciones de la FASE 1 que afectan a la alimentación
// =====================================================================
// No diagnostica: limita el plan cuando hace falta y recomienda consultar.
export function perfilMedico(atleta) {
  const s = atleta.seguridad || {};
  const q = s.cuestionario || {};
  const cond = s.condiciones || [];
  const si = v => v === 'si' || v === true;
  const p = atleta.personal || {};
  const valorImc = imc(p.peso, p.estatura);
  return {
    embarazo: si(q.embarazo),
    metabolica: cond.includes('metabolica'),
    cardio: si(q.corazon) || cond.includes('cardiaca'),
    medicacion: si(q.medicacion),
    cronica: si(q.cronica) || cond.includes('otra'),
    cirugia: si(q.cirugia),
    mayor65: (p.edad || 0) >= 65,
    menor18: !!p.edad && p.edad < 18,
    imcBajo: valorImc != null && valorImc < 18.5,
    imcMenor20: valorImc != null && valorImc < 20,
  };
}

export const AVISO_RELACION_COMIDA = 'Si la comida o el peso te generan mucha angustia, culpa o pérdida de control, habla con un profesional de la salud. Mereces apoyo, no más reglas.';

export function avisosNutricion(med) {
  const a = [];
  if (med.embarazo) a.push({ tipo: 'peligro', texto: 'Estás embarazada o tuviste un parto hace poco: en esta etapa no se recomienda buscar un déficit de calorías. Las necesidades cambian (también durante la lactancia), así que las cantidades de la app son solo una referencia general. Tu médico o una nutricionista deben guiar tu alimentación.' });
  if (med.metabolica) a.push({ tipo: 'peligro', texto: 'Indicaste una condición metabólica (por ejemplo diabetes). Comer menos y entrenar más puede bajar el azúcar en sangre, sobre todo si usas insulina u otros medicamentos para el azúcar. Habla con tu médico antes de empezar este plan: puede que haya que ajustar tu tratamiento. No te saltes comidas y ten a mano algo con azúcar rápida al entrenar.' });
  if (med.cardio) a.push({ tipo: 'precaucion', texto: 'Con presión alta o problemas del corazón conviene moderar la sal. Las mayores fuentes suelen ser los cubitos y sazones en polvo (sopitas), los embutidos (salami, jamón), el queso de freír, el bacalao salado y los enlatados. Enjuaga los enlatados y usa ajo, cebolla, ají, cilantro, orégano y limón para dar sabor. La OMS recomienda menos de 5 g de sal al día (una cucharadita rasa). Si tu médico te indicó limitar los líquidos, sigue su indicación por encima de la meta de la app.' });
  if (med.medicacion) a.push({ tipo: 'precaucion', texto: 'Tomas medicación: algunos alimentos y suplementos interactúan con medicamentos (por ejemplo, los vegetales verdes con anticoagulantes, o la toronja con algunos medicamentos para el colesterol y la presión). Antes de cambios grandes en tu alimentación o de usar suplementos, coméntalo con tu médico o farmacéutico.' });
  if (med.cronica) a.push({ tipo: 'precaucion', texto: 'Si tienes una enfermedad de los riñones o del hígado, la cantidad de proteína, potasio y líquidos debe indicarla tu médico. No sigas las cantidades de la app sin consultarlo.' });
  if (med.cirugia) a.push({ tipo: 'precaucion', texto: 'Si te operaron hace poco (incluida una cirugía para bajar de peso), tu alimentación debe seguir las indicaciones de tu equipo médico.' });
  if (med.mayor65) a.push({ tipo: 'info', texto: 'Después de los 65 años conviene perder peso despacio y con entrenamiento de fuerza, para proteger el músculo y los huesos.' });
  if (med.menor18) a.push({ tipo: 'precaucion', texto: 'En adolescentes no se calculan déficits de calorías: el cuerpo aún está creciendo. Consulta con un profesional.' });
  if (med.imcBajo || med.imcMenor20) a.push({ tipo: 'info', texto: 'Tu peso ya está en un rango bajo: la app no propone un déficit fuerte. Si quieres cambiar tu cuerpo, se enfoca en fuerza y en comer suficiente.' });
  return a;
}

// Objetivo permitido según la seguridad (el embarazo, la adolescencia y el peso bajo no admiten déficit)
export function objetivoSeguro(objetivo, med) {
  if (med.embarazo || med.menor18 || (med.imcBajo && ['perdida_grasa', 'recomposicion'].includes(objetivo))) return 'mantenimiento';
  if (med.imcMenor20 && objetivo === 'perdida_grasa') return 'recomposicion';
  return objetivo;
}
export const objetivosPermitidos = med => OBJETIVOS_NUT.filter(o => objetivoSeguro(o.id, med) === o.id);

// =====================================================================
// Energía y nutrientes orientativos
// =====================================================================
export function calcularNecesidades(atleta, perfilNut) {
  const p = atleta.personal || {};
  const faltan = [];
  const peso = p.peso || (faltan.push('peso'), p.sexo === 'mujer' ? 70 : 80);
  const est = p.estatura || (faltan.push('estatura'), p.sexo === 'mujer' ? 160 : 172);
  const edad = p.edad || (faltan.push('edad'), 45);
  const sexo = p.sexo || (faltan.push('sexo'), 'hombre');
  const med = perfilMedico(atleta);
  const pedido = perfilNut?.objetivo || objetivoDesdeFase1(atleta);
  const obj = objetivoNut(objetivoSeguro(pedido, med));

  // Gasto: Mifflin-St Jeor × actividad diaria + horas de entrenamiento
  const basal = 10 * peso + 6.25 * est - 5 * edad + (sexo === 'mujer' ? -161 : 5);
  const actividad = FACTOR_ACTIVIDAD[atleta.habitos?.actividad] ?? 1.3;
  const minutosEntreno = Math.min(atleta.disponibilidad?.minutos || 45, 90);
  const horasEntreno = ((atleta.disponibilidad?.dias || 3) * minutosEntreno) / 60;
  const gasto = basal * (actividad + Math.min(0.2, 0.03 * horasEntreno));
  // Déficit moderado (máx. 750 kcal; desde los 65 años máx. 15 % y 500 kcal) o superávit pequeño (máx. 350)
  let delta = gasto * (med.mayor65 ? Math.max(obj.ajuste, -0.15) : obj.ajuste);
  if (obj.ajuste < 0) delta = Math.max(delta, med.mayor65 ? -500 : -750);
  if (obj.ajuste > 0) delta = Math.min(delta, 350);
  const minimo = Math.max(basal, sexo === 'mujer' ? 1300 : 1500);
  const kcal = r50(obj.ajuste < 0 ? Math.max(gasto + delta, minimo) : gasto + delta);

  // Proteína con peso ajustado continuo: referencia saludable (IMC 25) + 25 % del exceso
  const m2 = (est / 100) ** 2;
  const pesoRef = peso / m2 > 25 ? Math.round(25 * m2 + 0.25 * (peso - 25 * m2)) : peso;
  const gkg = obj.gkg;
  let proteina = r5(pesoRef * gkg);
  if (edad >= 65) proteina = Math.max(proteina, r5(peso));
  let grasas = r5(Math.max((kcal * 0.28) / 9, pesoRef * 0.6));
  let carbohidratos = r5((kcal - proteina * 4 - grasas * 9) / 4);
  // Carbohidratos nunca por debajo de 130 g: primero se recortan grasas y luego proteína hasta su mínimo
  if (carbohidratos < 130) {
    grasas = Math.max(r5(pesoRef * 0.6), r5((kcal - proteina * 4 - 130 * 4) / 9));
    carbohidratos = r5((kcal - proteina * 4 - grasas * 9) / 4);
    if (carbohidratos < 130) {
      proteina = Math.max(r5(pesoRef * (gkg - 0.4)), r5((kcal - grasas * 9 - 130 * 4) / 4));
      carbohidratos = Math.max(130, r5((kcal - proteina * 4 - grasas * 9) / 4));
    }
  }
  const fibra = Math.max(25, Math.round((kcal / 1000) * 14));

  const explicaciones = [
    `Gasto diario estimado: unas ${r50(gasto)} kcal. Se calcula con tu edad, sexo, peso y estatura (fórmula de Mifflin-St Jeor), tu actividad diaria y tus ${atleta.disponibilidad?.dias || 3} días de entrenamiento. Es una estimación con un margen de error de ±10 % o más.`,
    {
      perdida_grasa: 'Para perder grasa se propone un déficit moderado: suficiente para avanzar sin perder músculo ni pasar hambre. Como referencia orientativa, muchas personas pierden entre 0,25 y 1 % de su peso por semana; las primeras semanas el peso suele bajar más por agua y luego se estabiliza. Cada cuerpo responde distinto: no es una promesa.',
      recomposicion: 'Recomposición: un déficit pequeño con proteína alta y entrenamiento de fuerza, para perder grasa y ganar o conservar músculo a la vez.',
      mantenimiento: 'Mantenimiento: energía parecida a la que gastas, para sostener tu peso mientras mejoras tu condición.',
      ganancia_muscular: 'Ganancia muscular: un pequeño superávit de energía junto con el entrenamiento de fuerza. Más comida no significa más músculo: el exceso se guarda como grasa.',
      rendimiento: 'Rendimiento: energía suficiente para entrenar bien y recuperarte.',
    }[obj.id],
    pesoRef !== peso
      ? `Proteína: unos ${gkg.toLocaleString('es')} g por kg de un peso ajustado de ${fmtPeso(pesoRef, atleta, { conOtra: true })} (tu peso saludable de referencia más una parte del resto), repartida en tus comidas: al menos 25–30 g en cada comida principal.`
      : `Proteína: unos ${gkg.toLocaleString('es')} g por kg de peso, repartida en tus comidas: al menos 25–30 g en cada comida principal.`,
    'Ajuste orientativo: si en 3–4 semanas el peso promedio baja menos de 0,25 % por semana, primero revisa si estás siguiendo el plan y luego se bajan 100–150 kcal; si baja más del 1 % por semana durante 2 semanas, se suben 100–200 kcal. Las necesidades se recalculan solas cuando registras tu peso.',
  ];
  if (obj.id !== pedido) explicaciones.unshift(`Por seguridad, tu objetivo nutricional queda en "${obj.etiqueta}" (ver los avisos).`);
  if (faltan.length) explicaciones.unshift(`Faltan datos en tu perfil (${faltan.join(', ')}): se usaron valores de referencia. Complétalos para un cálculo más ajustado.`);

  return {
    fecha: new Date().toISOString().slice(0, 10),
    objetivo: obj.id, objetivoPedido: pedido,
    basal: Math.round(basal), gasto: Math.round(gasto), kcal, rangoKcal: [r50(kcal * 0.9), r50(kcal * 1.1)],
    proteina, rangoProteina: [Math.round(pesoRef * (gkg - 0.4)), Math.round(pesoRef * (gkg + 0.2))],
    grasas, carbohidratos, fibra, pesoReferencia: pesoRef,
    avisos: avisosNutricion(med), medico: med,
    datos: { peso, estatura: est, edad, sexo, actividad: atleta.habitos?.actividad || 'sin dato', diasEntreno: atleta.disponibilidad?.dias || 3, minutosEntreno, comidas: perfilNut?.comidas || 4 },
    limites: SIN_LIMITES,
    faltan, explicaciones,
  };
}

// Límites del menú: solo los pone su nutrióloga (aplicarIndicaciones)
export const SIN_LIMITES = Object.freeze({ carbosComida: null, carbosDia: null, grasasDia: null, frutasDia: null, bajoSal: false, sodioMg: null });

// Plan de su nutrióloga desde su panel (los campos de datos/dietas.js): manda sobre el cálculo automático.
// Las cifras que no indica se calculan con las que sí; los alimentos van en el filtro y el menú fijo en generarSemana.
export function aplicarIndicaciones(nec, ind) {
  if (!ind) return nec;
  const proteina = ind.proteina || nec.proteina;
  const kcal = ind.kcal || (ind.carbohidratos && ind.grasas ? r50(proteina * 4 + ind.carbohidratos * 4 + ind.grasas * 9) : nec.kcal);
  const grasasMin = r5(nec.pesoReferencia * 0.5);
  let grasas, carbohidratos;
  if (ind.grasas && ind.carbohidratos) { grasas = ind.grasas; carbohidratos = ind.carbohidratos; }
  else if (ind.grasas) { grasas = ind.grasas; carbohidratos = Math.max(0, r5((kcal - proteina * 4 - grasas * 9) / 4)); }
  else if (ind.carbohidratos) { carbohidratos = ind.carbohidratos; grasas = Math.max(grasasMin, r5((kcal - proteina * 4 - carbohidratos * 4) / 9)); }
  else {
    grasas = r5(Math.max((kcal * 0.28) / 9, nec.pesoReferencia * 0.6));
    carbohidratos = r5((kcal - proteina * 4 - grasas * 9) / 4);
    if (carbohidratos < 100) {
      grasas = Math.max(grasasMin, r5((kcal - proteina * 4 - 100 * 4) / 9));
      carbohidratos = Math.max(0, r5((kcal - proteina * 4 - grasas * 9) / 4));
    }
  }
  const quien = ind.por || 'Tu nutrióloga';
  const cambios = [ind.kcal && `${ind.kcal} kcal`, ind.proteina && `${ind.proteina} g de proteína`,
    ind.carbohidratos && `${ind.carbohidratos} g de carbohidratos`, ind.grasas && `${ind.grasas} g de grasas`].filter(Boolean);
  const limites = {
    carbosComida: ind.carbos_comida || null, carbosDia: ind.carbohidratos || null, grasasDia: ind.grasas || null,
    frutasDia: Number.isFinite(ind.frutas_dia) ? ind.frutas_dia : null, bajoSal: !!ind.bajo_sal, sodioMg: ind.sodio_mg || null,
  };
  return {
    ...nec, kcal, proteina, grasas, carbohidratos, limites,
    rangoKcal: ind.kcal || ind.carbohidratos ? [r50(kcal * 0.95), r50(kcal * 1.05)] : nec.rangoKcal,
    rangoProteina: ind.proteina ? [proteina - 10, proteina + 10] : nec.rangoProteina,
    fibra: Math.max(25, Math.round((kcal / 1000) * 14)),
    datos: { ...nec.datos, comidas: ind.comidas || nec.datos.comidas },
    indicada: { por: quien, nota: ind.nota || '', dieta: ind.dieta || '', automatico: { kcal: nec.kcal, proteina: nec.proteina } },
    explicaciones: [
      ...(cambios.length ? [`${quien} ajustó tu plan a ${cambios.join(', ')} al día (el cálculo automático daba ${nec.kcal} kcal y ${nec.proteina} g de proteína).`] : []),
      ...nec.explicaciones,
    ],
  };
}

// =====================================================================
// Filtro de alimentos: alergias > patrón > rechazos; presupuesto y favoritos ordenan
// =====================================================================
const normal = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Lo que indica su nutrióloga: bajoSal quita lo de sal alta y reduce lo de sal media; prioridad.alimentos y
// prioridad.nutrientes ("ricos en hierro") hacen que esos alimentos salgan más.
export function crearFiltro({ preferencias = {}, restricciones = [], alergias = [], presupuesto = {}, bajoSal = false, prioridad = {} } = {}) {
  const alerg = new Set(alergias.map(a => a.alergeno).filter(Boolean));
  const otras = alergias.filter(a => a.alergeno === 'otra' && a.nota).flatMap(a => normal(a.nota).split(/[,;]+/).map(s => s.trim()).filter(s => s.length >= 3));
  const rechazados = new Set(restricciones.filter(r => r.tipo === 'rechazar').map(r => r.alimentoId));
  const reducir = new Set([...restricciones.filter(r => r.tipo === 'reducir').map(r => r.alimentoId),
    ...(bajoSal ? ALIMENTOS.filter(a => a.sal === 'media').map(a => a.id) : [])]);
  const favoritos = new Set(preferencias.favoritos || []);
  const priorizar = new Set((prioridad.alimentos || []).filter(id => !reducir.has(id)));
  const nutrientes = new Set(prioridad.nutrientes || []);
  const platosRechazados = new Set(preferencias.platosRechazados || []);
  const patron = preferencias.patron || 'omnivoro';
  const nivel = presupuesto.nivel || 'medio';

  const porAlergia = a => a.alerg.some(x => alerg.has(x)) || otras.some(o => normal(a.nombre).includes(o) || normal(a.corto).includes(o));
  // ¿Puede comerlo? (alergias, patrón, rechazos y sal)
  const permitido = id => {
    const a = alimentoPorId[id];
    return !!a && !porAlergia(a) && permitidoPorPatron(a, patron) && !rechazados.has(id) && !(bajoSal && a.sal === 'alta');
  };
  // ¿Lo propone el generador? Los ocasionales (salami, bacalao, arenque) solo si son favoritos o los prioriza su nutrióloga
  const elegible = id => permitido(id) && (!alimentoPorId[id].ocasional || favoritos.has(id) || priorizar.has(id));
  const aviso = id => {
    const a = alimentoPorId[id];
    const t = (a?.trazas || []).filter(x => alerg.has(x));
    if (!t.length) return null;
    return t.includes('gluten')
      ? `${a.nombre}: puede contener trazas de gluten por contaminación cruzada. Elige un producto certificado "sin gluten".`
      : `${a.nombre}: posible contaminación cruzada con ${t.join(', ')}. Revisa la etiqueta.`;
  };
  // Orden de preferencia (no excluye): presupuesto, favoritos, bajo consumo
  const penalizacion = id => {
    const a = alimentoPorId[id];
    let p = 0;
    if (nivel === 'bajo') p += a.costo === 3 ? 6 : a.costo === 2 ? 1.2 : 0;
    else if (nivel === 'medio') p += a.costo === 3 ? 1.5 : 0;
    if (favoritos.has(id)) p -= 0.8;
    if (reducir.has(id)) p += 1.5;
    if (priorizar.has(id)) p -= 1.2;
    if (nutrientes.size && a.nut.some(n => nutrientes.has(n))) p -= 0.6;
    return p;
  };
  const platoPermitido = id => !platosRechazados.has(id);
  return { permitido, elegible, platoPermitido, aviso, penalizacion, reducir, favoritos, priorizar, nutrientes, alerg, patron, nivel, rechazados, bajoSal };
}

// =====================================================================
// Totales, aportes y "¿por qué?" de una comida
// =====================================================================
export function totales(items) {
  const t = { kcal: 0, p: 0, c: 0, g: 0, f: 0 };
  for (const it of items) {
    const a = alimentoPorId[it.alimentoId]; if (!a) continue;
    const k = it.g / 100;
    t.kcal += a.kcal * k; t.p += a.p * k; t.c += a.c * k; t.g += a.g * k; t.f += a.f * k;
  }
  return { kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), g: Math.round(t.g), f: Math.round(t.f) };
}

// "✓ Proteína ✓ Fibra ✓ Vitamina C…" (aportar no significa tratar deficiencias)
export function aportes(items) {
  const t = totales(items);
  const lista = [];
  if (t.p >= 12) lista.push('proteina');
  if (t.f >= 4) lista.push('fibra');
  const tags = new Set(items.flatMap(it => alimentoPorId[it.alimentoId]?.nut || []));
  for (const id of ['vitA', 'vitB', 'vitC', 'vitD', 'vitE', 'vitK', 'calcio', 'hierro', 'magnesio', 'zinc', 'potasio', 'omega3']) if (tags.has(id)) lista.push(id);
  return lista.map(id => ({ id, nombre: nutrientePorId[id]?.nombre || id }));
}

const ROL_TEXTO = {
  proteina: a => (a.cat === 'legumbre' ? `${a.corto}: proteína vegetal, fibra y minerales` : `${a.corto}: proteína para reparar y conservar el músculo`),
  carbohidrato: a => `${a.corto}: energía para entrenar y para tu día`,
  legumbre: a => `${a.corto}: proteína vegetal, fibra y minerales`,
  vegetal: a => `${a.corto}: fibra, vitaminas y minerales con muy pocas calorías`,
  fruta: a => `${a.corto}: vitaminas, fibra y agua`,
  lacteo: a => `${a.corto}: calcio y proteína`,
  grasa: a => `${a.corto}: grasas saludables que ayudan a absorber las vitaminas A, D, E y K`,
};
export function porQue(comida, items) {
  const lineas = items.map(it => {
    const a = alimentoPorId[it.alimentoId]; if (!a) return null;
    return (it.rol === 'proteina' ? ROL_TEXTO.proteina : ROL_TEXTO[a.cat] || ROL_TEXTO.vegetal)(a);
  }).filter(Boolean);
  const contexto = [];
  if (comida.post) contexto.push('Es tu comida después de entrenar: la proteína y el carbohidrato ayudan a recuperarte. No hace falta comer de inmediato; lo importante es lo que comes en el día y que esta comida llegue en las horas siguientes.');
  if (comida.pre) contexto.push('Está cerca de tu entrenamiento: la porción es más pequeña y fácil de digerir para que no te pese. El resto lo comes después.');
  const nota = platoPorId[comida.platoId]?.nota;
  if (nota) contexto.push(`👨‍🍳 ${nota}`);
  return { lineas: [...new Set(lineas)], contexto };
}

// =====================================================================
// Porciones legibles ("2 huevos (100 g)", "160 g (≈ 1 taza)")
// =====================================================================
const FRACCION = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
function fraccion(x) {
  const q = Math.round(x * 4) / 4;
  const ent = Math.floor(q), dec = q - ent;
  return dec ? `${ent || ''}${FRACCION[dec]}` : String(ent);
}
export const plural = (n, texto) => (n > 1 || n === 0)
  ? texto.split(' ').map(w => (/^[a-záéíóúñ]+$/i.test(w) && w !== 'de' ? (/[aeiouáéó]$/i.test(w) ? `${w}s` : `${w}es`) : w)).join(' ')
  : texto;

export function textoPorcion(alimentoId, g) {
  const a = alimentoPorId[alimentoId]; if (!a) return `${g} g`;
  const base = `${Math.round(g)} ${a.compra === 'litro' ? 'ml' : 'g'}`;
  if (a.unidad && !['vegetal', 'grasa'].includes(a.cat)) {
    const u = g / a.unidad.g;
    if (Math.abs(u * 2 - Math.round(u * 2)) < 0.05) return `${fraccion(u)} ${plural(u, a.unidad.n)} (${base})`;
  }
  if (a.medida && g / a.medida.g >= 0.2) { const r = g / a.medida.g; return `${base} (≈ ${fraccion(r)} ${plural(Math.round(r * 4) / 4, a.medida.n)})`; }
  return base;
}

// =====================================================================
// Armado de una comida: elegir alimentos por hueco y ajustar porciones
// =====================================================================
const redondear = (a, g) => {
  if (a.unidad && ['proteina', 'carbohidrato', 'fruta'].includes(a.cat)) {
    const paso = a.unidad.g >= 150 ? 0.5 : 1;
    return Math.max(paso, Math.round(g / a.unidad.g / paso) * paso) * a.unidad.g;
  }
  return g < 50 ? Math.max(5, Math.round(g / 5) * 5) : Math.round(g / 10) * 10;
};
const sujetar = (a, g) => { const [mn, mx] = a.rango || [60, 250]; return Math.min(mx, Math.max(mn, g)); };
export const redondearPorcion = (alimentoId, g) => redondear(alimentoPorId[alimentoId], g);

// Tope de carbohidratos de la comida (lo indica su nutrióloga): se achica lo que "ajusta" la energía, sin bajar de
// su porción mínima. Si aun así se pasa, el generador prueba otro plato.
function recortarCarbos(items, cMax) {
  for (const it of items.filter(i => i.rol === 'ajusta').sort((x, y) => alimentoPorId[y.alimentoId].c - alimentoPorId[x.alimentoId].c)) {
    const exceso = totales(items).c - cMax;
    if (exceso <= 0) return;
    const a = alimentoPorId[it.alimentoId];
    if (a.c <= 0) continue;
    const minimo = (a.rango || [60])[0];
    const carbosCon = g => totales(items.map(x => (x === it ? { ...x, g } : x))).c;
    let g = Math.min(it.g, redondear(a, Math.max(minimo, it.g - (exceso / a.c) * 100)));
    // El redondeo a piezas puede dejarlo un poco por encima: se baja de a una pieza (o 10 g) mientras se pueda
    for (let n = 0; n < 40 && g > minimo && carbosCon(g) > cMax; n++) {
      const menos = redondear(a, Math.max(minimo, g - (a.unidad?.g || 10)));
      if (menos >= g) break;
      g = menos;
    }
    it.g = g;
  }
}

// plato + objetivo de la comida { kcal, p, cMax } + elegir(slot, idx, yaElegidos) → [ids]
export function armarComida(plato, objetivo, elegir) {
  const items = [];
  for (const [idx, slot] of plato.slots.entries()) {
    const ids = elegir(slot, idx, items.map(i => i.alimentoId));
    if (!ids || ids.length < (slot.n || 1)) { if (slot.opcional) continue; return null; }
    for (const id of ids) items.push({ alimentoId: id, rol: slot.rol, slot: idx, g: 0, opcional: !!slot.opcional });
  }
  // 1) Porciones fijas · 2) proteína hasta el objetivo · 3) energía con el alimento que "ajusta"
  // 4) proteína opcional solo si todavía faltan 8 g o más
  for (const it of items.filter(i => i.rol === 'fijo')) it.g = plato.slots[it.slot].g ?? porcionBase(alimentoPorId[it.alimentoId]);
  const prot = items.filter(i => i.rol === 'proteina' && !i.opcional);
  const ajusta = items.filter(i => i.rol === 'ajusta');
  for (const it of prot) {
    const a = alimentoPorId[it.alimentoId];
    const falta = (objetivo.p - totales(items.filter(x => x.rol === 'fijo')).p) / prot.length;
    it.g = redondear(a, sujetar(a, (falta / Math.max(a.p, 1)) * 100));
  }
  const repartirEnergia = () => {
    for (const it of ajusta) {
      const a = alimentoPorId[it.alimentoId];
      const resto = (objetivo.kcal - totales(items.filter(x => x.rol !== 'ajusta' && x.g > 0)).kcal) / ajusta.length;
      it.g = redondear(a, sujetar(a, (resto / a.kcal) * 100));
    }
  };
  repartirEnergia();
  // La proteína opcional solo entra si cabe en la energía de la comida (hasta un 10 % más); si no, se queda fuera
  for (const it of items.filter(i => i.rol === 'proteina' && i.opcional)) {
    const falta = objetivo.p - totales(items.filter(x => x.g > 0)).p;
    if (falta < 8) continue;
    const a = alimentoPorId[it.alimentoId];
    it.g = redondear(a, sujetar(a, (falta / a.p) * 100));
    repartirEnergia();
    if (totales(items.filter(x => x.g > 0)).kcal > objetivo.kcal * 1.1) { it.g = 0; repartirEnergia(); }
  }
  if (objetivo.cMax) recortarCarbos(items, objetivo.cMax);
  return items.filter(i => i.g > 0);
}

// Nombre de un plato para elegirlo (sin saber aún qué alimentos llevará): con la primera opción de cada hueco
export function nombreGenerico(plato) {
  const items = plato.slots.map((s, slot) => (s.opcional ? null : { alimentoId: s.op[0], rol: s.rol, slot, g: 1 })).filter(Boolean);
  return nombreComida(plato, items);
}

export function nombreComida(plato, items) {
  const claves = {};
  for (const it of items) {
    const s = plato.slots[it.slot];
    const k = it.rol === 'proteina' ? (s.opcional ? 'extra' : 'proteina') : it.rol === 'ajusta' ? 'ajusta' : s.cat;
    (claves[k] ||= []).push(alimentoPorId[it.alimentoId].corto);
  }
  const lista = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l[0]);
  let n = plato.nombre;
  for (const s of plato.slots) if (s.sufijo && items.some(i => plato.slots[i.slot] === s)) n += s.sufijo;
  n = n.replace(/\{(\w+)\}/g, (_, k) => (claves[k] ? lista(claves[k]) : ''))
    .replace(/,\s*(?=\s*y\s)/g, '').replace(/\s+,/g, ',').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/[\s,]+y?\s*$/, '').trim();
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export const platoPosible = (plato, ok) => plato.slots.every(s => s.opcional || s.op.filter(ok).length >= (s.n || 1));

// Azar con semilla: el mismo plan se reproduce igual
function azar(semilla) {
  let h = 1779033703 ^ String(semilla).length;
  for (const ch of String(semilla)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// =====================================================================
// Plan de una semana
// =====================================================================
// inicio: lunes (ISO). usoPrevio: alimentos de la semana anterior, para variar entre semanas.
// extras: platos de las recetas que le asignó su nutrióloga (RECETAS: motor/recetas.js recetaComoPlato); salen primero.
// menu: platos que eligió su nutrióloga { díaDeLaSemana (0 = domingo): { tipoDeComida: idDelPlato } }; mandan sobre el azar.
// nec.limites (aplicarIndicaciones): tope de carbohidratos por comida y del día, grasas del día y frutas al día.
export function generarSemana({ nec, perfilNut, filtro, inicio, semilla = '', usoPrevio = {}, cultura = 'general', extras = [], menu = {} }) {
  const rnd = azar(`${semilla}|${inicio}`);
  const lim = nec.limites || SIN_LIMITES;
  const todosLosPlatos = [...extras, ...PLATOS];
  const platoDe = id => todosLosPlatos.find(p => p.id === id);
  const n = COMIDAS_POR_DIA[perfilNut?.comidas] ? perfilNut.comidas : 4;
  const tipos = COMIDAS_POR_DIA[n];
  const reparto = REPARTO_COMIDAS[n];
  const diasEntreno = perfilNut?.diasEntreno || [1, 3, 5];
  const D = diasEntreno.length;
  // Días de entrenamiento +5 % de energía; los de descanso un poco menos (la semana queda igual)
  const extraEntreno = D > 0 && D < 7 ? 0.05 : 0;
  const menosDescanso = D > 0 && D < 7 ? (0.05 * D) / (7 - D) : 0;
  const horaEntreno = aMinutos(perfilNut?.horaEntreno || '17:30');
  const finEntreno = horaEntreno + (nec.datos?.minutosEntreno || 45);
  // Proteína mínima: comida principal ≥ max(25 g, 0,3 g/kg), 30 g desde los 40 años; meriendas ≥ 10 g
  const pisoPrincipal = Math.max((nec.datos?.edad || 0) >= 40 ? 30 : 25, Math.round(0.3 * (nec.pesoReferencia || 70)));
  const esPrincipal = t => !['media', 'merienda'].includes(t);
  const uso = Object.fromEntries(Object.entries(usoPrevio).map(([k, v]) => [k, v * 0.5]));
  const usoPlato = {}, ayer = {};
  const dias = [];

  for (let d = 0; d < 7; d++) {
    const f = new Date(inicio + 'T12:00:00'); f.setDate(f.getDate() + d);
    const fecha = f.toISOString().slice(0, 10);
    const entreno = diasEntreno.includes(f.getDay());
    const factorDia = entreno ? 1 + extraEntreno : 1 - menosDescanso;
    const horas = tipos.map(t => aMinutos(perfilNut?.horarios?.[t]));
    // Alrededor del entrenamiento: una comida principal entre 60 min antes y el final se mueve a después
    // (fin + 30 min); 60–120 min antes → 50 % de la porción; 120–180 min → 85 %. Lo recortado va a la de después.
    const factores = tipos.map(() => 1);
    const movidas = new Set();
    let preIdx = -1;
    if (entreno) tipos.forEach((t, k) => {
      if (!esPrincipal(t)) return;
      const antes = horaEntreno - horas[k];
      if (horas[k] <= finEntreno && antes < 60) { horas[k] = finEntreno + 30; movidas.add(k); }
      else if (antes >= 60 && antes < 120) { factores[k] = 0.5; preIdx = k; }
      else if (antes >= 120 && antes < 180) { factores[k] = 0.85; preIdx = k; }
    });
    const postIdx = entreno ? horas.reduce((m, h, k) => (h > finEntreno && esPrincipal(tipos[k]) && (m < 0 || h < horas[m]) ? k : m), -1) : -1;
    if (preIdx >= 0 && postIdx < 0) factores[preIdx] = 1;   // sin comida después, no se recorta
    const recortado = factores.reduce((a, fac, k) => a + reparto[tipos[k]] * (1 - fac), 0);
    const hoyUsados = new Set(), platosHoy = new Set();
    const comidas = [];
    let frutasHoy = 0;

    for (const [k, tipo] of tipos.entries()) {
      const parte = reparto[tipo] * factores[k] + (k === postIdx ? recortado : 0);
      const pisoP = esPrincipal(tipo) ? pisoPrincipal * Math.min(1, factores[k] + 0.25) : 10;
      const cMax = Math.min(lim.carbosComida || Infinity, lim.carbosDia ? lim.carbosDia * factorDia * parte * 1.15 : Infinity);
      const objetivo = { kcal: nec.kcal * factorDia * parte, p: Math.max(nec.proteina * parte, pisoP), cMax: Number.isFinite(cMax) ? cMax : null };
      const gMax = lim.grasasDia ? lim.grasasDia * factorDia * parte * 1.3 : null;
      const esPre = k === preIdx;
      // Alimentos posibles aquí: elegibles, no pesados antes de entrenar, ocasionales como mucho 1 vez por semana,
      // y frutas solo mientras no se llegue al tope del día
      const ok = id => filtro.elegible(id) && !(esPre && alimentoPorId[id].ligeroPre === false)
        && !(alimentoPorId[id].ocasional && (uso[id] || 0) >= 1) && !(filtro.reducir.has(id) && (uso[id] || 0) >= 2)
        && !(lim.frutasDia != null && alimentoPorId[id].cat === 'fruta' && frutasHoy >= lim.frutasDia);

      const platos = todosLosPlatos.filter(p => filtro.platoPermitido(p.id));
      let candidatos = platos.filter(p => p.tipos.includes(tipo) && platoPosible(p, ok));
      // Respaldo: nunca se deja una comida vacía (importante con diabetes); se prueban platos de otros momentos
      if (!candidatos.length) candidatos = platos.filter(p => platoPosible(p, ok));
      const puntos = p => (usoPlato[p.id] || 0) + (ayer[tipo] === p.id ? 3 : 0) + (platosHoy.has(p.id) ? 4 : 0)
        + (p.cultura ? (cultura === p.cultura ? -0.8 : cultura === 'general' ? 0.4 : 0.8) : 0)
        + (filtro.nivel === 'bajo' && p.bajo ? -0.6 : 0) + (p.receta ? -1.5 : 0) + rnd() * 0.9
        - (filtro.priorizar.size && p.slots.some(s => s.op.some(id => filtro.priorizar.has(id) && ok(id))) ? 1.2 : 0);
      let orden = candidatos.map(p => [p, puntos(p)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
      // El plato que eligió su nutrióloga MANDA, aunque choque con lo que ella marcó (alergias, lo que no come…):
      // dentro del plato se prefieren los alimentos que sí puede comer, y si no hay, va lo del plato con un aviso
      const elegido = platoDe(menu[f.getDay()]?.[tipo]);
      if (elegido) orden = [elegido, ...orden.filter(p => p !== elegido)];

      // Se toma el primer plato que cabe en su energía (±12–15 %) y en los límites; si ninguno cabe, el que menos se aleja
      const exceso = its => {
        const t = totales(its);
        return Math.max(0, t.kcal / objetivo.kcal - 1.12) + Math.max(0, 0.85 - t.kcal / objetivo.kcal)
          + (objetivo.cMax ? Math.max(0, t.c / objetivo.cMax - 1.1) : 0) + (gMax ? Math.max(0, t.g / gMax - 1) : 0);
      };
      // Con mucha proteína para la energía de la comida, se prefieren las proteínas magras (pollo, atún, claras…)
      const protJusta = (objetivo.p * 4) / objetivo.kcal > 0.25;
      const grasaDeProteina = a => (protJusta ? Math.max(0, a.kcal / Math.max(a.p, 1) - 6) * 0.12 : 0);
      let items = null, plato = null, mejor = null;
      for (const p of orden) {
        const its = armarComida(p, objetivo, (slot, idx, ya) => {
          const frutasYa = frutasHoy + ya.filter(id => alimentoPorId[id].cat === 'fruta').length;
          const caben = lim.frutasDia == null ? Infinity : lim.frutasDia - frutasYa;
          let op = slot.op.filter(id => ok(id) && !ya.includes(id));
          if (caben < (slot.n || 1)) op = op.filter(id => alimentoPorId[id].cat !== 'fruta');
          if (p === elegido && op.length < (slot.n || 1)) op = [...new Set([...op, ...slot.op.filter(id => alimentoPorId[id] && !ya.includes(id))])];
          const pts = id => (uso[id] || 0) + filtro.penalizacion(id) + (slot.rol === 'proteina' ? (hoyUsados.has(id) ? 2 : 0) + grasaDeProteina(alimentoPorId[id]) : 0) + rnd() * 0.7;
          return op.map(id => [id, pts(id)]).sort((a, b) => a[1] - b[1]).slice(0, slot.n || 1).map(x => x[0]);
        });
        if (!its) continue;
        const e = p === elegido ? 0 : exceso(its);
        if (e === 0) { items = its; plato = p; break; }
        if (!mejor || e < mejor.e) mejor = { its, p, e };
      }
      if (!items && mejor) ({ its: items, p: plato } = mejor);
      if (!items) continue;   // solo si ningún plato es compatible con las alergias y rechazos
      for (const it of items) {
        uso[it.alimentoId] = (uso[it.alimentoId] || 0) + 1; hoyUsados.add(it.alimentoId);
        if (alimentoPorId[it.alimentoId].cat === 'fruta') frutasHoy++;
      }
      usoPlato[plato.id] = (usoPlato[plato.id] || 0) + 1;
      platosHoy.add(plato.id);
      ayer[tipo] = plato.id;
      comidas.push({ tipo, hora: aHora(horas[k]), platoId: plato.id, recetaId: plato.recetaId || null, nombre: nombreComida(plato, items), items,
        totales: totales(items), pre: esPre, post: k === postIdx, movida: movidas.has(k), indicada: plato === elegido,
        avisoIndicada: plato === elegido ? avisoDelElegido(items, filtro) : null });
    }
    comidas.sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora));
    dias.push({ fecha, entreno, comidas });
  }
  const usoFinal = {};
  for (const d of dias) for (const c of d.comidas) for (const it of c.items) usoFinal[it.alimentoId] = (usoFinal[it.alimentoId] || 0) + 1;
  return { inicio, dias, uso: usoFinal };
}

// Si el plato que eligió su nutrióloga lleva algo que ella normalmente no come, se le avisa en esa comida
function avisoDelElegido(items, filtro) {
  const fuera = items.map(i => alimentoPorId[i.alimentoId]).filter(a => a && !filtro.permitido(a.id));
  if (!fuera.length) return null;
  const alergia = [...new Set(fuera.flatMap(a => a.alerg.filter(x => filtro.alerg.has(x))))]
    .map(x => (ALERGENOS.find(e => e.id === x)?.etiqueta || x).split(' (')[0].toLowerCase());
  const lista = fuera.map(a => a.corto).join(', ');
  return alergia.length
    ? `Tu nutrióloga eligió este plato aunque lleva ${lista} y marcaste alergia a ${alergia.join(' y ')}. Si tienes dudas, escríbele antes de comerlo.`
    : `Tu nutrióloga eligió este plato aunque lleva ${lista}, que normalmente no sale en tu menú. Si tienes dudas, escríbele.`;
}

// =====================================================================
// CAMBIAR un alimento: alternativas con la porción equivalente (misma proteína o misma energía)
// =====================================================================
export function alternativas(comida, item, filtro, max = 6) {
  const plato = platoPorId[comida.platoId];
  const slot = plato?.slots[item.slot];
  const actual = alimentoPorId[item.alimentoId];
  const enComida = new Set((comida.items || []).map(i => i.alimentoId));
  const delPlato = new Set(slot?.op || []);
  const mismoTipo = b => (item.rol === 'proteina' ? ['proteina', 'legumbre', 'lacteo'].includes(b.cat) && b.p >= 8 : b.cat === actual.cat);
  const candidatos = ALIMENTOS.filter(b => b.id !== actual.id && !enComida.has(b.id) && filtro.permitido(b.id) && (delPlato.has(b.id) || mismoTipo(b)));
  const t0 = totales([item]);
  return candidatos.map(b => {
    let g = item.rol === 'proteina' ? (t0.p / Math.max(b.p, 1)) * 100 : item.rol === 'ajusta' ? (t0.kcal / b.kcal) * 100 : (slot?.g ?? porcionBase(b));
    g = redondear(b, item.rol === 'fijo' ? g : sujetar(b, g));
    const t = totales([{ alimentoId: b.id, g }]);
    const distancia = Math.abs(t.kcal - t0.kcal) / 50 + Math.abs(t.p - t0.p) / 4 + (delPlato.has(b.id) ? 0 : 0.6) + filtro.penalizacion(b.id) * 0.3 + (b.ocasional ? 2 : 0);
    return { alimentoId: b.id, g, totales: t, distancia };
  }).sort((a, b) => a.distancia - b.distancia).slice(0, max);
}

// =====================================================================
// "NO LO TENGO" / "NO ME LO COMÍ": otros platos del mismo momento del día con energía y proteína parecidas
// =====================================================================
// Evita en lo posible los alimentos del plato actual (puede que no los tenga en casa).
export function platosParecidos(comida, filtro, max = 3) {
  const items0 = comida.items || [];
  const t0 = items0.length ? totales(items0) : (comida.totales || { kcal: 0, p: 0 });
  const objetivo = { kcal: t0.kcal, p: t0.p };
  const actuales = new Set(items0.map(i => i.alimentoId));
  const ok = id => filtro.elegible(id) && !(comida.pre && alimentoPorId[id].ligeroPre === false);
  const candidatos = PLATOS.filter(p => p.id !== comida.platoId && filtro.platoPermitido(p.id) && p.tipos.includes(comida.tipo) && platoPosible(p, ok));
  return candidatos.map(p => {
    const items = armarComida(p, objetivo, (slot, idx, ya) => slot.op.filter(id => ok(id) && !ya.includes(id))
      .map(id => [id, filtro.penalizacion(id) + (actuales.has(id) ? 3 : 0)]).sort((a, b) => a[1] - b[1]).slice(0, slot.n || 1).map(x => x[0]));
    if (!items) return null;
    const t = totales(items);
    const repetidos = items.filter(i => actuales.has(i.alimentoId)).length;
    const distancia = Math.abs(t.kcal - objetivo.kcal) / 50 + Math.abs(t.p - objetivo.p) / 4 + repetidos * 1.5 + (filtro.nivel === 'bajo' && p.bajo ? -0.5 : 0);
    return { platoId: p.id, nombre: nombreComida(p, items), items, totales: t, distancia };
  }).filter(Boolean).sort((a, b) => a.distancia - b.distancia).slice(0, max);
}

// =====================================================================
// Lista de compras: cantidades en crudo y precio de referencia en RD$
// =====================================================================
export function cantidadCompra(alimentoId, gramosComidos) {
  const a = alimentoPorId[alimentoId];
  const g = gramosComidos * (a.factor || 1);
  if ((a.compra === 'unidad' || a.compra === 'lata') && a.unidad) {
    const n = Math.max(1, Math.ceil(g / a.unidad.g - 0.15));
    return { num: n, unidad: a.unidad.n, texto: `${n} ${plural(n, a.unidad.n)}`, precio: a.precio ? Math.round(n * a.precio.rd) : null };
  }
  if (a.compra === 'litro') {
    const l = Math.max(0.25, Math.ceil(g / 250) * 0.25);
    return { num: l, unidad: 'L', texto: `${l.toLocaleString('es')} L`, precio: a.precio ? Math.round(l * a.precio.rd) : null };
  }
  // Por peso, en libras (como se compra en el colmado y el súper)
  const lb = Math.max(0.25, Math.ceil((g / 453.6) * 4) / 4);
  const seco = a.cat === 'legumbre' ? ' en seco (o latas: 1 lata ≈ 250 g cocidos)' : a.factor < 1 ? ' en crudo' : '';
  return { num: lb, unidad: 'lb', texto: `${lb.toLocaleString('es')} lb (≈ ${Math.round(g / 50) * 50} g)${seco}`, precio: a.precio ? Math.round(lb * a.precio.rd) : null };
}

// items: alimentos de las comidas de la semana → productos agrupados
export function listaComprasDesde(items) {
  const suma = {};
  for (const it of items) suma[it.alimentoId] = (suma[it.alimentoId] || 0) + it.g;
  return Object.entries(suma).filter(([id]) => alimentoPorId[id]).map(([id, g]) => {
    const a = alimentoPorId[id];
    const c = cantidadCompra(id, g);
    return { alimentoId: id, nombre: a.nombre, categoria: categoriaCompra(a), cantidad: c.texto, cantidadNum: c.num, unidad: c.unidad, gramos: Math.round(g), precioRef: c.precio };
  }).sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
}

// =====================================================================
// ⚡ Antes de entrenar
// =====================================================================
export function antesDeEntrenar(minutosHasta, filtro, med = {}) {
  if (minutosHasta == null || minutosHasta < 0) return null;
  const opciones = ANTES_DE_ENTRENAR.filter(o => o.alimentos.every(id => filtro.permitido(id)) && o.minutos <= Math.max(30, minutosHasta)).map(o => o.texto);
  let texto;
  if (minutosHasta > 180) texto = 'Faltan más de 3 horas: tu próxima comida planificada sirve como preparación.';
  else if (minutosHasta >= 60) texto = 'Si tienes hambre y vas a entrenar próximamente, puedes elegir una merienda ligera adecuada a tu tolerancia.';
  else texto = med.metabolica
    ? 'Falta menos de una hora: si usas medicamentos para el azúcar, sigue la indicación de tu médico sobre comer antes de entrenar.'
    : 'Falta menos de una hora: si tienes hambre, algo muy ligero y fácil de digerir. Si no tienes hambre, entrena con agua; no hace falta comer.';
  const extra = med.metabolica ? '' : ' Si entrenas temprano en ayunas y te sientes bien, también es válido; si te mareas, come algo ligero antes.';
  return { texto, opciones, aviso: `Evita una comida pesada justo antes de entrenar: puede causar molestias.${extra}` };
}
