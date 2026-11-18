// TU PROGRESIÓN: fase del atleta, periodización, equilibrio muscular, progresiones y desbloqueos.

import { esc } from '../ui/componentes.js';
import { ejercicioPorId, NOMBRES_GRUPO, familia } from '../datos/ejercicios.js';
import { FASES, criteriosAscenso, evaluarDesbloqueos, estructuraPeriodizacion } from '../motor/fases.js';
import { volumenMuscular, barraTexto } from '../motor/historial.js';
import { hoyISO, sumarDias } from '../motor/calculos.js';
import { TIPOS_SESION } from '../motor/generador.js';
import { htmlFilaEjercicio } from '../ui/tecnica.js';
import { montarIlustraciones } from '../ui/figura.js';

const fecha = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });

export function vistaProgreso(raiz, atleta, sesiones, { alConfirmarParkour, alVerEjercicio }) {
  const f = atleta.fase?.numero || 1;
  const asc = criteriosAscenso(atleta, sesiones);
  const per = estructuraPeriodizacion(atleta);
  const hechas = sesiones.filter(s => s.estado === 'completada').sort((a, b) => b.fecha.localeCompare(a.fecha));
  const vol = volumenMuscular(hechas.filter(s => s.fecha >= sumarDias(hoyISO(), -6)));
  const items = evaluarDesbloqueos(atleta);
  const prog = Object.entries(atleta.progresion || {}).filter(([, e]) => ejercicioPorId[e.ejercicioId]);

  raiz.innerHTML = `<section class="pantalla">
    <span class="paso-num">Tu progresión</span>
    <h1>Fase ${f}: ${FASES[f - 1].nombre}</h1>
    <p class="subtitulo">${esc(FASES[f - 1].objetivo)}</p>
    <div class="fases">${FASES.map(x => `<div class="fase-paso${x.numero === f ? ' actual' : x.numero < f ? ' hecha' : ''}">
      <span class="fp-num">${x.numero}</span><span class="fp-nombre">${x.nombre}</span></div>`).join('')}</div>

    ${asc.final ? '<div class="nota">Estás en la fase más alta. A partir de aquí se trabaja por objetivos específicos.</div>' : `
    <h3>Para pasar a la fase ${f + 1} (${FASES[f].nombre})</h3>
    <ul class="criterios">${asc.criterios.map(c => `<li class="${c.cumplido ? 'ok' : ''}">${c.cumplido ? '✅' : '⬜'} ${esc(c.texto)} <span class="ayuda">· ${esc(c.actual)}</span></li>`).join('')}</ul>
    <p class="ayuda">Las fases no se saltan: se sube de una en una cuando se cumplen todos los criterios.</p>`}

    ${per ? `<h2>Tu plan en el tiempo</h2>
    <div class="tiles">
      <div class="tile"><span class="tile-titulo">Macrociclo ${per.macrociclo.numero}</span><span class="tile-valor">16 semanas</span><span class="tile-extra">${fecha(per.macrociclo.inicio)} – ${fecha(per.macrociclo.fin)}</span></div>
      <div class="tile"><span class="tile-titulo">Mesociclo ${per.mesociclo.numero} de 4</span><span class="tile-valor">${esc(per.mesociclo.nombre)}</span><span class="tile-extra">${esc(per.mesociclo.enfoque)}</span></div>
      <div class="tile"><span class="tile-titulo">Microciclo (semana ${per.microciclo.semana})</span><span class="tile-valor">${per.microciclo.tipo === 'descarga' ? 'Descarga' : 'Carga'}</span><span class="tile-extra">${fecha(per.microciclo.inicio)} – ${fecha(per.microciclo.fin)}</span></div>
      <div class="tile"><span class="tile-titulo">Esta semana</span><span class="tile-valor">${hechas.filter(s => s.fecha >= per.microciclo.inicio).length} / ${atleta.disponibilidad?.dias || '–'}</span><span class="tile-extra">sesiones hechas</span></div>
    </div>` : ''}

    <h2>Equilibrio muscular (últimos 7 días)</h2>
    ${hechas.length ? `<div class="volumen">${Object.entries(vol.volumen).map(([g, v]) =>
      `<div class="vol-fila"><span>${NOMBRES_GRUPO[g]}</span><code>${barraTexto(v, vol.maximo)}</code><span class="ayuda">${Math.round(v)} series</span></div>`).join('')}
      <div class="vol-fila"><span>Cardio</span><code>${barraTexto(Math.min(vol.capacidades.cardio, 6), 6)}</code><span class="ayuda">${vol.capacidades.cardio} bloques</span></div>
      <div class="vol-fila"><span>Movilidad</span><code>${barraTexto(Math.min(vol.capacidades.movilidad, 6), 6)}</code><span class="ayuda">${vol.capacidades.movilidad} bloques</span></div>
      <div class="vol-fila"><span>Equilibrio</span><code>${barraTexto(Math.min(vol.capacidades.equilibrio, 6), 6)}</code><span class="ayuda">${vol.capacidades.equilibrio} ejercicios</span></div>
    </div>
    ${vol.desequilibrios.length || vol.alertas.length ? `<div class="nota precaucion">${vol.desequilibrios.map(d => `<p>• ${NOMBRES_GRUPO[d.grupo]} va por detrás: la próxima sesión de fuerza lo reforzará.</p>`).join('')}${vol.alertas.map(a => `<p>• ${esc(a)}</p>`).join('')}</div>` : '<p class="ayuda">Distribución equilibrada.</p>'}`
      : '<p class="ayuda">Aparecerá cuando registres tus primeros entrenamientos.</p>'}

    <h2>Tus progresiones</h2>
    ${prog.length ? `<div class="progresiones">${prog.map(([fam, e]) => {
      const ej = ejercicioPorId[e.ejercicioId]; const cad = familia(fam); const i = cad.findIndex(x => x.id === ej.id);
      return `<button type="button" class="prog" data-ej="${ej.id}">
        ${htmlFilaEjercicio(ej.id, { dosis: `${e.series} ${e.series === 1 ? 'serie' : 'series'} × ${ej.dosis === 'tiempo' ? e.valor + ' s' : e.valor + ' repeticiones'}${e.tempo === 'lento' ? ' · bajada lenta' : ''}` })}
        <span class="prog-cadena">${cad.map((x, k) => `<i class="${k < i ? 'hecho' : k === i ? 'aqui' : ''}"></i>`).join('')}</span>
        <span class="ayuda">${cad[i + 1] ? `Siguiente: ${esc(cad[i + 1].nombre)}` : 'Última variante de la cadena'}</span>
      </button>`; }).join('')}</div>` : '<p class="ayuda">Se crean al generar tu primer entrenamiento.</p>'}

    <h2>Desbloqueos</h2>
    <div class="desbloqueos">${items.map(i => `<div class="desbloqueo${i.desbloqueado ? ' abierto' : ''}">
      <div class="db-cab"><span>${i.desbloqueado ? '🔓' : '🔒'} ${i.icono} ${esc(i.nombre)}</span></div>
      ${i.desbloqueado ? '<p class="ayuda">Desbloqueado: el motor ya puede incluirlo cuando corresponda.</p>'
        : `<p class="ayuda">${esc(i.mensaje)}</p><ul>${i.requisitos.map(r => `<li class="${r.cumplido ? 'ok' : ''}">${r.cumplido ? '✅' : '⬜'} ${esc(r.texto)}</li>`).join('')}</ul>`}
      ${i.requiereConfirmacion ? '<button class="btn mini" data-parkour-d>Confirmo supervisión y superficie segura</button>' : ''}
    </div>`).join('')}</div>

    <h2>Historial</h2>
    ${hechas.length ? `<table class="tabla"><thead><tr><th>Fecha</th><th>Sesión</th><th>Duración</th><th>Esfuerzo</th></tr></thead><tbody>
      ${hechas.slice(0, 15).map(s => `<tr><td>${fecha(s.fecha)}</td><td>${esc(TIPOS_SESION[s.workout.tipo]?.nombre || '')}</td><td>${s.workout.duracion} min</td><td>${s.resultado?.general?.esfuerzo ?? '–'}/10</td></tr>`).join('')}
    </tbody></table>` : '<p class="ayuda">Todavía no hay entrenamientos registrados.</p>'}
  </section>`;

  montarIlustraciones(raiz);
  raiz.querySelectorAll('[data-ej]').forEach(b => b.onclick = () => alVerEjercicio(b.dataset.ej));
  raiz.querySelector('[data-parkour-d]')?.addEventListener('click', alConfirmarParkour);
  window.scrollTo(0, 0);
}
