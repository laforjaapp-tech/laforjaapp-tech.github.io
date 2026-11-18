// TU PRIMER RETO (y los siguientes)

import { esc } from '../ui/componentes.js';
import { itemsDelDia, diaCompleto, progresoReto, siguienteReto, RETOS } from '../motor/retos.js';
import { hoyISO } from '../motor/calculos.js';

const nombreDia = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });

export function vistaReto(raiz, atleta, reto, { guardarReto, alSiguiente, alVolver, metaAgua = null }) {
  const def = RETOS.find(r => r.numero === reto.numero);
  const sig = siguienteReto(reto.numero);
  const hoy = hoyISO();

  function pintar() {
    const pr = progresoReto(reto);
    raiz.innerHTML = `<section class="pantalla">
      <p class="paso-num">Reto ${reto.numero} de ${RETOS.length}</p>
      <h1>${reto.numero === 1 ? 'TU PRIMER RETO' : 'TU RETO'}</h1>
      <p class="subtitulo">${esc(reto.titulo)}</p>
      ${reto.completado ? `<div class="celebracion">${esc(def.final)}</div>` : ''}
      <div class="progreso"><div class="barra" style="width:${pr.porcentaje}%"></div></div>
      <p class="ayuda">${pr.hechos} de ${pr.total} días completos. Cada día cuenta cuando marcas sus 4 puntos.</p>
      <div class="nota">Si un día te sientes con mucha fatiga, dolor o has dormido muy mal, cámbialo a descanso: no se trata de mantener una racha a cualquier precio.</div>
      <div class="dias">
        ${reto.dias.map((d, i) => {
          const futuro = d.fecha > hoy;
          return `<div class="dia${diaCompleto(d) ? ' completo' : ''}${d.fecha === hoy ? ' hoy' : ''}${futuro ? ' futuro' : ''}">
            <div class="dia-cab">
              <strong>Día ${i + 1}</strong><span>${esc(nombreDia(d.fecha))}${d.fecha === hoy ? ' · HOY' : ''}</span>
              ${futuro || reto.completado ? '' : `<button type="button" class="btn mini sec" data-cambiar="${i}">${d.tipo === 'entreno' ? 'Cambiar a descanso' : 'Cambiar a entreno'}</button>`}
            </div>
            ${itemsDelDia(d, atleta, metaAgua).map(it => `<label class="check${futuro ? ' deshabilitado' : ''}">
              <input type="checkbox" data-dia="${i}" data-item="${it.id}" ${d.hecho[it.id] ? 'checked' : ''} ${futuro || reto.completado ? 'disabled' : ''}>
              <span><strong>${esc(it.titulo)}</strong> · ${esc(it.detalle)}</span></label>`).join('')}
          </div>`;
        }).join('')}
      </div>
      <div class="navegacion final">
        <button class="btn sec" id="volver">← Mi perfil</button>
        ${reto.completado && sig ? `<button class="btn" id="siguiente">Desbloquear: ${esc(sig.titulo)} →</button>` : ''}
      </div>
    </section>`;

    raiz.querySelectorAll('input[data-dia]').forEach(cb => cb.onchange = async () => {
      reto.dias[cb.dataset.dia].hecho[cb.dataset.item] = cb.checked;
      if (reto.dias.every(diaCompleto)) { reto.completado = true; reto.completadoEl = new Date().toISOString(); }
      await guardarReto(reto);
      pintar();
    });
    raiz.querySelectorAll('[data-cambiar]').forEach(b => b.onclick = async () => {
      const d = reto.dias[b.dataset.cambiar];
      d.tipo = d.tipo === 'entreno' ? 'descanso' : 'entreno';
      d.hecho.actividad = false;
      await guardarReto(reto);
      pintar();
    });
    raiz.querySelector('#volver').onclick = alVolver;
    raiz.querySelector('#siguiente')?.addEventListener('click', alSiguiente);
  }
  pintar();
  window.scrollTo(0, 0);
}
