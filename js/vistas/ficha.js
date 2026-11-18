// Ficha de una clienta, para su doctora. Arriba, sus alertas. Cuatro partes:
// 📊 Seguimiento (quién es, qué cuidar, peso, su semana, comidas, entrenamientos y libreta de gustos),
// 💬 Mensajes con ella, 🍽️ Su plan (vistas/plan-doctora.js: dietas, metas, límites, alimentos y su menú) y 📝 Mis notas (privadas).
// Los datos llegan de la nube tal como los guarda el teléfono de la clienta (js/nube/seguimiento.js).

import { esc, aviso, confirmar } from '../ui/componentes.js';
import * as N from '../nube/acceso.js';
import { hoyISO, sumarDias, imc, lecturaImc, evolucionPeso } from '../motor/calculos.js';
import { fmtPeso, fmtCambioPeso, fmtEstatura, fmtMedida, unidadesDe, pesoEnUnidad } from '../motor/unidades.js';
import { objetivoNut } from '../motor/nutricion.js';
import { consumidoDe } from '../motor/ajusteDiario.js';
import { totalPasos } from '../motor/pasos.js';
import { alertasClienta } from '../motor/alertas.js';
import { LESIONES, CONDICIONES_MEDICAS, OBJETIVOS, etiquetaDe } from '../datos/catalogos.js';
import { ALERGENOS, alimentoPorId, tipoComida } from '../datos/alimentos.js';
import { PREGUNTAS_GUSTOS } from './alimentacion.js';
import { htmlConversacion, activarConversacion } from '../ui/conversacion.js';
import { pintarPlanDoctora } from './plan-doctora.js';

const DIAS = 7;
const diaCorto = iso => new Date(iso + 'T12:00').toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric' });
const diaLargo = iso => new Date(iso + 'T12:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });
const fechaHora = iso => new Date(iso).toLocaleString('es-DO', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
const miles = n => Math.round(n).toLocaleString('es-DO');

export function haceDias(iso) {
  const d = Math.round((Date.parse(hoyISO()) - Date.parse(iso.slice(0, 10))) / 864e5);
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
}

// Chips de alertas (también en la lista de clientas)
export const htmlAlertas = lista => (lista.length
  ? `<ul class="al-lista">${lista.map(x => `<li class="al-${x.nivel}"><span aria-hidden="true">${x.icono}</span> ${esc(x.texto)}</li>`).join('')}</ul>` : '');

const PARTES = [
  { id: 'seguimiento', etiqueta: '📊 Seguimiento' }, { id: 'mensajes', etiqueta: '💬 Mensajes' },
  { id: 'plan', etiqueta: '🍽️ Su plan' }, { id: 'notas', etiqueta: '📝 Mis notas' },
];

// clienta: fila de mis_clientas · yo: id de la cuenta de la doctora
export async function vistaFicha(raiz, clienta, { alVolver, yo, parte = 'seguimiento' }) {
  const nombre = clienta.nombre || clienta.correo;
  raiz.innerHTML = `<section class="pantalla">
    <div class="navegacion"><button type="button" class="btn sec mini" id="fi-volver">← Mis clientas</button><span></span></div>
    <h1>${esc(nombre)}</h1>
    ${htmlAlertas(alertasClienta(clienta))}
    <nav class="pestanas" aria-label="Partes de la ficha">${PARTES.map(p => `<button type="button" class="chip" data-parte="${p.id}">${p.etiqueta}${p.id === 'mensajes' && clienta.sin_leer ? ` <b class="cv-globo">${clienta.sin_leer}</b>` : ''}</button>`).join('')}</nav>
    <div id="fi-cuerpo"><p>Cargando sus datos…</p></div></section>`;
  raiz.querySelector('#fi-volver').onclick = alVolver;
  window.scrollTo(0, 0);
  const cuerpo = raiz.querySelector('#fi-cuerpo');
  let r;
  try { r = await N.datosDeClienta(clienta.id); }
  catch (e) { cuerpo.innerHTML = `<p class="error">${esc(N.enPalabras(e))}</p>`; return; }

  const abrir = async id => {
    raiz.querySelectorAll('[data-parte]').forEach(b => b.classList.toggle('activo', b.dataset.parte === id));
    cuerpo.innerHTML = '<p>Cargando…</p>';
    if (id === 'seguimiento') pintarSeguimiento(cuerpo, r, nombre);
    if (id === 'mensajes') {
      let mensajes;
      try { mensajes = await N.mensajesDe(clienta.id); } catch (e) { cuerpo.innerHTML = `<p class="error">${esc(N.enPalabras(e))}</p>`; return; }
      raiz.querySelector('.cv-globo')?.remove();   // al abrirlos quedan leídos
      cuerpo.innerHTML = htmlConversacion(mensajes, { yo, otra: nombre, ayuda: `${nombre} lo verá la próxima vez que abra LA FORJA.` });
      activarConversacion(cuerpo, { yo, alEnviar: texto => N.enviarMensaje(clienta.id, texto), enPalabras: N.enPalabras });
    }
    if (id === 'plan') pintarPlanDoctora(cuerpo, { r, clienta, nombre, alGuardado: async () => { r = await N.datosDeClienta(clienta.id); abrir('plan'); } });
    if (id === 'notas') pintarNotas(cuerpo, r.notas || [], clienta, async () => { r = await N.datosDeClienta(clienta.id); abrir('notas'); });
  };
  raiz.querySelector('.pestanas').addEventListener('click', e => { const b = e.target.closest('[data-parte]'); if (b) abrir(b.dataset.parte); });
  abrir(parte);
}

// ---------- 📊 Seguimiento ----------
function pintarSeguimiento(cuerpo, r, nombre) {
  const d = r.datos || {};
  const a = (d.atletas || [])[0];
  if (!a) {
    cuerpo.innerHTML = `<div class="nota"><p>${esc(nombre)} todavía no ha enviado datos. Se envían solos cuando abre LA FORJA con internet.</p></div>`;
    return;
  }
  cuerpo.innerHTML = `
    <p class="subtitulo">Datos enviados ${esc(haceDias(r.subido))} (${esc(fechaHora(r.subido))}).</p>
    ${htmlQuien(a, d)}
    ${htmlPeso(a, d.mediciones || [])}
    ${htmlSemana(d)}
    ${htmlComidas(d)}
    ${htmlEntrenos(a, d.sesiones || [])}
    ${htmlGustos(d)}`;
}

// ---------- 📝 Mis notas: solo las ve la doctora ----------
function pintarNotas(cuerpo, notas, clienta, alCambio) {
  cuerpo.innerHTML = `
    <p class="subtitulo">Solo tú ves estas notas. ${esc(clienta.nombre || 'Tu clienta')} no las ve.</p>
    <form id="no-form">
      <label class="campo"><span class="campo-etiqueta">Nota nueva</span><textarea name="texto" rows="3" maxlength="4000" required></textarea></label>
      <p class="error" role="alert"></p>
      <div class="navegacion"><span></span><button type="submit" class="btn mini">Guardar nota</button></div>
    </form>
    ${notas.length ? `<ul class="no-lista">${notas.map(n => `<li class="nota"><p class="no-texto">${esc(n.texto)}</p>
      <div class="no-pie"><span class="ayuda">${esc(fechaHora(n.creado))}</span><button type="button" class="btn mini sec" data-borrar="${n.id}">Borrar</button></div></li>`).join('')}</ul>`
      : '<p class="ayuda">Todavía no tienes notas de esta clienta.</p>'}`;
  const form = cuerpo.querySelector('#no-form');
  form.onsubmit = async e => {
    e.preventDefault();
    const boton = form.querySelector('button'), error = form.querySelector('.error');
    boton.disabled = true; error.textContent = '';
    try { await N.guardarNota(clienta.id, form.texto.value); aviso('📝 Nota guardada'); await alCambio(); }
    catch (err) { error.textContent = N.enPalabras(err); boton.disabled = false; }
  };
  cuerpo.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
    if (!(await confirmar('¿Borrar esta nota? No se puede deshacer.'))) return;
    try { await N.borrarNota(Number(b.dataset.borrar)); await alCambio(); } catch (err) { aviso(N.enPalabras(err), 'error'); }
  });
}

// ---------- Quién es y qué cuidar ----------
function htmlQuien(a, d) {
  const p = a.personal || {};
  const valorImc = imc(p.peso, p.estatura);
  const nut = (d.nutrition_profiles || [])[0];
  const plan = (d.nutrition_plans || []).sort((x, y) => (x.creado || '').localeCompare(y.creado || '')).pop();
  const s = a.seguridad || {};
  const condiciones = [...(s.condiciones || []).filter(c => c !== 'otra').map(c => etiquetaDe(CONDICIONES_MEDICAS, c)), s.condicionOtra].filter(Boolean);
  const lesiones = [...(s.lesiones || []).filter(l => l !== 'otra' && l !== 'ninguna').map(l => etiquetaDe(LESIONES, l)), s.lesionOtra].filter(Boolean);
  const alergias = (d.allergies || []).map(x => x.alergeno === 'otra' ? x.nota : etiquetaDe(ALERGENOS, x.alergeno)).filter(Boolean);
  const nombreAlimento = id => alimentoPorId[id]?.nombre || id;
  const noCome = (d.food_restrictions || []).filter(x => x.tipo === 'rechazar').map(x => nombreAlimento(x.alimentoId));
  const reduce = (d.food_restrictions || []).filter(x => x.tipo === 'reducir').map(x => nombreAlimento(x.alimentoId));
  const filas = [
    ['Edad', p.edad ? `${p.edad} años` : '–'],
    ['Estatura', fmtEstatura(p.estatura, a, { conOtra: true })],
    ['Peso actual', fmtPeso(p.peso, a, { conOtra: true })],
    ['IMC', valorImc ? `${String(valorImc).replace('.', ',')} · ${lecturaImc(valorImc)}` : '–'],
    ['Lo que busca', a.objetivos?.principal ? etiquetaDe(OBJETIVOS, a.objetivos.principal) : '–'],
    ['Plan de comidas', nut ? objetivoNut(plan?.objetivo || nut.objetivo).etiqueta : 'Aún no lo configura'],
    ['Meta diaria', plan ? `${miles(plan.kcal)} kcal · ${plan.proteina} g de proteína${plan.indicada ? ' (ajustada a mano)' : ''}` : '–'],
    ['Entrena', a.disponibilidad?.dias ? `${a.disponibilidad.dias} días por semana` : '–'],
  ];
  const cuidar = [
    condiciones.length && `<p><strong>Salud:</strong> ${esc(condiciones.join(', '))}</p>`,
    lesiones.length && `<p><strong>Lesiones:</strong> ${esc(lesiones.join(', '))}${s.lesionDetalle ? ` (${esc(s.lesionDetalle)})` : ''}</p>`,
    alergias.length && `<p><strong>Alergias:</strong> ${esc(alergias.join(', '))}</p>`,
    noCome.length && `<p><strong>No come:</strong> ${esc(noCome.join(', '))}</p>`,
    reduce.length && `<p><strong>Quiere comer menos:</strong> ${esc(reduce.join(', '))}</p>`,
  ].filter(Boolean);
  return `<h2>Quién es</h2>
    <dl class="fi-datos">${filas.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    ${cuidar.length ? `<div class="nota precaucion">${cuidar.join('')}</div>` : ''}`;
}

// ---------- Peso: gráfica y cambio ----------
function htmlPeso(a, mediciones) {
  const evo = evolucionPeso(mediciones);
  if (!evo) return '<h2>Peso</h2><p class="ayuda">Todavía no ha registrado su peso.</p>';
  const cinturas = mediciones.filter(m => m.cintura).sort((x, y) => x.fecha.localeCompare(y.fecha));
  const cintura = cinturas.length > 1
    ? `<p>Cintura: ${esc(fmtMedida(cinturas[0].cintura, a))} → <strong>${esc(fmtMedida(cinturas[cinturas.length - 1].cintura, a))}</strong></p>`
    : cinturas.length ? `<p>Cintura: ${esc(fmtMedida(cinturas[0].cintura, a))}</p>` : '';
  return `<h2>Peso</h2>
    <p>Empezó con <strong>${esc(fmtPeso(evo.inicial.peso, a))}</strong> el ${esc(diaLargo(evo.inicial.fecha))}. Hoy: <strong>${esc(fmtPeso(evo.actual.peso, a))}</strong>
      (${esc(fmtCambioPeso(evo.cambioTotal, a))} en total${evo.hay30 ? `, ${esc(fmtCambioPeso(evo.cambio30dias, a))} en 30 días` : ''}).</p>
    ${evo.lista.length > 1 ? graficaPeso(evo.lista, a) : ''}
    ${cintura}`;
}

function graficaPeso(lista, a) {
  const u = unidadesDe(a).peso;
  const ancho = 600, alto = 180, m = { izq: 44, der: 12, arr: 14, aba: 26 };
  const t = lista.map(x => Date.parse(x.fecha)), v = lista.map(x => pesoEnUnidad(x.peso, u));
  const t0 = t[0], t1 = Math.max(t[t.length - 1], t0 + 864e5);
  const vMin = Math.floor(Math.min(...v) - 1), vMax = Math.ceil(Math.max(...v) + 1);
  const x = k => m.izq + ((t[k] - t0) / (t1 - t0)) * (ancho - m.izq - m.der);
  const y = val => m.arr + (1 - (val - vMin) / (vMax - vMin)) * (alto - m.arr - m.aba);
  const puntos = v.map((val, k) => `${x(k).toFixed(1)},${y(val).toFixed(1)}`).join(' ');
  return `<svg class="fi-grafica" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Peso a lo largo del tiempo">
    <line class="fi-eje" x1="${m.izq}" y1="${y(vMax)}" x2="${ancho - m.der}" y2="${y(vMax)}"/>
    <line class="fi-eje" x1="${m.izq}" y1="${y(vMin)}" x2="${ancho - m.der}" y2="${y(vMin)}"/>
    <text class="fi-texto" x="${m.izq - 6}" y="${y(vMax) + 4}" text-anchor="end">${vMax}</text>
    <text class="fi-texto" x="${m.izq - 6}" y="${y(vMin) + 4}" text-anchor="end">${vMin}</text>
    <text class="fi-texto" x="${m.izq}" y="${alto - 6}">${esc(diaCorto(lista[0].fecha))}</text>
    <text class="fi-texto" x="${ancho - m.der}" y="${alto - 6}" text-anchor="end">${esc(diaCorto(lista[lista.length - 1].fecha))}</text>
    <polyline class="fi-linea" points="${puntos}"/>
    ${v.map((val, k) => `<circle class="fi-punto" cx="${x(k).toFixed(1)}" cy="${y(val).toFixed(1)}" r="4"><title>${esc(diaLargo(lista[k].fecha))}: ${val} ${u}</title></circle>`).join('')}
  </svg>`;
}

// ---------- Su semana, día por día ----------
const comidasPorDia = d => {
  const items = {};
  for (const it of d.meal_items || []) (items[it.mealId] ||= []).push(it);
  const dias = {};
  for (const c of d.meals || []) (dias[c.fecha] ||= []).push({ ...c, items: items[c.id] || [] });
  return dias;
};

function htmlSemana(d) {
  const hoy = hoyISO();
  const fechas = Array.from({ length: DIAS }, (_, i) => sumarDias(hoy, i - DIAS + 1)).reverse();
  const comidas = comidasPorDia(d);
  const enDia = (lista, f) => (lista || []).filter(x => x.fecha === f);
  const filas = fechas.map(f => {
    const del = comidas[f] || [];
    const plan = del.filter(c => c.tipo !== 'extra');
    const anotadas = plan.filter(c => c.estado !== 'planificada').length, libreta = del.length - plan.length;
    const objetivo = plan.reduce((t, c) => t + (c.totales?.kcal || 0), 0);
    const comido = del.filter(c => c.tipo === 'extra' || c.estado !== 'planificada').reduce((t, c) => t + (consumidoDe(c).kcal || 0), 0);
    const sesion = enDia(d.sesiones, f).find(s => ['completada', 'incompleta'].includes(s.estado));
    const agua = enDia(d.hydration_logs, f).reduce((t, l) => t + (l.ml || 0), 0);
    const sueno = enDia(d.sleep_logs, f).find(s => s.duracionMin);
    const pasos = totalPasos(enDia(d.steps, f)[0]);
    const chequeo = enDia(d.registrosDiarios, f)[0];
    return `<tr>
      <th scope="row">${esc(diaCorto(f))}</th>
      <td>${del.length ? `${anotadas}/${plan.length}${libreta ? ` + ${libreta} en la libreta` : ''}${comido ? `<span class="fi-sub">≈ ${miles(comido)}${objetivo ? ` de ${miles(objetivo)}` : ''} kcal</span>` : ''}` : '–'}</td>
      <td>${sesion ? (sesion.estado === 'completada' ? '✅' : `◐ ${sesion.resumen?.porcentaje ?? ''}%`) : '–'}</td>
      <td>${agua ? `${(agua / 1000).toFixed(1).replace('.', ',')} L` : '–'}</td>
      <td>${sueno ? `${Math.floor(sueno.duracionMin / 60)} h ${sueno.duracionMin % 60} min` : '–'}</td>
      <td>${pasos ? miles(pasos) : '–'}</td>
      <td>${chequeo ? `${chequeo.energia ? `energía ${chequeo.energia}/10` : ''}${chequeo.dolorArticular === 'si' ? ' ⚠️ dolor' : ''}` : '–'}</td>
    </tr>`;
  }).join('');
  return `<h2>Últimos ${DIAS} días</h2>
    <div class="fi-tabla-caja"><table class="fi-tabla">
      <thead><tr><th>Día</th><th>Comidas anotadas</th><th>Entreno</th><th>Agua</th><th>Sueño</th><th>Pasos</th><th>Cómo amaneció</th></tr></thead>
      <tbody>${filas}</tbody></table></div>`;
}

// ---------- Lo que comió ----------
const ESTADO_COMIDA = { completada: '✅ Se lo comió', mitad: '◐ La mitad', diferente: '🔄 Comió otra cosa', no_realizada: '✕ No comió', planificada: '· Sin anotar' };

function htmlComidas(d) {
  const hoy = hoyISO();
  const comidas = comidasPorDia(d);
  const dias = Array.from({ length: DIAS }, (_, i) => sumarDias(hoy, -i)).filter(f => comidas[f]?.length);
  if (!dias.length) return '<h2>Comidas</h2><p class="ayuda">Todavía no tiene comidas en estos días.</p>';
  const orden = c => c.registro?.horaComida || c.hora || '';
  return `<h2>Comidas</h2>${dias.map(f => `<details class="fi-dia"${f === hoy ? ' open' : ''}>
      <summary>${esc(diaLargo(f))}</summary>
      <ul class="fi-comidas">${comidas[f].sort((x, y) => orden(x).localeCompare(orden(y))).map(c => {
        const t = tipoComida(c.tipo);
        const texto = c.tipo === 'extra' ? `📒 Anotó: ${c.registro?.texto || c.nombre}` : `${t.icono} ${t.etiqueta}: ${c.nombre}`;
        const nota = c.registro?.texto && c.tipo !== 'extra' ? ` — “${c.registro.texto}”` : c.registro?.nota ? ` — “${c.registro.nota}”` : '';
        return `<li><span>${esc(texto)}${esc(nota)}</span><span class="fi-estado">${c.tipo === 'extra' ? esc(orden(c)) : esc(ESTADO_COMIDA[c.estado] || '')}</span></li>`;
      }).join('')}</ul></details>`).join('')}`;
}

// ---------- Entrenamientos ----------
function htmlEntrenos(a, sesiones) {
  const desde = sumarDias(hoyISO(), -27);
  const hechas = sesiones.filter(s => ['completada', 'incompleta'].includes(s.estado)).sort((x, y) => y.fecha.localeCompare(x.fecha));
  const mes = hechas.filter(s => s.fecha >= desde);
  const meta = (a.disponibilidad?.dias || 0) * 4;
  return `<h2>Entrenamientos</h2>
    <p>En las últimas 4 semanas: <strong>${mes.filter(s => s.estado === 'completada').length} completos</strong>${mes.some(s => s.estado === 'incompleta') ? ` y ${mes.filter(s => s.estado === 'incompleta').length} a medias` : ''}${meta ? ` de ${meta} planificados` : ''}.</p>
    ${hechas.length ? `<ul class="fi-entrenos">${hechas.slice(0, 10).map(s => `<li>
      <strong>${esc(diaLargo(s.fecha))}</strong> · ${esc(s.workout?.nombre || 'Entrenamiento')}
      <span class="fi-sub">${s.estado === 'completada' ? 'Completo' : `A medias (${s.resumen?.porcentaje ?? '–'} %)`}${s.duracionSeg ? ` · ${Math.round(s.duracionSeg / 60)} min` : ''}${s.general?.esfuerzo ? ` · esfuerzo ${s.general.esfuerzo}/10` : ''}${s.resumen?.calorias ? ` · ≈ ${miles(s.resumen.calorias)} kcal` : ''}${s.general?.dolor ? ' · ⚠️ sintió dolor' : ''}</span>
      ${s.comentarios ? `<span class="fi-sub">“${esc(s.comentarios)}”</span>` : ''}</li>`).join('')}</ul>` : '<p class="ayuda">Todavía no ha terminado ningún entrenamiento.</p>'}`;
}

// ---------- Libreta de gustos (la escribe ella para su nutricionista) ----------
function htmlGustos(d) {
  const g = (d.food_preferences || [])[0]?.gustos || {};
  const respondidas = PREGUNTAS_GUSTOS.filter(q => (g[q.id] || '').trim());
  if (!respondidas.length) return '';
  return `<h2>Su libreta de gustos</h2><dl class="fi-gustos">${respondidas.map(q => `<div><dt>${esc(q.etiqueta)}</dt><dd>${esc(g[q.id])}</dd></div>`).join('')}</dl>`;
}
