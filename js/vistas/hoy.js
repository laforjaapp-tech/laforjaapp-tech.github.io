// ENTRENAMIENTO DE HOY: chequeo de recuperación → sesión generada → registro final.
// FASE 3: botón "Comenzar" con la pantalla interactiva. FASE 4: tablero del día (comida, agua, sueño,
// recuperación, compras) y la calidad del sueño en el chequeo.

import { esc, chips, activarChips, valorChips, leerFormulario, campo, aviso } from '../ui/componentes.js';
import { NOMBRES_GRUPO } from '../datos/ejercicios.js';
import { disciplinaDe, textoDisciplina } from '../datos/disciplinas.js';
import { htmlPorQueCombinacion } from '../ui/ciencia.js';
import { htmlFilaEjercicio, textoDosis } from '../ui/tecnica.js';
import { montarIlustraciones } from '../ui/figura.js';
import { SENSACIONES } from '../motor/adaptacion.js';
import { SENSACION_EJERCICIO } from '../motor/historial.js';
import { MENSAJE_ALARMA } from '../motor/seguridad.js';
import { tieneGimnasio } from '../motor/generador.js';
import { duracionSueno, textoDuracion } from '../motor/recuperacion.js';

const num = (n, desde = 1) => Array.from({ length: n }, (_, i) => ({ id: i + desde, etiqueta: String(i + desde) }));
const siNo = ruta => chips({ ruta, opciones: [{ id: 'si', etiqueta: 'Sí' }, { id: 'no', etiqueta: 'No' }] });

// Cada ejercicio con su ilustración en movimiento, la dosis (series × repeticiones), el descanso y el músculo que trabaja
function htmlItem(it, b) {
  const x = it.explicacion;
  return `<details class="ejercicio">
    <summary>${htmlFilaEjercicio(it.ejercicioId, { nombre: it.nombre, dosis: textoDosis(it, b), descanso: it.descanso ? `${it.descanso} s entre series` : '', nota: it.nota })}
      <span class="ej-mas">Cómo se hace ▾</span></summary>
    <div class="ej-detalle">
      ${(it.notas || []).map(n => `<p class="ayuda">• ${esc(n)}</p>`).join('')}
      <dl class="preguntas-ej">
        <dt>¿Qué vas a hacer?</dt><dd>${esc(x.que)}</dd>
        <dt>¿Qué trabaja?</dt><dd>${esc(x.trabaja)}</dd>
        <dt>¿Para qué sirve?</dt><dd>${esc(x.sirve)}</dd>
        <dt>¿Cómo hacerlo?</dt><dd><ol>${x.como.map(c => `<li>${esc(c)}</li>`).join('')}</ol></dd>
        <dt>¿Qué evitar?</dt><dd><ul>${x.evitar.map(c => `<li>${esc(c)}</li>`).join('')}</ul></dd>
        <dt>¿Cuánto?</dt><dd>${esc(x.cuanto)}${x.rpe ? `<br><span class="ayuda">${esc(x.rpe)}</span>` : ''}</dd>
        <dt>¿Cuánto descansar?</dt><dd>${esc(x.descanso)}</dd>
        <dt>Respiración</dt><dd>${esc(x.respiracion)}</dd>
        <dt>Qué debes sentir</dt><dd>${esc(x.sentir)}</dd>
        ${x.precauciones ? `<dt>Precaución</dt><dd>${esc(x.precauciones)}</dd>` : ''}
      </dl>
    </div>
  </details>`;
}

function htmlBloque(b, i) {
  const extra = b.formato === 'rondas'
    ? `<div class="rondas">${b.rondas.map(r => htmlFilaEjercicio(r.ejercicioId, { nombre: `Ronda ${r.numero}: ${r.combinacion}`, dosis: `${r.segundos / 60} min · ${r.foco}`, descanso: r.descanso ? `${r.descanso} s` : '' })).join('')}</div>` : '';
  return `<section class="bloque-sesion">
    <div class="bloque-cab">
      <span class="bloque-num">BLOQUE ${i + 1}</span>
      <h3>${esc(b.titulo)}</h3>
      <span class="bloque-min">${b.minutos} min</span>
    </div>
    <span class="bloque-disc">Disciplina: ${esc(textoDisciplina(disciplinaDe(b)))}</span>
    ${b.resumen ? `<p class="bloque-resumen">${esc(b.resumen)}</p>` : ''}
    ${b.intensidad ? `<p class="ayuda">${esc(b.intensidad)}</p>` : ''}
    ${extra}
    <div class="lista-ej">${b.items.map(it => htmlItem(it, b)).join('')}</div>
  </section>`;
}

// Chequeo diario "¿Cómo te sientes hoy?" (FASE 4: también se responde desde Bienestar → Recuperación).
// v: valores previos o sugeridos desde "Mi sueño" { suenoHoras, calidadSueno, ... }
export function htmlChequeo(atleta, v = null) {
  v = v || {};
  return `<div class="fila">${campo({ ruta: 'horaDormir', etiqueta: '¿A qué hora te dormiste?', tipo: 'time', valor: v.horaDormir || '' })}
      ${campo({ ruta: 'horaDespertar', etiqueta: '¿A qué hora despertaste?', tipo: 'time', valor: v.horaDespertar || '' })}</div>
    <p class="ayuda" data-duracion>${v.horaDormir && v.horaDespertar ? `Dormiste aproximadamente ${textoDuracion(duracionSueno(v.horaDormir, v.horaDespertar))}.` : 'Con la hora de dormir y de despertar se calculan tus horas de sueño y se registran en "Mi sueño".'}</p>
    ${campo({ ruta: 'suenoHoras', etiqueta: 'Si no recuerdas las horas: ¿cuántas horas dormiste?', tipo: 'number', unidad: 'horas', paso: 0.5, valor: v.suenoHoras ?? atleta.habitos?.suenoHoras ?? '' })}
    <h3>¿Cómo dormiste? (1 = muy mal, 10 = muy bien)</h3>${chips({ ruta: 'calidadSueno', opciones: num(10), numerico: true, valor: v.calidadSueno })}
    <h3>¿Cómo te sientes hoy? Energía (1 = sin energía, 10 = a tope)</h3>${chips({ ruta: 'energia', opciones: num(10), numerico: true, valor: v.energia })}
    <h3>Fatiga general (1 = fresco, 10 = agotado)</h3>${chips({ ruta: 'fatiga', opciones: num(10), numerico: true, valor: v.fatiga })}
    <h3>¿Cómo están tus músculos? Dolor de entrenamientos anteriores (1 = nada, 10 = mucho)</h3>${chips({ ruta: 'dolorMuscular', opciones: num(10), numerico: true, valor: v.dolorMuscular })}
    <h3>¿Tienes dolor? (articular o una molestia que no sean agujetas)</h3>${chips({ ruta: 'dolorArticular', valor: v.dolorArticular, opciones: [{ id: 'si', etiqueta: 'Sí' }, { id: 'no', etiqueta: 'No' }] })}`;
}
export function leerChequeo(f) {
  const d = leerFormulario(f, {});
  if (!d.fatiga || !d.energia || !d.dolorMuscular) return { error: 'Responde energía, fatiga y cómo están tus músculos.' };
  if (d.calidadSueno == null) delete d.calidadSueno;
  if (d.horaDormir && d.horaDespertar) {
    const min = duracionSueno(d.horaDormir, d.horaDespertar);
    if (min < 120 || min > 960) return { error: 'Revisa las horas de dormir y despertar: el resultado no parece una noche normal.' };
    d.suenoHoras = Math.round((min / 60) * 10) / 10;
  } else { delete d.horaDormir; delete d.horaDespertar; }
  return { datos: d };
}

// Muestra en vivo cuánto durmió al escribir las horas
export function activarDuracion(f) {
  f.addEventListener('input', () => {
    const a = f.querySelector('[data-ruta="horaDormir"]')?.value, b = f.querySelector('[data-ruta="horaDespertar"]')?.value;
    const el = f.querySelector('[data-duracion]');
    if (el && a && b) el.textContent = `Dormiste aproximadamente ${textoDuracion(duracionSueno(a, b))}.`;
  });
}

export function vistaHoy(raiz, atleta, { registroHoy, sesionHoy, alGuardarChequeo, alRegenerar, alRegistrar, alVerBiblioteca, alComenzar, alReiniciar, tablero = '', sugerido = null, alIr = () => {} }) {
  const conectarTablero = () => raiz.querySelector('.tablero')?.addEventListener('click', e => { const b = e.target.closest('[data-tablero]'); if (b) alIr(b.dataset.tablero); });
  // 1) Chequeo previo
  if (!registroHoy) {
    raiz.innerHTML = `<section class="pantalla">
      ${tablero}
      <span class="paso-num">Antes de entrenar</span>
      <h1>¿Cómo te sientes hoy?</h1>
      <p class="subtitulo">Con esto decidimos el estímulo más apropiado para ti hoy.</p>
      ${sugerido ? '<p class="ayuda">🌙 Las horas y la calidad del sueño vienen de lo que registraste en "Mi sueño".</p>' : ''}
      <form id="chequeo" novalidate>${htmlChequeo(atleta, sugerido ? { suenoHoras: sugerido.horas, calidadSueno: sugerido.calidad, horaDormir: sugerido.horaDormir, horaDespertar: sugerido.horaDespertar } : null)}</form>
      <p class="error" id="error"></p>
      <div class="navegacion final"><button class="btn" id="seguir">Ver mi entrenamiento →</button></div>
    </section>`;
    const f = raiz.querySelector('#chequeo');
    activarChips(f);
    activarDuracion(f);
    conectarTablero();
    raiz.querySelector('#seguir').onclick = () => {
      const r = leerChequeo(f);
      if (r.error) { raiz.querySelector('#error').textContent = r.error; return; }
      alGuardarChequeo(r.datos);
    };
    return;
  }

  const w = sesionHoy.workout;
  const hecha = ['completada', 'incompleta'].includes(sesionHoy.estado);
  const enCurso = sesionHoy.estado === 'en_curso' && sesionHoy.ejecucion?.inicio;
  const r = sesionHoy.resumen;
  const gym = tieneGimnasio(atleta);
  const musc = Object.entries(w.musculos).filter(([g]) => NOMBRES_GRUPO[g]).sort((a, b) => b[1] - a[1]);
  const maxM = Math.max(1, ...musc.map(([, v]) => v));
  raiz.innerHTML = `<section class="pantalla">
    ${tablero}
    <span class="paso-num">Fase ${w.fase.numero} · ${esc(w.fase.nombre)}${w.periodizacion ? ` · ${esc(w.periodizacion.mesociclo)} · semana ${w.periodizacion.semana}${w.periodizacion.tipoSemana === 'descarga' ? ' (descarga)' : ''}` : ''}</span>
    <h1>🔥 Entrenamiento de hoy</h1>
    ${hecha ? `<div class="celebracion">${sesionHoy.estado === 'incompleta' ? '💾 Entrenamiento guardado' : '✅ Entrenamiento completado'}</div>
      ${r ? `<p class="ayuda">${Math.round(r.duracionSeg / 60)} min · ${r.ejercicios} ejercicios · ${r.series} series · ${r.repeticiones} repeticiones · ${r.porcentaje}% de la sesión</p>` : ''}`
      : `<div class="comenzar-hoy">
        ${enCurso ? `<button type="button" class="btn grande" id="comenzar">▶️ REANUDAR ENTRENAMIENTO</button>
          <button type="button" class="btn sec" id="reiniciar">Empezar de nuevo</button>` : '<button type="button" class="btn grande" id="comenzar">▶️ COMENZAR</button>'}
        <span class="ayuda">Modo guiado: cronómetro, series, descansos y voz. Lo que hagas se guarda y ajusta tu próximo entrenamiento.</span>
      </div>`}
    <div class="tiles">
      <div class="tile"><span class="tile-titulo">Sesión</span><span class="tile-valor">${esc(w.nombre)}</span></div>
      <div class="tile"><span class="tile-titulo">Duración</span><span class="tile-valor">${w.duracion} min</span></div>
      <div class="tile"><span class="tile-titulo">Dificultad</span><span class="tile-valor">${esc(w.dificultad)}</span></div>
      <div class="tile"><span class="tile-titulo">Lugar</span><span class="tile-valor">${w.lugar === 'gimnasio' ? 'Gimnasio' : 'Casa'}</span></div>
    </div>
    ${w.tipo === 'recuperacion' && !hecha ? `<div class="nota"><strong>🛌 DÍA DE RECUPERACIÓN</strong><p>Hoy no necesitas realizar una sesión intensa.</p>
      <p class="ayuda">La sesión de abajo es opcional (movilidad, caminata ligera y estiramientos suaves). Descansar también es parte de tu progreso.</p></div>` : ''}
    ${w.combinacion ? `<p class="objetivo-plan"><span><strong>Objetivo de tu plan:</strong> ${esc(w.combinacion.objetivo)}</span><button type="button" class="btn mini sec" id="ver-plan">🔬 Ver mi plan</button></p>` : ''}
    <p class="objetivo-sesion"><strong>Objetivo de hoy:</strong> ${esc(w.objetivo)}</p>
    <div class="nota"><strong>¿Por qué esta sesión hoy?</strong><ul>${w.razones.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
    ${w.avisos.length ? `<div class="nota precaucion"><ul>${w.avisos.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
    ${w.decisiones.length ? `<details class="decisiones"><summary>Ajustes del motor (${w.decisiones.length})</summary><ul>${w.decisiones.map(r => `<li>${esc(r)}</li>`).join('')}</ul></details>` : ''}

    ${hecha || enCurso ? '' : `<form id="opciones" class="opciones-hoy">
      <div><span class="campo-etiqueta">Tiempo de hoy</span>${chips({ ruta: 'minutos', numerico: true, valor: sesionHoy.opciones?.minutos || atleta.disponibilidad?.minutos,
        opciones: [15, 20, 30, 45, 60, 90].map(m => ({ id: m, etiqueta: `${m} min` })) })}</div>
      ${gym ? `<div><span class="campo-etiqueta">Hoy entreno en</span>${chips({ ruta: 'lugar', valor: sesionHoy.opciones?.lugar || w.lugar,
        opciones: [{ id: 'casa', etiqueta: 'Casa' }, { id: 'gimnasio', etiqueta: 'Gimnasio' }] })}</div>` : ''}
    </form>`}

    ${w.bloques.map(htmlBloque).join('')}
    ${htmlPorQueCombinacion(w.combinacion)}

    <h2>Músculos de hoy</h2>
    <div class="medidores">${musc.map(([g, v]) => `<div class="medidor"><span class="m-etiqueta">${NOMBRES_GRUPO[g]}</span>
      <span class="m-pista"><span class="m-barra" style="width:${Math.round((v / maxM) * 100)}%"></span></span><span class="m-valor">${Math.round(v)}<small> series</small></span></div>`).join('')}</div>

    ${hecha ? `<h2>Lo que cambia para la próxima</h2><ul class="razones">${((sesionHoy.mensajes || []).length ? sesionHoy.mensajes
      : ['Sin cambios: la próxima vez repetirás las mismas cargas para consolidar la técnica antes de progresar.']).map(m => `<li>${esc(m)}</li>`).join('')}</ul>`
      : enCurso ? '' : `<details class="registro-manual"><summary>¿Entrenaste sin el modo guiado? Regístralo aquí</summary>
    <p class="subtitulo">Cuéntanos cómo te fue. Con esto se ajustan tus próximas sesiones.</p>
    <form id="registro" novalidate>
      ${w.bloques.filter(b => b.formato === 'series' && !['calentamiento', 'enfriamiento'].includes(b.tipo)).flatMap(b => b.items).filter(it => it.familia).map(it => `
        <div class="pregunta"><span><strong>${esc(it.nombre)}</strong> · ${esc(it.texto || '')}</span>
        ${chips({ ruta: `ej.${it.ejercicioId}`, opciones: SENSACION_EJERCICIO })}</div>`).join('')}
      <h3>¿Cómo te fue en general?</h3>${chips({ ruta: 'sensacion', opciones: SENSACIONES })}
      <div class="pregunta"><span>¿Completaste todas las series?</span>${siNo('seriesCompletas')}</div>
      <div class="pregunta"><span>¿Completaste todas las repeticiones?</span>${siNo('repsCompletas')}</div>
      <div class="pregunta"><span>¿Tuviste problemas con algún ejercicio?</span>${siNo('problemas')}</div>
      <h3>¿Cómo estuvo tu energía? (1–10)</h3>${chips({ ruta: 'energia', opciones: num(10), numerico: true })}
      <h3>¿Cómo estuvo el esfuerzo? (1 = muy suave, 10 = máximo)</h3>${chips({ ruta: 'esfuerzo', opciones: num(10), numerico: true })}
      <div class="pregunta"><span>¿Tuviste dolor (no cansancio)?</span>${siNo('dolor')}</div>
    </form>
    <p class="error" id="error"></p>
    <div class="navegacion final">
      <button class="btn sec" id="biblioteca">Biblioteca de ejercicios</button>
      <button class="btn" id="registrar">Guardar entrenamiento</button>
    </div></details>`}
  </section>`;

  conectarTablero();
  montarIlustraciones(raiz);
  raiz.querySelector('#ver-plan')?.addEventListener('click', () => alIr('plan'));
  raiz.querySelector('#comenzar')?.addEventListener('click', alComenzar);
  raiz.querySelector('#reiniciar')?.addEventListener('click', alReiniciar);
  const op = raiz.querySelector('#opciones');
  if (op) activarChips(op, () => alRegenerar({ minutos: valorChips(op.querySelector('[data-ruta="minutos"]')), lugar: op.querySelector('[data-ruta="lugar"]') ? valorChips(op.querySelector('[data-ruta="lugar"]')) : undefined }));
  const reg = raiz.querySelector('#registro');
  if (reg) {
    activarChips(reg);
    raiz.querySelector('#biblioteca').onclick = alVerBiblioteca;
    raiz.querySelector('#registrar').onclick = () => {
      const d = leerFormulario(reg, {});
      if (!d.sensacion || !d.esfuerzo || !d.energia || !d.seriesCompletas || !d.repsCompletas || !d.dolor || !d.problemas) {
        raiz.querySelector('#error').textContent = 'Responde todas las preguntas generales.'; return;
      }
      const ejercicios = {};
      for (const [id, s] of Object.entries(d.ej || {})) if (s) ejercicios[id] = { sensacion: s, completo: s !== 'muy_dificil' && d.repsCompletas === 'si' };
      const resultado = {
        general: { sensacion: d.sensacion, seriesCompletas: d.seriesCompletas === 'si', repsCompletas: d.repsCompletas === 'si', problemas: d.problemas === 'si', energia: d.energia, esfuerzo: d.esfuerzo, dolor: d.dolor === 'si' },
        ejercicios,
      };
      if (resultado.general.dolor) aviso(MENSAJE_ALARMA.leve, 'error');
      alRegistrar(resultado);
    };
  }
  window.scrollTo(0, 0);
}
