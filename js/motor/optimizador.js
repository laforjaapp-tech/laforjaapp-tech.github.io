// FASE 5: MOTOR DE OPTIMIZACIÓN DEL PLAN
// optimizeAthletePlan() une entrenamiento, alimentación, hidratación y recuperación bajo el MISMO objetivo y busca
// el máximo progreso sostenible, no la máxima intensidad. Gestiona el ciclo de 4 semanas con experimentación
// controlada (repetir → medir → progresar → variar cuando hace falta) y arma el informe "¿Por qué este plan?".

import { objetivoDominante } from './objetivos.js';
import { planSemanal } from './semana.js';
import { resumenRendimiento } from './rendimiento.js';
import { estructuraPeriodizacion, evaluarDesbloqueos } from './fases.js';
import { objetivoSueno } from './recuperacion.js';
import { hoyISO, sumarDias } from './calculos.js';
import { afirmacion, refsDe, AFIRMACIONES } from '../datos/evidencia.js';
import { DISCIPLINAS } from '../datos/disciplinas.js';
import { fmtCambioPeso } from './unidades.js';

const cerrada = s => ['completada', 'incompleta'].includes(s.estado);
const media = l => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
const red1 = v => Math.round(v * 10) / 10;
const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

const NUTRICION_OBJETIVO = {
  A: 'Déficit moderado y sostenible: comer algo menos de lo que gastas para perder grasa, con proteína suficiente y fuerza para no perder músculo. No es una dieta de hambre.',
  B: 'Sin déficit agresivo: para ganar músculo hace falta energía. Se busca mantener o un déficit pequeño (recomposición), con proteína suficiente repartida en el día.',
  C: 'Energía suficiente para entrenar fuerte y recuperarte, con proteína adecuada.',
  D: 'Energía suficiente para tus sesiones de cardio y para recuperarte; carbohidratos de calidad alrededor del entrenamiento.',
  E: 'Energía suficiente para rendir en todas tus sesiones y recuperarte entre ellas.',
};
const REGLA_ECONOMICA = 'No hace falta salmón, suplementos ni productos "fitness" para progresar: huevos, pollo, sardinas o atún cuando estén en oferta, leche, yogur, habichuelas y lentejas dan la proteína; arroz, avena, papa, batata, plátano y yuca la energía; repollo, zanahoria, auyama y frutas de temporada (guineo, lechosa, piña) el resto. Se cambian según precio y lo que haya en el colmado.';

// ---------- Ciclo de 4 semanas y su evaluación ----------
function ventana(sesiones, desde, hasta) { return sesiones.filter(s => cerrada(s) && s.fecha >= desde && s.fecha <= hasta); }

function evaluarCiclo(atleta, objetivo, { desde, hasta }, datos, sesionesPlanificadas) {
  const ses = ventana(datos.sesiones || [], desde, hasta);
  if (ses.length < 3) return { veredicto: 'sin_datos', texto: 'Aún no hay suficientes entrenamientos registrados en este ciclo para valorarlo.', siguiente: 'Se repite la misma estructura para poder medir tu respuesta.' };
  const adherencia = Math.min(1, ses.length / Math.max(1, sesionesPlanificadas * 4));
  const rend = resumenRendimiento(atleta, ses, [], {});
  const mejoras = rend.fuerza.concat(rend.calistenia.ejercicios).filter(x => x.cambio.tendencia === 'mejora').length;
  const bajas = rend.fuerza.concat(rend.calistenia.ejercicios).filter(x => x.cambio.tendencia === 'baja').length;
  const esfuerzo = media(ses.map(s => s.resultado?.general?.esfuerzo).filter(Number.isFinite));
  const regs = (datos.registrosDiarios || []).filter(r => r.fecha >= desde && r.fecha <= hasta);
  const energia = media(regs.map(r => r.energia).filter(Number.isFinite));
  const pesos = (datos.mediciones || []).filter(m => m.peso && m.fecha >= desde && m.fecha <= hasta).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cambioPeso = pesos.length >= 2 ? red1(pesos[pesos.length - 1].peso - pesos[0].peso) : null;
  const experimento = ses.filter(s => s.workout?.tipo === 'fuerza_boxeo');
  const datosTexto = [
    `${ses.length} entrenamientos (${Math.round(adherencia * 100)} % de lo planificado)`,
    mejoras || bajas ? `${mejoras} ejercicios mejoraron${bajas ? `, ${bajas} bajaron` : ''}` : null,
    esfuerzo != null ? `esfuerzo medio ${red1(esfuerzo)}/10` : null,
    energia != null ? `energía media ${red1(energia)}/10` : null,
    cambioPeso != null ? `peso ${fmtCambioPeso(cambioPeso, atleta)}` : null,
  ].filter(Boolean);
  const pesoBien = cambioPeso == null ? null : objetivo.clave === 'A' ? cambioPeso < 0 : objetivo.clave === 'B' ? cambioPeso >= -0.5 : Math.abs(cambioPeso) <= 2;
  let veredicto;
  if (adherencia < 0.5 || (energia != null && energia < 5) || (esfuerzo != null && esfuerzo > 8.5) || bajas > mejoras + 1) veredicto = 'empeoro';
  else if (adherencia >= 0.7 && (mejoras > bajas || pesoBien === true) && (esfuerzo == null || esfuerzo <= 8)) veredicto = 'mejoro';
  else veredicto = 'mantuvo';
  const texto = { mejoro: '¿Mejoró? Sí.', mantuvo: '¿Mejoró? Se mantuvo.', empeoro: '¿Mejoró? No: la respuesta no fue buena.' }[veredicto];
  const siguiente = {
    mejoro: 'Se mantiene la estructura que funciona y se progresa: algo más de carga o una variante más exigente, una variable cada vez.',
    mantuvo: 'Se mantiene lo que funciona y se introduce una variación pequeña para dar un estímulo nuevo sin cambiarlo todo.',
    empeoro: adherencia < 0.5
      ? 'Es mejor un plan que puedas cumplir: valora bajar un día de entrenamiento o acortar las sesiones (Perfil → disponibilidad). Se prioriza la constancia.'
      : 'Se reduce el volumen la próxima semana y se prioriza la recuperación (sueño, comida suficiente) antes de volver a subir.',
  }[veredicto];
  const exp = experimento.length
    ? `Variante probada: fuerza + boxeo técnico (${experimento.length} ${experimento.length === 1 ? 'sesión' : 'sesiones'}, esfuerzo medio ${red1(media(experimento.map(s => s.resultado?.general?.esfuerzo).filter(Number.isFinite)) ?? 6)}/10). ${veredicto === 'empeoro' ? 'No se repite el próximo ciclo.' : 'Se puede mantener como opción si te gustó.'}`
    : null;
  return { veredicto, texto, datos: datosTexto, siguiente, experimento: exp };
}

function cicloActual(atleta, objetivo, fecha, per, datos, sesionesSemana) {
  const inicioPlan = atleta.plan?.periodizacion?.inicio;
  if (!inicioPlan || !per) return null;
  const transcurridos = Math.max(0, dias(inicioPlan, fecha));
  const numero = Math.floor(transcurridos / 28) + 1;
  const inicio = sumarDias(inicioPlan, (numero - 1) * 28);
  const semana = per.microciclo.semana;
  const etapas = [
    { semana: 1, texto: 'Estructura base: se repiten los mismos estímulos para poder medirlos.' },
    { semana: 2, texto: 'Misma estructura: se progresa una variable si la respuesta fue buena.' },
    { semana: 3, texto: (atleta.modalidades || []).includes('boxeo') ? 'Variación controlada: una sesión prueba fuerza + boxeo técnico.' : 'Se mantiene la estructura y se consolida la progresión.' },
    { semana: 4, texto: per.mesociclo.descarga ? 'Descarga: menos volumen para recuperar y asimilar.' : 'Consolidación antes del siguiente ciclo.' },
  ];
  const anterior = numero > 1 ? evaluarCiclo(atleta, objetivo, { desde: sumarDias(inicio, -28), hasta: sumarDias(inicio, -1) }, datos, sesionesSemana) : null;
  return { numero, inicio, fin: sumarDias(inicio, 27), semana, mesociclo: per.mesociclo.nombre, etapas, anterior };
}

// ---------- Plan integral ----------
export function optimizeAthletePlan(atleta, datos = {}) {
  const fecha = datos.fecha || hoyISO();
  const objetivo = objetivoDominante(atleta);
  const per = estructuraPeriodizacion(atleta, fecha);
  const items = evaluarDesbloqueos(atleta);
  const semana = planSemanal(atleta, { fecha, per, items, diasEntreno: datos.diasEntreno });
  const sesionesSemana = semana.sesiones.length;
  const ajustes = [];

  // Recuperación: sueño y sensaciones de la última semana
  const meta = objetivoSueno(atleta.personal?.edad);
  const suenos = (datos.suenos || []).filter(s => s.duracionMin && s.fecha > sumarDias(fecha, -8)).map(s => s.duracionMin / 60);
  const suenoMedio = media(suenos);
  const regs = (datos.registrosDiarios || []).filter(r => r.fecha > sumarDias(fecha, -8));
  const fatiga = media(regs.map(r => r.fatiga).filter(Number.isFinite));
  const energia = media(regs.map(r => r.energia).filter(Number.isFinite));
  if (suenoMedio != null && suenoMedio < 6) ajustes.push({ tipo: 'precaucion', afirmacion: 'sueno', texto: `Duermes de media ${red1(suenoMedio)} h. Con menos de 6 h el cuerpo recupera peor: esta semana lo más rentable es dormir más. Si tu chequeo diario lo indica, las sesiones intensas se cambian por versiones moderadas.` });
  else if (suenoMedio != null && suenoMedio < meta.min) ajustes.push({ tipo: 'info', afirmacion: 'sueno', texto: `Duermes de media ${red1(suenoMedio)} h; el objetivo es ${meta.min} h o más. Acostarte 20–30 min antes ya suma.` });
  if (fatiga != null && fatiga >= 7) ajustes.push({ tipo: 'precaucion', afirmacion: 'descarga', texto: `Tu fatiga media esta semana es ${red1(fatiga)}/10: si sigue así, conviene una semana de descarga (menos volumen) antes de seguir subiendo.` });

  // Constancia: lo hecho en los últimos 14 días frente a lo planificado
  const hechas14 = (datos.sesiones || []).filter(s => cerrada(s) && s.fecha > sumarDias(fecha, -14) && s.fecha <= fecha).length;
  const planificadas14 = sesionesSemana * 2;
  const inicioPlan = atleta.plan?.periodizacion?.inicio;
  if (inicioPlan && dias(inicioPlan, fecha) >= 14 && planificadas14 && hechas14 / planificadas14 < 0.5)
    ajustes.push({ tipo: 'info', afirmacion: 'balance_energetico', texto: `En las dos últimas semanas hiciste ${hechas14} de ${planificadas14} sesiones. El mejor plan es el que puedes cumplir: si te cuesta, baja un día o acorta las sesiones en tu perfil.` });

  // Alimentación para el objetivo (conectada con la FASE 4)
  const nec = datos.nutricion?.nec;
  const perfilNut = datos.nutricion?.perfil;
  const peso = atleta.personal?.peso;
  let nutricion = { configurada: false, enfoque: NUTRICION_OBJETIVO[objetivo.clave], reglaEconomica: REGLA_ECONOMICA };
  if (nec) {
    const gkgActual = peso ? red1(nec.proteina / peso) : null;
    nutricion = {
      ...nutricion, configurada: true, kcal: nec.kcal, proteina: nec.proteina, objetivoNut: nec.objetivo,
      proteinaTexto: `Unos ${nec.proteina} g de proteína al día${gkgActual ? ` (≈ ${gkgActual.toLocaleString('es')} g por kg de tu peso actual)` : ''}, junto al entrenamiento de fuerza. Por encima de unos 1,6 g por kg no se vio beneficio extra; con mucho peso corporal se calcula sobre un peso ajustado. No hace falta proteína en polvo si la comida alcanza.`,
      economico: perfilNut?.presupuesto?.nivel === 'bajo',
    };
    if (objetivo.clave === 'B' && nec.objetivo === 'perdida_grasa') ajustes.push({ tipo: 'precaucion', afirmacion: 'balance_energetico', texto: 'Tu objetivo principal es ganar músculo, pero tu alimentación está en "pérdida de grasa": un déficit grande frena la ganancia de músculo. Valora cambiarla a recomposición en Comida → Preferencias.' });
    if (objetivo.clave === 'A' && nec.objetivo === 'ganancia_muscular') ajustes.push({ tipo: 'precaucion', afirmacion: 'balance_energetico', texto: 'Tu objetivo principal es perder grasa, pero tu alimentación está en "ganancia muscular" (superávit): así es difícil perder grasa. Revisa Comida → Preferencias.' });
  }

  // Hidratación
  const hidratacion = datos.aguaMeta ? { ml: datos.aguaMeta, texto: `Unos ${(datos.aguaMeta / 1000).toLocaleString('es', { maximumFractionDigits: 1 })} litros al día, más en los días de entrenamiento y con calor. Café y té cuentan en parte.` } : null;

  const ciclo = cicloActual(atleta, objetivo, fecha, per, datos, sesionesSemana);

  // Informe "¿Por qué este plan?" con las afirmaciones usadas y sus referencias
  const usadas = new Set(['balance_energetico', 'no_hay_mejor_ejercicio', 'guias_minimas', 'repetir_para_progresar', ...objetivo.prioridades.map(p => p.afirmacion)]);
  const r = semana.resumen;
  if (r.fuerza) ['frecuencia_dos', 'cerca_del_fallo', 'fuerza_previene_lesiones'].forEach(a => usadas.add(a));
  if (r.fuerza && r.cardio) ['concurrente', 'fuerza_antes_cardio'].forEach(a => usadas.add(a));
  if (objetivo.clave === 'B' || objetivo.clave === 'C') usadas.add('volumen_hipertrofia');
  if ((atleta.experiencia?.lugares || []).includes('casa')) usadas.add('cargas_en_casa');
  if (r.boxeo) usadas.add('boxeo');
  if (r.hiit) usadas.add('hiit_dosificado');
  if (r.militar) usadas.add('militar');
  if (semana.sesiones.some(s => s.tipo === 'cardio_movilidad') && (atleta.modalidades || []).includes('parkour')) usadas.add('parkour');
  if (r.agilidad) usadas.add('equilibrio');
  if (per?.mesociclo?.descarga) usadas.add('descarga');
  if (objetivo.clave === 'A') ['proteina', 'proteina_deficit', 'ritmo_perdida'].forEach(a => usadas.add(a));
  else usadas.add('proteina');
  usadas.add('sueno');
  const afirmaciones = [...usadas].filter(id => AFIRMACIONES[id]).map(afirmacion);
  const disciplinas = Object.entries({ fuerza: r.fuerza, cardio: r.cardio, calistenia: r.calistenia, boxeo: r.boxeo, movilidad: r.movilidad, militar: r.militar, agilidad: r.agilidad, hiit: r.hiit })
    .filter(([, n]) => n).map(([d, n]) => ({ d, nombre: DISCIPLINAS[d]?.nombre || d, icono: DISCIPLINAS[d]?.icono || '•', sesiones: n, funcion: DISCIPLINAS[d]?.funcion || '' }));
  const informe = {
    titulo: '¿Por qué este plan?',
    periodo: ciclo ? `Ciclo ${ciclo.numero} · ${ciclo.mesociclo}` : 'Primer ciclo',
    objetivo: objetivo.nombre,
    disciplinas,
    descanso: r.descanso,
    nutricion: nutricion.enfoque,
    afirmaciones,
    referencias: refsDe(afirmaciones.flatMap(a => a.refs)),
  };

  return {
    fecha, objetivo, semana, ciclo, ajustes, nutricion, hidratacion, informe,
    recuperacion: { suenoObjetivo: meta, suenoMedio: suenoMedio != null ? red1(suenoMedio) : null, fatiga: fatiga != null ? red1(fatiga) : null, energia: energia != null ? red1(energia) : null, descanso: r.descanso },
    rendimiento: resumenRendimiento(atleta, datos.sesiones || [], datos.mediciones || []),
  };
}
