// 📲 Su doctora le pidió activar las alarmas: pantalla con un solo botón (sale al abrir la app hasta que las active).
// "Ahora no" la esconde 4 horas. Según el teléfono: activar, desbloquear en ajustes o instalar en el iPhone.
import { esc } from './componentes.js';

const AHORA_NO = 'laforja-pedido-avisos-ahora-no';
const ESPERA_AHORA_NO = 4 * 3600e3;
let abierta = false;

export function tocaMostrarPedido(estado) {
  if (abierta || estado === 'activos' || estado === 'no_disponible') return false;
  let antes = 0;
  try { antes = Number(localStorage.getItem(AHORA_NO)) || 0; } catch {}
  return Date.now() - antes > ESPERA_AHORA_NO;
}

// estado: el de nube/avisos.js (apagados | bloqueados | instalar) · alActivar: devuelve el estado nuevo
export function mostrarPedidoAvisos({ doctora, estado, alActivar }) {
  abierta = true;
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  const quien = esc(doctora || 'Tu doctora');
  const cuerpo = {
    apagados: `<p>Así LA FORJA te avisa a la hora de cada comida, del agua, del entreno y de dormir, <strong>aunque tengas la app cerrada</strong>.</p>
      <p class="ayuda">Al tocar el botón, tu teléfono te preguntará: toca <strong>Permitir</strong>.</p>
      <div class="acciones"><button type="button" class="btn sec" data-r="no">Ahora no</button><button type="button" class="btn" data-r="activar">📲 Activar alarmas</button></div>`,
    bloqueados: `<p>Las notificaciones de LA FORJA están <strong>bloqueadas</strong> en este teléfono. Para permitirlas:</p>
      <ol><li>Mantén el dedo sobre el ícono de LA FORJA y toca <strong>ⓘ Información de la app</strong> (o, en Chrome, el candado 🔒 junto a la dirección).</li>
      <li>Toca <strong>Notificaciones</strong> y actívalas.</li><li>Vuelve aquí y toca <strong>Ya lo hice</strong>.</li></ol>
      <div class="acciones"><button type="button" class="btn sec" data-r="no">Ahora no</button><button type="button" class="btn" data-r="activar">✅ Ya lo hice</button></div>`,
    instalar: `<p>En el iPhone, las alarmas solo llegan con LA FORJA instalada:</p>
      <ol><li>En Safari toca <strong>Compartir ⬆️</strong>.</li><li>Toca <strong>Agregar a inicio</strong>.</li>
      <li>Abre LA FORJA desde el ícono nuevo y toca <strong>Activar alarmas</strong>.</li></ol>
      <div class="acciones"><button type="button" class="btn" data-r="no">Entendido</button></div>`,
  }[estado] || '';
  fondo.innerHTML = `<div class="modal pedido-avisos" role="dialog" aria-modal="true" aria-labelledby="pa-titulo">
    <h2 id="pa-titulo">🔔 ${quien} te pide activar las alarmas</h2>${cuerpo}<p class="error" role="alert"></p></div>`;
  const cerrar = () => { fondo.remove(); abierta = false; };
  fondo.addEventListener('click', async e => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    if (b.dataset.r === 'no') {
      try { localStorage.setItem(AHORA_NO, String(Date.now())); } catch {}
      return cerrar();
    }
    b.disabled = true;
    const nuevo = await alActivar().catch(() => null);
    if (nuevo === 'activos') return cerrar();
    fondo.querySelector('.error').textContent = nuevo === 'bloqueados'
      ? 'Siguen bloqueadas: permítelas en los ajustes del teléfono como dice arriba.'
      : 'No se pudieron activar. Revisa tu internet y vuelve a intentar.';
    b.disabled = false;
  });
  document.body.appendChild(fondo);
}
