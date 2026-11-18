// Pruebas físicas iniciales: cuáles hacer, con qué variante y cómo explicarlas.
// Se eligen según el riesgo, las lesiones, el peso, la edad y la experiencia.

import { imc } from './calculos.js';
const CONSEJO_PARAR = 'Para si sientes dolor (no confundir con esfuerzo), mareo o falta de aire fuera de lo normal.';

export const DEFINICIONES = {
  flexiones: {
    titulo: 'Flexiones',
    capacidad: 'Fuerza de empuje del tren superior (pecho, hombros, tríceps) y control del core',
    registro: 'reps',
    variantes: [
      { id: 'pared', etiqueta: 'En la pared', como: 'De pie frente a una pared, manos a la altura del pecho, cuerpo recto. Baja el pecho hacia la pared y empuja.' },
      { id: 'inclinada', etiqueta: 'Inclinadas (mesa o banco firme)', como: 'Manos en el borde de una mesa o banco firme que no se mueva, cuerpo recto de cabeza a talones.' },
      { id: 'rodillas', etiqueta: 'Con rodillas apoyadas', como: 'Rodillas en el suelo (sobre algo blando), cuerpo recto de cabeza a rodillas.' },
      { id: 'normal', etiqueta: 'Normales', como: 'Manos bajo los hombros, cuerpo recto de cabeza a talones, pecho a un puño del suelo.' },
    ],
    instrucciones: [
      'Haz todas las repeticiones que puedas SIN perder la técnica.',
      'Baja controlado y sube sin que la cadera se hunda ni se levante.',
      'La prueba termina cuando la técnica se rompe o necesitas parar más de 2 segundos.',
    ],
    sentir: 'Esfuerzo en pecho, brazos y abdomen. No debe doler la muñeca ni el hombro.',
    detener: CONSEJO_PARAR,
  },
  sentadillas: {
    titulo: 'Sentadillas',
    capacidad: 'Fuerza y resistencia de piernas y glúteos',
    registro: 'reps',
    variantes: [
      { id: 'silla', etiqueta: 'Sentarse y levantarse de una silla (30 s)', segundos: 30, como: 'Silla firme contra la pared. Brazos cruzados al pecho. Siéntate del todo y levántate del todo, tantas veces como puedas en 30 segundos.' },
      { id: 'libre', etiqueta: 'Sentadilla libre (60 s)', segundos: 60, como: 'Pies a la anchura de hombros, baja hasta que los muslos queden paralelos al suelo (o lo que te permita sin dolor) y sube. Ritmo controlado, 60 segundos.' },
    ],
    instrucciones: [
      'Cuenta solo las repeticiones completas y controladas.',
      'Las rodillas siguen la dirección de los pies, los talones no se levantan.',
      'Puedes parar a descansar dentro del tiempo; el reloj sigue corriendo.',
    ],
    sentir: 'Trabajo en muslos y glúteos. No debe doler la rodilla.',
    detener: CONSEJO_PARAR,
  },
  plancha: {
    titulo: 'Plancha',
    capacidad: 'Resistencia del core (abdomen, zona lumbar) y estabilidad',
    registro: 'tiempo',
    variantes: [
      { id: 'inclinada', etiqueta: 'Inclinada (antebrazos en mesa o banco)', como: 'Antebrazos sobre una mesa o banco firme, cuerpo recto y en diagonal.' },
      { id: 'rodillas', etiqueta: 'Con rodillas apoyadas', como: 'Antebrazos y rodillas en el suelo, cuerpo recto de cabeza a rodillas.' },
      { id: 'normal', etiqueta: 'Normal', como: 'Antebrazos y puntas de los pies, cuerpo recto de cabeza a talones.' },
    ],
    instrucciones: [
      'Pulsa INICIAR al colocarte y DETENER cuando la cadera se hunda o se levante.',
      'Respira con normalidad: no aguantes el aire.',
    ],
    sentir: 'Abdomen trabajando. Si notas dolor lumbar, detén la prueba.',
    detener: CONSEJO_PARAR,
  },
  dominadas: {
    titulo: 'Dominadas',
    capacidad: 'Fuerza de tracción (espalda y bíceps)',
    registro: 'reps',
    variantes: [{ id: 'estricta', etiqueta: 'Dominada', como: 'Colgado con brazos extendidos, sube hasta pasar la barbilla sobre la barra, sin balanceo.' }],
    instrucciones: [
      'Cuenta solo repeticiones completas, sin impulso.',
      'Si no logras ninguna, registra 0: es un punto de partida perfectamente normal.',
    ],
    sentir: 'Espalda y brazos. No debe doler el hombro ni el codo.',
    detener: CONSEJO_PARAR,
  },
  cardio: {
    titulo: 'Prueba cardiovascular',
    capacidad: 'Capacidad aeróbica (corazón y pulmones)',
    registro: 'cardio',
    variantes: [
      { id: 'caminata6', etiqueta: 'Caminata de 6 minutos', segundos: 360, como: 'Camina lo más rápido que puedas SIN correr durante 6 minutos en un recorrido llano. Al final anota la distancia (app del móvil, reloj o vueltas medidas).' },
      { id: 'caminata1600', etiqueta: 'Caminata rápida de 1,6 km', como: 'Camina 1,6 km lo más rápido que puedas sin correr. Anota el tiempo.' },
      { id: 'cooper', etiqueta: 'Carrera suave 12 minutos', segundos: 720, como: 'Corre (o alterna correr y caminar) a un ritmo que puedas sostener 12 minutos. Anota la distancia.' },
    ],
    instrucciones: [
      'Calienta 5 minutos caminando suave antes de empezar.',
      'Al terminar, anota cómo de duro fue (esfuerzo de 1 a 10) y tu pulso si tienes reloj o pulsera.',
    ],
    sentir: 'Respiración acelerada pero controlada: deberías poder decir frases cortas.',
    detener: 'Para de inmediato si notas dolor en el pecho, mareo, falta de aire fuera de lo normal o palpitaciones extrañas.',
  },
  movilidad: {
    titulo: 'Movilidad',
    capacidad: 'Rango de movimiento de hombros, cadera, tobillos y tronco',
    registro: 'escala',
    items: [
      { id: 'hombros', titulo: 'Hombros', como: 'De pie, lleva una mano por encima del hombro hacia la espalda y la otra por debajo. Intenta que se toquen. Repite cambiando de lado.',
        opciones: ['Las manos quedan lejos (más de un palmo)', 'Casi se tocan', 'Se tocan o se superponen'] },
      { id: 'cadera', titulo: 'Cadera', como: 'Sentado en el borde de una silla, una pierna estirada con el talón en el suelo. Espalda recta, inclínate hacia delante e intenta tocar la punta del pie.',
        opciones: ['No paso de la rodilla', 'Llego a la espinilla o al tobillo', 'Toco la punta del pie'] },
      { id: 'tobillos', titulo: 'Tobillos', como: 'De pie frente a la pared, un pie a 10 cm de ella. Lleva la rodilla a tocar la pared sin levantar el talón.',
        opciones: ['No llego a tocar la pared', 'La toco con el pie más cerca de la pared', 'La toco con el pie a 10 cm'] },
      { id: 'tronco', titulo: 'Tronco', como: 'Sentado en una silla, brazos cruzados al pecho. Gira el tronco hacia cada lado sin mover la cadera.',
        opciones: ['Giro poco y con molestia', 'Giro de forma moderada', 'Giro amplio y cómodo a ambos lados'] },
    ],
    instrucciones: ['Movimientos lentos, sin rebotes ni forzar. Solo hasta una tensión cómoda.'],
    sentir: 'Estiramiento suave. Nunca dolor.',
    detener: 'Si algún movimiento duele, no lo fuerces: elige la primera opción.',
  },
  coordinacion: {
    titulo: 'Equilibrio y coordinación',
    capacidad: 'Equilibrio, coordinación y cambios de dirección',
    registro: 'coordinacion',
    instrucciones: [
      'Equilibrio: de pie junto a una pared o silla por seguridad. Levanta un pie y aguanta hasta 45 segundos. Detén el reloj si apoyas el pie o te agarras.',
      'Coordinación: marcha en el sitio tocando con la mano derecha la rodilla izquierda y al revés, 20 veces seguidas.',
      'Cambios de dirección: camina 3 metros hacia delante, gira, vuelve, y repite de lado (pasos laterales) ida y vuelta.',
    ],
    sentir: 'Concentración y control. Ten siempre un apoyo cerca.',
    detener: 'Si pierdes el equilibrio, apóyate: no intentes salvarlo de forma brusca.',
  },
};

// Decide qué pruebas hacer y qué variante recomendar
export function pruebasPara(atleta, riesgo) {
  if (riesgo.nivel === 'alerta') return [];
  const p = atleta.personal, exp = atleta.experiencia || {}, eq = atleta.equipamiento?.items || [];
  const lugares = exp.lugares || [];
  const novato = ['nunca', 'menos3m'].includes(exp.tiempo) || ['1a5a', 'mas5a'].includes(exp.inactividad);
  const lesion = l => riesgo.lesiones.includes(l);
  const imcAlto = (imc(p.peso, p.estatura) ?? 0) >= 35;   // mismo IMC redondeado que el resto de la app
  const lista = [];

  // Flexiones
  let flex = 'normal';
  if (imcAlto || lesion('hombro') || lesion('muneca')) flex = 'pared';
  else if (riesgo.bajoImpacto || novato || riesgo.nivel === 'precaucion') flex = 'inclinada';
  else if (p.sexo === 'mujer' && exp.tiempo === '3a6m') flex = 'rodillas';
  lista.push({ id: 'flexiones', recomendada: flex });

  // Sentadillas
  const silla = riesgo.bajoImpacto || lesion('rodilla') || lesion('cadera') || (p.edad || 0) >= 60 || riesgo.nivel === 'precaucion';
  lista.push({ id: 'sentadillas', recomendada: silla ? 'silla' : 'libre' });

  // Plancha
  let plancha = 'normal';
  if (imcAlto || lesion('espalda') || lesion('hombro')) plancha = 'inclinada';
  else if (riesgo.bajoImpacto || novato) plancha = 'rodillas';
  lista.push({ id: 'plancha', recomendada: plancha });

  // Dominadas: solo si es apropiado
  const tieneBarra = eq.includes('barra_dominadas') || eq.includes('maquinas') || lugares.includes('gimnasio') || lugares.includes('parque');
  if (tieneBarra && !lesion('hombro') && !lesion('codo') && !imcAlto && !(riesgo.bajoImpacto && novato)) {
    lista.push({ id: 'dominadas', recomendada: 'estricta' });
  }

  // Cardio
  const puedeCorrer = riesgo.nivel === 'normal' && !riesgo.evitar.has('carrera_intensa') && !novato;
  const caminaRapido = riesgo.nivel === 'normal' && atleta.habitos?.actividad !== 'sedentaria' && !imcAlto;
  lista.push({
    id: 'cardio',
    recomendada: puedeCorrer && ['6a12m', '1a2a', 'mas2a'].includes(exp.tiempo) ? 'cooper' : caminaRapido ? 'caminata1600' : 'caminata6',
    permitidas: puedeCorrer ? ['caminata6', 'caminata1600', 'cooper'] : ['caminata6', 'caminata1600'],
  });

  lista.push({ id: 'movilidad' });
  lista.push({ id: 'coordinacion' });

  return lista.map(x => ({ ...DEFINICIONES[x.id], ...x }));
}
