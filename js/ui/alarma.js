// Alarma de pantalla completa (con LA FORJA abierta y a la vista): suena y vibra en bucle hasta que la persona toque
// "✅ Ya lo hice" (va a anotar la actividad) o "🔕 Apagar" (se calla; si no la anota, la nube la vuelve a mandar).
// Con la app cerrada, la alarma es la notificación del teléfono (sw.js).

import { esc } from './componentes.js';

let actual = null;   // una sola alarma a la vez: la nueva reemplaza a la anterior

// Pitido de alarma con el sintetizador del navegador (sin archivos de sonido). Puede quedar mudo si el
// navegador no deja sonar sin un toque previo: entonces queda la vibración.
function sonar() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return () => {};
  const ctx = new Ctx();
  ctx.resume?.().catch(() => {});
  const pitar = () => {
    const t = ctx.currentTime;
    [0, 0.25, 0.5].forEach(d => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
      o.connect(g).connect(ctx.destination); o.start(t + d); o.stop(t + d + 0.2);
    });
  };
  pitar();
  const id = setInterval(pitar, 1200);
  return () => { clearInterval(id); ctx.close?.().catch(() => {}); };
}

function vibrar() {
  if (!navigator.vibrate) return () => {};
  const patron = [900, 300, 900, 300, 900];
  navigator.vibrate(patron);
  const id = setInterval(() => navigator.vibrate(patron), 3500);
  return () => { clearInterval(id); navigator.vibrate(0); };
}

export function cerrarAlarma() { actual?.(); actual = null; }

// d: { titulo, cuerpo, ficha, ir }. alHecho(d) y alApagar(d) los pone la app (callan la alarma en la nube).
export function mostrarAlarma(d, { alHecho, alApagar }) {
  cerrarAlarma();
  const el = document.createElement('div');
  el.className = 'alarma-pantalla';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-live', 'assertive');
  el.innerHTML = `<div class="alarma-caja">
      <div class="alarma-icono" aria-hidden="true">⏰</div>
      <h2>${esc(d.titulo || 'LA FORJA')}</h2>
      ${d.cuerpo ? `<p>${esc(d.cuerpo)}</p>` : ''}
      <div class="alarma-botones">
        <button type="button" class="btn" data-hecho>✅ Ya lo hice</button>
        <button type="button" class="btn sec" data-apagar>🔕 Apagar</button>
      </div>
      <p class="alarma-nota">Si la apagas sin anotarlo, volverá a sonar.</p>
    </div>`;
  document.body.appendChild(el);
  const pararSonido = sonar(), pararVibrar = vibrar();
  actual = () => { pararSonido(); pararVibrar(); el.remove(); };
  el.querySelector('[data-hecho]').onclick = () => { cerrarAlarma(); alHecho(d); };
  el.querySelector('[data-apagar]').onclick = () => { cerrarAlarma(); alApagar(d); };
  el.querySelector('[data-hecho]').focus();
}
