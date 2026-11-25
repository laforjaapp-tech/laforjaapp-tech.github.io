// LECTOR DE COMIDAS — entiende lo que la persona escribe con sus palabras ("2 huevos hervidos con pan",
// "media libra de pollo guisado", "una taza y media de arroz con habichuelas", "pescado frito con tostones")
// y lo convierte en renglones con calorías y proteína. Todo es orientativo.
//
// Dos clases de renglón:
//   · COMUNES (datos/comunes.js): platos y bebidas de la calle con valor POR UNIDAD (pizza, chimi, refresco…).
//   · ALIMENTOS del menú (datos/alimentos.js): valores por 100 g; la cantidad se entiende en su unidad
//     (huevo, pan, plátano), en medidas caseras (taza, cucharada, vaso, plato, pedazo) o en peso (g, onza, libra).
//   · AGREGADOS: lo que se le pone a la comida (mayonesa, kétchup, mantequilla, azúcar, jamón, queso amarillo…), por gramo.
// Cómo se preparó cuenta: "frito", "empanizado", "guisado", "revuelto", "a la plancha" suman el aceite (y el empanizado,
// el pan rallado) que absorbe ESE alimento; "hervido" no suma nada. Valores de referencia: tablas del USDA (FoodData Central).
// Renglón guardado: { id, cantidad, unidad?, gUnidad?, prep?, prepForma?, conAzucar? } — gramos = cantidad × gUnidad.
// Los renglones viejos (sin unidad) siguen valiendo: se leen con la unidad de siempre de ese alimento.

import { COMUNES, AZUCAR_CUCHARADITA } from '../datos/comunes.js';
import { ALIMENTOS, porcionBase } from '../datos/alimentos.js';

export const normal = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/(\d)\s*\/\s*(\d)/g, '$1⁄$2')   // 1/2 → una fracción (no dos números)
  .replace(/(\d)[.,](\d)/g, '$1·$2')       // protege los decimales (1,5 o 1.5): "1,5 tazas" es taza y media, no 5
  .replace(/½/g, ' 1⁄2 ').replace(/¼/g, ' 1⁄4 ')
  .replace(/[^a-z0-9ñ·⁄\s-]/g, ' ').replace(/·/g, '.').replace(/\s+/g, ' ').trim();

// ---------- Cómo se llaman los alimentos del menú al escribirlos (sin acentos) ----------
const NOMBRES = {
  pollo_guisado: ['pollo', 'pollos', 'pollito', 'pollo guisado', 'pollo al horno', 'pollo horneado', 'pollo asado', 'presa de pollo', 'presas de pollo'],
  pollo: ['pechuga', 'pechugas', 'pechuga de pollo', 'pollo a la plancha', 'pollo hervido'],
  muslo_pollo: ['muslo', 'muslos', 'muslo de pollo', 'pierna de pollo', 'piernas de pollo', 'alitas', 'alas de pollo'],
  higado_pollo: ['higado', 'higados', 'higadito', 'higaditos', 'higado de pollo'],
  pavo: ['pavo'],
  res: ['carne', 'carnes', 'carne de res', 'res', 'bistec', 'biste', 'bistek', 'carne guisada', 'carne salteada', 'filete de res', 'churrasco'],
  res_molida: ['carne molida', 'molida', 'albondiga', 'albondigas'],
  cerdo: ['cerdo', 'puerco', 'carne de cerdo', 'chuleta', 'chuletas', 'masita', 'masitas', 'pernil', 'lomo de cerdo'],
  chivo: ['chivo', 'chivo guisado', 'cabro'],
  pescado: ['pescado', 'pescados', 'tilapia', 'dorado', 'mero', 'chillo', 'merluza', 'filete de pescado'],
  sardinas: ['sardina', 'sardinas'], atun: ['atun'], salmon: ['salmon'], camarones: ['camaron', 'camarones'],
  bacalao: ['bacalao'], arenque: ['arenque', 'arenque ahumado'],
  huevo: ['huevo', 'huevos', 'huevito', 'huevitos', 'huevo hervido', 'huevos hervidos', 'huevo revuelto', 'huevos revueltos', 'tortilla de huevo', 'omelette'],
  claras: ['clara', 'claras', 'claras de huevo'], tofu: ['tofu'],
  queso_fresco: ['queso', 'quesos', 'queso blanco', 'queso de freir', 'queso frito'],
  cottage: ['requeson', 'cottage'], yogur: ['yogur', 'yogurt', 'yogures', 'yogurt natural', 'yogur natural'],
  yogur_griego: ['yogur griego', 'yogurt griego'], leche: ['leche', 'leche descremada', 'leche entera'],
  bebida_soya: ['leche de soya', 'bebida de soya'],
  habichuelas_rojas: ['habichuela', 'habichuelas', 'habichuelas rojas', 'habichuelas guisadas', 'frijol', 'frijoles'],
  habichuelas_negras: ['habichuelas negras', 'frijoles negros'], gandules: ['guandul', 'guandules', 'gandules'],
  lentejas: ['lenteja', 'lentejas'], garbanzos: ['garbanzo', 'garbanzos'],
  arroz: ['arroz', 'arroz blanco'], arroz_integral: ['arroz integral'],
  espagueti: ['espagueti', 'espaguetis', 'spaghetti', 'pasta', 'pastas', 'fideo', 'fideos', 'macarrones', 'coditos'],
  pasta_integral: ['pasta integral'], avena: ['avena', 'avenita'], harina_maiz: ['harina de maiz', 'harina'],
  pan_agua: ['pan', 'panes', 'pan de agua', 'pancito', 'pancitos', 'pan sobao'], casabe: ['casabe'],
  pan_integral: ['pan integral', 'pan integral de molde'], tortilla_maiz: ['tortilla', 'tortillas', 'tortilla de maiz'], quinoa: ['quinoa'],
  platano_verde: ['platano', 'platanos', 'platano verde', 'platanos verdes', 'mangu'],
  platano_maduro: ['maduro', 'maduros', 'platano maduro', 'platanos maduros'],
  guineo_verde: ['guineito', 'guineitos', 'guineo verde', 'guineos verdes'],
  yuca: ['yuca'], batata: ['batata', 'batatas'], yautia: ['yautia', 'yautias'], name: ['name', 'names'],
  papa: ['papa', 'papas', 'pure de papa', 'pure'], mazorca: ['mazorca', 'mazorcas', 'maiz', 'elote'],
  repollo: ['repollo'], zanahoria: ['zanahoria', 'zanahorias'], tomate: ['tomate', 'tomates'], lechuga: ['lechuga'],
  pepino: ['pepino', 'pepinos'], aji: ['aji', 'ajies'], cebolla: ['cebolla', 'cebollas'], auyama: ['auyama'],
  vainitas: ['vainita', 'vainitas'], molondron: ['molondron', 'molondrones'], remolacha: ['remolacha'],
  berenjena: ['berenjena', 'berenjenas'], tayota: ['tayota', 'tayotas'], espinaca: ['espinaca', 'espinacas'],
  brocoli: ['brocoli'], coliflor: ['coliflor'],
  vegetales: ['vegetales', 'verduras', 'vegetales mixtos', 'vegetales al vapor', 'vegetales salteados', 'verduras salteadas', 'mixto de vegetales'],
  guineo: ['guineo', 'guineos', 'banana', 'banano', 'guineo maduro'], lechosa: ['lechosa', 'papaya'], mango: ['mango', 'mangos'],
  naranja: ['naranja', 'naranjas', 'china', 'chinas'], pina: ['pina'], chinola: ['chinola', 'chinolas'],
  guayaba: ['guayaba', 'guayabas'], cereza: ['cerezas'], sandia: ['sandia', 'patilla'], manzana: ['manzana', 'manzanas'],
  fresas: ['fresa', 'fresas'],
  aceite: ['aceite', 'aceite de oliva'], aguacate: ['aguacate', 'aguacates'], mani: ['mani'],
  mantequilla_mani: ['mantequilla de mani'], almendras: ['almendra', 'almendras'], chia: ['chia'], linaza: ['linaza'],
};
// Lo que se escribe así ya trae su cantidad (un mangú son unos 2 plátanos)
const CANTIDAD_DE_NOMBRE = { mangu: 2 };
// Porción de la que se habla al nombrarlo sin cantidad, cuando la del menú no sirve aquí ("una avena" ya preparada)
const PORCION_LECTOR = { avena: 40, aceite: 13.5 };
// Taza de alimento ya preparado (la del menú de avena es en seco, para la compra)
const TAZA_LECTOR = { avena: 40 };

// Palabras de cantidad → número
const NUMEROS = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  media: 0.5, medio: 0.5, par: 2, docena: 12,
};
const numeroDe = t => {
  if (t == null) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const f = t.match(/^(\d+)⁄(\d+)$/);
  if (f && Number(f[2])) return Number(f[1]) / Number(f[2]);
  return NUMEROS[t] ?? null;
};

// Medidas que se escriben antes del alimento. peso: gramos fijos · casera: depende del alimento
const MEDIDAS = {
  g: { n: 'g', peso: 1 }, gr: { n: 'g', peso: 1 }, grs: { n: 'g', peso: 1 }, gramo: { n: 'g', peso: 1 }, gramos: { n: 'g', peso: 1 },
  onza: { n: 'onza', peso: 28.35 }, onzas: { n: 'onza', peso: 28.35 }, oz: { n: 'onza', peso: 28.35 },
  libra: { n: 'libra', peso: 453.6 }, libras: { n: 'libra', peso: 453.6 }, lb: { n: 'libra', peso: 453.6 }, lbs: { n: 'libra', peso: 453.6 },
  taza: { n: 'taza' }, tazas: { n: 'taza' }, vaso: { n: 'vaso' }, vasos: { n: 'vaso' },
  cucharada: { n: 'cucharada' }, cucharadas: { n: 'cucharada' }, cda: { n: 'cucharada' }, cdas: { n: 'cucharada' },
  cucharadita: { n: 'cucharadita' }, cucharaditas: { n: 'cucharadita' }, cdta: { n: 'cucharadita' }, cdtas: { n: 'cucharadita' },
  plato: { n: 'plato' }, platos: { n: 'plato' }, porcion: { n: 'porción' }, porciones: { n: 'porción' }, racion: { n: 'porción' },
  pedazo: { n: 'pedazo' }, pedazos: { n: 'pedazo' }, trozo: { n: 'pedazo' }, trozos: { n: 'pedazo' }, presa: { n: 'pedazo' }, presas: { n: 'pedazo' },
  pieza: { n: 'pedazo' }, piezas: { n: 'pedazo' }, rebanada: { n: 'rebanada' }, rebanadas: { n: 'rebanada' },
  lonja: { n: 'rebanada' }, lonjas: { n: 'rebanada' }, tajada: { n: 'rebanada' }, tajadas: { n: 'rebanada' },
  rueda: { n: 'rebanada' }, ruedas: { n: 'rebanada' }, puñado: { n: 'puñado' }, puñados: { n: 'puñado' }, punado: { n: 'puñado' },
  lata: { n: 'lata' }, latas: { n: 'lata' },
};
const TAZA_CAT = { carbohidrato: 160, legumbre: 170, vegetal: 100, fruta: 150, lacteo: 240, proteina: 140, grasa: 150 };
const GRANDE = ['grande', 'grandes', 'abundante', 'bastante', 'mucho', 'mucha'];
const PEQUENO = ['pequeno', 'pequena', 'pequenos', 'pequenas', 'chiquito', 'chiquita', 'poquito', 'poquita', 'poco', 'poca'];
// ---------- Cómo se preparó ----------
// aceite: parte del peso del alimento que es aceite absorbido (comparando en las tablas el alimento cocido sin grasa y
// el mismo frito: huevo frito ≈ +6 %, carne o pescado frito ≈ +7 %, plátano, yuca o papa fritos ≈ +13 %).
// harina: el pan rallado o la harina del empanizado (≈ 7 % del peso; con el aceite, la pechuga empanizada da ≈ 280 kcal/100 g, como la tabla). Con el mismo alimento, gana la primera que aparezca.
const PREPARACION = [
  { id: 'empanizado', etiqueta: 'empanizado', palabras: ['empanizado', 'empanizada', 'empanizados', 'empanizadas', 'apanado', 'apanada', 'apanados', 'apanadas', 'rebozado', 'rebozada', 'empanado'], aceite: () => 0.1, harina: 0.07 },
  { id: 'frito', etiqueta: 'frito', palabras: ['frito', 'frita', 'fritos', 'fritas', 'fritura'], aceite: it => (it.origen === 'huevo' ? 0.06 : { proteina: 0.07, lacteo: 0.05, carbohidrato: 0.13, vegetal: 0.1, legumbre: 0.05 }[it.catAlimento] ?? 0.08) },
  { id: 'revuelto', etiqueta: 'revuelto', palabras: ['revuelto', 'revuelta', 'revueltos', 'revueltas', 'omelette', 'tortilla'], aceite: () => 0.04 },
  { id: 'salteado', etiqueta: 'salteado', palabras: ['salteado', 'salteada', 'salteados', 'salteadas', 'sofrito', 'sofrita'], aceite: () => 0.04 },
  { id: 'guisado', etiqueta: 'guisado', palabras: ['guisado', 'guisada', 'guisados', 'guisadas', 'en salsa'], aceite: () => 0.03 },
  { id: 'plancha', etiqueta: 'a la plancha', palabras: ['plancha', 'asado', 'asada', 'asados', 'asadas', 'parrilla', 'horno', 'horneado', 'horneada', 'horneados', 'horneadas'], aceite: () => 0.02 },
  { id: 'hervido', etiqueta: 'hervido', palabras: ['hervido', 'hervida', 'hervidos', 'hervidas', 'sancochado', 'sancochada', 'sancochados', 'vapor', 'crudo', 'cruda'], aceite: () => 0 },
];
const PREP_POR_ID = Object.fromEntries(PREPARACION.map(x => [x.id, x]));
// Estos ya vienen guisados en la tabla del menú: guisarlos o asarlos no suma otra vez
const YA_PREPARADO = new Set(['pollo_guisado', 'res', 'chivo', 'bacalao']);
const SE_PREPARA = new Set(['proteina', 'carbohidrato', 'lacteo', 'legumbre', 'vegetal']);
const PAN_RALLADO = { kcal: 395, p: 13, c: 72, g: 5.3 };   // por 100 g
const ACEITE_KCAL = 8.84;                                     // por gramo

const ICONO = { proteina: '🍗', lacteo: '🥛', legumbre: '🫘', carbohidrato: '🍚', vegetal: '🥗', fruta: '🍎', grasa: '🥑' };
const ICONO_ORIGEN = { pescado: '🐟', marisco: '🦐', huevo: '🥚' };
const ICONO_ID = { pan_agua: '🍞', pan_integral: '🍞', casabe: '🫓', platano_verde: '🍌', platano_maduro: '🍌', guineo: '🍌', guineo_verde: '🍌',
  papa: '🥔', batata: '🍠', mazorca: '🌽', aceite: '🫒', queso_fresco: '🧀', cottage: '🧀', aguacate: '🥑', leche: '🥛', avena: '🥣', espagueti: '🍝', tomate: '🍅', zanahoria: '🥕' };

// ---------- Catálogo: platos de la calle (por unidad) + alimentos del menú (por gramo) ----------
const comoAlimento = a => {
  const medida = a.medida && { n: a.medida.n, g: a.medida.g };
  const unidad = a.unidad && { n: a.unidad.n, g: a.unidad.g };
  const porcion = { n: 'porción', g: PORCION_LECTOR[a.id] ?? porcionBase(a) };
  // Lo que se entiende al nombrarlo sin cantidad: su pieza (huevo, pan, plátano), salvo vegetales y piezas enteras grandes
  // (arroz, pasta: una taza servida)
  const base = PORCION_LECTOR[a.id] ? porcion
    : unidad && a.cat !== 'vegetal' && unidad.g <= 250 ? unidad
    : a.cat === 'carbohidrato' && medida?.n === 'taza' ? medida : porcion;
  return {
    id: `al_${a.id}`, alimentoId: a.id, origen: a.origen, porGramo: true, cat: a.cat === 'fruta' ? 'fruta' : 'comida', catAlimento: a.cat,
    nombre: a.nombre.replace(/ \(.*\)/, ''), icono: ICONO_ID[a.id] || ICONO_ORIGEN[a.origen] || ICONO[a.cat] || '🍽️',
    kcal100: a.kcal, p100: a.p, c100: a.c, g100: a.g, base, unidad, medida, porcion,
    claves: NOMBRES[a.id] || [normal(a.corto)], azucar: 0, cafeina: 0,
  };
};
const ALIMENTOS_LECTOR = [
  ...ALIMENTOS.map(comoAlimento),
  comoAlimento({ id: 'vegetales', nombre: 'Vegetales mixtos', corto: 'vegetales', cat: 'vegetal', origen: 'vegetal', kcal: 32, p: 1.8, c: 6.5, g: 0.3, medida: { n: 'taza', g: 100 } }),
];

// ---------- Lo que se le pone a la comida (por 100 g: kcal, proteína, carbohidratos, grasa, azúcar) ----------
const AG = (id, nombre, icono, [kcal, p, c, g, azucar], base, claves) => ({
  id: `ag_${id}`, porGramo: true, cat: 'comida', catAlimento: 'agregado', nombre, icono,
  kcal100: kcal, p100: p, c100: c, g100: g, azucar100: azucar, base, porcion: base, medida: base, unidad: null, claves,
});
const AGREGADOS = [
  AG('mayonesa', 'Mayonesa', '🥫', [680, 1, 0.6, 75, 0.6], { n: 'cucharada', g: 14 }, ['mayonesa', 'mayo']),
  AG('ketchup', 'Kétchup', '🍅', [101, 1, 27, 0.1, 22], { n: 'cucharada', g: 17 }, ['ketchup', 'kechup', 'ketchu', 'catchup', 'cachup', 'catsup', 'salsa de tomate']),
  AG('mostaza', 'Mostaza', '🟡', [60, 3.7, 5.8, 3.3, 0.9], { n: 'cucharadita', g: 5 }, ['mostaza']),
  AG('salsa_rosada', 'Salsa rosada (mayonesa con kétchup)', '🥫', [390, 1, 14, 37, 11], { n: 'cucharada', g: 15 }, ['salsa rosada', 'salsa golf', 'mayoketchup', 'mayo ketchup']),
  AG('aderezo', 'Aderezo cremoso', '🥗', [430, 1.3, 6, 45, 4], { n: 'cucharada', g: 15 }, ['aderezo', 'aderezos', 'ranch', 'dressing', 'aderezo cesar', 'salsa cesar']),
  AG('mantequilla', 'Mantequilla', '🧈', [717, 0.9, 0.1, 81, 0.1], { n: 'cucharadita', g: 5 }, ['mantequilla', 'butter']),
  AG('margarina', 'Margarina', '🧈', [717, 0.2, 0.7, 80, 0], { n: 'cucharadita', g: 5 }, ['margarina']),
  AG('queso_crema', 'Queso crema', '🧀', [350, 6.2, 5.5, 34, 3.8], { n: 'cucharada', g: 14.5 }, ['queso crema', 'philadelphia']),
  AG('crema', 'Crema de leche', '🥛', [340, 2.8, 2.7, 36, 2.9], { n: 'cucharada', g: 15 }, ['crema', 'crema de leche', 'crema batida']),
  AG('azucar', 'Azúcar', '🍬', [387, 0, 100, 0, 100], { n: 'cucharadita', g: 4 }, ['azucar', 'azucar blanca', 'azucar morena', 'azucar crema']),
  AG('miel', 'Miel', '🍯', [304, 0.3, 82, 0, 82], { n: 'cucharada', g: 21 }, ['miel', 'miel de abeja']),
  AG('leche_condensada', 'Leche condensada', '🥫', [321, 7.9, 54, 8.7, 54], { n: 'cucharada', g: 19 }, ['leche condensada']),
  AG('jamon', 'Jamón', '🥓', [145, 18, 1.5, 7.5, 1], { n: 'lonja', g: 20 }, ['jamon', 'jamones', 'jamon cocido']),
  AG('jamon_pavo', 'Jamón de pavo', '🥓', [104, 17, 2, 3, 1.5], { n: 'lonja', g: 20 }, ['jamon de pavo']),
  AG('queso_amarillo', 'Queso amarillo (americano)', '🧀', [366, 18, 4.8, 31, 2.3], { n: 'lonja', g: 21 }, ['queso amarillo', 'queso americano', 'queso de sandwich', 'queso cheddar', 'queso en lonjas']),
  AG('tocineta', 'Tocineta', '🥓', [541, 37, 1.4, 42, 0], { n: 'lonja', g: 8 }, ['tocineta', 'tocinetas', 'bacon', 'tocino']),
  AG('pan_molde', 'Pan de molde blanco', '🍞', [266, 7.6, 49, 3.3, 5], { n: 'rebanada', g: 26 }, ['pan de molde', 'pan blanco', 'pan de sandwich', 'pan tostado', 'tostada', 'tostadas']),
];
// Lo que va DENTRO de un sándwich: si se nombra, el sándwich se cuenta por partes (pan + relleno + salsas)
const RELLENO = new Set(['ag_jamon', 'ag_jamon_pavo', 'ag_queso_amarillo', 'ag_tocineta', 'al_queso_fresco', 'al_huevo', 'al_pollo', 'al_pollo_guisado',
  'al_pavo', 'al_atun', 'al_res', 'al_res_molida', 'al_cerdo', 'al_aguacate', 'al_tomate', 'al_lechuga', 'salami_frito', 'hot_dog']);
// Los platos que ahora entiende el menú con cantidades ya no se reconocen como "plato de la calle" (se conservan para leer lo guardado)
// ("arroz con habichuelas y pollo" se suma por partes: arroz + habichuelas + pollo, cada uno con su cantidad)
const AHORA_DEL_MENU = { arroz_plato: ['arroz'], pan_agua_c: ['pan', 'pan de agua', 'pancito', 'pan sobao'], bandera: ['arroz con habichuelas', 'moro'],
  pan_salami: ['pan con salami', 'pan con jamon', 'pan con queso'] };
// Frases que son UN plato completo: así sus partes no se cuentan dos veces ("mangú con los tres golpes")
const FRASES_DE_PLATO = {
  mangu_3g: ['mangu con los tres golpes', 'mangu con tres golpes', 'mangu con los 3 golpes', 'mangu con 3 golpes'],
  bandera: ['locrio', 'locrio de pollo', 'arroz con pollo'],
  moro: ['moro de guandules', 'moro de habichuelas', 'moro de habichuelas negras', 'moro de gandules'],
};
const CATALOGO = [
  ...COMUNES.map(c => ({ ...c, claves: [...c.claves.filter(k => !(AHORA_DEL_MENU[c.id] || []).includes(normal(k))), ...(FRASES_DE_PLATO[c.id] || [])] })),
  ...ALIMENTOS_LECTOR,
  ...AGREGADOS,
];
const POR_ID = Object.fromEntries(CATALOGO.map(x => [x.id, x]));
export const porIdComun = id => POR_ID[id] || null;
// Más largas primero ("pollo frito" antes que "pollo"); con el mismo largo, los platos de la calle primero
const CLAVES = CATALOGO.flatMap((item, orden) => item.claves.map(k => ({ k: normal(k), item, orden })))
  .sort((a, b) => b.k.length - a.k.length || a.orden - b.orden);

// Cuántos gramos tiene una medida casera de este alimento
function gramosDeMedida(item, n) {
  if (item.catAlimento === 'agregado') {
    if (n === 'cucharada') return item.base.n === 'cucharada' ? item.base.g : item.base.g * 3;
    if (n === 'cucharadita') return item.base.n === 'cucharadita' ? item.base.g : Math.round((item.base.g / 3) * 10) / 10;
    if (n === 'rebanada') return item.base.g;
  }
  if (n === 'taza') return TAZA_LECTOR[item.alimentoId] ?? (item.medida?.n === 'taza' ? item.medida.g : TAZA_CAT[item.catAlimento] ?? 160);
  if (n === 'vaso') return item.medida?.n === 'vaso' ? item.medida.g : 240;
  if (n === 'cucharada') return item.medida?.n === 'cucharada' ? item.medida.g : item.alimentoId === 'aceite' ? 13.5 : 15;
  if (n === 'cucharadita') return 5;
  if (n === 'plato') return Math.round(1.5 * (item.medida?.n === 'taza' ? gramosDeMedida(item, 'taza') : item.porcion.g));
  if (n === 'pedazo') return item.unidad && item.unidad.g <= 250 ? item.unidad.g : item.porcion.g;
  if (n === 'rebanada') return ['lonja', 'tajada', 'rebanada'].includes(item.medida?.n) ? item.medida.g : item.unidad?.n === 'rebanada' ? item.unidad.g : 30;
  if (n === 'puñado') return item.medida?.n === 'puñado' ? item.medida.g : 25;
  if (n === 'lata') return item.unidad?.n === 'lata' ? item.unidad.g : 100;
  return item.porcion.g;
}

// Cantidad escrita JUSTO ANTES del alimento, leyendo hacia atrás: "una taza y media de", "media libra de", "2", "200 g de"
function cantidadAntes(palabras) {
  let i = palabras.length - 1, extra = 0, medida = null;
  if (['de', 'del'].includes(palabras[i])) i--;
  if (palabras[i] === 'media' && palabras[i - 1] === 'y') { extra = 0.5; i -= 2; }
  if (MEDIDAS[palabras[i]]) { medida = MEDIDAS[palabras[i]]; i--; }
  let num = null;
  if (palabras[i] === 'cuarto' || palabras[i] === 'cuartos') { num = (numeroDe(palabras[i - 1]) ?? 1) / 4; }
  else if (palabras[i] === 'media' && palabras[i - 1] === 'y' && numeroDe(palabras[i - 2]) != null) num = numeroDe(palabras[i - 2]) + 0.5;
  else num = numeroDe(palabras[i]);
  if (num == null && !medida) return null;
  return { num: (num ?? 1) + extra, medida };
}
// …o DESPUÉS, antes del siguiente alimento: "pollo 200 gramos", "arroz 2 tazas", "pechuga a la plancha 150 g"
function cantidadDespues(palabras) {
  for (let i = 0; i < palabras.length - 1; i++) {
    const num = numeroDe(palabras[i]);
    if (num != null && MEDIDAS[palabras[i + 1]]) return { num: num + (palabras[i + 2] === 'y' && palabras[i + 3] === 'media' ? 0.5 : 0), medida: MEDIDAS[palabras[i + 1]] };
  }
  return null;
}
const redondo = v => Math.round(v * 100) / 100;

// Renglón de un alimento del menú según la cantidad escrita
function lineaAlimento(item, q, clave, despues, prep) {
  // En plural y sin número ("huevos revueltos", "panes"), de lo que se come por piezas pequeñas: son 2
  const plural = !q && item.unidad && item.unidad.g <= 130 && /s$/.test(clave.split(' ')[0]) ? 2 : null;
  let unidad, gUnidad, cantidad;
  if (q?.medida?.peso) { unidad = q.medida.n; gUnidad = q.medida.peso; cantidad = q.num; }
  else if (q?.medida) { unidad = q.medida.n; gUnidad = gramosDeMedida(item, q.medida.n); cantidad = q.num; }
  else {
    // Solo un número ("2 huevos", "3 tomates"): cuenta piezas si el alimento se cuenta por piezas
    const pieza = q && item.unidad && item.unidad.g <= 500 ? item.unidad : item.base;
    unidad = pieza.n; gUnidad = pieza.g; cantidad = q?.num ?? CANTIDAD_DE_NOMBRE[clave] ?? plural ?? 1;
  }
  if (despues.some(w => GRANDE.includes(w))) cantidad *= 1.5;
  else if (despues.some(w => PEQUENO.includes(w))) cantidad *= 0.7;
  const l = { id: item.id, cantidad: redondo(cantidad), unidad, gUnidad };
  if (!q && !CANTIDAD_DE_NOMBRE[clave]) l.estimado = true;   // sin cantidad escrita: porción habitual
  if (prep) { l.prep = prep.id; l.prepForma = prep.forma; }
  return l;
}

// Cómo se preparó: lo dicho en el propio nombre ("huevos revueltos", "queso frito") o justo después ("pescado frito con…")
function preparacionDe(item, clave, despues) {
  if (!SE_PREPARA.has(item.catAlimento)) return null;
  const cerca = [];
  for (const w of despues.slice(0, 4)) { if (['con', 'y', 'mas', 'acompanado', 'acompanada'].includes(w)) break; cerca.push(w); }
  const texto = ` ${clave} ${cerca.join(' ')} `;
  let palabra = null;
  const p = PREPARACION.find(x => (palabra = x.palabras.find(w => texto.includes(` ${w} `))));
  if (!p || (YA_PREPARADO.has(item.alimentoId) && ['guisado', 'plancha'].includes(p.id))) return null;
  if (!(p.aceite(item) || p.harina)) return null;
  return { id: p.id, forma: FORMA_ESCRITA[palabra] || palabra };
}
const FORMA_ESCRITA = { plancha: 'a la plancha', parrilla: 'a la parrilla', horno: 'al horno', vapor: 'al vapor', fritura: 'frito' };

// Renglón de un plato de la calle (por unidad): "2 pedazos de pizza", "una pizza entera", "un refresco grande"
function lineaComun(item, antes, despues, t, fin) {
  let cantidad = item.defecto, num = null, conUnidad = false;
  for (let i = antes.length - 1; i >= Math.max(0, antes.length - 3); i--) {
    const n = numeroDe(antes[i]);
    if (n != null) { num = n; conUnidad = antes.slice(i + 1).some(w => item.porUnidad.includes(w)); break; }
  }
  if (num != null) cantidad = conUnidad || item.defecto === 1 ? num : item.defecto * num;
  if (despues.some(w => ['entera', 'entero', 'completa', 'completo'].includes(w)) && item.entera) cantidad = item.entera * (num || 1);
  if (despues.some(w => ['grande', 'litro', 'jumbo', 'grandes'].includes(w)) && item.grande) cantidad = Math.round(cantidad * item.grande * 10) / 10;
  const sinAzucar = /\bsin azucar\b|\bamargo\b|\bsin dulce\b/.test(t.slice(fin, Math.min(t.length, fin + 20)));
  return { id: item.id, cantidad, conAzucar: !!item.conAzucar && !sinAzucar };
}

// "2 huevos hervidos con pan y un cafecito" → renglones
export function entenderTexto(texto) {
  const t = ` ${normal(texto)} `;
  const usados = [], encontrados = [];
  for (const { k, item } of CLAVES) {
    // El espacio de delante entra en la coincidencia (iPhone con iOS 15 no entiende "(?<=…)"); el de detrás no se consume.
    const re = new RegExp(`\\s${k.replace(/[-]/g, '\\-')}(?=\\s)`, 'g');
    let m;
    while ((m = re.exec(t))) {
      const ini = m.index + 1, fin = ini + k.length;
      if (usados.some(([a, b]) => ini < b && fin > a)) continue;
      usados.push([ini, fin]);
      encontrados.push({ item, k, ini, fin });
    }
  }
  encontrados.sort((a, b) => a.ini - b.ini);
  // "jugo de chinola": dos palabras del mismo producto muy juntas cuentan una sola vez
  const unicos = encontrados.filter((e, i) => {
    const prev = encontrados[i - 1];
    return !(prev && prev.item === e.item && t.slice(prev.fin, e.ini).trim().split(' ').filter(Boolean).length <= 2);
  });
  const lineas = [];
  let sandwich = null;   // renglón del sándwich mientras se ve si se nombran sus partes
  unicos.forEach(({ item, k, ini, fin }, i) => {
    const desdeAnterior = i ? unicos[i - 1].fin : 0;   // la cantidad no se toma de lo que pertenece al alimento anterior
    const antes = t.slice(desdeAnterior, ini).trim().split(' ').filter(Boolean).slice(-5);
    const hastaSiguiente = unicos[i + 1]?.ini ?? t.length;
    const despues = t.slice(fin, hastaSiguiente).trim().split(' ').filter(Boolean).slice(0, 6);
    if (antes[antes.length - 1] === 'sin') return;   // "sin mayonesa", "sin azúcar": no se comió
    if (!item.porGramo) {
      const l = lineaComun(item, antes, despues, t, fin);
      lineas.push(l);
      sandwich = item.id === 'sandwich' ? l : RELLENO.has(item.id) ? sandwich : null;
      return;
    }
    const q = cantidadAntes(antes) || cantidadDespues(despues);
    // "café con 3 cucharaditas de azúcar": el café ya cuenta 2 cucharaditas; si se dice cuánta, vale lo dicho
    if (item.id === 'ag_azucar') {
      const bebida = [...lineas].reverse().find(x => porIdComun(x.id)?.conAzucar);
      if (bebida) { if (!q) return; bebida.conAzucar = false; }
    }
    const l = lineaAlimento(item, q, k, despues.slice(0, 2), preparacionDe(item, k, despues));
    lineas.push(l);
    // "sándwich de jamón y queso con mayonesa": se cuenta por partes — 2 rebanadas de pan de molde + lo que se nombró
    if (sandwich && (RELLENO.has(item.id) || item.catAlimento === 'agregado')) {
      if (RELLENO.has(item.id) && sandwich.id === 'sandwich') {
        const n = sandwich.cantidad || 1;
        for (const k2 of Object.keys(sandwich)) delete sandwich[k2];
        Object.assign(sandwich, { id: 'ag_pan_molde', cantidad: 2 * n, unidad: 'rebanada', gUnidad: 26 });
      }
      if ((item.id === 'ag_jamon' || item.id === 'ag_jamon_pavo') && l.estimado) l.cantidad = 2;   // un sándwich lleva unas 2 lonjas
    } else sandwich = null;
  });
  return lineas.map(({ estimado, ...l }) => l);
}

// Quita lo de "hervido" o "guisado" del nombre de la tabla y pone cómo se preparó, con la palabra que escribió la persona
function nombreConPreparacion(nombre, forma) {
  const base = nombre.replace(/ o en mangú/, '').replace(/ (hervid|guisad)[oa]s?\b/, '').trim();
  return `${base} (${forma})`;
}

// Valores de un renglón (calorías, proteína…); acepta los renglones guardados antes de este lector
export function valoresLinea(l) {
  const item = porIdComun(l.id);
  if (!item) return null;
  if (item.porGramo) {
    const gUnidad = l.gUnidad ?? item.base.g;
    const gramos = l.cantidad * gUnidad;
    const f = gramos / 100;
    // Lo que suma la preparación: aceite absorbido (mínimo 2 g) y el pan rallado del empanizado
    const prep = PREP_POR_ID[l.prep];
    const aceiteG = prep ? Math.max(2, gramos * prep.aceite(item)) : 0;
    const harinaG = prep?.harina ? gramos * prep.harina : 0;
    const fh = harinaG / 100;
    return {
      ...l, nombre: prep ? nombreConPreparacion(item.nombre, l.prepForma || prep.etiqueta) : item.nombre, icono: item.icono, cat: item.cat, unidad: l.unidad ?? item.base.n,
      alimentoId: item.alimentoId || null, gramos: Math.round(gramos), aceiteG: Math.round(aceiteG), harinaG: Math.round(harinaG),
      kcal: Math.round(item.kcal100 * f + aceiteG * ACEITE_KCAL + PAN_RALLADO.kcal * fh),
      p: Math.round(item.p100 * f + PAN_RALLADO.p * fh), c: Math.round(item.c100 * f + PAN_RALLADO.c * fh),
      g: Math.round(item.g100 * f + aceiteG + PAN_RALLADO.g * fh),
      azucar: Math.round((item.azucar100 || 0) * f), cafeina: 0, consejo: null,
    };
  }
  const q = l.cantidad;
  const azucarExtra = l.conAzucar ? 2 * AZUCAR_CUCHARADITA * q : 0;   // 2 cucharaditas por taza
  return {
    ...l, nombre: item.nombre, icono: item.icono, cat: item.cat, unidad: item.unidad, alimentoId: item.alimentoId || null,
    kcal: Math.round(item.kcal * q + azucarExtra * 4), p: Math.round(item.p * q), c: Math.round(item.c * q + azucarExtra), g: Math.round(item.g * q),
    azucar: Math.round(item.azucar * q + azucarExtra), cafeina: Math.round(item.cafeina * q), consejo: item.consejo || null,
  };
}

export function totalesLineas(lineas) {
  const v = lineas.map(valoresLinea).filter(Boolean);
  return v.reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, g: a.g + x.g, azucar: a.azucar + x.azucar, cafeina: a.cafeina + x.cafeina }),
    { kcal: 0, p: 0, c: 0, g: 0, azucar: 0, cafeina: 0 });
}

// Botones − y + de "lo que entendimos": en gramos van de 25 en 25; en piezas y medidas, de 1 en 1 (y la mitad por debajo de 1)
export function cambiarCantidad(l, sube) {
  if (l.unidad === 'g') { l.cantidad = Math.max(25, Math.round((l.cantidad + (sube ? 25 : -25)) / 5) * 5); return l; }
  if (sube) l.cantidad = l.cantidad < 1 ? 1 : l.cantidad + 1;
  else l.cantidad = Math.max(0.5, l.cantidad - (l.cantidad > 1 ? 1 : 0.5));
  l.cantidad = redondo(l.cantidad);
  return l;
}
