// Plan de comidas que indica la nutrióloga desde la ficha de su clienta (vistas/plan-doctora.js), y las
// dietas listas para empezar según el estado clínico. Las dietas son un PUNTO DE PARTIDA: ella las revisa,
// las ajusta a cada clienta y decide; la app no diagnostica ni prescribe.
//
// El plan usa los mismos nombres que la tabla "indicaciones" de la nube (supabase/plan-doctora.sql):
//   kcal, proteina, carbohidratos, grasas (g al día) · carbos_comida (máximo por comida) · frutas_dia (máximo)
//   bajo_sal + sodio_mg · agua_ml + agua_maximo (límite de líquidos) · comidas (3, 4 o 5 al día)
//   no_come, reducir, priorizar (alimentos) · nutrientes (a priorizar) · menu { día: { comida: plato } } · nota · dieta
// Una dieta lista puede traer además proteina_gkg (g por kg de peso de referencia) y grasas_pct (% de las calorías):
// se convierten en gramos al aplicarla, con los datos de cada clienta.

import { alimentoPorId } from './alimentos.js';

export const CIFRAS = ['kcal', 'proteina', 'carbohidratos', 'grasas', 'carbos_comida', 'frutas_dia', 'sodio_mg', 'agua_ml', 'comidas'];
export const LISTAS = ['no_come', 'reducir', 'priorizar', 'nutrientes'];
// Límites: al juntar dos dietas queda el más estricto
const TOPES = ['carbos_comida', 'frutas_dia', 'sodio_mg'];

export const planVacio = () => ({
  kcal: null, proteina: null, carbohidratos: null, grasas: null, carbos_comida: null, frutas_dia: null,
  bajo_sal: false, sodio_mg: null, agua_ml: null, agua_maximo: false, comidas: null,
  no_come: [], reducir: [], priorizar: [], nutrientes: [], menu: {}, nota: '', dieta: '',
});

// De lo guardado en la nube (o en una dieta) a un plan completo
export function planDesde(fila) {
  const p = planVacio();
  if (!fila) return p;
  for (const k of CIFRAS) p[k] = Number.isFinite(fila[k]) ? fila[k] : null;
  for (const k of LISTAS) p[k] = Array.isArray(fila[k]) ? [...fila[k]] : [];
  p.bajo_sal = !!fila.bajo_sal;
  p.agua_maximo = !!fila.agua_maximo && !!p.agua_ml;
  p.menu = limpiarMenu(fila.menu);
  p.nota = fila.nota || '';
  p.dieta = fila.dieta || '';
  return p;
}

// Quita los días y comidas vacíos del menú
export function limpiarMenu(menu) {
  const fuera = {};
  for (const [dia, comidas] of Object.entries(menu || {})) {
    const llenas = Object.fromEntries(Object.entries(comidas || {}).filter(([, plato]) => plato));
    if (Object.keys(llenas).length) fuera[dia] = llenas;
  }
  return fuera;
}

// ¿El plan no indica nada? (entonces la clienta vuelve al cálculo automático)
export const planVacioEs = p => CIFRAS.every(k => p[k] == null) && LISTAS.every(k => !p[k].length)
  && !p.bajo_sal && !Object.keys(limpiarMenu(p.menu)).length && !p.nota.trim();

// Suma una dieta al plan que ya tiene la clienta. auto: el cálculo automático de la app (para proteina_gkg y grasas_pct).
// Cifras de la dieta: mandan · límites: el más estricto · comidas: las más · listas: se juntan · nota: se añade.
export function combinarDieta(plan, dieta, auto = null) {
  const d = dieta.datos || {};
  const p = { ...plan, menu: { ...plan.menu } };
  for (const k of ['kcal', 'proteina', 'carbohidratos', 'grasas', 'agua_ml']) if (d[k] != null) p[k] = d[k];
  if (d.proteina_gkg && auto?.pesoReferencia) p.proteina = Math.round((auto.pesoReferencia * d.proteina_gkg) / 5) * 5;
  if (d.grasas_pct) { const kcal = p.kcal || auto?.kcal; if (kcal) p.grasas = Math.round((kcal * d.grasas_pct) / 100 / 9 / 5) * 5; }
  for (const k of TOPES) if (d[k] != null) p[k] = p[k] == null ? d[k] : Math.min(p[k], d[k]);
  if (d.comidas) p.comidas = Math.max(p.comidas || 0, d.comidas);
  if (d.bajo_sal) p.bajo_sal = true;
  if (d.agua_ml != null) p.agua_maximo = !!d.agua_maximo;
  for (const k of LISTAS) p[k] = [...new Set([...p[k], ...(d[k] || [])])];
  // Lo prohibido no se reduce ni se prioriza; lo reducido no se prioriza
  p.reducir = p.reducir.filter(id => !p.no_come.includes(id));
  p.priorizar = p.priorizar.filter(id => !p.no_come.includes(id) && !p.reducir.includes(id));
  for (const [dia, comidas] of Object.entries(d.menu || {})) p.menu[dia] = { ...(p.menu[dia] || {}), ...comidas };
  p.menu = limpiarMenu(p.menu);
  if (d.nota && !p.nota.includes(d.nota)) p.nota = [p.nota.trim(), d.nota].filter(Boolean).join('\n');
  const nombres = p.dieta ? p.dieta.split(' + ') : [];
  if (!nombres.includes(dieta.nombre)) p.dieta = [...nombres, dieta.nombre].join(' + ').slice(0, 120);
  return p;
}

// Una dieta guardada por la doctora con este plan (sin el nombre de las dietas usadas: la nueva tiene el suyo)
export const datosParaGuardar = plan => ({ ...plan, menu: limpiarMenu(plan.menu), dieta: '' });

// =====================================================================
// Dietas listas, por estado clínico. "para": condiciones de la evaluación (datos/catalogos.js CONDICIONES_MEDICAS)
// y palabras que la clienta pudo escribir en "otra condición", para sugerirla.
// =====================================================================
export const DIETAS_BASE = [
  { id: 'diabetes', nombre: 'Diabetes o prediabetes', icono: '🩸', para: ['metabolica'], palabras: /diabet|glucosa|az[uú]car|insulina/,
    resumen: 'Carbohidratos medidos en cada comida, 5 comidas a sus horas, harinas integrales y frutas enteras con medida.',
    datos: { comidas: 5, carbos_comida: 45, frutas_dia: 2, nutrientes: ['fibra'],
      reducir: ['arroz', 'pan_agua', 'espagueti', 'casabe', 'harina_maiz', 'platano_maduro', 'guineo', 'mango'],
      priorizar: ['arroz_integral', 'pan_integral', 'habichuelas_negras', 'lentejas', 'brocoli', 'vainitas'],
      nota: 'Come a tus horas y no te saltes comidas. Las frutas, enteras y no en jugo. Nada de refrescos, jugos ni dulces.' } },
  { id: 'presion', nombre: 'Presión alta (tipo DASH)', icono: '❤️', para: ['cardiaca'], palabras: /presi[oó]n|hipertens|coraz[oó]n/,
    resumen: 'Baja en sal, sin embutidos ni salados, con más vegetales, frutas, legumbres y lácteos.',
    datos: { bajo_sal: true, sodio_mg: 2000, nutrientes: ['potasio', 'calcio', 'fibra'],
      no_come: ['salami', 'bacalao', 'arenque'], reducir: ['queso_fresco', 'atun', 'sardinas', 'pan_agua'],
      priorizar: ['habichuelas_negras', 'lentejas', 'espinaca', 'brocoli', 'yogur', 'guineo'],
      nota: 'Sin cubitos, sazones en polvo ni sopitas, sin embutidos ni enlatados salados. Sazona con ajo, cebolla, ají, cilantro, orégano y limón.' } },
  { id: 'colesterol', nombre: 'Colesterol o triglicéridos altos', icono: '🫀', para: [], palabras: /colesterol|triglic|l[ií]pid/,
    resumen: 'Menos grasa saturada y harinas refinadas; más fibra, pescado y grasas buenas.',
    datos: { grasas_pct: 25, frutas_dia: 3, nutrientes: ['omega3', 'fibra'],
      no_come: ['salami'], reducir: ['queso_fresco', 'cerdo', 'res_molida', 'chivo', 'arroz', 'pan_agua', 'espagueti'],
      priorizar: ['pescado', 'sardinas', 'avena', 'habichuelas_negras', 'lentejas', 'aguacate', 'linaza'],
      nota: 'Sin frituras, embutidos, dulces ni refrescos. El alcohol, nada o casi nada: sube los triglicéridos.' } },
  { id: 'higado', nombre: 'Hígado graso', icono: '🟤', para: [], palabras: /h[ií]gado|hep[aá]t/,
    resumen: 'Menos azúcar y harinas refinadas, nada de alcohol, más fibra y pescado.',
    datos: { frutas_dia: 2, nutrientes: ['fibra', 'omega3'],
      reducir: ['arroz', 'pan_agua', 'espagueti', 'casabe', 'harina_maiz', 'platano_maduro', 'queso_fresco'],
      priorizar: ['arroz_integral', 'avena', 'habichuelas_negras', 'lentejas', 'pescado', 'sardinas', 'brocoli'],
      nota: 'Nada de alcohol, refrescos, jugos ni dulces. Bajar de peso poco a poco es lo que más ayuda al hígado.' } },
  { id: 'rinon', nombre: 'Riñón (sin diálisis)', icono: '🫘', para: [], palabras: /ri[ñn][oó]n|renal|di[aá]lisis|creatinina/,
    resumen: 'Proteína moderada (0,8 g por kg), baja en sal y con menos alimentos altos en potasio. Ajústala a su etapa y a sus analíticas.',
    datos: { proteina_gkg: 0.8, bajo_sal: true, sodio_mg: 2000,
      no_come: ['salami', 'bacalao', 'arenque'],
      reducir: ['guineo', 'platano_verde', 'platano_maduro', 'aguacate', 'naranja', 'chinola', 'tomate', 'papa', 'batata', 'espinaca', 'habichuelas_rojas', 'habichuelas_negras', 'queso_fresco'],
      nota: 'Sin sal añadida, cubitos ni enlatados. Los víveres, pelados, picados y hervidos en bastante agua (bota esa agua). Los líquidos, como te indique tu médico.' } },
  { id: 'reflujo', nombre: 'Reflujo o gastritis', icono: '🔥', para: [], palabras: /reflujo|gastritis|[uú]lcera|acidez/,
    resumen: 'Comidas pequeñas y frecuentes, sin ácidos, picantes ni frituras, y cena temprano.',
    datos: { comidas: 5, reducir: ['naranja', 'pina', 'chinola', 'tomate', 'aji', 'cebolla', 'queso_fresco'],
      nota: 'Porciones pequeñas. Cena al menos 3 horas antes de acostarte y no te acuestes justo después de comer. Sin picante, café fuerte, refrescos ni frituras.' } },
  { id: 'anemia', nombre: 'Anemia por falta de hierro', icono: '🩹', para: [], palabras: /anemia|hierro|ferritina/,
    resumen: 'Más alimentos ricos en hierro, acompañados de vitamina C para absorberlo mejor.',
    datos: { nutrientes: ['hierro', 'vitC'],
      priorizar: ['higado_pollo', 'res', 'habichuelas_rojas', 'habichuelas_negras', 'lentejas', 'espinaca', 'guayaba', 'naranja', 'cereza'],
      nota: 'Acompaña las habichuelas, lentejas y vegetales verdes con una fruta rica en vitamina C (guayaba, naranja, cerezas). El café y el té, lejos de las comidas.' } },
  { id: 'antiinflamatoria', nombre: 'Antiinflamatoria', icono: '🌿', para: [], palabras: /inflama|artritis|artrosis/,
    resumen: 'Más pescado, semillas, vegetales, frutas y legumbres; menos embutidos, harinas refinadas y frituras.',
    datos: { nutrientes: ['omega3', 'fibra', 'vitC'],
      reducir: ['salami', 'pan_agua', 'espagueti', 'arroz', 'queso_fresco', 'cerdo', 'res_molida'],
      priorizar: ['sardinas', 'pescado', 'salmon', 'linaza', 'chia', 'aguacate', 'brocoli', 'espinaca', 'lentejas', 'habichuelas_negras'],
      nota: 'Sin frituras, embutidos, refrescos ni dulces. Varía los colores de los vegetales y las frutas en la semana.' } },
];

// Dietas que le corresponden por lo que marcó en su evaluación (condiciones y lo que escribió)
export function dietasSugeridas(atleta) {
  const s = atleta?.seguridad || {};
  const cond = s.condiciones || [];
  const texto = String(s.condicionOtra || '').toLowerCase();
  return DIETAS_BASE.filter(d => d.para.some(c => cond.includes(c)) || (texto && d.palabras.test(texto))).map(d => d.id);
}

// Alimentos de las dietas que no existen en el catálogo (para las pruebas)
export const alimentosDesconocidos = () => DIETAS_BASE.flatMap(d => ['no_come', 'reducir', 'priorizar']
  .flatMap(k => (d.datos[k] || []).filter(id => !alimentoPorId[id]).map(id => `${d.id}: ${id}`)));
