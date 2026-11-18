// ALARMAS QUE SUENAN CON LA APP CERRADA
// Una app web no puede despertar el teléfono por sí sola. Por eso se genera un archivo de calendario (.ics)
// con eventos que se repiten y su alarma: el calendario del teléfono los hace sonar aunque LA FORJA esté cerrada.
// Usa la misma configuración que los recordatorios dentro de la app.

import { aMinutos, aHora } from './nutricion.js';
import { COMIDAS_POR_DIA, tipoComida, TIPOS_COMIDA } from '../datos/alimentos.js';
import { hoyISO, sumarDias } from './calculos.js';

const DIAS_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];   // 0 = domingo (como Date.getDay)
const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const texto = t => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const fechaIcs = (fecha, hora) => `${fecha.replace(/-/g, '')}T${hora.replace(':', '')}00`;
const sello = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
// Líneas de más de 75 caracteres se parten como pide el formato iCalendar
const plegar = l => {
  const out = [];
  let s = l;
  while (s.length > 74) {
    const corte = /[\uD800-\uDBFF]/.test(s[73]) ? 73 : 74;   // nunca partir un emoji por la mitad
    out.push(s.slice(0, corte)); s = ' ' + s.slice(corte);
  }
  out.push(s);
  return out.join('\r\n');
};

// Lista de alarmas a partir de la configuración: [{ clave, titulo, cuerpo, hora, dias (null = todos), avisos: [minutos antes] }]
export function listaAlarmas({ config, perfilNut, sueno, suplementos = [] }) {
  const lista = [];
  const c = config || {};
  // 🏋️ Entrenamiento: los días y la hora de tus preferencias
  if (c.entreno?.activo && perfilNut?.horaEntreno && perfilNut?.diasEntreno?.length) {
    lista.push({ clave: 'entreno', titulo: '🏋️ LA FORJA: hora de entrenar', cuerpo: 'Abre LA FORJA: tu entrenamiento de hoy está listo.', hora: perfilNut.horaEntreno, dias: perfilNut.diasEntreno, avisos: [c.entreno.minutosAntes || 0] });
  }
  // 🥗 Comidas (desayuno, merienda, almuerzo, cena…) según tu horario
  if (c.comida?.activo && perfilNut) {
    for (const t of COMIDAS_POR_DIA[perfilNut.comidas] || COMIDAS_POR_DIA[4]) {
      const hora = perfilNut.horarios?.[t] || TIPOS_COMIDA.find(x => x.id === t)?.hora;
      if (hora) lista.push({ clave: `comida-${t}`, titulo: `${tipoComida(t).icono} ${tipoComida(t).etiqueta}`, cuerpo: 'Tu comida está programada. Mira el menú en LA FORJA → Comida.', hora, dias: null, avisos: [c.comida.minutosAntes || 0] });
    }
  }
  // 💧 Agua: cada X minutos dentro de tu horario
  if (c.agua?.activo) {
    const desde = aMinutos(c.agua.desde || '08:00'), hasta = aMinutos(c.agua.hasta || '21:00'), cada = Math.max(30, c.agua.cadaMin || 90);
    for (let t = desde + cada; t <= hasta; t += cada) lista.push({ clave: `agua-${aHora(t)}`, titulo: '💧 Toma agua', cuerpo: 'Un vaso de agua. Anótalo en LA FORJA → Bienestar → Agua.', hora: aHora(t), dias: null, avisos: [0] });
  }
  // 🌙 Hora de dormir: aviso previo y a la hora
  if (sueno?.recordatorio?.activo && sueno.horaDormir) {
    const dias = (sueno.recordatorio.dias || []).length === 7 ? null : sueno.recordatorio.dias;
    lista.push({ clave: 'sueno', titulo: '🌙 Hora de descansar', cuerpo: 'Baja las luces, deja las pantallas y prepárate para dormir.', hora: sueno.horaDormir, dias, avisos: [sueno.recordatorio.minutosAntes || 60, 0] });
  }
  // 💊 Suplementos con recordatorio
  for (const s of suplementos.filter(x => x.recordatorio && x.hora)) {
    lista.push({ clave: `sup-${s.id}`, titulo: `💊 ${s.nombre}`, cuerpo: `${s.cantidad || ''} Márcalo en LA FORJA cuando lo tomes.`.trim(), hora: s.hora, dias: s.frecuencia === 'dias' && s.dias?.length ? s.dias : null, avisos: [0] });
  }
  return lista.sort((a, b) => a.hora.localeCompare(b.hora));
}

export const textoDias = dias => !dias ? 'todos los días' : dias.length === 7 ? 'todos los días' : dias.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => NOMBRE_DIA[d]).join(', ');

// Primer día que cumple la repetición (si no, algunos calendarios crean un evento de más el día de inicio)
function primerDia(desde, dias) {
  if (!dias) return desde;
  for (let i = 0; i < 7; i++) { const f = sumarDias(desde, i); if (dias.includes(new Date(f + 'T12:00:00').getDay())) return f; }
  return desde;
}

// Archivo de calendario con todas las alarmas (hora local del teléfono)
export function archivoCalendario(alarmas, desde = hoyISO()) {
  const ahora = sello();
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LA FORJA//Alarmas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:LA FORJA'];
  for (const a of alarmas) {
    lineas.push('BEGIN:VEVENT', `UID:laforja-${a.clave}@laforja`, `DTSTAMP:${ahora}`,
      `DTSTART:${fechaIcs(primerDia(desde, a.dias), a.hora)}`, 'DURATION:PT10M',
      a.dias ? `RRULE:FREQ=WEEKLY;BYDAY=${a.dias.map(d => DIAS_ICS[d]).join(',')}` : 'RRULE:FREQ=DAILY',
      `SUMMARY:${texto(a.titulo)}`, `DESCRIPTION:${texto(a.cuerpo)}`, 'TRANSP:TRANSPARENT');
    for (const m of a.avisos) lineas.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${texto(a.titulo)}`, `TRIGGER:-PT${m}M`, 'END:VALARM');
    lineas.push('END:VEVENT');
  }
  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n') + '\r\n';
}
