// Conexión con la nube de LA FORJA (Supabase, cuenta laforjaapp-tech).
// La clave pública puede ir dentro de la app: lo que cada cuenta puede ver o cambiar lo decide la base (supabase/esquema.sql).
// La librería (js/vendor/supabase/supabase.js) se carga en index.html antes que la app.

const URL_NUBE = 'https://anmpadbswghupwagerkz.supabase.co';
const CLAVE_PUBLICA = 'sb_publishable_IPpiPnxxz4AChlf3g5meyw_iebnViqP';

export const nube = window.supabase.createClient(URL_NUBE, CLAVE_PUBLICA, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'la-forja-sesion' },
});

// Corta una llamada a la nube si tarda más de ms. AbortSignal.timeout no existe en iPhone con iOS 15
// (Safari 15): allí se arma igual con un AbortController.
export function limiteDeEspera(ms) {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const control = new AbortController();
  setTimeout(() => control.abort(new DOMException('timeout', 'TimeoutError')), ms);
  return control.signal;
}
