// Cuenta y permiso de uso. Regla del dueño: la clienta usa LA FORJA solo mientras tenga pagado;
// dueño y doctoras siempre. Sin internet se usa la última comprobación, como mucho de hace DIAS_SIN_CONEXION días.

import { nube, limiteDeEspera } from './cliente.js';
import { hoyISO } from '../motor/calculos.js';

const GUARDADO = 'la-forja-acceso';
const DIAS_SIN_CONEXION = 7;
const ESPERA_MS = 10000;

const leer = () => { try { return JSON.parse(localStorage.getItem(GUARDADO)); } catch { return null; } };
const guardar = v => { try { v ? localStorage.setItem(GUARDADO, JSON.stringify(v)) : localStorage.removeItem(GUARDADO); } catch {} };

// Mensajes de Supabase en palabras sencillas
const ERRORES = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/already registered|already exists/i, 'Ya existe una cuenta con ese correo. Toca "Ya tengo cuenta".'],
  [/password.*(at least|characters)/i, 'La contraseña debe tener al menos 8 letras o números.'],
  [/valid email|invalid.*email|unable to validate email/i, 'Ese correo no es válido. Revísalo.'],
  [/rate limit|too many/i, 'Demasiados intentos. Espera unos minutos y vuelve a probar.'],
  [/fetch|network|timeout|abort/i, 'No hay conexión a internet. Conéctate y vuelve a intentar.'],
];
export const enPalabras = e => {
  const m = String(e?.message || e || '');
  return ERRORES.find(([re]) => re.test(m))?.[1] || m || 'Algo salió mal. Vuelve a intentar.';
};
const esSinConexion = e => !navigator.onLine || /fetch|network|timeout|abort/i.test(String(e?.message || e || ''));

async function llamar(fn, args) {
  const { data, error } = await nube.rpc(fn, args).abortSignal(limiteDeEspera(ESPERA_MS));
  if (error) throw error;
  return data;
}

export async function sesionActual() {
  const { data } = await nube.auth.getSession();
  return data.session;
}

export async function entrar(correo, clave) {
  const { error } = await nube.auth.signInWithPassword({ email: correo.trim(), password: clave });
  if (error) throw error;
}

export async function crearCuenta({ nombre, telefono, correo, clave }) {
  const { data, error } = await nube.auth.signUp({ email: correo.trim(), password: clave, options: { data: { nombre: nombre.trim(), telefono: telefono.trim() } } });
  if (error) throw error;
  if (!data.session) throw new Error('La cuenta se creó, pero no se pudo entrar. Toca "Ya tengo cuenta".');
}

export async function salir() {
  guardar(null);
  await nube.auth.signOut().catch(() => {});
}

// { rol, nombre, hasta, acceso, doctora, doctora_tel, correo, cuenta, sinConexion? }
export async function consultarAcceso(sesion) {
  try {
    const info = { ...(await llamar('mi_acceso')), correo: sesion.user.email, cuenta: sesion.user.id };
    guardar({ ...info, verificado: hoyISO() });
    return info;
  } catch (e) {
    const g = leer();
    if (!esSinConexion(e) || g?.cuenta !== sesion.user.id) throw e;
    const dias = (Date.parse(hoyISO()) - Date.parse(g.verificado)) / 864e5;
    const acceso = dias <= DIAS_SIN_CONEXION && (g.rol !== 'clienta' || (g.hasta && g.hasta >= hoyISO()));
    return { ...g, acceso, sinConexion: true, vencioSinConexion: !acceso && dias > DIAS_SIN_CONEXION };
  }
}

export const canjearCodigo = (codigo, autoriza) => llamar('canjear_invitacion', { p_codigo: codigo, p_autoriza: autoriza });

// ---------- Panel de la doctora ----------
export const misClientas = () => llamar('mis_clientas');
export const crearInvitacion = ({ nombre, telefono, meses, monto }) =>
  llamar('crear_invitacion', { p_nombre: nombre, p_telefono: telefono, p_meses: meses, p_monto: monto });
export const registrarPago = (clienta, meses, monto) => llamar('registrar_pago', { p_clienta: clienta, p_meses: meses, p_monto: monto });
export const cerrarAcceso = clienta => llamar('cerrar_acceso', { p_clienta: clienta });
export const nombrarDoctora = correo => llamar('poner_rol', { p_correo: correo, p_rol: 'doctora' });
export const datosDeClienta = clienta => llamar('datos_de_clienta', { p_clienta: clienta });
export const guardarNota = (clienta, texto) => llamar('guardar_nota', { p_clienta: clienta, p_texto: texto });
export const borrarNota = id => llamar('borrar_nota', { p_id: id });
// Plan de comidas que indica la doctora (campos de datos/dietas.js); todo vacío = vuelve al cálculo automático
export const guardarIndicaciones = (clienta, plan) => llamar('guardar_indicaciones', { p_clienta: clienta, p_ind: plan });
// Sus dietas guardadas para reutilizarlas con otras clientas
export const misDietas = () => llamar('mis_dietas');
export const guardarDieta = (id, nombre, datos) => llamar('guardar_dieta', { p_id: id || null, p_nombre: nombre, p_datos: datos });
export const borrarDieta = id => llamar('borrar_dieta', { p_id: id });

// ---------- Mensajes (clienta = null: la clienta habla con su doctora) ----------
export const mensajesDe = (clienta = null) => llamar('mensajes_de', { p_clienta: clienta });
export const enviarMensaje = (clienta, texto) => llamar('enviar_mensaje', { p_clienta: clienta, p_texto: texto });
export const novedades = () => llamar('novedades');

export async function codigosPendientes() {
  const { data, error } = await nube.from('invitaciones').select('codigo, nombre, telefono, meses, creada')
    .is('usada_por', null).order('creada', { ascending: false }).abortSignal(limiteDeEspera(ESPERA_MS));
  if (error) throw error;
  return data;
}
