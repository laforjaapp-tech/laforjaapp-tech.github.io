// Recetas de la nutrióloga: del texto leído en una foto a una receta con el estilo de LA FORJA,
// su energía y proteína por porción, y su conversión en un plato que el menú semanal puede proponer.
//
// Receta: { id, nombre, porciones, minutos, tipos: ['almuerzo', …], ingredientes, pasos: [texto], nota }
// Ingrediente: { texto, cantidad, unidad, alimentoId|null, g|null }
//   alimentoId enlaza con el catálogo (datos/alimentos.js) para calcular; g = gramos de TODA la receta.
//   Sin enlace (sal, ajo, especias…) se muestra pero no cuenta en los cálculos.

import { ALIMENTOS, alimentoPorId, TIPOS_COMIDA } from '../datos/alimentos.js';
import { totales } from './nutricion.js';

export const normal = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ/.,½¼¾ ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- Cantidades ----------
const PALABRAS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12, media: 0.5, medio: 0.5 };
const FRACCIONES = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

// "1 1/2", "1½", "0.5", "2,5", "media" → número; devuelve [cantidad, resto del texto]
export function leerCantidad(texto) {
  let t = String(texto).trim().replace(/[½¼¾⅓⅔]/g, m => ` ${FRACCIONES[m]}`).trim();
  const m = t.match(/^(\d+(?:[.,]\d+)?)(?:\s+(\d+)\/(\d+))?(?:\s*\/\s*(\d+))?(?:\s+(0\.\d+))?\b/);
  if (m) {
    let n = parseFloat(m[1].replace(',', '.'));
    if (m[4]) n = n / parseFloat(m[4]);            // "1/2"
    if (m[2]) n += parseFloat(m[2]) / parseFloat(m[3]);   // "1 1/2"
    if (m[5]) n += parseFloat(m[5]);               // "1½"
    return [n, t.slice(m[0].length).trim()];
  }
  const p = normal(t).split(' ')[0];
  if (PALABRAS[p] != null) return [PALABRAS[p], t.slice(t.toLowerCase().indexOf(p) + p.length).trim()];
  return [null, t];
}

// Unidad → cómo pasar a gramos. g(alimento) devuelve los gramos de UNA unidad.
const UNIDADES = [
  { id: 'kg', claves: ['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'], g: () => 1000 },
  { id: 'g', claves: ['g', 'gr', 'grs', 'gramo', 'gramos'], g: () => 1 },
  { id: 'lb', claves: ['lb', 'lbs', 'libra', 'libras'], g: () => 453.6 },
  { id: 'oz', claves: ['oz', 'onza', 'onzas'], g: () => 28.35 },
  { id: 'l', claves: ['l', 'lt', 'litro', 'litros'], g: () => 1000 },
  { id: 'ml', claves: ['ml', 'mililitro', 'mililitros'], g: () => 1 },
  { id: 'taza', claves: ['taza', 'tazas', 'tz'], g: a => (a?.medida?.n === 'taza' ? a.medida.g : 200) },
  { id: 'cda', claves: ['cda', 'cdas', 'cucharada', 'cucharadas', 'cs'], g: a => (a?.cat === 'grasa' ? 13.5 : 15) },
  { id: 'cdta', claves: ['cdta', 'cdtas', 'cucharadita', 'cucharaditas', 'cc'], g: () => 5 },
  { id: 'lata', claves: ['lata', 'latas'], g: a => (a?.unidad?.n === 'lata' ? a.unidad.g : 400) },
  { id: 'diente', claves: ['diente', 'dientes'], g: () => 5 },
  { id: 'pizca', claves: ['pizca', 'pizcas', 'chin', 'chin.'], g: () => 0.5 },
  { id: 'rama', claves: ['rama', 'ramas', 'ramita', 'ramitas', 'hoja', 'hojas'], g: () => 2 },
  { id: 'unidad', claves: ['unidad', 'unidades', 'u', 'pieza', 'piezas', 'pedazo', 'pedazos', 'lonja', 'lonjas', 'rebanada', 'rebanadas', 'filete', 'filetes'], g: a => a?.unidad?.g || a?.medida?.g || a?.porcion || 100 },
];
const UNIDAD_POR_CLAVE = Object.fromEntries(UNIDADES.flatMap(u => u.claves.map(c => [c, u])));
export const unidadPorId = id => UNIDADES.find(u => u.id === id) || null;
export const UNIDADES_LISTA = UNIDADES.map(u => u.id);

// ---------- Enlace con el catálogo ----------
// Claves de búsqueda por alimento: su nombre corto, su nombre sin paréntesis y sinónimos de cocina dominicana.
const SINONIMOS = {
  pollo: ['pollo', 'pechuga', 'pechugas', 'pechuga de pollo'], muslo_pollo: ['muslo', 'muslos', 'contramuslo'], res: ['carne de res', 'res', 'carne'],
  res_molida: ['carne molida', 'molida', 'picadillo'], cerdo: ['cerdo', 'puerco', 'chuleta'], pescado: ['pescado', 'tilapia', 'dorado', 'mero', 'filete de pescado'],
  huevo: ['huevo', 'huevos'], claras: ['claras', 'clara de huevo', 'claras de huevo'], queso_fresco: ['queso blanco', 'queso de freir', 'queso'],
  yogur: ['yogur', 'yogurt'], yogur_griego: ['yogur griego', 'yogurt griego'], leche: ['leche'], habichuelas_rojas: ['habichuelas rojas', 'habichuelas', 'frijoles rojos', 'frijoles'],
  habichuelas_negras: ['habichuelas negras', 'frijoles negros'], gandules: ['guandules', 'gandules'], arroz: ['arroz', 'arroz blanco'], arroz_integral: ['arroz integral'],
  espagueti: ['espagueti', 'espaguetis', 'spaghetti', 'pasta', 'fideos'], avena: ['avena', 'hojuelas de avena'], harina_maiz: ['harina de maiz', 'maicena'],
  platano_verde: ['platano verde', 'platanos verdes', 'platano', 'platanos'], platano_maduro: ['platano maduro', 'platanos maduros', 'maduro', 'maduros'],
  guineo_verde: ['guineitos', 'guineo verde', 'guineos verdes'], guineo: ['guineo', 'guineos', 'banana', 'banano'], papa: ['papa', 'papas', 'patata'],
  aji: ['aji', 'ajies', 'aji cubanela', 'aji morron', 'pimiento', 'pimenton'], aceite: ['aceite', 'aceite de oliva', 'aceite vegetal'],
  naranja: ['naranja', 'china', 'chinas'], sandia: ['sandia', 'patilla'], lechosa: ['lechosa', 'papaya'], mani: ['mani', 'cacahuate', 'cacahuete'],
  zanahoria: ['zanahoria', 'zanahorias'], tomate: ['tomate', 'tomates'], cebolla: ['cebolla', 'cebollas', 'cebolla roja'], espinaca: ['espinaca', 'espinacas'],
};
const CLAVES = ALIMENTOS.flatMap(a => [...new Set([a.corto, a.nombre.replace(/\(.*?\)/g, ''), ...(SINONIMOS[a.id] || [])].map(normal))]
  .filter(k => k.length >= 2).map(k => ({ k, a }))).sort((x, y) => y.k.length - x.k.length);

// Lo que no se cuenta (cantidades mínimas o sin energía)
const SIN_CALCULO = /\b(sal|pimienta|ajo|oregano|cilantro|culantro|apio|perejil|laurel|comino|canela|vainilla|agua|sazon|sazonador|vinagre|limon|limones|adobo|cubito|caldo|especias|nuez moscada|jengibre|bijol|achiote|salsa de soya)\b/;

export function enlazarAlimento(texto) {
  const t = ` ${normal(texto)} `;
  const hit = CLAVES.find(({ k }) => t.includes(` ${k} `) || t.includes(` ${k}s `));
  return hit ? hit.a.id : null;
}

// Gramos de una línea de ingrediente (toda la receta); null si no se puede saber
export function gramosDe({ cantidad, unidad, alimentoId }) {
  if (cantidad == null) return null;
  const a = alimentoPorId[alimentoId];
  const u = unidadPorId(unidad);
  if (u) return Math.round(cantidad * u.g(a));
  if (a) return Math.round(cantidad * (a.unidad?.g || a.medida?.g || a.porcion || 100));   // "2 huevos", "3 plátanos"
  return null;
}

// Viñetas: "•", "-", "*"… y las que el lector de la foto confunde con una letra suelta ("e 2 tazas", "o 1 cebolla")
const VINETA = /^\s*(?:[•·\-–*>]+|[eoa°«»](?=\s+(?:\d|[½¼¾]|una?\b|dos\b|tres\b|media?\b)))\s*/i;

export function leerIngrediente(linea) {
  const texto = linea.replace(VINETA, '').replace(/^\d+[.)]\s+(?=\D)/, '').trim();
  let [cantidad, resto] = leerCantidad(texto);
  let unidad = null;
  const primera = normal(resto).split(' ')[0];
  if (cantidad != null && UNIDAD_POR_CLAVE[primera]) {
    unidad = UNIDAD_POR_CLAVE[primera].id;
    resto = resto.replace(/^\S+\s*/, '').replace(/^de\s+/i, '');
  }
  resto = resto.replace(/^de\s+/i, '').trim();
  const alimentoId = SIN_CALCULO.test(` ${normal(resto)} `) && !enlazarAlimento(resto.replace(SIN_CALCULO, '')) ? null : enlazarAlimento(resto);
  const ing = { texto: resto || texto, cantidad, unidad, alimentoId };
  ing.g = alimentoId ? gramosDe(ing) : null;
  return ing;
}

// ---------- Texto de la foto → borrador de receta ----------
const TITULO_INGREDIENTES = /^(ingredientes?|necesitas|lo que necesitas)\b/;
const TITULO_PASOS = /^(preparaci[oó]n|elaboraci[oó]n|pasos|procedimiento|modo de preparaci[oó]n|instrucciones|c[oó]mo se hace|paso a paso)\b/;
const PORCIONES = /(?:rinde|para|porciones?|raciones?|sirve)\D{0,12}(\d{1,2})|(\d{1,2})\s*(?:porciones|raciones|personas|platos)/i;
const TIEMPO = /(\d{1,3})\s*(min|minutos|mins|hora|horas|h)\b/i;

export function interpretarTexto(textoCrudo) {
  const lineas = String(textoCrudo || '').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 1);
  const r = { nombre: '', porciones: null, minutos: null, tipos: [], ingredientes: [], pasos: [], nota: '' };
  let seccion = 'cabecera';
  const pasos = [];
  for (const l of lineas) {
    const n = normal(l);
    if (TITULO_INGREDIENTES.test(n)) { seccion = 'ingredientes'; continue; }
    if (TITULO_PASOS.test(n)) { seccion = 'pasos'; continue; }
    // Porciones y tiempo pueden venir en la misma línea ("Rinde 4 porciones · Tiempo: 50 minutos")
    const corta = l.length < 70 && seccion !== 'pasos';
    const porc = corta && !r.porciones && l.match(PORCIONES), tiempo = corta && !r.minutos && l.match(TIEMPO);
    if (porc) r.porciones = Number(porc[1] || porc[2]);
    if (tiempo) r.minutos = Number(tiempo[1]) * (/^h/i.test(tiempo[2]) ? 60 : 1);
    if ((porc || tiempo) && (seccion === 'cabecera' || tiempo)) continue;
    if (seccion === 'cabecera') {
      // Sin títulos: una línea que empieza con cantidad es ingrediente
      if (leerCantidad(l.replace(VINETA, ''))[0] != null && r.nombre) { seccion = 'ingredientes'; r.ingredientes.push(leerIngrediente(l)); continue; }
      if (!r.nombre) r.nombre = l.replace(/[.:]+$/, ''); else r.nota = r.nota ? `${r.nota} ${l}` : l;
      continue;
    }
    if (seccion === 'ingredientes') {
      // Una línea larga que no empieza con cantidad ni viñeta suele ser el primer paso sin título
      if (l.length > 70 && leerCantidad(l)[0] == null && !/^[•·\-–*]/.test(l)) { seccion = 'pasos'; pasos.push(l); continue; }
      r.ingredientes.push(leerIngrediente(l));
      continue;
    }
    // Pasos: uno nuevo empieza con número o viñeta; lo demás continúa el anterior (líneas cortadas de la foto)
    if (/^(\d{1,2}[.)-]|paso \d+|[•·\-–*])\s*/i.test(l) || !pasos.length) pasos.push(l.replace(/^(\d{1,2}[.)-]|paso \d+[:.]?|[•·\-–*])\s*/i, ''));
    else pasos[pasos.length - 1] += ` ${l}`;
  }
  r.pasos = pasos.map(p => p.trim()).filter(Boolean);
  r.nombre = arreglarNombre(r.nombre);
  r.tipos = adivinarTipos(r);
  return r;
}

const arreglarNombre = s => { const t = String(s || '').trim().toLowerCase(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Receta sin nombre'; };

const DESAYUNO = /\b(desayuno|avena|panqueque|pancake|mangu|tostada|batida|batido|huevos? revueltos|tortilla de huevo|omelet|granola)\b/;
const MERIENDA = /\b(merienda|snack|galleta|batida|batido|yogur|barrita|bocadillo|picadera)\b/;
export function adivinarTipos(r) {
  const t = normal(`${r.nombre} ${r.nota}`);
  const tipos = [];
  if (DESAYUNO.test(t)) tipos.push('desayuno');
  if (MERIENDA.test(t)) tipos.push('merienda');
  if (!tipos.length) tipos.push('almuerzo', 'cena');
  return tipos;
}
export const TIPOS_RECETA = TIPOS_COMIDA.map(t => ({ id: t.id, etiqueta: `${t.icono} ${t.etiqueta}` }));

// ---------- Energía y proteína por porción ----------
export function nutricionReceta(r) {
  const porciones = Math.max(1, Number(r.porciones) || 1);
  const items = r.ingredientes.filter(i => i.alimentoId && i.g > 0).map(i => ({ alimentoId: i.alimentoId, g: i.g / porciones }));
  const t = totales(items);
  return { porPorcion: t, enlazados: items.length, sinEnlazar: r.ingredientes.filter(i => !i.alimentoId).length, porciones };
}

// ---------- Receta → plato para el generador de menús (motor/nutricion.js generarSemana) ----------
// Cada ingrediente enlazado es un hueco con un solo alimento. El de más proteína es "proteina" y el de más energía
// (carbohidrato o legumbre) "ajusta": así armarComida ajusta la porción a la meta de la clienta. El resto queda fijo
// con su cantidad por porción. Si un alimento no está permitido (alergia, "no come"), la receta no se propone.
export function recetaComoPlato(r) {
  const porciones = Math.max(1, Number(r.porciones) || 1);
  const ings = r.ingredientes.filter(i => i.alimentoId && i.g > 0 && alimentoPorId[i.alimentoId]);
  if (!ings.length) return null;
  const porPorcion = i => i.g / porciones;
  const prot = [...ings].filter(i => ['proteina', 'legumbre', 'lacteo'].includes(alimentoPorId[i.alimentoId].cat))
    .sort((x, y) => alimentoPorId[y.alimentoId].p * porPorcion(y) - alimentoPorId[x.alimentoId].p * porPorcion(x))[0];
  const ajusta = [...ings].filter(i => i !== prot && ['carbohidrato', 'legumbre'].includes(alimentoPorId[i.alimentoId].cat))
    .sort((x, y) => alimentoPorId[y.alimentoId].kcal * porPorcion(y) - alimentoPorId[x.alimentoId].kcal * porPorcion(x))[0];
  return {
    id: `receta:${r.id}`, recetaId: r.id, receta: true, nombre: r.nombre, tipos: r.tipos?.length ? r.tipos : ['almuerzo', 'cena'],
    nota: r.nota || '',
    slots: ings.map(i => ({ rol: i === prot ? 'proteina' : i === ajusta ? 'ajusta' : 'fijo', op: [i.alimentoId], g: Math.round(porPorcion(i)) })),
  };
}

// Borrador que llega ya separado (la lectura con visión en la nube, o una línea corregida a mano):
// se enlaza con el catálogo y se pesan los ingredientes que falten.
export function completarBorrador(r) {
  const ingredientes = (r.ingredientes || []).map(i => {
    const base = typeof i === 'string' ? leerIngrediente(i)
      : { texto: i.texto || '', cantidad: i.cantidad ?? null, unidad: unidadPorId(i.unidad)?.id || null, alimentoId: i.alimentoId };
    if (base.alimentoId === undefined) base.alimentoId = SIN_CALCULO.test(` ${normal(base.texto)} `) ? null : enlazarAlimento(base.texto);
    if (base.alimentoId && !alimentoPorId[base.alimentoId]) base.alimentoId = null;
    base.g = i.g ?? (base.alimentoId ? gramosDe(base) : null);
    return base;
  });
  const sal = { nombre: arreglarNombre(r.nombre), porciones: Number(r.porciones) || null, minutos: Number(r.minutos) || null,
    tipos: (r.tipos || []).filter(t => TIPOS_COMIDA.some(x => x.id === t)), ingredientes, pasos: (r.pasos || []).map(String).filter(Boolean), nota: r.nota || '' };
  if (!sal.tipos.length) sal.tipos = adivinarTipos(sal);
  return sal;
}
