// FASE 4 — 🥗 MI ALIMENTACIÓN
// Hoy · Libreta · Mis gustos · Semana · Mes · Compras · Registro · Aprende · Nutrientes · Suplementos · Preferencias

import { esc, chips, activarChips, leerFormulario, campo, aviso, confirmar } from '../ui/componentes.js';
import {
  ALIMENTOS, alimentoPorId, TIPOS_COMIDA, tipoComida, ALERGENOS, PATRONES, CULTURAS, CATEGORIAS_COMPRA, COMIDAS_POR_DIA,
  PLANTILLAS_HORARIO, PRECIOS_FECHA, PLATOS, NOMBRES_PLATO,
} from '../datos/alimentos.js';
import { NUTRIENTES, nutrientePorId, SUPLEMENTOS_INFO, POR_QUE, AVISO_PLAN, AVISO_ESTIMACION, AVISO_SUPLEMENTOS, AVISO_ALERGIAS } from '../datos/nutrientes.js';
import { LECCIONES, consejoDelDia, ANIMO } from '../datos/educacion.js';
import {
  OBJETIVOS_NUT, objetivoNut, objetivoDesdeFase1, objetivosPermitidos, perfilMedico, perfilNutricionalInicial,
  textoPorcion, aportes, porQue, alternativas, platosParecidos, antesDeEntrenar, aMinutos, AVISO_RELACION_COMIDA,
} from '../motor/nutricion.js';
import { ajustarDia, COMIDO } from '../motor/ajusteDiario.js';
import { entenderTexto, valoresLinea, totalesLineas, mensajesDia, porIdComun, alimentosEnTexto } from '../motor/seguimiento.js';
import { textoDuracion } from '../motor/recuperacion.js';
import { BOTONES_AGUA } from '../motor/hidratacion.js';
import { ultimaIngesta } from '../datos/habitos.js';
import { hoyISO, sumarDias, imc } from '../motor/calculos.js';
import { normal } from '../motor/seguimiento.js';
import { htmlQuien } from '../ui/equipo.js';
import * as U from '../motor/unidades.js';
import { htmlRecetasClienta, htmlReceta } from './recetas.js';   // RECETAS de su nutrióloga

export const DIAS = [{ id: 1, etiqueta: 'Lun' }, { id: 2, etiqueta: 'Mar' }, { id: 3, etiqueta: 'Mié' }, { id: 4, etiqueta: 'Jue' }, { id: 5, etiqueta: 'Vie' }, { id: 6, etiqueta: 'Sáb' }, { id: 0, etiqueta: 'Dom' }];
const PESTANAS = [
  { id: 'hoy', etiqueta: '🍽️ Hoy' }, { id: 'libreta', etiqueta: '📒 Libreta' }, { id: 'gustos', etiqueta: '❤️ Mis gustos' }, { id: 'recetas', etiqueta: '📖 Recetas' },
  { id: 'semana', etiqueta: '📅 Semana' }, { id: 'mes', etiqueta: '🗓️ Mes' }, { id: 'compras', etiqueta: '🛒 Compras' },
  { id: 'registro', etiqueta: '📝 Registro' }, { id: 'aprende', etiqueta: '🎓 Aprende' }, { id: 'nutrientes', etiqueta: '🥦 Nutrientes' },
  { id: 'suplementos', etiqueta: '💊 Suplementos' }, { id: 'ajustes', etiqueta: '⚙️ Preferencias' },
];
const ESTADOS = { planificada: '', completada: '✓ Me lo comí', mitad: '◐ Comí la mitad', no_realizada: '✕ No me lo comí', diferente: '✎ Comí algo diferente' };
const CANTIDADES = [{ id: 'ligera', etiqueta: 'Poca' }, { id: 'normal', etiqueta: 'Normal' }, { id: 'abundante', etiqueta: 'Mucha' }];
const fechaLarga = f => new Date(f + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
const fechaCorta = f => new Date(f + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
const ahoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const horaDe = c => c.registro?.horaComida || c.hora;
const porQueHtml = clave => `<details class="por-que"><summary>${esc(POR_QUE[clave].titulo)}</summary><p>${esc(POR_QUE[clave].texto)}</p></details>`;
const macros = t => (t ? `≈ ${t.kcal} kcal · ${t.p} g proteína · ${t.c} g carbohidratos · ${t.g} g grasas · ${t.f ?? 0} g fibra` : '');
const htmlAportes = items => `<div class="aportes">${aportes(items).map(a => `<span>✓ ${esc(a.nombre)}</span>`).join('')}</div>`;
const avisosHtml = avisos => avisos.map(a => `<div class="nota ${a.tipo === 'peligro' ? 'peligro' : a.tipo === 'precaucion' ? 'precaucion' : ''}">${esc(a.texto)}</div>`).join('');
const rd = n => `RD$ ${Math.round(n).toLocaleString('es')}`;

function htmlItems(items, filtro) {
  return `<ul class="porciones">${items.map(it => `<li><span>${esc(alimentoPorId[it.alimentoId]?.nombre)}</span><span class="porc">${esc(textoPorcion(it.alimentoId, it.g))}${it.gPlan != null ? ` <small class="ayuda">(plan: ${esc(textoPorcion(it.alimentoId, it.gPlan))})</small>` : ''}</span></li>`).join('')}</ul>
    ${items.map(it => filtro.aviso(it.alimentoId)).filter(Boolean).map(t => `<p class="nota precaucion">⚠️ ${esc(t)}</p>`).join('')}`;
}

// =====================================================================
export function vistaAlimentacion(raiz, atleta, d, cb) {
  if (!d.ctx.configurado) {
    raiz.innerHTML = `<section class="pantalla">
      <span class="paso-num">Fase 4 · Alimentación</span>
      <h1>🥗 Configura tu alimentación</h1>
      ${htmlQuien('nutricion', { texto: 'Hola, soy Sofía, tu nutrióloga. Cuéntame qué te gusta y qué no, y te armo tu menú.' })}
      <p class="subtitulo">Con tu perfil, tus entrenamientos y estas preferencias armamos un menú orientativo, variado y con comida dominicana fácil de conseguir.</p>
      <div class="nota">${esc(AVISO_PLAN)}</div>
      ${formAjustes(atleta, d.ctx, true)}
    </section>`;
    activarAjustes(raiz, cb);
    return;
  }
  const { nec } = d.ctx;
  const pestana = d.pestana || 'hoy';
  raiz.innerHTML = `<section class="pantalla">
    <span class="paso-num">Objetivo actual · ${esc(objetivoNut(nec.objetivo).etiqueta)}</span>
    <h1>🥗 Mi alimentación</h1>
    ${htmlQuien('nutricion', { texto: 'Aquí te acompaño con tu comida, tu agua y tus compras.' })}
    ${htmlIndicada(nec.indicada, d.ctx.indicaciones)}
    <div class="tiles macros">
      <div class="tile"><span class="tile-titulo">Energía</span><span class="tile-valor">≈ ${nec.kcal}</span><span class="tile-extra">kcal/día · rango ${nec.rangoKcal[0]}–${nec.rangoKcal[1]}</span></div>
      <div class="tile"><span class="tile-titulo">Proteína</span><span class="tile-valor">≈ ${nec.proteina} g</span><span class="tile-extra">${nec.rangoProteina[0]}–${nec.rangoProteina[1]} g</span></div>
      <div class="tile"><span class="tile-titulo">Carbohidratos</span><span class="tile-valor">≈ ${nec.carbohidratos} g</span></div>
      <div class="tile"><span class="tile-titulo">Grasas</span><span class="tile-valor">≈ ${nec.grasas} g</span></div>
      <div class="tile"><span class="tile-titulo">Fibra</span><span class="tile-valor">≥ ${nec.fibra} g</span></div>
    </div>
    <p class="ayuda">${esc(AVISO_PLAN)} ${esc(AVISO_ESTIMACION)}</p>
    ${avisosHtml(nec.avisos)}
    <details class="decisiones"><summary>¿Cómo se calculó?</summary><ul>${nec.explicaciones.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
      <p class="ayuda">Datos usados: edad ${nec.datos.edad}, ${esc(nec.datos.sexo)}, ${U.fmtPeso(nec.datos.peso, atleta)}, ${U.fmtEstatura(nec.datos.estatura, atleta)}, actividad ${esc(nec.datos.actividad)}, ${nec.datos.diasEntreno} días de entrenamiento, ${nec.datos.comidas} comidas, tu objetivo y tus preferencias.</p></details>
    <nav class="pestanas" aria-label="Secciones de alimentación">${PESTANAS.filter(p => p.id !== 'recetas' || d.recetas?.length).map(p => `<button type="button" class="chip${p.id === pestana ? ' activo' : ''}" data-pestana="${p.id}">${p.etiqueta}</button>`).join('')}</nav>
    <div id="contenido"></div>
  </section>`;
  raiz.querySelector('.pestanas').addEventListener('click', e => { const b = e.target.closest('[data-pestana]'); if (b) cb.alPestana(b.dataset.pestana); });
  const cont = raiz.querySelector('#contenido');
  ({ hoy: pestanaHoy, libreta: pestanaLibreta, gustos: pestanaGustos, semana: pestanaSemana, mes: pestanaMes, compras: pestanaCompras,
    registro: pestanaRegistro, recetas: pestanaRecetas, aprende: pestanaAprende, nutrientes: pestanaNutrientes, suplementos: pestanaSuplementos, ajustes: pestanaAjustes })[pestana](cont, atleta, d, cb);
  window.scrollTo(0, 0);
}

// 📖 RECETAS que le asignó su nutrióloga (vistas/recetas.js)
function pestanaRecetas(cont, atleta, d) {
  cont.innerHTML = htmlRecetasClienta(d.recetas || []);
}

// =====================================================================
// Detalle de una comida y CAMBIAR
// =====================================================================
function abrirDetalle(meal, d, cb) {
  const pq = porQue(meal, meal.items);
  const t = meal.totales || {};
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = `<div class="modal detalle-comida" role="dialog" aria-labelledby="dc-t">
    <span class="paso-num">${tipoComida(meal.tipo).icono} ${esc(tipoComida(meal.tipo).etiqueta)} · ${esc(meal.hora)}</span>
    <h2 id="dc-t">${esc(meal.nombre)}</h2>
    <h3>¿Qué vas a comer?</h3>
    <ul class="porciones">${meal.items.map(it => `<li><span>${esc(alimentoPorId[it.alimentoId]?.nombre)}</span><span class="porc">${esc(textoPorcion(it.alimentoId, it.g))}</span>
      ${meal.estado === 'planificada' && meal.platoId ? `<button type="button" class="btn mini sec" data-cambiar="${esc(it.id)}">Cambiar</button>` : ''}</li>`).join('')}</ul>
    ${meal.recetaId && d.recetas?.find(r => r.id === meal.recetaId) ? `<h3>📖 Cómo prepararla</h3>${htmlReceta(d.recetas.find(r => r.id === meal.recetaId))}` : ''}
    ${meal.items.map(it => d.ctx.filtro.aviso(it.alimentoId)).filter(Boolean).map(x => `<p class="nota precaucion">⚠️ ${esc(x)}</p>`).join('')}
    ${[...new Set(meal.items.map(it => alimentoPorId[it.alimentoId]?.nota).filter(Boolean))].map(x => `<p class="ayuda">💡 ${esc(x)}</p>`).join('')}
    <h3>¿Por qué?</h3>
    <ul class="razones">${[...pq.contexto, ...pq.lineas].map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="tiles macros">
      <div class="tile"><span class="tile-titulo">Proteína</span><span class="tile-valor">≈ ${t.p ?? '—'} g</span></div>
      <div class="tile"><span class="tile-titulo">Carbohidratos</span><span class="tile-valor">≈ ${t.c ?? '—'} g</span></div>
      <div class="tile"><span class="tile-titulo">Grasas</span><span class="tile-valor">≈ ${t.g ?? '—'} g</span></div>
      <div class="tile"><span class="tile-titulo">Fibra</span><span class="tile-valor">≈ ${t.f ?? '—'} g</span></div>
      <div class="tile"><span class="tile-titulo">Calorías</span><span class="tile-valor">≈ ${t.kcal ?? '—'}</span></div>
    </div>
    ${htmlAportes(meal.items)}
    <p class="ayuda">${esc(AVISO_ESTIMACION)} Aportar nutrientes no significa tratar deficiencias.</p>
    <div class="acciones"><button type="button" class="btn sec" data-cerrar>Cerrar</button></div>
  </div>`;
  fondo.addEventListener('click', e => {
    if (e.target === fondo || e.target.closest('[data-cerrar]')) fondo.remove();
    const c = e.target.closest('[data-cambiar]');
    if (c) { fondo.remove(); abrirCambio(meal, meal.items.find(i => i.id === c.dataset.cambiar), d, cb); }
  });
  document.body.appendChild(fondo);
}

function abrirCambio(meal, item, d, cb) {
  const alts = alternativas(meal, item, d.ctx.filtro);
  const a = alimentoPorId[item.alimentoId];
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = `<div class="modal" role="dialog" aria-labelledby="cm-t">
    <h2 id="cm-t">Cambiar ${esc(a.corto)}</h2>
    <p class="ayuda">Ahora: ${esc(textoPorcion(item.alimentoId, item.g))}. Alternativas con un aporte parecido:</p>
    ${alts.length ? `<div class="alternativas">${alts.map(x => `<button type="button" class="alternativa" data-alt="${esc(x.alimentoId)}" data-g="${x.g}">
      <strong>${esc(alimentoPorId[x.alimentoId].nombre)}</strong><span>${esc(textoPorcion(x.alimentoId, x.g))} · ≈ ${x.totales.kcal} kcal · ${x.totales.p} g proteína</span></button>`).join('')}</div>`
      : '<p>No hay alternativas compatibles con tus preferencias y alergias.</p>'}
    <label class="casilla"><input type="checkbox" id="cm-rechazar"> No quiero volver a ver <strong>${esc(a.corto)}</strong> (se cambia en todo el plan)</label>
    <div class="acciones"><button type="button" class="btn sec" data-cerrar>Cancelar</button></div>
  </div>`;
  fondo.addEventListener('click', async e => {
    if (e.target === fondo || e.target.closest('[data-cerrar]')) { fondo.remove(); return; }
    const b = e.target.closest('[data-alt]');
    if (!b) return;
    const rechazar = fondo.querySelector('#cm-rechazar').checked;
    fondo.remove();
    await cb.alCambiar(meal, item, { alimentoId: b.dataset.alt, g: Number(b.dataset.g) }, rechazar);
  });
  document.body.appendChild(fondo);
}

// "No lo tengo" / "No me lo comí": la app propone platos parecidos para seguir cumpliendo el plan
function abrirSustituto(meal, d, cb, motivo) {
  const opciones = platosParecidos(meal, d.ctx.filtro, 3);
  const t = meal.totales || {};
  const noComi = motivo === 'no-comi';
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = `<div class="modal sustituto" role="dialog" aria-labelledby="st-t">
    ${htmlQuien('nutricion', { compacto: true })}
    <span class="paso-num">${tipoComida(meal.tipo).icono} ${esc(tipoComida(meal.tipo).etiqueta)} · ${esc(meal.hora)}</span>
    <h2 id="st-t">${noComi ? '¿Comes algo parecido?' : 'No pasa nada: te busco otra opción'}</h2>
    <p class="ayuda">Tocaba <strong>${esc(meal.nombre)}</strong> (≈ ${t.kcal ?? '—'} kcal · ${t.p ?? '—'} g de proteína). Estas opciones aportan algo parecido, así sigues cumpliendo tu plan:</p>
    ${opciones.length ? `<div class="alternativas">${opciones.map((o, k) => `<button type="button" class="alternativa" data-op="${k}">
      <strong>${esc(o.nombre)}</strong>
      <span>${o.items.map(it => `${esc(alimentoPorId[it.alimentoId]?.corto)} ${esc(textoPorcion(it.alimentoId, it.g))}`).join(' · ')}</span>
      <span>≈ ${o.totales.kcal} kcal · ${o.totales.p} g de proteína</span></button>`).join('')}</div>`
      : '<p class="nota">No encontré otro plato compatible con tus gustos y alergias para esta hora. Prueba a cambiar solo un ingrediente.</p>'}
    ${meal.platoId ? `<h3>O cambia solo lo que te falta</h3>
      <ul class="porciones">${meal.items.map(it => `<li><span>${esc(alimentoPorId[it.alimentoId]?.nombre)}</span><span class="porc">${esc(textoPorcion(it.alimentoId, it.g))}</span>
        <button type="button" class="btn mini sec" data-cambiar="${esc(it.id)}">Cambiar</button></li>`).join('')}</ul>` : ''}
    <p class="ayuda">¿Hay algo que nunca comes o no consigues? Ponlo en <strong>🚫 Lo que no como</strong> y no volverá a salir.</p>
    <div class="acciones">${noComi ? '<button type="button" class="btn mini sec" data-saltar>No, ya pasó: ajusta el resto del día</button>' : ''}
      <button type="button" class="btn mini sec" data-cerrar>Cancelar</button></div>
  </div>`;
  fondo.addEventListener('click', async e => {
    if (e.target === fondo || e.target.closest('[data-cerrar]')) { fondo.remove(); return; }
    const c = e.target.closest('[data-cambiar]');
    if (c) { fondo.remove(); abrirCambio(meal, meal.items.find(i => i.id === c.dataset.cambiar), d, cb); return; }
    if (e.target.closest('[data-saltar]')) { fondo.remove(); await cb.alRegistrar(meal, 'no_realizada'); return; }
    const b = e.target.closest('[data-op]');
    if (b) { fondo.remove(); await cb.alCambiarPlato(meal, opciones[Number(b.dataset.op)]); }
  });
  document.body.appendChild(fondo);
}

const CATEGORIAS_ALIMENTO = [['proteina', 'Carnes, pescados y huevos'], ['legumbre', 'Legumbres'], ['lacteo', 'Lácteos'], ['carbohidrato', 'Arroz, pan y víveres'], ['vegetal', 'Vegetales'], ['fruta', 'Frutas'], ['grasa', 'Grasas y semillas']];

// 🚫 Mi lista de lo que no como (o no consigo): el menú y la lista de compras se arman sin eso
function abrirNoComo(d, cb) {
  elegirAlimentos({
    marcados: (d.ctx.restricciones || []).filter(r => r.tipo === 'rechazar').map(r => r.alimentoId),
    encabezado: htmlQuien('nutricion', { compacto: true }),
    titulo: '🚫 Lo que no como',
    texto: 'Toca lo que no comes, no te gusta o no consigues. Tu menú y tu lista de compras se arman sin eso y la app te pone algo parecido en su lugar.',
    guardar: 'Guardar mi lista', guardando: 'Actualizando tu menú…',
    alGuardar: cb.alNoComo,
  });
}

// Ventana para marcar alimentos por categoría, con buscador (también la usa la doctora en la ficha de su clienta)
export function elegirAlimentos({ marcados: lista = [], encabezado = '', titulo, texto, guardar, guardando, alGuardar }) {
  const marcados = new Set(lista);
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = `<div class="modal no-como" role="dialog" aria-labelledby="nc-t">
    ${encabezado}
    <h2 id="nc-t">${esc(titulo)}</h2>
    <p class="ayuda">${esc(texto)}</p>
    <input type="search" class="nc-buscar" placeholder="Buscar, por ejemplo: aguacate" aria-label="Buscar alimento">
    <p class="ayuda nc-cuenta"></p>
    ${CATEGORIAS_ALIMENTO.map(([c, n]) => `<section class="nc-cat"><h3>${esc(n)}</h3><div class="chips">${ALIMENTOS.filter(a => a.cat === c).map(a => `<button type="button" class="chip${marcados.has(a.id) ? ' activo' : ''}" data-nc="${esc(a.id)}" data-texto="${esc(normal(a.nombre + ' ' + a.corto))}" aria-pressed="${marcados.has(a.id)}">${esc(a.corto)}</button>`).join('')}</div></section>`).join('')}
    <div class="acciones"><button type="button" class="btn mini sec" data-cerrar>Cancelar</button><button type="button" class="btn mini" data-guardar>${esc(guardar)}</button></div>
  </div>`;
  const cuenta = () => { fondo.querySelector('.nc-cuenta').textContent = marcados.size ? `${marcados.size} marcados` : 'No has marcado ninguno.'; };
  cuenta();
  fondo.querySelector('.nc-buscar').addEventListener('input', e => {
    const q = normal(e.target.value);
    fondo.querySelectorAll('[data-nc]').forEach(b => { b.hidden = !!q && !(' ' + b.dataset.texto).includes(' ' + q); });
    fondo.querySelectorAll('.nc-cat').forEach(sec => { sec.hidden = ![...sec.querySelectorAll('[data-nc]')].some(b => !b.hidden); });
  });
  fondo.addEventListener('click', async e => {
    if (e.target === fondo || e.target.closest('[data-cerrar]')) { fondo.remove(); return; }
    const b = e.target.closest('[data-nc]');
    if (b) {
      const id = b.dataset.nc, on = !marcados.has(id);
      if (on) marcados.add(id); else marcados.delete(id);
      b.classList.toggle('activo', on); b.setAttribute('aria-pressed', on);
            cuenta();
      return;
    }
    const g = e.target.closest('[data-guardar]');
    if (g) { g.disabled = true; g.textContent = guardando; await alGuardar([...marcados]); fondo.remove(); }
  });
  document.body.appendChild(fondo);
}

// =====================================================================
// 🍽️ HOY
// =====================================================================
function tarjetaComida(m, d, { proxima = false, sinAnotar = false } = {}) {
  const tc = tipoComida(m.tipo);
  return `<article class="comida${proxima ? ' proxima' : ''} ${m.estado}" data-meal="${esc(m.id)}">
    <div class="comida-cab"><span class="comida-tipo">${tc.icono} ${esc(tc.etiqueta)}</span><span class="comida-hora">${esc(m.hora)}</span>
      ${proxima ? '<span class="insignia">Próxima comida</span>' : ''}
      ${m.indicada ? '<span class="insignia">🩺 La eligió tu nutrióloga</span>' : ''}
      ${m.pre ? '<span class="insignia ambar">Antes de entrenar: porción pequeña</span>' : ''}
      ${m.post ? `<span class="insignia verde">Después de entrenar${m.movida ? ' (se movió para no comer pesado antes)' : ''}</span>` : ''}
      ${m.ajuste ? `<span class="insignia ambar">Recalculada ${m.ajuste.cambio > 0 ? '+' : ''}${m.ajuste.cambio}%</span>` : ''}
      ${sinAnotar ? '<span class="insignia rojo">¿La comiste? Márcala</span>' : ''}
      ${ESTADOS[m.estado] ? `<span class="comida-estado">${esc(ESTADOS[m.estado])}</span>` : ''}</div>
    <h3 class="comida-nombre">${esc(m.nombre)}</h3>
    ${m.avisoIndicada ? `<p class="nota precaucion">🩺 ${esc(m.avisoIndicada)}</p>` : ''}
    ${htmlItems(m.items, d.ctx.filtro)}
    <p class="ayuda">${esc(macros(m.totales))}</p>${htmlAportes(m.items)}
    ${m.estado === 'diferente' && m.registro?.texto ? `<p class="nota">Comiste: ${esc(m.registro.texto)}${m.registro.porcion ? ` (${esc(m.registro.porcion)})` : ''}</p>` : ''}
    <div class="comida-acciones">
      <button type="button" class="btn mini sec" data-acc="detalle">Ver detalle</button>
      ${m.estado === 'planificada' ? `<button type="button" class="btn mini" data-acc="completada">✓ Me lo comí</button>
        <button type="button" class="btn mini sec" data-acc="mitad">◐ Comí la mitad</button>
        <button type="button" class="btn mini sec" data-acc="no-tengo">🛒 No lo tengo</button>
        <button type="button" class="btn mini sec" data-acc="no-comi">✕ No me lo comí</button>
        <button type="button" class="btn mini sec" data-acc="diferente">Comí algo diferente</button>`
        : '<button type="button" class="btn mini sec" data-acc="deshacer">Deshacer</button>'}
    </div>
    <form class="form-diferente" hidden novalidate>
      ${campo({ ruta: 'texto', etiqueta: '¿Qué comiste?', placeholder: 'Por ejemplo: arroz con pollo y una cocacola' })}
      <span class="campo-etiqueta">Cantidad aproximada</span>${chips({ ruta: 'porcion', opciones: CANTIDADES })}
      <div class="acciones izq"><button type="button" class="btn mini" data-acc="guardar-diferente">Guardar</button></div>
    </form>
  </article>`;
}

function pestanaHoy(cont, atleta, d, cb) {
  const hoy = hoyISO();
  const ahora = ahoraMin();
  // Ajuste del día: recalcula las comidas que faltan según lo que realmente se comió
  const aj = ajustarDia(d.comidasHoy, ahora, d.ctx.nec.limites);
  const plan = d.comidasHoy.filter(c => c.tipo !== 'extra')
    .map(c => (aj.ajustes[c.id] ? { ...c, items: aj.ajustes[c.id].items, totales: aj.ajustes[c.id].totales, ajuste: aj.ajustes[c.id] } : c));
  const sinAnotar = new Set(aj.sinAnotar.map(c => c.id));
  const proxima = plan.find(c => c.estado === 'planificada' && aMinutos(c.hora) >= ahora - 30) || null;
  const perfil = d.ctx.perfil;
  const entrenoHoy = (perfil.diasEntreno || []).includes(new Date().getDay());
  const hecha = d.sesionHoy && ['completada', 'incompleta'].includes(d.sesionHoy.estado);
  const antes = !hecha && entrenoHoy && d.sesionHoy?.workout?.tipo !== 'recuperacion'
    ? antesDeEntrenar(aMinutos(perfil.horaEntreno) - ahora, d.ctx.filtro, d.ctx.nec.medico) : null;
  const pct = Math.min(100, Math.round((aj.consumido.kcal / Math.max(1, aj.objetivo.kcal)) * 100));

  cont.innerHTML = `
    <div class="consejo-dia">💡 <strong>Consejo de Sofía:</strong> ${esc(consejoDelDia(hoy).replace(/^\S+\s/, ''))}</div>
    <h2>🍽️ Hoy · ${esc(fechaLarga(hoy))}</h2>
    <p class="ayuda">${plan.length} comidas planificadas · ${plan.filter(c => c.estado !== 'planificada').length} registradas${entrenoHoy ? ` · día de entrenamiento (${esc(perfil.horaEntreno)})` : ' · día sin entrenamiento previsto'}</p>
    <div class="meta-dia"><span>Llevas ≈ <strong>${aj.consumido.kcal}</strong> de ${aj.objetivo.kcal} kcal</span><span>≈ <strong>${aj.consumido.p}</strong> de ${aj.objetivo.p} g de proteína</span>
      <div class="progreso"><div class="barra" style="width:${pct}%"></div></div><span class="ayuda">Estimación orientativa con lo que marcaste y anotaste en tu libreta.</span></div>
    ${aj.ajustado ? `<div class="nota precaucion"><strong>🔄 Ajustamos tus próximas comidas de hoy</strong><ul>${aj.mensajes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`
      : aj.sinAnotar.length ? `<div class="nota precaucion">Tienes ${aj.sinAnotar.length} ${aj.sinAnotar.length === 1 ? 'comida pasada sin anotar' : 'comidas pasadas sin anotar'}: márcalas para que el plan se ajuste a lo que de verdad comiste.</div>` : ''}
    ${hecha ? `<div class="nota exito"><strong>💪 RECUPERACIÓN</strong><p>Tu alimentación posterior al entrenamiento forma parte de tu recuperación.</p>
      ${proxima ? `<p>Tu próxima comida planificada: <strong>${esc(tipoComida(proxima.tipo).etiqueta)} · ${esc(proxima.hora)}</strong> — ${esc(proxima.nombre)}.</p>` : '<p>Ya no quedan comidas planificadas hoy: si tienes hambre, algo ligero con proteína (yogur, leche o huevo).</p>'}
      <p class="ayuda">No hace falta comer en pocos minutos: lo importante es que tu siguiente comida tenga proteína y algo de carbohidrato.</p></div>` : ''}
    ${antes ? `<div class="nota precaucion"><strong>⚡ ANTES DE ENTRENAR</strong> <span class="ayuda">(entrenamiento previsto a las ${esc(perfil.horaEntreno)})</span>
      <p>${esc(antes.texto)}</p>${antes.opciones.length ? `<ul>${antes.opciones.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}<p class="ayuda">${esc(antes.aviso)}</p></div>` : ''}
    ${plan.length ? '' : '<p class="nota">No hay comidas planificadas hoy.</p>'}
    <div class="comidas">${plan.map(m => tarjetaComida(m, d, { proxima: m === proxima, sinAnotar: sinAnotar.has(m.id) })).join('')}</div>
    <div class="acciones izq"><button type="button" class="btn mini sec" id="ir-libreta">📒 Anotar en mi libreta algo que comí o bebí</button>
      <button type="button" class="btn mini sec" id="no-como">🚫 Lo que no como (${(d.ctx.restricciones || []).filter(r => r.tipo === 'rechazar').length})</button></div>
    <p class="ayuda">${esc(AVISO_RELACION_COMIDA)}</p>
    ${porQueHtml('proteina')}${porQueHtml('vegetales')}${porQueHtml('carbohidratos')}`;

  cont.querySelectorAll('.form-diferente').forEach(f => activarChips(f));
  cont.querySelector('#ir-libreta').onclick = () => cb.alPestana('libreta');
  cont.querySelector('#no-como').onclick = () => abrirNoComo(d, cb);
  cont.addEventListener('click', async e => {
    const b = e.target.closest('[data-acc]'); if (!b) return;
    const art = b.closest('[data-meal]');
    const meal = plan.find(m => m.id === art.dataset.meal);
    const acc = b.dataset.acc;
    if (acc === 'detalle') return abrirDetalle(meal, d, cb);
    if (acc === 'no-tengo' || acc === 'no-comi') return abrirSustituto(meal, d, cb, acc);
    if (acc === 'diferente') { art.querySelector('.form-diferente').hidden = false; art.querySelector('input').focus(); return; }
    if (acc === 'guardar-diferente') {
      const r = leerFormulario(art.querySelector('.form-diferente'), {});
      if (!r.texto) return aviso('Escribe qué comiste', 'error');
      const lineas = entenderTexto(r.texto);
      return cb.alRegistrar(meal, 'diferente', { texto: r.texto, porcion: r.porcion, ...(lineas.length ? { lineas, totales: totalesLineas(lineas) } : {}) });
    }
    if (acc === 'deshacer') return cb.alRegistrar(meal, 'planificada');
    // Si la comida estaba recalculada, se guarda lo que realmente se sirvió
    if (['completada', 'mitad'].includes(acc)) return cb.alRegistrar(meal, acc, meal.ajuste ? { totalesComidos: meal.ajuste.totales } : null);
  });
}

// =====================================================================
// 📒 LIBRETA: todo lo que se come y bebe en el día + seguimiento rápido
// =====================================================================
function pestanaLibreta(cont, atleta, d, cb) {
  const hoy = hoyISO();
  const fecha = d.fechaLibreta || hoy;
  const esHoy = fecha === hoy;
  const comidasDia = d.registro.filter(c => c.fecha === fecha && (c.tipo === 'extra' || COMIDO.includes(c.estado)))
    .map(c => ({ ...c, _tipo: 'comida', _min: aMinutos(horaDe(c)) }));
  const aguaDia = (d.aguaLogs || []).filter(l => l.fecha === fecha).map(l => ({ ...l, _tipo: 'agua', _min: aMinutos(l.hora) }));
  const linea = [...comidasDia, ...aguaDia].sort((a, b) => a._min - b._min);
  const totalAgua = aguaDia.reduce((a, l) => a + l.ml, 0);
  const sin = esHoy ? ultimaIngesta(d.registro) : null;
  const ct = d.seguimiento.contadores;
  const msgs = esHoy ? mensajesDia(ct, { cardio: d.ctx.nec?.medico?.cardio }) : [];
  const animo = esHoy ? [
    totalAgua >= (d.metaAgua || Infinity) ? ANIMO.agua : null,
    ct.frutas.porciones >= ct.frutas.meta.min ? ANIMO.frutas : null,
    ct.cafe.tazas > 0 && !ct.cafe.pasado && !ct.cafe.tarde ? ANIMO.cafeOk : null,
    d.historial?.logros.racha >= 2 ? ANIMO.racha(d.historial.logros.racha) : null,
  ].filter(Boolean) : [];
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, -i));
  const frutasRapidas = ['al_guineo', 'al_naranja', 'al_mango', 'al_lechosa', 'al_pina', 'al_guayaba', 'al_cereza', 'uvas', 'al_manzana'].filter(id => porIdComun(id));
  let previa = null;

  cont.innerHTML = `<h2>📒 Mi libreta</h2>
    <p class="subtitulo">Anota todo lo que comes y bebes, esté o no en el plan. Escríbelo como lo dirías: "una pizza y una cocacola". Sin juicios: sirve para conocerte y ajustar el plan a tu vida real.</p>
    <div class="chips" id="dias-libreta">${dias.map(f => `<button type="button" class="chip${f === fecha ? ' activo' : ''}" data-fecha="${f}">${f === hoy ? 'Hoy' : esc(fechaCorta(f))}</button>`).join('')}</div>

    ${esHoy ? `<div class="seguimiento">
      <div class="seg-tarjeta"><span class="seg-titulo">⏱️ Sin comer</span><span class="seg-valor">${sin ? esc(textoDuracion(sin.minutos)) : '—'}</span><span class="seg-extra">${sin ? `desde las ${esc(horaDe(sin.comida))}` : 'anota tu primera comida'}</span></div>
      <div class="seg-tarjeta"><span class="seg-titulo">💧 Agua</span><span class="seg-valor">${totalAgua} ml</span><span class="seg-extra">de ${d.metaAgua || '—'} ml</span></div>
      <div class="seg-tarjeta"><span class="seg-titulo">🍎 Frutas</span><span class="seg-valor">${String(ct.frutas.porciones).replace('.', ',')}</span><span class="seg-extra">de ${ct.frutas.meta.min}–${ct.frutas.meta.max} porciones</span></div>
      <div class="seg-tarjeta${ct.cafe.pasado ? ' alerta' : ''}"><span class="seg-titulo">☕ Café</span><span class="seg-valor">${String(ct.cafe.tazas).replace('.', ',')} ${ct.cafe.tazas === 1 ? 'taza' : 'tazas'}</span><span class="seg-extra">≈ ${ct.cafe.cafeina} de ${ct.cafe.limite} mg</span></div>
      <div class="seg-tarjeta${ct.azucar.g > ct.azucar.ref.maximo ? ' alerta' : ''}"><span class="seg-titulo">🍬 Azúcar añadida</span><span class="seg-valor">${ct.azucar.cucharaditas}</span><span class="seg-extra">cucharaditas (ref. &lt; ${ct.azucar.ref.maximo / 4})</span></div>
      <div class="seg-tarjeta"><span class="seg-titulo">💊 Vitaminas</span><span class="seg-valor">${ct.suplementos.tomados} / ${ct.suplementos.total}</span><span class="seg-extra">${ct.suplementos.total ? 'tomadas hoy' : 'ninguna registrada'}</span></div>
    </div>
    ${animo.map(a => `<p class="nota exito">${esc(a)}</p>`).join('')}
    ${msgs.length ? `<ul class="razones">${msgs.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}

    <h3>⚡ Anotar rápido</h3>
    <div class="rapido"><span class="campo-etiqueta">💧 ¿Tomaste agua? ¿Cuánto?</span>
      <div class="botones-fila">${BOTONES_AGUA.map(ml => `<button type="button" class="btn mini" data-ml="${ml}">Tomé ${ml} ml</button>`).join('')}<button type="button" class="btn mini sec" id="agua-otra">Otra cantidad</button></div></div>
    <div class="rapido"><span class="campo-etiqueta">🍎 Comí una fruta</span>
      <div class="botones-fila">${frutasRapidas.map(id => `<button type="button" class="btn mini sec" data-rapido="${id}">${esc(porIdComun(id).nombre.replace(/ \(.*\)/, ''))}</button>`).join('')}</div></div>
    <div class="rapido"><span class="campo-etiqueta">☕ Tomé café</span>
      <div class="botones-fila"><button type="button" class="btn mini sec" data-rapido="cafecito" data-azucar="1">Cafecito</button><button type="button" class="btn mini sec" data-rapido="cafecito" data-azucar="0">Cafecito sin azúcar</button>
        <button type="button" class="btn mini sec" data-rapido="cafe_leche" data-azucar="1">Café con leche</button><button type="button" class="btn mini sec" data-rapido="cafe_leche" data-azucar="0">Café con leche sin azúcar</button></div></div>
    <div class="rapido"><span class="campo-etiqueta">💊 Vitaminas y suplementos</span>
      <div class="botones-fila">${ct.suplementos.lista.length ? ct.suplementos.lista.map(s => `<button type="button" class="btn mini ${s.tomado ? '' : 'sec'}" data-toma="${esc(s.id)}">${s.tomado ? '✓ ' : ''}${esc(s.nombre)}</button>`).join('')
        : '<button type="button" class="btn mini sec" id="ir-sup">Registrar una vitamina o suplemento</button>'}</div></div>` : ''}

    <h3>✏️ ¿Qué comiste o bebiste?</h3>
    <form id="libreta-form" novalidate>
      <div class="fila">${campo({ ruta: 'horaComida', etiqueta: 'Hora', tipo: 'time', valor: esHoy ? new Date().toTimeString().slice(0, 5) : '12:00' })}
        ${campo({ ruta: 'texto', etiqueta: 'Escríbelo como lo dirías', placeholder: 'Por ejemplo: una pizza y una cocacola' })}</div>
      <div id="entendido"></div>
      <div id="sin-reconocer" hidden><span class="campo-etiqueta">Cantidad aproximada</span>${chips({ ruta: 'porcion', opciones: CANTIDADES })}</div>
      ${campo({ ruta: 'nota', etiqueta: 'Nota (opcional)', placeholder: '¿Tenías hambre? ¿Dónde estabas? ¿Cómo te sentiste?' })}
      <div class="acciones izq"><button type="button" class="btn mini" id="libreta-guardar">➕ Anotar</button></div>
    </form>

    <div class="libreta">
      <div class="libreta-cab">${esc(fechaLarga(fecha))} · ${comidasDia.length} ${comidasDia.length === 1 ? 'anotación' : 'anotaciones'} · 💧 ${totalAgua} ml</div>
      ${linea.length ? `<ol class="libreta-lista">${linea.map(c => {
        if (c._tipo === 'agua') return `<li class="lb-agua"><span class="lb-hora">${esc(c.hora)}</span><span class="lb-texto"><strong>💧 Agua: ${c.ml} ml</strong></span>
          <button type="button" class="btn mini sec" data-borrar-agua="${esc(c.id)}" aria-label="Eliminar registro de agua">✕</button></li>`;
        const hueco = previa != null && !c.registro?.soloBebida ? c._min - previa : null;
        if (!c.registro?.soloBebida) previa = c._min;
        const extra = c.tipo === 'extra';
        const que = extra ? c.nombre : c.estado === 'diferente' ? `${c.registro?.texto || c.nombre} (en lugar de: ${c.nombre})` : c.estado === 'mitad' ? `La mitad de: ${c.nombre}` : c.nombre;
        const vals = (c.registro?.lineas || []).map(valoresLinea).filter(Boolean);
        return `${hueco > 0 ? `<li class="lb-hueco">⏱️ ${esc(textoDuracion(hueco))} sin comer</li>` : ''}<li><span class="lb-hora">${esc(horaDe(c))}</span>
          <span class="lb-texto"><strong>${esc(que)}</strong>
          ${vals.length ? `<span class="ayuda">${vals.map(v => `${v.icono} ${esc(v.nombre)} ×${String(v.cantidad).replace('.', ',')}`).join(' · ')} · ≈ ${c.registro.totales?.kcal ?? '—'} kcal</span>`
            : `<span class="ayuda">${extra ? '📝 Anotado por ti' : `${tipoComida(c.tipo).icono} ${esc(tipoComida(c.tipo).etiqueta)} del plan`}${c.registro?.porcion ? ` · ${esc(c.registro.porcion)}` : ''}</span>`}
          ${c.registro?.nota ? `<em class="lb-nota">${esc(c.registro.nota)}</em>` : ''}</span>
          ${extra ? `<button type="button" class="btn mini sec" data-borrar="${esc(c.id)}" aria-label="Eliminar anotación">✕</button>` : ''}</li>`;
      }).join('')}</ol>` : '<p class="libreta-vacia">Todavía no hay nada anotado este día.</p>'}
    </div>
    <p class="ayuda">Las comidas del plan que marcas en "Hoy" aparecen aquí solas. Lo que anotas recalcula las comidas que te faltan del día. ${esc(AVISO_ESTIMACION)}</p>
    ${porQueHtml('frutas')}${porQueHtml('cafe')}${porQueHtml('alcohol')}`;

  // ----- Reconocimiento en vivo de lo que se escribe -----
  const f = cont.querySelector('#libreta-form');
  activarChips(f);
  let lineas = [];
  const pintar = () => {
    const box = cont.querySelector('#entendido');
    cont.querySelector('#sin-reconocer').hidden = !!lineas.length || !f.querySelector('[data-ruta="texto"]').value.trim();
    if (!lineas.length) { box.innerHTML = ''; return; }
    const tot = totalesLineas(lineas);
    const consejos = [...new Set(lineas.map(l => valoresLinea(l)?.consejo).filter(Boolean))];
    box.innerHTML = `<div class="entendido"><span class="campo-etiqueta">Lo que entendimos (ajusta la cantidad)</span>
      <ul>${lineas.map((l, i) => { const v = valoresLinea(l); return `<li><span>${v.icono} ${esc(v.nombre)}</span>
        <span class="cantidad"><button type="button" class="btn mini sec" data-menos="${i}" aria-label="Menos">−</button><strong>${String(l.cantidad).replace('.', ',')}</strong> <small>${esc(v.unidad)}</small><button type="button" class="btn mini sec" data-mas="${i}" aria-label="Más">+</button></span>
        <span class="ayuda">≈ ${v.kcal} kcal${v.azucar ? ` · ${Math.round(v.azucar / 4)} cdtas de azúcar` : ''}${v.cafeina ? ` · ${v.cafeina} mg cafeína` : ''}</span></li>`; }).join('')}</ul>
      <p><strong>Total ≈ ${tot.kcal} kcal · ${tot.p} g proteína</strong></p>
      ${consejos.map(c => `<p class="ayuda">💡 ${esc(c)}</p>`).join('')}</div>`;
  };
  f.querySelector('[data-ruta="texto"]').addEventListener('input', e => { lineas = entenderTexto(e.target.value); pintar(); });
  cont.querySelector('#entendido').addEventListener('click', e => {
    const m = e.target.closest('[data-menos]'), p = e.target.closest('[data-mas]');
    if (m) { const l = lineas[m.dataset.menos]; l.cantidad = Math.max(0.5, l.cantidad - (l.cantidad > 1 ? 1 : 0.5)); pintar(); }
    if (p) { const l = lineas[p.dataset.mas]; l.cantidad = l.cantidad < 1 ? 1 : l.cantidad + 1; pintar(); }
  });
  cont.querySelector('#libreta-guardar').onclick = () => {
    const r = leerFormulario(f, {});
    if (!r.texto) return aviso('Escribe qué comiste o bebiste', 'error');
    cb.alAnotar({ texto: r.texto, lineas, porcion: lineas.length ? '' : r.porcion, nota: r.nota, horaComida: r.horaComida, fecha });
  };

  // ----- Anotar rápido -----
  cont.querySelector('#dias-libreta').addEventListener('click', e => { const b = e.target.closest('[data-fecha]'); if (b) cb.alPestana('libreta', { fechaLibreta: b.dataset.fecha }); });
  cont.querySelectorAll('[data-ml]').forEach(b => { b.onclick = () => cb.alAgua(Number(b.dataset.ml)); });
  cont.querySelector('#agua-otra')?.addEventListener('click', () => {
    const v = Number(String(prompt('¿Cuántos ml tomaste?', '300') || '').replace(',', '.'));
    if (v >= 10 && v <= 3000) cb.alAgua(Math.round(v)); else if (v) aviso('Escribe una cantidad entre 10 y 3000 ml', 'error');
  });
  cont.querySelectorAll('[data-rapido]').forEach(b => {
    b.onclick = () => {
      const x = porIdComun(b.dataset.rapido);
      cb.alAnotar({ texto: `${x.nombre}${b.dataset.azucar === '0' ? ' sin azúcar' : ''}`, lineas: [{ id: x.id, cantidad: 1, conAzucar: b.dataset.azucar === '1' }], fecha });
    };
  });
  cont.querySelectorAll('[data-toma]').forEach(b => { b.onclick = () => cb.alToma(b.dataset.toma); });
  cont.querySelector('#ir-sup')?.addEventListener('click', () => cb.alPestana('suplementos'));
  cont.querySelector('.libreta-lista')?.addEventListener('click', async e => {
    const b = e.target.closest('[data-borrar]');
    if (b && await confirmar('¿Eliminar esta anotación?')) cb.alBorrarAnotacion(b.dataset.borrar);
    const ba = e.target.closest('[data-borrar-agua]');
    if (ba && await confirmar('¿Eliminar este registro de agua?')) cb.alBorrarAgua(ba.dataset.borrarAgua);
  });
}

// =====================================================================
// ❤️ MIS GUSTOS + 📋 resumen para mi nutricionista
// =====================================================================
// Lo que le indicó su nutrióloga (real, desde su panel): su dieta, su nota, sus límites y sus alimentos
function htmlIndicada(indicada, ind) {
  if (!indicada) return '';
  const nombres = ids => (ids || []).map(id => alimentoPorId[id]?.corto || id).join(', ');
  const miles = n => Math.round(n).toLocaleString('es-DO');
  const lineas = [
    ind?.comidas && `🍽️ ${ind.comidas} comidas al día`,
    ind?.carbos_comida && `🍚 Carbohidratos: máximo ${ind.carbos_comida} g en cada comida`,
    Number.isFinite(ind?.frutas_dia) && (ind.frutas_dia ? `🍎 Frutas: máximo ${ind.frutas_dia} al día, enteras` : '🍎 Sin frutas por ahora'),
    ind?.bajo_sal && `🧂 Baja en sal${ind.sodio_mg ? `: menos de ${miles(ind.sodio_mg)} mg de sodio al día (≈ ${String(Math.round(ind.sodio_mg / 400 * 10) / 10).replace('.', ',')} g de sal)` : ''}`,
    !ind?.bajo_sal && ind?.sodio_mg && `🧂 Sodio: menos de ${miles(ind.sodio_mg)} mg al día`,
    ind?.agua_ml && (ind.agua_maximo ? `💧 Líquidos: no más de ${miles(ind.agua_ml)} ml al día` : `💧 Agua: ${miles(ind.agua_ml)} ml al día`),
    ind?.no_come?.length && `🚫 Sin: ${nombres(ind.no_come)}`,
    ind?.reducir?.length && `➖ Menos: ${nombres(ind.reducir)}`,
    ind?.priorizar?.length && `➕ Más: ${nombres(ind.priorizar)}`,
    ind?.nutrientes?.length && `⭐ Más alimentos ricos en: ${ind.nutrientes.map(n => nutrientePorId[n]?.nombre.toLowerCase() || n).join(', ')}`,
    ind?.menu && Object.keys(ind.menu).length && '📅 Algunos platos de tu semana los eligió ella (🩺)',
  ].filter(Boolean);
  return `<div class="nota indicada">
    <p><strong>🩺 Plan de ${esc(indicada.por)}</strong>${indicada.dieta ? ` · ${esc(indicada.dieta)}` : ''}</p>
    ${indicada.nota ? `<p class="no-texto">“${esc(indicada.nota)}”</p>` : ''}
    ${lineas.length ? `<ul class="indicada-lista">${lineas.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

export const PREGUNTAS_GUSTOS = [
  { id: 'encantan', etiqueta: '¿Qué comidas te encantan?', ayuda: 'Por ejemplo: mangú, la bandera con pollo guisado, sancocho, pescado frito…' },
  { id: 'habitual', etiqueta: '¿Qué comes normalmente en el desayuno, el almuerzo y la cena?', ayuda: 'Cuéntalo como es de verdad, sin adornos.' },
  { id: 'preparacion', etiqueta: '¿Cómo te gusta prepararla?', ayuda: 'Frito, guisado, hervido, a la plancha, con mucha o poca sal, con salsa…' },
  { id: 'calle', etiqueta: '¿Qué comes en la calle, en el trabajo o los fines de semana?', ayuda: 'Picaderas, fritura, pica pollo, pizza, comida de fonda…' },
  { id: 'bebidas', etiqueta: '¿Qué bebes durante el día?', ayuda: 'Café (cuántas tazas y con cuánta azúcar), refrescos, jugos, malta, alcohol…' },
  { id: 'antojos', etiqueta: '¿Qué antojos tienes y cuándo te dan?', ayuda: 'Dulces en la noche, pan en la tarde, algo salado viendo televisión…' },
  { id: 'horarios', etiqueta: '¿A qué horas comes de verdad?', ayuda: 'Si a veces te saltas comidas, dilo.' },
  { id: 'notas', etiqueta: 'Algo más que tu nutricionista deba saber', ayuda: 'Quién cocina en tu casa, cuánto puedes gastar, lo que te cuesta cambiar…' },
];

function textoResumen(atleta, d) {
  const { nec, perfil, preferencias, alergias, restricciones } = d.ctx;
  const p = atleta.personal || {};
  const g = preferencias.gustos || {};
  const med = nec.medico || {};
  const nombres = ids => ids.map(id => alimentoPorId[id]?.corto).filter(Boolean).join(', ') || '—';
  const condiciones = [med.embarazo && 'embarazo o parto reciente', med.metabolica && 'condición metabólica (p. ej. diabetes)', med.cardio && 'corazón o presión alta',
    med.medicacion && 'toma medicación', med.cronica && 'enfermedad crónica', med.cirugia && 'cirugía reciente'].filter(Boolean);
  const s = d.resumenSemana;
  const v = imc(p.peso, p.estatura);
  return [
    `RESUMEN PARA MI NUTRICIONISTA — LA FORJA (${fechaLarga(hoyISO())})`,
    '',
    `Persona: ${p.nombre || '—'} · ${p.edad || '—'} años · ${p.sexo || '—'} · ${U.fmtPeso(p.peso, atleta, { conOtra: true })} · ${U.fmtEstatura(p.estatura, atleta, { conOtra: true })}${v ? ` · IMC ${v}` : ''}`,
    `Objetivo: ${objetivoNut(nec.objetivo).etiqueta} · Entrena ${(perfil.diasEntreno || []).length} días/semana a las ${perfil.horaEntreno}`,
    `Salud: ${condiciones.length ? condiciones.join(', ') : 'nada indicado en la evaluación'}`,
    `Alergias: ${alergias.length ? alergias.map(a => (a.alergeno === 'otra' ? a.nota : ALERGENOS.find(x => x.id === a.alergeno)?.etiqueta)).join(', ') : 'ninguna indicada'}`,
    `No come: ${nombres(restricciones.filter(r => r.tipo === 'rechazar').map(r => r.alimentoId))}`,
    `Prefiere comer poco: ${nombres(restricciones.filter(r => r.tipo === 'reducir').map(r => r.alimentoId))}`,
    `Favoritos: ${nombres(preferencias.favoritos || [])}`,
    `Platos que no quiere: ${(preferencias.platosRechazados || []).map(id => NOMBRES_PLATO[id]).filter(Boolean).join(', ') || '—'}`,
    `Tipo de alimentación: ${PATRONES.find(x => x.id === preferencias.patron)?.etiqueta || '—'} · ${perfil.comidas} comidas al día`,
    `Plan orientativo de la app: ≈ ${nec.kcal} kcal · ${nec.proteina} g proteína · ${nec.carbohidratos} g carbohidratos · ${nec.grasas} g grasas · ≥ ${nec.fibra} g fibra`,
    '',
    'EN SUS PALABRAS',
    ...PREGUNTAS_GUSTOS.map(q => `• ${q.etiqueta}\n  ${(g[q.id] || '—').replace(/\n/g, '\n  ')}`),
    '',
    s ? `ÚLTIMOS 7 DÍAS: comidas registradas ${s.comidas.registradas}/${s.comidas.planificadas} · agua ${s.hidratacion.pct}% de la meta · frutas ${String(s.frutas.promedio).replace('.', ',')} porciones/día · café ${String(s.cafe.tazas).replace('.', ',')} tazas/día (≈ ${s.cafe.cafeina} mg) · azúcar añadida ≈ ${String(s.azucar.cucharaditas).replace('.', ',')} cdtas/día · sueño ${s.sueno.promedioMin ? textoDuracion(s.sueno.promedioMin) : '—'} · entrenamientos ${s.entrenamientos.hechos}/${s.entrenamientos.plan}` : '',
  ].join('\n');
}

function pestanaGustos(cont, atleta, d, cb) {
  const g = d.ctx.preferencias.gustos || {};
  const favoritos = new Set(d.ctx.preferencias.favoritos || []);
  cont.innerHTML = `<h2>❤️ Mi libreta de gustos</h2>
    <p class="subtitulo">Escribe con tus palabras lo que te gusta comer y cómo comes de verdad. Así tu nutricionista sabe cómo trabajar contigo, y la app arma un menú que sí vas a disfrutar.</p>
    <form id="gustos" novalidate>${PREGUNTAS_GUSTOS.map(q => `<label class="campo"><span class="campo-etiqueta">${esc(q.etiqueta)}</span>
      <textarea data-ruta="${q.id}" rows="3" placeholder="${esc(q.ayuda)}">${esc(g[q.id] || '')}</textarea></label>`).join('')}</form>
    <div id="detectados"></div>
    <div class="acciones izq"><button type="button" class="btn" id="gustos-guardar">💾 Guardar mi libreta</button></div>
    ${g.actualizado ? `<p class="ayuda">Última actualización: ${esc(new Date(g.actualizado).toLocaleString('es'))}</p>` : ''}

    <h2>📋 Resumen para mi nutricionista</h2>
    <p class="ayuda">Todo lo importante en una sola hoja: tus datos, tu salud, tus gustos y cómo te ha ido esta semana. Cópialo y envíaselo o enséñaselo en la consulta.</p>
    <pre class="resumen-nutri" id="resumen">${esc(textoResumen(atleta, d))}</pre>
    <div class="acciones izq"><button type="button" class="btn mini" id="copiar">📋 Copiar resumen</button><button type="button" class="btn mini sec" id="imprimir">🖨️ Imprimir</button></div>`;
  const f = cont.querySelector('#gustos');
  let sugeridos = [];
  const detectar = () => {
    const texto = PREGUNTAS_GUSTOS.slice(0, 4).map(q => f.querySelector(`[data-ruta="${q.id}"]`).value).join(' ');
    sugeridos = alimentosEnTexto(texto).filter(id => !favoritos.has(id) && d.ctx.filtro.permitido(id));
    cont.querySelector('#detectados').innerHTML = sugeridos.length ? `<div class="entendido"><span class="campo-etiqueta">Encontramos en tu libreta (toca para quitar los que no quieras como favoritos)</span>
      ${chips({ ruta: 'favs', multi: true, valor: sugeridos, opciones: sugeridos.map(id => ({ id, etiqueta: alimentoPorId[id].corto })) })}
      <p class="ayuda">Los favoritos aparecerán con más frecuencia en tu menú.</p></div>` : '';
  };
  cont.querySelector('#detectados').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (b) b.classList.toggle('activo');
  });
  f.addEventListener('input', detectar); detectar();
  cont.querySelector('#gustos-guardar').onclick = () => {
    const r = leerFormulario(f, {});
    const elegidos = [...cont.querySelectorAll('#detectados .chip.activo')].map(c => c.dataset.valor);
    cb.alGuardarGustos(r, elegidos);
  };
  cont.querySelector('#copiar').onclick = async () => {
    try { await navigator.clipboard.writeText(cont.querySelector('#resumen').textContent); aviso('Resumen copiado'); }
    catch { aviso('No se pudo copiar: selecciónalo y cópialo a mano', 'error'); }
  };
  cont.querySelector('#imprimir').onclick = () => {
    const w = window.open('', '_blank');
    if (!w) return aviso('Permite las ventanas emergentes para imprimir', 'error');
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Resumen para mi nutricionista</title><pre style="font:14px/1.5 system-ui;white-space:pre-wrap">${esc(cont.querySelector('#resumen').textContent)}</pre>`);
    w.document.close(); w.print();
  };
}

// =====================================================================
// 📅 SEMANA y 🗓️ MES
// =====================================================================
const selectorSemanas = (d, sel) => `<div class="chips" id="semanas">${d.semanas.map((s, k) => `<button type="button" class="chip${s === sel ? ' activo' : ''}" data-semana="${s}">Semana ${k + 1} · ${esc(fechaCorta(s))}</button>`).join('')}</div>`;

function pestanaSemana(cont, atleta, d, cb) {
  const sel = d.semana || d.semanas[0];
  const hoy = hoyISO();
  cont.innerHTML = `<h2>📅 Plan semanal</h2>${selectorSemanas(d, sel)}
    <div class="semana">${Array.from({ length: 7 }, (_, i) => sumarDias(sel, i)).map(f => {
      const cs = d.comidasMes.filter(c => c.fecha === f && c.tipo !== 'extra');
      return `<details class="dia-plan"${f === hoy ? ' open' : ''}><summary><span class="dp-dia">${esc(fechaLarga(f))}</span>${cs.some(c => c.entreno) ? '<span class="insignia">🏋️ Entreno</span>' : '<span class="insignia gris">Descanso</span>'}
        <span class="ayuda">≈ ${cs.reduce((a, c) => a + (c.totales?.kcal || 0), 0)} kcal · ${cs.reduce((a, c) => a + (c.totales?.p || 0), 0)} g proteína</span></summary>
        <ul class="lista-comidas">${cs.map(c => `<li><button type="button" class="enlace" data-ver="${esc(c.id)}"><span class="lc-tipo">${tipoComida(c.tipo).icono} ${esc(tipoComida(c.tipo).etiqueta)} · ${esc(c.hora)}</span> ${esc(c.nombre)}</button>${ESTADOS[c.estado] ? ` <span class="ayuda">${esc(ESTADOS[c.estado])}</span>` : ''}</li>`).join('')}</ul></details>`;
    }).join('')}</div>
    <p class="ayuda">Los días de entrenamiento llevan un poco más de energía y los de descanso un poco menos; en la semana se equilibra. Toca una comida para ver el detalle y cambiar alimentos.</p>`;
  cont.querySelector('#semanas').addEventListener('click', e => { const b = e.target.closest('[data-semana]'); if (b) cb.alPestana('semana', { semana: b.dataset.semana }); });
  cont.addEventListener('click', e => { const b = e.target.closest('[data-ver]'); if (b) abrirDetalle(d.comidasMes.find(c => c.id === b.dataset.ver), d, cb); });
}

function pestanaMes(cont, atleta, d, cb) {
  const conteo = {};
  for (const c of d.comidasMes) for (const it of c.items || []) {
    const a = alimentoPorId[it.alimentoId];
    if (a && (['proteina', 'legumbre'].includes(a.cat) || (a.cat === 'lacteo' && it.rol === 'proteina'))) conteo[a.corto] = (conteo[a.corto] || 0) + 1;
  }
  const grupo = cat => [...new Set(d.comidasMes.flatMap(c => (c.items || []).map(i => alimentoPorId[i.alimentoId]).filter(a => a?.cat === cat).map(a => a.corto)))];
  cont.innerHTML = `<h2>🗓️ Plan mensual (4 semanas)</h2>
    <div class="mes">${d.semanas.map((s, k) => `<section class="semana-mes"><h3>Semana ${k + 1} · desde ${esc(fechaCorta(s))}</h3>
      <div class="tabla-mes">${Array.from({ length: 7 }, (_, i) => sumarDias(s, i)).map(f => {
        const cs = d.comidasMes.filter(c => c.fecha === f && ['desayuno', 'almuerzo', 'cena'].includes(c.tipo));
        return `<div class="fila-mes"><span class="fm-dia">${esc(fechaCorta(f))}${cs.some(c => c.entreno) ? ' 🏋️' : ''}</span><span class="fm-comidas">${cs.map(c => `<button type="button" class="enlace" data-ver="${esc(c.id)}">${tipoComida(c.tipo).icono} ${esc(c.nombre)}</button>`).join('')}</span></div>`;
      }).join('')}</div></section>`).join('')}</div>
    <h2>Variedad del mes</h2>
    <div class="variedad">
      <p><strong>Proteínas:</strong> ${Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([n, v]) => `${esc(n)} ×${v}`).join(' · ')}</p>
      <p><strong>Vegetales:</strong> ${esc(grupo('vegetal').join(', '))}</p>
      <p><strong>Frutas:</strong> ${esc(grupo('fruta').join(', '))}</p>
      <p><strong>Arroz, pan y víveres:</strong> ${esc(grupo('carbohidrato').join(', '))}</p>
      <p><strong>Legumbres:</strong> ${esc(grupo('legumbre').join(', '))}</p>
      <p><strong>Grasas saludables:</strong> ${esc(grupo('grasa').join(', '))}</p>
    </div>
    ${porQueHtml('nutrientes')}`;
  cont.addEventListener('click', e => { const b = e.target.closest('[data-ver]'); if (b) abrirDetalle(d.comidasMes.find(c => c.id === b.dataset.ver), d, cb); });
}

// =====================================================================
// 🛒 COMPRAS
// =====================================================================
function pestanaCompras(cont, atleta, d, cb) {
  const sel = d.semana || d.semanas[0];
  const { items } = d.compras;
  const pres = d.ctx.perfil.presupuesto || {};
  const precioDe = i => (i.precio != null && i.precio !== '' ? Number(i.precio) : i.precioRef ?? null);
  const conPrecio = items.filter(i => precioDe(i) != null);
  const total = conPrecio.reduce((a, i) => a + precioDe(i), 0);
  const propios = items.filter(i => i.precio != null && i.precio !== '').length;
  cont.innerHTML = `<h2>🛒 Lista de compras</h2>${selectorSemanas(d, sel)}
    <p><strong>${items.filter(i => !i.comprado).length}</strong> productos pendientes de ${items.length}. <span class="ayuda">Cantidades aproximadas para la semana (en crudo o seco).</span></p>
    <div class="nota"><strong>💰 Presupuesto</strong>
      <p>Costo estimado de la semana: <strong>≈ ${rd(total)}</strong> <span class="ayuda">(${propios} con tu precio, ${conPrecio.length - propios} con ${esc(PRECIOS_FECHA)})</span>.</p>
      <p>${pres.monto ? `Tu presupuesto semanal: <strong>${esc(pres.moneda || 'RD$')} ${Number(pres.monto).toLocaleString('es')}</strong> — ${total > pres.monto ? '<span class="txt-rojo">el estimado está por encima</span>: en Preferencias elige presupuesto "Bajo" para priorizar alimentos más económicos y nutritivos.' : 'el estimado está dentro.'}` : 'Puedes indicar tu presupuesto semanal en Preferencias.'}</p>
      <p class="ayuda">Nivel: ${esc({ bajo: 'Bajo (huevo, habichuelas, sardinas, pollo, víveres y frutas de temporada primero)', medio: 'Medio', amplio: 'Amplio' }[pres.nivel || 'medio'])}.</p></div>
    <div class="compras">${CATEGORIAS_COMPRA.map(cat => {
      const lista = items.filter(i => i.categoria === cat.id).sort((a, b) => (a.comprado - b.comprado) || a.nombre.localeCompare(b.nombre, 'es'));
      if (!lista.length) return '';
      return `<section class="cat-compra"><h3>${cat.icono} ${esc(cat.etiqueta)}</h3><ul>${lista.map(i => `<li class="item-compra${i.comprado ? ' comprado' : ''}" data-item="${esc(i.id)}">
        <label class="casilla"><input type="checkbox" data-acc="comprado"${i.comprado ? ' checked' : ''}><span class="ic-nombre">${esc(i.nombre)}</span></label>
        <input class="ic-cant" data-campo="cantidad" value="${esc(i.cantidad)}" aria-label="Cantidad">
        <input class="ic-precio" data-campo="precio" type="number" inputmode="decimal" min="0" step="any" value="${esc(i.precio ?? '')}" placeholder="${i.precioRef != null ? `≈ ${i.precioRef}` : 'RD$'}" aria-label="Precio">
        <button type="button" class="btn mini sec" data-acc="editar" aria-label="Editar nombre">✎</button>
        <button type="button" class="btn mini sec" data-acc="borrar" aria-label="Eliminar">🗑</button></li>`).join('')}</ul></section>`;
    }).join('')}</div>
    <h3>Agregar producto</h3>
    <form id="nuevo-item" novalidate>
      <div class="fila">${campo({ ruta: 'nombre', etiqueta: 'Producto', placeholder: 'Por ejemplo: café' })}${campo({ ruta: 'cantidad', etiqueta: 'Cantidad', placeholder: '1 paquete' })}</div>
      ${chips({ ruta: 'categoria', valor: 'otros', opciones: CATEGORIAS_COMPRA.map(c => ({ id: c.id, etiqueta: c.etiqueta })) })}
    </form>
    <div class="acciones izq"><button type="button" class="btn mini" id="agregar-item">➕ Agregar</button>
      <button type="button" class="btn mini sec" id="regenerar">↻ Actualizar desde el menú</button></div>`;
  const fn = cont.querySelector('#nuevo-item');
  activarChips(fn);
  const item = el => items.find(i => i.id === el.closest('[data-item]').dataset.item);
  cont.querySelector('#semanas').addEventListener('click', e => { const b = e.target.closest('[data-semana]'); if (b) cb.alPestana('compras', { semana: b.dataset.semana }); });
  cont.addEventListener('change', e => {
    const el = e.target;
    if (!el.closest('[data-item]')) return;
    const i = item(el);
    if (el.dataset.acc === 'comprado') { i.comprado = el.checked; el.closest('li').classList.toggle('comprado', el.checked); cb.alGuardarItem(i, false); return; }
    if (el.dataset.campo === 'cantidad') { i.cantidad = el.value.trim(); i.editado = true; cb.alGuardarItem(i, false); }
    if (el.dataset.campo === 'precio') { i.precio = el.value === '' ? null : Number(el.value.replace(',', '.')); cb.alGuardarItem(i, true); }
  });
  cont.addEventListener('click', async e => {
    const b = e.target.closest('button[data-acc]');
    if (!b || !b.closest('[data-item]')) return;
    const i = item(b);
    if (b.dataset.acc === 'borrar' && await confirmar(`¿Quitar "${i.nombre}" de la lista?`)) cb.alBorrarItem(i.id);
    if (b.dataset.acc === 'editar') {
      const n = prompt('Nombre del producto', i.nombre);
      if (n && n.trim()) { i.nombre = n.trim(); i.editado = true; cb.alGuardarItem(i, true); }
    }
  });
  cont.querySelector('#agregar-item').onclick = () => {
    const r = leerFormulario(fn, {});
    if (!r.nombre) return aviso('Escribe el producto', 'error');
    cb.alGuardarItem({ atletaId: atleta.id, listaId: d.compras.lista.id, nombre: r.nombre, cantidad: r.cantidad || '', categoria: r.categoria || 'otros', comprado: false, manual: true, precio: null }, true);
  };
  cont.querySelector('#regenerar').onclick = () => cb.alRegenerarCompras();
}

// =====================================================================
// 📝 REGISTRO (historial de 14 días)
// =====================================================================
function pestanaRegistro(cont, atleta, d) {
  const hoy = hoyISO();
  cont.innerHTML = `<h2>📝 Registro de alimentación</h2>
    <p class="ayuda">Últimos 14 días. Lo importante es la constancia, no la perfección.</p>
    <div class="registro-dias">${Array.from({ length: 14 }, (_, i) => sumarDias(hoy, -i)).map(f => {
      const cs = d.registro.filter(c => c.fecha === f);
      if (!cs.length) return '';
      const plan = cs.filter(c => c.tipo !== 'extra');
      const hechas = plan.filter(c => c.estado !== 'planificada').length;
      return `<details class="dia-plan"><summary><span class="dp-dia">${esc(fechaLarga(f))}</span><span class="insignia${hechas === plan.length && plan.length ? ' verde' : ' gris'}">${hechas} / ${plan.length} registradas</span></summary>
        <ul class="lista-comidas">${cs.map(c => `<li><span class="lc-tipo">${tipoComida(c.tipo).icono} ${esc(tipoComida(c.tipo).etiqueta)}</span> ${esc(c.nombre)} — <strong>${esc(c.tipo === 'extra' ? 'Libreta' : ESTADOS[c.estado] || 'Sin registrar')}</strong>${c.registro?.texto && c.tipo !== 'extra' ? ` <span class="ayuda">(${esc(c.registro.texto)})</span>` : ''}</li>`).join('')}</ul></details>`;
    }).join('') || '<p>Todavía no hay registros.</p>'}</div>`;
}

// =====================================================================
// 🎓 APRENDE A COMER + 🏆 logros
// =====================================================================
function pestanaAprende(cont, atleta, d) {
  const lg = d.historial?.logros || { racha: 0, lista: [], logrados: 0 };
  cont.innerHTML = `<h2>🎓 Aprende a comer</h2>
    <p class="subtitulo">Qué, cuándo y cuánto: con la misma comida de siempre, servida de otra forma. Nada está prohibido.</p>
    <div class="consejo-dia">💡 <strong>Consejo de hoy:</strong> ${esc(consejoDelDia(hoyISO()).replace(/^\S+\s/, ''))}</div>
    <div class="lecciones">${LECCIONES.map((l, i) => `<details class="leccion"${i === 0 ? ' open' : ''}><summary><span>${l.icono}</span> ${esc(l.titulo)}</summary>
      <ul>${l.puntos.map(p => `<li>${esc(p)}</li>`).join('')}</ul><p class="leccion-cierre">${esc(l.cierre)}</p></details>`).join('')}</div>
    <h2>🏆 Tus logros</h2>
    <p>${lg.racha ? `🔥 Racha actual: <strong>${lg.racha} ${lg.racha === 1 ? 'día' : 'días'}</strong> anotando tu comida.` : 'Anota tu comida hoy para empezar una racha.'} Llevas <strong>${lg.logrados}</strong> de ${lg.lista.length} logros.</p>
    <div class="logros">${lg.lista.map(l => `<div class="logro${l.logrado ? ' hecho' : ''}"><span class="lg-icono">${l.icono}</span><span>${esc(l.nombre)}</span></div>`).join('')}</div>
    <p class="ayuda">Si un día no sale bien, no pasa nada: lo que cuenta es lo que haces la mayoría de los días.</p>`;
}

// =====================================================================
// 🥦 NUTRIENTES
// =====================================================================
function pestanaNutrientes(cont) {
  cont.innerHTML = `<h2>🥦 Nutrientes</h2>
    <p class="subtitulo">El objetivo principal es obtener los nutrientes con una alimentación variada y equilibrada. Tu menú indica qué aporta cada comida.</p>
    <div class="fichas">${NUTRIENTES.map(n => `<details class="ficha-nut"><summary><span>${n.icono}</span> ${esc(n.nombre)}</summary>
      <p><strong>¿Para qué sirve?</strong> ${esc(n.funcion)}</p><p><strong>Fuentes alimentarias:</strong> ${esc(n.fuentes)}</p>${n.extra ? `<p class="ayuda">${esc(n.extra)}</p>` : ''}</details>`).join('')}</div>
    <p class="ayuda">Información general y educativa. No sirve para diagnosticar ni tratar deficiencias: si te preocupa algún nutriente, consulta con un profesional.</p>
    ${porQueHtml('nutrientes')}${porQueHtml('proteina')}${porQueHtml('vegetales')}${porQueHtml('frutas')}`;
}

// =====================================================================
// 💊 SUPLEMENTOS
// =====================================================================
function pestanaSuplementos(cont, atleta, d, cb) {
  const lista = d.suplementos;
  const ed = d.editarSup;
  cont.innerHTML = `<h2>💊 Suplementos y vitaminas</h2>
    <div class="nota precaucion">${esc(AVISO_SUPLEMENTOS)}</div>
    <p>No necesitas suplementos para seguir este plan. Si decides usar alguno, regístralo aquí con la cantidad indicada por el fabricante o por tu profesional, y márcalo en tu libreta cada vez que lo tomes.</p>
    <h3>Mis suplementos</h3>
    ${lista.length ? `<ul class="razones">${lista.map(s => `<li>${esc(s.nombre)} · ${esc(s.cantidad || 'cantidad sin indicar')} · ${esc(s.hora || 'sin hora')} · ${esc(s.frecuencia === 'dias' ? `días: ${DIAS.filter(x => s.dias.includes(x.id)).map(x => x.etiqueta).join(', ')}` : 'todos los días')}${s.recordatorio ? ' · 🔔 recordatorio' : ''}
      <span class="acciones-linea"><button type="button" class="btn mini sec" data-editar="${esc(s.id)}">Editar</button><button type="button" class="btn mini sec" data-borrar="${esc(s.id)}">Eliminar</button></span></li>`).join('')}</ul>` : '<p class="ayuda">No has registrado ninguno.</p>'}
    <details class="registro-manual"${ed ? ' open' : ''}><summary>${ed ? 'Editar suplemento' : '➕ Registrar una vitamina o suplemento'}</summary>
      <form id="sup-form" novalidate>
        ${campo({ ruta: 'nombre', etiqueta: 'Nombre', valor: ed?.nombre })}
        ${campo({ ruta: 'cantidad', etiqueta: 'Cantidad indicada por el fabricante o profesional', valor: ed?.cantidad, placeholder: 'Por ejemplo: 1 cápsula' })}
        ${campo({ ruta: 'hora', etiqueta: 'Hora', tipo: 'time', valor: ed?.hora || '08:00' })}
        <span class="campo-etiqueta">Frecuencia</span>${chips({ ruta: 'frecuencia', valor: ed?.frecuencia || 'diaria', opciones: [{ id: 'diaria', etiqueta: 'Todos los días' }, { id: 'dias', etiqueta: 'Días específicos' }] })}
        <span class="campo-etiqueta">Días (si elegiste días específicos)</span>${chips({ ruta: 'dias', multi: true, numerico: true, valor: ed?.dias || [], opciones: DIAS })}
        <span class="campo-etiqueta">¿Quieres un recordatorio?</span>${chips({ ruta: 'recordatorio', valor: ed ? (ed.recordatorio ? 'si' : 'no') : 'no', opciones: [{ id: 'si', etiqueta: 'Sí' }, { id: 'no', etiqueta: 'No' }] })}
        <p class="ayuda">💊 El recordatorio solo te avisa de lo que tú registraste; no es una indicación médica.</p>
        <div class="acciones izq"><button type="button" class="btn mini" id="sup-guardar">Guardar</button></div>
      </form></details>
    <h3>¿Qué son y para qué se usan?</h3>
    <div class="fichas">${SUPLEMENTOS_INFO.map(s => `<details class="ficha-nut"><summary>${esc(s.nombre)}</summary><p>${esc(s.que)}</p><p>${esc(s.uso)}</p><p class="ayuda">${esc(s.nota)}</p></details>`).join('')}</div>
    <p class="ayuda">Información general: la app no recomienda dosis ni asume que necesites suplementos.</p>`;
  const f = cont.querySelector('#sup-form');
  activarChips(f);
  cont.querySelector('#sup-guardar').onclick = () => {
    const r = leerFormulario(f, {});
    if (!r.nombre) return aviso('Escribe el nombre', 'error');
    cb.alGuardarSuplemento({ ...(ed || {}), nombre: r.nombre, cantidad: r.cantidad, hora: r.hora, frecuencia: r.frecuencia || 'diaria' },
      { recordatorio: r.recordatorio === 'si', dias: r.frecuencia === 'dias' ? r.dias : [] });
  };
  cont.addEventListener('click', async e => {
    const b1 = e.target.closest('[data-editar]');
    if (b1) return cb.alPestana('suplementos', { editarSup: lista.find(s => s.id === b1.dataset.editar) });
    const b2 = e.target.closest('[data-borrar]');
    if (b2 && await confirmar('¿Eliminar este suplemento y su recordatorio?')) cb.alBorrarSuplemento(b2.dataset.borrar);
  });
}

// =====================================================================
// ⚙️ PREFERENCIAS
// =====================================================================
function pestanaAjustes(cont, atleta, d, cb) {
  cont.innerHTML = `<h2>⚙️ Preferencias de alimentación</h2>${formAjustes(atleta, d.ctx, false)}`;
  activarAjustes(cont, cb);
}

const opcionesAlimentos = filtroCat => ALIMENTOS.filter(filtroCat).map(a => ({ id: a.id, etiqueta: a.corto }));

function formAjustes(atleta, ctx, primeraVez) {
  const p = ctx.perfil || perfilNutricionalInicial(atleta);
  const pref = ctx.preferencias;
  const alerg = ctx.alergias || [];
  const rech = (ctx.restricciones || []).filter(r => r.tipo === 'rechazar').map(r => r.alimentoId);
  const red = (ctx.restricciones || []).filter(r => r.tipo === 'reducir').map(r => r.alimentoId);
  const permitidos = objetivosPermitidos(perfilMedico(atleta));
  const sugerido = objetivoNut(objetivoDesdeFase1(atleta)).etiqueta;
  const porCat = (ruta, valor) => CATEGORIAS_ALIMENTO.map(([c, n]) => `<p class="ayuda">${n}</p>${chips({ ruta, multi: true, valor, opciones: opcionesAlimentos(a => a.cat === c) })}`).join('');
  return `<form id="ajustes-nut" novalidate>
    <h3>Objetivo nutricional</h3>
    <p class="ayuda">Según tu objetivo de la Fase 1 te corresponde: <strong>${esc(sugerido)}</strong>. Puedes cambiarlo.${permitidos.length < OBJETIVOS_NUT.length ? ' Por tu seguridad algunas opciones no están disponibles.' : ''}</p>
    ${chips({ ruta: 'perfil.objetivo', valor: permitidos.some(o => o.id === p.objetivo) ? p.objetivo : permitidos[0]?.id, opciones: permitidos.map(o => ({ id: o.id, etiqueta: o.etiqueta })) })}
    <h3>🚫 Alimentos que NO quieres comer</h3>
    <p class="ayuda">Márcalos una vez y no volverán a aparecer en tu menú ni en tu lista de compras.</p>
    <details class="decisiones"${primeraVez || rech.length ? ' open' : ''}><summary>Elegir (${rech.length} marcados)</summary>${porCat('rechazados', rech)}</details>
    <h3>🚫 Platos que NO quieres</h3>
    <details class="decisiones"${(pref.platosRechazados || []).length ? ' open' : ''}><summary>Elegir (${(pref.platosRechazados || []).length} marcados)</summary>
      ${chips({ ruta: 'preferencias.platosRechazados', multi: true, valor: pref.platosRechazados || [], opciones: PLATOS.map(x => ({ id: x.id, etiqueta: NOMBRES_PLATO[x.id] || x.id })) })}</details>
    <h3>¿Cuántas comidas haces al día?</h3>
    ${ctx.indicaciones?.comidas ? `<p class="nota indicada">🩺 ${esc(ctx.indicaciones.por || 'Tu nutrióloga')} te indicó ${ctx.indicaciones.comidas} comidas al día: tu menú se arma así aunque aquí marques otra cantidad.</p>` : ''}
    ${chips({ ruta: 'perfil.comidas', numerico: true, valor: p.comidas, opciones: [3, 4, 5].map(n => ({ id: n, etiqueta: `${n} comidas` })) })}
    <h3>Horario de tus comidas</h3>
    <p class="ayuda">Elige el que se parezca a tu día y ajusta las horas si hace falta.</p>
    ${chips({ ruta: 'perfil.plantilla', valor: p.plantilla || 'normal', opciones: PLANTILLAS_HORARIO.map(x => ({ id: x.id, etiqueta: x.etiqueta })) })}
    <div class="fila" id="horas">${COMIDAS_POR_DIA[5].map(t => campo({ ruta: `perfil.horarios.${t}`, etiqueta: tipoComida(t).etiqueta, tipo: 'time', valor: p.horarios?.[t] || TIPOS_COMIDA.find(x => x.id === t).hora })).join('')}</div>
    <p class="ayuda">Si haces 3 o 4 comidas, se usan solo las que correspondan. Cena ligera, al menos 2 horas antes de dormir.</p>
    <h3>¿Qué días sueles entrenar?</h3>
    ${chips({ ruta: 'perfil.diasEntreno', multi: true, numerico: true, valor: p.diasEntreno, opciones: DIAS })}
    <div class="fila">${campo({ ruta: 'perfil.horaEntreno', etiqueta: 'Hora habitual de entrenamiento', tipo: 'time', valor: p.horaEntreno })}</div>
    <p class="ayuda">Con esto se organizan las comidas alrededor del entrenamiento: antes, una porción pequeña; después, la comida de recuperación.</p>
    <h3>Tipo de alimentación</h3>
    ${chips({ ruta: 'preferencias.patron', valor: pref.patron, opciones: PATRONES })}
    <h3>Cocina preferida</h3>
    ${chips({ ruta: 'preferencias.cultura', valor: pref.cultura, opciones: CULTURAS })}
    <h3>Alergias</h3>
    <p class="ayuda">${esc(AVISO_ALERGIAS)}</p>
    ${chips({ ruta: 'alergias', multi: true, valor: alerg.map(a => a.alergeno).filter(x => x !== 'otra'), opciones: ALERGENOS })}
    ${campo({ ruta: 'alergiaOtra', etiqueta: 'Otra alergia o intolerancia (escribe el alimento)', valor: alerg.find(a => a.alergeno === 'otra')?.nota || '', placeholder: 'Por ejemplo: piña, fresas' })}
    <details class="decisiones"><summary>Alimentos que prefieres comer poco (${red.length})</summary><p class="ayuda">Aparecerán como mucho 2 veces por semana.</p>${porCat('reducir', red)}</details>
    <details class="decisiones"><summary>Tus alimentos favoritos (${(pref.favoritos || []).length})</summary><p class="ayuda">Aparecerán con más frecuencia. El salami, el bacalao y el arenque solo salen si los marcas aquí (y como mucho una vez por semana).</p>${porCat('preferencias.favoritos', pref.favoritos || [])}</details>
    <h3>💰 Presupuesto de alimentación</h3>
    ${chips({ ruta: 'perfil.presupuesto.nivel', valor: p.presupuesto?.nivel || 'medio', opciones: [{ id: 'bajo', etiqueta: 'Bajo' }, { id: 'medio', etiqueta: 'Medio' }, { id: 'amplio', etiqueta: 'Amplio' }] })}
    <div class="fila">${campo({ ruta: 'perfil.presupuesto.monto', etiqueta: 'Presupuesto semanal (opcional)', tipo: 'number', valor: p.presupuesto?.monto })}
      ${campo({ ruta: 'perfil.presupuesto.moneda', etiqueta: 'Moneda', valor: p.presupuesto?.moneda || 'RD$' })}</div>
    <p class="ayuda">Con presupuesto bajo se priorizan alimentos económicos y nutritivos: huevo, habichuelas, sardinas, pollo, hígado, arroz, avena, plátano, guineítos, yuca, repollo, zanahoria y frutas de temporada.</p>
  </form>
  <p class="error" id="error"></p>
  <div class="navegacion final"><button type="button" class="btn" id="guardar-ajustes">${ctx.perfil ? 'Guardar y actualizar el menú' : 'Crear mi plan de alimentación'}</button></div>`;
}

function activarAjustes(raiz, cb) {
  const f = raiz.querySelector('#ajustes-nut');
  // Elegir un tipo de horario rellena las horas (se pueden ajustar después)
  activarChips(f, ruta => {
    if (ruta !== 'perfil.plantilla') return;
    const pl = PLANTILLAS_HORARIO.find(x => x.id === f.querySelector('[data-ruta="perfil.plantilla"] .chip.activo')?.dataset.valor);
    if (pl) for (const [t, h] of Object.entries(pl.horarios)) { const el = f.querySelector(`[data-ruta="perfil.horarios.${t}"]`); if (el) el.value = h; }
  });
  raiz.querySelector('#guardar-ajustes').onclick = async () => {
    const r = leerFormulario(f, {});
    const perfil = r.perfil;
    const error = t => { raiz.querySelector('#error').textContent = t; };
    if (!perfil.objetivo) return error('Elige tu objetivo nutricional.');
    if (!perfil.comidas) return error('Elige cuántas comidas haces.');
    perfil.diasEntreno = perfil.diasEntreno || [];
    perfil.presupuesto.monto = perfil.presupuesto.monto || null;
    const alergias = (r.alergias || []).map(a => ({ alergeno: a }));
    if (r.alergiaOtra) alergias.push({ alergeno: 'otra', nota: r.alergiaOtra });
    const btn = raiz.querySelector('#guardar-ajustes');
    btn.disabled = true; btn.textContent = 'Preparando tu menú…';
    await cb.alGuardarPreferencias({ perfil, preferencias: r.preferencias, alergias, rechazados: r.rechazados || [], reducir: r.reducir || [] });
  };
}
