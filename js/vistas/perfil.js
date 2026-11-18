// TU PERFIL DE ATLETA + TU ESTRATEGIA

import * as C from '../datos/catalogos.js';
import { esc, campo, leerFormulario, aviso, confirmar } from '../ui/componentes.js';
import { imc, lecturaImc, rangoPesoReferencia, AVISO_IMC, evolucionPeso } from '../motor/calculos.js';
import { ETIQUETAS_CAPACIDAD } from '../motor/nivel.js';
import { bloqueActual } from '../motor/estrategia.js';
import { htmlSelectorTemas, activarSelectorTemas } from '../ui/temas.js';
import { htmlEquipo, htmlElegirGuia, activarElegirGuia, miembro } from '../ui/equipo.js';
import { hablar } from '../ui/voz.js';
import * as U from '../motor/unidades.js';
import { usar3D, ponerUsar3D } from '../ui/figura.js';

const fecha = iso => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

function resumenEquipo(a) {
  const it = a.equipamiento.items;
  const gym = a.experiencia.lugares.includes('gimnasio') || it.includes('maquinas');
  const casa = a.experiencia.lugares.some(l => l !== 'gimnasio') || !gym;
  const partes = [];
  if (casa) partes.push(it.includes('ninguno') || !it.length ? 'CASA (SIN EQUIPO)' : 'CASA');
  if (gym) partes.push('GIMNASIO');
  return partes.join(' + ');
}

function tarjeta(titulo, valor, extra = '') {
  return `<div class="tile"><span class="tile-titulo">${esc(titulo)}</span><span class="tile-valor">${valor}</span>${extra ? `<span class="tile-extra">${extra}</span>` : ''}</div>`;
}

export function vistaPerfil(raiz, atleta, { mediciones, alRegistrarMedicion, alIrReto, alRepetirPruebas, alEditar, alUnidades, alFoto }) {
  const pf = atleta.perfil, est = atleta.plan.estrategia, per = atleta.plan.periodizacion;
  const nivel = C.NIVELES[pf.nivel];
  const obj = atleta.objetivos;
  const secundarios = obj.seleccionados.filter(o => o !== obj.principal);
  const v = imc(atleta.personal.peso, atleta.personal.estatura);
  const rango = rangoPesoReferencia(atleta.personal.estatura);
  const evo = evolucionPeso(mediciones);
  const actual = bloqueActual(per);
  const riesgo = pf.riesgo;
  const metasHtml = C.HORIZONTES.map(h => {
    const m = atleta.resultadoDeseado.metas[h.id] || {};
    const items = C.METAS.filter(x => m[x.id] != null && m[x.id] !== '').map(x => `${esc(x.etiqueta)}: <strong>${esc(m[x.id])} ${esc(x.unidad)}</strong>`);
    const propios = (atleta.resultadoDeseado.personalizados?.[h.id] || '').split('\n').filter(Boolean).map(esc);
    const desc = atleta.resultadoDeseado.descripcion[h.id];
    if (!items.length && !propios.length && !desc) return '';
    return `<div class="meta-horizonte"><h4>${h.etiqueta}</h4>${desc ? `<p>“${esc(desc)}”</p>` : ''}<ul>${[...items, ...propios].map(t => `<li>${t}</li>`).join('')}</ul></div>`;
  }).join('');

  raiz.innerHTML = `<section class="pantalla perfil">
    <p class="paso-num">Evaluación completada · ${fecha(pf.fecha)}</p>
    <h1>TU PERFIL DE ATLETA</h1>
    <p class="subtitulo">${esc(atleta.personal.nombre)}, este es tu punto de partida.</p>

    <div class="tiles">
      ${tarjeta('Nivel', `${nivel.emoji} ${nivel.etiqueta}`, 'Orientativo')}
      ${tarjeta('Objetivo', esc(C.etiquetaDe(C.OBJETIVOS, obj.principal)).toUpperCase(), secundarios.length ? 'También: ' + esc(secundarios.map(s => C.etiquetaDe(C.OBJETIVOS, s)).join(', ')) : '')}
      ${tarjeta('Disponibilidad', `${atleta.disponibilidad.dias} días/semana`)}
      ${tarjeta('Duración', atleta.disponibilidad.minutos > 90 ? 'Más de 90 min' : `${atleta.disponibilidad.minutos} minutos`)}
      ${tarjeta('Equipamiento', resumenEquipo(atleta))}
      ${tarjeta('Fortaleza', esc(pf.fortaleza || 'Por medir'))}
      ${tarjeta('Área a mejorar', esc(pf.areaMejorar || 'Por medir'))}
      ${tarjeta('Condición inicial', `${pf.condicionInicial}/10`)}
    </div>
    ${pf.factores.length || pf.confianza !== 'alta' ? `<div class="nota">
      ${pf.confianza !== 'alta' ? `<p>Precisión del nivel: <strong>${pf.confianza}</strong> (${pf.pruebasHechas} capacidades medidas). Completa las pruebas pendientes para afinarlo.</p>` : ''}
      ${pf.factores.map(f => `<p>• ${esc(f)}</p>`).join('')}</div>` : ''}

    <h2>Tus capacidades</h2>
    <div class="medidores">
      ${Object.entries(ETIQUETAS_CAPACIDAD).map(([k, et]) => {
        const val = pf.puntuaciones[k];
        return `<div class="medidor"><span class="m-etiqueta">${esc(et)}</span>
          <span class="m-pista" role="img" aria-label="${esc(et)}: ${val == null ? 'sin medir' : val + ' de 100'}">${val == null ? '' : `<span class="m-barra" style="width:${Math.max(2, val)}%"></span>`}</span>
          <span class="m-valor">${val == null ? 'Sin medir' : `${val}<small>/100</small>`}</span></div>`;
      }).join('')}
    </div>

    ${riesgo.mensaje || riesgo.notasLesion.length ? `<h2>Seguridad</h2>
      <div class="nota ${riesgo.nivel === 'alerta' ? 'peligro' : 'precaucion'}">
        ${riesgo.mensaje ? `<p>${esc(riesgo.mensaje)}</p>` : ''}
        ${riesgo.notasLesion.map(n => `<p>• <strong>${esc(n.zona)}:</strong> ${esc(n.nota)}</p>`).join('')}
      </div>` : ''}

    <h2>TU ESTRATEGIA</h2>
    <div class="estrategia">
      ${est.filas.map(f => `<div class="fila-estrategia"><span class="e-mod">${esc(f.etiqueta)}</span><span class="e-val">${esc(f.valor)}</span><span class="e-nota">${esc(f.nota || '')}</span></div>`).join('')}
    </div>
    <h3>¿Por qué este plan?</h3>
    <ul class="razones">${est.razones.map(r => `<li>${esc(r)}</li>`).join('')}</ul>

    <h3>Modalidades</h3>
    <div class="modalidades">
      ${C.MODALIDADES.map(m => {
        const d = est.desbloqueos[m.id];
        if (!d) return '';
        const icono = { activo: '✅', progresivo: '🔓', bloqueado: '🔒', no_disponible: '➖' }[d.estado];
        const estadoTxt = { activo: 'Activa', progresivo: 'En progresión', bloqueado: 'Bloqueada', no_disponible: 'No disponible' }[d.estado];
        return `<div class="modalidad ${d.estado}${d.seleccionada ? ' elegida' : ''}">
          <div class="mod-cab"><span>${icono} ${esc(m.etiqueta)}</span><span class="mod-estado">${estadoTxt}${d.seleccionada ? ' · elegida' : ''}</span></div>
          ${d.etapa ? `<div>Etapa: ${esc(d.etapa)}</div>` : ''}
          <div class="ayuda">${esc(d.motivo || '')}${d.requisito ? ` Para avanzar: ${esc(d.requisito)}` : ''}${d.nota ? ` ${esc(d.nota)}` : ''}</div>
        </div>`;
      }).join('')}
    </div>

    <h3>Ciclos de entrenamiento</h3>
    <div class="bloques">
      ${per.bloques.map(b => `<div class="bloque${actual && actual.mes === b.mes ? ' actual' : ''}">
        <span class="b-mes">MES ${b.mes}${actual && actual.mes === b.mes ? ` · semana ${actual.semana}` : ''}</span>
        <strong>${esc(b.nombre)}</strong>
        <span>${esc(b.enfoque)}</span>
        <span class="ayuda">Esfuerzo: ${esc(b.esfuerzo)}. ${esc(b.notaDescarga)}${b.reevaluar ? ' Al final: repetir pruebas físicas.' : ''}</span>
        <span class="ayuda">${fecha(b.desde)} – ${fecha(b.hasta)}</span>
      </div>`).join('')}
    </div>
    <p class="ayuda">${esc(per.nota)}</p>

    <h2>Cuerpo y peso</h2>
    <div class="unidades-perfil">
      <span>Ver en:</span>
      ${[['peso', [['lb', 'Libras'], ['kg', 'Kilos']]], ['estatura', [['pies', 'Pies y pulgadas'], ['cm', 'Centímetros']]]].map(([q, ops]) => `<div class="cq-unidad" role="group">${ops.map(([id, t]) =>
        `<button type="button" data-unidad="${q}:${id}" class="${U.unidadesDe(atleta)[q] === id ? 'activo' : ''}" aria-pressed="${U.unidadesDe(atleta)[q] === id}">${t}</button>`).join('')}</div>`).join('')}
    </div>
    <div class="dato-orientativo">
      <div><strong>IMC orientativo: ${v ?? '–'}</strong> · ${esc(lecturaImc(v))}</div>
      <div>Calculado con: ${U.fmtPeso(atleta.personal.peso, atleta, { conOtra: true })} y ${U.fmtEstatura(atleta.personal.estatura, atleta, { conOtra: true })}</div>
      ${rango ? `<div>Rango de peso de referencia: ${U.fmtRangoPeso(rango, atleta)}</div>` : ''}
      <p class="ayuda">${esc(AVISO_IMC)}</p>
    </div>
    ${evo ? `<div class="evolucion">
      <div class="tiles">
        ${tarjeta('Peso actual', U.fmtPeso(evo.actual.peso, atleta))}
        ${tarjeta('Cambio total', U.fmtCambioPeso(evo.cambioTotal, atleta), `desde ${fecha(evo.inicial.fecha)}`)}
        ${evo.hay30 ? tarjeta('Últimos 30 días', U.fmtCambioPeso(evo.cambio30dias, atleta)) : ''}
      </div>
      <table class="tabla"><thead><tr><th>Fecha</th><th>Peso</th><th>Cintura</th></tr></thead>
        <tbody>${[...mediciones].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8).map(m => `<tr><td>${fecha(m.fecha)}</td><td>${U.fmtPeso(m.peso, atleta)}</td><td>${U.fmtMedida(m.cintura, atleta)}</td></tr>`).join('')}</tbody>
      </table></div>` : ''}
    <form id="form-medicion" class="fila fila-accion" novalidate>
      ${campo({ ruta: 'peso', etiqueta: 'Nuevo peso', tipo: 'text', unidad: U.unidadesDe(atleta).peso, ayuda: U.unidadesDe(atleta).peso === 'lb' ? 'En libras' : 'En kilos' })}
      ${campo({ ruta: 'cintura', etiqueta: 'Cintura (opcional)', tipo: 'text', unidad: U.unidadMedida(atleta) })}
      <button type="submit" class="btn">Registrar</button>
    </form>
    <p class="ayuda">Pésate en las mismas condiciones (por la mañana, en ayunas) una vez por semana. Lo que importa es la tendencia, no el día a día.</p>

    ${metasHtml ? `<h2>Tus metas</h2><div class="metas">${metasHtml}</div>` : ''}

    <h2>👥 Tu equipo</h2>
    <p class="ayuda">Cada vez que la app te habla, verás quién es: su cara, su nombre y lo que hace.</p>
    <h3>¿Quién te guía en la movilidad y las preguntas?</h3>
    <div id="pf-guia">${htmlElegirGuia()}</div>
    <div id="pf-equipo">${htmlEquipo()}</div>
    <h2>🎨 Apariencia</h2>
    <p class="subtitulo">Elige el estilo que más te guste. Cambia al instante y lo puedes cambiar cuando quieras.</p>
    <div id="apariencia">${htmlSelectorTemas()}</div>

    <h3>Figura de los ejercicios</h3>
    <div class="cq-unidad" role="group" aria-label="Figura de los ejercicios">
      <button type="button" data-figura="3d" class="${usar3D() ? 'activo' : ''}" aria-pressed="${usar3D()}">Persona 3D realista</button>
      <button type="button" data-figura="dibujo" class="${usar3D() ? '' : 'activo'}" aria-pressed="${!usar3D()}">Dibujo (más ligero)</button>
    </div>
    <p class="ayuda">La persona 3D se puede girar con el dedo. Si tu teléfono va lento, usa el dibujo.</p>

    <h3>📸 Tu cara en el modelo</h3>
    <div class="foto-cara">
      <span class="fc-circulo">${atleta.foto ? `<img src="${atleta.foto}" alt="Tu foto">` : '<span aria-hidden="true">🙂</span>'}</span>
      <div class="fc-texto">
        <p>Pon tu foto y la persona que hace los ejercicios tendrá tu cara. La foto se queda solo en este teléfono.</p>
        <label class="btn sec fc-subir">${atleta.foto ? 'Cambiar foto' : 'Poner mi foto'}<input type="file" accept="image/*" id="fc-archivo" hidden></label>
        ${atleta.foto ? '<button type="button" class="cq-capsula" id="fc-quitar">Quitar foto</button>' : ''}
      </div>
    </div>

    <div class="navegacion final">
      <button type="button" class="cq-capsula" id="editar">✎ Editar mis datos</button>
      <button type="button" class="cq-capsula" id="repetir">🧪 Repetir pruebas</button>
      <button class="btn" id="reto">Ver mi reto →</button>
    </div>
  </section>`;

  raiz.querySelector('#form-medicion').addEventListener('submit', async e => {
    e.preventDefault();
    const d = leerFormulario(e.target, {});
    const u = U.unidadesDe(atleta).peso, [mi, ma] = U.RANGO_PESO[u], peso = U.leerNumero(d.peso);
    if (!peso || peso < mi || peso > ma) return aviso(`Escribe tu peso en ${u === 'lb' ? 'libras' : 'kilos'} (entre ${mi} y ${ma})`, 'error');
    const cintura = U.cmDeMedida(U.leerNumero(d.cintura), atleta);
    const kgNuevo = U.kgDe(peso, u), kgAntes = atleta.personal.peso;
    if (kgAntes && Math.abs(kgNuevo - kgAntes) / kgAntes > 0.15 && !(await confirmar(`¿Seguro? Tu peso pasaría de ${U.fmtPeso(kgAntes, atleta)} a ${U.fmtPeso(kgNuevo, atleta)}. Revisa que esté en ${u === 'lb' ? 'libras' : 'kilos'}.`))) return;
    if (cintura != null && (cintura < 50 || cintura > 200)) return aviso(U.unidadMedida(atleta) === 'pulg' ? 'Revisa la cintura: entre 20 y 80 pulgadas' : 'Revisa la cintura: entre 50 y 200 cm', 'error');
    await alRegistrarMedicion({ peso: U.kgDe(peso, u), cintura });
  });
  raiz.querySelectorAll('[data-unidad]').forEach(b => b.onclick = () => {
    const [q, u] = b.dataset.unidad.split(':');
    if (U.unidadesDe(atleta)[q] !== u) alUnidades({ ...U.unidadesDe(atleta), [q]: u });
  });
  activarSelectorTemas(raiz.querySelector('#apariencia'), () => aviso('Estilo aplicado'));
  activarElegirGuia(raiz.querySelector('#pf-guia'), () => {
    raiz.querySelector('#pf-equipo').innerHTML = htmlEquipo();
    hablar(`Hola, soy ${miembro('movilidad').nombre}. Desde ahora te acompaño yo.`, { quien: 'movilidad', globo: false });
  });
  raiz.querySelectorAll('[data-figura]').forEach(b => b.onclick = () => {
    ponerUsar3D(b.dataset.figura === '3d');
    raiz.querySelectorAll('[data-figura]').forEach(x => { const on = x === b; x.classList.toggle('activo', on); x.setAttribute('aria-pressed', on); });
    aviso(b.dataset.figura === '3d' ? 'Verás a la persona 3D en los ejercicios' : 'Verás el dibujo en los ejercicios');
  });
  raiz.querySelector('#fc-archivo').addEventListener('change', async e => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try { await alFoto(await recortarCara(archivo)); } catch { aviso('No se pudo abrir esa foto', 'error'); }
  });
  raiz.querySelector('#fc-quitar')?.addEventListener('click', () => alFoto(null));
  raiz.querySelector('#reto').onclick = alIrReto;
  raiz.querySelector('#repetir').onclick = alRepetirPruebas;
  raiz.querySelector('#editar').onclick = alEditar;
  window.scrollTo(0, 0);
}

// Recorta la foto en un cuadrado pequeño (la cara suele estar arriba del centro) para guardarla en el teléfono
function recortarCara(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo), img = new Image();
    img.onload = () => {
      const lado = Math.min(img.naturalWidth, img.naturalHeight), t = 320;
      const sx = (img.naturalWidth - lado) / 2, sy = (img.naturalHeight - lado) * 0.3;
      const c = document.createElement('canvas'); c.width = c.height = t;
      c.getContext('2d').drawImage(img, sx, sy, lado, lado, 0, 0, t, t);
      URL.revokeObjectURL(url);
      resolver(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('imagen')); };
    img.src = url;
  });
}
