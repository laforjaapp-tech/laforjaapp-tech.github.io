// Seguridad: separa INTENSIDAD de RIESGO.
// Decide qué pruebas y modalidades son apropiadas y cuándo recomendar valoración profesional.

import { PREGUNTAS_SEGURIDAD, CONDICIONES_MEDICAS, etiquetaDe, LESIONES } from '../datos/catalogos.js';
import { imc } from './calculos.js';

export const MENSAJE_ALARMA = {
  titulo: 'Detén el ejercicio ahora',
  texto:
    'Si sientes dolor en el pecho, desmayo, dificultad para respirar fuera de lo normal, mareo intenso, ' +
    'dolor agudo, síntomas neurológicos (hormigueo, debilidad de un lado, visión o habla alterada) o te lesionaste: ' +
    'para de inmediato, siéntate o recuéstate y no sigas entrenando hoy.',
  urgente:
    'Si el dolor en el pecho, la falta de aire o los síntomas neurológicos no desaparecen en unos minutos, ' +
    'o hubo pérdida de conocimiento, llama a emergencias.',
  leve:
    'Si es un dolor muscular o articular que no cede, consulta a un médico o fisioterapeuta antes de volver a entrenar esa zona.',
};

// Qué evitar o adaptar según cada lesión declarada
export const ADAPTACIONES_LESION = {
  rodilla: { evitar: ['saltos', 'carrera_intensa', 'sentadilla_profunda'], nota: 'Sentadillas a una silla y sin saltos hasta que no haya dolor.' },
  tobillo: { evitar: ['saltos', 'carrera_intensa'], nota: 'Cardio de bajo impacto (caminata, bicicleta) y trabajo de equilibrio con apoyo.' },
  cadera: { evitar: ['saltos', 'sentadilla_profunda'], nota: 'Rango de movimiento cómodo, sin forzar la profundidad.' },
  espalda: { evitar: ['carga_axial_pesada', 'arrastres'], nota: 'Primero control del core; cargas pesadas solo sin dolor.' },
  hombro: { evitar: ['dominadas', 'fondos', 'golpeo_saco'], nota: 'Empujes inclinados y tracciones suaves con banda si no hay dolor.' },
  codo: { evitar: ['dominadas', 'fondos', 'golpeo_saco'], nota: 'Evitar bloqueos bruscos del codo; boxeo solo en sombra.' },
  muneca: { evitar: ['flexiones_suelo', 'golpeo_saco'], nota: 'Flexiones inclinadas o sobre puños/agarres; boxeo solo en sombra.' },
  cuello: { evitar: ['arrastres', 'carga_axial_pesada'], nota: 'Mantener el cuello neutro; nada de carga sobre la cabeza o el cuello.' },
  otra: { evitar: [], nota: 'Adapta o detén cualquier ejercicio que moleste en la zona afectada.' },
};

export function evaluarRiesgo(atleta) {
  const s = atleta.seguridad || {};
  const edad = atleta.personal?.edad || 0;
  const motivos = [];
  let nivel = 'normal';
  const subir = n => { if (n === 'alerta' || (n === 'precaucion' && nivel === 'normal')) nivel = n; };

  for (const p of PREGUNTAS_SEGURIDAD) {
    if (s.cuestionario?.[p.id] === 'si') { subir(p.nivel); motivos.push(p.texto.replace(/^¿|\?$/g, '')); }
  }
  if (s.tieneCondicion === 'si') {
    for (const c of s.condiciones || []) {
      const def = CONDICIONES_MEDICAS.find(x => x.id === c);
      subir(def?.nivel || 'precaucion');
      motivos.push('Condición médica: ' + (c === 'otra' && s.condicionOtra ? s.condicionOtra : etiquetaDe(CONDICIONES_MEDICAS, c)));
    }
    if (!(s.condiciones || []).length) { subir('precaucion'); motivos.push('Condición médica declarada'); }
  }
  if (edad >= 65 && atleta.habitos?.actividad === 'sedentaria') {
    subir('precaucion'); motivos.push('Más de 65 años y actividad diaria sedentaria');
  }

  // Peso corporal alto y/o muchos años sin entrenar: no es un problema de intensidad,
  // es de carga sobre articulaciones y tendones que llevan tiempo sin estímulo.
  const valorImc = imc(atleta.personal?.peso, atleta.personal?.estatura);
  const inactivo = ['1a5a', 'mas5a'].includes(atleta.experiencia?.inactividad) || atleta.experiencia?.tiempo === 'nunca';
  const bajoImpacto = (valorImc != null && valorImc >= 30) || (edad >= 40 && inactivo);
  if (valorImc != null && valorImc >= 35) {
    subir('precaucion'); motivos.push('Peso corporal elevado: conviene un chequeo médico antes de subir la intensidad');
  }
  if (edad >= 40 && inactivo) motivos.push('40 años o más y mucho tiempo sin entrenar: empezamos con bajo impacto');

  const lesiones = (s.lesiones || []).filter(l => l !== 'ninguna');
  const evitar = new Set(lesiones.flatMap(l => ADAPTACIONES_LESION[l]?.evitar || []));
  // En la fase de adaptación, sin saltos ni carrera intensa: se desbloquean al progresar
  if (bajoImpacto) { evitar.add('saltos'); evitar.add('carrera_intensa'); }

  return {
    nivel,                       // 'normal' | 'precaucion' | 'alerta'
    motivos,
    lesiones,
    evitar,                      // movimientos a evitar por lesión
    notasLesion: lesiones.map(l => ({
      zona: l === 'otra' && s.lesionOtra ? s.lesionOtra : etiquetaDe(LESIONES, l),
      nota: ADAPTACIONES_LESION[l]?.nota,
    })),
    bajoImpacto,
    recomendarValoracion: nivel !== 'normal' || lesiones.length > 0 || bajoImpacto,
    mensaje: nivel === 'alerta'
      ? 'Por lo que nos contaste, antes de hacer pruebas físicas o entrenar con intensidad necesitas el visto bueno de un médico. ' +
        'Puedes completar tu perfil; empezaremos con actividad muy suave (caminata y movilidad) hasta tener esa valoración.'
      : nivel === 'precaucion'
        ? 'Te recomendamos comentar con tu médico que vas a empezar a entrenar. Las pruebas serán suaves y la progresión más prudente.'
        : lesiones.length
          ? 'Adaptaremos los ejercicios a tus lesiones. Si una zona duele, detente; si el dolor persiste, consulta a un fisioterapeuta o médico.'
          : bajoImpacto
            ? 'Empezaremos con ejercicios de bajo impacto para proteger rodillas, espalda y tendones. Un chequeo médico general antes de empezar es buena idea.'
            : '',
  };
}
