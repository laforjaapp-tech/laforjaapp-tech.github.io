// 🍽️ Su plan: lo que la doctora indica a una clienta desde su ficha (vistas/ficha.js). Manda sobre el cálculo automático.
// Puede empezar con una dieta lista o una suya, poner metas y límites, cuántas comidas, qué alimentos sí, no, menos
// o más, y elegir los platos de su semana. LA DOCTORA DECIDE: la app revisa los cálculos y AVISA (motor/revisionPlan.js),
// pero nunca corrige sola ni bloquea; si hay avisos, pregunta antes de enviar y ella decide.

import { esc, aviso, confirmar } from '../ui/componentes.js';
import * as N from '../nube/acceso.js';
import * as NR from '../nube/recetas.js';
import { planDesde, planVacio, combinarDieta, datosParaGuardar, limpiarMenu, DIETAS_BASE, dietasSugeridas } from '../datos/dietas.js';
import { alimentoPorId, PLATOS, COMIDAS_POR_DIA, tipoComida } from '../datos/alimentos.js';
import { NUTRIENTES } from '../datos/nutrientes.js';
import { calcularNecesidades, aplicarIndicaciones, nombreGenerico } from '../motor/nutricion.js';
import { prepararPlan, semanaDe } from '../motor/planComidas.js';
import { revisarPlan, motivosPlato, DIAS_MENU } from '../motor/revisionPlan.js';
import { hoyISO, sumarDias } from '../motor/calculos.js';
import { elegirAlimentos } from './alimentacion.js';

const miles = n => Math.round(n).toLocaleString('es-DO');
const fechaHora = iso => new Date(iso).toLocaleString('es-DO', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
const numero = v => { const n = parseInt(String(v).replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : null; };
const nombresAlimentos = ids => ids.map(id => alimentoPorId[id]?.corto || id).join(', ');
const NIVEL = { alerta: { icono: '⚠️', clase: 'peligro' }, aviso: { icono: '🔎', clase: 'precaucion' }, info: { icono: 'ℹ️', clase: '' } };
const NUTRIENTES_ELEGIBLES = NUTRIENTES.filter(n => n.id !== 'proteina');
const LISTAS = {
  no_come: { titulo: '🚫 No debe comer', vacio: 'Nada prohibido.', texto: n => `Toca lo que ${n} no debe comer. Su menú se arma sin eso.` },
  reducir: { titulo: '➖ Que coma menos', vacio: 'Nada para reducir.', texto: n => `Toca lo que ${n} debe comer menos. Aparecerá menos en su menú.` },
  priorizar: { titulo: '➕ Que coma más', vacio: 'Nada en especial.', texto: n => `Toca lo que ${n} debe comer más. Aparecerá más en su menú.` },
};

// Lo que la clienta tiene en su teléfono (lo subió js/nube/seguimiento.js); null si aún no configuró su comida
function contextoDe(d = {}) {
  const atleta = (d.atletas || [])[0], perfil = (d.nutrition_profiles || [])[0];
  if (!atleta || !perfil) return null;
  return { atleta, perfil, preferencias: (d.food_preferences || [])[0] || { patron: 'omnivoro', favoritos: [] },
    restricciones: d.food_restrictions || [], alergias: d.allergies || [] };
}

// r: datos_de_clienta · alGuardado: recarga la ficha
export function pintarPlanDoctora(cuerpo, { r, clienta, nombre, alGuardado }) {
  const ctx = contextoDe(r.datos);
  const auto = ctx ? calcularNecesidades(ctx.atleta, ctx.perfil) : null;
  const sugeridas = dietasSugeridas(ctx?.atleta || (r.datos?.atletas || [])[0]);
  const suyos = (r.datos?.food_restrictions || []).filter(x => x.tipo === 'rechazar').map(x => x.alimentoId);
  let plan = planDesde(r.indicaciones);
  let recetas = [], dietas = [], semana = null;
  const abiertos = new Set();   // días del menú abiertos (se mantienen al repintar)

  const comidasDeElla = ctx?.perfil?.comidas || 4;
  const tipos = () => COMIDAS_POR_DIA[plan.comidas || comidasDeElla] || COMIDAS_POR_DIA[4];
  const recetasParaMenu = () => recetas.filter(x => x.clientas.includes(clienta.id) || Object.values(plan.menu).some(c => Object.values(c).includes(`receta:${x.id}`)))
    .map(x => ({ ...x.datos, id: x.id }));
  const preparar = () => (ctx ? prepararPlan({ ...ctx, ind: plan, recetas: recetasParaMenu() }) : null);
  const nombrePlato = id => {
    if (String(id).startsWith('receta:')) return recetas.find(x => `receta:${x.id}` === id)?.datos.nombre || 'Receta';
    const p = PLATOS.find(x => x.id === id);
    return p ? nombreGenerico(p) : id;
  };
  const revisar = () => revisarPlan({ plan, auto, ctx, preparado: preparar(), semana });

  // Las recetas y las dietas guardadas llegan aparte: el formulario se puede usar mientras tanto
  Promise.all([NR.misRecetas().catch(() => []), N.misDietas().catch(() => [])]).then(([rs, ds]) => {
    recetas = rs || []; dietas = ds || [];
    if (cuerpo.querySelector('#pd-form')) pintar();
  });

  function pintar() {
    const y = window.scrollY;
    const res = auto ? aplicarIndicaciones(auto, plan) : null;
    const ph = k => (res ? `${res[k]} (auto)` : 'Automático');
    const cifra = (k, etiqueta, unidad, placeholder = '') => `<label class="campo"><span class="campo-etiqueta">${etiqueta}</span>
      <span class="campo-entrada"><input data-cifra="${k}" inputmode="numeric" value="${plan[k] ?? ''}" placeholder="${esc(placeholder)}"><span class="unidad">${unidad}</span></span></label>`;
    const sug = DIETAS_BASE.filter(d => sugeridas.includes(d.id));
    const conMenu = Object.keys(plan.menu).length > 0;
    cuerpo.innerHTML = `
      <p class="subtitulo">Lo que pongas aquí manda sobre el cálculo automático de la app. Nada le llega a ${esc(nombre)} hasta que toques <strong>Guardar y enviar</strong>; su menú se rehace solo la próxima vez que abra LA FORJA.</p>
      ${r.indicaciones?.actualizado ? `<p class="ayuda">Último envío: ${esc(fechaHora(r.indicaciones.actualizado))}.</p>` : ''}
      <section class="nota pd-dietas">
        <h3>📋 Empezar con una dieta</h3>
        <p class="ayuda">Llena el plan con una dieta lista o una tuya y después la ajustas a ${esc(nombre)}. Puedes sumar varias (por ejemplo, diabetes y presión alta). Son un punto de partida: tú decides.</p>
        ${sug.length ? `<p>Por lo que marcó en su evaluación: ${sug.map(d => `<button type="button" class="chip" data-dieta-base="${d.id}">${d.icono} ${esc(d.nombre)}</button>`).join(' ')}</p>` : ''}
        ${plan.dieta ? `<p>Dieta en uso: <strong>${esc(plan.dieta)}</strong></p>` : ''}
        <div class="botones-fila"><button type="button" class="btn mini sec" id="pd-dietas">Ver todas las dietas</button></div>
      </section>
      <form id="pd-form" class="nota pl-form" novalidate>
        <h3>🎯 Metas del día</h3>
        <p>${auto ? `Cálculo automático de la app: <strong>${miles(auto.kcal)} kcal</strong>, <strong>${auto.proteina} g</strong> de proteína, ${auto.carbohidratos} g de carbohidratos y ${auto.grasas} g de grasas (gasto en reposo ≈ ${miles(auto.basal)} kcal; gasto total ≈ ${miles(auto.gasto)} kcal).`
          : `${esc(nombre)} todavía no ha configurado su comida en la app: tu plan se le aplicará en cuanto lo haga.`}</p>
        <div class="pl-cifras">
          ${cifra('kcal', 'Calorías al día', 'kcal', ph('kcal'))}
          ${cifra('proteina', 'Proteína al día', 'g', ph('proteina'))}
          ${cifra('carbohidratos', 'Carbohidratos al día', 'g', ph('carbohidratos'))}
          ${cifra('grasas', 'Grasas al día', 'g', ph('grasas'))}
        </div>
        <p class="ayuda" id="pd-cuadre"></p>
        <p class="ayuda">Lo que dejes vacío lo calcula la app con lo que sí pongas.</p>

        <h3>⚖️ Límites</h3>
        <div class="pl-cifras">
          ${cifra('carbos_comida', 'Carbohidratos máximos por comida', 'g', 'Sin límite')}
          ${cifra('frutas_dia', 'Frutas máximas al día', 'porciones', 'Sin límite')}
        </div>
        <div class="pd-fila">
          <button type="button" class="chip${plan.bajo_sal ? ' activo' : ''}" data-alternar="bajo_sal" aria-pressed="${plan.bajo_sal}">🧂 Baja en sal</button>
          <span class="ayuda">Quita lo muy salado (salami, bacalao, arenque, queso de freír) y pone menos enlatados y pan.</span>
        </div>
        <div class="pl-cifras">
          ${cifra('sodio_mg', 'Sodio máximo al día (se le muestra)', 'mg', 'Sin límite')}
          ${cifra('agua_ml', 'Líquidos al día', 'ml', 'Lo calcula la app')}
        </div>
        <div class="pd-fila"><span class="campo-etiqueta">Los líquidos son:</span>
          <button type="button" class="chip${!plan.agua_maximo ? ' activo' : ''}" data-agua="meta">Una meta</button>
          <button type="button" class="chip${plan.agua_maximo ? ' activo' : ''}" data-agua="maximo">Un límite máximo</button></div>

        <h3>🍽️ Comidas al día</h3>
        <div class="pd-fila">
          <button type="button" class="chip${!plan.comidas ? ' activo' : ''}" data-comidas="">Las que ella eligió (${comidasDeElla})</button>
          ${[3, 4, 5].map(n => `<button type="button" class="chip${plan.comidas === n ? ' activo' : ''}" data-comidas="${n}">${n} comidas</button>`).join('')}
        </div>
        <p class="ayuda">${esc(tipos().map(t => tipoComida(t).etiqueta).join(' · '))}</p>

        <h3>🥦 Alimentos</h3>
        ${Object.entries(LISTAS).map(([k, t]) => `<div class="pl-alimentos"><p class="campo-etiqueta">${t.titulo}</p>
          <p>${plan[k].length ? esc(nombresAlimentos(plan[k])) : `<span class="ayuda">${t.vacio}</span>`}</p>
          <button type="button" class="btn mini sec" data-lista="${k}">Elegir alimentos</button></div>`).join('')}
        ${suyos.length ? `<p class="ayuda">Ella ya quitó por su cuenta: ${esc(nombresAlimentos(suyos))}.</p>` : ''}
        <div class="pl-alimentos"><p class="campo-etiqueta">⭐ Darle prioridad a alimentos ricos en</p>
          <div class="pd-fila">${NUTRIENTES_ELEGIBLES.map(n => `<button type="button" class="chip${plan.nutrientes.includes(n.id) ? ' activo' : ''}" data-nutriente="${n.id}" aria-pressed="${plan.nutrientes.includes(n.id)}">${n.icono} ${esc(n.nombre)}</button>`).join('')}</div></div>

        <h3>📅 Su menú</h3>
        <p class="ayuda">Elige el plato de cada comida o déjala en automático. Las porciones se ajustan solas a sus metas y límites.</p>
        <div class="pd-menu">${DIAS_MENU.map(([d, n]) => {
          const del = plan.menu[d] || {};
          const lleno = tipos().some(t => del[t]);
          const cuantos = tipos().filter(t => del[t]).length;
          return `<details class="pd-dia" data-dia="${d}"${abiertos.has(String(d)) ? ' open' : ''}><summary><strong>${n}</strong> <span class="ayuda">${cuantos ? `${cuantos} de ${tipos().length} elegidas` : 'automático'}</span></summary>
            ${lleno ? `<div class="pd-dia-cab"><button type="button" class="btn mini sec" data-copiar="${d}">Copiar a toda la semana</button></div>` : ''}
            ${tipos().map(t => `<button type="button" class="pd-celda${del[t] ? ' elegido' : ''}" data-celda="${d}|${t}">
              <span class="pd-tipo">${tipoComida(t).icono} ${esc(tipoComida(t).etiqueta)}</span><span class="pd-plato">${del[t] ? esc(nombrePlato(del[t])) : 'Automático'}</span></button>`).join('')}</details>`;
        }).join('')}</div>
        ${conMenu ? '<div class="botones-fila"><button type="button" class="btn mini sec" id="pd-sin-menu">Dejar todo el menú en automático</button></div>' : ''}

        <h3>✍️ Nota para ${esc(nombre)}</h3>
        <label class="campo"><span class="campo-etiqueta">La verá arriba de su plan</span>
          <textarea id="pd-nota" rows="${Math.min(12, Math.max(3, plan.nota.split(/\n/).length + 1))}" maxlength="1000">${esc(plan.nota)}</textarea></label>

        <div id="pd-revision" aria-live="polite"></div>
        <p class="error" role="alert"></p>
        <div class="botones-fila">
          <button type="submit" class="btn mini">Guardar y enviar</button>
          <button type="button" class="btn mini sec" id="pd-semana"${ctx ? '' : ' disabled'}>👁️ Ver cómo le queda la semana</button>
          <button type="button" class="btn mini sec" id="pd-guardar-dieta">💾 Guardar como dieta mía</button>
          ${r.indicaciones ? '<button type="button" class="btn mini sec" id="pd-auto">Volver al cálculo automático</button>' : ''}
        </div>
      </form>
      <div id="pd-vista"></div>`;
    activar();
    refrescar();
    if (semana) pintarSemana();
    window.scrollTo(0, y);
  }

  // Lo que cambia mientras escribe: el cuadre de las cifras y la revisión
  let espera = null;
  function refrescar() {
    const cuadre = cuerpo.querySelector('#pd-cuadre');
    if (cuadre && auto) {
      const res = aplicarIndicaciones(auto, plan);
      const p = x => Math.round((x / res.kcal) * 100);
      // Lo que la app calcula para los campos que dejó vacíos
      for (const k of ['kcal', 'proteina', 'carbohidratos', 'grasas']) { const i = cuerpo.querySelector(`[data-cifra="${k}"]`); if (i) i.placeholder = `${res[k]} (auto)`; }
      cuadre.textContent = `Con estas cifras: ${miles(res.kcal)} kcal · ${res.proteina} g de proteína (${p(res.proteina * 4)} %) · ${res.carbohidratos} g de carbohidratos (${p(res.carbohidratos * 4)} %) · ${res.grasas} g de grasas (${p(res.grasas * 9)} %).`;
    }
    clearTimeout(espera);
    espera = setTimeout(() => {
      const caja = cuerpo.querySelector('#pd-revision');
      if (!caja) return;
      const avisos = revisar();
      caja.innerHTML = avisos.length ? `<div class="pd-revision"><p class="campo-etiqueta">Revisión de la app (tú decides)</p>
        <ul>${avisos.map(a => `<li class="nota ${NIVEL[a.nivel].clase}"><span aria-hidden="true">${NIVEL[a.nivel].icono}</span> ${esc(a.texto)}</li>`).join('')}</ul></div>`
        : '<p class="ayuda pd-ok">✓ La app no ve nada raro en los cálculos.</p>';
    }, 250);
  }

  function activar() {
    const form = cuerpo.querySelector('#pd-form');
    form.addEventListener('input', e => {
      const k = e.target.dataset.cifra;
      if (k) { plan[k] = numero(e.target.value); if (k === 'agua_ml' && !plan.agua_ml) plan.agua_maximo = false; semana = null; refrescar(); }
      if (e.target.id === 'pd-nota') plan.nota = e.target.value;
    });
    form.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.alternar) { plan[b.dataset.alternar] = !plan[b.dataset.alternar]; semana = null; return pintar(); }
      if (b.dataset.agua) { plan.agua_maximo = b.dataset.agua === 'maximo'; return pintar(); }
      if ('comidas' in b.dataset) { plan.comidas = numero(b.dataset.comidas); semana = null; return pintar(); }
      if (b.dataset.nutriente) {
        const id = b.dataset.nutriente;
        plan.nutrientes = plan.nutrientes.includes(id) ? plan.nutrientes.filter(x => x !== id) : [...plan.nutrientes, id];
        semana = null; return pintar();
      }
      if (b.dataset.lista) {
        const k = b.dataset.lista, t = LISTAS[k];
        return elegirAlimentos({ marcados: plan[k], titulo: t.titulo, texto: t.texto(nombre), guardar: 'Listo', guardando: 'Listo',
          alGuardar: ids => { plan[k] = ids; semana = null; pintar(); } });
      }
      if (b.dataset.celda) { const [d, t] = b.dataset.celda.split('|'); return elegirPlato(d, t); }
      if (b.dataset.copiar) {
        const del = plan.menu[b.dataset.copiar];
        for (const [d] of DIAS_MENU) plan.menu[d] = { ...del };
        semana = null; aviso('📅 Copiado a toda la semana'); return pintar();
      }
      if (b.id === 'pd-sin-menu') { plan.menu = {}; semana = null; return pintar(); }
      if (b.id === 'pd-semana') { semana = semanaPrueba(); return pintarSemana(true); }
      if (b.id === 'pd-guardar-dieta') return guardarComoDieta();
      if (b.id === 'pd-auto') return volverAuto(b);
    });
    form.addEventListener('toggle', e => { const d = e.target.dataset?.dia; if (d) e.target.open ? abiertos.add(d) : abiertos.delete(d); }, true);
    form.onsubmit = e => { e.preventDefault(); enviar(form.querySelector('[type=submit]')); };
    cuerpo.querySelector('#pd-dietas').onclick = verDietas;
    cuerpo.querySelectorAll('[data-dieta-base]').forEach(b => { b.onclick = () => usarDieta(DIETAS_BASE.find(d => d.id === b.dataset.dietaBase)); });
  }

  function usarDieta(dieta) {
    plan = combinarDieta(plan, dieta, auto);
    semana = null;
    pintar();
    aviso(`📋 "${dieta.nombre}" puesta en el plan: revísala y toca Guardar y enviar`);
  }

  // ---------- Elegir el plato de una comida ----------
  function elegirPlato(dia, tipo) {
    const prep = preparar();
    const motivos = p => (prep ? motivosPlato(p, { plan, ctx, filtro: prep.filtro }) : []);
    const suyas = recetas.filter(x => (x.datos.tipos || ['almuerzo', 'cena']).includes(tipo))
      .map(x => ({ id: `receta:${x.id}`, nombre: x.datos.nombre, lleva: (x.datos.ingredientes || []).map(i => alimentoPorId[i.alimentoId]?.corto).filter(Boolean), plato: prep?.extras.find(p => p.id === `receta:${x.id}`) }));
    const platos = PLATOS.filter(p => p.tipos.includes(tipo)).map(p => ({ id: p.id, nombre: nombreGenerico(p), lleva: [...new Set(p.slots.filter(s => !s.opcional).flatMap(s => s.op).map(id => alimentoPorId[id]?.corto))].slice(0, 9), plato: p }));
    const actual = plan.menu[dia]?.[tipo];
    const fila = o => `<button type="button" class="pd-opcion${o.id === actual ? ' activo' : ''}" data-plato="${esc(o.id)}" data-texto="${esc((o.nombre + ' ' + o.lleva.join(' ')).toLowerCase())}">
      <strong>${esc(o.nombre)}</strong>${o.plato && motivos(o.plato).length ? ` <span class="pd-choque">⚠️ Choca con lo que ella come: ${esc(motivos(o.plato).join('; '))}. Si lo eliges, se le pone igual con un aviso.</span>` : ''}
      ${o.lleva.length ? `<span class="ayuda">Lleva: ${esc(o.lleva.join(', '))}</span>` : ''}</button>`;
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `<div class="modal pd-elegir" role="dialog" aria-labelledby="pd-e-t">
      <h2 id="pd-e-t">${esc(DIAS_MENU.find(x => String(x[0]) === String(dia))[1])} · ${tipoComida(tipo).icono} ${esc(tipoComida(tipo).etiqueta)}</h2>
      <input type="search" class="nc-buscar" placeholder="Buscar, por ejemplo: mangú" aria-label="Buscar plato">
      <button type="button" class="pd-opcion${actual ? '' : ' activo'}" data-plato=""><strong>Automático</strong><span class="ayuda">Lo elige la app con sus metas y gustos.</span></button>
      ${suyas.length ? `<h3>📖 Tus recetas</h3>${suyas.map(fila).join('')}<p class="ayuda">Si eliges una receta tuya, se le asigna a ${esc(nombre)} al enviar.</p>` : ''}
      <h3>🍽️ Platos de la app</h3>${platos.map(fila).join('')}
      <div class="acciones"><button type="button" class="btn mini sec" data-cerrar>Cerrar</button></div></div>`;
    fondo.querySelector('.nc-buscar').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      fondo.querySelectorAll('[data-texto]').forEach(b => { b.hidden = !!q && !b.dataset.texto.includes(q); });
    });
    fondo.addEventListener('click', e => {
      if (e.target === fondo || e.target.closest('[data-cerrar]')) return fondo.remove();
      const b = e.target.closest('[data-plato]'); if (!b) return;
      plan.menu = limpiarMenu({ ...plan.menu, [dia]: { ...(plan.menu[dia] || {}), [tipo]: b.dataset.plato } });
      semana = null;
      fondo.remove();
      pintar();
    });
    document.body.appendChild(fondo);
  }

  // ---------- Dietas: listas y suyas ----------
  function verDietas() {
    const tarjeta = (d, clave, suya = false) => `<div class="nota pd-dieta"><p><strong>${d.icono || '🗂️'} ${esc(d.nombre)}</strong>${sugeridas.includes(d.id) ? ' <span class="pd-sugerida">Sugerida por su evaluación</span>' : ''}</p>
      <p class="ayuda">${esc(d.resumen || resumenPlan(d.datos))}</p>
      <div class="botones-fila"><button type="button" class="btn mini" data-usar="${esc(clave)}">Usar</button>${suya ? `<button type="button" class="btn mini sec" data-borrar-dieta="${esc(d.id)}">Borrar</button>` : ''}</div></div>`;
    const base = [...DIETAS_BASE].sort((a, b) => sugeridas.includes(b.id) - sugeridas.includes(a.id));
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `<div class="modal pd-elegir" role="dialog" aria-labelledby="pd-d-t">
      <h2 id="pd-d-t">📋 Dietas</h2>
      <p class="ayuda">Se suma a lo que ya tiene el plan: las cifras de la dieta mandan, de los límites queda el más estricto y los alimentos se juntan. Revisa y ajusta antes de enviar.</p>
      <h3>Tus dietas</h3>
      ${dietas.length ? dietas.map(d => tarjeta(d, `suya:${d.id}`, true)).join('') : '<p class="ayuda">Todavía no tienes dietas guardadas. Arma un plan y toca "Guardar como dieta mía" para usarlo con otras clientas.</p>'}
      <h3>Dietas listas</h3>
      ${base.map(d => tarjeta(d, `base:${d.id}`)).join('')}
      <div class="acciones"><button type="button" class="btn mini sec" data-cero>Empezar de cero</button><button type="button" class="btn mini sec" data-cerrar>Cerrar</button></div></div>`;
    fondo.addEventListener('click', async e => {
      if (e.target === fondo || e.target.closest('[data-cerrar]')) return fondo.remove();
      const u = e.target.closest('[data-usar]');
      if (u) {
        const [tipo, id] = u.dataset.usar.split(':');
        const d = tipo === 'base' ? DIETAS_BASE.find(x => x.id === id) : dietas.find(x => x.id === id);
        fondo.remove();
        return usarDieta(d);
      }
      const br = e.target.closest('[data-borrar-dieta]');
      if (br) {
        const d = dietas.find(x => x.id === br.dataset.borrarDieta);
        if (!(await confirmar(`¿Borrar tu dieta "${d.nombre}"? A las clientas que ya la tienen no les cambia nada.`))) return;
        try { await N.borrarDieta(d.id); dietas = dietas.filter(x => x !== d); fondo.remove(); verDietas(); }
        catch (err) { aviso(N.enPalabras(err), 'error'); }
        return;
      }
      if (e.target.closest('[data-cero]')) {
        if (!(await confirmar('¿Vaciar el plan del formulario? No se envía nada hasta que toques Guardar y enviar.'))) return;
        plan = planVacio(); semana = null; fondo.remove(); pintar();
      }
    });
    document.body.appendChild(fondo);
  }

  async function guardarComoDieta() {
    const nombreDieta = await pedirTexto({ titulo: '💾 Guardar como dieta mía', etiqueta: 'Nombre de la dieta', valor: plan.dieta,
      ayuda: 'Se guarda todo el plan (cifras, límites, alimentos, menú y nota) para usarlo con otras clientas.' });
    if (!nombreDieta) return;
    const igual = dietas.find(d => d.nombre.toLowerCase() === nombreDieta.toLowerCase());
    if (igual && !(await confirmar(`Ya tienes una dieta "${igual.nombre}". ¿Reemplazarla con este plan?`))) return;
    try {
      const id = await N.guardarDieta(igual?.id, nombreDieta, datosParaGuardar(plan));
      dietas = [...dietas.filter(d => d !== igual), { id, nombre: nombreDieta, datos: datosParaGuardar(plan) }].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      plan.dieta = nombreDieta;
      pintar();
      aviso(`💾 Dieta "${nombreDieta}" guardada`);
    } catch (e) { aviso(N.enPalabras(e), 'error'); }
  }

  // ---------- Enviar ----------
  async function enviar(boton) {
    const error = cuerpo.querySelector('#pd-form .error');
    error.textContent = '';
    const final = { ...plan, menu: limpiarMenu(Object.fromEntries(Object.entries(plan.menu)
      .map(([d, c]) => [d, Object.fromEntries(Object.entries(c).filter(([t]) => tipos().includes(t)))]))) };
    const avisos = revisar().filter(a => a.nivel !== 'info');
    if (avisos.length && !(await confirmar(`La revisión de la app encontró ${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'} (están arriba de los botones). Tú decides: ¿enviar el plan así?`))) return;
    boton.disabled = true;
    try {
      // Las recetas suyas que puso en el menú se le asignan a esta clienta
      const usadas = new Set(Object.values(final.menu).flatMap(c => Object.values(c)).filter(id => id.startsWith('receta:')).map(id => id.slice(7)));
      for (const rc of recetas.filter(x => usadas.has(x.id) && !x.clientas.includes(clienta.id))) {
        await NR.asignarReceta(rc.id, [...rc.clientas, clienta.id]);
        rc.clientas = [...rc.clientas, clienta.id];
      }
      await N.guardarIndicaciones(clienta.id, final);
      aviso(`🍽️ Plan de ${nombre} enviado`);
      await alGuardado();
    } catch (e) { error.textContent = N.enPalabras(e); boton.disabled = false; }
  }

  async function volverAuto(boton) {
    if (!(await confirmar(`¿Quitar tu plan? El de ${nombre} vuelve al cálculo automático de la app.`))) return;
    boton.disabled = true;
    try { await N.guardarIndicaciones(clienta.id, planVacio()); aviso('Plan en cálculo automático'); await alGuardado(); }
    catch (e) { cuerpo.querySelector('#pd-form .error').textContent = N.enPalabras(e); boton.disabled = false; }
  }

  // ---------- Vista previa: su semana con este plan, igual que la armará su teléfono ----------
  function semanaPrueba() {
    const hoy = hoyISO();
    const lunes = sumarDias(hoy, -((new Date(hoy + 'T12:00').getDay() + 6) % 7));
    return semanaDe(preparar(), { inicio: lunes, semilla: `${ctx.atleta.id}|` });
  }

  function pintarSemana(irAhi = false) {
    const caja = cuerpo.querySelector('#pd-vista');
    if (!semana || !caja) return;
    const lim = aplicarIndicaciones(auto, plan);
    const t = cs => cs.reduce((a, c) => ({ kcal: a.kcal + c.totales.kcal, p: a.p + c.totales.p, c: a.c + c.totales.c, g: a.g + c.totales.g }), { kcal: 0, p: 0, c: 0, g: 0 });
    const cifras = x => `${miles(x.kcal)} kcal · ${x.p} g prot. · ${x.c} g carb. · ${x.g} g grasa`;
    caja.innerHTML = `<section class="pd-semana">
      <h3>👁️ Así le queda la semana</h3>
      <p class="ayuda">Con su perfil, sus gustos, sus alergias y este plan (aún sin enviar). Su teléfono la arma igual; cambia un poco la variedad entre semanas. Meta del día: ${cifras({ kcal: lim.kcal, p: lim.proteina, c: lim.carbohidratos, g: lim.grasas })}.</p>
      ${semana.dias.map(d => {
        const tot = t(d.comidas);
        return `<details class="decisiones"><summary><strong>${esc(new Date(d.fecha + 'T12:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric' }))}</strong>${d.entreno ? ' 🏋️' : ''} · ${cifras(tot)}</summary>
          <ul class="pd-comidas">${d.comidas.map(c => {
            const pasa = lim.limites.carbosComida && c.totales.c > lim.limites.carbosComida * 1.1;
            return `<li><span class="pd-tipo">${tipoComida(c.tipo).icono} ${esc(tipoComida(c.tipo).etiqueta)} · ${esc(c.hora)}${c.indicada ? ' · 🩺 elegido por ti' : ''}</span>
              ${esc(c.nombre)}<span class="ayuda">${cifras(c.totales)}${pasa ? ` · ⚠️ pasa del tope de ${lim.limites.carbosComida} g` : ''}</span></li>`;
          }).join('')}</ul></details>`;
      }).join('')}</section>`;
    refrescar();
    if (irAhi) caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  pintar();
}

// "1,400 kcal · 5 comidas · baja en sal · 3 prohibidos · menú de 4 días"
function resumenPlan(d = {}) {
  const partes = [d.kcal && `${miles(d.kcal)} kcal`, d.proteina && `${d.proteina} g de proteína`, d.comidas && `${d.comidas} comidas`,
    d.carbos_comida && `máx. ${d.carbos_comida} g de carbohidratos por comida`, d.bajo_sal && 'baja en sal',
    d.no_come?.length && `${d.no_come.length} prohibidos`, d.priorizar?.length && `${d.priorizar.length} con prioridad`,
    Object.keys(d.menu || {}).length && `menú de ${Object.keys(d.menu).length} días`].filter(Boolean);
  return partes.length ? partes.join(' · ') : 'Solo con nota.';
}

// Ventana con un campo de texto; devuelve lo escrito o null
function pedirTexto({ titulo, etiqueta, valor = '', ayuda = '' }) {
  return new Promise(resolver => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `<form class="modal" novalidate><h2>${esc(titulo)}</h2>${ayuda ? `<p class="ayuda">${esc(ayuda)}</p>` : ''}
      <label class="campo"><span class="campo-etiqueta">${esc(etiqueta)}</span><input name="texto" maxlength="120" value="${esc(valor)}"></label>
      <p class="error" role="alert"></p>
      <div class="acciones"><button type="button" class="btn sec" data-r="0">Cancelar</button><button type="submit" class="btn">Guardar</button></div></form>`;
    const form = fondo.querySelector('form');
    const cerrar = v => { fondo.remove(); resolver(v); };
    form.onsubmit = e => {
      e.preventDefault();
      const v = form.texto.value.trim();
      if (!v) { form.querySelector('.error').textContent = 'Escribe un nombre.'; return; }
      cerrar(v);
    };
    fondo.addEventListener('click', e => { if (e.target === fondo || e.target.closest('[data-r="0"]')) cerrar(null); });
    document.body.appendChild(fondo);
    form.texto.focus();
  });
}
