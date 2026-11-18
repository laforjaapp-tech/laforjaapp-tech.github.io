// Posturas de cada ejercicio para las ilustraciones (ver ui/figura.js).
// Ángulos absolutos en grados: 0 = abajo, 90 = delante, 180 = arriba, -90 = atrás.
// t = tronco (pelvis → hombros), t2 = parte alta del tronco si la columna se curva, c = giro de la cabeza.
// Vista de lado: b/a/h = brazo/antebrazo/mano, m/p/f = muslo/pierna/pie; sufijo c = cercano, l = lejano.
// Vista de frente: sufijo d = lado derecho de la persona (izquierda de la pantalla), i = izquierdo.
// rel: los brazos se miden respecto al tronco. k… = acortar un segmento (apunta hacia quien mira).
// alto = despegue del suelo (saltos), px = desplazamiento lateral, vientre = respiración, cuerda = fase de la comba.
// ancla: lo que queda fijo (pies, manos, cadera, hombros, rodillas, pieC, rodillaL…) o "suelo" (lo más bajo toca el suelo).
// fijos: extremos que no se mueven aunque cambie la postura. elevado: el apoyo está por encima del suelo.
// estira / activa: músculos a resaltar cuando la biblioteca no los indica (estiramientos, agilidad, equilibrio).
// modo: vaivén (ida y vuelta, por defecto), ciclo (sigue en un sentido) o reinicio (vuelve al principio de golpe).

const DE_PIE = { t: 180, c: 0, bc: 3, ac: 6, bl: -3, al: 2, mc: 2, pc: 0, fc: 90, ml: -2, pl: 0, fl: 90 };
const DE_FRENTE = { t: 180, c: 0, bd: -9, ad: -5, bi: 9, ai: 5, md: -3, pd: -1, mi: 3, pi: 1 };
const p = (...partes) => Object.assign({}, ...partes);
const brazos = (b, a, d = 5) => ({ bc: b, ac: a, bl: b - d, al: a - d });
const piernas = (m, q, f = 90, d = 3) => ({ mc: m, pc: q, fc: f, ml: m - d, pl: q - d, fl: f });
const cerca = (b, a) => ({ bc: b, ac: a });
const lejos = (b, a) => ({ bl: b, al: a });
const piernaC = (m, q, f = 90) => ({ mc: m, pc: q, fc: f });
const piernaL = (m, q, f = 90) => ({ ml: m, pl: q, fl: f });
const abd = (b, a = b) => ({ bd: -b, ad: -a, bi: b, ai: a });
const abdP = (m, q = m) => ({ md: -m, pd: -q, mi: m, pi: q });
// Ejercicios quietos (planchas, estiramientos): la figura solo respira
const respira = (pose, v = 1.4) => [pose, { ...pose, vientre: v }];

// ---------- Posturas base ----------
const GUARDIA = p(DE_PIE, { t: 176, c: -4 }, piernaC(14, -8), piernaL(-16, -10, 72), cerca(30, 158), lejos(18, 166));
const PLANCHA_ALTA = p(DE_PIE, { t: 116 }, piernas(-64, -64, 26, 0), brazos(0, 0, 0));   // brazos estirados: el cuerpo sube ≈ 26°
const PLANCHA_BAJA = p(DE_PIE, { t: 103 }, piernas(-77, -77, 13, 0), brazos(0, 90, 0));
const CUADRUPEDIA = p(DE_PIE, { t: 110, c: 0 }, brazos(0, 0, 0), piernaC(0, -90, -90), piernaL(-2, -92, -90));
const TUMBADO = p(DE_PIE, { t: -90, c: 0 }, brazos(88, 90, 2), piernas(90, 90, 180, 2));
const BOCA_ABAJO = p(DE_PIE, { t: 92, c: 0 }, brazos(95, 95, 2), piernas(-90, -90, -90, 2));
const SENTADILLA_ABAJO = p(DE_PIE, { t: 140 }, piernas(86, -30));
const ZANCADA_ABAJO = p(DE_PIE, piernaC(80, -8), piernaL(-10, -95, 32));
const CAMINA_A = p(DE_PIE, piernaC(22, 6, 100), piernaL(-18, -32, 62), cerca(-18, -10), lejos(18, 30));
const CAMINA_B = p(DE_PIE, piernaC(-18, -32, 62), piernaL(22, 6, 100), cerca(18, 30), lejos(-18, -10));
const CAMINA_RAPIDO_A = p(DE_PIE, { t: 176 }, piernaC(28, 8, 100), piernaL(-22, -40, 58), cerca(-30, 52), lejos(32, 112));
const CAMINA_RAPIDO_B = p(DE_PIE, { t: 176 }, piernaC(-22, -40, 58), piernaL(28, 8, 100), cerca(32, 112), lejos(-30, 52));
const TROTE_A = p(DE_PIE, { t: 172, alto: 2 }, piernaC(32, -16, 96), piernaL(-22, -72, 40), cerca(-28, 56), lejos(26, 118));
const TROTE_B = p(DE_PIE, { t: 172, alto: 2 }, piernaC(-22, -72, 40), piernaL(32, -16, 96), cerca(26, 118), lejos(-28, 56));
const BOXEO_JAB = p(GUARDIA, { t: 174 }, cerca(88, 90));
const BOXEO_CROSS = p(GUARDIA, { t: 168 }, lejos(86, 88), piernaL(-18, -14, 52));
const caminar = (extra = {}, rapido = false) => ({ ancla: 'suelo', ritmo: 'paso', ...extra, poses: rapido ? [CAMINA_RAPIDO_A, CAMINA_RAPIDO_B] : [CAMINA_A, CAMINA_B] });

export const POSES = {
  // ===================== FUERZA: RODILLA DOMINANTE =====================
  sentadilla_silla: { ancla: 'pies', material: [{ tipo: 'silla', pose: 1 }], poses: [
    p(DE_PIE, { rel: true, kac: 0.6, kal: 0.6 }, cerca(14, 100), lejos(10, 96)),
    p(DE_PIE, { t: 148, rel: true, kac: 0.6, kal: 0.6 }, piernas(84, -12), cerca(14, 100), lejos(10, 96)),
  ] },
  sentadilla_corporal: { ancla: 'pies', poses: [p(DE_PIE, brazos(10, 14)), p(SENTADILLA_ABAJO, brazos(86, 88))] },
  sentadilla_pausa: { ancla: 'pies', pausas: [1, 4], poses: [p(DE_PIE, brazos(10, 14)), p(SENTADILLA_ABAJO, brazos(86, 88))] },
  sentadilla_goblet: { ancla: 'pies', material: [{ tipo: 'goblet' }], poses: [
    p(DE_PIE, { rel: true }, brazos(18, 165, 3)),
    p(SENTADILLA_ABAJO, { t: 144, rel: true }, brazos(18, 165, 3)),
  ] },
  sentadilla_barra: { ancla: 'pies', material: [{ tipo: 'barra', en: 'espalda' }], poses: [
    p(DE_PIE, { rel: true }, brazos(-48, 172, 3)),
    p(SENTADILLA_ABAJO, { t: 138, c: 8, rel: true }, brazos(-48, 172, 3)),
  ] },
  sentadilla_bulgara: { ancla: 'pieC', fijos: ['pieL'], material: [{ tipo: 'banco', bajo: ['pieL'], ancho: 44, dx: -10 }], poses: [
    p(DE_PIE, { t: 174 }, piernaC(8, 0), piernaL(-48, -102, -150), brazos(4, 8)),
    p(DE_PIE, { t: 166 }, piernaC(72, -14), piernaL(-14, -104, -150), brazos(10, 16)),
  ] },
  step_up: { ancla: 'pieC', material: [{ tipo: 'escalon', bajo: ['pieC'], pose: 0 }], poses: [
    p(DE_PIE, { t: 166 }, piernaC(62, -8), piernaL(-6, 0), cerca(-16, -8), lejos(16, 28)),
    p(DE_PIE, { t: 179 }, piernaC(2, 0), piernaL(26, -18, 80), cerca(14, 26), lejos(-14, -6)),
  ] },
  zancada_estatica: { ancla: 'pieC', fijos: ['pieL'], poses: [
    p(DE_PIE, piernaC(22, -2), piernaL(-26, -42, 40), brazos(6, 10)),
    p(ZANCADA_ABAJO, brazos(6, 10)),
  ] },
  zancada_atras: { ancla: 'pieC', poses: [p(DE_PIE, brazos(8, 12)), p(ZANCADA_ABAJO, cerca(-14, -8), lejos(16, 26))] },
  zancada_caminando: { ancla: 'pieC', poses: [p(DE_PIE, brazos(8, 12)), p(ZANCADA_ABAJO, { t: 178 }, cerca(-18, -6), lejos(20, 34))] },
  zancada_mancuernas: { ancla: 'pieC', material: [{ tipo: 'mancuernas' }], poses: [p(DE_PIE, brazos(0, 0, 2)), p(ZANCADA_ABAJO, brazos(0, 0, 2))] },
  prensa_piernas: { ancla: 'cadera', material: [{ tipo: 'asiento', respaldo: 214 }, { tipo: 'placa', ang: 128 }], poses: [
    p(DE_PIE, { t: 214, c: -18 }, piernas(162, 74, 196, 4), brazos(22, 40)),
    p(DE_PIE, { t: 214, c: -18 }, piernas(128, 128, 218, 4), brazos(22, 40)),
  ] },
  elevacion_talones: { ancla: 'suelo', pausas: [1, 2], poses: [p(DE_PIE, brazos(6, 10)), p(DE_PIE, brazos(6, 10), { fc: 48, fl: 48 })] },

  // ===================== BISAGRA DE CADERA =====================
  puente_gluteo: { ancla: 'hombros', fijos: ['pies'], material: [{ tipo: 'colchoneta' }], poses: [
    p(TUMBADO, piernas(136, -8, 90, 4)),
    p(TUMBADO, { t: -62, c: -28 }, piernas(102, -6, 90, 4)),
  ] },
  puente_una_pierna: { ancla: 'hombros', fijos: ['pieC'], material: [{ tipo: 'colchoneta' }], poses: [
    p(TUMBADO, piernaC(136, -8), piernaL(132, 132, 222)),
    p(TUMBADO, { t: -62, c: -28 }, piernaC(102, -6), piernaL(100, 100, 190)),
  ] },
  hip_thrust: { ancla: 'hombros', fijos: ['pies'], material: [{ tipo: 'banco', punto: 'hombros', dy: 9, desde: -38, hasta: 6 }], poses: [
    p(DE_PIE, { t: -142, c: 20 }, piernas(122, -2, 90, 4), brazos(-96, -70, 2)),
    p(DE_PIE, { t: -94, c: 0 }, piernas(92, -4, 90, 4), brazos(-96, -70, 2)),
  ] },
  peso_muerto_rumano: { ancla: 'pies', material: [{ tipo: 'mancuernas' }], poses: [
    p(DE_PIE, brazos(0, 0, 2)),
    p(DE_PIE, { t: 102, c: 10 }, piernas(14, -4), brazos(0, 0, 2)),
  ] },
  bisagra_palo: { ancla: 'pies', material: [{ tipo: 'palo' }], poses: [
    p(DE_PIE, { rel: true }, cerca(196, -24), lejos(-34, 64)),
    p(DE_PIE, { t: 108, c: 10, rel: true }, piernas(14, -4), cerca(196, -24), lejos(-34, 64)),
  ] },
  peso_muerto_mochila: { ancla: 'pies', material: [{ tipo: 'mochila_mano' }], poses: [
    p(DE_PIE, brazos(2, 2, 1)),
    p(DE_PIE, { t: 104, c: 10 }, piernas(14, -4), brazos(2, 2, 1)),
  ] },
  peso_muerto_barra: { ancla: 'pies', material: [{ tipo: 'barra', radio: 16 }], poses: [
    p(DE_PIE, { t: 128, c: 16 }, piernas(62, -24), brazos(0, 0, 1)),
    p(DE_PIE, brazos(0, 0, 1)),
  ] },
  kettlebell_swing: { ancla: 'pies', material: [{ tipo: 'kettlebells', dos: true }], poses: [
    p(DE_PIE, { t: 116, c: 14 }, piernas(24, -8), brazos(-22, -24, 1)),
    p(DE_PIE, brazos(88, 90, 1)),
  ] },
  buenos_dias_banda: { ancla: 'pies', material: [{ tipo: 'banda', desde: 'pieC', hasta: 'manos' }], poses: [
    p(DE_PIE, { rel: true }, brazos(26, 160, 3)),
    p(DE_PIE, { t: 106, c: 10, rel: true }, piernas(12, -4), brazos(26, 160, 3)),
  ] },

  // ===================== EMPUJE =====================
  flexion_pared: { ancla: 'pies', fijos: ['manos'], material: [{ tipo: 'pared', punto: 'manos' }], poses: [
    p(DE_PIE, { t: 158 }, piernas(-22, -22, 90, 0), brazos(84, 84, 0)),
    p(DE_PIE, { t: 146 }, piernas(-34, -34, 90, 0), brazos(-20, 110, 0)),
  ] },
  flexion_inclinada: { ancla: 'pies', fijos: ['manos'], material: [{ tipo: 'banco', punto: 'manos', dy: 3, desde: -8, hasta: 26 }], poses: [
    p(DE_PIE, { t: 126 }, piernas(-54, -54, 36, 0), brazos(8, 8, 0)),
    p(DE_PIE, { t: 116 }, piernas(-64, -64, 26, 0), brazos(-50, 50, 0)),
  ] },
  flexion_rodillas: { ancla: 'rodillas', fijos: ['manos'], material: [{ tipo: 'colchoneta' }], poses: [
    p(DE_PIE, { t: 131 }, piernas(-49, -128, -130, 0), brazos(0, 0, 0)),
    p(DE_PIE, { t: 102 }, piernas(-78, -134, -136, 0), brazos(-105, 12, 0)),
  ] },
  flexion: { ancla: 'pies', fijos: ['manos'], poses: [PLANCHA_ALTA, p(PLANCHA_ALTA, { t: 97 }, piernas(-83, -83, 7, 0), brazos(-105, 12, 0))] },
  flexion_pausa: { ancla: 'pies', fijos: ['manos'], pausas: [1, 4], poses: [PLANCHA_ALTA, p(PLANCHA_ALTA, { t: 97 }, piernas(-83, -83, 7, 0), brazos(-105, 12, 0))] },
  flexion_declinada: { ancla: 'manos', fijos: ['pies'], material: [{ tipo: 'banco', bajo: ['pie'], ancho: 40 }], poses: [
    p(PLANCHA_ALTA, { t: 80 }, piernas(-100, -100, -10, 0)),
    p(PLANCHA_ALTA, { t: 72 }, piernas(-108, -108, -18, 0), brazos(-105, 12, 0)),
  ] },
  flexion_diamante: { ancla: 'pies', fijos: ['manos'], poses: [PLANCHA_ALTA, p(PLANCHA_ALTA, { t: 98 }, piernas(-82, -82, 8, 0), brazos(-110, 10, 0))] },
  press_pecho_banda: { ancla: 'pies', material: [{ tipo: 'banda', desde: { pose: 0, punto: 'hombros', d: [-40, 4] }, hasta: 'manos', capa: 'atras' }], poses: [
    p(DE_PIE, piernaC(14, 0), piernaL(-14, 0), brazos(-84, 92, 3)),
    p(DE_PIE, piernaC(14, 0), piernaL(-14, 0), brazos(86, 88, 3)),
  ] },
  press_banca_mancuernas: { ancla: 'cadera', material: [{ tipo: 'banco', bajo: ['tronco'] }, { tipo: 'mancuernas' }], poses: [
    p(DE_PIE, { t: -90 }, piernas(78, -4), brazos(180, 180, 3)),
    p(DE_PIE, { t: -90 }, piernas(78, -4), brazos(62, 178, 3)),
  ] },
  press_banca_barra: { ancla: 'cadera', material: [{ tipo: 'banco', bajo: ['tronco'] }, { tipo: 'barra', radio: 14 }], poses: [
    p(DE_PIE, { t: -90 }, piernas(78, -4), brazos(180, 180, 2)),
    p(DE_PIE, { t: -90 }, piernas(78, -4), brazos(66, 176, 2)),
  ] },
  press_pecho_maquina: { ancla: 'cadera', material: [{ tipo: 'asiento', respaldo: 186 }, { tipo: 'manillas' }], poses: [
    p(DE_PIE, { t: 186 }, piernas(88, 2), brazos(-80, 92, 3)),
    p(DE_PIE, { t: 186 }, piernas(88, 2), brazos(86, 88, 3)),
  ] },
  press_hombro_banda: { ancla: 'pies', material: [{ tipo: 'banda', desde: 'pieC', hasta: 'manos' }], poses: [
    p(DE_PIE, brazos(28, 172, 3)),
    p(DE_PIE, brazos(176, 178, 3)),
  ] },
  press_hombro_mancuernas: { ancla: 'pies', material: [{ tipo: 'mancuernas' }], poses: [
    p(DE_PIE, brazos(28, 172, 3)),
    p(DE_PIE, brazos(176, 178, 3)),
  ] },
  pike_pushup: { ancla: 'pies', fijos: ['manos'], poses: [
    p(DE_PIE, { t: 36, c: 0 }, piernas(-32, -32, 58, 0), brazos(22, 22, 0)),
    p(DE_PIE, { t: 26, c: 0 }, piernas(-38, -38, 52, 0), brazos(-30, 60, 0)),
  ] },
  elevaciones_laterales: { vista: 'frente', ancla: 'pies', material: [{ tipo: 'mancuernas' }], poses: [
    p(DE_FRENTE, abd(10, 12)),
    p(DE_FRENTE, abd(86, 94)),
  ] },
  fondos_banco: { ancla: 'manos', fijos: ['pies'], material: [{ tipo: 'banco', punto: 'manos', dy: 3, desde: -36, hasta: 6 }], poses: [
    p(DE_PIE, { t: 182 }, piernas(84, 24, 130, 2), brazos(-10, -6, 2)),
    p(DE_PIE, { t: 180 }, piernas(70, 40, 130, 2), brazos(-82, -2, 2)),
  ] },
  fondos_paralelas: { ancla: 'manos', elevado: 26, material: [{ tipo: 'paralelas' }], poses: [
    p(DE_PIE, { t: 178 }, brazos(2, 2, 1), piernas(8, -58, 36)),
    p(DE_PIE, { t: 160 }, brazos(-76, 0, 1), piernas(14, -56, 36)),
  ] },
  extension_triceps: { ancla: 'pies', material: [{ tipo: 'mancuerna', lado: 'C' }], poses: [
    p(DE_PIE, brazos(176, -12, 2)),
    p(DE_PIE, brazos(176, 176, 2)),
  ] },

  // ===================== TRACCIÓN =====================
  ytw_suelo: { ancla: 'cadera', material: [{ tipo: 'colchoneta' }], poses: [
    BOCA_ABAJO,
    p(BOCA_ABAJO, { t: 97, c: 6 }, brazos(112, 114, 2)),
  ] },
  remo_banda: { ancla: 'pies', material: [{ tipo: 'banda', desde: { pose: 0, punto: 'manos', d: [46, 0] }, hasta: 'manos' }], poses: [
    p(DE_PIE, { t: 174 }, piernas(16, -10), brazos(86, 88, 3)),
    p(DE_PIE, { t: 176 }, piernas(16, -10), brazos(-62, 80, 3)),
  ] },
  remo_mancuerna: { ancla: 'pieC', material: [{ tipo: 'banco', bajo: ['piernaL', 'manoL'] }, { tipo: 'mancuerna', lado: 'C' }], poses: [
    p(DE_PIE, { t: 116, c: 18 }, piernaC(-4, 0), piernaL(0, -92, -90), cerca(0, 0), lejos(0, 0)),
    p(DE_PIE, { t: 116, c: 18 }, piernaC(-4, 0), piernaL(0, -92, -90), cerca(-150, 2), lejos(0, 0)),
  ] },
  remo_invertido_mesa: { ancla: 'pies', fijos: ['manos'], material: [{ tipo: 'mesa' }], poses: [
    p(DE_PIE, { t: -98, c: 0 }, piernas(82, 82, 172, 0), brazos(180, 180, 0)),
    p(DE_PIE, { t: -110, c: 10 }, piernas(70, 70, 160, 0), brazos(-40, 170, 0)),
  ] },
  remo_invertido_barra: { ancla: 'pies', fijos: ['manos'], material: [{ tipo: 'barra_fija' }], poses: [
    p(DE_PIE, { t: -104, c: 0 }, piernas(76, 76, 166, 0), brazos(180, 180, 0)),
    p(DE_PIE, { t: -118, c: 10 }, piernas(62, 62, 152, 0), brazos(-40, 170, 0)),
  ] },
  remo_maquina: { ancla: 'cadera', material: [{ tipo: 'asiento' }, { tipo: 'cable', desde: { pose: 0, punto: 'manos', d: [48, 6] }, hasta: 'manos' }], poses: [
    p(DE_PIE, piernas(84, 72, 170), brazos(88, 90, 3)),
    p(DE_PIE, { t: 184 }, piernas(84, 72, 170), brazos(-42, 88, 3)),
  ] },
  face_pull_banda: { ancla: 'pies', material: [{ tipo: 'banda', desde: { pose: 0, punto: 'manos', d: [46, -6] }, hasta: 'manos' }], poses: [
    p(DE_PIE, brazos(92, 94, 3)),
    p(DE_PIE, brazos(-115, 165, 3)),
  ] },
  jalon_banda: { ancla: 'pies', material: [{ tipo: 'banda', desde: { pose: 0, punto: 'manos', d: [10, -40] }, hasta: 'manos' }], encuadre: { arriba: 30 }, poses: [
    p(DE_PIE, brazos(165, 168, 3)),
    p(DE_PIE, brazos(-12, 172, 3)),
  ] },
  jalon_maquina: { ancla: 'cadera', material: [{ tipo: 'asiento' }, { tipo: 'cable', desde: { pose: 0, punto: 'manos', d: [4, -30] }, hasta: 'manos', columna: false }], encuadre: { arriba: 24 }, poses: [
    p(DE_PIE, { t: 184 }, piernas(86, 4), brazos(174, 176, 3)),
    p(DE_PIE, { t: 188 }, piernas(86, 4), brazos(-12, 168, 3)),
  ] },
  colgado_activo: { ancla: 'manos', elevado: 24, ritmo: 'lento', material: [{ tipo: 'barra_fija' }], poses: [
    p(DE_PIE, brazos(178, 178, 2), piernas(2, -6)),
    p(DE_PIE, brazos(178, 178, 2), piernas(2, -6), { kbc: 0.9, kbl: 0.9 }),
  ] },
  dominada_negativa: { ancla: 'manos', elevado: 24, tiempos: [2.6, 0.9], material: [{ tipo: 'barra_fija' }], poses: [
    p(DE_PIE, brazos(14, 172, 4), piernas(10, -16)),
    p(DE_PIE, brazos(178, 178, 2), piernas(4, -10)),
  ] },
  dominada_asistida: { ancla: 'manos', elevado: 24, material: [{ tipo: 'barra_fija' }, { tipo: 'banda', desde: 'manos', hasta: 'pieC' }], poses: [
    p(DE_PIE, brazos(178, 178, 2), piernas(4, -10)),
    p(DE_PIE, brazos(14, 172, 4), piernas(10, -16)),
  ] },
  dominada: { ancla: 'manos', elevado: 24, material: [{ tipo: 'barra_fija' }], poses: [
    p(DE_PIE, brazos(178, 178, 2), piernas(4, -10)),
    p(DE_PIE, brazos(14, 172, 4), piernas(10, -16)),
  ] },
  dominada_lastrada: { ancla: 'manos', elevado: 30, material: [{ tipo: 'barra_fija' }, { tipo: 'peso_cinturon' }], poses: [
    p(DE_PIE, brazos(178, 178, 2), piernas(4, -10)),
    p(DE_PIE, brazos(14, 172, 4), piernas(10, -16)),
  ] },
  curl_biceps: { ancla: 'pies', material: [{ tipo: 'mancuernas' }], poses: [p(DE_PIE, brazos(2, 4, 2)), p(DE_PIE, brazos(6, 150, 2))] },

  // ===================== CORE =====================
  plancha_inclinada: { ancla: 'pies', ritmo: 'lento', material: [{ tipo: 'banco', punto: 'manos', dy: 3, desde: -8, hasta: 26 }], poses: respira(p(DE_PIE, { t: 126 }, piernas(-54, -54, 36, 0), brazos(8, 8, 0))) },
  plancha_rodillas: { ancla: 'rodillas', ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: respira(p(DE_PIE, { t: 110 }, piernas(-70, -92, -90, 0), brazos(0, 90, 0))) },
  plancha: { ancla: 'pies', ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: respira(PLANCHA_BAJA) },
  plancha_toques: { ancla: 'pies', fijos: ['manoL'], material: [{ tipo: 'colchoneta' }], poses: [PLANCHA_ALTA, p(PLANCHA_ALTA, cerca(40, -118))] },
  plancha_lateral_rodillas: { vista: 'frente', ancla: 'suelo', ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: respira(
    p(DE_FRENTE, { t: 250, c: 0, bd: 0, ad: 0, kad: 0.3, bi: 178, ai: 180, md: 70, pd: 245, mi: 70, pi: 245 })) },
  plancha_lateral: { vista: 'frente', ancla: 'suelo', ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: respira(
    p(DE_FRENTE, { t: 252, c: 0, bd: 0, ad: 0, kad: 0.3, bi: 178, ai: 180, md: 72, pd: 72, mi: 72, pi: 72 })) },
  dead_bug: { ancla: 'cadera', material: [{ tipo: 'colchoneta' }], poses: [
    p(TUMBADO, brazos(180, 180, 0), piernas(180, 90, 180, 0)),
    p(TUMBADO, cerca(180, 180), lejos(-96, -96), piernaC(98, 98, 188), piernaL(180, 90, 180)),
  ] },
  bird_dog: { ancla: 'cadera', material: [{ tipo: 'colchoneta' }], poses: [CUADRUPEDIA, p(CUADRUPEDIA, { t: 102 }, cerca(92, 92), piernaL(-92, -92, -90))] },
  hollow_hold: { ancla: 'cadera', ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: respira(p(TUMBADO, { t: -110, c: 12 }, piernas(106, 106, 196, 0), brazos(-114, -114, 0)), 0.8) },
  pallof_banda: { vista: 'frente', ancla: 'pies', material: [{ tipo: 'banda', desde: { pose: 0, punto: 'manos', d: [-64, 0] }, hasta: 'manos' }], encuadre: { izq: 20 }, poses: [
    p(DE_FRENTE, abdP(9), { bd: -14, ad: 118, bi: 14, ai: -118 }),
    p(DE_FRENTE, abdP(9), { bd: 8, ad: 30, bi: -8, ai: -30, kbd: 0.45, kad: 0.5, kbi: 0.45, kai: 0.5 }),
  ] },
  elevacion_rodillas_colgado: { ancla: 'manos', elevado: 30, material: [{ tipo: 'barra_fija' }], poses: [
    p(DE_PIE, brazos(178, 178, 2), piernas(4, -6)),
    p(DE_PIE, { t: 172 }, brazos(178, 178, 2), piernas(96, 6, 100)),
  ] },
  elevacion_piernas_colgado: { ancla: 'manos', elevado: 30, material: [{ tipo: 'barra_fija' }], poses: [
    p(DE_PIE, brazos(178, 178, 2), piernas(4, -6)),
    p(DE_PIE, { t: 166 }, brazos(178, 178, 2), piernas(92, 92, 182)),
  ] },

  // ===================== CARDIO =====================
  caminata: caminar(),
  caminata_rapida: caminar({}, true),
  caminata_inclinada: { ancla: 'suelo', ritmo: 'paso', material: [{ tipo: 'caminadora' }], poses: [p(CAMINA_A, { t: 172 }), p(CAMINA_B, { t: 172 })] },
  marcha_sitio: { ancla: 'suelo', ritmo: 'paso', poses: [
    p(DE_PIE, piernaC(70, -6, 80), piernaL(-2, 0), cerca(-22, 0), lejos(26, 70)),
    p(DE_PIE, piernaC(2, 0), piernaL(70, -6, 80), cerca(26, 70), lejos(-22, 0)),
  ] },
  bicicleta: { ancla: 'cadera', modo: 'ciclo', ritmo: 'paso', material: [{ tipo: 'bici' }], poses: [
    p(DE_PIE, { t: 156 }, brazos(56, 76, 2), piernaC(38, 6, 96), piernaL(88, -22, 80)),
    p(DE_PIE, { t: 156 }, brazos(56, 76, 2), piernaC(52, -34, 70), piernaL(70, 22, 100)),
    p(DE_PIE, { t: 156 }, brazos(56, 76, 2), piernaC(88, -22, 80), piernaL(38, 6, 96)),
    p(DE_PIE, { t: 156 }, brazos(56, 76, 2), piernaC(70, 22, 100), piernaL(52, -34, 70)),
  ] },
  step_aerobico: { ancla: 'pieC', ritmo: 'paso', material: [{ tipo: 'escalon', bajo: ['pieC'], pose: 0 }], poses: [
    p(DE_PIE, { t: 170 }, piernaC(60, -8), piernaL(-6, 0), cerca(-20, 40), lejos(24, 100)),
    p(DE_PIE, { t: 179 }, piernaC(2, 0), piernaL(30, -24, 80), cerca(24, 100), lejos(-20, 40)),
  ] },
  trote_suave: { ancla: 'suelo', ritmo: 'rapido', poses: [TROTE_A, TROTE_B] },
  carrera_continua: { ancla: 'suelo', ritmo: 'rapido', poses: [
    p(TROTE_A, { t: 168, alto: 5 }, piernaC(46, -12, 96), piernaL(-28, -96, 30), cerca(-36, 50), lejos(36, 124)),
    p(TROTE_B, { t: 168, alto: 5 }, piernaC(-28, -96, 30), piernaL(46, -12, 96), cerca(36, 124), lejos(-36, 50)),
  ] },
  saltar_cuerda: { ancla: 'suelo', ritmo: 'rapido', material: [{ tipo: 'cuerda' }], encuadre: { arriba: 28 }, poses: [
    p(DE_PIE, brazos(20, 72, 2), { fc: 62, fl: 62, cuerda: 0 }),
    p(DE_PIE, brazos(20, 72, 2), { fc: 50, fl: 50, cuerda: 1, alto: 6 }),
  ] },
  jumping_jack_bajo: { vista: 'frente', ancla: 'suelo', ritmo: 'paso', poses: [
    p(DE_FRENTE),
    p(DE_FRENTE, abd(150, 162), { md: -22, pd: -22 }),
  ] },
  jumping_jack: { vista: 'frente', ancla: 'suelo', ritmo: 'rapido', poses: [
    p(DE_FRENTE),
    p(DE_FRENTE, abd(155, 165), abdP(18, 16), { alto: 6 }),
  ] },

  // ===================== HIIT Y ACONDICIONAMIENTO =====================
  mountain_climber_inclinado: { ancla: 'manos', ritmo: 'rapido', material: [{ tipo: 'banco', punto: 'manos', dy: 3, desde: -8, hasta: 26 }], poses: [
    p(DE_PIE, { t: 126 }, brazos(8, 8, 0), piernaC(72, -36, 40), piernaL(-54, -54, 36)),
    p(DE_PIE, { t: 126 }, brazos(8, 8, 0), piernaC(-54, -54, 36), piernaL(72, -36, 40)),
  ] },
  mountain_climber: { ancla: 'manos', ritmo: 'rapido', poses: [
    p(PLANCHA_ALTA, piernaC(56, -50, 30), piernaL(-64, -64, 26)),
    p(PLANCHA_ALTA, piernaC(-64, -64, 26), piernaL(56, -50, 30)),
  ] },
  burpee_sin_salto: { ancla: 'suelo', poses: [
    p(DE_PIE, brazos(6, 10)),
    p(DE_PIE, { t: 118, c: 10 }, piernas(76, -40), brazos(4, 4, 0)),
    p(PLANCHA_ALTA, { px: -12 }),
  ] },
  burpee: { ancla: 'suelo', modo: 'ciclo', tiempos: [0.8, 0.6, 0.6, 0.8, 0.8], poses: [
    p(DE_PIE, brazos(6, 10)),
    p(DE_PIE, { t: 118, c: 10 }, piernas(76, -40), brazos(4, 4, 0)),
    p(PLANCHA_ALTA, { px: -12 }),
    p(DE_PIE, { t: 118, c: 10 }, piernas(76, -40), brazos(4, 4, 0)),
    p(DE_PIE, brazos(168, 172, 3), { fc: 52, fl: 52, alto: 12 }),
  ] },
  sentadilla_salto: { ancla: 'suelo', poses: [
    p(SENTADILLA_ABAJO, { t: 142 }, brazos(-30, -20)),
    p(DE_PIE, brazos(160, 170, 3), { fc: 50, fl: 50, alto: 14 }),
  ] },
  skater_bajo: { vista: 'frente', ancla: 'suelo', ritmo: 'paso', poses: [
    p(DE_FRENTE, { t: 186, px: -16, md: -4, pd: -2, kmd: 0.84, mi: -26, pi: -28, kmi: 0.95, bd: 34, ad: 46, bi: 40, ai: 52 }),
    p(DE_FRENTE, { t: 174, px: 16, mi: 4, pi: 2, kmi: 0.84, md: 26, pd: 28, kmd: 0.95, bd: -40, ad: -52, bi: -34, ai: -46 }),
  ] },
  golpes_al_aire: { ancla: 'suelo', ritmo: 'rapido', poses: [BOXEO_JAB, p(GUARDIA, { t: 172 }, lejos(86, 88))] },
  paseo_granjero: { ancla: 'suelo', ritmo: 'paso', material: [{ tipo: 'bolsas' }], poses: [p(CAMINA_A, brazos(0, 0, 1)), p(CAMINA_B, brazos(0, 0, 1))] },
  cargar_maleta: { vista: 'frente', ancla: 'suelo', ritmo: 'paso', material: [{ tipo: 'bolsas', lado: 'D' }], poses: [
    p(DE_FRENTE, { bd: -4, ad: -3, bi: 22, ai: 26, kmd: 0.9, kpd: 1 }),
    p(DE_FRENTE, { bd: -4, ad: -3, bi: 22, ai: 26, kmi: 0.9 }),
  ] },
  levantarse_suelo: { ancla: 'suelo', poses: [
    p(DE_PIE, { t: 172 }, piernas(90, 90, 180, 0), brazos(-24, -14, 2)),
    p(DE_PIE, { px: 8 }, piernaC(88, -2), piernaL(-2, -92, -90), brazos(30, 40)),
    p(DE_PIE, { px: 14 }, brazos(6, 10)),
  ] },
  gateo_oso: { ancla: 'suelo', ritmo: 'paso', poses: [
    p(DE_PIE, { t: 100, c: 14 }, cerca(14, 14), lejos(-8, -8), piernaC(14, -54, 40), piernaL(36, -40, 50)),
    p(DE_PIE, { t: 100, c: 14 }, cerca(-8, -8), lejos(14, 14), piernaC(36, -40, 50), piernaL(14, -54, 40)),
  ] },
  cuadrupedia_baja: { ancla: 'suelo', ritmo: 'lento', poses: respira(p(DE_PIE, { t: 100, c: 14 }, brazos(2, 2, 0), piernas(26, -48, 44, 2)), 0.8) },
  turkish_getup_parcial: { ancla: 'cadera', material: [{ tipo: 'colchoneta' }, { tipo: 'kettlebell', lado: 'C' }], poses: [
    p(TUMBADO, cerca(180, 180), lejos(-96, -96), piernaC(138, -10), piernaL(90, 90, 180)),
    p(TUMBADO, { t: -126, c: 10 }, cerca(180, 180), lejos(-20, -90), piernaC(138, -10), piernaL(90, 90, 180)),
    p(TUMBADO, { t: -150, c: 16 }, cerca(180, 180), lejos(-34, -34), piernaC(138, -10), piernaL(90, 90, 180)),
  ] },

  // ===================== AGILIDAD Y EQUILIBRIO =====================
  pasos_laterales: { vista: 'frente', ancla: 'suelo', ritmo: 'paso', poses: [
    p(DE_FRENTE, { t: 180, kmd: 0.86, kmi: 0.86 }, abdP(7, 6), abd(18, 12)),
    p(DE_FRENTE, { t: 180, kmd: 0.86, kmi: 0.86, px: 18 }, abdP(22, 20), abd(18, 12)),
  ] },
  cambio_direccion_caminando: caminar({ activa: ['cuadriceps', 'gluteos', 'pantorrillas'], material: [{ tipo: 'conos' }] }),
  cambio_direccion_trote: { ancla: 'suelo', ritmo: 'rapido', material: [{ tipo: 'conos' }], poses: [TROTE_A, TROTE_B] },
  escalera_imaginaria: { ancla: 'suelo', ritmo: 'rapido', material: [{ tipo: 'escalera' }], poses: [
    p(DE_PIE, { t: 172 }, piernaC(46, -22, 80), piernaL(-6, -10, 70), cerca(-24, 56), lejos(26, 116)),
    p(DE_PIE, { t: 172 }, piernaC(-6, -10, 70), piernaL(46, -22, 80), cerca(26, 116), lejos(-24, 56)),
  ] },
  reaccion_senal: { activa: ['cuadriceps', 'gluteos', 'pantorrillas'], ancla: 'suelo', pausas: [3, 1], poses: [
    p(DE_PIE, { t: 152, c: 10 }, piernas(40, -26), brazos(18, 84)),
    p(DE_PIE, { t: 140, c: 14, px: 12 }, piernaC(76, -24, 80), piernaL(-30, -42, 48), cerca(-44, 30), lejos(58, 122)),
  ] },
  toque_cruzado: { activa: ['core'], vista: 'frente', ancla: 'suelo', ritmo: 'paso', poses: [
    p(DE_FRENTE, { mi: 6, pi: 2, kmi: 0.38, bd: 26, ad: 52, bi: 34, ai: 30 }),
    p(DE_FRENTE, { md: -6, pd: -2, kmd: 0.38, bi: -26, ai: -52, bd: -34, ad: -30 }),
  ] },
  equilibrio_una_pierna: { ancla: 'pieC', ritmo: 'lento', poses: [
    p(DE_PIE, piernaL(76, -6, 70), brazos(22, 34)),
    p(DE_PIE, { t: 177 }, piernaL(72, -10, 66), brazos(30, 40)),
  ] },
  caminar_linea: { activa: ['pantorrillas', 'core'], ancla: 'suelo', ritmo: 'lento', material: [{ tipo: 'linea' }], poses: [
    p(DE_PIE, piernaC(12, 4, 96), piernaL(-10, -14, 76), brazos(34, 44)),
    p(DE_PIE, piernaC(-10, -14, 76), piernaL(12, 4, 96), brazos(34, 44)),
  ] },
  equilibrio_bordillo: { activa: ['pantorrillas', 'gluteos', 'core'], ancla: 'suelo', elevado: 12, ritmo: 'lento', material: [{ tipo: 'bordillo' }], poses: [
    p(DE_PIE, piernaC(14, 2, 96), piernaL(-12, -18, 74), brazos(30, 40)),
    p(DE_PIE, piernaC(-12, -18, 74), piernaL(14, 2, 96), brazos(30, 40)),
  ] },

  // ===================== PARKOUR =====================
  aterrizaje_suave: { ancla: 'suelo', poses: [
    p(DE_PIE, brazos(150, 160, 3), { fc: 56, fl: 56 }),
    p(DE_PIE, { t: 146, c: 8 }, piernas(62, -28), brazos(70, 80)),
  ] },
  salto_pequeno_aterrizaje: { ancla: 'suelo', modo: 'ciclo', tiempos: [0.7, 0.6, 1], poses: [
    p(DE_PIE, { t: 150, c: 8 }, piernas(48, -26), brazos(-40, -30)),
    p(DE_PIE, brazos(150, 160, 3), { fc: 50, fl: 50, alto: 14 }),
    p(DE_PIE, { t: 146, c: 8 }, piernas(62, -28), brazos(70, 80)),
  ] },
  salto_precision: { ancla: 'suelo', modo: 'reinicio', material: [{ tipo: 'marcas' }], encuadre: { der: 20 }, poses: [
    p(DE_PIE, { t: 148, c: 8 }, piernas(50, -26), brazos(-40, -30)),
    p(DE_PIE, { t: 168, px: 22, alto: 16 }, piernas(30, -40, 70), brazos(110, 120)),
    p(DE_PIE, { t: 146, c: 8, px: 44 }, piernas(62, -28), brazos(70, 80)),
  ] },
  paso_obstaculo: { ancla: 'suelo', modo: 'reinicio', material: [{ tipo: 'obstaculo', dx: 26, alto: 26 }], encuadre: { der: 20 }, poses: [
    p(DE_PIE, brazos(6, 10)),
    p(DE_PIE, { t: 172, px: 10 }, piernaC(86, -6, 90), piernaL(-6, 0), brazos(30, 40)),
    p(DE_PIE, { t: 176, px: 34 }, piernaC(-14, 0), piernaL(70, -50, 60), brazos(20, 30)),
  ] },

  // ===================== MOVILIDAD =====================
  gato_camello: { estira: ['espalda', 'core'], ancla: 'rodillas', fijos: ['manos'], ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: [
    p(CUADRUPEDIA, { t: 128, t2: 84, c: -24 }),
    p(CUADRUPEDIA, { t: 94, t2: 124, c: 24 }),
  ] },
  apertura_toracica: { estira: ['espalda', 'pecho'], ancla: 'rodillas', fijos: ['manoL'], ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: [
    p(CUADRUPEDIA, { c: -10 }, cerca(18, 170)),
    p(CUADRUPEDIA, { c: 20 }, cerca(176, -14)),
  ] },
  cadera_90_90: { estira: ['gluteos'], vista: 'frente', ancla: 'cadera', ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: [
    p(DE_FRENTE, { md: -90, pd: 0, kpd: 0.32, mi: 30, kmi: 0.35, pi: 90, bd: -20, ad: -10, bi: 20, ai: 10 }),
    p(DE_FRENTE, { kt: 0.88, c: -6, md: -90, pd: 0, kpd: 0.32, mi: 30, kmi: 0.35, pi: 90, bd: -10, ad: 10, bi: 30, ai: 40 }),
  ] },
  flexores_cadera: { estira: ['cuadriceps'], ancla: 'rodillaL', fijos: ['pieC'], ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: [
    p(DE_PIE, { rel: true }, piernaC(88, -2), piernaL(-14, -92, -90), brazos(-30, 62, 2)),
    p(DE_PIE, { t: 182, rel: true }, piernaC(70, -24), piernaL(-32, -94, -90), brazos(-30, 62, 2)),
  ] },
  isquios_estiramiento: { estira: ['isquiotibiales'], ancla: 'pieL', fijos: ['pieC'], ritmo: 'lento', material: [{ tipo: 'escalon', bajo: ['pieC'], pose: 0, ancho: 26 }], poses: [
    p(DE_PIE, piernaC(64, 64, 150), piernaL(-2, 0), brazos(4, 8)),
    p(DE_PIE, { t: 134, c: 10 }, piernaC(64, 64, 150), piernaL(-2, 0), brazos(66, 72)),
  ] },
  tobillo_pared: { estira: ['pantorrillas'], ancla: 'rodillaL', fijos: ['pieC', 'manos'], material: [{ tipo: 'pared', punto: 'manos' }, { tipo: 'colchoneta' }], poses: [
    p(DE_PIE, piernaC(86, 0), piernaL(-10, -92, -90), brazos(78, 84, 2)),
    p(DE_PIE, piernaC(70, 22), piernaL(0, -92, -90), brazos(60, 100, 2)),
  ] },
  circulos_hombro: { activa: ['hombros'], ancla: 'pies', modo: 'ciclo', ritmo: 'paso', poses: [
    p(DE_PIE, brazos(0, 0, 0)), p(DE_PIE, brazos(90, 90, 0)), p(DE_PIE, brazos(180, 180, 0)), p(DE_PIE, brazos(270, 270, 0)),
  ] },
  deslizamiento_pared: { vista: 'frente', ancla: 'pies', ritmo: 'lento', material: [{ tipo: 'muro' }], poses: [
    p(DE_FRENTE, { bd: 278, ad: 188, bi: 82, ai: 172 }),
    p(DE_FRENTE, { bd: 210, ad: 200, bi: 150, ai: 160 }),
  ] },
  respiracion_diafragmatica: { activa: ['core'], ancla: 'cadera', ritmo: 'lento', tiempos: [2.2, 2.6], material: [{ tipo: 'colchoneta' }], poses: [
    p(TUMBADO, piernas(136, -8, 90, 4), cerca(122, 42), lejos(88, 90)),
    p(TUMBADO, piernas(136, -8, 90, 4), cerca(122, 42), lejos(88, 90), { vientre: 3 }),
  ] },
  postura_nino: { estira: ['espalda', 'gluteos'], ancla: 'rodillas', ritmo: 'lento', material: [{ tipo: 'colchoneta' }], poses: respira(p(DE_PIE, { t: 74, c: -16 }, piernas(62, -90, -90, 0), brazos(96, 92, 2)), 1.6) },

  // ===================== BOXEO =====================
  boxeo_guardia_pies: { ancla: 'suelo', ritmo: 'paso', poses: [GUARDIA, p(GUARDIA, { px: 10 }, piernaC(18, -12), piernaL(-12, -8, 76))] },
  boxeo_jab: { ancla: 'suelo', ritmo: 'rapido', pausas: [5, 2], poses: [GUARDIA, BOXEO_JAB] },
  boxeo_cross: { ancla: 'suelo', ritmo: 'rapido', pausas: [5, 2], poses: [GUARDIA, BOXEO_CROSS] },
  boxeo_hook: { ancla: 'suelo', ritmo: 'rapido', pausas: [5, 2], poses: [GUARDIA, p(GUARDIA, { t: 176 }, cerca(86, 88), { kac: 0.45 })] },
  boxeo_uppercut: { ancla: 'suelo', ritmo: 'rapido', pausas: [5, 2], poses: [
    p(GUARDIA, piernaC(24, -18), piernaL(-12, -16, 70)),
    p(GUARDIA, { t: 172 }, lejos(40, 166), piernaL(-16, -10, 56)),
  ] },
  boxeo_esquiva: { ancla: 'suelo', pausas: [2, 1], poses: [GUARDIA, p(GUARDIA, { t: 152, c: 4 }, piernaC(46, -30), piernaL(-2, -36, 62))] },
  boxeo_sombra: { ancla: 'suelo', modo: 'ciclo', ritmo: 'rapido', tiempos: [1, 1.4, 1, 1.4], poses: [GUARDIA, BOXEO_JAB, GUARDIA, BOXEO_CROSS] },
  boxeo_saco: { ancla: 'suelo', modo: 'ciclo', ritmo: 'rapido', tiempos: [1, 1.4, 1, 1.4], material: [{ tipo: 'saco', dx: 18 }], encuadre: { der: 30, arriba: 10 }, poses: [GUARDIA, BOXEO_JAB, GUARDIA, BOXEO_CROSS] },

  // ===================== TIPO MILITAR =====================
  marcha_rapida: caminar({}, true),
  marcha_mochila: { ancla: 'suelo', ritmo: 'paso', material: [{ tipo: 'mochila' }], poses: [p(CAMINA_A, { t: 174 }), p(CAMINA_B, { t: 174 })] },
  arrastre_bajo: { ancla: 'suelo', ritmo: 'paso', poses: [
    p(DE_PIE, { t: 98, c: 16 }, cerca(10, 6), lejos(-8, -6), piernaC(56, -72, 30), piernaL(70, -62, 40)),
    p(DE_PIE, { t: 98, c: 16 }, cerca(-8, -6), lejos(10, 6), piernaC(70, -62, 40), piernaL(56, -72, 30)),
  ] },
};

