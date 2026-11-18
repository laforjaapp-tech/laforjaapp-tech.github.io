// Conversación entre la doctora y su clienta (la usan las dos: Mi cuenta de la clienta y la ficha de la doctora).
// mensajes: [{ id, autor, texto, creado, leido }] · yo: id de la cuenta que mira · otra: nombre de la otra persona

import { esc } from './componentes.js';

const cuando = iso => {
  const d = new Date(iso), hoy = new Date();
  const hora = d.toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === hoy.toDateString() ? hora : `${d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })} · ${hora}`;
};

const htmlMensaje = (m, yo) => `<li class="cv-msg${m.autor === yo ? ' mio' : ''}">
    <p>${esc(m.texto)}</p><span class="cv-hora">${esc(cuando(m.creado))}${m.autor === yo && m.leido ? ' · ✓✓ leído' : ''}</span></li>`;

export function htmlConversacion(mensajes, { yo, otra, ayuda = '' }) {
  return `<div class="cv">
    <ul class="cv-lista" aria-live="polite">${mensajes.length ? mensajes.map(m => htmlMensaje(m, yo)).join('')
      : `<li class="cv-vacio">Todavía no hay mensajes con ${esc(otra)}.</li>`}</ul>
    <form class="cv-form">
      <label class="campo"><span class="campo-etiqueta">Escribirle a ${esc(otra)}</span>
        <textarea name="texto" rows="2" maxlength="2000" required></textarea></label>
      ${ayuda ? `<p class="ayuda">${esc(ayuda)}</p>` : ''}
      <p class="error" role="alert"></p>
      <div class="navegacion"><span></span><button type="submit" class="btn mini">Enviar ➤</button></div>
    </form>
  </div>`;
}

// alEnviar(texto) devuelve el mensaje guardado; enPalabras convierte el error en un texto sencillo
export function activarConversacion(caja, { yo, alEnviar, enPalabras }) {
  const lista = caja.querySelector('.cv-lista'), form = caja.querySelector('.cv-form');
  const error = form.querySelector('.error'), boton = form.querySelector('button');
  lista.scrollTop = lista.scrollHeight;
  form.onsubmit = async e => {
    e.preventDefault();
    const texto = form.texto.value.trim();
    if (!texto) return;
    boton.disabled = true; error.textContent = '';
    try {
      const m = await alEnviar(texto);
      lista.querySelector('.cv-vacio')?.remove();
      lista.insertAdjacentHTML('beforeend', htmlMensaje(m, yo));
      lista.scrollTop = lista.scrollHeight;
      form.reset();
    } catch (err) { error.textContent = enPalabras(err); }
    finally { boton.disabled = false; }
  };
}
