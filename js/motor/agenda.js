// AVISOS CON LA APP CERRADA — la agenda que el teléfono sube a la nube (supabase/avisos.sql).
// Función pura: recibe el estado de un día (datos/habitos.js → estadoRecordatorios) y devuelve las actividades.
// Por cada actividad:
//   · a la persona: a su hora, una ALARMA que vibra y suena cada minuto hasta que toque "Ya lo hice" o "Apagar";
//     si la apaga sin anotar la actividad, vuelve a sonar a los X minutos. Deja de sonar cuando la anota o cuando
//     llega la siguiente actividad del mismo tipo. (Sin modo alarma: un aviso normal cada X minutos.)
//   · a su doctora: una alerta 1 hora después si no la cumplió (agua: a las 3:00 p. m.; sueño: a las 7:00 a. m.).
// Los recordatorios repetidos no siguen de noche (después de las 10:00 p. m.), salvo el de la hora de dormir.

import { aMinutos } from './nutricion.js';
import { sumarDias } from './calculos.js';
import { tipoComida } from '../datos/alimentos.js';
import { RECORDATORIOS_DEFECTO } from './recordatorios.js';

export const ALERTA_DESPUES_MIN = 60;
export const HORA_ALERTA_AGUA = '15:00';
export const HORA_ALERTA_SUENO = '07:00';
const FIN_DEL_DIA = aMinutos('22:00');
const COMIDO = ['completada', 'mitad', 'diferente'];

// fecha 'AAAA-MM-DD' + minutos del día (pueden pasar de 1440: día siguiente) → Date en la hora del teléfono
export function enFecha(fecha, min) {
  const d = new Date(`${fecha}T00:00:00`);
  d.setMinutes(min);
  return d;
}
export const hora12 = min => enFecha('2000-01-01', min).toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' });

export function agendaDelDia(e) {
  const cfg = { ...RECORDATORIOS_DEFECTO, ...(e.config || {}) };
  const avisos = { ...RECORDATORIOS_DEFECTO.avisos, ...(cfg.avisos || {}) };
  const repetir_min = avisos.repetirMin || 15;
  const alarma = tipo => !!avisos.alarma && (tipo !== 'agua' || !!avisos.aguaAlarma);
  const f = e.fecha;
  const lista = [];
  const poner = x => lista.push({
    dia: f, repetir_min, recordar: false, hecho: false, cumplido: false, texto_doctora: null, alarma: alarma(x.tipo), ...x,
    hora: x.hora ? x.hora.toISOString() : null, hasta: x.hasta ? x.hasta.toISOString() : null, alerta: x.alerta ? x.alerta.toISOString() : null,
  });

  // 🥗 Comidas: de su hora hasta la siguiente comida
  const comidas = (e.comidas || []).filter(c => c.hora && c.tipo !== 'extra').sort((a, b) => a.hora.localeCompare(b.hora));
  comidas.forEach((c, i) => {
    const t = aMinutos(c.hora);
    const nombre = tipoComida(c.tipo).etiqueta;
    const sig = comidas[i + 1] ? aMinutos(comidas[i + 1].hora) : t + 180;
    const marcada = !!c.estado && c.estado !== 'planificada' && c.estado !== 'en_curso';
    poner({
      clave: `comida:${f}:${c.tipo}:${c.hora}`, tipo: 'comida',
      titulo: `🥗 ${nombre} · ${hora12(t)}`, cuerpo: `${c.nombre || 'Tu comida'}. Márcala en LA FORJA cuando comas.`,
      recordar: cfg.comida.activo, hora: enFecha(f, t), hasta: enFecha(f, Math.max(t + 15, Math.min(sig, FIN_DEL_DIA))),
      alerta: enFecha(f, t + ALERTA_DESPUES_MIN), hecho: marcada, cumplido: COMIDO.includes(c.estado),
      texto_doctora: c.estado === 'no_realizada' ? `marcó que no comió: ${nombre.toLowerCase()} (${hora12(t)})` : `no ha marcado ${nombre.toLowerCase()} (${hora12(t)})`,
    });
  });

  // 🏋️ Entrenamiento: de su hora hasta las 10:00 p. m. (se calla en cuanto empieza la sesión en la app)
  if (e.entrenoHoy && e.horaEntreno) {
    const t = aMinutos(e.horaEntreno);
    poner({
      clave: `entreno:${f}`, tipo: 'entreno', titulo: `🏋️ Hora de entrenar · ${hora12(t)}`, cuerpo: 'Tu entrenamiento de hoy está listo en LA FORJA.',
      recordar: cfg.entreno.activo, hora: enFecha(f, t), hasta: enFecha(f, Math.max(t + 60, FIN_DEL_DIA)),
      alerta: enFecha(f, t + ALERTA_DESPUES_MIN), hecho: !!e.sesionEmpezada || !!e.sesionHecha, cumplido: !!e.sesionHecha,
      texto_doctora: `no ha registrado su entrenamiento (${hora12(t)})`,
    });
  }

  // 💧 Agua (no, si la doctora puso un límite de líquidos)
  if (e.metaAgua && !e.aguaMaximo) {
    const logs = e.aguaLogs || [];
    const consumido = logs.reduce((t, l) => t + (l.ml || 0), 0);
    if (cfg.agua.activo) {
      const desde = aMinutos(cfg.agua.desde), hasta = Math.min(aMinutos(cfg.agua.hasta), FIN_DEL_DIA);
      const cada = Math.max(30, cfg.agua.cadaMin || 90);
      for (let t = desde + cada; t <= hasta; t += cada) {
        poner({
          clave: `agua:${f}:${t}`, tipo: 'agua', titulo: '💧 Hora de tomar agua', cuerpo: `Tu meta de hoy: ${e.metaAgua} ml. Anótalo en LA FORJA.`,
          recordar: true, hora: enFecha(f, t), hasta: enFecha(f, Math.min(t + cada, hasta + 30)),
          // Tomó agua en este rato (o ya llegó a su meta): no hace falta recordar
          hecho: consumido >= e.metaAgua || logs.some(l => l.min > t - cada), cumplido: true,
        });
      }
    }
    const tA = aMinutos(HORA_ALERTA_AGUA);
    const hastaLas3 = logs.filter(l => l.min <= tA).reduce((t, l) => t + (l.ml || 0), 0);
    poner({
      clave: `agua_meta:${f}`, tipo: 'agua_meta', titulo: '💧 Agua', alerta: enFecha(f, tA),
      cumplido: hastaLas3 >= e.metaAgua / 2 || consumido >= e.metaAgua / 2,
      texto_doctora: `a las 3:00 p. m. lleva ${consumido} ml de agua de ${e.metaAgua} ml (menos de la mitad)`,
    });
  }

  // 🌙 Sueño: a su hora de dormir, hasta 1 hora después; la doctora lo ve a las 7:00 a. m.
  const s = e.sueno;
  if (s?.horaDormir) {
    const t0 = aMinutos(s.horaDormir);
    const t = t0 < 720 ? t0 + 1440 : t0;   // 12:30 a. m. es ya el día siguiente
    const dias = s.recordatorio?.dias || [0, 1, 2, 3, 4, 5, 6];
    poner({
      clave: `sueno:${f}`, tipo: 'sueno', titulo: `🌙 Hora de dormir · ${hora12(t0)}`, cuerpo: 'Al acostarte toca "Me voy a dormir" en LA FORJA.',
      recordar: s.recordatorio?.activo !== false && dias.includes(new Date(`${f}T12:00:00`).getDay()),
      hora: enFecha(f, t), hasta: enFecha(f, t + 60),
      alerta: enFecha(sumarDias(f, 1), aMinutos(HORA_ALERTA_SUENO)), hecho: !!e.nocheMarcada, cumplido: !!e.nocheMarcada,
      texto_doctora: `no marcó anoche a qué hora se acostó (su hora: ${hora12(t0)})`,
    });
  }
  return lista;
}
