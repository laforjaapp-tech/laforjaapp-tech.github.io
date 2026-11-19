// FASE 4 — RECORDATORIOS
// Decide qué avisos tocan en este momento. Es una función pura: la pantalla los muestra.
// Todos los horarios son configurables. Ningún aviso es una obligación médica.

import { aMinutos, aHora } from './nutricion.js';
import { tipoComida } from '../datos/alimentos.js';

export const RECORDATORIOS_DEFECTO = {
  agua: { activo: true, cadaMin: 90, desde: '08:00', hasta: '21:00', entreno: true },
  comida: { activo: true, minutosAntes: 10 },
  entreno: { activo: true, minutosAntes: 30 },
  recuperacion: { activo: true, hora: '08:30' },
  // Con la app cerrada (motor/agenda.js). Alarma: suena cada minuto hasta que se toque un botón; "Apagar" la calla
  // repetirMin minutos y vuelve a sonar si la actividad sigue sin anotarse. El agua, alarma solo si se elige.
  avisos: { repetirMin: 15, alarma: true, aguaAlarma: false },
};

export const MENSAJES = {
  entreno: { icono: '🏋️', titulo: 'Tu entrenamiento de hoy está listo.' },
  agua: { icono: '💧', titulo: 'Recuerda hidratarte.' },
  comida: { icono: '🥗', titulo: 'Tu próxima comida está programada.' },
  sueno: { icono: '🌙', titulo: 'Es momento de prepararte para descansar.' },
  recuperacion: { icono: '🧘', titulo: 'Hoy la recuperación es parte de tu progreso.' },
  suplemento: { icono: '💊', titulo: 'Recordatorio de tu suplemento registrado.' },
};

const VENTANA = 30;   // minutos durante los que un aviso sigue siendo válido si la app estaba cerrada

// estado: { fecha, config, aguaMl, metaAgua, ultimoAgua (minutos del día o null), entrenoHoy, sesionHecha,
//           horaEntreno, comidas [{ id, tipo, hora, nombre, estado }], sueno (sleep_goal), suplementos [...],
//           diaRecuperacion, enviados { clave: true } }
export function recordatoriosPendientes(ahora, estado) {
  const cfg = { ...RECORDATORIOS_DEFECTO, ...(estado.config || {}) };
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  const dia = ahora.getDay();
  const fecha = estado.fecha;
  const enviados = estado.enviados || {};
  const lista = [];
  const toca = t => t <= min && min < t + VENTANA;
  const agregar = (clave, tipo, cuerpo, extra = {}) => {
    if (enviados[clave]) return;
    lista.push({ clave, tipo, icono: MENSAJES[tipo].icono, titulo: extra.titulo || MENSAJES[tipo].titulo, cuerpo, silencioso: !!extra.silencioso });
  };

  // 🏋️ Entrenamiento
  if (cfg.entreno.activo && estado.entrenoHoy && !estado.sesionHecha && estado.horaEntreno) {
    const t = aMinutos(estado.horaEntreno) - (cfg.entreno.minutosAntes || 0);
    if (toca(t)) agregar(`entreno:${fecha}`, 'entreno', `Hora prevista: ${estado.horaEntreno}.`);
  }

  // 💧 Agua: cada X minutos dentro del horario; más seguido alrededor del entrenamiento
  if (cfg.agua.activo && (estado.aguaMl || 0) < (estado.metaAgua || Infinity)) {
    const desde = aMinutos(cfg.agua.desde), hasta = aMinutos(cfg.agua.hasta);
    const cada = Math.max(30, cfg.agua.cadaMin || 90);
    const tEnt = estado.entrenoHoy && cfg.agua.entreno && estado.horaEntreno ? aMinutos(estado.horaEntreno) : null;
    const cercaEntreno = t => tEnt != null && t >= tEnt - 60 && t <= tEnt + 120;
    for (let t = desde; t <= hasta; t += cercaEntreno(t) ? Math.round(cada / 2) : cada) {
      if (t === desde) continue;   // el primero, después de un intervalo
      const intervalo = cercaEntreno(t) ? Math.round(cada / 2) : cada;
      if (toca(t) && (estado.ultimoAgua == null || estado.ultimoAgua <= t - intervalo)) {
        agregar(`agua:${fecha}:${aHora(t)}`, 'agua', cercaEntreno(t) ? 'Estás cerca de tu entrenamiento: bebe según tu sed.' : `Llevas ${estado.aguaMl || 0} de ${estado.metaAgua} ml (orientativo).`);
      }
    }
  }

  // 🥗 Comidas
  if (cfg.comida.activo) {
    for (const c of estado.comidas || []) {
      if (c.estado && c.estado !== 'planificada') continue;
      const t = aMinutos(c.hora) - (cfg.comida.minutosAntes || 0);
      if (toca(t)) agregar(`comida:${fecha}:${c.tipo}`, 'comida', `${tipoComida(c.tipo).etiqueta} · ${c.hora} — ${c.nombre}`);
    }
  }

  // 🌙 Sueño: aviso previo y aviso a la hora
  const s = estado.sueno;
  if (s?.recordatorio?.activo && (s.recordatorio.dias || []).includes(dia) && s.horaDormir) {
    const hora = aMinutos(s.horaDormir);
    const antes = s.recordatorio.minutosAntes || 60;
    const silencioso = !!s.recordatorio.silencioso;
    if (toca(((hora - antes) + 1440) % 1440)) agregar(`sueno-antes:${fecha}`, 'sueno', 'Baja las luces y deja las pantallas cuando puedas.', { titulo: `En ${antes} minutos comienza tu horario de descanso.`, silencioso });
    if (toca(hora)) agregar(`sueno:${fecha}`, 'sueno', 'Es momento de comenzar tu rutina de sueño.', { silencioso });
  }

  // 🧘 Recuperación
  if (cfg.recuperacion.activo && estado.diaRecuperacion && toca(aMinutos(cfg.recuperacion.hora))) {
    agregar(`recuperacion:${fecha}`, 'recuperacion', 'Hoy no necesitas una sesión intensa: caminar suave o movilidad es suficiente.');
  }

  // 💊 Suplementos registrados por el usuario
  for (const sup of estado.suplementos || []) {
    if (!sup.recordatorio || !sup.hora) continue;
    if (sup.dias?.length && !sup.dias.includes(dia)) continue;
    if (toca(aMinutos(sup.hora))) agregar(`sup:${sup.id}:${fecha}`, 'suplemento', `${sup.nombre}${sup.cantidad ? ` · ${sup.cantidad}` : ''}`);
  }
  return lista;
}
