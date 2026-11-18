// Pantallas de la cuenta en la nube: entrar o crear cuenta, acceso cerrado (sin pago vigente)
// y el panel de la doctora con sus clientas, códigos y pagos.

import { esc, chips, activarChips, valorChips, confirmar, aviso } from '../ui/componentes.js';
import * as N from '../nube/acceso.js';
import { vistaFicha, haceDias, htmlAlertas } from './ficha.js';
import { alertasClienta } from '../motor/alertas.js';
import { htmlConversacion, activarConversacion } from '../ui/conversacion.js';
import { fmtPeso, fmtCambioPeso } from '../motor/unidades.js';
import { vistaRecetasDoctora } from './recetas.js';   // RECETAS de la nutrióloga

const fecha = iso => (iso ? new Date(iso.slice(0, 10) + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
// Teléfonos de RD (809, 829, 849) sin el 1 delante: WhatsApp lo necesita
const whatsapp = (tel, texto) => {
  let n = String(tel || '').replace(/\D/g, '');
  if (n.length === 10 && /^8[024]9/.test(n)) n = '1' + n;
  return n.length >= 10 ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
};
const fechaHora = iso => new Date(iso).toLocaleString('es-DO', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
const OPCIONES_MESES = [1, 2, 3, 6].map(m => ({ id: String(m), etiqueta: m === 1 ? '1 mes' : `${m} meses` }));

// Bloquea el botón mientras trabaja y muestra el error debajo, en palabras sencillas
async function conEspera(boton, salida, trabajo) {
  boton.disabled = true; salida.textContent = '';
  try { await trabajo(); } catch (e) { salida.textContent = N.enPalabras(e); } finally { boton.disabled = false; }
}

export function vistaEntrar(raiz, { alListo, crear = false }) {
  raiz.innerHTML = `<section class="pantalla bienvenida">
    <img class="marca-grande" src="icons/emblema.svg" alt="">
    <p class="paso-num">${crear ? 'Crea tu cuenta' : 'Entra a tu cuenta'}</p>
    <h1>${crear ? 'Te damos la bienvenida' : '¡Qué bueno verte!'}</h1>
    <form id="ce-form" autocomplete="on">
      ${crear ? `
      <label class="campo"><span class="campo-etiqueta">Tu nombre</span><input name="nombre" required autocomplete="name"></label>
      <label class="campo"><span class="campo-etiqueta">Teléfono (WhatsApp)</span><input name="telefono" inputmode="tel" autocomplete="tel" placeholder="809 000 0000"></label>` : ''}
      <label class="campo"><span class="campo-etiqueta">Correo</span><input name="correo" type="email" required autocomplete="email" inputmode="email"></label>
      <label class="campo"><span class="campo-etiqueta">Contraseña</span><input name="clave" type="password" required minlength="8" autocomplete="${crear ? 'new-password' : 'current-password'}"></label>
      ${crear ? '<p class="ayuda">Mínimo 8 letras o números. Anótala en un lugar seguro.</p>' : ''}
      <p class="error" id="ce-error" role="alert"></p>
      <div class="navegacion">
        <button type="button" class="btn sec" id="ce-cambiar">${crear ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}</button>
        <button type="submit" class="btn grande" id="ce-ir">${crear ? 'Crear mi cuenta →' : 'Entrar →'}</button>
      </div>
    </form>
  </section>`;
  const form = raiz.querySelector('#ce-form');
  raiz.querySelector('#ce-cambiar').onclick = () => vistaEntrar(raiz, { alListo, crear: !crear });
  form.onsubmit = e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    conEspera(raiz.querySelector('#ce-ir'), raiz.querySelector('#ce-error'), async () => {
      await (crear ? N.crearCuenta(d) : N.entrar(d.correo, d.clave));
      alListo();
    });
  };
}

// Casilla para escribir el código de la doctora (con el permiso de datos que pide la ley)
const htmlCodigo = () => `<form id="cb-form" class="nota">
    <label class="campo"><span class="campo-etiqueta">Código de tu doctora</span>
      <input name="codigo" required maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="Ej.: K7M2QX" style="text-transform:uppercase;letter-spacing:.2em"></label>
    <label class="check"><input type="checkbox" name="autoriza" required> Autorizo a mi doctora a ver mis datos de LA FORJA (peso, medidas, comidas, entrenamientos, agua, sueño y pasos) para darme seguimiento.</label>
    <p class="error" id="cb-error" role="alert"></p>
    <div class="navegacion"><span></span><button type="submit" class="btn" id="cb-ir">Activar mi acceso</button></div>
  </form>`;

export function vistaBloqueo(raiz, info, { alListo, alSalir }) {
  const vencida = info.hasta && info.rol === 'clienta';
  const wa = vencida && whatsapp(info.doctora_tel, `Hola, ${info.doctora || 'doctora'}. Quiero ponerme al día con mi pago de LA FORJA.`);
  raiz.innerHTML = `<section class="pantalla">
    <h1>${info.vencioSinConexion ? 'Necesitas internet' : vencida ? 'Tu acceso está en pausa' : 'Activa tu acceso'}</h1>
    ${info.vencioSinConexion
      ? '<p class="subtitulo">Hace más de una semana que LA FORJA no comprueba tu cuenta. Conéctate a internet y toca "Volver a comprobar".</p>'
      : vencida
        ? `<p class="subtitulo">Tu acceso venció el <strong>${esc(fecha(info.hasta))}</strong>. Tus datos siguen guardados. Cuando te pongas al día con ${esc(info.doctora || 'tu doctora')}, LA FORJA se abre de nuevo sola.</p>
           ${wa ? `<div class="navegacion"><span></span><a class="btn" href="${wa}" target="_blank" rel="noopener">💬 Escribirle por WhatsApp</a></div>` : ''}`
        : `<p class="subtitulo">Hola${info.nombre ? ', ' + esc(info.nombre) : ''}. Para usar LA FORJA necesitas el código que te da tu doctora cuando pagas tu mensualidad.</p>
           ${htmlCodigo()}`}
    <div class="navegacion">
      <button type="button" class="btn sec" id="cb-salir">Salir de esta cuenta</button>
      <button type="button" class="btn sec" id="cb-otra">🔄 Volver a comprobar</button>
    </div>
  </section>`;
  raiz.querySelector('#cb-salir').onclick = alSalir;
  raiz.querySelector('#cb-otra').onclick = alListo;
  const form = raiz.querySelector('#cb-form');
  if (form) form.onsubmit = e => {
    e.preventDefault();
    conEspera(raiz.querySelector('#cb-ir'), raiz.querySelector('#cb-error'), async () => {
      await N.canjearCodigo(form.codigo.value, form.autoriza.checked);
      aviso('✅ Acceso activado');
      alListo();
    });
  };
}

export function vistaSinConexion(raiz, mensaje, { alListo, alSalir }) {
  raiz.innerHTML = `<section class="pantalla">
    <h1>No se pudo comprobar tu cuenta</h1>
    <p class="subtitulo">${esc(mensaje)}</p>
    <div class="navegacion">
      <button type="button" class="btn sec" id="cs-salir">Salir de esta cuenta</button>
      <button type="button" class="btn" id="cs-otra">🔄 Volver a intentar</button>
    </div>
  </section>`;
  raiz.querySelector('#cs-salir').onclick = alSalir;
  raiz.querySelector('#cs-otra').onclick = alListo;
}

// ---------- Mi cuenta (y, para doctora o dueño, sus clientas) ----------
export async function vistaCuenta(raiz, info, opciones) {
  const { alVolver, alSalir, seguimiento: seg } = opciones;
  const esDoctora = info.rol === 'doctora' || info.rol === 'dueno';
  raiz.innerHTML = `<section class="pantalla">
    <div class="navegacion"><button type="button" class="btn sec mini" id="cu-volver">← Volver</button><span></span></div>
    <h1>${esDoctora ? 'Mis clientas' : 'Mi cuenta'}</h1>
    ${esDoctora ? '<div class="botones-fila"><button type="button" class="btn mini" id="cu-recetas">📖 Recetas</button></div><div id="cu-panel"><p>Cargando…</p></div>' : ''}
    <h2>Cuenta</h2>
    <div class="nota">
      <p><strong>${esc(info.nombre || '')}</strong> · ${esc(info.correo || '')}</p>
      ${info.rol === 'clienta' && info.hasta ? `<p>Acceso pagado hasta el <strong>${esc(fecha(info.hasta))}</strong>${info.doctora ? ` · con ${esc(info.doctora)}` : ''}</p>` : ''}
      ${info.sinConexion ? '<p>Sin internet: estos datos son de la última vez que se comprobó.</p>' : ''}
    </div>
    ${seg ? `<h2>Tu seguimiento</h2>
    <div class="nota" id="cu-seg">
      <p>${esc(info.doctora || 'Tu doctora')} ve tu peso, tus medidas, tus entrenamientos, tus comidas, el agua, el sueño y los pasos. Se le envían solos cuando tienes internet.</p>
      <p>Último envío: <strong>${seg.subido ? esc(fechaHora(seg.subido)) : 'todavía ninguno'}</strong></p>
      ${seg.personas.length > 1 ? `<p class="campo-etiqueta">Persona de este teléfono que ve tu doctora</p>
        ${chips({ ruta: 'persona', opciones: seg.personas.map(p => ({ id: p.id, etiqueta: p.nombre })), valor: seg.conectada })}` : ''}
      <div class="navegacion"><span></span><button type="button" class="btn mini" id="cu-enviar">📤 Enviar ahora</button></div>
    </div>
    <h2>💬 Mensajes con ${esc(info.doctora || 'tu doctora')}</h2>
    <div id="cu-mensajes"><p>Cargando…</p></div>` : ''}
    <div class="navegacion"><span></span><button type="button" class="btn sec mini" id="cu-salir">Salir de la cuenta</button></div>
  </section>`;
  raiz.querySelector('#cu-volver').onclick = alVolver;
  raiz.querySelector('#cu-recetas')?.addEventListener('click', () => vistaRecetasDoctora(raiz, { alVolver: () => vistaCuenta(raiz, info, opciones) }));
  raiz.querySelector('#cu-salir').onclick = async () => { if (await confirmar('¿Salir de tu cuenta en este aparato? Para volver a entrar necesitarás tu correo y tu contraseña.')) alSalir(); };
  if (seg) {
    const caja = raiz.querySelector('#cu-seg');
    caja.querySelector('#cu-enviar').onclick = e => { e.currentTarget.disabled = true; seg.alEnviar(); };
    activarChips(caja, async () => {
      const id = valorChips(caja.querySelector('.chips'));
      const nombre = seg.personas.find(p => p.id === id)?.nombre;
      if (id !== seg.conectada && await confirmar(`¿Quieres que tu doctora vea los datos de ${nombre}? Dejará de ver los de la persona anterior.`)) seg.alCambiarPersona(id);
      else vistaCuenta(raiz, info, opciones);
    });
    pintarMensajes(raiz.querySelector('#cu-mensajes'), info, seg);
  }
  const verClienta = (c, parte) => vistaFicha(raiz, c, { alVolver: () => vistaCuenta(raiz, info, opciones), yo: info.cuenta, parte });
  if (esDoctora) await pintarPanel(raiz.querySelector('#cu-panel'), info, verClienta);
}

// La clienta conversa con su doctora; al abrirlos, sus mensajes quedan leídos
async function pintarMensajes(caja, info, seg) {
  let mensajes;
  try { mensajes = await N.mensajesDe(); }
  catch (e) { caja.innerHTML = `<p class="error">${esc(N.enPalabras(e))}</p>`; return; }
  seg.alLeido?.();
  const otra = info.doctora || 'tu doctora';
  caja.innerHTML = htmlConversacion(mensajes, { yo: info.cuenta, otra, ayuda: `${otra} lo verá cuando abra LA FORJA.` });
  activarConversacion(caja, { yo: info.cuenta, alEnviar: texto => N.enviarMensaje(null, texto), enPalabras: N.enPalabras });
}

// Una línea con lo último de la clienta, para ver de un vistazo quién necesita atención
function lineaSeguimiento(c) {
  const r = c.resumen;
  if (!r || !c.subido) return 'Todavía no ha enviado datos.';
  const a = { unidades: r.unidades };
  return [
    r.ultimoEntreno ? `Último entreno ${haceDias(r.ultimoEntreno)}` : 'Sin entrenos todavía',
    r.peso ? `${fmtPeso(r.peso, a)}${r.cambio30 != null ? ` (${fmtCambioPeso(r.cambio30, a)} en 30 días)` : ''}` : '',
    `datos de ${haceDias(c.subido.slice(0, 10))}`,
  ].filter(Boolean).join(' · ');
}

async function pintarPanel(caja, info, verClienta) {
  let clientas, pendientes;
  try { [clientas, pendientes] = await Promise.all([N.misClientas(), N.codigosPendientes()]); }
  catch (e) { caja.innerHTML = `<p class="error">${esc(N.enPalabras(e))}</p>`; return; }
  const activas = clientas.filter(c => c.activa).length;
  clientas.forEach(c => { c.alertas = alertasClienta(c); });
  const atender = clientas.filter(c => c.alertas.some(x => x.nivel === 'alta'));
  caja.innerHTML = `
    <p class="subtitulo">${activas} activa${activas === 1 ? '' : 's'} · ${clientas.length - activas} en pausa. Cuando una clienta deja de pagar, LA FORJA se le cierra sola el día que vence.</p>
    ${atender.length ? `<section class="nota peligro cu-atender"><h2>⚠️ Necesitan atención</h2>
      <ul>${atender.map(c => `<li><button type="button" class="cu-ir" data-ir="${c.id}"><strong>${esc(c.nombre || c.correo)}</strong>
        <span>${esc(c.alertas.filter(x => x.nivel === 'alta').map(x => `${x.icono} ${x.texto}`).join(' · '))}</span></button></li>`).join('')}</ul></section>` : ''}
    <details class="nota" id="cu-nueva">
      <summary><strong>+ Nueva clienta</strong> (después de cobrarle)</summary>
      <form id="cu-form-nueva">
        <label class="campo"><span class="campo-etiqueta">Nombre</span><input name="nombre" required></label>
        <label class="campo"><span class="campo-etiqueta">Teléfono (WhatsApp)</span><input name="telefono" inputmode="tel" placeholder="809 000 0000"></label>
        <p class="campo-etiqueta">Pagó</p>${chips({ ruta: 'meses', opciones: OPCIONES_MESES, valor: '1' })}
        <label class="campo"><span class="campo-etiqueta">Monto cobrado (RD$)</span><input name="monto" inputmode="decimal"></label>
        <p class="error" id="cu-error-nueva" role="alert"></p>
        <div class="navegacion"><span></span><button type="submit" class="btn" id="cu-crear">Crear código</button></div>
      </form>
      <div id="cu-codigo"></div>
    </details>
    ${clientas.length ? `<div class="cu-lista">${clientas.map(c => `<div class="nota cu-clienta" data-clienta="${c.id}">
      <div class="cu-cab">
        <div><strong>${c.activa ? '🟢' : '🔴'} ${esc(c.nombre || c.correo)}</strong>
          <p>${c.activa ? `Pagado hasta el ${esc(fecha(c.pagado_hasta))}` : `En pausa desde el ${esc(fecha(c.pagado_hasta))}`}<br>${esc(c.telefono || c.correo)}</p>
          <p class="cu-resumen">${esc(lineaSeguimiento(c))}${c.ajustado ? ' · 🩺 plan ajustado' : ''}</p>
          ${htmlAlertas(c.alertas)}</div>
        <div class="botones-fila"><button type="button" class="btn mini" data-ficha>📊 Seguimiento${c.sin_leer ? ` <b class="cv-globo">💬 ${c.sin_leer}</b>` : ''}</button><button type="button" class="btn mini sec" data-pago>💵 Pagó</button></div>
      </div>
      <div class="cu-pago" hidden>
        ${chips({ ruta: 'meses', opciones: OPCIONES_MESES, valor: '1' })}
        <label class="campo"><span class="campo-etiqueta">Monto (RD$)</span><input name="monto" inputmode="decimal"></label>
        <p class="error" role="alert"></p>
        <div class="botones-fila"><button type="button" class="btn mini" data-confirmar>Guardar pago</button>${c.activa ? '<button type="button" class="btn mini sec" data-cerrar>Cerrar acceso hoy</button>' : ''}</div>
      </div>
    </div>`).join('')}</div>` : '<p class="nota">Todavía no tienes clientas. Crea su código con "+ Nueva clienta".</p>'}
    ${pendientes.length ? `<h2>Códigos sin usar</h2><div class="lista-atletas">${pendientes.map(p => `<div class="atleta"><div class="atleta-elegir">
      <strong>${esc(p.codigo)}</strong><span>${esc(p.nombre)} · ${p.meses} mes${p.meses === 1 ? '' : 'es'} · creado el ${esc(fecha(p.creada))}</span></div></div>`).join('')}</div>` : ''}
    ${info.rol === 'dueno' ? `<details class="nota"><summary><strong>Nombrar una doctora</strong></summary>
      <p>Escribe el correo de la doctora. Si todavía no tiene cuenta, queda apuntada y será doctora en cuanto la cree con ese correo.</p>
      <form id="cu-form-doc"><label class="campo"><span class="campo-etiqueta">Correo de la doctora</span><input name="correo" type="email" required></label>
      <p class="error" id="cu-error-doc" role="alert"></p>
      <div class="navegacion"><span></span><button type="submit" class="btn" id="cu-nombrar">Nombrar doctora</button></div></form></details>` : ''}`;
  activarChips(caja);
  const repintar = () => pintarPanel(caja, info);
  const monto = v => { const n = Number(String(v || '').replace(/[^\d.,]/g, '').replace(',', '.')); return n > 0 ? n : null; };

  const fNueva = caja.querySelector('#cu-form-nueva');
  fNueva.onsubmit = e => {
    e.preventDefault();
    conEspera(caja.querySelector('#cu-crear'), caja.querySelector('#cu-error-nueva'), async () => {
      const d = { nombre: fNueva.nombre.value, telefono: fNueva.telefono.value, meses: Number(valorChips(fNueva.querySelector('.chips'))), monto: monto(fNueva.monto.value) };
      const codigo = await N.crearInvitacion(d);
      const texto = `Hola, ${d.nombre}. Ya tienes acceso a LA FORJA. Al abrirla, crea tu cuenta y escribe este código: ${codigo}`;
      const wa = whatsapp(d.telefono, texto);
      fNueva.reset();
      caja.querySelector('#cu-codigo').innerHTML = `<p class="campo-etiqueta">Código de ${esc(d.nombre)}</p>
        <p id="cu-codigo-valor" style="font-family:var(--display);font-weight:800;font-size:2.6rem;letter-spacing:.18em;margin:4px 0 10px">${esc(codigo)}</p>
        <div class="botones-fila">${wa ? `<a class="btn mini" href="${wa}" target="_blank" rel="noopener">💬 Enviar por WhatsApp</a>` : ''}
        <button type="button" class="btn mini sec" id="cu-copiar">Copiar mensaje</button></div>`;
      caja.querySelector('#cu-copiar').onclick = () => navigator.clipboard?.writeText(texto).then(() => aviso('Mensaje copiado'), () => aviso('No se pudo copiar', 'error'));
    });
  };

  caja.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => {
    const c = clientas.find(x => x.id === b.dataset.ir);
    verClienta(c, c.sin_leer ? 'mensajes' : 'seguimiento');
  });

  caja.querySelectorAll('[data-clienta]').forEach(fila => {
    const id = fila.dataset.clienta, panel = fila.querySelector('.cu-pago'), error = panel.querySelector('.error');
    fila.querySelector('[data-pago]').onclick = () => { panel.hidden = !panel.hidden; };
    fila.querySelector('[data-ficha]').onclick = () => { const c = clientas.find(x => x.id === id); verClienta(c, c.sin_leer ? 'mensajes' : 'seguimiento'); };
    panel.querySelector('[data-confirmar]').onclick = e => conEspera(e.currentTarget, error, async () => {
      const hasta = await N.registrarPago(id, Number(valorChips(panel.querySelector('.chips'))), monto(panel.querySelector('[name=monto]').value));
      aviso(`💵 Pago guardado: acceso hasta el ${fecha(hasta)}`);
      repintar();
    });
    panel.querySelector('[data-cerrar]')?.addEventListener('click', async e => {
      const boton = e.currentTarget;   // después de la confirmación el evento ya no lo trae
      if (!(await confirmar('¿Cerrar hoy el acceso de esta clienta? Podrá volver a entrar cuando anotes un pago.'))) return;
      conEspera(boton, error, async () => { await N.cerrarAcceso(id); aviso('Acceso cerrado'); repintar(); });
    });
  });

  const fDoc = caja.querySelector('#cu-form-doc');
  if (fDoc) fDoc.onsubmit = e => {
    e.preventDefault();
    conEspera(caja.querySelector('#cu-nombrar'), caja.querySelector('#cu-error-doc'), async () => {
      const r = await N.nombrarDoctora(fDoc.correo.value);
      aviso(r === 'apuntado' ? '👩‍⚕️ Apuntada: será doctora en cuanto cree su cuenta con ese correo' : '👩‍⚕️ Listo: ya es doctora en LA FORJA');
      fDoc.reset();
    });
  };
}
