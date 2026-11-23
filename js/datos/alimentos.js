// FASE 4: catálogo de alimentos y platos base para armar los menús.
// Basado en la cocina dominicana real de clase media y baja (estudio de gastronomía dominicana, oct 2026:
// Pro Consumidor, Ministerio de Agricultura, BCRD, FAO, prensa y antropología dominicana) y revisado por
// la nutricionista deportiva del proyecto.
//
// Valores por 100 g del alimento tal como se come (cocido cuando corresponde), según USDA FoodData Central
// e INCAP. Son aproximados: sirven para orientar, no son valores exactos.
//
// cat: proteina | legumbre | carbohidrato | vegetal | fruta | lacteo | grasa
// origen: carne | ave | pescado | marisco | huevo | lacteo | vegetal   (para vegetariano / vegano)
// costo: 1 económico · 2 medio · 3 caro
// nut: nutrientes destacados (ver NUTRIENTES en nutrientes.js)
// alerg: alérgenos que contiene · trazas: posible contaminación cruzada
// porcion: gramos habituales en una comida · rango: mínimo y máximo por comida cuando la porción se ajusta
// unidad: { n, g } si se cuenta por piezas · medida: medida casera { n, g }
// compra: 'unidad' | 'litro' | 'lata' | 'peso' · factor: de cocido a crudo/seco para la lista de compras
// precio: referencia aproximada en RD$ (2026) { rd, por: 'lb' | 'unidad' | 'lata' | 'litro' }; el usuario anota el suyo
// ligeroPre: false → no se pone en la comida justo antes de entrenar (pesado de digerir)
// ocasional: true → alto en sal o grasa; solo aparece si el usuario lo marca como favorito, y como mucho 1 vez por semana
// sal: 'alta' | 'media' → con la dieta baja en sal que indica la nutrióloga, lo de sal alta se quita y lo de sal media sale menos

const A = (id, nombre, corto, cat, origen, [kcal, p, c, g, f], extra = {}) =>
  ({ id, nombre, corto, cat, origen, kcal, p, c, g, f, costo: 1, nut: [], alerg: [], trazas: [], compra: 'peso', factor: 1, ...extra });

export const ALIMENTOS = [
  // ---------- Aves, carnes, pescados y huevos ----------
  A('pollo_guisado', 'Pollo guisado (pieza, sin piel)', 'pollo', 'proteina', 'ave', [190, 28, 0, 8, 0], { nut: ['proteina', 'vitB', 'zinc'], rango: [80, 220], factor: 1.8, precio: { rd: 84, por: 'lb' },
    nota: 'Quítale la piel antes de servir: ahí está la mayor parte de la grasa.' }),
  A('pollo', 'Pechuga de pollo', 'pechuga de pollo', 'proteina', 'ave', [165, 31, 0, 3.6, 0], { costo: 2, nut: ['proteina', 'vitB'], rango: [80, 220], factor: 1.33, precio: { rd: 160, por: 'lb' } }),
  A('muslo_pollo', 'Muslo de pollo (con hueso, sin piel al comer)', 'muslo de pollo', 'proteina', 'ave', [180, 25, 0, 8.5, 0], { nut: ['proteina', 'vitB', 'zinc'], rango: [80, 220], factor: 1.8, precio: { rd: 85, por: 'lb' } }),
  A('higado_pollo', 'Hígado de pollo', 'hígado de pollo', 'proteina', 'ave', [167, 24.5, 0.9, 6.5, 0], { nut: ['proteina', 'hierro', 'vitA', 'vitB', 'zinc'], rango: [80, 160], factor: 1.25, precio: { rd: 90, por: 'lb' } }),
  A('pavo', 'Pechuga de pavo fresca (no embutido)', 'pavo', 'proteina', 'ave', [135, 29, 0, 1.7, 0], { costo: 3, nut: ['proteina', 'vitB'], rango: [80, 220], factor: 1.33, precio: { rd: 300, por: 'lb' } }),
  A('res', 'Carne de res magra guisada', 'res', 'proteina', 'carne', [200, 28, 0, 9, 0], { costo: 2, nut: ['proteina', 'hierro', 'zinc', 'vitB'], rango: [80, 200], factor: 1.35, precio: { rd: 250, por: 'lb' } }),
  A('res_molida', 'Carne molida de res (magra)', 'carne molida', 'proteina', 'carne', [215, 26, 0, 12, 0], { costo: 2, nut: ['proteina', 'hierro', 'zinc', 'vitB'], rango: [80, 200], factor: 1.3, precio: { rd: 220, por: 'lb' } }),
  A('cerdo', 'Carne de cerdo magra', 'cerdo', 'proteina', 'carne', [190, 28, 0, 8, 0], { costo: 2, nut: ['proteina', 'vitB', 'zinc'], rango: [80, 200], factor: 1.35, precio: { rd: 180, por: 'lb' } }),
  A('chivo', 'Chivo guisado', 'chivo', 'proteina', 'carne', [143, 27, 0, 3, 0], { costo: 3, nut: ['proteina', 'hierro', 'zinc', 'vitB'], rango: [80, 200], factor: 1.6, precio: { rd: 300, por: 'lb' } }),
  A('pescado', 'Pescado blanco en filete (tilapia, dorado, mero)', 'pescado', 'proteina', 'pescado', [128, 26, 0, 2.7, 0], { costo: 2, nut: ['proteina', 'vitB'], alerg: ['pescado'], rango: [100, 240], factor: 1.25, precio: { rd: 250, por: 'lb' } }),
  A('sardinas', 'Sardinas en lata (escurridas)', 'sardinas', 'proteina', 'pescado', [208, 25, 0, 11, 0], { sal: 'media', nut: ['proteina', 'omega3', 'calcio', 'vitD'], alerg: ['pescado'], rango: [60, 180], compra: 'lata', unidad: { n: 'lata', g: 90 }, precio: { rd: 52, por: 'lata' },
    nota: 'Baratas y muy nutritivas: proteína, omega-3 y calcio (si comes la espina).' }),
  A('atun', 'Atún en lata', 'atún', 'proteina', 'pescado', [116, 26, 0, 1, 0], { sal: 'media', costo: 2, nut: ['proteina', 'vitB'], alerg: ['pescado'], trazas: ['soya'], rango: [60, 200], compra: 'lata', unidad: { n: 'lata', g: 100 }, precio: { rd: 100, por: 'lata' },
    nota: 'Si es en aceite, escúrrelo bien.' }),
  A('salmon', 'Salmón', 'salmón', 'proteina', 'pescado', [206, 22, 0, 13, 0], { costo: 3, nut: ['proteina', 'omega3', 'vitD', 'vitB'], alerg: ['pescado'], rango: [90, 200], factor: 1.2, precio: { rd: 600, por: 'lb' } }),
  A('camarones', 'Camarones pelados', 'camarones', 'proteina', 'marisco', [99, 24, 0.2, 0.3, 0], { costo: 3, nut: ['proteina', 'zinc'], alerg: ['mariscos'], rango: [100, 240], factor: 1.2, precio: { rd: 450, por: 'lb' } }),
  A('bacalao', 'Bacalao desalado y guisado', 'bacalao', 'proteina', 'pescado', [105, 23, 0, 0.9, 0], { sal: 'alta', costo: 3, ocasional: true, nut: ['proteina', 'vitB'], alerg: ['pescado'], rango: [80, 180], factor: 0.6, precio: { rd: 450, por: 'lb' },
    nota: 'Muy salado: desálalo bien (remojo con varios cambios de agua).' }),
  A('arenque', 'Arenque ahumado', 'arenque', 'proteina', 'pescado', [217, 25, 0, 12, 0], { sal: 'alta', costo: 2, ocasional: true, nut: ['proteina', 'omega3'], alerg: ['pescado'], rango: [50, 120], precio: { rd: 300, por: 'lb' },
    nota: 'Muy salado: hiérvelo y escúrrelo antes de guisarlo.' }),
  A('salami', 'Salami dominicano', 'salami', 'proteina', 'carne', [270, 12, 4, 23, 0], { sal: 'alta', ocasional: true, nut: ['proteina'], rango: [30, 60], precio: { rd: 140, por: 'lb' },
    nota: 'Mucha sal y grasa: es la proteína más cara para lo que aporta. Mejor huevo, sardina o pollo; si lo comes, 1–2 ruedas a la plancha.' }),
  A('huevo', 'Huevo', 'huevo', 'proteina', 'huevo', [143, 12.6, 0.7, 9.5, 0], { nut: ['proteina', 'vitB', 'vitD', 'vitA'], alerg: ['huevo'], rango: [50, 150], porcion: 100, unidad: { n: 'huevo', g: 50 }, compra: 'unidad', precio: { rd: 7, por: 'unidad' } }),
  A('claras', 'Claras de huevo (cartón)', 'claras de huevo', 'proteina', 'huevo', [52, 10.9, 0.7, 0.2, 0], { costo: 2, nut: ['proteina'], alerg: ['huevo'], rango: [60, 200], medida: { n: 'taza', g: 240 }, compra: 'litro', precio: { rd: 250, por: 'litro' } }),
  A('tofu', 'Tofu firme', 'tofu', 'proteina', 'vegetal', [144, 15.6, 3, 8.7, 2.3], { costo: 3, nut: ['proteina', 'calcio', 'hierro'], alerg: ['soya'], rango: [100, 250], precio: { rd: 250, por: 'lb' } }),
  // ---------- Lácteos ----------
  A('queso_fresco', 'Queso blanco o de freír (a la plancha)', 'queso blanco', 'lacteo', 'lacteo', [300, 18, 3, 24, 0], { sal: 'alta', costo: 2, nut: ['calcio', 'proteina'], alerg: ['lacteos'], porcion: 30, rango: [30, 80], medida: { n: 'lonja', g: 30 }, precio: { rd: 225, por: 'lb' },
    nota: 'Tiene bastante sal: 1 lonja, a la plancha y no frito.' }),
  A('cottage', 'Requesón o queso cottage', 'requesón', 'lacteo', 'lacteo', [98, 11, 3.4, 4.3, 0], { costo: 3, nut: ['proteina', 'calcio'], alerg: ['lacteos'], rango: [80, 220], medida: { n: 'taza', g: 220 }, precio: { rd: 250, por: 'lb' } }),
  A('yogur', 'Yogur natural sin azúcar', 'yogur natural', 'lacteo', 'lacteo', [61, 3.5, 4.7, 3.3, 0], { costo: 2, nut: ['calcio', 'vitB'], alerg: ['lacteos'], porcion: 200, rango: [125, 250], medida: { n: 'taza', g: 200 }, precio: { rd: 60, por: 'lb' } }),
  A('yogur_griego', 'Yogur griego natural', 'yogur griego', 'lacteo', 'lacteo', [75, 10, 4, 2, 0], { costo: 3, nut: ['proteina', 'calcio'], alerg: ['lacteos'], porcion: 170, rango: [120, 280], medida: { n: 'taza', g: 200 }, precio: { rd: 140, por: 'lb' } }),
  A('leche', 'Leche (líquida o en polvo preparada)', 'leche', 'lacteo', 'lacteo', [61, 3.2, 4.8, 3.3, 0], { nut: ['calcio', 'vitD', 'vitB'], alerg: ['lacteos'], porcion: 200, rango: [100, 300], medida: { n: 'vaso', g: 240 }, compra: 'litro', precio: { rd: 85, por: 'litro' } }),
  A('bebida_soya', 'Bebida de soya sin azúcar (fortificada)', 'bebida de soya', 'lacteo', 'vegetal', [33, 3, 1.5, 1.8, 0.5], { costo: 3, nut: ['calcio', 'vitD'], alerg: ['soya'], porcion: 240, rango: [150, 300], medida: { n: 'vaso', g: 240 }, compra: 'litro', precio: { rd: 180, por: 'litro' } }),
  // ---------- Legumbres (proteína vegetal + carbohidrato + fibra) ----------
  A('habichuelas_rojas', 'Habichuelas rojas', 'habichuelas rojas', 'legumbre', 'vegetal', [127, 8.7, 22.8, 0.5, 6.4], { nut: ['fibra', 'hierro', 'magnesio', 'potasio', 'vitB'], porcion: 130, rango: [100, 300], medida: { n: 'taza', g: 170 }, factor: 0.4, ligeroPre: false, precio: { rd: 85, por: 'lb' },
    nota: 'Si son de lata, enjuágalas: les quitas buena parte de la sal.' }),
  A('habichuelas_negras', 'Habichuelas negras', 'habichuelas negras', 'legumbre', 'vegetal', [132, 8.9, 23.7, 0.5, 8.7], { nut: ['fibra', 'hierro', 'magnesio', 'potasio', 'vitB'], porcion: 130, rango: [100, 300], medida: { n: 'taza', g: 170 }, factor: 0.4, ligeroPre: false, precio: { rd: 85, por: 'lb' } }),
  A('gandules', 'Guandules', 'guandules', 'legumbre', 'vegetal', [121, 6.8, 23.3, 0.4, 6.7], { nut: ['fibra', 'magnesio', 'potasio', 'vitB'], porcion: 100, rango: [100, 300], medida: { n: 'taza', g: 170 }, factor: 0.4, ligeroPre: false, precio: { rd: 90, por: 'lb' } }),
  A('lentejas', 'Lentejas', 'lentejas', 'legumbre', 'vegetal', [116, 9, 20, 0.4, 7.9], { nut: ['fibra', 'hierro', 'vitB', 'magnesio'], porcion: 150, rango: [120, 320], medida: { n: 'taza', g: 200 }, factor: 0.4, ligeroPre: false, precio: { rd: 80, por: 'lb' } }),
  A('garbanzos', 'Garbanzos', 'garbanzos', 'legumbre', 'vegetal', [164, 8.9, 27.4, 2.6, 7.6], { costo: 2, nut: ['fibra', 'hierro', 'magnesio'], porcion: 120, rango: [100, 280], medida: { n: 'taza', g: 165 }, factor: 0.4, ligeroPre: false, precio: { rd: 100, por: 'lb' } }),
  // ---------- Arroz, pastas, panes y víveres ----------
  A('arroz', 'Arroz blanco', 'arroz', 'carbohidrato', 'vegetal', [130, 2.7, 28, 0.3, 0.4], { rango: [80, 200], medida: { n: 'taza', g: 160 }, factor: 0.4, precio: { rd: 34, por: 'lb' },
    nota: 'Una taza servida es una porción. Cocínalo con 1 cucharadita de aceite por taza de arroz crudo.' }),
  A('arroz_integral', 'Arroz integral', 'arroz integral', 'carbohidrato', 'vegetal', [123, 2.7, 25.6, 1, 1.6], { costo: 2, nut: ['fibra', 'magnesio'], rango: [80, 200], medida: { n: 'taza', g: 160 }, factor: 0.4, precio: { rd: 70, por: 'lb' } }),
  A('espagueti', 'Espaguetis', 'espaguetis', 'carbohidrato', 'vegetal', [158, 5.8, 31, 0.9, 1.8], { alerg: ['gluten'], rango: [100, 250], medida: { n: 'taza', g: 140 }, factor: 0.45, precio: { rd: 47, por: 'lb' } }),
  A('pasta_integral', 'Pasta integral', 'pasta integral', 'carbohidrato', 'vegetal', [149, 5.8, 30, 1.7, 3.9], { costo: 2, nut: ['fibra'], alerg: ['gluten'], rango: [100, 250], medida: { n: 'taza', g: 140 }, factor: 0.45, precio: { rd: 120, por: 'lb' } }),
  A('avena', 'Avena en hojuelas', 'avena', 'carbohidrato', 'vegetal', [389, 16.9, 66, 6.9, 10.6], { nut: ['fibra', 'magnesio', 'hierro', 'zinc'], trazas: ['gluten'], rango: [20, 80], medida: { n: 'taza', g: 80 }, precio: { rd: 150, por: 'lb' } }),
  A('harina_maiz', 'Harina de maíz cocida', 'harina de maíz', 'carbohidrato', 'vegetal', [71, 1.7, 15.6, 0.5, 0.8], { rango: [150, 350], medida: { n: 'taza', g: 240 }, factor: 0.2, precio: { rd: 40, por: 'lb' } }),
  A('pan_agua', 'Pan de agua', 'pan de agua', 'carbohidrato', 'vegetal', [275, 9, 54, 2.5, 2.5], { sal: 'media', alerg: ['gluten'], rango: [30, 120], unidad: { n: 'pan', g: 60 }, compra: 'unidad', precio: { rd: 8, por: 'unidad' } }),
  A('casabe', 'Casabe', 'casabe', 'carbohidrato', 'vegetal', [360, 1.5, 87, 0.5, 3.5], { rango: [15, 60], unidad: { n: 'pedazo', g: 20 }, compra: 'unidad', precio: { rd: 10, por: 'unidad' } }),
  A('pan_integral', 'Pan integral', 'pan integral', 'carbohidrato', 'vegetal', [250, 12, 43, 3.4, 6], { sal: 'media', costo: 2, nut: ['fibra', 'vitB'], alerg: ['gluten'], trazas: ['lacteos', 'huevo', 'soya', 'sesamo'], rango: [30, 120], unidad: { n: 'rebanada', g: 30 }, compra: 'unidad', precio: { rd: 9, por: 'unidad' } }),
  A('tortilla_maiz', 'Tortilla de maíz', 'tortilla de maíz', 'carbohidrato', 'vegetal', [218, 5.7, 44.6, 2.9, 6.3], { costo: 2, nut: ['fibra'], trazas: ['gluten'], rango: [40, 160], unidad: { n: 'unidad', g: 40 }, compra: 'unidad', precio: { rd: 12, por: 'unidad' } }),
  A('quinoa', 'Quinoa', 'quinoa', 'carbohidrato', 'vegetal', [120, 4.4, 21.3, 1.9, 2.8], { costo: 3, nut: ['fibra', 'magnesio', 'hierro'], rango: [100, 250], medida: { n: 'taza', g: 185 }, factor: 0.4, precio: { rd: 300, por: 'lb' } }),
  A('platano_verde', 'Plátano verde hervido o en mangú', 'plátano verde', 'carbohidrato', 'vegetal', [116, 0.8, 31, 0.2, 2.3], { nut: ['potasio', 'vitB', 'vitC'], rango: [90, 360], unidad: { n: 'plátano', g: 180 }, compra: 'unidad', precio: { rd: 20, por: 'unidad' },
    nota: 'Para el mangú, májalo con un poco del agua de hervir y cebolla, en vez de mantequilla.' }),
  A('platano_maduro', 'Plátano maduro hervido', 'plátano maduro', 'carbohidrato', 'vegetal', [116, 0.8, 31, 0.2, 2.3], { nut: ['potasio', 'vitA', 'vitC'], rango: [90, 360], unidad: { n: 'plátano', g: 180 }, compra: 'unidad', precio: { rd: 20, por: 'unidad' } }),
  A('guineo_verde', 'Guineítos verdes hervidos', 'guineítos', 'carbohidrato', 'vegetal', [100, 1.2, 25, 0.3, 2], { nut: ['potasio', 'fibra'], rango: [90, 360], unidad: { n: 'guineíto', g: 90 }, compra: 'unidad', precio: { rd: 8, por: 'unidad' } }),
  A('yuca', 'Yuca hervida', 'yuca', 'carbohidrato', 'vegetal', [125, 1, 30, 0.3, 1.5], { nut: ['vitC', 'potasio'], rango: [80, 320], precio: { rd: 41, por: 'lb' } }),
  A('batata', 'Batata hervida', 'batata', 'carbohidrato', 'vegetal', [90, 2, 20.7, 0.2, 3.3], { nut: ['vitA', 'potasio', 'fibra', 'vitC'], rango: [100, 350], precio: { rd: 33, por: 'lb' } }),
  A('yautia', 'Yautía hervida', 'yautía', 'carbohidrato', 'vegetal', [120, 1.5, 28, 0.3, 2.5], { nut: ['potasio'], rango: [80, 320], precio: { rd: 50, por: 'lb' } }),
  A('name', 'Ñame hervido', 'ñame', 'carbohidrato', 'vegetal', [116, 1.5, 27.5, 0.1, 3.9], { nut: ['potasio', 'fibra'], rango: [80, 320], precio: { rd: 80, por: 'lb' } }),
  A('papa', 'Papa', 'papa', 'carbohidrato', 'vegetal', [87, 1.9, 20, 0.1, 1.8], { nut: ['potasio', 'vitC'], rango: [100, 350], unidad: { n: 'papa mediana', g: 150 }, precio: { rd: 40, por: 'lb' } }),
  A('mazorca', 'Mazorca de maíz hervida', 'mazorca', 'carbohidrato', 'vegetal', [96, 3.4, 21, 1.5, 2.4], { nut: ['fibra'], rango: [100, 250], unidad: { n: 'mazorca', g: 100 }, compra: 'unidad', precio: { rd: 25, por: 'unidad' } }),
  // ---------- Vegetales ----------
  A('repollo', 'Repollo', 'repollo', 'vegetal', 'vegetal', [25, 1.3, 5.8, 0.1, 2.5], { nut: ['vitC', 'vitK'], ligeroPre: false, precio: { rd: 32, por: 'lb' } }),
  A('zanahoria', 'Zanahoria', 'zanahoria', 'vegetal', 'vegetal', [41, 0.9, 9.6, 0.2, 2.8], { nut: ['vitA'], unidad: { n: 'zanahoria', g: 70 }, compra: 'unidad', precio: { rd: 7, por: 'unidad' } }),
  A('tomate', 'Tomate', 'tomate', 'vegetal', 'vegetal', [18, 0.9, 3.9, 0.2, 1.2], { nut: ['vitC', 'potasio'], unidad: { n: 'tomate', g: 120 }, compra: 'unidad', precio: { rd: 15, por: 'unidad' } }),
  A('lechuga', 'Lechuga', 'lechuga', 'vegetal', 'vegetal', [15, 1.4, 2.9, 0.2, 1.3], { nut: ['vitK', 'vitA'], unidad: { n: 'lechuga', g: 300 }, compra: 'unidad', precio: { rd: 60, por: 'unidad' } }),
  A('pepino', 'Pepino', 'pepino', 'vegetal', 'vegetal', [15, 0.7, 3.6, 0.1, 0.5], { unidad: { n: 'pepino', g: 200 }, compra: 'unidad', precio: { rd: 25, por: 'unidad' } }),
  A('aji', 'Ají (cubanela o morrón)', 'ají', 'vegetal', 'vegetal', [26, 1, 6, 0.3, 2.1], { nut: ['vitC', 'vitA'], unidad: { n: 'ají', g: 120 }, compra: 'unidad', precio: { rd: 15, por: 'unidad' } }),
  A('cebolla', 'Cebolla', 'cebolla', 'vegetal', 'vegetal', [40, 1.1, 9.3, 0.1, 1.7], { porcion: 40, unidad: { n: 'cebolla', g: 110 }, compra: 'unidad', precio: { rd: 12, por: 'unidad' } }),
  A('auyama', 'Auyama', 'auyama', 'vegetal', 'vegetal', [26, 1, 6.5, 0.1, 0.5], { nut: ['vitA'], precio: { rd: 29, por: 'lb' } }),
  A('vainitas', 'Vainitas', 'vainitas', 'vegetal', 'vegetal', [31, 1.8, 7, 0.2, 2.7], { nut: ['vitK', 'vitC', 'fibra'], precio: { rd: 70, por: 'lb' } }),
  A('molondron', 'Molondrones', 'molondrones', 'vegetal', 'vegetal', [22, 1.9, 4.5, 0.2, 2.5], { nut: ['fibra', 'vitK', 'vitC'], precio: { rd: 60, por: 'lb' } }),
  A('remolacha', 'Remolacha', 'remolacha', 'vegetal', 'vegetal', [44, 1.7, 10, 0.2, 2], { nut: ['fibra', 'potasio', 'vitB'], precio: { rd: 50, por: 'lb' } }),
  A('berenjena', 'Berenjena', 'berenjena', 'vegetal', 'vegetal', [25, 1, 6, 0.2, 3], { nut: ['fibra'], unidad: { n: 'berenjena', g: 250 }, compra: 'unidad', precio: { rd: 20, por: 'unidad' } }),
  A('tayota', 'Tayota', 'tayota', 'vegetal', 'vegetal', [19, 0.8, 4.5, 0.1, 1.7], { unidad: { n: 'tayota', g: 200 }, compra: 'unidad', precio: { rd: 20, por: 'unidad' } }),
  A('espinaca', 'Espinaca', 'espinaca', 'vegetal', 'vegetal', [23, 2.9, 3.6, 0.4, 2.2], { costo: 2, nut: ['vitK', 'vitA', 'hierro', 'magnesio', 'vitB'], precio: { rd: 100, por: 'lb' } }),
  A('brocoli', 'Brócoli', 'brócoli', 'vegetal', 'vegetal', [35, 2.4, 7, 0.4, 3.3], { costo: 2, nut: ['vitC', 'vitK', 'fibra', 'vitB'], ligeroPre: false, precio: { rd: 120, por: 'lb' } }),
  A('coliflor', 'Coliflor', 'coliflor', 'vegetal', 'vegetal', [25, 1.9, 5, 0.3, 2], { costo: 2, nut: ['vitC', 'vitK'], ligeroPre: false, precio: { rd: 120, por: 'lb' } }),
  // ---------- Frutas ----------
  A('guineo', 'Guineo maduro', 'guineo', 'fruta', 'vegetal', [89, 1.1, 22.8, 0.3, 2.6], { nut: ['potasio', 'vitB'], porcion: 120, unidad: { n: 'guineo', g: 120 }, compra: 'unidad', precio: { rd: 8, por: 'unidad' } }),
  A('lechosa', 'Lechosa', 'lechosa', 'fruta', 'vegetal', [43, 0.5, 10.8, 0.3, 1.7], { nut: ['vitC', 'vitA'], porcion: 150, medida: { n: 'taza', g: 145 }, precio: { rd: 32, por: 'lb' } }),
  A('mango', 'Mango', 'mango', 'fruta', 'vegetal', [60, 0.8, 15, 0.4, 1.6], { nut: ['vitC', 'vitA'], porcion: 150, unidad: { n: 'mango', g: 200 }, compra: 'unidad', precio: { rd: 25, por: 'unidad' } }),
  A('naranja', 'Naranja (china)', 'naranja', 'fruta', 'vegetal', [47, 0.9, 11.8, 0.1, 2.4], { nut: ['vitC'], porcion: 130, unidad: { n: 'naranja', g: 130 }, compra: 'unidad', precio: { rd: 15, por: 'unidad' } }),
  A('pina', 'Piña', 'piña', 'fruta', 'vegetal', [50, 0.5, 13, 0.1, 1.4], { nut: ['vitC'], porcion: 150, medida: { n: 'taza', g: 165 }, precio: { rd: 30, por: 'lb' } }),
  A('chinola', 'Chinola (pulpa)', 'chinola', 'fruta', 'vegetal', [97, 2.2, 23.4, 0.7, 10.4], { nut: ['vitC', 'fibra', 'vitA'], porcion: 60, unidad: { n: 'chinola', g: 30 }, compra: 'unidad', precio: { rd: 15, por: 'unidad' } }),
  A('guayaba', 'Guayaba', 'guayaba', 'fruta', 'vegetal', [68, 2.6, 14, 1, 5.4], { nut: ['vitC', 'fibra'], porcion: 100, unidad: { n: 'guayaba', g: 100 }, compra: 'unidad', precio: { rd: 10, por: 'unidad' } }),
  A('cereza', 'Cerezas (acerolas)', 'cerezas', 'fruta', 'vegetal', [32, 0.4, 7.7, 0.3, 1.1], { nut: ['vitC'], porcion: 120, medida: { n: 'taza', g: 100 }, precio: { rd: 60, por: 'lb' } }),
  A('sandia', 'Sandía (patilla)', 'sandía', 'fruta', 'vegetal', [30, 0.6, 7.6, 0.2, 0.4], { nut: ['vitA', 'vitC'], porcion: 200, medida: { n: 'taza', g: 150 }, precio: { rd: 20, por: 'lb' } }),
  A('manzana', 'Manzana', 'manzana', 'fruta', 'vegetal', [52, 0.3, 13.8, 0.2, 2.4], { costo: 2, nut: ['fibra'], porcion: 180, unidad: { n: 'manzana', g: 180 }, compra: 'unidad', precio: { rd: 35, por: 'unidad' } }),
  A('fresas', 'Fresas', 'fresas', 'fruta', 'vegetal', [32, 0.7, 7.7, 0.3, 2], { costo: 3, nut: ['vitC'], porcion: 150, medida: { n: 'taza', g: 150 }, precio: { rd: 250, por: 'lb' } }),
  // ---------- Grasas saludables ----------
  A('aceite', 'Aceite vegetal (soya, canola, maíz u oliva)', 'aceite', 'grasa', 'vegetal', [884, 0, 0, 100, 0], { nut: ['vitE'], porcion: 5, medida: { n: 'cucharadita', g: 5 }, compra: 'litro', precio: { rd: 167, por: 'litro' },
    nota: 'Mide el aceite con una cuchara al cocinar: es la forma más fácil de que el plan coincida con lo que comes.' }),
  A('aguacate', 'Aguacate', 'aguacate', 'grasa', 'vegetal', [120, 2.2, 7.8, 10, 5.6], { nut: ['potasio', 'vitE', 'vitK', 'fibra'], porcion: 70, medida: { n: 'tajada', g: 35 }, unidad: { n: 'aguacate', g: 400 }, compra: 'unidad', ligeroPre: false, precio: { rd: 56, por: 'unidad' } }),
  A('mani', 'Maní sin sal', 'maní', 'grasa', 'vegetal', [567, 25.8, 16, 49, 8.5], { nut: ['vitE', 'magnesio', 'vitB'], alerg: ['mani'], trazas: ['frutos_secos'], porcion: 15, rango: [10, 30], medida: { n: 'puñado', g: 25 }, ligeroPre: false, precio: { rd: 150, por: 'lb' } }),
  A('mantequilla_mani', 'Mantequilla de maní natural', 'mantequilla de maní', 'grasa', 'vegetal', [588, 25, 20, 50, 6], { costo: 2, nut: ['vitE', 'magnesio'], alerg: ['mani'], trazas: ['frutos_secos'], porcion: 16, rango: [10, 32], medida: { n: 'cucharada', g: 16 }, ligeroPre: false, precio: { rd: 300, por: 'lb' } }),
  A('almendras', 'Almendras', 'almendras', 'grasa', 'vegetal', [579, 21, 21.6, 49.9, 12.5], { costo: 3, nut: ['vitE', 'magnesio', 'fibra'], alerg: ['frutos_secos'], trazas: ['mani'], porcion: 15, rango: [10, 30], medida: { n: 'puñado', g: 25 }, ligeroPre: false, precio: { rd: 600, por: 'lb' } }),
  A('chia', 'Semillas de chía', 'chía', 'grasa', 'vegetal', [486, 16.5, 42, 30.7, 34.4], { costo: 3, nut: ['omega3', 'fibra', 'calcio'], trazas: ['frutos_secos', 'mani', 'sesamo'], porcion: 12, medida: { n: 'cucharada', g: 12 }, ligeroPre: false, precio: { rd: 400, por: 'lb' } }),
  A('linaza', 'Linaza molida', 'linaza', 'grasa', 'vegetal', [534, 18, 29, 42, 27], { costo: 2, nut: ['omega3', 'fibra'], trazas: ['frutos_secos', 'mani', 'sesamo'], porcion: 10, medida: { n: 'cucharada', g: 10 }, ligeroPre: false, precio: { rd: 250, por: 'lb' } }),
];

export const alimentoPorId = Object.fromEntries(ALIMENTOS.map(a => [a.id, a]));

// Porción por defecto cuando el alimento va en cantidad fija
const PORCION_CAT = { vegetal: 80, fruta: 120, grasa: 5, lacteo: 200, legumbre: 130, proteina: 120, carbohidrato: 120 };
export const porcionBase = a => a.porcion ?? PORCION_CAT[a.cat] ?? 100;

// ---------- Lista de compras ----------
export const CATEGORIAS_COMPRA = [
  { id: 'proteinas', etiqueta: 'Proteínas', icono: '🍗' },
  { id: 'carbohidratos', etiqueta: 'Arroz, pan y víveres', icono: '🍚' },
  { id: 'vegetales', etiqueta: 'Vegetales', icono: '🥬' },
  { id: 'frutas', etiqueta: 'Frutas', icono: '🍌' },
  { id: 'otros', etiqueta: 'Otros', icono: '🧺' },
];
export const categoriaCompra = a => ({ proteina: 'proteinas', legumbre: 'proteinas', carbohidrato: 'carbohidratos', vegetal: 'vegetales', fruta: 'frutas' })[a.cat] || 'otros';
export const PRECIOS_FECHA = 'precios de referencia aproximados en RD$ (2026, Pro Consumidor y Agricultura); anota los tuyos';

// ---------- Alergias, patrones y cultura ----------
export const ALERGENOS = [
  { id: 'gluten', etiqueta: 'Gluten (trigo, cebada, centeno)' },
  { id: 'lacteos', etiqueta: 'Leche y lácteos' },
  { id: 'huevo', etiqueta: 'Huevo' },
  { id: 'pescado', etiqueta: 'Pescado' },
  { id: 'mariscos', etiqueta: 'Mariscos' },
  { id: 'frutos_secos', etiqueta: 'Frutos secos (almendras, nueces…)' },
  { id: 'mani', etiqueta: 'Maní (cacahuate)' },
  { id: 'soya', etiqueta: 'Soya' },
  { id: 'sesamo', etiqueta: 'Sésamo (ajonjolí)' },
];

export const PATRONES = [
  { id: 'omnivoro', etiqueta: 'Como de todo' },
  { id: 'pescetariano', etiqueta: 'Sin carnes, sí pescado' },
  { id: 'vegetariano', etiqueta: 'Vegetariano (huevo y lácteos sí)' },
  { id: 'vegano', etiqueta: 'Vegano (nada de origen animal)' },
];
const PERMITIDOS = {
  omnivoro: null,
  pescetariano: ['pescado', 'marisco', 'huevo', 'lacteo', 'vegetal'],
  vegetariano: ['huevo', 'lacteo', 'vegetal'],
  vegano: ['vegetal'],
};
export const permitidoPorPatron = (a, patron) => !PERMITIDOS[patron] || PERMITIDOS[patron].includes(a.origen);

export const CULTURAS = [
  { id: 'caribe', etiqueta: 'Dominicana / caribeña' },
  { id: 'latina', etiqueta: 'Latinoamericana' },
  { id: 'general', etiqueta: 'Sin preferencia' },
];

// ---------- Comidas del día y horarios (horarios reales dominicanos) ----------
export const TIPOS_COMIDA = [
  { id: 'desayuno', etiqueta: 'Desayuno', icono: '🌅', hora: '07:00' },
  { id: 'media', etiqueta: 'Media mañana', icono: '🍎', hora: '10:00' },
  { id: 'almuerzo', etiqueta: 'Almuerzo', icono: '🍽️', hora: '12:30' },
  { id: 'merienda', etiqueta: 'Merienda', icono: '🥤', hora: '16:00' },
  { id: 'cena', etiqueta: 'Cena', icono: '🌙', hora: '19:30' },
];
export const tipoComida = id => TIPOS_COMIDA.find(t => t.id === id) || { id, etiqueta: 'Otra comida', icono: '🍴' };

export const COMIDAS_POR_DIA = {
  3: ['desayuno', 'almuerzo', 'cena'],
  4: ['desayuno', 'almuerzo', 'merienda', 'cena'],
  5: ['desayuno', 'media', 'almuerzo', 'merienda', 'cena'],
};
// Parte de la energía del día de cada comida: el almuerzo es la comida fuerte y la cena, ligera
export const REPARTO_COMIDAS = {
  3: { desayuno: 0.30, almuerzo: 0.45, cena: 0.25 },
  4: { desayuno: 0.25, almuerzo: 0.40, merienda: 0.10, cena: 0.25 },
  5: { desayuno: 0.25, media: 0.10, almuerzo: 0.35, merienda: 0.10, cena: 0.20 },
};

// Horarios según el tipo de jornada
export const PLANTILLAS_HORARIO = [
  { id: 'normal', etiqueta: 'Horario normal', horarios: { desayuno: '08:00', media: '10:00', almuerzo: '12:00', merienda: '15:30', cena: '19:30' } },
  { id: 'madrugo', etiqueta: 'Madrugo (entro a las 7)', horarios: { desayuno: '06:00', media: '09:30', almuerzo: '12:30', merienda: '15:30', cena: '19:00' } },
  { id: 'almuerzo_tarde', etiqueta: 'Almuerzo tarde en casa', horarios: { desayuno: '06:00', media: '10:00', almuerzo: '15:30', merienda: '17:30', cena: '20:00' } },
  { id: 'noche', etiqueta: 'Trabajo de noche', horarios: { desayuno: '18:00', media: '21:00', almuerzo: '23:30', merienda: '03:00', cena: '07:00' } },
];

// ---------- Platos base: cocina dominicana en versión saludable ----------
// Cada plato tiene "huecos" (slots). El generador elige un alimento por hueco según preferencias,
// alergias, presupuesto y variedad, y ajusta las porciones a lo que necesita cada persona.
// rol: proteina (porción según proteína) · ajusta (porción según energía) · fijo (porción habitual)
// n: alimentos distintos del hueco · g: gramos fijos en este plato · opcional: puede faltar
// cultura: 'caribe' sale primero a quien elige cocina dominicana; 'latina' / 'general' para el resto
// bajo: plato apto para presupuesto bajo · nota: consejo de preparación
const PROTEINAS_GUISO = ['pollo_guisado', 'muslo_pollo', 'pollo', 'res', 'cerdo', 'chivo', 'pescado', 'higado_pollo', 'tofu'];
const FRUTAS = ['guineo', 'lechosa', 'mango', 'naranja', 'pina', 'guayaba', 'cereza', 'sandia', 'chinola', 'manzana', 'fresas'];
const ENSALADA = ['repollo', 'zanahoria', 'tomate', 'lechuga', 'pepino', 'remolacha', 'aji'];
const VIVERES = ['guineo_verde', 'yuca', 'batata', 'yautia', 'name', 'platano_verde'];
const SAL = 'Sal: una pizca; sin cubito o con medio cubito. Sazona con ajo, cebolla, ají, cilantro y orégano.';

export const PLATOS = [
  // ===== Desayunos =====
  { id: 'des_mangu_huevo', tipos: ['desayuno'], cultura: 'caribe', bajo: true, nombre: 'Mangú con {proteina} y cebolla roja', nota: 'Maja el plátano con un poco del agua de hervir en vez de mantequilla.', slots: [
    { rol: 'ajusta', op: ['platano_verde'] },
    { rol: 'proteina', op: ['huevo'] },
    { rol: 'fijo', cat: 'vegetal', op: ['cebolla'] },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'] },
    { rol: 'proteina', op: ['leche'], opcional: true, sufijo: ' + vaso de {extra}' },
  ] },
  { id: 'des_mangu_queso', tipos: ['desayuno'], cultura: 'caribe', nombre: 'Mangú con {proteina} a la plancha y {grasa}', nota: 'El queso a la plancha, no frito.', slots: [
    { rol: 'ajusta', op: ['platano_verde'] },
    { rol: 'proteina', op: ['queso_fresco'] },
    { rol: 'fijo', cat: 'grasa', op: ['aguacate'], g: 35 },
    { rol: 'fijo', cat: 'vegetal', op: ['cebolla'], g: 30 },
    { rol: 'proteina', op: ['huevo', 'leche'], opcional: true, sufijo: ' + {extra}' },
  ] },
  { id: 'des_guineitos', tipos: ['desayuno'], cultura: 'caribe', bajo: true, nombre: 'Guineítos hervidos con {proteina} revuelto con tomate', slots: [
    { rol: 'ajusta', op: ['guineo_verde'] },
    { rol: 'proteina', op: ['huevo'] },
    { rol: 'fijo', cat: 'vegetal', op: ['tomate'], g: 60 },
    { rol: 'fijo', cat: 'cebolla', op: ['cebolla'], g: 30 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'] },
  ] },
  { id: 'des_viveres', tipos: ['desayuno', 'cena'], cultura: 'caribe', bajo: true, nombre: 'Víveres hervidos ({ajusta}) con {proteina} y {grasa}', slots: [
    { rol: 'ajusta', op: VIVERES },
    { rol: 'proteina', op: ['huevo', 'queso_fresco', 'salami', 'arenque'] },
    { rol: 'fijo', cat: 'grasa', op: ['aguacate'], g: 35 },
    { rol: 'fijo', cat: 'cebolla', op: ['cebolla'], g: 30 },
  ] },
  { id: 'des_avena', tipos: ['desayuno'], bajo: true, nombre: 'Avena caliente con canela, {lacteo} y {fruta}, sin azúcar', nota: 'Endulza con la fruta madura en vez de azúcar.', slots: [
    { rol: 'ajusta', op: ['avena'] },
    { rol: 'fijo', cat: 'lacteo', op: ['leche', 'bebida_soya'], g: 200 },
    { rol: 'fijo', cat: 'fruta', op: ['guineo', 'lechosa', 'mango'], g: 80 },
    { rol: 'fijo', cat: 'grasa', op: ['mani', 'chia', 'linaza'], g: 10, opcional: true },
    { rol: 'proteina', op: ['huevo', 'yogur_griego'], opcional: true, sufijo: ' + {extra}' },
  ] },
  { id: 'des_pan_huevo', tipos: ['desayuno'], cultura: 'caribe', bajo: true, nombre: '{ajusta} con {proteina} y tomate + café con leche', slots: [
    { rol: 'ajusta', op: ['pan_agua', 'casabe', 'pan_integral'] },
    { rol: 'proteina', op: ['huevo', 'queso_fresco', 'sardinas', 'salami'] },
    { rol: 'fijo', cat: 'vegetal', op: ['tomate'], g: 50 },
    { rol: 'fijo', cat: 'lacteo', op: ['leche'], g: 100 },
  ] },
  { id: 'des_harina', tipos: ['desayuno'], cultura: 'caribe', bajo: true, nombre: 'Harina de maíz con leche y {fruta}', slots: [
    { rol: 'ajusta', op: ['harina_maiz'] },
    { rol: 'fijo', cat: 'lacteo', op: ['leche'], g: 150 },
    { rol: 'fijo', cat: 'fruta', op: FRUTAS, g: 120 },
    { rol: 'proteina', op: ['huevo'], opcional: true, sufijo: ' + {extra} hervido' },
  ] },
  { id: 'des_casabe', tipos: ['desayuno', 'merienda'], cultura: 'caribe', nombre: 'Casabe con {proteina}, {grasa} y {fruta}', slots: [
    { rol: 'ajusta', op: ['casabe'] },
    { rol: 'proteina', op: ['queso_fresco', 'huevo'] },
    { rol: 'fijo', cat: 'grasa', op: ['aguacate'], g: 35 },
    { rol: 'fijo', cat: 'fruta', op: ['lechosa', 'pina', 'mango', 'guineo'], g: 150 },
  ] },
  { id: 'des_yogur', tipos: ['desayuno'], cultura: 'general', nombre: '{proteina} con {fruta}, {ajusta} y {grasa}', slots: [
    { rol: 'proteina', op: ['yogur_griego', 'cottage', 'yogur'] },
    { rol: 'fijo', cat: 'fruta', op: FRUTAS },
    { rol: 'ajusta', op: ['avena'] },
    { rol: 'fijo', cat: 'grasa', op: ['chia', 'linaza', 'almendras', 'mani'] },
  ] },
  { id: 'des_tostadas', tipos: ['desayuno'], cultura: 'latina', nombre: '{ajusta} con {grasa}, tomate y {proteina}', slots: [
    { rol: 'ajusta', op: ['pan_integral', 'tortilla_maiz'] },
    { rol: 'fijo', cat: 'grasa', op: ['aguacate'], g: 35 },
    { rol: 'fijo', cat: 'salsa', op: ['tomate'], g: 60 },
    { rol: 'proteina', op: ['huevo', 'atun', 'queso_fresco', 'tofu', 'cottage'] },
  ] },

  // ===== Media mañana y merienda =====
  { id: 'sn_fruta', tipos: ['media', 'merienda'], bajo: true, nombre: '{fruta} con {proteina} y {grasa}', slots: [
    { rol: 'fijo', cat: 'fruta', op: FRUTAS, g: 150 },
    { rol: 'proteina', op: ['yogur', 'yogur_griego', 'queso_fresco', 'leche', 'cottage'] },
    { rol: 'fijo', cat: 'grasa', op: ['mani'], g: 10, opcional: true },
  ] },
  { id: 'sn_huevo', tipos: ['media', 'merienda'], bajo: true, nombre: '{proteina} hervido con {fruta}', slots: [
    { rol: 'proteina', op: ['huevo'] },
    { rol: 'fijo', cat: 'fruta', op: FRUTAS },
  ] },
  { id: 'sn_batida', tipos: ['media', 'merienda'], bajo: true, nombre: 'Batida de {fruta} con {lacteo}, sin azúcar', slots: [
    { rol: 'fijo', cat: 'lacteo', op: ['leche', 'bebida_soya'], g: 200 },
    { rol: 'fijo', cat: 'fruta', op: ['lechosa', 'guineo', 'mango', 'pina', 'fresas'], g: 100 },
    { rol: 'proteina', op: ['yogur_griego'], opcional: true, sufijo: ' + {extra}' },
  ] },
  { id: 'sn_mazorca', tipos: ['media', 'merienda'], cultura: 'caribe', bajo: true, nombre: '{ajusta} hervida con {proteina}', slots: [
    { rol: 'ajusta', op: ['mazorca'] },
    { rol: 'proteina', op: ['queso_fresco', 'huevo'] },
  ] },
  { id: 'sn_pan', tipos: ['media', 'merienda'], cultura: 'caribe', bajo: true, nombre: '{ajusta} con {proteina} y {vegetal}', slots: [
    { rol: 'ajusta', op: ['pan_agua', 'casabe'] },
    { rol: 'proteina', op: ['queso_fresco', 'huevo', 'atun', 'sardinas'] },
    { rol: 'fijo', cat: 'vegetal', op: ['tomate', 'lechuga'], g: 40 },
  ] },

  // ===== Almuerzos (la comida fuerte) =====
  { id: 'alm_bandera', tipos: ['almuerzo'], cultura: 'caribe', bajo: true, nombre: 'La bandera: {ajusta}, {legumbre} y {proteina}, con ensalada de {vegetal}', nota: `Una taza de arroz y la mitad del plato de ensalada. ${SAL}`, slots: [
    { rol: 'ajusta', op: ['arroz', 'arroz_integral'] },
    { rol: 'fijo', cat: 'legumbre', op: ['habichuelas_rojas', 'habichuelas_negras', 'gandules'], g: 130 },
    { rol: 'proteina', op: PROTEINAS_GUISO },
    { rol: 'fijo', cat: 'vegetal', op: ENSALADA, n: 2, g: 70 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 10 },
  ] },
  { id: 'alm_bandera_huevo', tipos: ['almuerzo'], cultura: 'caribe', bajo: true, nombre: '{ajusta} con {legumbre} y {proteina}, con ensalada de {vegetal}', nota: SAL, slots: [
    { rol: 'ajusta', op: ['arroz'] },
    { rol: 'fijo', cat: 'legumbre', op: ['habichuelas_rojas', 'habichuelas_negras'], g: 170 },
    { rol: 'proteina', op: ['huevo'] },
    { rol: 'fijo', cat: 'vegetal', op: ['repollo', 'zanahoria', 'tomate', 'pepino'], n: 2, g: 60 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 8 },
  ] },
  { id: 'alm_moro', tipos: ['almuerzo'], cultura: 'caribe', nombre: 'Moro de {legumbre} con {proteina} guisado y ensalada de {vegetal}', nota: SAL, slots: [
    { rol: 'ajusta', op: ['arroz'] },
    { rol: 'fijo', cat: 'legumbre', op: ['gandules', 'habichuelas_negras', 'habichuelas_rojas', 'lentejas'], g: 100 },
    { rol: 'proteina', op: ['pescado', 'pollo_guisado', 'pollo', 'res', 'cerdo', 'chivo'] },
    { rol: 'fijo', cat: 'vegetal', op: ENSALADA, n: 2, g: 70 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 10 },
  ] },
  { id: 'alm_locrio', tipos: ['almuerzo'], cultura: 'caribe', bajo: true, nombre: 'Locrio de {proteina} con {vegetal}', nota: SAL, slots: [
    { rol: 'ajusta', op: ['arroz'] },
    { rol: 'proteina', op: ['pollo_guisado', 'muslo_pollo', 'sardinas', 'salami'] },
    { rol: 'fijo', cat: 'vegetal', op: ['aji', 'zanahoria', 'vainitas'], n: 2, g: 50 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 8 },
  ] },
  { id: 'alm_legumbres', tipos: ['almuerzo'], cultura: 'caribe', bajo: true, nombre: '{proteina} guisadas con auyama, poco {ajusta} y ensalada de {vegetal}', nota: 'Más legumbre y menos arroz: llena más y aporta proteína y fibra.', slots: [
    { rol: 'proteina', op: ['lentejas', 'habichuelas_rojas', 'habichuelas_negras', 'gandules', 'garbanzos'] },
    { rol: 'fijo', cat: 'auyama', op: ['auyama'], g: 80 },
    { rol: 'ajusta', op: ['arroz', 'arroz_integral'] },
    { rol: 'fijo', cat: 'vegetal', op: ENSALADA, g: 100 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 5 },
  ] },
  { id: 'alm_sardinas', tipos: ['almuerzo', 'cena'], cultura: 'caribe', bajo: true, nombre: '{ajusta} con {proteina} guisadas en tomate y cebolla', slots: [
    { rol: 'ajusta', op: ['guineo_verde', 'yuca', 'batata', 'platano_verde'] },
    { rol: 'proteina', op: ['sardinas', 'atun', 'arenque', 'bacalao', 'huevo'] },
    { rol: 'fijo', cat: 'salsa', op: ['tomate', 'cebolla', 'aji'], n: 2, g: 50 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 5 },
  ] },
  { id: 'alm_espagueti', tipos: ['almuerzo'], cultura: 'caribe', bajo: true, nombre: 'Espaguetis con {proteina} y {vegetal} en salsa de tomate', nota: 'Sin salami ni leche evaporada en la salsa: con pollo o atún queda igual de rico.', slots: [
    { rol: 'ajusta', op: ['espagueti', 'pasta_integral'] },
    { rol: 'proteina', op: ['pollo_guisado', 'atun', 'pollo', 'res_molida'] },
    { rol: 'fijo', cat: 'salsa', op: ['tomate'], g: 100 },
    { rol: 'fijo', cat: 'vegetal', op: ['aji', 'cebolla', 'espinaca', 'berenjena'], g: 60 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 5 },
  ] },
  { id: 'alm_higado', tipos: ['almuerzo'], cultura: 'caribe', bajo: true, nombre: '{proteina} encebollado con {ajusta} y ensalada de {vegetal}', nota: 'Barato y con mucho hierro.', slots: [
    { rol: 'proteina', op: ['higado_pollo'] },
    { rol: 'fijo', cat: 'cebolla', op: ['cebolla'], g: 60 },
    { rol: 'ajusta', op: ['batata', 'yuca', 'guineo_verde'] },
    { rol: 'fijo', cat: 'vegetal', op: ENSALADA, n: 2, g: 60 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 5 },
  ] },
  { id: 'alm_sancocho', tipos: ['almuerzo'], cultura: 'caribe', bajo: true, nombre: 'Sancocho de {proteina} con {ajusta}, {vegetal}', nota: 'Si lo acompañas con arroz, que sea ¼ de taza; la sopa ya trae víveres.', slots: [
    { rol: 'proteina', op: ['pollo_guisado', 'muslo_pollo', 'res'] },
    { rol: 'ajusta', op: ['yuca', 'platano_verde', 'yautia', 'name', 'mazorca'] },
    { rol: 'fijo', cat: 'vegetal', op: ['auyama', 'zanahoria'], n: 2, g: 60 },
    { rol: 'fijo', cat: 'cebolla', op: ['cebolla'], g: 30 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 5 },
  ] },
  { id: 'alm_picadillo', tipos: ['almuerzo'], cultura: 'caribe', nombre: '{proteina} guisada con {ajusta} y ensalada de {vegetal}', nota: SAL, slots: [
    { rol: 'proteina', op: ['res_molida', 'res'] },
    { rol: 'ajusta', op: ['papa', 'arroz'] },
    { rol: 'fijo', cat: 'vegetal', op: ENSALADA, n: 2, g: 70 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 7 },
  ] },
  { id: 'alm_pescado', tipos: ['almuerzo'], cultura: 'caribe', nombre: 'Pescado a la criolla con {ajusta} y ensalada de {vegetal}', nota: 'Los tostones al horno o en freidora de aire, con una cucharadita de aceite.', slots: [
    { rol: 'proteina', op: ['pescado'] },
    { rol: 'ajusta', op: ['platano_verde', 'yuca', 'arroz'] },
    { rol: 'fijo', cat: 'vegetal', op: ENSALADA, n: 2, g: 75 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 5 },
  ] },
  { id: 'alm_plancha', tipos: ['almuerzo', 'cena'], cultura: 'general', nombre: '{proteina} a la plancha con {ajusta} y vegetales salteados ({vegetal})', slots: [
    { rol: 'proteina', op: ['pollo', 'pescado', 'res', 'cerdo', 'pavo', 'salmon', 'camarones', 'tofu'] },
    { rol: 'ajusta', op: ['arroz_integral', 'papa', 'batata', 'yuca', 'quinoa', 'platano_maduro'] },
    { rol: 'fijo', cat: 'vegetal', op: ['brocoli', 'zanahoria', 'vainitas', 'aji', 'berenjena', 'coliflor', 'tayota', 'auyama', 'espinaca', 'molondron'], n: 2 },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 7 },
  ] },
  { id: 'ensalada', tipos: ['almuerzo', 'cena'], cultura: 'general', nombre: 'Ensalada completa de {proteina} con {ajusta} y {grasa} ({vegetal})', slots: [
    { rol: 'proteina', op: ['atun', 'pollo', 'huevo', 'garbanzos', 'sardinas', 'salmon', 'tofu'] },
    { rol: 'fijo', cat: 'vegetal', op: ENSALADA, n: 3, g: 60 },
    { rol: 'ajusta', op: ['papa', 'batata', 'arroz_integral', 'quinoa'] },
    { rol: 'fijo', cat: 'grasa', op: ['aguacate', 'aceite'] },
  ] },

  // ===== Cenas (ligeras) =====
  { id: 'cen_crema', tipos: ['cena'], cultura: 'caribe', bajo: true, nombre: 'Crema de {vegetal} con {proteina} y {ajusta}', slots: [
    { rol: 'fijo', cat: 'vegetal', op: ['auyama', 'zanahoria', 'brocoli', 'remolacha'], g: 250 },
    { rol: 'proteina', op: ['pollo_guisado', 'pollo', 'huevo', 'pescado', 'tofu'] },
    { rol: 'ajusta', op: ['casabe', 'pan_agua'] },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 5 },
  ] },
  { id: 'cen_tortilla', tipos: ['cena'], bajo: true, nombre: 'Tortilla de {proteina} con {vegetal}, con {ajusta}', slots: [
    { rol: 'proteina', op: ['huevo'] },
    { rol: 'fijo', cat: 'vegetal', op: ['berenjena', 'aji', 'cebolla', 'espinaca', 'tomate'], n: 2, g: 60 },
    { rol: 'ajusta', op: ['pan_agua', 'casabe', 'batata', 'pan_integral'] },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 5 },
    { rol: 'proteina', op: ['queso_fresco'], opcional: true, sufijo: ' y un poco de {extra}' },
  ] },
  { id: 'cen_pan', tipos: ['cena'], cultura: 'caribe', bajo: true, nombre: '{ajusta} con {proteina}, {vegetal}', slots: [
    { rol: 'ajusta', op: ['pan_agua', 'casabe'] },
    { rol: 'proteina', op: ['sardinas', 'atun', 'huevo', 'pollo_guisado'] },
    { rol: 'fijo', cat: 'vegetal', op: ['tomate', 'lechuga', 'pepino'], n: 2, g: 40 },
  ] },
  { id: 'cen_guisados', tipos: ['cena'], cultura: 'caribe', bajo: true, nombre: 'Guiso de {vegetal} con {proteina} y {ajusta}', slots: [
    { rol: 'fijo', cat: 'vegetal', op: ['berenjena', 'molondron', 'tayota', 'vainitas'], g: 150 },
    { rol: 'proteina', op: ['huevo', 'pollo_guisado', 'sardinas'] },
    { rol: 'ajusta', op: ['yuca', 'guineo_verde', 'batata'] },
    { rol: 'fijo', cat: 'grasa', op: ['aceite'], g: 5 },
  ] },
  { id: 'cen_tortillas', tipos: ['cena'], cultura: 'latina', nombre: 'Tortillas de maíz rellenas de {proteina} con {grasa} y vegetales ({vegetal})', slots: [
    { rol: 'ajusta', op: ['tortilla_maiz'] },
    { rol: 'proteina', op: ['pollo', 'pavo', 'res', 'habichuelas_negras', 'tofu', 'atun', 'huevo'] },
    { rol: 'fijo', cat: 'vegetal', op: ['lechuga', 'tomate', 'aji', 'cebolla', 'repollo', 'zanahoria'], n: 2, g: 50 },
    { rol: 'fijo', cat: 'grasa', op: ['aguacate'], g: 35 },
  ] },
];

export const platoPorId = Object.fromEntries(PLATOS.map(p => [p.id, p]));

// Opciones ligeras para antes de entrenar (se filtran por alergias y preferencias)
export const ANTES_DE_ENTRENAR = [
  { texto: 'Un guineo maduro', alimentos: ['guineo'], minutos: 30 },
  { texto: 'Una fruta fácil de digerir (lechosa, piña, mango)', alimentos: ['lechosa'], minutos: 30 },
  { texto: 'Yogur con un poco de fruta', alimentos: ['yogur', 'guineo'], minutos: 60 },
  { texto: 'Un pedazo de casabe o ½ pan de agua con un poco de queso', alimentos: ['casabe', 'queso_fresco'], minutos: 60 },
  { texto: 'Un vaso pequeño de leche con un guineo', alimentos: ['leche', 'guineo'], minutos: 60 },
  { texto: 'Avena pequeña con fruta (½ taza o menos)', alimentos: ['avena', 'guineo'], minutos: 90 },
  { texto: 'Un guineíto o una batata pequeña hervida', alimentos: ['batata'], minutos: 90 },
];

// Nombre corto de cada plato (para elegir "Platos que NO quieres" en Preferencias)
export const NOMBRES_PLATO = {
  des_mangu_huevo: 'Mangú con huevo', des_mangu_queso: 'Mangú con queso y aguacate', des_guineitos: 'Guineítos con huevo', des_viveres: 'Víveres hervidos con huevo o queso',
  des_avena: 'Avena caliente', des_pan_huevo: 'Pan con huevo o queso', des_harina: 'Harina de maíz', des_casabe: 'Casabe con queso y aguacate', des_yogur: 'Yogur con fruta y avena',
  des_tostadas: 'Tostadas con aguacate', sn_fruta: 'Fruta con yogur o queso', sn_huevo: 'Huevo hervido con fruta', sn_batida: 'Batida de fruta', sn_mazorca: 'Mazorca con queso',
  sn_pan: 'Pan o casabe con queso, huevo o atún', alm_bandera: 'La bandera', alm_bandera_huevo: 'Arroz con habichuelas y huevo', alm_moro: 'Moro con carne guisada',
  alm_locrio: 'Locrio', alm_legumbres: 'Habichuelas o lentejas guisadas', alm_sardinas: 'Víveres con sardinas o atún guisado', alm_espagueti: 'Espaguetis',
  alm_higado: 'Hígado encebollado', alm_sancocho: 'Sancocho', alm_picadillo: 'Picadillo o res guisada', alm_pescado: 'Pescado a la criolla',
  alm_plancha: 'Carne o pescado a la plancha', ensalada: 'Ensalada completa', cen_crema: 'Crema o sopa de vegetales', cen_tortilla: 'Tortilla de huevo',
  cen_pan: 'Pan con sardinas, atún o huevo', cen_guisados: 'Guiso de vegetales', cen_tortillas: 'Tortillas de maíz rellenas',
};
