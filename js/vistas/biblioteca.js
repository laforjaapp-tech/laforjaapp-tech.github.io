// BIBLIOTECA DE EJERCICIOS: búsqueda, filtro por categoría y ficha completa.

import { esc, chips, activarChips, valorChips } from '../ui/componentes.js';
import { EJERCICIOS, CATEGORIAS_BIBLIOTECA, NOMBRES_GRUPO, fichaEjercicio, ejercicioPorId } from '../datos/ejercicios.js';
import { prescribir } from '../motor/prescripcion.js';
import { filtroProgresion } from '../motor/generador.js';
import { FASES } from '../motor/fases.js';
import { htmlIlustracion, montarIlustraciones } from '../ui/figura.js';
import { htmlDemostracion } from '../ui/tecnica.js';

const etCat = id => CATEGORIAS_BIBLIOTECA.find(c => c.id === id)?.etiqueta || id;
const grupos = l => l.map(g => NOMBRES_GRUPO[g]).join(', ');
const IMPACTO = { bajo: 'Bajo impacto', medio: 'Impacto medio', alto: 'Alto impacto' };
const LUGAR = { casa: 'Casa', gimnasio: 'Gimnasio', parque: 'Parque', calle: 'Calle' };
const PATRON = {
  rodilla: 'Dominante de rodilla (sentadillas y zancadas)', bisagra: 'Bisagra de cadera', empuje_h: 'Empuje horizontal', empuje_v: 'Empuje vertical',
  traccion_h: 'Tracción horizontal', traccion_v: 'Tracción vertical', core: 'Core y estabilidad', cardio: 'Cardio', acondicionamiento: 'Acondicionamiento',
  carga: 'Transporte de cargas', funcional: 'Funcional', agilidad: 'Agilidad', equilibrio: 'Equilibrio', parkour: 'Parkour', movilidad: 'Movilidad',
  boxeo: 'Boxeo', aislamiento: 'Aislamiento', pantorrilla: 'Pantorrilla',
};

export function vistaBiblioteca(raiz, atleta, { inicial = null, alVolver } = {}) {
  const permitido = filtroProgresion(atleta);
  let filtro = { texto: '', categoria: '' };

  function lista() {
    const t = filtro.texto.toLowerCase();
    const res = EJERCICIOS.filter(e => (!filtro.categoria || e.categorias.includes(filtro.categoria)) && (!t || e.nombre.toLowerCase().includes(t)));
    raiz.querySelector('#resultados').innerHTML = res.length
      ? res.map(e => {
        const ok = permitido(e) || (atleta.progresion?.[e.familia]?.pasoActual ?? 0) >= e.paso;
        return `<button type="button" class="tarjeta-ej${ok ? '' : ' bloqueado'}" data-id="${e.id}">
          ${htmlIlustracion(e.id, { leyenda: false, mini: true, animar: true })}
          <span class="te-nombre">${ok ? '' : '🔒 '}${esc(e.nombre)}</span>
          <span class="te-meta">${esc(e.categorias.map(etCat).join(' · '))}</span>
          <span class="te-meta">Fase ${e.nivel} · ${e.equipo ? esc(fichaEjercicio(e.id).equipoTexto) : 'Sin material'}</span>
        </button>`;
      }).join('')
      : '<p class="ayuda">No hay ejercicios con ese filtro.</p>';
    raiz.querySelectorAll('[data-id]').forEach(b => b.onclick = () => ficha(b.dataset.id));
    montarIlustraciones(raiz.querySelector('#resultados'));
  }

  function pintarLista() {
    raiz.innerHTML = `<section class="pantalla">
      <span class="paso-num">${EJERCICIOS.length} ejercicios</span>
      <h1>Biblioteca de ejercicios</h1>
      <p class="subtitulo">Cada ejercicio con su técnica, errores frecuentes y progresiones. 🔒 = todavía no corresponde a tu fase, tu equipo o tus precauciones.</p>
      <div class="buscador"><input type="search" id="buscar" placeholder="Buscar ejercicio…" value="${esc(filtro.texto)}" aria-label="Buscar ejercicio"></div>
      <div id="cats">${chips({ ruta: 'cat', valor: filtro.categoria, opciones: [{ id: '', etiqueta: 'Todos' }, ...CATEGORIAS_BIBLIOTECA] })}</div>
      <div class="rejilla-ej" id="resultados"></div>
      ${alVolver ? '<div class="navegacion"><button class="btn sec" id="volver">← Volver</button></div>' : ''}
    </section>`;
    raiz.querySelector('#buscar').addEventListener('input', e => { filtro.texto = e.target.value; lista(); });
    const cats = raiz.querySelector('#cats');
    activarChips(cats, () => { filtro.categoria = valorChips(cats.querySelector('.chips')); lista(); });
    raiz.querySelector('#volver')?.addEventListener('click', alVolver);
    lista();
  }

  function ficha(id) {
    const f = fichaEjercicio(id);
    const fase = atleta.fase?.numero || 1;
    const p = prescribir(id, atleta.progresion?.[f.familia], atleta, { fase });
    const ok = permitido(f) || (atleta.progresion?.[f.familia]?.pasoActual ?? 0) >= f.paso;
    const variante = (v, et) => v ? `<button type="button" class="chip" data-id="${v.id}">${et}: ${esc(v.nombre)}</button>` : '';
    const recomendado = f.dosis === 'minutos' ? 'Según tu sesión (10–40 min)'
      : `${p.texto} · descanso ${p.descanso} s · esfuerzo ${p.rpe}/10`;
    raiz.innerHTML = `<section class="pantalla">
      <span class="paso-num">${esc(f.categorias.map(etCat).join(' · '))}</span>
      <h1>${esc(f.nombre)}</h1>
      ${ok ? '' : `<div class="nota precaucion">🔒 Todavía no está en tu plan: se desbloquea en la fase ${f.nivel} (${FASES[f.nivel - 1].nombre}), o requiere material o es incompatible con tus precauciones.</div>`}
      ${htmlDemostracion(f.id)}
      <div class="tiles">
        <div class="tile"><span class="tile-titulo">Principal</span><span class="tile-valor">${esc(grupos(f.principal) || 'Capacidad general')}</span></div>
        <div class="tile"><span class="tile-titulo">Fase mínima</span><span class="tile-valor">${f.nivel} · ${FASES[f.nivel - 1].nombre}</span></div>
        <div class="tile"><span class="tile-titulo">Equipamiento</span><span class="tile-valor">${esc(f.equipoTexto)}</span></div>
        <div class="tile"><span class="tile-titulo">Impacto</span><span class="tile-valor">${IMPACTO[f.impacto]}</span></div>
      </div>
      <dl class="preguntas-ej ficha">
        <dt>¿Qué es?</dt><dd>${esc(f.que)}</dd>
        <dt>Objetivo</dt><dd>${esc(f.sirve)}</dd>
        <dt>Músculos secundarios</dt><dd>${esc(grupos(f.secundarios) || '—')}</dd>
        <dt>Tipo de movimiento</dt><dd>${esc(PATRON[f.patron] || f.patron)}${f.unilateral ? ' · unilateral (un lado cada vez)' : ''}</dd>
        <dt>Lugar</dt><dd>${f.lugar.map(l => LUGAR[l]).join(', ')}</dd>
        <dt>Recomendado para ti</dt><dd>${esc(recomendado)}</dd>
        ${!f.precauciones && f.evitarSi.length ? `<dt>Precauciones</dt><dd>Se omite si hay restricciones o lesiones relacionadas; el motor elige una alternativa.</dd>` : ''}
      </dl>
      <h3>Variantes</h3>
      <div class="chips" id="variantes">
        ${variante(f.variantes.facil, 'Más fácil')}
        ${variante(f.variantes.dificil, 'Más difícil')}
        ${!f.variantes.facil && !f.variantes.dificil ? '<span class="ayuda">Sin variantes en su cadena.</span>' : ''}
      </div>
      <div class="navegacion"><button class="btn sec" id="volver-lista">← Biblioteca</button></div>
    </section>`;
    raiz.querySelectorAll('#variantes [data-id]').forEach(b => b.onclick = () => ficha(b.dataset.id));
    raiz.querySelector('#volver-lista').onclick = pintarLista;
    montarIlustraciones(raiz);
    window.scrollTo(0, 0);
  }

  if (inicial && ejercicioPorId[inicial]) ficha(inicial); else pintarLista();
}
