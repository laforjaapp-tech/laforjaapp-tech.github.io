// 📖 Recetas de la nutrióloga.
// Doctora: lee la foto de una receta (o la escribe), revisa lo leído, la guarda y la asigna a sus clientas.
// Clienta: "Recetas de tu nutrióloga" dentro de Comida (htmlRecetasClienta), y el menú semanal las usa como comidas.

import { esc, chips, activarChips, valorChips, confirmar, aviso } from '../ui/componentes.js';
import { enPalabras, misClientas } from '../nube/acceso.js';
import * as NR from '../nube/recetas.js';
import { leerReceta } from '../ui/lectorReceta.js';
import { completarBorrador, nutricionReceta, gramosDe, TIPOS_RECETA, UNIDADES_LISTA } from '../motor/recetas.js';
import { ALIMENTOS, alimentoPorId, tipoComida } from '../datos/alimentos.js';
import { textoPorcion } from '../motor/nutricion.js';

// La lectura con visión en la nube (supabase/functions/leer-receta) se enciende aquí cuando esté desplegada
const NUBE_ACTIVA = false;

const UNIDAD_TEXTO = { kg: 'kg', g: 'g', lb: 'lb', oz: 'oz', l: 'litro', ml: 'ml', taza: 'taza', cda: 'cucharada', cdta: 'cucharadita', lata: 'lata', diente: 'diente', pizca: 'pizca', rama: 'rama', unidad: 'unidad' };
const CATEGORIAS = [['proteina', 'Carnes, pescados y huevos'], ['legumbre', 'Legumbres'], ['lacteo', 'Lácteos'], ['carbohidrato', 'Arroz, pan y víveres'], ['vegetal', 'Vegetales'], ['fruta', 'Frutas'], ['grasa', 'Grasas y semillas']];
const numero = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null; };
const fmt = n => (n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ','));
const cantidadTexto = i => [fmt(i.cantidad), i.unidad ? UNIDAD_TEXTO[i.unidad] + (i.cantidad > 1 && !['g', 'kg', 'ml', 'lb', 'oz'].includes(i.unidad) ? 's' : '') : ''].filter(Boolean).join(' ');
const resumenNutricion = r => { const n = nutricionReceta(r); return n.enlazados ? `≈ ${n.porPorcion.kcal} kcal · ${n.porPorcion.p} g de proteína por porción` : 'Sin ingredientes del catálogo: no se puede calcular'; };

// =====================================================================
// Doctora: lista de recetas
// =====================================================================
export async function vistaRecetasDoctora(raiz, { alVolver }) {
  raiz.innerHTML = `<section class="pantalla">
    <div class="navegacion"><button type="button" class="btn sec mini" id="rc-volver">← Mis clientas</button><span></span></div>
    <span class="paso-num">Para tus clientas</span>
    <h1>📖 Recetas</h1>
    <p class="subtitulo">Toma una foto de una receta (de un libro, un papel o la pantalla). LA FORJA la lee y la pasa a su estilo; tú la revisas y se la asignas a tus clientas. Les aparece en su sección de comida y su menú la usa, con la porción ajustada a la meta de cada una.</p>
    <div class="botones-fila">
      <label class="btn">📷 Leer una receta de una foto<input type="file" accept="image/*" capture="environment" id="rc-foto" hidden></label>
      <button type="button" class="btn sec" id="rc-nueva">✍️ Escribirla</button>
    </div>
    ${NUBE_ACTIVA ? `<p class="campo-etiqueta">Cómo leer la foto</p>${chips({ ruta: 'modo', valor: 'telefono', opciones: [{ id: 'telefono', etiqueta: 'En este teléfono (gratis)' }, { id: 'nube', etiqueta: 'Con la nube (letra a mano)' }] })}` : ''}
    <div id="rc-lista"><p>Cargando tus recetas…</p></div>
  </section>`;
  raiz.querySelector('#rc-volver').onclick = alVolver;
  window.scrollTo(0, 0);
  if (NUBE_ACTIVA) activarChips(raiz);
  const volver = () => vistaRecetasDoctora(raiz, { alVolver });
  raiz.querySelector('#rc-nueva').onclick = () => vistaEditorReceta(raiz, { receta: completarBorrador({ nombre: '', ingredientes: [], pasos: [] }), alListo: volver });
  raiz.querySelector('#rc-foto').onchange = e => {
    const archivo = e.target.files?.[0];
    if (archivo) leerFoto(raiz, archivo, NUBE_ACTIVA ? valorChips(raiz.querySelector('.chips')) : 'telefono', volver);
  };

  const caja = raiz.querySelector('#rc-lista');
  let recetas, clientas;
  try { [recetas, clientas] = await Promise.all([NR.misRecetas(), misClientas()]); }
  catch (e) { caja.innerHTML = `<p class="error">${esc(enPalabras(e))}</p>`; return; }
  if (!recetas.length) { caja.innerHTML = '<p class="nota">Todavía no tienes recetas. Empieza con una foto.</p>'; return; }
  caja.innerHTML = `<div class="rc-lista">${recetas.map(r => { const d = r.datos; return `<article class="nota rc-tarjeta" data-receta="${r.id}">
      <h3>${esc(d.nombre)}</h3>
      <p>${esc(d.tipos.map(t => tipoComida(t).etiqueta).join(' · '))}${d.porciones ? ` · ${d.porciones} porciones` : ''}${d.minutos ? ` · ⏱ ${d.minutos} min` : ''}</p>
      <p class="rc-nutri">${esc(resumenNutricion(d))}</p>
      <p class="ayuda">${r.clientas.length ? `Asignada a ${r.clientas.length} clienta${r.clientas.length === 1 ? '' : 's'}` : 'Sin asignar'}</p>
      <div class="botones-fila"><button type="button" class="btn mini" data-asignar>👥 Asignar</button><button type="button" class="btn mini sec" data-editar>Editar</button><button type="button" class="btn mini sec" data-borrar>Borrar</button></div>
    </article>`; }).join('')}</div>`;
  caja.querySelectorAll('[data-receta]').forEach(t => {
    const r = recetas.find(x => x.id === t.dataset.receta);
    t.querySelector('[data-editar]').onclick = () => vistaEditorReceta(raiz, { id: r.id, receta: completarBorrador(r.datos), alListo: volver });
    t.querySelector('[data-asignar]').onclick = () => vistaAsignar(raiz, { receta: r, clientas, alListo: volver });
    t.querySelector('[data-borrar]').onclick = async () => {
      if (!(await confirmar(`¿Borrar "${r.datos.nombre}"? Tus clientas dejarán de verla.`))) return;
      try { await NR.borrarReceta(r.id); aviso('Receta borrada'); volver(); } catch (e) { aviso(enPalabras(e), 'error'); }
    };
  });
}

async function leerFoto(raiz, archivo, modo, alListo) {
  const foto = URL.createObjectURL(archivo);
  raiz.innerHTML = `<section class="pantalla">
    <h1>📷 Leyendo la receta…</h1>
    <img class="rc-foto" src="${foto}" alt="Foto de la receta">
    <p class="subtitulo" id="rc-estado">${modo === 'nube' ? 'Enviando la foto…' : 'Preparando el lector (la primera vez tarda un poco más)…'}</p>
    <progress id="rc-progreso" max="1" value="0"></progress>
  </section>`;
  const estado = raiz.querySelector('#rc-estado'), barra = raiz.querySelector('#rc-progreso');
  try {
    const { borrador, texto } = await leerReceta(archivo, { modo, alProgreso: p => { estado.textContent = 'Leyendo la foto…'; barra.value = p; } });
    vistaEditorReceta(raiz, { receta: borrador, texto, foto, alListo });
  } catch (e) {
    raiz.innerHTML = `<section class="pantalla"><h1>No se pudo leer la foto</h1>
      <p class="subtitulo">${esc(enPalabras(e))}</p>
      <div class="botones-fila"><button type="button" class="btn" id="rc-otra">Volver</button></div></section>`;
    raiz.querySelector('#rc-otra').onclick = alListo;
  }
}

// =====================================================================
// Doctora: revisar y corregir (lo leído de la foto o una receta guardada)
// =====================================================================
const opcionesAlimento = sel => `<option value="">— no se cuenta (sal, ajo, especias…) —</option>${CATEGORIAS.map(([c, n]) =>
  `<optgroup label="${esc(n)}">${ALIMENTOS.filter(a => a.cat === c).map(a => `<option value="${a.id}"${a.id === sel ? ' selected' : ''}>${esc(a.nombre)}</option>`).join('')}</optgroup>`).join('')}`;

const htmlIngrediente = (i, k) => `<li class="rc-ing" data-k="${k}">
    <input name="cantidad" inputmode="decimal" value="${esc(fmt(i.cantidad))}" placeholder="Cant." aria-label="Cantidad">
    <select name="unidad" aria-label="Medida"><option value="">—</option>${UNIDADES_LISTA.map(u => `<option value="${u}"${u === i.unidad ? ' selected' : ''}>${UNIDAD_TEXTO[u]}</option>`).join('')}</select>
    <input name="texto" value="${esc(i.texto)}" placeholder="Ingrediente" aria-label="Ingrediente">
    <select name="alimento" aria-label="Alimento del catálogo">${opcionesAlimento(i.alimentoId)}</select>
    <span class="campo-entrada rc-g"><input name="g" inputmode="numeric" value="${i.g ?? ''}" aria-label="Gramos en toda la receta"><span class="unidad">g</span></span>
    <button type="button" class="btn mini sec" data-quitar aria-label="Quitar ingrediente">✕</button>
  </li>`;

export function vistaEditorReceta(raiz, { id = null, receta, texto = '', foto = null, alListo }) {
  const r = structuredClone(receta);
  raiz.innerHTML = `<section class="pantalla">
    <div class="navegacion"><button type="button" class="btn sec mini" id="rc-cancelar">← Cancelar</button><span></span></div>
    <span class="paso-num">${foto ? 'Revisa lo que leí de la foto' : id ? 'Editar receta' : 'Receta nueva'}</span>
    <h1>📖 ${esc(r.nombre || 'Receta')}</h1>
    ${foto ? `<details class="decisiones"><summary>Ver la foto${texto ? ' y el texto leído' : ''}</summary><img class="rc-foto" src="${foto}" alt="Foto de la receta">${texto ? `<pre class="rc-texto">${esc(texto)}</pre>` : ''}</details>
      <p class="nota precaucion">Revisa cada línea: la lectura puede equivocarse con letra a mano, fracciones o fotos con poca luz. Los cálculos usan el alimento ya cocido.</p>` : ''}
    <form id="rc-form" novalidate>
      <label class="campo"><span class="campo-etiqueta">Nombre</span><input name="nombre" value="${esc(r.nombre)}" required></label>
      <div class="rc-cifras">
        <label class="campo"><span class="campo-etiqueta">Porciones</span><input name="porciones" inputmode="numeric" value="${r.porciones ?? ''}"></label>
        <label class="campo"><span class="campo-etiqueta">Tiempo</span><span class="campo-entrada"><input name="minutos" inputmode="numeric" value="${r.minutos ?? ''}"><span class="unidad">min</span></span></label>
      </div>
      <p class="campo-etiqueta">Para qué comida</p>${chips({ ruta: 'tipos', multi: true, valor: r.tipos, opciones: TIPOS_RECETA })}
      <h2>Ingredientes</h2>
      <p class="ayuda">Une cada ingrediente con un alimento del catálogo para calcular calorías y proteína. Los gramos son de toda la receta.</p>
      <ul class="rc-ings">${r.ingredientes.map(htmlIngrediente).join('')}</ul>
      <button type="button" class="btn mini sec" id="rc-mas">+ Ingrediente</button>
      <p class="rc-nutri" id="rc-nutri"></p>
      <h2>Preparación</h2>
      <label class="campo"><span class="campo-etiqueta">Un paso por línea</span><textarea name="pasos" rows="7">${esc(r.pasos.join('\n'))}</textarea></label>
      <label class="campo"><span class="campo-etiqueta">Consejo para tus clientas (opcional)</span><textarea name="nota" rows="2">${esc(r.nota || '')}</textarea></label>
      <p class="error" role="alert"></p>
      <div class="botones-fila"><button type="submit" class="btn">Guardar receta</button></div>
    </form>
  </section>`;
  window.scrollTo(0, 0);
  const form = raiz.querySelector('#rc-form'), lista = form.querySelector('.rc-ings');
  raiz.querySelector('#rc-cancelar').onclick = alListo;
  activarChips(form);

  const leerFila = li => ({
    cantidad: numero(li.querySelector('[name=cantidad]').value), unidad: li.querySelector('[name=unidad]').value || null,
    texto: li.querySelector('[name=texto]').value.trim(), alimentoId: li.querySelector('[name=alimento]').value || null,
    g: numero(li.querySelector('[name=g]').value),
  });
  const leer = () => ({
    nombre: form.nombre.value.trim(), porciones: numero(form.porciones.value), minutos: numero(form.minutos.value),
    tipos: valorChips(form.querySelector('.chips')), ingredientes: [...lista.querySelectorAll('.rc-ing')].map(leerFila).filter(i => i.texto || i.alimentoId),
    pasos: form.pasos.value.split('\n').map(s => s.trim()).filter(Boolean), nota: form.nota.value.trim(),
  });
  const recalcular = () => { form.querySelector('#rc-nutri').textContent = resumenNutricion(leer()); };
  // Al cambiar cantidad, medida o alimento se vuelven a calcular los gramos (si no los escribió a mano)
  const alCambiar = e => {
    const li = e.target.closest('.rc-ing');
    if (!li) return;
    if (e.target.name === 'g') li.dataset.manual = '1';
    else if (!li.dataset.manual) { const g = gramosDe(leerFila(li)); li.querySelector('[name=g]').value = li.querySelector('[name=alimento]').value && g ? g : ''; }
    recalcular();
  };
  lista.addEventListener('input', alCambiar);
  lista.addEventListener('change', alCambiar);
  lista.addEventListener('click', e => { if (e.target.closest('[data-quitar]')) { e.target.closest('.rc-ing').remove(); recalcular(); } });
  form.querySelector('#rc-mas').onclick = () => {
    lista.insertAdjacentHTML('beforeend', htmlIngrediente({ texto: '', cantidad: null, unidad: null, alimentoId: null, g: null }, lista.children.length));
    lista.lastElementChild.querySelector('[name=cantidad]').focus();
  };
  recalcular();

  form.onsubmit = async e => {
    e.preventDefault();
    const datos = leer(), error = form.querySelector('.error'), boton = form.querySelector('[type=submit]');
    if (!datos.nombre) { error.textContent = 'Escribe el nombre de la receta.'; return; }
    if (!datos.ingredientes.length) { error.textContent = 'Falta al menos un ingrediente.'; return; }
    if (!datos.tipos.length) datos.tipos = ['almuerzo', 'cena'];
    boton.disabled = true; error.textContent = '';
    try { await NR.guardarReceta(id, datos); aviso('📖 Receta guardada'); alListo(); }
    catch (err) { error.textContent = enPalabras(err); boton.disabled = false; }
  };
}

// =====================================================================
// Doctora: asignar a clientas (solo las activas la ven)
// =====================================================================
function vistaAsignar(raiz, { receta, clientas, alListo }) {
  const marcadas = new Set(receta.clientas);
  const activas = clientas.filter(c => c.activa);
  raiz.innerHTML = `<section class="pantalla">
    <div class="navegacion"><button type="button" class="btn sec mini" id="rc-cancelar">← Recetas</button><span></span></div>
    <span class="paso-num">Asignar receta</span>
    <h1>${esc(receta.datos.nombre)}</h1>
    <p class="subtitulo">Elige quién la recibe. Solo la ven las clientas con su pago al día; si una se pone al día, la vuelve a ver sola.</p>
    ${clientas.length ? `<div class="botones-fila"><button type="button" class="btn mini sec" id="rc-todas">Marcar todas las activas</button></div>
    <ul class="rc-clientas">${clientas.map(c => `<li><label class="check"><input type="checkbox" value="${c.id}"${marcadas.has(c.id) ? ' checked' : ''}>
      ${c.activa ? '🟢' : '🔴'} ${esc(c.nombre || c.correo)}${c.activa ? '' : ' <span class="ayuda">(en pausa: no la verá hasta que pague)</span>'}</label></li>`).join('')}</ul>`
      : '<p class="nota">Todavía no tienes clientas.</p>'}
    <p class="error" role="alert"></p>
    <div class="botones-fila"><button type="button" class="btn" id="rc-guardar">Guardar</button></div>
  </section>`;
  window.scrollTo(0, 0);
  raiz.querySelector('#rc-cancelar').onclick = alListo;
  raiz.querySelector('#rc-todas')?.addEventListener('click', () => {
    raiz.querySelectorAll('.rc-clientas input').forEach(x => { if (activas.some(c => c.id === x.value)) x.checked = true; });
  });
  raiz.querySelector('#rc-guardar').onclick = async e => {
    const ids = [...raiz.querySelectorAll('.rc-clientas input:checked')].map(x => x.value);
    e.currentTarget.disabled = true;
    try { const n = await NR.asignarReceta(receta.id, ids); aviso(n ? `👥 Asignada a ${n} clienta${n === 1 ? '' : 's'}` : 'La receta quedó sin asignar'); alListo(); }
    catch (err) { raiz.querySelector('.error').textContent = enPalabras(err); e.currentTarget.disabled = false; }
  };
}

// =====================================================================
// Clienta: "Recetas de tu nutrióloga" (pestaña de Comida)
// =====================================================================
export function htmlRecetasClienta(recetas) {
  if (!recetas.length) return '<p class="nota">Tu nutrióloga todavía no te ha asignado recetas.</p>';
  return `<h2>📖 Recetas de tu nutrióloga</h2>
    <p class="ayuda">Tu menú de la semana ya las incluye, con la porción ajustada a tu meta.</p>
    ${recetas.map(r => htmlReceta(r)).join('')}`;
}

// Una receta completa; abierta = se muestra desplegada (p. ej. desde la comida del día)
export function htmlReceta(r, { abierta = false } = {}) {
  return `<details class="nota rc-receta"${abierta ? ' open' : ''}>
    <summary><strong>${esc(r.nombre)}</strong>
      <span class="ayuda">${esc(r.tipos.map(t => tipoComida(t).etiqueta).join(' · '))}${r.minutos ? ` · ⏱ ${r.minutos} min` : ''}${r.porciones ? ` · rinde ${r.porciones}` : ''}</span></summary>
    <p class="rc-nutri">${esc(resumenNutricion(r))}</p>
    ${r.nota ? `<p>“${esc(r.nota)}”${r.por ? ` — ${esc(r.por)}` : ''}</p>` : r.por ? `<p class="ayuda">De ${esc(r.por)}</p>` : ''}
    <h3>Ingredientes${r.porciones ? ` (para ${r.porciones})` : ''}</h3>
    <ul class="porciones">${r.ingredientes.map(i => `<li><span>${esc(i.texto)}</span><span class="porc">${esc(cantidadTexto(i) || (i.alimentoId && i.g ? textoPorcion(i.alimentoId, i.g) : 'al gusto'))}</span></li>`).join('')}</ul>
    <h3>Preparación</h3>
    <ol class="rc-pasos">${r.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
  </details>`;
}
