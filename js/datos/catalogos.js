// Listas de opciones de la evaluación. Cada opción tiene un id estable (el que se guarda)
// y una etiqueta (la que se muestra). Cambiar etiquetas no rompe datos guardados.

export const APP = { nombre: 'LA FORJA', version: '0.1.0' };

export const SEXOS = [
  { id: 'hombre', etiqueta: 'Hombre' },
  { id: 'mujer', etiqueta: 'Mujer' },
];

export const OBJETIVOS = [
  { id: 'perder_grasa', etiqueta: 'Perder grasa' },
  { id: 'bajar_peso', etiqueta: 'Bajar de peso' },
  { id: 'ganar_musculo', etiqueta: 'Ganar masa muscular' },
  { id: 'ganar_fuerza', etiqueta: 'Ganar fuerza' },
  { id: 'tonificar', etiqueta: 'Tonificar' },
  { id: 'resistencia', etiqueta: 'Mejorar resistencia' },
  { id: 'velocidad', etiqueta: 'Mejorar velocidad' },
  { id: 'agilidad', etiqueta: 'Mejorar agilidad' },
  { id: 'cardiovascular', etiqueta: 'Mejorar condición cardiovascular' },
  { id: 'movilidad', etiqueta: 'Mejorar movilidad' },
  { id: 'rendimiento_general', etiqueta: 'Mejorar rendimiento físico general' },
  { id: 'preparacion_avanzada', etiqueta: 'Preparación física avanzada' },
  { id: 'militar', etiqueta: 'Preparación física tipo militar' },
  { id: 'calistenia', etiqueta: 'Calistenia' },
  { id: 'pruebas_fisicas', etiqueta: 'Preparación para pruebas físicas' },
  { id: 'mantener', etiqueta: 'Mantener condición física' },
];

// Metas medibles para 3, 6 y 12 meses
export const METAS = [
  { id: 'peso', etiqueta: 'Peso objetivo', unidad: 'kg' },
  { id: 'grasa', etiqueta: '% de grasa (solo con medición fiable)', unidad: '%' },
  { id: 'flexiones', etiqueta: 'Flexiones seguidas', unidad: 'rep' },
  { id: 'sentadillas', etiqueta: 'Sentadillas seguidas', unidad: 'rep' },
  { id: 'plancha', etiqueta: 'Tiempo de plancha', unidad: 'seg' },
  { id: 'dominadas', etiqueta: 'Dominadas', unidad: 'rep' },
  { id: 'tiempo_corriendo', etiqueta: 'Tiempo corriendo sin parar', unidad: 'min' },
  { id: 'distancia_corriendo', etiqueta: 'Distancia corriendo', unidad: 'km' },
  { id: 'recuperacion', etiqueta: 'Tiempo de recuperación entre esfuerzos', unidad: 'seg' },
  { id: 'nivel_fuerza', etiqueta: 'Nivel de fuerza (1 a 10)', unidad: '/10' },
  { id: 'nivel_cardio', etiqueta: 'Nivel cardiovascular (1 a 10)', unidad: '/10' },
];

export const HORIZONTES = [
  { id: 'm3', etiqueta: '3 meses' },
  { id: 'm6', etiqueta: '6 meses' },
  { id: 'm12', etiqueta: '12 meses' },
];

export const EXPERIENCIA = [
  { id: 'nunca', etiqueta: 'Nunca', puntos: 0 },
  { id: 'menos3m', etiqueta: 'Menos de 3 meses', puntos: 1 },
  { id: '3a6m', etiqueta: '3–6 meses', puntos: 2 },
  { id: '6a12m', etiqueta: '6–12 meses', puntos: 3 },
  { id: '1a2a', etiqueta: '1–2 años', puntos: 4 },
  { id: 'mas2a', etiqueta: 'Más de 2 años', puntos: 5 },
];

// Cuánto tiempo lleva sin entrenar con regularidad (no es lo mismo "nunca" que "hace 10 años")
export const INACTIVIDAD = [
  { id: 'activo', etiqueta: 'Entreno actualmente' },
  { id: 'menos6m', etiqueta: 'Menos de 6 meses' },
  { id: '6a12m', etiqueta: '6–12 meses' },
  { id: '1a5a', etiqueta: '1–5 años' },
  { id: 'mas5a', etiqueta: 'Más de 5 años' },
];

export const LUGARES = [
  { id: 'casa', etiqueta: 'Casa' },
  { id: 'gimnasio', etiqueta: 'Gimnasio' },
  { id: 'parque', etiqueta: 'Parque' },
  { id: 'calle', etiqueta: 'Calle' },
  { id: 'combinado', etiqueta: 'Combinación de lugares' },
];

export const EQUIPAMIENTO = [
  { id: 'ninguno', etiqueta: 'Ningún equipamiento', exclusivo: true },
  { id: 'colchoneta', etiqueta: 'Colchoneta' },
  { id: 'bandas', etiqueta: 'Bandas elásticas' },
  { id: 'mancuernas', etiqueta: 'Mancuernas' },
  { id: 'kettlebell', etiqueta: 'Kettlebell' },
  { id: 'barra', etiqueta: 'Barra' },
  { id: 'barra_dominadas', etiqueta: 'Barra de dominadas' },
  { id: 'banco', etiqueta: 'Banco' },
  { id: 'cuerda', etiqueta: 'Cuerda para saltar' },
  { id: 'bicicleta', etiqueta: 'Bicicleta' },
  { id: 'caminadora', etiqueta: 'Caminadora' },
  { id: 'maquinas', etiqueta: 'Máquinas de gimnasio' },
  { id: 'saco', etiqueta: 'Saco de boxeo' },
  { id: 'otro', etiqueta: 'Otro' },
];

export const LESIONES = [
  { id: 'rodilla', etiqueta: 'Rodilla' },
  { id: 'tobillo', etiqueta: 'Tobillo' },
  { id: 'cadera', etiqueta: 'Cadera' },
  { id: 'espalda', etiqueta: 'Espalda' },
  { id: 'hombro', etiqueta: 'Hombro' },
  { id: 'codo', etiqueta: 'Codo' },
  { id: 'muneca', etiqueta: 'Muñeca' },
  { id: 'cuello', etiqueta: 'Cuello' },
  { id: 'otra', etiqueta: 'Otra' },
];

// Preguntas de seguridad previas a la actividad (inspiradas en el cuestionario PAR-Q).
// "alerta" = si responde Sí, no se hacen pruebas físicas y se recomienda valoración médica antes.
export const PREGUNTAS_SEGURIDAD = [
  { id: 'corazon', texto: '¿Algún médico te ha dicho que tienes un problema del corazón o presión arterial alta?', nivel: 'alerta' },
  { id: 'dolor_pecho', texto: '¿Sientes dolor en el pecho en reposo, en tu día a día o al hacer actividad física?', nivel: 'alerta' },
  { id: 'mareo', texto: '¿Has perdido el equilibrio por mareo o has perdido el conocimiento en los últimos 12 meses?', nivel: 'alerta' },
  { id: 'cronica', texto: '¿Tienes alguna enfermedad crónica diagnosticada (además de corazón o presión)?', nivel: 'precaucion' },
  { id: 'medicacion', texto: '¿Tomas medicación para alguna enfermedad crónica?', nivel: 'precaucion' },
  { id: 'embarazo', texto: '¿Estás embarazada o tuviste un parto en los últimos 6 meses?', nivel: 'precaucion', soloSexo: 'mujer' },
  { id: 'cirugia', texto: '¿Te han operado en los últimos 6 meses?', nivel: 'precaucion' },
];

// Si tiene condición médica, solo lo necesario para orientar la seguridad
export const CONDICIONES_MEDICAS = [
  { id: 'cardiaca', etiqueta: 'Cardíaca o presión arterial', nivel: 'alerta' },
  { id: 'respiratoria', etiqueta: 'Respiratoria (por ejemplo asma)', nivel: 'precaucion' },
  { id: 'metabolica', etiqueta: 'Metabólica (por ejemplo diabetes)', nivel: 'precaucion' },
  { id: 'articular', etiqueta: 'Articular u ósea (artrosis, osteoporosis)', nivel: 'precaucion' },
  { id: 'neurologica', etiqueta: 'Neurológica', nivel: 'alerta' },
  { id: 'otra', etiqueta: 'Otra', nivel: 'precaucion' },
];

export const DIAS_SEMANA = [1, 2, 3, 4, 5, 6];

export const MINUTOS = [
  { id: 15, etiqueta: '15 min' },
  { id: 20, etiqueta: '20 min' },
  { id: 30, etiqueta: '30 min' },
  { id: 45, etiqueta: '45 min' },
  { id: 60, etiqueta: '60 min' },
  { id: 90, etiqueta: '90 min' },
  { id: 120, etiqueta: 'Más de 90 min' },
];

export const HORARIOS = [
  { id: 'manana', etiqueta: 'Mañana' },
  { id: 'mediodia', etiqueta: 'Mediodía' },
  { id: 'tarde', etiqueta: 'Tarde' },
  { id: 'noche', etiqueta: 'Noche' },
];

export const MODALIDADES = [
  { id: 'fuerza', etiqueta: 'Fuerza' },
  { id: 'gimnasio', etiqueta: 'Gimnasio' },
  { id: 'casa', etiqueta: 'Entrenamiento en casa' },
  { id: 'calistenia', etiqueta: 'Calistenia' },
  { id: 'cardio', etiqueta: 'Cardio' },
  { id: 'hiit', etiqueta: 'HIIT' },
  { id: 'funcional', etiqueta: 'Entrenamiento funcional' },
  { id: 'militar', etiqueta: 'Entrenamiento tipo militar' },
  { id: 'boxeo', etiqueta: 'Boxeo' },
  { id: 'agilidad', etiqueta: 'Agilidad' },
  { id: 'velocidad', etiqueta: 'Velocidad' },
  { id: 'movilidad', etiqueta: 'Movilidad' },
  { id: 'parkour', etiqueta: 'Parkour básico' },
];

export const ACTIVIDAD_DIARIA = [
  { id: 'sedentaria', etiqueta: 'Sedentaria (casi todo el día sentado)' },
  { id: 'ligera', etiqueta: 'Ligera (camino algo cada día)' },
  { id: 'activa', etiqueta: 'Activa (trabajo de pie o camino mucho)' },
  { id: 'muy_activa', etiqueta: 'Muy activa (trabajo físico)' },
];

export const GRUPOS_MUSCULARES = [
  'pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'core',
  'gluteos', 'cuadriceps', 'isquiotibiales', 'pantorrillas',
];

export const CAPACIDADES = ['movilidad', 'cardio', 'equilibrio'];

export const NIVELES = {
  principiante: { id: 'principiante', etiqueta: 'PRINCIPIANTE', emoji: '🟢', orden: 1 },
  intermedio: { id: 'intermedio', etiqueta: 'INTERMEDIO', emoji: '🟡', orden: 2 },
  avanzado: { id: 'avanzado', etiqueta: 'AVANZADO', emoji: '🟠', orden: 3 },
  alto_rendimiento: { id: 'alto_rendimiento', etiqueta: 'ALTO RENDIMIENTO', emoji: '🔴', orden: 4 },
};

export const SINTOMAS_ALARMA = [
  'Dolor en el pecho',
  'Desmayo o sensación de desmayo',
  'Dificultad para respirar fuera de lo normal',
  'Mareo intenso',
  'Dolor agudo o punzante',
  'Hormigueo, debilidad de un lado, visión o habla alterada',
  'Lesión (torcedura, golpe, chasquido con dolor)',
];

export const etiquetaDe = (lista, id) => (lista.find(o => o.id === id) || {}).etiqueta || id;
