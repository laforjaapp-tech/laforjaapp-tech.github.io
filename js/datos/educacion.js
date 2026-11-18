// FASE 4: 🎓 APRENDE A COMER — qué, cuándo y cuánto.
// Lecciones cortas, consejo del día y mensajes de ánimo. Sin culpa ni vergüenza: nada está prohibido,
// todo tiene su cantidad y su momento.

export const LECCIONES = [
  { id: 'plato', icono: '🍽️', titulo: 'El plato saludable (QUÉ)', puntos: [
    'Mitad del plato: vegetales y ensalada (repollo, tomate, pepino, zanahoria, auyama, vainitas…).',
    'Un cuarto: proteína (pollo, pescado, huevo, carne magra, habichuelas, queso).',
    'Un cuarto: arroz, víveres, pan o pasta.',
    'Un poco de grasa buena: aguacate o el aceite medido con cuchara.',
    'Para beber: agua. El refresco y el jugo, de vez en cuando.',
  ], cierre: 'No hace falta cambiar tu comida: es la misma comida dominicana, servida en otra proporción.' },
  { id: 'manos', icono: '✋', titulo: 'Las porciones con tu mano (CUÁNTO)', puntos: [
    'Proteína: la palma de tu mano (grosor y tamaño) en cada comida principal.',
    'Arroz, víveres o pan: tu puño cerrado.',
    'Vegetales: dos puños o más.',
    'Grasas (aguacate, maní, aceite): tu dedo pulgar.',
    'Fruta: una pieza mediana o lo que cabe en tu mano ahuecada.',
  ], cierre: 'Tu mano crece con tu cuerpo: por eso sirve de medida personal, sin balanza.' },
  { id: 'cuando', icono: '⏰', titulo: 'Cuándo comer (CUÁNDO)', puntos: [
    'Desayuna: llegar con mucha hambre al almuerzo hace que se coma de más.',
    'No pases más de 4–5 horas sin comer durante el día: una merienda con proteína ayuda.',
    'Reparte la proteína en tus comidas en vez de concentrarla en una sola.',
    'Cena 2–3 horas antes de dormir y más ligera que el almuerzo.',
    'Antes de entrenar, algo ligero si falta poco; después, tu siguiente comida normal con proteína.',
  ], cierre: 'Comer a horas parecidas cada día ordena el hambre y la energía.' },
  { id: 'hambre', icono: '🧠', titulo: 'Hambre y llenura', puntos: [
    'Antes de servirte, pregúntate: ¿tengo hambre de verdad o es aburrimiento, cansancio o ansiedad?',
    'Come despacio: el cuerpo tarda unos 20 minutos en avisar que ya está lleno.',
    'Para cuando estés satisfecho, no "a reventar": una referencia es quedar al 80 %.',
    'Sirve una vez en un plato normal; evita comer de la olla o del paquete.',
    'Come sentado y sin pantallas cuando puedas: así notas mejor la llenura.',
  ], cierre: 'Escuchar tu hambre se aprende con práctica, como un ejercicio.' },
  { id: 'calle', icono: '🎉', titulo: 'Comer fuera, fiestas y antojos', puntos: [
    'Nada está prohibido. La regla 80/20: si el 80 % de lo que comes va bien, el 20 % restante tiene espacio.',
    'En la calle: elige lo hervido, guisado o a la plancha antes que lo frito.',
    'Pide la ensalada y agua; comparte las frituras o los postres.',
    'Si comiste de más, no te castigues ni te saltes la siguiente comida: vuelve a tu plan en la próxima.',
    'Anótalo en tu libreta: la app ajusta lo que queda del día.',
  ], cierre: 'Lo que cambia tu cuerpo es lo que haces la mayoría de los días, no un día.' },
  { id: 'bebidas', icono: '🥤', titulo: 'Las bebidas también cuentan', puntos: [
    'Una lata de refresco tiene unas 9–10 cucharaditas de azúcar; un vaso de jugo, 5–6.',
    'El agua es la mejor bebida. Agua fría con limón o chinola sin azúcar es un buen cambio.',
    'Café: hasta unas 3–4 tazas (o unas 5 tacitas) al día en adultos sanos; menos con presión alta o embarazo.',
    'Ve bajando el azúcar del café poco a poco: el gusto se acostumbra en unas semanas.',
    'El alcohol suma calorías y empeora el sueño: menos y nunca la noche antes de entrenar.',
  ], cierre: 'Cambiar las bebidas es de lo más fácil y de lo que más ayuda.' },
  { id: 'compras', icono: '🛒', titulo: 'Comprar y preparar', puntos: [
    'Compra con lista (la app la arma con tu menú): evita comprar con hambre.',
    'Cocina de más el domingo (habichuelas, pollo guisado, víveres) y guarda porciones.',
    'Ten a mano opciones rápidas: huevos hervidos, guineos, sardinas, avena, frutas.',
    'Mide el aceite con una cuchara: es la grasa escondida de la comida casera.',
    'Usa ajo, cebolla, ají, orégano, cilantro y limón; menos sopitas y cubitos (mucha sal).',
  ], cierre: 'Lo que tienes a mano es lo que terminas comiendo.' },
  { id: 'etiquetas', icono: '🏷️', titulo: 'Leer etiquetas', puntos: [
    'Mira la porción: muchas bolsas traen 2 o 3 porciones.',
    'Azúcar: si es de los primeros ingredientes, es un producto dulce.',
    'Sodio: más de 600 mg por porción es mucho.',
    'Pocos ingredientes y que los reconozcas suele ser buena señal.',
  ], cierre: 'No hace falta memorizar números: con mirar estas cuatro cosas basta.' },
];

// Un consejo distinto cada día (se elige por la fecha)
export const CONSEJOS_DIA = [
  '💧 Empieza el día con un vaso de agua antes del café.',
  '🥗 Hoy, que la mitad de tu plato del almuerzo sea ensalada o vegetales.',
  '🍳 Desayuno con proteína (huevo, queso, leche o yogur): llegas con menos hambre al almuerzo.',
  '🍚 Sirve el arroz con una taza medidora una vez: te sorprenderá cuánto es una porción.',
  '🍌 Ten fruta a la vista en la mesa: se come lo que se ve.',
  '☕ Prueba hoy tu café con media cucharadita menos de azúcar.',
  '🥤 Cambia un refresco de hoy por agua fría con limón.',
  '🐟 Las sardinas son baratas, tienen proteína, omega-3 y calcio.',
  '🫘 Las habichuelas son proteína y fibra: no son solo "acompañante".',
  '🍠 Víveres hervidos en vez de fritos: misma comida, mucha menos grasa.',
  '🕗 Cena al menos 2 horas antes de dormir: duermes mejor.',
  '🍽️ Come despacio hoy: deja el tenedor entre bocado y bocado.',
  '🥄 Mide el aceite con cuchara al cocinar.',
  '🧂 Menos sopita o cubito: usa ajo, cebolla, ají y orégano para dar sabor.',
  '🥚 Un huevo hervido es una merienda práctica con proteína.',
  '🛒 Haz tu lista antes de ir al colmado o al súper.',
  '📒 Anota hoy todo lo que comes: conocerte es el primer paso.',
  '🍉 La fruta entera llena más que el jugo.',
  '😴 Dormir bien reduce el hambre del día siguiente.',
  '🏋️ Después de entrenar, tu siguiente comida con proteína: no hace falta correr.',
  '🎉 ¿Hay fiesta? Disfruta, elige lo que más te gusta y sirve una vez.',
  '🧊 Lleva una botella de agua contigo: así es más fácil llegar a tu meta.',
  '🥬 Agrega un vegetal más a tu cena de hoy.',
  '🍞 Pan de agua con huevo y tomate es un desayuno rápido y completo.',
  '🧠 Antes de picar algo, pregúntate si es hambre o aburrimiento.',
  '🫒 Grasas buenas en pequeña cantidad: aguacate, maní, aceite medido.',
  '🌅 No te saltes el desayuno si después llegas con mucha hambre.',
  '📏 La palma de tu mano es tu porción de proteína.',
  '🍲 Cocina de más y guarda porciones para mañana.',
  '💪 Lo que haces la mayoría de los días es lo que cambia tu cuerpo.',
];
export function consejoDelDia(fecha) {
  const n = Math.floor(new Date(fecha + 'T12:00:00').getTime() / 864e5);
  return CONSEJOS_DIA[((n % CONSEJOS_DIA.length) + CONSEJOS_DIA.length) % CONSEJOS_DIA.length];
}

// Mensajes de ánimo según cómo va el día (nunca de culpa)
export const ANIMO = {
  agua: '💧 ¡Llegaste a tu meta de agua de hoy!',
  frutas: '🍎 ¡Ya comiste tus frutas de hoy!',
  comidas: '📒 ¡Anotaste todas tus comidas de hoy! Conocerte es la mitad del camino.',
  cafeOk: '☕ Tu café de hoy está dentro de lo recomendado.',
  racha: n => `🔥 ¡${n} días seguidos anotando tu comida!`,
  volver: 'Ayer no salió como querías: no pasa nada. Hoy es un buen día para retomar.',
};
