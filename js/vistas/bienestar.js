// FASE 4 — 🧘 BIENESTAR: resumen · 💧 agua · 🌙 sueño · 🧘 recuperación · 🔔 recordatorios
// También exporta el tablero del día que se muestra en "Hoy".

import { esc, chips, activarChips, leerFormulario, campo, aviso, confirmar } from '../ui/componentes.js';
import { archivoCalendario, textoDias } from '../motor/alarmas.js';
import { BOTONES_AGUA, CLIMAS, SUDORACION, progresoAgua, barraTexto } from '../motor/hidratacion.js';
import { textoDuracion, duracionSueno, analizarSueno } from '../motor/recuperacion.js';
import { POR_QUE, AVISO_RECUPERACION } from '../datos/nutrientes.js';
import { TIPOS_SESION } from '../motor/generador.js';
import { hoyISO } from '../motor/calculos.js';
import { DIAS } from './alimentacion.js';
import { htmlQuien } from '../ui/equipo.js';
import { fmtPasos, topePasos, NOMBRE_ACTIVIDAD } from '../motor/pasos.js';
import { podometroDisponible, podometroActivo } from '../ui/podometro.js';
import * as U from '../motor/unidades.js';
import { htmlChequeo, leerChequeo, activarDuracion } from './hoy.js';

const PESTANAS = [
  { id: 'resumen', etiqueta: '📊 Resumen' }, { id: 'agua', etiqueta: '💧 Agua' }, { id: 'sueno', etiqueta: '🌙 Sueño' },
  { id: 'pasos', etiqueta: '👣 Pasos' }, { id: 'recuperacion', etiqueta: '🧘 Recuperación' }, { id: 'recordatorios', etiqueta: '🔔 Recordatorios' },
];
const porQueHtml = clave => `<details class="por-que"><summary>${esc(POR_QUE[clave].titulo)}</summary><p>${esc(POR_QUE[clave].texto)}</p></details>`;
const diaCorto = f => new Date(f + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric' });
const cerrada = s => s && ['completada', 'incompleta'].includes(s.estado);
const coma = n => String(n).replace('.', ',');

// =====================================================================
// Tablero del día (pantalla Hoy)
// =====================================================================
function textoEntreno(r) {
  const s = r.sesionHoy;
  if (cerrada(s)) return { valor: s.estado === 'completada' ? '✓ Completado' : 'Guardado', extra: TIPOS_SESION[s.workout?.tipo]?.nombre || '' };
  if (s?.workout) return { valor: s.workout.tipo === 'recuperacion' ? 'Recuperación' : TIPOS_SESION[s.workout.tipo]?.nombre || 'Listo', extra: s.estado === 'en_curso' ? 'En curso' : 'Pendiente' };
  return { valor: r.diaEntreno ? 'Por preparar' : 'Descanso', extra: r.diaEntreno ? 'Responde el chequeo' : 'Movimiento suave opcional' };
}

export function htmlTablero(r) {
  const e = textoEntreno(r);
  const rec = r.recuperacion;
  const anoche = r.sueno.anoche;
  const ct = r.contadores;
  const tarjetas = [
    { ir: 'hoy', icono: '🏋️', titulo: 'Entrenamiento', valor: e.valor, extra: e.extra },
    { ir: 'comida', icono: '🥗', titulo: 'Alimentación', valor: r.configurado ? `${r.comidas.total} comidas planificadas` : 'Configurar', extra: r.configurado ? `${r.comidas.registradas} de ${r.comidas.total} registradas` : 'Crea tu plan' },
    { ir: 'agua', icono: '💧', titulo: 'Hidratación', valor: `${r.agua.consumido} / ${r.agua.meta} ml`, extra: barraTexto(Math.round((r.agua.consumido / r.agua.meta) * 100)) },
    { ir: 'libreta', icono: '⏱️', titulo: 'Sin comer', valor: r.sinComer ? textoDuracion(r.sinComer.minutos) : '—', extra: r.sinComer ? `Última: ${r.sinComer.comida.registro?.horaComida || r.sinComer.comida.hora}` : 'Anota en tu libreta' },
    { ir: 'libreta', icono: '🍎', titulo: 'Frutas · ☕ Café', valor: `${coma(ct.frutas.porciones)} · ${coma(ct.cafe.tazas)}`, extra: `frutas (${ct.frutas.meta.min}–${ct.frutas.meta.max}) · tazas de café` },
    { ir: 'pasos', icono: '👣', titulo: 'Pasos', valor: `${fmtPasos(r.pasos.pasos)} / ${fmtPasos(r.pasos.meta)}`, extra: r.pasos.pasos ? `${coma(r.pasos.km)} km` : 'Cuenta o anota tus pasos' },
    { ir: 'sueno', icono: '🌙', titulo: 'Sueño', valor: anoche ? textoDuracion(anoche.duracionMin) : `Objetivo: ${r.sueno.meta.min}–${r.sueno.meta.max} h`, extra: anoche ? 'Anoche' : 'Registra tu noche' },
    { ir: 'recuperacion', icono: '🧘', titulo: 'Recuperación', valor: rec.puntuacion == null ? '—' : rec.etiqueta, extra: rec.puntuacion == null ? 'Responde cómo te sientes' : `${rec.puntuacion}% (orientativo)` },
    { ir: 'compras', icono: '🛒', titulo: 'Compras', valor: r.compras.pendientes == null ? 'Lista' : `${r.compras.pendientes} pendientes`, extra: r.compras.pendientes == null ? 'Créala desde tu menú' : 'Productos por comprar' },
  ];
  return `<div class="tablero">${tarjetas.map(t => `<button type="button" class="tablero-tarjeta t-${t.ir}" data-tablero="${t.ir}">
    <span class="tt-titulo">${t.icono} ${esc(t.titulo)}</span><span class="tt-valor">${esc(t.valor)}</span><span class="tt-extra">${esc(t.extra)}</span></button>`).join('')}</div>`;
}

// =====================================================================
export function vistaBienestar(raiz, atleta, d, cb) {
  const pestana = d.pestana || 'resumen';
  raiz.innerHTML = `<section class="pantalla">
    <span class="paso-num">Entrenamiento + alimentación + hidratación + sueño + descanso = progreso</span>
    <h1>🧘 Bienestar y recuperación</h1>
    <nav class="pestanas" aria-label="Secciones de bienestar">${PESTANAS.map(p => `<button type="button" class="chip${p.id === pestana ? ' activo' : ''}" data-pestana="${p.id}">${p.etiqueta}</button>`).join('')}</nav>
    <div id="contenido"></div>
  </section>`;
  raiz.querySelector('.pestanas').addEventListener('click', e => { const b = e.target.closest('[data-pestana]'); if (b) cb.alPestana(b.dataset.pestana); });
  const cont = raiz.querySelector('#contenido');
  ({ resumen: pestanaResumen, agua: pestanaAgua, sueno: pestanaSueno, pasos: pestanaPasos, recuperacion: pestanaRecuperacion, recordatorios: pestanaRecordatorios })[pestana](cont, atleta, d, cb);
  window.scrollTo(0, 0);
}

function barrasSemana(lista, valor, maximo, etiqueta) {
  return `<div class="barras-semana">${lista.map(x => `<div class="bs-col"><span class="bs-valor">${esc(etiqueta(x))}</span>
    <span class="bs-pista"><span class="bs-barra" style="height:${Math.max(2, Math.min(100, (valor(x) / maximo) * 100))}%"></span></span><span class="bs-dia">${esc(diaCorto(x.fecha))}</span></div>`).join('')}</div>`;
}

// =====================================================================
// 📊 RESUMEN del día y de la semana
// =====================================================================
function pestanaResumen(cont, atleta, d) {
  const r = d.resumenDia, s = d.resumenSemana;
  const ct = r.contadores;
  cont.innerHTML = `
    <h2>📊 Resumen de hoy</h2>
    <div class="resumen-lista">
      <div class="rl-fila"><span>🏋️ Entrenamiento</span><strong>${esc(textoEntreno(r).valor)}</strong></div>
      <div class="rl-fila"><span>💧 Agua</span><strong>${r.agua.consumido} / ${r.agua.meta} ml <small>(orientativo)</small></strong></div>
      <div class="rl-fila"><span>🥗 Alimentación</span><strong>${r.configurado ? `${r.comidas.registradas} / ${r.comidas.total} comidas registradas` : 'Sin configurar'}</strong></div>
      <div class="rl-fila"><span>🍎 Frutas</span><strong>${coma(ct.frutas.porciones)} porciones</strong></div>
      <div class="rl-fila"><span>☕ Café</span><strong>${coma(ct.cafe.tazas)} tazas · ≈ ${ct.cafe.cafeina} mg</strong></div>
      <div class="rl-fila"><span>👣 Pasos</span><strong>${fmtPasos(r.pasos.pasos)} · ${coma(r.pasos.km)} km</strong></div>
      <div class="rl-fila"><span>🌙 Sueño</span><strong>${r.sueno.anoche ? textoDuracion(r.sueno.anoche.duracionMin) : 'Sin registrar'}</strong></div>
      <div class="rl-fila"><span>🧘 Recuperación</span><strong>${r.recuperacion.puntuacion == null ? '—' : `${r.recuperacion.puntuacion}% · ${esc(r.recuperacion.etiqueta)}`}</strong></div>
    </div>
    ${d.consejos.length ? `<h3>Para hoy</h3><ul class="razones">${d.consejos.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    <h2>📈 Resumen semanal</h2>
    <p class="ayuda">Últimos 7 días.</p>
    <div class="tiles">
      <div class="tile"><span class="tile-titulo">Entrenamiento</span><span class="tile-valor">${s.entrenamientos.hechos} / ${s.entrenamientos.plan}</span><span class="tile-extra">${s.entrenamientos.minutos} min en total</span></div>
      <div class="tile"><span class="tile-titulo">Hidratación</span><span class="tile-valor">${s.hidratacion.pct}%</span><span class="tile-extra">promedio de tu meta</span></div>
      <div class="tile"><span class="tile-titulo">Comidas</span><span class="tile-valor">${s.comidas.registradas} / ${s.comidas.planificadas}</span><span class="tile-extra">${s.comidas.pct}% registradas</span></div>
      <div class="tile"><span class="tile-titulo">Sueño</span><span class="tile-valor">${s.sueno.promedioMin ? textoDuracion(s.sueno.promedioMin) : '—'}</span><span class="tile-extra">promedio de ${s.sueno.noches} ${s.sueno.noches === 1 ? 'noche' : 'noches'}</span></div>
      <div class="tile"><span class="tile-titulo">Frutas</span><span class="tile-valor">${coma(s.frutas.promedio)}/día</span><span class="tile-extra">${s.frutas.dias} días con 2 o más</span></div>
      <div class="tile"><span class="tile-titulo">Café</span><span class="tile-valor">${coma(s.cafe.tazas)}/día</span><span class="tile-extra">≈ ${s.cafe.cafeina} mg de cafeína al día</span></div>
      <div class="tile"><span class="tile-titulo">Azúcar añadida</span><span class="tile-valor">${coma(s.azucar.cucharaditas)}</span><span class="tile-extra">cucharaditas al día (estimado)</span></div>
      <div class="tile"><span class="tile-titulo">Descanso</span><span class="tile-valor">${s.descanso.dias} días</span><span class="tile-extra">sin entrenamiento</span></div>
      <div class="tile"><span class="tile-titulo">Peso</span><span class="tile-valor">${s.peso ? U.fmtPeso(s.peso.actual, atleta) : '—'}</span><span class="tile-extra">${s.peso?.cambio != null ? `${U.fmtCambioPeso(s.peso.cambio, atleta)} en la semana` : 'Regístralo en Perfil'}</span></div>
      <div class="tile"><span class="tile-titulo">Cintura</span><span class="tile-valor">${s.cintura ? U.fmtMedida(s.cintura.actual, atleta) : '—'}</span><span class="tile-extra">${s.cintura?.cambio != null ? `${s.cintura.cambio > 0 ? '+' : s.cintura.cambio < 0 ? '−' : ''}${U.fmtMedida(Math.abs(s.cintura.cambio), atleta)} desde la primera medición` : 'Medidas en Perfil'}</span></div>
      <div class="tile"><span class="tile-titulo">Progreso</span><span class="tile-valor">Fase ${s.fase}</span><span class="tile-extra">del motor de entrenamiento</span></div>
      <div class="tile"><span class="tile-titulo">Vitaminas</span><span class="tile-valor">${s.suplementos.posibles ? `${s.suplementos.tomados} / ${s.suplementos.posibles}` : '—'}</span><span class="tile-extra">tomas marcadas</span></div>
    </div>
    <h3>💧 Agua por día (% de la meta)</h3>${barrasSemana(s.hidratacion.porDia, x => x.pct, 100, x => `${x.pct}%`)}
    <h3>🌙 Sueño por noche</h3>${barrasSemana(s.sueno.porDia, x => x.min, 600, x => (x.min ? textoDuracion(x.min).replace(' min', '') : '—'))}
    <details class="por-que"><summary>¿Cómo se conecta todo?</summary>
      <p>Perfil → objetivo → plan de entrenamiento → entrenamiento realizado → alimentación → hidratación → sueño → recuperación → retroalimentación → adaptación del siguiente entrenamiento.</p>
      <p>Si duermes poco, tienes mucha fatiga o dolor, el motor propone una sesión más ligera o de recuperación. Si descansas bien y completas tus sesiones, sigue la progresión planificada.</p></details>`;
}

// =====================================================================
// 💧 AGUA
// =====================================================================
function pestanaAgua(cont, atleta, d, cb) {
  const a = d.agua;
  const pr = progresoAgua(a.consumido, a.meta.ml);
  cont.innerHTML = `<h2>💧 Hidratación</h2>${htmlQuien('nutricion', { texto: 'Yo llevo la cuenta de tu agua.' })}
    <div class="agua-panel">
      <div><span class="tile-titulo">${a.meta.maximo ? 'Límite de líquidos' : a.meta.por ? 'Meta de tu nutrióloga' : 'Objetivo orientativo'}</span><span class="agua-num">${a.meta.ml} ml</span></div>
      <div><span class="tile-titulo">Consumido</span><span class="agua-num">${a.consumido} ml</span></div>
      <div class="agua-prog"><span class="tile-titulo">Progreso</span><code class="barra-texto" aria-hidden="true">${pr.barra}</code> <strong>${pr.pct}%</strong>
        <div class="progreso"><div class="barra" style="width:${Math.min(100, pr.pct)}%"></div></div></div>
    </div>
    ${a.meta.maximo ? `<p class="nota precaucion">🩺 ${esc(a.meta.por)} te indicó no pasar de ${a.meta.ml} ml de líquidos al día. Cuenta todo lo que bebes: agua, café, jugos, leche y sopas.</p>` : ''}
    ${pr.pct >= 100 ? (a.meta.maximo ? '<p class="nota peligro">Llegaste a tu límite de líquidos de hoy: no bebas más, salvo que tu médico te diga otra cosa.</p>' : '<p class="nota exito">💧 ¡Llegaste a tu meta de hoy! Sigue bebiendo según tu sed.</p>') : ''}
    <h3>¿Tomaste agua? ¿Cuánto?</h3>
    <div class="botones-fila">${BOTONES_AGUA.map(ml => `<button type="button" class="btn" data-ml="${ml}">+${ml} ml</button>`).join('')}
      <button type="button" class="btn sec" id="agua-personal">Personalizado</button></div>
    <form id="agua-form" class="fila" hidden novalidate>${campo({ ruta: 'ml', etiqueta: 'Cantidad', tipo: 'number', unidad: 'ml', min: 10, max: 3000 })}
      <div class="fila-accion"><button type="button" class="btn mini" id="agua-guardar">Registrar</button></div></form>
    <h3>Registros de hoy</h3>
    ${a.logs.length ? `<ul class="registros-agua">${a.logs.map(l => `<li><span>${esc(l.hora)}</span><strong>${l.ml} ml</strong><button type="button" class="btn mini sec" data-borrar="${esc(l.id)}" aria-label="Eliminar registro">✕</button></li>`).join('')}</ul>` : '<p class="ayuda">Todavía no has registrado agua hoy.</p>'}
    <details class="decisiones"><summary>¿Cómo se calcula tu meta?</summary><ul>${a.meta.explicaciones.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="ayuda">No todos necesitamos lo mismo: la meta cambia con tu peso, tu actividad, el entrenamiento del día, el calor y lo que sudas.</p></details>
    <h3>Ajustes</h3>
    <form id="agua-cfg" novalidate>
      <span class="campo-etiqueta">Clima donde vives o entrenas</span>${chips({ ruta: 'clima', valor: a.cfg.clima, opciones: CLIMAS })}
      <span class="campo-etiqueta">Sudoración</span>${chips({ ruta: 'sudoracion', valor: a.cfg.sudoracion, opciones: SUDORACION })}
      ${a.meta.por ? `<p class="ayuda">Tu meta de agua la puso ${esc(a.meta.por)}.</p>` : campo({ ruta: 'personalizadoMl', etiqueta: 'Meta personalizada (opcional; vacía usa la calculada)', tipo: 'number', unidad: 'ml', valor: a.cfg.personalizadoMl })}
      <div class="acciones izq"><button type="button" class="btn mini" id="agua-cfg-guardar">Guardar ajustes</button></div>
    </form>
    ${porQueHtml('hidratarse')}`;
  cont.querySelectorAll('[data-ml]').forEach(b => { b.onclick = () => cb.alAgua(Number(b.dataset.ml)); });
  const f = cont.querySelector('#agua-form');
  cont.querySelector('#agua-personal').onclick = () => { f.hidden = false; f.querySelector('input').focus(); };
  cont.querySelector('#agua-guardar').onclick = () => {
    const { ml } = leerFormulario(f, {});
    if (!ml || ml < 10 || ml > 3000) return aviso('Escribe una cantidad entre 10 y 3000 ml', 'error');
    cb.alAgua(ml);
  };
  cont.querySelector('.registros-agua')?.addEventListener('click', async e => {
    const b = e.target.closest('[data-borrar]');
    if (b && await confirmar('¿Eliminar este registro de agua?')) cb.alBorrarAgua(b.dataset.borrar);
  });
  const fc = cont.querySelector('#agua-cfg');
  activarChips(fc);
  cont.querySelector('#agua-cfg-guardar').onclick = () => {
    const r = leerFormulario(fc, {});
    cb.alConfigAgua({ ...a.cfg, clima: r.clima || 'calor', sudoracion: r.sudoracion || 'media', personalizadoMl: a.meta.por ? a.cfg.personalizadoMl ?? null : r.personalizadoMl || null });
  };
}

// =====================================================================
// 🌙 SUEÑO
// =====================================================================
function pestanaSueno(cont, atleta, d, cb) {
  const m = d.sueno.meta;
  const logs = d.sueno.logs;
  const hoy = hoyISO();
  const anoche = logs.find(l => l.fecha === hoy && l.duracionMin);
  const ult = logs.filter(l => l.duracionMin).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 14);
  const enCurso = d.sueno.enCurso;
  const an = analizarSueno(logs, m);
  cont.innerHTML = `<h2>🌙 Mi sueño</h2>${htmlQuien('descanso', { texto: 'Soy Luis: te ayudo a dormir mejor.' })}
    <div class="botones-fila botones-sueno">
      <button type="button" class="btn" id="me-duermo">🌙 Me voy a dormir</button>
      <button type="button" class="btn sec" id="me-desperte"${enCurso ? '' : ' disabled'}>☀️ Me desperté</button>
    </div>
    <p class="ayuda">${enCurso ? `Anotado: te fuiste a dormir a las <strong>${esc(enCurso.horaDormir)}</strong>. Al levantarte, pulsa "Me desperté".` : 'Pulsa "Me voy a dormir" al acostarte y "Me desperté" al levantarte: la app guarda las horas exactas y te monitorea.'}</p>
    ${anoche ? `<p class="destacado">Anoche dormiste aproximadamente <strong>${esc(textoDuracion(anoche.duracionMin))}</strong>${anoche.calidad ? ` · calidad ${anoche.calidad}/10` : ''}${anoche.despertares != null ? ` · ${anoche.despertares} ${anoche.despertares === 1 ? 'despertar' : 'despertares'}` : ''}.</p>` : ''}
    <p class="ayuda">Objetivo: ${m.min}–${m.max} horas por noche (referencia para adultos).</p>
    <details class="registro-manual"${anoche ? '' : ' open'}><summary>✏️ Escribir o corregir la noche de hoy</summary>
      <form id="sueno-form" novalidate>
        <div class="fila">${campo({ ruta: 'horaDormir', etiqueta: 'Hora de dormir', tipo: 'time', valor: anoche?.horaDormir || enCurso?.horaDormir || m.horaDormir })}
          ${campo({ ruta: 'horaDespertar', etiqueta: 'Hora de despertar', tipo: 'time', valor: anoche?.horaDespertar || m.horaDespertar })}</div>
        <p class="ayuda" id="duracion"></p>
        <span class="campo-etiqueta">Calidad (1 = muy mala, 10 = excelente)</span>${chips({ ruta: 'calidad', numerico: true, valor: anoche?.calidad, opciones: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, etiqueta: String(i + 1) })) })}
        <span class="campo-etiqueta">¿Cuántas veces te despertaste?</span>${chips({ ruta: 'despertares', numerico: true, valor: anoche?.despertares, opciones: [0, 1, 2, 3].map(n => ({ id: n, etiqueta: n === 3 ? '3 o más' : String(n) })) })}
        <div class="acciones izq"><button type="button" class="btn mini" id="sueno-guardar">Guardar mi noche</button></div>
      </form></details>

    <h2>🔎 ¿Dónde estás fallando?</h2>
    ${!an.suficiente ? `<p class="ayuda">Registra al menos 3 noches para ver el análisis (llevas ${an.noches}).</p>` : `
      <div class="tiles">
        <div class="tile"><span class="tile-titulo">Duermes</span><span class="tile-valor">${esc(textoDuracion(an.promedios.duracion))}</span><span class="tile-extra">promedio de ${an.noches} noches</span></div>
        <div class="tile"><span class="tile-titulo">Te acuestas</span><span class="tile-valor">${esc(an.promedios.acostarse)}</span><span class="tile-extra">objetivo ${esc(m.horaDormir)}</span></div>
        <div class="tile"><span class="tile-titulo">Despiertas</span><span class="tile-valor">${esc(an.promedios.despertar)}</span><span class="tile-extra">objetivo ${esc(m.horaDespertar)}</span></div>
        <div class="tile"><span class="tile-titulo">Noches cortas</span><span class="tile-valor">${an.promedios.cortas}</span><span class="tile-extra">menos de ${m.min} h</span></div>
      </div>
      ${an.hallazgos.length ? `<ul class="hallazgos">${an.hallazgos.map(h => `<li><span class="h-icono">${h.icono}</span><span><strong>${esc(h.texto)}</strong><br><span class="ayuda">💡 ${esc(h.consejo)}</span></span></li>`).join('')}</ul>`
        : '<p class="nota exito">¡Bien! No vemos fallos importantes en tu sueño de estos días.</p>'}
      ${an.bien.length ? `<p class="ayuda">Lo que haces bien: ${esc(an.bien.join(' '))}</p>` : ''}`}
    ${ult.length ? `<h3>Últimas noches</h3>
      <table class="tabla-sueno"><thead><tr><th>Noche</th><th>Dormir</th><th>Despertar</th><th>Duración</th><th>Calidad</th></tr></thead>
      <tbody>${ult.slice(0, 7).map(l => `<tr class="${l.duracionMin < m.min * 60 ? 'corta' : ''}"><td>${esc(diaCorto(l.fecha))}</td><td>${esc(l.horaDormir)}</td><td>${esc(l.horaDespertar)}</td><td>${esc(textoDuracion(l.duracionMin))}</td><td>${l.calidad ? `${l.calidad}/10` : '—'}</td></tr>`).join('')}</tbody></table>` : ''}

    <h3>⏰ Horario y recordatorio</h3>
    <form id="meta-sueno" novalidate>
      <div class="fila">${campo({ ruta: 'horaDormir', etiqueta: 'Hora objetivo para dormir', tipo: 'time', valor: m.horaDormir })}
        ${campo({ ruta: 'horaDespertar', etiqueta: 'Hora objetivo para despertar', tipo: 'time', valor: m.horaDespertar })}</div>
      <span class="campo-etiqueta">Recordatorio</span>${chips({ ruta: 'activo', valor: m.recordatorio?.activo ? 'si' : 'no', opciones: [{ id: 'si', etiqueta: 'Activado' }, { id: 'no', etiqueta: 'Desactivado' }] })}
      <span class="campo-etiqueta">Avisarme antes</span>${chips({ ruta: 'minutosAntes', numerico: true, valor: m.recordatorio?.minutosAntes || 60, opciones: [30, 60, 90].map(n => ({ id: n, etiqueta: `${n} min` })) })}
      <span class="campo-etiqueta">Modo silencioso (aviso sin sonido)</span>${chips({ ruta: 'silencioso', valor: m.recordatorio?.silencioso ? 'si' : 'no', opciones: [{ id: 'si', etiqueta: 'Sí' }, { id: 'no', etiqueta: 'No' }] })}
      <span class="campo-etiqueta">Días</span>${chips({ ruta: 'dias', multi: true, numerico: true, valor: m.recordatorio?.dias || [], opciones: DIAS })}
      <div class="acciones izq"><button type="button" class="btn mini" id="meta-guardar">Guardar horario</button></div>
    </form>
    <p class="ayuda">🌙 "En ${m.recordatorio?.minutosAntes || 60} minutos comienza tu horario de descanso." y luego "Es momento de comenzar tu rutina de sueño."</p>
    ${porQueHtml('dormir')}`;
  cont.querySelector('#me-duermo').onclick = cb.alMeDuermo;
  cont.querySelector('#me-desperte').onclick = cb.alMeDesperte;
  const f = cont.querySelector('#sueno-form');
  activarChips(f);
  const dur = () => {
    const r = leerFormulario(f, {});
    const min = duracionSueno(r.horaDormir, r.horaDespertar);
    cont.querySelector('#duracion').textContent = min ? `Duración aproximada: ${textoDuracion(min)}` : '';
  };
  f.addEventListener('input', dur); dur();
  cont.querySelector('#sueno-guardar').onclick = () => {
    const r = leerFormulario(f, {});
    if (!r.horaDormir || !r.horaDespertar) return aviso('Indica la hora de dormir y de despertar', 'error');
    cb.alSueno({ fecha: hoy, horaDormir: r.horaDormir, horaDespertar: r.horaDespertar, calidad: r.calidad, despertares: r.despertares });
  };
  const fm = cont.querySelector('#meta-sueno');
  activarChips(fm);
  cont.querySelector('#meta-guardar').onclick = () => {
    const r = leerFormulario(fm, {});
    cb.alMetaSueno({ ...m, horaDormir: r.horaDormir, horaDespertar: r.horaDespertar,
      recordatorio: { activo: r.activo === 'si', minutosAntes: r.minutosAntes || 60, silencioso: r.silencioso === 'si', dias: r.dias || [] } });
  };
}

// =====================================================================
// 🧘 RECUPERACIÓN
// =====================================================================
function pestanaRecuperacion(cont, atleta, d, cb) {
  const rec = d.recuperacion;
  const s = d.sesionHoy;
  const descanso = s?.workout?.tipo === 'recuperacion' || (!s && !d.resumenDia.diaEntreno) || rec.nivel === 'baja';
  const sug = d.sugerido;
  cont.innerHTML = `<h2>🧘 Recuperación</h2>${htmlQuien('descanso', { texto: 'Te digo si hoy conviene apretar o descansar.' })}
    <div class="recup-panel n-${rec.nivel}">
      <span class="tile-titulo">Recuperación</span>
      <span class="recup-num">${rec.puntuacion == null ? '—' : `${rec.puntuacion}%`}</span>
      <span class="recup-etq">${esc(rec.etiqueta)}</span>
      <p>${esc(rec.recomendacion)}</p>
      <p class="ayuda">${esc(AVISO_RECUPERACION)}</p>
    </div>
    <div class="medidores">${rec.componentes.map(c => `<div class="medidor"><span class="m-etiqueta">${esc(c.nombre)}<br><small class="ayuda">${esc(c.texto)}</small></span>
      <span class="m-pista">${c.valor == null ? '' : `<span class="m-barra" style="width:${Math.max(2, c.valor)}%"></span>`}</span><span class="m-valor">${c.valor == null ? '—' : c.valor}<small>${c.valor == null ? '' : '/100'}</small></span></div>`).join('')}</div>
    ${descanso ? `<div class="nota"><strong>🛌 DÍA DE RECUPERACIÓN</strong><p>Hoy no necesitas realizar una sesión intensa.</p>
      <p>Si te apetece, de forma opcional:</p><ul><li>Caminata ligera de 20–30 minutos</li><li>5–10 minutos de movilidad</li><li>Estiramientos suaves</li></ul>
      <p class="ayuda">Descansar también es parte del plan: no hace falta convertir este día en un entrenamiento.</p></div>` : ''}
    ${d.registroHoy ? `<p class="ayuda">✓ Ya respondiste cómo te sientes hoy. Si cambió algo (por ejemplo, apareció un dolor), puedes actualizarlo.</p>
      <details class="registro-manual"><summary>Actualizar cómo me siento</summary><form id="chequeo" novalidate>${htmlChequeo(atleta, d.registroHoy)}</form>
      <p class="error" id="error"></p><div class="acciones izq"><button type="button" class="btn mini" id="chequeo-guardar">Guardar</button></div></details>`
    : `<h3>¿Cómo te sientes hoy?</h3><p class="ayuda">Tus respuestas informan al motor de entrenamiento: con fatiga alta, poco sueño o dolor propone una sesión más ligera o de recuperación.</p>
      <form id="chequeo" novalidate>${htmlChequeo(atleta, sug ? { suenoHoras: sug.horas, calidadSueno: sug.calidad, horaDormir: sug.horaDormir, horaDespertar: sug.horaDespertar } : null)}</form>
      <p class="error" id="error"></p><div class="acciones izq"><button type="button" class="btn mini" id="chequeo-guardar">Guardar</button></div>`}
    ${porQueHtml('descansar')}${porQueHtml('dormir')}`;
  const f = cont.querySelector('#chequeo');
  activarChips(f);
  activarDuracion(f);
  cont.querySelector('#chequeo-guardar').onclick = () => {
    const r = leerChequeo(f);
    if (r.error) { cont.querySelector('#error').textContent = r.error; return; }
    cb.alChequeo(r.datos);
  };
}

// =====================================================================
// ⏰ ALARMAS CON LA APP CERRADA (calendario del teléfono)
// =====================================================================
function htmlAlarmas(alarmas = []) {
  return `<section class="alarmas">
    <h3>⏰ Alarmas aunque la app esté cerrada</h3>
    <p>Pulsa el botón y abre el archivo: tus alarmas quedan en el <strong>calendario del teléfono</strong>, que las hace sonar aunque LA FORJA esté cerrada y el teléfono bloqueado.</p>
    ${alarmas.length ? `<ul class="lista-alarmas">${alarmas.map(a => `<li><strong>${esc(a.hora)}</strong> ${esc(a.titulo)} <span class="ayuda">· ${esc(textoDias(a.dias))}${a.avisos.some(m => m > 0) ? ` · aviso ${a.avisos.filter(m => m > 0).join(' y ')} min antes` : ''}</span></li>`).join('')}</ul>`
      : '<p class="ayuda">No hay alarmas activas: actívalas abajo, configura tu alimentación (horario de comidas y días de entrenamiento) y el horario de sueño.</p>'}
    <div class="acciones izq"><button type="button" class="btn" id="descargar-alarmas"${alarmas.length ? '' : ' disabled'}>⏰ Poner estas alarmas en mi teléfono</button></div>
    <details class="decisiones"><summary>Cómo se instalan</summary>
      <p><strong>iPhone:</strong> pulsa el botón, toca el archivo descargado y elige <em>Añadir todo</em>. Quedan en tu Calendario con su aviso.</p>
      <p><strong>Android:</strong> pulsa el botón y abre el archivo con tu app de Calendario (en Samsung: Calendario → Importar). Si no se abre, hazlo una vez desde la computadora: Google Calendar → Configuración → Importar, y elige el archivo; se pasa solo a tu teléfono. Comprueba que tu calendario tenga activadas las notificaciones.</p>
      <p class="ayuda">Si cambias tus horarios, vuelve a pulsar el botón. Si alguna alarma te sobra, bórrala desde el calendario.</p>
    </details>
  </section>`;
}
function activarAlarmas(cont, alarmas = []) {
  cont.querySelector('#descargar-alarmas')?.addEventListener('click', () => {
    const blob = new Blob([archivoCalendario(alarmas)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'alarmas-la-forja.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
}

// =====================================================================
// 🔔 RECORDATORIOS
// =====================================================================
function pestanaRecordatorios(cont, atleta, d, cb) {
  const c = d.recordatorios.config;
  const permiso = d.permiso;
  const activo = (ruta, v) => chips({ ruta, valor: v ? 'si' : 'no', opciones: [{ id: 'si', etiqueta: 'Activado' }, { id: 'no', etiqueta: 'Desactivado' }] });
  const nube = d.avisos;
  cont.innerHTML = `<h2>🔔 Recordatorios</h2>
    <div class="nota" id="rec-nube"><h3>📲 Avisos con la app cerrada</h3>
      ${nube === 'activos' ? '<p>✓ Activados en este teléfono. Te llegan aunque LA FORJA esté cerrada: a la hora de cada comida, del agua, del entreno y de dormir. La alarma no se calla hasta que toques <strong>✅ Ya lo hice</strong> o <strong>🔕 Apagar</strong>, y vuelve a sonar si no anotas la actividad.</p>'
        : nube === 'instalar' ? '<p>En iPhone primero instala LA FORJA: toca Compartir ⬆️ → <strong>Agregar a inicio</strong>, ábrela desde ese ícono y vuelve aquí.</p>'
        : nube === 'no_disponible' ? '<p>Este teléfono no permite avisos con la app cerrada (por ejemplo, iPhone con iOS 15). Usa las alarmas del calendario de abajo.</p>'
        : nube === 'bloqueados' ? '<p>Las notificaciones de LA FORJA están bloqueadas. Permítelas en los ajustes del teléfono (Notificaciones → LA FORJA o el navegador) y vuelve aquí.</p>'
        : '<p>Actívalos para que el teléfono te recuerde cada actividad aunque LA FORJA esté cerrada. Se repiten hasta que la marques.</p><div class="acciones izq"><button type="button" class="btn mini" id="rec-activar">📲 Activar avisos</button></div>'}
    </div>
    ${htmlAlarmas(d.alarmas)}
    <div class="nota">${permiso === 'granted' ? '✓ Las notificaciones del sistema están permitidas.'
      : permiso === 'denied' ? 'Las notificaciones están bloqueadas en este navegador. Los avisos se mostrarán dentro de la app cuando esté abierta. Para permitirlas, cámbialo en los ajustes del navegador.'
      : permiso === 'no_disponible' ? 'Este navegador no permite notificaciones: los avisos se mostrarán dentro de la app.'
      : 'Permite las notificaciones para recibir los avisos aunque estés en otra pantalla.'}
      ${permiso === 'default' ? '<div class="acciones izq"><button type="button" class="btn mini" id="permiso">🔔 Permitir notificaciones</button></div>' : ''}
      <p class="ayuda">Con LA FORJA abierta los avisos también aparecen dentro de la app.</p></div>
    <form id="rec-form" novalidate>
      <h3>⏰ Alarma</h3><p class="ayuda">A la hora de cada comida, del entreno y de dormir, suena y vibra cada minuto hasta que toques "✅ Ya lo hice" o "🔕 Apagar". Si la apagas sin anotar la actividad, vuelve a sonar.</p>
      ${activo('avisos.alarma', c.avisos?.alarma !== false)}
      <span class="campo-etiqueta">Si la apago sin anotar, que vuelva a sonar en</span>${chips({ ruta: 'avisos.repetirMin', numerico: true, valor: c.avisos?.repetirMin || 15, opciones: [10, 15, 20, 30].map(n => ({ id: n, etiqueta: `${n} min` })) })}
      <span class="campo-etiqueta">El agua también como alarma</span>${chips({ ruta: 'avisos.aguaAlarma', valor: c.avisos?.aguaAlarma ? 'si' : 'no', opciones: [{ id: 'si', etiqueta: 'Sí' }, { id: 'no', etiqueta: 'No, aviso normal' }] })}
      <h3>🏋️ Entrenamiento</h3><p class="ayuda">"Tu entrenamiento de hoy está listo." — los días de entrenamiento.</p>
      ${activo('entreno.activo', c.entreno.activo)}
      <span class="campo-etiqueta">Minutos antes de tu hora de entrenamiento</span>${chips({ ruta: 'entreno.minutosAntes', numerico: true, valor: c.entreno.minutosAntes, opciones: [15, 30, 60].map(n => ({ id: n, etiqueta: `${n} min` })) })}
      <h3>💧 Agua</h3><p class="ayuda">"Recuerda hidratarte." — con botones para responder cuánto tomaste; más seguido alrededor del entrenamiento; no avisa si acabas de registrar agua o ya llegaste a tu meta.</p>
      ${activo('agua.activo', c.agua.activo)}
      <span class="campo-etiqueta">Cada</span>${chips({ ruta: 'agua.cadaMin', numerico: true, valor: c.agua.cadaMin, opciones: [60, 90, 120, 180].map(n => ({ id: n, etiqueta: n < 120 ? `${n} min` : `${n / 60} h` })) })}
      <div class="fila">${campo({ ruta: 'agua.desde', etiqueta: 'Desde', tipo: 'time', valor: c.agua.desde })}${campo({ ruta: 'agua.hasta', etiqueta: 'Hasta', tipo: 'time', valor: c.agua.hasta })}</div>
      <span class="campo-etiqueta">Más recordatorios cerca del entrenamiento</span>${chips({ ruta: 'agua.entreno', valor: c.agua.entreno ? 'si' : 'no', opciones: [{ id: 'si', etiqueta: 'Sí' }, { id: 'no', etiqueta: 'No' }] })}
      <h3>🥗 Comidas</h3><p class="ayuda">"Tu próxima comida está programada." — según el horario de tus comidas (Alimentación → Preferencias).</p>
      ${activo('comida.activo', c.comida.activo)}
      <span class="campo-etiqueta">Avisar</span>${chips({ ruta: 'comida.minutosAntes', numerico: true, valor: c.comida.minutosAntes, opciones: [0, 10, 30].map(n => ({ id: n, etiqueta: n ? `${n} min antes` : 'A la hora' })) })}
      <h3>🧘 Recuperación</h3><p class="ayuda">"Hoy la recuperación es parte de tu progreso." — los días de descanso.</p>
      ${activo('recuperacion.activo', c.recuperacion.activo)}
      <div class="fila">${campo({ ruta: 'recuperacion.hora', etiqueta: 'Hora', tipo: 'time', valor: c.recuperacion.hora })}</div>
      <p class="ayuda">🌙 El recordatorio de sueño se configura en la pestaña Sueño, y el de vitaminas en Alimentación → Suplementos.</p>
      <div class="acciones izq"><button type="button" class="btn mini" id="rec-guardar">Guardar recordatorios</button>
        <button type="button" class="btn mini sec" id="rec-probar">Probar un aviso</button></div>
    </form>`;
  const f = cont.querySelector('#rec-form');
  activarChips(f);
  cont.querySelector('#permiso')?.addEventListener('click', cb.alPermiso);
  cont.querySelector('#rec-probar').onclick = cb.alProbar;
  cont.querySelector('#rec-activar')?.addEventListener('click', e => { e.currentTarget.disabled = true; cb.alActivarAvisos(); });
  activarAlarmas(cont, d.alarmas);
  cont.querySelector('#rec-guardar').onclick = () => {
    const r = leerFormulario(f, {});
    const si = v => v === 'si';
    cb.alGuardarRecordatorios({
      entreno: { activo: si(r.entreno.activo), minutosAntes: r.entreno.minutosAntes ?? 30 },
      agua: { activo: si(r.agua.activo), cadaMin: r.agua.cadaMin || 90, desde: r.agua.desde || '08:00', hasta: r.agua.hasta || '21:00', entreno: si(r.agua.entreno) },
      comida: { activo: si(r.comida.activo), minutosAntes: r.comida.minutosAntes ?? 10 },
      recuperacion: { activo: si(r.recuperacion.activo), hora: r.recuperacion.hora || '08:30' },
      avisos: { repetirMin: r.avisos?.repetirMin || 15, alarma: si(r.avisos?.alarma), aguaAlarma: si(r.avisos?.aguaAlarma) },
    });
  };
}

// =====================================================================
// 👣 PASOS
// =====================================================================
function pestanaPasos(cont, atleta, d, cb) {
  const p = d.resumenDia.pasos;
  const pct = Math.min(100, Math.round((p.pasos / p.meta) * 100));
  const contando = podometroActivo();
  cont.innerHTML = `
    <h2>👣 Pasos de hoy</h2>
    ${htmlQuien('cardio', { texto: 'Caminar también es ejercicio. Cada paso ayuda a tu corazón y a tu peso.' })}
    <div class="pasos-hoy">
      <div class="ph-anillo${pct >= 100 ? ' logrado' : ''}" style="--pct:${pct}"><strong id="ph-num">${fmtPasos(p.pasos)}</strong><small>de ${fmtPasos(p.meta)}</small>${pct >= 100 ? '<span class="ph-logro">🎉 ¡Meta lograda!</span>' : ''}</div>
      <div class="ph-datos">
        <span>🔥 <strong>${p.kcal}</strong> calorías aprox.</span>
        <span>📏 <strong>${coma(p.km)}</strong> km</span>
        <span>⏱️ ≈ <strong>${p.minutos}</strong> minutos</span>
      </div>
    </div>
    <p class="ayuda">Estas calorías ya están contadas en tu plan de comidas: no hace falta comer más por haber caminado. Si te duelen las rodillas o los pies, mejor varios paseos cortos que uno largo.</p>
    ${pct >= 100 ? '<p class="ayuda">Llegar a la meta cuenta como día activo en tu reto.</p>' : ''}
    ${p.sugerida && p.sugerida !== atleta.habitos?.actividad ? `<div class="nota">Tus pasos de las últimas 2 semanas corresponden a una actividad <strong>${esc(NOMBRE_ACTIVIDAD[p.sugerida])}</strong> (tú marcaste ${esc(NOMBRE_ACTIVIDAD[atleta.habitos?.actividad] || 'otra')}). Con eso se ajustan tus calorías del plan de comidas.
      <div class="acciones"><button type="button" class="btn mini" id="ph-actividad">Actualizar mi actividad</button></div></div>` : ''}
    <h3>Contar con LA FORJA</h3>
    ${podometroDisponible() ? `<p class="ayuda">Lleva el teléfono en el bolsillo o en la mano con LA FORJA abierta. Si cierras LA FORJA o se apaga la pantalla, deja de contar. Para el total del día, copia abajo los pasos que marca tu teléfono.</p>
      <button type="button" class="btn${contando ? ' sec' : ''}" id="ph-contar">${contando ? '⏹️ Dejar de contar' : '▶️ Contar mis pasos ahora'}</button>`
      : '<p class="ayuda">Este aparato no puede contar pasos. Copia abajo los pasos de tu teléfono o tu reloj.</p>'}
    <h3>Copiar los pasos de mi teléfono</h3>
    <p class="ayuda">Abre la app de Salud, Google Fit o tu reloj y escribe el total de hoy. Si lo escribes aquí, usamos ese número.</p>
    <form id="ph-form" class="fila fila-accion" novalidate>
      ${campo({ ruta: 'total', etiqueta: 'Pasos de hoy', tipo: 'number', valor: p.manual ?? '' })}
      <button type="submit" class="btn">Guardar</button>
    </form>
    <h3>Últimos 7 días</h3>
    ${barrasSemana(p.semana, x => x.pasos, Math.max(p.meta, ...p.semana.map(x => x.pasos)), x => (x.pasos ? (x.pasos / 1000).toFixed(1).replace('.', ',') + ' mil' : '—'))}
    <details class="por-que"><summary>¿Cómo se calcula?</summary>
      <p>Las calorías son un cálculo aproximado de lo que gasta caminar por encima de estar quieto, según tu peso y la distancia. Pueden fallar un 20-30 %. Tu meta sube poco a poco: lo que caminas normalmente, más 500 pasos. Así hasta llegar a ${fmtPasos(topePasos(atleta))}.</p>
      <p>Si cuentas pasos mientras entrenas, esos pasos ya están en tu sesión.</p></details>`;
  cont.querySelector('#ph-contar')?.addEventListener('click', () => cb.alContarPasos(!contando));
  cont.querySelector('#ph-actividad')?.addEventListener('click', () => cb.alActividad(p.sugerida));
  cont.querySelector('#ph-form').addEventListener('submit', e => {
    e.preventDefault();
    const n = Number(String(e.target.querySelector('[data-ruta="total"]').value).replace(/[.,\s]/g, ''));   // los pasos siempre son enteros
    if (!n || n < 0 || n > 100000) return aviso('Escribe tus pasos de hoy (un número)', 'error');
    cb.alAnotarPasos(n);
  });
}
