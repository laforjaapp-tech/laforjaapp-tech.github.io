// PASOS: caminar también es ejercicio. Calorías, distancia y meta orientativas a partir de los pasos del día.
// Los pasos llegan de dos sitios: los que cuenta LA FORJA con la app abierta y los que la persona copia de su teléfono.

// Calorías NETAS por caminar (lo que se suma a estar quieto): ≈ 0,5 kcal por kg por km en llano (ecuación del ACSM).
// Netas porque el gasto del día del plan de comidas ya incluye el reposo. Es una estimación (puede fallar un 20-30 %).
export function kcalPasos(pasos, pesoKg, estaturaCm) {
  if (!pasos || !pesoKg) return 0;
  return Math.round((0.5 * pesoKg * kmPasos(pasos, estaturaCm)) / 10) * 10;
}

// Distancia: largo del paso ≈ 41 % de la estatura
export function kmPasos(pasos, estaturaCm) {
  if (!pasos) return 0;
  const paso = (estaturaCm || 165) * 0.414 / 100;
  return Math.round((pasos * paso) / 100) / 10;
}

// Total del día: si copió el total de su teléfono, ese manda (ya incluye lo que contó la app), salvo que la app contara más
export const totalPasos = r => (!r ? 0 : Math.max(r.manual ?? 0, r.app ?? 0));

// Meta que sube poco a poco: lo que camina normalmente (mediana de 7 días, así un paseo largo no la dispara) + 500.
// Entre 2500 y 10 000 (8000 desde los 60 años, donde el beneficio ya se estabiliza). Sin datos, según su actividad diaria.
// registros: los de los 7 días anteriores. No cuentan los días con solo una prueba corta del contador (menos de 1000 pasos sin total copiado).
export const topePasos = atleta => ((atleta?.personal?.edad || 45) >= 60 ? 8000 : 10000);
export function metaPasos(atleta, registros = []) {
  const tope = topePasos(atleta);
  const ultimos = registros.filter(r => r.manual != null || (r.app || 0) >= 1000).map(totalPasos).filter(n => n > 0);
  if (ultimos.length >= 3) {
    const orden = [...ultimos].sort((a, b) => a - b), m = Math.floor(orden.length / 2);
    const mediana = orden.length % 2 ? orden[m] : (orden[m - 1] + orden[m]) / 2;
    return Math.min(tope, Math.max(2500, Math.round((mediana + 500) / 500) * 500));
  }
  return Math.min(tope, { sedentaria: 3500, ligera: 5500, activa: 7500, muy_activa: 9000 }[atleta?.habitos?.actividad] || 5000);
}

// Actividad diaria que corresponde a los pasos (Tudor-Locke): mediana de los días con registro de las últimas 2 semanas.
// Solo si hay al menos 10 días; si no, null. Sustituye a la declarada (no se suma: si no, se contaría dos veces).
const NIVELES_ACTIVIDAD = ['sedentaria', 'ligera', 'activa', 'muy_activa'];
export const NOMBRE_ACTIVIDAD = { sedentaria: 'casi todo el día sentado', ligera: 'ligera', activa: 'activa', muy_activa: 'muy activa' };
export function actividadPorPasos(registros = []) {
  const dias = registros.map(totalPasos).filter(n => n >= 1000);
  if (dias.length < 10) return null;
  const o = [...dias].sort((a, b) => a - b), m = Math.floor(o.length / 2);
  const med = o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  return med < 5000 ? 'sedentaria' : med < 7500 ? 'ligera' : med < 10000 ? 'activa' : 'muy_activa';
}
export const nivelActividad = a => NIVELES_ACTIVIDAD.indexOf(a);

// Minutos equivalentes (orientativo, ≈ 100 pasos por minuto); no cuentan como minutos de ejercicio moderado
export const minutosPasos = pasos => Math.round((pasos || 0) / 100);

// "6 420": espacio de miles (así no se confunde con decimales)
export const fmtPasos = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
