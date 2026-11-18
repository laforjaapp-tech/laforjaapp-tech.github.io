// FASE 4 — HIDRATACIÓN
// Meta ORIENTATIVA de agua: no todos necesitan lo mismo. Considera peso, actividad diaria,
// duración e intensidad del entrenamiento, calor/clima y sudoración.

export const CLIMAS = [
  { id: 'templado', etiqueta: 'Templado o fresco' },
  { id: 'calor', etiqueta: 'Caluroso o húmedo' },
];
export const SUDORACION = [
  { id: 'baja', etiqueta: 'Sudo poco' },
  { id: 'media', etiqueta: 'Normal' },
  { id: 'alta', etiqueta: 'Sudo mucho' },
];
export const BOTONES_AGUA = [250, 500, 750];

const r50 = v => Math.round(v / 50) * 50;

// entreno: { minutos, intenso } del día, o null si hoy no entrena
// indicada: { ml, maximo, por } si la puso su nutrióloga (manda sobre todo lo demás). maximo: es un límite de líquidos.
export function metaAgua(atleta, config = {}, entreno = null, indicada = null) {
  const peso = atleta.personal?.peso;
  const explicaciones = [];
  if (indicada?.ml) {
    return { ml: indicada.ml, base: indicada.ml, extras: [], maximo: indicada.maximo, por: indicada.por,
      explicaciones: [indicada.maximo
        ? `${indicada.por} te indicó un límite de ${indicada.ml} ml de líquidos al día. Cuenta todo lo que bebes (agua, café, jugos, leche, sopas) y no pases de esa cantidad, aunque entrenes o haga calor.`
        : `${indicada.por} te indicó ${indicada.ml} ml de agua al día.`] };
  }
  if (config.personalizadoMl) {
    return { ml: config.personalizadoMl, base: config.personalizadoMl, extras: [], explicaciones: ['Meta elegida por ti. Puedes volver a la meta calculada cuando quieras.'] };
  }
  // ~30 ml por kg (peso tope 90 kg: la necesidad no crece igual con la grasa corporal).
  // Referencias de agua total: IOM 3,7 L hombres y 2,7 L mujeres; las bebidas cubren ~80 %.
  const mujer = atleta.personal?.sexo === 'mujer';
  const [mn, mx] = mujer ? [1500, 2500] : [1800, 3000];
  const base = peso ? Math.min(mx, Math.max(mn, r50(Math.min(peso, 90) * 30))) : (mujer ? 1800 : 2000);
  explicaciones.push(peso ? `Base: unos 30 ml por kg de peso (${base} ml).` : `Base de referencia: ${base} ml (completa tu peso para ajustarla).`);
  const extras = [];
  const act = { activa: 250, muy_activa: 500 }[atleta.habitos?.actividad] || 0;
  if (act) extras.push({ motivo: 'Actividad diaria alta', ml: act });
  const calor = config.clima === 'calor';
  if (calor) extras.push({ motivo: 'Clima caluroso o húmedo', ml: 500 });
  if (entreno?.minutos) {
    const sudor = { baja: 0.7, media: 1, alta: 1.4 }[config.sudoracion || 'media'];
    const ml = r50((entreno.minutos / 60) * 600 * sudor * (calor ? 1.2 : 1) * (entreno.intenso ? 1.15 : 1));
    if (ml) extras.push({ motivo: `Entrenamiento de hoy (${entreno.minutos} min)`, ml });
  }
  const ml = r50(base + extras.reduce((a, e) => a + e.ml, 0));
  extras.forEach(e => explicaciones.push(`+${e.ml} ml: ${e.motivo.toLowerCase()}.`));
  explicaciones.push('Incluye agua y otras bebidas sin azúcar; las frutas, sopas y vegetales también aportan. La orina amarillo claro es buena señal (algunas vitaminas y medicamentos cambian el color).');
  explicaciones.push('Durante el entrenamiento bebe a pequeños sorbos, guiándote por la sed (unos 150–250 ml cada 15–20 minutos en sesiones largas). No hace falta pasar de alrededor de 1 litro por hora: más agua no es mejor.');
  if ((atleta.personal?.edad || 0) >= 65) explicaciones.push('Con la edad la sensación de sed disminuye: no esperes a tener sed, reparte el agua a lo largo del día.');
  const s = atleta.seguridad || {};
  if (s.cuestionario?.corazon === 'si' || (s.condiciones || []).some(c => ['cardiaca', 'otra'].includes(c)) || s.cuestionario?.cronica === 'si') {
    explicaciones.push('Si tu médico te indicó limitar los líquidos (por ejemplo por insuficiencia cardíaca o renal), sigue su indicación por encima de la meta de la app.');
  }
  return { ml, base, extras, explicaciones };
}

export function progresoAgua(consumido, meta) {
  const pct = meta ? Math.round((consumido / meta) * 100) : 0;
  return { pct, barra: barraTexto(pct) };
}

export const barraTexto = (pct, n = 10) => {
  const llenos = Math.max(0, Math.min(n, Math.round((pct / 100) * n)));
  return '█'.repeat(llenos) + '░'.repeat(n - llenos);
};

// ¿Sesión larga o intensa? → recordatorios de agua durante el entrenamiento
export const INTENSOS = ['hiit_core', 'militar', 'boxeo_cardio', 'fuerza_acondicionamiento', 'fuerza_metabolico', 'fuerza_boxeo'];
export const necesitaPausasAgua = w => !!w && ((w.duracion || 0) >= 40 || INTENSOS.includes(w.tipo));
