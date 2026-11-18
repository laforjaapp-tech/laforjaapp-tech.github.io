// Lector de la foto de una receta → borrador (motor/recetas.js). Pieza intercambiable, mismo resultado en los dos modos:
//   'telefono': Tesseract.js en el propio aparato (js/vendor/tesseract). Gratis; la foto no sale del teléfono.
//               La primera vez baja unos 6 MB (lector + español) y luego queda guardado.
//   'nube':     función leer-receta en Supabase con visión (supabase/functions/leer-receta). Entiende mejor la letra
//               a mano y las fotos torcidas, pero cuesta por cada foto y necesita la clave de la API.
// leerReceta(archivo, { modo, alProgreso }) → { borrador, texto, modo }

import { interpretarTexto, completarBorrador } from '../motor/recetas.js';
import { leerRecetaEnNube } from '../nube/recetas.js';

const RUTA = new URL('js/vendor/tesseract/', document.baseURI).href;
let lector = null;   // un solo lector por sesión: crearlo cuesta varios segundos

function cargarScript() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = RUTA + 'tesseract.min.js';
    s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el lector de recetas. Revisa tu internet la primera vez.'));
    document.head.appendChild(s);
  });
}

async function obtenerLector(alProgreso) {
  if (lector) return lector;
  await cargarScript();
  lector = window.Tesseract.createWorker('spa', 1, {
    workerPath: RUTA + 'worker.min.js', corePath: RUTA + 'core', langPath: RUTA + 'lang',
    logger: m => { if (m.status === 'recognizing text') alProgreso?.(m.progress); },
  });
  try { return await lector; } catch (e) { lector = null; throw e; }
}

// La foto del teléfono (4000 px o más) se achica; para leer texto se pasa a grises con más contraste
async function prepararImagen(archivo, ladoMax, { grises = false, tipo = 'image/png', calidad } = {}) {
  const bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  const k = Math.min(1, ladoMax / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d', { willReadFrequently: grises });
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  if (grises) {
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) { const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = y; if (y < min) min = y; if (y > max) max = y; }
    const esc = 255 / Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4) { const y = (d[i] - min) * esc; d[i] = d[i + 1] = d[i + 2] = y; }
    g.putImageData(img, 0, 0);
  }
  return new Promise(ok => c.toBlob(ok, tipo, calidad));
}

const aBase64 = blob => new Promise((ok, mal) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => mal(r.error);
  r.readAsDataURL(blob);
});

export async function leerReceta(archivo, { modo = 'telefono', alProgreso } = {}) {
  if (modo === 'nube') {
    // 1568 px en el lado largo: suficiente para leer y unos 2 400 tokens de imagen (⌈ancho/28⌉ × ⌈alto/28⌉)
    const jpg = await prepararImagen(archivo, 1568, { tipo: 'image/jpeg', calidad: 0.85 });
    const r = await leerRecetaEnNube(await aBase64(jpg), 'image/jpeg');
    return { borrador: completarBorrador(r), texto: '', modo };
  }
  const w = await obtenerLector(alProgreso);
  const img = await prepararImagen(archivo, 2000, { grises: true });
  const { data } = await w.recognize(img);
  return { borrador: interpretarTexto(data.text), texto: data.text, modo };
}

export async function cerrarLector() {
  if (!lector) return;
  const w = await lector.catch(() => null);
  lector = null;
  await w?.terminate();
}
