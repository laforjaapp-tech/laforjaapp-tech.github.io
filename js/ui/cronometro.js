// Cronómetro / cuenta atrás reutilizable (lo usarán también las fases de entrenamiento).
// Mantiene la pantalla encendida mientras corre y avisa con sonido al terminar.

let audio = null;
// Interruptores de sonido y vibración (por defecto, encendidos)
const senales = { sonido: true, vibracion: true };
export function configurarSenales(cfg = {}) { Object.assign(senales, cfg); }
export const vibrar = patron => { if (senales.vibracion && navigator.vibrate) navigator.vibrate(patron); };

export function pitido(frecuencia = 880, duracion = 0.25, veces = 1) {
  vibrar(veces > 1 ? [200, 100, 200] : 200);
  if (!senales.sonido) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < veces; i++) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = frecuencia;
      o.connect(g); g.connect(audio.destination);
      const t = audio.currentTime + i * (duracion + 0.12);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + duracion);
      o.start(t); o.stop(t + duracion);
    }
  } catch { /* sin sonido disponible */ }
}

export const formatoTiempo = seg => {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export class Cronometro {
  // modo: 'cronometro' (cuenta hacia arriba) | 'cuenta_atras'
  constructor({ modo = 'cronometro', segundos = 0, maximo = null, silencioso = false, alTic = () => {}, alTerminar = () => {} }) {
    Object.assign(this, { modo, segundos, maximo, silencioso, alTic, alTerminar });
    this.inicio = null; this.acumulado = 0; this.intervalo = null; this.bloqueo = null;
  }
  get transcurrido() {
    return this.acumulado + (this.inicio ? (Date.now() - this.inicio) / 1000 : 0);
  }
  get valor() {
    return this.modo === 'cuenta_atras' ? Math.max(0, this.segundos - this.transcurrido) : this.transcurrido;
  }
  get corriendo() { return !!this.inicio; }
  async iniciar() {
    if (this.inicio) return;
    this.inicio = Date.now();
    if (!this.silencioso) pitido(660);
    this.intervalo = setInterval(() => {
      this.alTic(this.valor);
      const fin = this.modo === 'cuenta_atras' ? this.valor <= 0 : this.maximo && this.transcurrido >= this.maximo;
      if (fin) { this.detener(); if (!this.silencioso) pitido(880, 0.3, 3); this.alTerminar(this.resultado()); }
    }, 200);
    try {
      const bloqueo = await navigator.wakeLock?.request('screen');
      if (this.inicio) this.bloqueo = bloqueo; else bloqueo?.release?.();   // si ya se detuvo mientras tanto
    } catch { /* no soportado */ }
  }
  detener() {
    if (!this.inicio) return this.resultado();
    this.acumulado = this.transcurrido; this.inicio = null;
    clearInterval(this.intervalo);
    this.bloqueo?.release?.(); this.bloqueo = null;
    this.alTic(this.valor);
    return this.resultado();
  }
  reiniciar() { this.detener(); this.acumulado = 0; this.alTic(this.valor); }
  // Segundos transcurridos (en cronómetro, limitado al máximo)
  resultado() { return Math.round(this.maximo ? Math.min(this.transcurrido, this.maximo) : this.transcurrido); }
}
