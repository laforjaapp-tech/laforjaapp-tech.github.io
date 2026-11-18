// Demostración de un ejercicio: la ilustración animada y, a su lado, cómo se hace
// (pasos, respiración, qué debes sentir, qué evitar y precauciones). Se usa en la biblioteca y en el entrenamiento guiado.

import { esc } from './componentes.js';
import { ejercicioPorId, NOMBRES_GRUPO } from '../datos/ejercicios.js';
import { htmlIlustracion, tieneIlustracion, musculosDe } from './figura.js';

export function htmlTecnica(id) {
  const e = ejercicioPorId[id];
  if (!e) return '';
  const lista = (etiqueta, items, ordenada = false) => items?.length
    ? `<section><h4>${etiqueta}</h4><${ordenada ? 'ol' : 'ul'}>${items.map(x => `<li>${esc(x)}</li>`).join('')}</${ordenada ? 'ol' : 'ul'}></section>` : '';
  const texto = (etiqueta, t, clase = '') => t ? `<section${clase ? ` class="${clase}"` : ''}><h4>${etiqueta}</h4><p>${esc(t)}</p></section>` : '';
  return `<div class="tecnica">
    ${lista('Cómo se hace', e.como, true)}
    ${texto('Respiración', e.respiracion)}
    ${texto('Qué debes sentir', e.sentir)}
    ${lista('Evita', e.errores)}
    ${texto('Precaución', e.precauciones, 'precaucion')}
  </div>`;
}

// Ilustración + técnica juntas. Después de pintarla hay que llamar a montarIlustraciones(contenedor).
export function htmlDemostracion(id) {
  if (!ejercicioPorId[id]) return '';
  return `<div class="demostracion${tieneIlustracion(id) ? '' : ' sin-figura'}">${htmlIlustracion(id)}${htmlTecnica(id)}</div>`;
}

// Dosis en palabras: "3 series × 10 repeticiones", "2 series × 30 s por lado", "20 min", "4 intervalos…"
export function textoDosis(it, bloque = {}) {
  const lado = it.porLado ? ' por lado' : '';
  const series = n => `${n} ${n === 1 ? 'serie' : 'series'}`;
  if (it.intervalos) return `${it.intervalos.repeticiones} intervalos: ${Math.round(it.intervalos.rapido / 60 * 10) / 10} min a ritmo vivo + ${Math.round(it.intervalos.suave / 60 * 10) / 10} min suave`;
  if (bloque.formato === 'circuito' && it.segundos) return `${it.segundos} s de trabajo · ${bloque.vueltas} ${bloque.vueltas === 1 ? 'vuelta' : 'vueltas'}`;
  if (it.minutos) return `${it.minutos} min${it.nota && bloque.formato === 'circuito' ? ' entre vueltas' : ' seguidos'}`;
  if (it.reps != null) return `${series(it.series || 1)} × ${it.reps} repeticiones${lado}`;
  if (it.segundos) return it.series > 1 ? `${series(it.series)} × ${it.segundos} s${lado}` : `${it.segundos} s${lado}`;
  return it.texto || '';
}

// Fila de ejercicio para cualquier lista: ilustración en movimiento + nombre + dosis + músculos que trabaja
export function htmlFilaEjercicio(id, { nombre, dosis = '', nota = '', descanso = '' } = {}) {
  const e = ejercicioPorId[id];
  if (!e) return '';
  const m = musculosDe(id);
  const nombres = l => l.map(g => NOMBRES_GRUPO[g]).join(', ');
  return `<div class="fila-ej">
    ${htmlIlustracion(id, { leyenda: false, mini: true, animar: true })}
    <div class="fe-texto">
      <strong class="fe-nombre">${esc(nombre || e.nombre)}</strong>
      ${dosis ? `<span class="fe-dosis">${esc(dosis)}</span>` : ''}
      ${descanso ? `<span class="fe-descanso">Descanso: ${esc(descanso)}</span>` : ''}
      ${m.principal.length ? `<span class="fe-musc"><i class="ley principal" aria-hidden="true"></i>${m.verbo}: ${esc(nombres(m.principal))}</span>` : ''}
      ${m.secundario.length ? `<span class="fe-musc"><i class="ley secundario" aria-hidden="true"></i>Ayudan: ${esc(nombres(m.secundario))}</span>` : ''}
      ${nota ? `<span class="fe-nota">${esc(nota)}</span>` : ''}
    </div>
  </div>`;
}
