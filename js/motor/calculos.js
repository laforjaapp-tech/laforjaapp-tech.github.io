// Cálculos corporales orientativos. Nada de esto es un diagnóstico.

export function imc(peso, estaturaCm) {
  if (!peso || !estaturaCm) return null;
  const m = estaturaCm / 100;
  return Math.round((peso / (m * m)) * 10) / 10;
}

// Lectura neutra del IMC: solo como referencia, nunca como juicio de condición física
export function lecturaImc(valor) {
  if (valor == null) return '';
  if (valor < 18.5) return 'Por debajo del rango de referencia';
  if (valor < 25) return 'Dentro del rango de referencia';
  if (valor < 30) return 'Por encima del rango de referencia';
  return 'Bastante por encima del rango de referencia';
}

export const AVISO_IMC =
  'El IMC es solo un dato orientativo. No distingue músculo de grasa y no mide tu condición física: ' +
  'una persona musculada puede salir "por encima" estando en muy buena forma.';

// Rango de peso de referencia según la estatura (IMC 18,5 – 24,9)
export function rangoPesoReferencia(estaturaCm) {
  if (!estaturaCm) return null;
  const m2 = (estaturaCm / 100) ** 2;
  // exactos (minExacto/maxExacto) para convertir a libras; en kg, redondeo hacia dentro: ambos extremos quedan en el rango
  return { min: Math.ceil(18.5 * m2), max: Math.floor(24.9 * m2), minExacto: 18.5 * m2, maxExacto: 24.9 * m2 };
}

// Evolución a partir de las mediciones guardadas [{ fecha, peso }]
export function evolucionPeso(mediciones) {
  const lista = mediciones.filter(m => m.peso).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!lista.length) return null;
  const inicial = lista[0], actual = lista[lista.length - 1];
  const hace30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const base30 = lista.filter(m => m.fecha <= hace30).pop() || inicial;
  const red = v => Math.round(v * 10) / 10;
  return {
    lista, inicial, actual,
    cambioTotal: red(actual.peso - inicial.peso),
    cambio30dias: red(actual.peso - base30.peso),
    hay30: lista.some(m => m.fecha <= hace30),   // sin un dato de hace 30 días, ese cambio no se muestra
  };
}

// Ritmo en min/km a partir de minutos y metros
export function ritmo(minutos, metros) {
  if (!minutos || !metros) return null;
  const minKm = minutos / (metros / 1000);
  const min = Math.floor(minKm);
  const seg = Math.round((minKm - min) * 60);
  return `${min}:${String(seg).padStart(2, '0')} min/km`;
}

// La meta de agua se calcula en un solo sitio: metaAgua() de hidratacion.js

export const hoyISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};

export function sumarDias(fechaISO, dias) {
  const d = new Date(fechaISO + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
