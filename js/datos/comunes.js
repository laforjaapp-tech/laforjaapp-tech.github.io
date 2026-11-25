// FASE 4: comida y bebida fuera del plan (calle, fiestas, antojos) para la libreta.
// Valores APROXIMADOS por unidad típica: cambian según el lugar y la receta. Sirven para orientar.
// claves: palabras con las que se reconoce al escribir (sin acentos). cat: comida | bebida | cafe | fruta | alcohol
// azucar: g de azúcar añadida aprox. · cafeina: mg · porUnidad: palabras que indican la unidad ("rebanada")

const C = (id, nombre, icono, cat, unidad, defecto, [kcal, p, c, g], extra = {}) =>
  ({ id, nombre, icono, cat, unidad, defecto, kcal, p, c, g, azucar: 0, cafeina: 0, claves: [], porUnidad: [], ...extra });

export const COMUNES = [
  // ---------- Comida rápida y de la calle ----------
  C('pizza', 'Pizza', '🍕', 'comida', 'pedazo', 2, [285, 12, 36, 10], { claves: ['pizza', 'pizzas'], porUnidad: ['pedazo', 'pedazos', 'rebanada', 'rebanadas', 'porcion', 'porciones', 'trozo', 'trozos', 'slice'], entera: 6, azucar: 3,
    consejo: 'La pizza no está prohibida: lo que cuenta es la cantidad y el resto del día. Acompáñala con ensalada y agua en vez de refresco, y prefiere 1–2 pedazos.' }),
  C('hamburguesa', 'Hamburguesa', '🍔', 'comida', 'unidad', 1, [550, 28, 45, 28], { claves: ['hamburguesa', 'hamburguesas', 'burger'], azucar: 6,
    consejo: 'Si la acompañas con ensalada en vez de papas fritas y con agua en vez de refresco, ahorras unas 400 kcal.' }),
  C('papas_fritas', 'Papas fritas', '🍟', 'comida', 'porción mediana', 1, [365, 4, 48, 17], { claves: ['papas fritas', 'papitas fritas', 'french fries'],
    consejo: 'Las frituras suman mucha grasa en poco volumen. Mejor papa o yuca hervida o al horno.' }),
  C('pica_pollo', 'Pica pollo (pollo frito)', '🍗', 'comida', 'pieza', 2, [320, 22, 12, 20], { claves: ['pica pollo', 'picapollo', 'pollo frito'],
    consejo: 'El pollo aporta proteína; el empanizado y la fritura, mucha grasa. Quítale la piel empanizada si puedes y acompaña con ensalada.' }),
  C('chimi', 'Chimi', '🥪', 'comida', 'unidad', 1, [600, 25, 55, 30], { claves: ['chimi', 'chimichurri', 'chimis'],
    consejo: 'Un chimi es casi una comida completa: tenlo en cuenta en la cena (más ligera, con vegetales y proteína).' }),
  C('yaroa', 'Yaroa', '🍽️', 'comida', 'porción', 1, [850, 30, 80, 45], { claves: ['yaroa', 'yaroas'],
    consejo: 'La yaroa es muy abundante: compartirla es una buena idea. Hoy, el resto de comidas más ligeras y con vegetales.' }),
  C('empanada', 'Empanada', '🥟', 'comida', 'unidad', 1, [250, 8, 25, 13], { claves: ['empanada', 'empanadas', 'empanadilla'] }),
  C('pastelito', 'Pastelito', '🥟', 'comida', 'unidad', 1, [230, 6, 22, 13], { claves: ['pastelito', 'pastelitos', 'quipe', 'quipes', 'kipe'] }),
  C('tostones', 'Tostones', '🍌', 'comida', 'porción (6)', 1, [300, 2, 40, 15], { claves: ['tostones', 'tostón', 'toston', 'fritos verdes'],
    consejo: 'El plátano hervido aporta lo mismo con mucha menos grasa que los tostones.' }),
  C('salami_frito', 'Salami frito', '🥓', 'comida', 'porción (3 lonjas)', 1, [250, 10, 2, 22], { claves: ['salami', 'salchichon'],
    consejo: 'Los embutidos tienen mucha sal y grasa: mejor de vez en cuando. El huevo o el queso a la plancha son buena alternativa.' }),
  C('longaniza', 'Longaniza', '🌭', 'comida', 'porción', 1, [300, 13, 2, 27], { claves: ['longaniza'] }),
  C('chicharron', 'Chicharrón', '🥓', 'comida', 'porción', 1, [270, 30, 0, 16], { claves: ['chicharron', 'chicharrones'] }),
  C('hot_dog', 'Perro caliente', '🌭', 'comida', 'unidad', 1, [300, 11, 24, 18], { claves: ['perro caliente', 'hot dog', 'hotdog', 'salchicha'] }),
  C('sandwich', 'Sándwich de jamón y queso', '🥪', 'comida', 'unidad', 1, [350, 18, 30, 16], { claves: ['sandwich', 'sandwiches', 'emparedado', 'sanduche'] }),
  C('bandera', 'Plato del día (arroz, habichuelas y carne)', '🍛', 'comida', 'plato', 1, [750, 32, 95, 22], { claves: ['bandera', 'plato del dia', 'comida de fonda', 'arroz con habichuelas', 'arroz con pollo', 'moro'] }),
  C('mangu_3g', 'Mangú con los tres golpes', '🍳', 'comida', 'plato', 1, [900, 30, 90, 45], { claves: ['tres golpes', '3 golpes'],
    consejo: 'Versión más ligera: mangú con huevo hervido o queso a la plancha en vez de salami y queso frito.' }),
  C('pan_salami', 'Pan con salami o jamón', '🥪', 'comida', 'unidad', 1, [380, 14, 40, 18], { claves: ['pan con salami', 'pan con jamon', 'pan con queso'] }),
  C('arroz_plato', 'Arroz blanco', '🍚', 'comida', 'taza', 1, [210, 4, 45, 1], { claves: ['arroz'] }),
  // ---------- Dulces y meriendas ----------
  // ---------- Platos de la casa que se piden enteros ----------
  C('ensalada', 'Ensalada verde (sin aderezo)', '🥗', 'comida', 'plato', 1, [35, 2, 7, 0], { claves: ['ensalada', 'ensaladas', 'ensalada verde', 'ensalada de lechuga'], porUnidad: ['plato', 'platos', 'porcion', 'porciones', 'taza', 'tazas'] }),
  C('ensalada_rusa', 'Ensalada rusa (papa con mayonesa)', '🥗', 'comida', 'plato', 1, [330, 5, 25, 23], { claves: ['ensalada rusa', 'ensalada de papa', 'potato salad'], porUnidad: ['plato', 'platos', 'porcion', 'porciones', 'taza', 'tazas'],
    consejo: 'La mayonesa es lo que más suma: sírvete media porción o cámbiala por ensalada verde.' }),
  C('moro', 'Moro (arroz con guandules o habichuelas)', '🍚', 'comida', 'plato', 1, [420, 11, 74, 9], { claves: ['moro', 'moros'], porUnidad: ['plato', 'platos', 'porcion', 'porciones', 'taza', 'tazas'] }),
  C('sancocho', 'Sancocho', '🍲', 'comida', 'plato', 1, [450, 28, 45, 16], { claves: ['sancocho', 'sancochito', 'sancocho de siete carnes'], porUnidad: ['plato', 'platos'] }),
  C('helado', 'Helado', '🍨', 'comida', 'bola', 2, [140, 2, 16, 7], { claves: ['helado', 'helados', 'mantecado'], porUnidad: ['bola', 'bolas'], azucar: 14 }),
  C('galletas', 'Galletas', '🍪', 'comida', 'porción (3)', 1, [150, 2, 21, 7], { claves: ['galleta', 'galletas', 'galletica', 'galleticas'], azucar: 9 }),
  C('bizcocho', 'Bizcocho, pastel o dulce', '🍰', 'comida', 'pedazo', 1, [350, 4, 50, 15], { claves: ['bizcocho', 'pastel', 'torta', 'dulce', 'dulces', 'habichuelas con dulce', 'flan'], porUnidad: ['pedazo', 'pedazos', 'porcion'], azucar: 30 }),
  C('chocolate', 'Chocolate', '🍫', 'comida', 'barra pequeña', 1, [230, 3, 26, 13], { claves: ['chocolate', 'chocolatina', 'chocolates'], azucar: 24 }),
  C('pan_agua_c', 'Pan de agua', '🥖', 'comida', 'pan', 1, [165, 5, 32, 2], { claves: ['pan de agua', 'pan sobao', 'pancito', 'pan'], porUnidad: ['pan', 'panes'] }),
  // ---------- Bebidas ----------
  C('refresco_zero', 'Refresco sin azúcar (zero / light)', '🥤', 'bebida', 'lata (355 ml)', 1, [0, 0, 0, 0], { claves: ['coca zero', 'cocacola zero', 'coca-cola zero', 'coca light', 'refresco light', 'refresco zero', 'pepsi zero', 'diet'], cafeina: 34,
    consejo: 'Sin azúcar es mejor opción que el refresco normal; aun así, el agua es lo que más te hidrata.' }),
  C('cola', 'Coca-Cola o refresco de cola', '🥤', 'bebida', 'lata (355 ml)', 1, [140, 0, 39, 0], { claves: ['cocacola', 'coca-cola', 'coca cola', 'coca', 'cocas', 'pepsi', 'cola'], porUnidad: ['lata', 'latas', 'vaso', 'vasos', 'botella', 'botellas'], grande: 1.7, azucar: 39, cafeina: 34,
    consejo: 'Una lata de refresco tiene unas 9–10 cucharaditas de azúcar. Cambiarla por agua, agua con limón o refresco sin azúcar es de los cambios más fáciles y que más ayudan.' }),
  C('refresco', 'Refresco (rojo, naranja, limón…)', '🥤', 'bebida', 'lata (355 ml)', 1, [150, 0, 40, 0], { claves: ['refresco', 'refrescos', 'soda', 'sprite', 'fanta', 'country club', 'kola real', 'red rock', 'gaseosa'], porUnidad: ['lata', 'latas', 'vaso', 'vasos', 'botella', 'botellas'], grande: 1.7, azucar: 40,
    consejo: 'Una lata de refresco tiene unas 9–10 cucharaditas de azúcar. El agua fría con limón o un refresco sin azúcar son buenos cambios.' }),
  C('jugo', 'Jugo (natural o de caja)', '🧃', 'bebida', 'vaso (240 ml)', 1, [110, 1, 26, 0], { claves: ['jugo', 'jugos', 'zumo', 'limonada', 'chinola', 'tamarindo'], porUnidad: ['vaso', 'vasos'], azucar: 22,
    consejo: 'El jugo pierde la fibra de la fruta y se toma mucho azúcar en poco tiempo: mejor la fruta entera.' }),
  C('morir_sonando', 'Morir soñando', '🥛', 'bebida', 'vaso', 1, [200, 6, 32, 5], { claves: ['morir sonando', 'morisoñando', 'morir soñando'], azucar: 28 }),
  C('malta', 'Malta', '🍺', 'bebida', 'botella', 1, [220, 1, 50, 0], { claves: ['malta', 'maltas'], azucar: 45 }),
  C('energizante', 'Bebida energizante', '⚡', 'bebida', 'lata', 1, [110, 0, 28, 0], { claves: ['energizante', 'red bull', 'monster', 'energy drink'], azucar: 27, cafeina: 80,
    consejo: 'Tienen mucha cafeína y azúcar: evítalas por la tarde y con problemas del corazón o presión alta.' }),
  // ---------- Café y té ----------
  C('cafe_leche', 'Café con leche', '☕', 'cafe', 'taza', 1, [90, 5, 8, 4], { claves: ['cafe con leche', 'cortadito', 'capuchino', 'cappuccino', 'latte'], porUnidad: ['taza', 'tazas', 'vaso'], cafeina: 80, conAzucar: true }),
  C('cafecito', 'Cafecito (tacita)', '☕', 'cafe', 'tacita', 1, [2, 0, 0, 0], { claves: ['cafecito', 'cafecitos', 'tacita', 'tacitas', 'cafe', 'cafes', 'expreso', 'espresso'], porUnidad: ['tacita', 'tacitas', 'taza', 'tazas'], cafeina: 70, conAzucar: true }),
  C('te', 'Té', '🍵', 'cafe', 'taza', 1, [2, 0, 0, 0], { claves: ['te', 'te verde', 'te negro'], cafeina: 30, conAzucar: true }),
  // ---------- Alcohol ----------
  C('cerveza', 'Cerveza', '🍺', 'alcohol', 'botella o lata (355 ml)', 1, [150, 1, 13, 0], { claves: ['cerveza', 'cervezas', 'presidente', 'birra', 'fria', 'frias'], porUnidad: ['botella', 'botellas', 'lata', 'latas', 'jumbo'], grande: 1.9,
    consejo: 'El alcohol suma calorías, empeora el sueño y frena la recuperación. No hace falta eliminarlo, pero menos y no la noche antes de entrenar.' }),
  C('ron', 'Ron o trago', '🥃', 'alcohol', 'trago (45 ml)', 1, [100, 0, 0, 0], { claves: ['ron', 'trago', 'tragos', 'brugal', 'barcelo', 'whisky', 'vodka', 'mamajuana', 'cuba libre'], porUnidad: ['trago', 'tragos'] }),
  C('vino', 'Vino', '🍷', 'alcohol', 'copa', 1, [125, 0, 4, 0], { claves: ['vino', 'vinos', 'copa de vino'], porUnidad: ['copa', 'copas'] }),
  // ---------- Frutas que no están en el plan ----------
  C('uvas', 'Uvas', '🍇', 'fruta', 'taza', 1, [104, 1, 27, 0], { claves: ['uva', 'uvas'] }),
  C('pera', 'Pera', '🍐', 'fruta', 'unidad', 1, [100, 1, 27, 0], { claves: ['pera', 'peras'] }),
  C('melon', 'Melón', '🍈', 'fruta', 'taza', 1, [60, 1, 14, 0], { claves: ['melon'] }),
  C('limon', 'Limón', '🍋', 'fruta', 'unidad', 1, [17, 0, 5, 0], { claves: ['limon', 'limones'] }),
  C('cereza', 'Cerezas o acerolas', '🍒', 'fruta', 'taza', 1, [90, 1, 22, 0], { claves: ['cereza', 'cerezas', 'acerola', 'acerolas'] }),
];

export const AZUCAR_REFERENCIA = { maximo: 50, ideal: 25 };   // OMS: azúcares libres <10 % (ideal <5 %) de la energía
export const CAFEINA_REFERENCIA = { maximo: 400, embarazo: 200 };
export const FRUTAS_REFERENCIA = { min: 2, max: 3 };
export const AZUCAR_CUCHARADITA = 4;   // g por cucharadita
