// Pantalla de bienvenida "Conozcamos al atleta" y selector de atletas (varias personas en el mismo dispositivo).

import { esc } from '../ui/componentes.js';
import { NIVELES } from '../datos/catalogos.js';
import { htmlSelectorTemas, activarSelectorTemas } from '../ui/temas.js';
import { vozDisponible, hablar } from '../ui/voz.js';
import { htmlElegirGuia, activarElegirGuia, miembro } from '../ui/equipo.js';
import { htmlAnfitriona, vozPreguntasGuardada, guardarVozPreguntas } from './cuestionario.js';

export function vistaBienvenida(raiz, opciones) {
  const { alComenzar, alVolver } = opciones;
  let voz = vozPreguntasGuardada();
  raiz.innerHTML = `<section class="pantalla bienvenida">
    <img class="marca-grande" src="icons/emblema.svg" alt="">
    <p class="paso-num">Conozcamos al atleta</p>
    <h1>¡Qué bueno tenerte aquí!</h1>
    ${htmlAnfitriona('Te haré preguntas cortas, una por una. Solo toca tu respuesta. Se guarda sola y puedes seguir otro día.')}
    <p class="subtitulo">Son unos 4 minutos. Después, unas pruebas sencillas que puedes saltar.</p>
    <p class="campo-etiqueta">¿Quién prefieres que te guíe?</p>
    <div id="bv-guia">${htmlElegirGuia()}</div>
    ${vozDisponible() ? `<button type="button" class="bv-voz${voz ? ' activo' : ''}" id="bv-voz" aria-pressed="${voz}">${voz ? '🔊 Te leo las preguntas en voz alta' : '🔇 Sin voz: solo leer'}</button>` : ''}
    <details class="bv-estilos">
      <summary>🎨 Elige tus colores</summary>
      <div id="bv-temas">${htmlSelectorTemas()}</div>
    </details>
    <div class="navegacion">
      ${alVolver ? '<button class="btn sec" id="volver">← Atletas</button>' : '<span></span>'}
      <button class="btn grande" id="comenzar">Empezar →</button>
    </div>
  </section>`;
  raiz.querySelector('#bv-voz')?.addEventListener('click', e => {
    voz = !voz; guardarVozPreguntas(voz);
    e.currentTarget.classList.toggle('activo', voz); e.currentTarget.setAttribute('aria-pressed', voz);
    e.currentTarget.textContent = voz ? '🔊 Te leo las preguntas en voz alta' : '🔇 Sin voz: solo leer';
  });
  // Al cambiar de guía se repinta (cambia quién saluda) y se oye su voz
  activarElegirGuia(raiz.querySelector('#bv-guia'), () => {
    vistaBienvenida(raiz, opciones);
    hablar(`Hola, soy ${miembro('movilidad').nombre}. Yo te haré las preguntas.`, { quien: 'movilidad', globo: false });
  });
  activarSelectorTemas(raiz.querySelector('#bv-temas'));
  raiz.querySelector('#comenzar').onclick = alComenzar;
  raiz.querySelector('#volver')?.addEventListener('click', alVolver);
}

export function vistaAtletas(raiz, atletas, { alElegir, alNuevo, alBorrar }) {
  raiz.innerHTML = `<section class="pantalla">
    <h1>¿Quién entrena hoy?</h1>
    <div class="lista-atletas">
      ${atletas.map(a => {
        const n = a.perfil && NIVELES[a.perfil.nivel];
        return `<div class="atleta">
          <button type="button" class="atleta-elegir" data-id="${a.id}">
            <strong>${esc(a.personal.nombre || 'Sin nombre')}</strong>
            <span>${a.estado === 'evaluado' && n ? `${n.emoji} ${n.etiqueta}` : 'Evaluación sin terminar'}</span>
          </button>
          <button type="button" class="btn mini sec" data-borrar="${a.id}" aria-label="Borrar a ${esc(a.personal.nombre)}">Borrar</button>
        </div>`;
      }).join('')}
    </div>
    <div class="navegacion"><span></span><button class="btn" id="nuevo">+ Nuevo atleta</button></div>
  </section>`;
  raiz.querySelectorAll('[data-id]').forEach(b => b.onclick = () => alElegir(b.dataset.id));
  raiz.querySelectorAll('[data-borrar]').forEach(b => b.onclick = () => alBorrar(b.dataset.borrar));
  raiz.querySelector('#nuevo').onclick = alNuevo;
}
