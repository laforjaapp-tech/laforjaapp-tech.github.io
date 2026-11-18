// FASE 4: fichas educativas de nutrientes, suplementos y "¿Por qué?".
// Información general: no sustituye la consulta con un profesional ni sirve para tratar deficiencias.

export const NUTRIENTES = [
  { id: 'proteina', nombre: 'Proteína', icono: '💪',
    funcion: 'Repara y construye músculo, y forma enzimas, hormonas y defensas. Con más de 40 años ayuda especialmente a conservar el músculo mientras se pierde grasa.',
    fuentes: 'Pollo, pescado, huevo, carnes magras, lácteos, habichuelas, lentejas, garbanzos y tofu.' },
  { id: 'fibra', nombre: 'Fibra', icono: '🌾',
    funcion: 'Da saciedad, ayuda al tránsito intestinal y alimenta a las bacterias buenas del intestino.',
    fuentes: 'Vegetales, frutas con cáscara, avena, arroz integral, habichuelas, lentejas y semillas de chía o linaza.' },
  { id: 'vitA', nombre: 'Vitamina A', icono: '🥕',
    funcion: 'Participa en la visión, la piel y las defensas.',
    fuentes: 'Zanahoria, auyama, batata, mango, lechosa, espinaca, huevo y lácteos.' },
  { id: 'vitB', nombre: 'Vitaminas del grupo B', icono: '⚡',
    funcion: 'Ayudan a obtener energía de los alimentos y al funcionamiento del sistema nervioso. La B12 solo está de forma natural en alimentos de origen animal.',
    fuentes: 'Carnes, pescado, huevo, lácteos, legumbres, cereales integrales y guineo.',
    extra: 'Si no comes nada de origen animal, la vitamina B12 debe venir de alimentos fortificados o de un suplemento: consúltalo con un profesional.' },
  { id: 'vitC', nombre: 'Vitamina C', icono: '🍊',
    funcion: 'Participa en las defensas, en la formación de colágeno (piel, tendones) y ayuda a absorber el hierro de los vegetales.',
    fuentes: 'Guayaba, naranja, lechosa, piña, mango, fresas, ají morrón, brócoli y tomate.' },
  { id: 'vitD', nombre: 'Vitamina D', icono: '☀️',
    funcion: 'Ayuda a absorber el calcio y participa en la salud de huesos y músculos.',
    fuentes: 'Pescados grasos (salmón, sardinas), huevo y leche fortificada.',
    extra: 'Exposición solar segura: unos minutos de sol en brazos y piernas, evitando las horas de sol más fuerte y sin llegar a quemarte. Lo que cada persona necesita varía según su piel, la edad y dónde vive; si te preocupa, consúltalo con tu médico.' },
  { id: 'vitE', nombre: 'Vitamina E', icono: '🥑',
    funcion: 'Actúa como antioxidante y protege las células.',
    fuentes: 'Almendras, maní, aguacate, semillas y aceites vegetales.' },
  { id: 'vitK', nombre: 'Vitamina K', icono: '🥬',
    funcion: 'Necesaria para la coagulación de la sangre y la salud de los huesos.',
    fuentes: 'Espinaca, lechuga, brócoli, repollo, vainitas y aguacate.',
    extra: 'Si tomas anticoagulantes, consulta con tu médico antes de cambiar mucho la cantidad de vegetales verdes.' },
  { id: 'calcio', nombre: 'Calcio', icono: '🦴',
    funcion: 'Forma y mantiene huesos y dientes; participa en la contracción muscular.',
    fuentes: 'Leche, yogur, queso, sardinas con espina, tofu, bebidas vegetales fortificadas y chía.',
    extra: 'Después de la menopausia el calcio, la vitamina D, la proteína y el entrenamiento de fuerza ayudan a proteger los huesos.' },
  { id: 'hierro', nombre: 'Hierro', icono: '🩸',
    funcion: 'Transporta el oxígeno en la sangre: si falta, aparece cansancio.',
    fuentes: 'Carne de res, habichuelas, lentejas, espinaca, tofu y avena. Combínalo con vitamina C (una naranja, ají, tomate) para absorberlo mejor.',
    extra: 'Las mujeres que menstrúan necesitan más hierro que los hombres. Si tienes mucho cansancio o reglas abundantes, coméntalo con tu médico.' },
  { id: 'magnesio', nombre: 'Magnesio', icono: '🌰',
    funcion: 'Participa en la función muscular y nerviosa y en la producción de energía.',
    fuentes: 'Frutos secos, maní, semillas, legumbres, avena, arroz integral y espinaca.' },
  { id: 'zinc', nombre: 'Zinc', icono: '🛡️',
    funcion: 'Participa en las defensas, la cicatrización y el crecimiento muscular.',
    fuentes: 'Carnes, mariscos, legumbres, avena, semillas y frutos secos.' },
  { id: 'potasio', nombre: 'Potasio', icono: '🍌',
    funcion: 'Ayuda al equilibrio de líquidos, a la contracción muscular y a la presión arterial.',
    fuentes: 'Guineo, plátano, papa, batata, aguacate, habichuelas, tomate y yuca.' },
  { id: 'omega3', nombre: 'Omega-3', icono: '🐟',
    funcion: 'Grasas saludables para el corazón y el cerebro.',
    fuentes: 'Sardinas, salmón y otros pescados grasos (2 veces por semana es una referencia habitual), chía y linaza.' },
];
export const nutrientePorId = Object.fromEntries(NUTRIENTES.map(n => [n.id, n]));

export const AVISO_PLAN = 'Este plan es una orientación general. Las necesidades individuales pueden variar.';
export const AVISO_ESTIMACION = 'Las cantidades son estimaciones aproximadas, no valores exactos.';
export const AVISO_SUPLEMENTOS = 'Consulta con un profesional de salud antes de utilizar suplementos, especialmente si tomas medicamentos, tienes una enfermedad, estás embarazada o tienes otra situación médica relevante.';
export const AVISO_ALERGIAS = 'Las alergias tienen prioridad: no se muestran alimentos que contengan lo que indicaste. Revisa siempre las etiquetas de los productos. La app no diagnostica alergias: si sospechas una, consulta con un profesional. Las trazas varían según la marca y la fábrica: aunque la app no muestre aviso, lee siempre la etiqueta.';
export const AVISO_RECUPERACION = 'Es un indicador orientativo de la app, calculado con lo que registras. No es una medición médica.';

// Suplementos: solo información general. Sin dosis personalizadas.
export const SUPLEMENTOS_INFO = [
  { nombre: 'Proteína en polvo', que: 'Proteína de leche (suero) o vegetal en polvo.', uso: 'Se usa habitualmente como forma práctica de completar la proteína del día cuando con la comida cuesta llegar.', nota: 'No es necesaria si tu alimentación ya aporta suficiente proteína. Si la usas, elige productos con certificación de calidad de terceros.' },
  { nombre: 'Creatina', que: 'Compuesto que el cuerpo produce y que también está en la carne y el pescado.', uso: 'Es de los suplementos más estudiados para mejorar la fuerza en esfuerzos cortos e intensos.', nota: 'Si tienes problemas de riñón, consulta antes con tu médico.' },
  { nombre: 'Vitamina D', que: 'Vitamina que el cuerpo fabrica con el sol.', uso: 'Se usa cuando un análisis muestra niveles bajos o hay poca exposición solar.', nota: 'La cantidad debe indicarla un profesional, idealmente con un análisis previo.' },
  { nombre: 'Omega-3', que: 'Aceite de pescado o de algas.', uso: 'Se usa habitualmente cuando se come poco pescado graso.', nota: 'Puede interactuar con anticoagulantes.' },
  { nombre: 'Multivitamínico', que: 'Mezcla de vitaminas y minerales.', uso: 'A veces se usa cuando la alimentación es muy limitada.', nota: 'No sustituye una alimentación variada.' },
  { nombre: 'Magnesio', que: 'Mineral.', uso: 'Se usa en algunos casos de alimentación baja en magnesio.', nota: 'En exceso puede causar molestias digestivas; con problemas de riñón, consulta antes.' },
  { nombre: 'Cafeína', que: 'Estimulante presente en el café y el té.', uso: 'Se usa para sentirse más alerta antes de entrenar.', nota: 'Evítala en las 6 horas antes de dormir si afecta tu sueño. Precaución con problemas del corazón, presión alta o embarazo.' },
  { nombre: 'Electrolitos', que: 'Sales minerales (sodio, potasio) para bebidas.', uso: 'Se usan en sesiones largas con mucho sudor o mucho calor.', nota: 'Para la mayoría de entrenamientos de menos de una hora basta con agua. Contienen sodio: con presión alta o problemas del corazón, consúltalo con tu médico.' },
  { nombre: 'Quemadores de grasa, "detox" y diuréticos', que: 'Productos que prometen bajar de peso rápido.', uso: 'No tienen respaldo científico suficiente para perder grasa de forma sostenida.', nota: 'Algunos contienen estimulantes o sustancias no declaradas que pueden ser peligrosas, sobre todo con problemas del corazón, presión alta o medicación.' },
];

// Educación: el propósito de cada hábito
export const POR_QUE = {
  dormir: { titulo: '¿Por qué dormir?', texto: 'Mientras duermes el cuerpo repara el músculo, regula el apetito y la energía y consolida lo que aprendiste al entrenar. Dormir poco aumenta el hambre y puede hacer que pierdas más músculo y menos grasa. Para la mayoría de adultos, 7 a 9 horas es una referencia. Si roncas fuerte, te despiertas ahogado o tienes mucho sueño de día, coméntalo con tu médico: son señales que conviene revisar.' },
  hidratarse: { titulo: '¿Por qué hidratarse?', texto: 'El agua regula la temperatura, transporta nutrientes y ayuda a que el músculo trabaje. Una pequeña deshidratación ya se nota en el rendimiento, la concentración y el cansancio. La orina de color amarillo claro es una buena señal.' },
  proteina: { titulo: '¿Por qué consumir proteína?', texto: 'La proteína es el material con el que el cuerpo repara y construye músculo. Repartirla en varias comidas al día ayuda a conservar el músculo mientras pierdes grasa, algo especialmente importante después de los 40 años.' },
  vegetales: { titulo: '¿Por qué comer vegetales?', texto: 'Aportan fibra, vitaminas, minerales y agua con muy pocas calorías: llenan el plato y dan saciedad. Una referencia práctica es que ocupen la mitad del plato en almuerzo y cena.' },
  descansar: { titulo: '¿Por qué descansar?', texto: 'El entrenamiento es el estímulo; el progreso ocurre mientras descansas. Sin descanso suficiente la fatiga se acumula, el rendimiento baja y aumenta el riesgo de lesión. Descansar también es parte del plan.' },
  carbohidratos: { titulo: '¿Por qué carbohidratos?', texto: 'Son el combustible principal para entrenar con intensidad. Priorizar los integrales, tubérculos, legumbres y frutas aporta además fibra y vitaminas.' },
  alcohol: { titulo: '¿Y el alcohol?', texto: 'El alcohol aporta calorías, empeora la calidad del sueño y frena la recuperación del músculo. No hace falta eliminarlo para progresar, pero tomar menos y no tomarlo la noche antes de entrenar ayuda a que tu esfuerzo rinda más.' },
  cafe: { titulo: '¿Cuánto café?', texto: 'Para un adulto sano la referencia general es no pasar de unos 400 mg de cafeína al día: unas 3–4 tazas de café colado o unas 5 tacitas de cafecito. Con presión alta, problemas del corazón, ansiedad o embarazo, menos (en el embarazo, unos 200 mg). Evítalo en las 6 horas antes de dormir. El azúcar del café también cuenta. Si quieres tomar menos, baja poco a poco para evitar el dolor de cabeza.' },
  frutas: { titulo: '¿Por qué comer frutas?', texto: 'Las frutas aportan vitaminas (como la C), potasio, fibra y agua. Una referencia práctica son 2–3 porciones al día (una porción es una fruta mediana o una taza de fruta picada). Mejor enteras que en jugo: el jugo pierde la fibra y se toma mucho azúcar en poco tiempo.' },
  nutrientes: { titulo: '¿Por qué variar los alimentos?', texto: 'Ningún alimento tiene todos los nutrientes. Variar proteínas, vegetales, frutas y cereales a lo largo de la semana es la forma más sencilla de cubrir vitaminas y minerales.' },
};
