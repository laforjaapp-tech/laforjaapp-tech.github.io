// MI PLAN (FASE 5): distribución semanal, informe "¿Por qué este plan?", progreso multidimensional y evidencia.

import { esc } from '../ui/componentes.js';
import { NOMBRES_GRUPO } from '../datos/ejercicios.js';
import { REFERENCIAS, NIVELES } from '../datos/evidencia.js';
import { FRECUENCIA_OBJETIVO } from '../motor/semana.js';
import { htmlNivel, htmlReferencia, htmlAfirmacion, numerarReferencias } from '../ui/ciencia.js';
import { afirmacion } from '../datos/evidencia.js';
import { htmlFilaEjercicio } from '../ui/tecnica.js';
import { montarIlustraciones } from '../ui/figura.js';
import * as U from '../motor/unidades.js';

const PESTANAS = [
  { id: 'semana', etiqueta: '📅 Semana' }, { id: 'porque', etiqueta: '🔬 ¿Por qué este plan?' },
  { id: 'progreso', etiqueta: '📈 Progreso' }, { id: 'evidencia', etiqueta: '📚 Evidencia' },
];
const fechaCorta = f => new Date(f + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });

export function vistaPlan(raiz, atleta, plan, { pestana = 'semana', hoy, alPestana }) {
  const contenido = { semana: htmlSemana, porque: htmlPorQue, progreso: htmlProgreso, evidencia: htmlEvidencia }[pestana] || htmlSemana;
  raiz.innerHTML = `<section class="pantalla">
    <span class="paso-num">Fase 5 · Entrenamiento basado en evidencia</span>
    <h1>🔬 Mi plan</h1>
    <p class="subtitulo">Objetivo: <strong>${esc(plan.objetivo.nombre)}</strong>. No buscamos la máxima intensidad, sino el máximo progreso sostenible con el menor riesgo.</p>
    <nav class="pestanas" aria-label="Secciones de mi plan">${PESTANAS.map(p => `<button type="button" class="chip${p.id === pestana ? ' activo' : ''}" data-pestana="${p.id}">${p.etiqueta}</button>`).join('')}</nav>
    <div id="plan-contenido">${contenido(plan, hoy, atleta)}</div>
  </section>`;
  montarIlustraciones(raiz);
  raiz.querySelectorAll('[data-pestana]').forEach(b => b.onclick = () => alPestana(b.dataset.pestana));
}

// ---------- Semana ----------
function htmlSemana(plan, hoy) {
  const s = plan.semana;
  const maxF = Math.max(4, ...Object.values(s.frecuencia));
  return `<h2>Prioridades de tu objetivo</h2>
    <ol class="prioridades">${plan.objetivo.prioridades.map(p => { const a = afirmacion(p.afirmacion); return `<li><strong>${esc(p.que)}</strong> ${htmlNivel(a)}<span class="ayuda">${esc(p.por)}</span></li>`; }).join('')}</ol>
    <p class="ayuda">Combinación para tu objetivo: ${plan.objetivo.combinacion.map(esc).join(' + ')}.</p>

    <h2>Tu semana</h2>
    <div class="semana-plan">${s.semana.map(d => `<div class="dia-sesion${d.fecha === hoy ? ' hoy' : ''}${d.sesion ? '' : ' libre'}">
      <span class="ds-dia">${d.nombre}${d.fecha === hoy ? ' · HOY' : ''}</span>
      <span class="ds-fecha">${fechaCorta(d.fecha)}</span>
      <strong class="ds-sesion">${d.sesion ? esc(d.sesion.nombre) : 'Descanso'}</strong>
      ${d.sesion?.experimento ? '<span class="ds-etq">🧪 Variante de prueba</span>' : ''}
    </div>`).join('')}</div>
    ${s.notas.map(n => `<div class="nota">${esc(n)}</div>`).join('')}
    ${s.avisos.map(n => `<div class="nota precaucion">${esc(n)}</div>`).join('')}
    <p class="ayuda">El orden de los días evita que los mismos músculos trabajen dos días seguidos y que después de piernas vengan saltos o carreras intensas. Si un día no puedes, la app adelanta la siguiente sesión pendiente que encaje con lo que hiciste ayer.</p>

    <h2>Estímulos por músculo esta semana</h2>
    <div class="medidores">${Object.entries(s.frecuencia).map(([g, n]) => `<div class="medidor"><span class="m-etiqueta">${NOMBRES_GRUPO[g]}</span>
      <span class="m-pista"><span class="m-barra${n < FRECUENCIA_OBJETIVO[g] ? ' bajo' : ''}" style="width:${Math.round((n / maxF) * 100)}%"></span></span>
      <span class="m-valor">${n}<small> / ${FRECUENCIA_OBJETIVO[g]}</small></span></div>`).join('')}</div>
    <p class="ayuda">Se busca estimular cada grupo grande al menos 2 veces por semana y el core 3. ${htmlNivel(afirmacion('frecuencia_dos'))}</p>`;
}

// ---------- ¿Por qué este plan? ----------
function htmlPorQue(plan) {
  const inf = plan.informe;
  const num = numerarReferencias(inf.referencias);
  const c = plan.ciclo;
  const n = plan.nutricion;
  const rec = plan.recuperacion;
  return `<h2>${esc(inf.titulo)}</h2>
    <p class="ayuda">${esc(inf.periodo)}</p>
    <div class="tiles">
      <div class="tile"><span class="tile-titulo">Objetivo</span><span class="tile-valor">${esc(inf.objetivo)}</span></div>
      ${inf.disciplinas.map(d => `<div class="tile"><span class="tile-titulo">${d.icono} ${esc(d.nombre)}</span><span class="tile-valor">${d.sesiones} ${d.sesiones === 1 ? 'sesión' : 'sesiones'}</span><span class="tile-extra">${esc(d.funcion)}</span></div>`).join('')}
      <div class="tile"><span class="tile-titulo">🛌 Descanso</span><span class="tile-valor">${inf.descanso} ${inf.descanso === 1 ? 'día' : 'días'}</span><span class="tile-extra">El músculo crece cuando descansas.</span></div>
    </div>
    <p class="ayuda">Una sesión puede combinar varias disciplinas (por ejemplo, fuerza + core + cardio moderado): por eso los números pueden sumar más que los días que entrenas.</p>

    ${plan.ajustes.length ? `<h3>Ajustes para que sea sostenible</h3>${plan.ajustes.map(a => `<div class="nota ${a.tipo === 'precaucion' ? 'precaucion' : ''}">${esc(a.texto)}</div>`).join('')}` : ''}

    <h3>🥗 Alimentación para tu objetivo</h3>
    <p>${esc(n.enfoque)}</p>
    ${n.configurada ? `<ul class="razones"><li>Energía orientativa: unas ${n.kcal} kcal al día.</li><li>${esc(n.proteinaTexto)}</li></ul>`
      : '<p class="ayuda">Configura tu alimentación en la sección Comida para conectar el menú con este plan.</p>'}
    ${n.economico ? '<div class="nota exito">💰 Plan económico activo: tu menú prioriza alimentos accesibles.</div>' : ''}
    <p class="ayuda">💰 ${esc(n.reglaEconomica)}</p>

    ${plan.hidratacion ? `<h3>💧 Hidratación</h3><p>${esc(plan.hidratacion.texto)}</p>` : ''}
    <h3>🌙 Recuperación</h3>
    <ul class="razones">
      <li>Sueño: objetivo de ${rec.suenoObjetivo.min}–${rec.suenoObjetivo.max} h${rec.suenoMedio != null ? `; esta semana, una media de ${String(rec.suenoMedio).replace('.', ',')} h` : ''}.</li>
      ${rec.energia != null ? `<li>Energía media: ${String(rec.energia).replace('.', ',')}/10 · fatiga media: ${String(rec.fatiga).replace('.', ',')}/10.</li>` : ''}
      <li>${rec.descanso} ${rec.descanso === 1 ? 'día' : 'días'} sin entrenamiento a la semana; caminar esos días ayuda a recuperar.</li>
    </ul>

    ${c ? `<h3>🧪 Ciclo ${c.numero} (${fechaCorta(c.inicio)} – ${fechaCorta(c.fin)})</h3>
    <p class="ayuda">Repetir → medir → progresar → variar cuando hace falta. No se cambia todo constantemente.</p>
    <ol class="etapas-ciclo">${c.etapas.map(e => `<li class="${e.semana === c.semana ? 'actual' : ''}"><strong>Semana ${e.semana}${e.semana === c.semana ? ' (ahora)' : ''}:</strong> ${esc(e.texto)}</li>`).join('')}</ol>
    ${c.anterior ? `<div class="nota ${c.anterior.veredicto === 'empeoro' ? 'precaucion' : c.anterior.veredicto === 'mejoro' ? 'exito' : ''}">
      <strong>Ciclo anterior. ${esc(c.anterior.texto)}</strong>
      ${c.anterior.datos ? `<p class="ayuda">${c.anterior.datos.map(esc).join(' · ')}</p>` : ''}
      <p>Siguiente paso: ${esc(c.anterior.siguiente)}</p>
      ${c.anterior.experimento ? `<p class="ayuda">${esc(c.anterior.experimento)}</p>` : ''}
    </div>` : ''}` : ''}

    <h3>La ciencia detrás de tu plan</h3>
    <div class="niveles">${Object.values(NIVELES).map(v => `<span>${v.icono} <strong>${esc(v.etiqueta)}:</strong> ${esc(v.texto)}</span>`).join('')}</div>
    <ul class="afirmaciones">${inf.afirmaciones.map(a => htmlAfirmacion(a.id, num)).join('')}</ul>
    <h3>Referencias</h3>
    <ol class="referencias">${inf.referencias.map(r => htmlReferencia(r, num[r.id])).join('')}</ol>
    <p class="ayuda">Usamos "la evidencia disponible sugiere" o "existe evidencia moderada/fuerte": la ciencia no se presenta como certeza absoluta. Esta app no sustituye a un profesional de la salud.</p>`;
}

// ---------- Progreso multidimensional ----------
function htmlProgreso(plan, hoy, atleta) {
  const r = plan.rendimiento;
  const cuerpo = r.cuerpo;
  const lista = (items, vacio) => items.length
    ? `<div class="filas-progreso">${items.slice(0, 12).map(x => htmlFilaEjercicio(x.id, { dosis: `Al empezar: ${x.inicio} → ahora: ${x.actual}`, nota: `${x.cambio.tendencia === 'mejora' ? '📈' : x.cambio.tendencia === 'baja' ? '📉' : '➖'} Cambio: ${x.cambio.texto} (${x.sesiones} ${x.sesiones === 1 ? 'sesión' : 'sesiones'})` })).join('')}</div>`
    : `<p class="ayuda">${vacio}</p>`;
  return `<p class="subtitulo">El progreso no se mide solo con la báscula: fuerza, cuerpo, cardio, calistenia, boxeo y movilidad.</p>
    <div class="tiles">
      <div class="tile"><span class="tile-titulo">⚖️ Peso</span><span class="tile-valor">${cuerpo.peso ? U.fmtPeso(cuerpo.peso.actual.peso, atleta) : '—'}</span><span class="tile-extra">${cuerpo.peso ? `${U.fmtCambioPeso(cuerpo.peso.cambioTotal, atleta)} desde el inicio` : 'Registra tu peso en Perfil'}</span></div>
      <div class="tile"><span class="tile-titulo">📏 Cintura</span><span class="tile-valor">${cuerpo.cintura ? U.fmtMedida(cuerpo.cintura.actual.cintura, atleta) : '—'}</span><span class="tile-extra">${cuerpo.cintura ? `${cuerpo.cintura.cambio > 0 ? '+' : cuerpo.cintura.cambio < 0 ? '−' : ''}${U.fmtMedida(Math.abs(cuerpo.cintura.cambio), atleta)} desde el inicio` : 'Mídela cuando registres tu peso'}</span></div>
      <div class="tile"><span class="tile-titulo">🏃 Cardio</span><span class="tile-valor">${r.cardio.minutos} min</span><span class="tile-extra">${r.cardio.sesiones} sesiones · media ${r.cardio.mediaSemanal} min/semana</span></div>
      <div class="tile"><span class="tile-titulo">🥊 Boxeo</span><span class="tile-valor">${r.boxeo.rondas} rondas</span><span class="tile-extra">${r.boxeo.minutos} min · ${r.boxeo.combinaciones.length} combinaciones practicadas</span></div>
      <div class="tile"><span class="tile-titulo">🧘 Movilidad</span><span class="tile-valor">${r.movilidad.sesiones} sesiones</span><span class="tile-extra">${esc(r.movilidad.nota)}</span></div>
    </div>
    <h3>🏋️ Fuerza: peso y repeticiones</h3>
    ${lista(r.fuerza, 'Cuando completes entrenamientos con el modo guiado, aquí verás tu primera y tu última marca de cada ejercicio.')}
    <h3>🤸 Calistenia: variantes y repeticiones</h3>
    ${r.calistenia.cadenas.length ? `<div class="filas-progreso">${r.calistenia.cadenas.map(c => htmlFilaEjercicio(c.id, { dosis: `Variante actual: nivel ${c.paso} de ${c.de}` })).join('')}</div>` : ''}
    ${lista(r.calistenia.ejercicios, 'Aún no hay registros de calistenia.')}
    <p class="ayuda">Si en la semana ves que algo baja, no es un fracaso: el motor ajusta la carga según tu recuperación.</p>`;
}

// ---------- Evidencia ----------
function htmlEvidencia() {
  const refs = Object.entries(REFERENCIAS).map(([id, r]) => ({ id, ...r })).sort((a, b) => b.anio - a.anio);
  return `<p class="subtitulo">Fuentes científicas que usa el plan: revisiones sistemáticas, metaanálisis, ensayos controlados, guías oficiales y posicionamientos de organizaciones científicas. Ninguna procede de blogs ni de publicaciones comerciales.</p>
    <div class="niveles">${Object.values(NIVELES).map(v => `<span>${v.icono} <strong>${esc(v.etiqueta)}:</strong> ${esc(v.texto)}</span>`).join('')}</div>
    <ol class="referencias">${refs.map(r => htmlReferencia(r)).join('')}</ol>
    <p class="ayuda">Cada referencia se comprobó en el registro oficial de DOI (Crossref). Si no hay evidencia suficiente para afirmar algo, la app lo indica como "estrategia práctica".</p>`;
}
