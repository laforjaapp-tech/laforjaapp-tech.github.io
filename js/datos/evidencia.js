// FASE 5: base científica del plan.
// Referencias verificadas en Crossref (título, autores, año, revista y DOI tal como figuran en el registro).
// Regla: nunca decir "científicamente comprobado" ni "la mejor combinación". Se indica el nivel de la evidencia
// y, cuando no hay estudios suficientes, se dice que es una estrategia práctica.

export const NIVELES = {
  fuerte: { etiqueta: 'Evidencia fuerte', icono: '🟢', texto: 'Respaldada por guías oficiales o por muchos estudios coherentes entre sí.' },
  moderada: { etiqueta: 'Evidencia moderada', icono: '🟡', texto: 'Revisiones y metaanálisis la apoyan, con algunas dudas o en poblaciones distintas a la tuya.' },
  limitada: { etiqueta: 'Evidencia limitada', icono: '🟠', texto: 'Hay pocos estudios o son en otro tipo de personas: se usa con prudencia.' },
  practica: { etiqueta: 'Estrategia práctica', icono: '🔧', texto: 'No hay estudios que la comparen directamente: es una decisión razonable de entrenador, coherente con los principios generales.' },
};

export const TIPOS_EVIDENCIA = {
  metaanalisis: 'Revisión sistemática y metaanálisis',
  revision: 'Revisión sistemática',
  ensayo: 'Ensayo controlado aleatorizado',
  guia: 'Guía oficial de actividad física',
  posicion: 'Posicionamiento de una organización científica',
  consenso: 'Consenso de expertos',
  narrativa: 'Revisión narrativa con recomendaciones',
};

const doi = d => `https://doi.org/${d}`;

export const REFERENCIAS = {
  hall2012: { titulo: 'Energy balance and its components: implications for body weight regulation', autores: 'Hall KD, Heymsfield SB, Kemnitz JW, Klein S, Schoeller DA, Speakman JR', anio: 2012, revista: 'The American Journal of Clinical Nutrition 95(4):989-994', doi: '10.3945/ajcn.112.036350', tipo: 'narrativa',
    conclusion: 'El peso corporal depende del balance entre la energía que se come y la que se gasta, y ese balance cambia a medida que cambia el cuerpo.' },
  donnelly2009: { titulo: 'Appropriate Physical Activity Intervention Strategies for Weight Loss and Prevention of Weight Regain for Adults (ACSM Position Stand)', autores: 'Donnelly JE, Blair SN, Jakicic JM, Manore MM, Rankin JW, Smith BK', anio: 2009, revista: 'Medicine & Science in Sports & Exercise 41(2):459-471', doi: '10.1249/MSS.0b013e3181949333', tipo: 'posicion',
    conclusion: 'Entre 150 y 250 minutos semanales de actividad moderada producen una pérdida de peso modesta; más de 250 minutos ayudan más. La fuerza sola no baja mucho el peso, pero aumenta la masa libre de grasa.' },
  willis2012: { titulo: 'Effects of aerobic and/or resistance training on body mass and fat mass in overweight or obese adults', autores: 'Willis LH, Slentz CA, Bateman LA, Shields AT, Piner LW, Bales CW, et al.', anio: 2012, revista: 'Journal of Applied Physiology 113(12):1831-1837', doi: '10.1152/japplphysiol.01370.2011', tipo: 'ensayo',
    conclusion: 'En adultos con sobrepeso u obesidad, el ejercicio aeróbico redujo más la grasa y el peso; el entrenamiento de fuerza fue necesario para aumentar la masa magra. La combinación logró ambas cosas.' },
  wewege2017: { titulo: 'The effects of high-intensity interval training vs. moderate-intensity continuous training on body composition in overweight and obese adults: a systematic review and meta-analysis', autores: 'Wewege M, van den Berg R, Ward RE, Keech A', anio: 2017, revista: 'Obesity Reviews 18(6):635-646', doi: '10.1111/obr.12532', tipo: 'metaanalisis',
    conclusion: 'Los intervalos intensos (HIIT) y el cardio continuo moderado redujeron la grasa de forma parecida; el HIIT necesitó menos tiempo.' },
  bull2020: { titulo: 'World Health Organization 2020 guidelines on physical activity and sedentary behaviour', autores: 'Bull FC, Al-Ansari SS, Biddle S, Borodulin K, Buman MP, Cardon G, et al.', anio: 2020, revista: 'British Journal of Sports Medicine 54(24):1451-1462', doi: '10.1136/bjsports-2020-102955', tipo: 'guia',
    conclusion: 'Adultos: 150–300 minutos semanales de actividad aeróbica moderada (o 75–150 de vigorosa) y fortalecimiento muscular al menos 2 días por semana, reduciendo el tiempo sentado.' },
  piercy2018: { titulo: 'The Physical Activity Guidelines for Americans', autores: 'Piercy KL, Troiano RP, Ballard RM, Carlson SA, Fulton JE, Galuska DA, et al.', anio: 2018, revista: 'JAMA 320(19):2020-2028', doi: '10.1001/jama.2018.14854', tipo: 'guia',
    conclusion: 'Moverse algo es mejor que nada; los beneficios aumentan hasta 150–300 minutos semanales de actividad moderada, más fuerza 2 días por semana.' },
  garber2011: { titulo: 'Quantity and Quality of Exercise for Developing and Maintaining Cardiorespiratory, Musculoskeletal, and Neuromotor Fitness in Apparently Healthy Adults (ACSM Position Stand)', autores: 'Garber CE, Blissmer B, Deschenes MR, Franklin BA, Lamonte MJ, Lee IM, et al.', anio: 2011, revista: 'Medicine & Science in Sports & Exercise 43(7):1334-1359', doi: '10.1249/MSS.0b013e318213fefb', tipo: 'posicion',
    conclusion: 'Un programa completo incluye cardio, fuerza 2–3 días por semana, ejercicios neuromotores (equilibrio, coordinación, agilidad) y flexibilidad, con progresión gradual.' },
  schoenfeld2017vol: { titulo: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis', autores: 'Schoenfeld BJ, Ogborn D, Krieger JW', anio: 2017, revista: 'Journal of Sports Sciences 35(11):1073-1082', doi: '10.1080/02640414.2016.1210197', tipo: 'metaanalisis',
    conclusion: 'Más series semanales por músculo se asociaron con más crecimiento muscular (relación dosis-respuesta), con 10 o más series semanales por encima de menos de 5.' },
  schoenfeld2016frec: { titulo: 'Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis', autores: 'Schoenfeld BJ, Ogborn D, Krieger JW', anio: 2016, revista: 'Sports Medicine 46(11):1689-1697', doi: '10.1007/s40279-016-0543-8', tipo: 'metaanalisis',
    conclusion: 'Entrenar cada músculo al menos 2 veces por semana produjo más hipertrofia que una vez por semana.' },
  grgic2018: { titulo: 'Effect of Resistance Training Frequency on Gains in Muscular Strength: A Systematic Review and Meta-Analysis', autores: 'Grgic J, Schoenfeld BJ, Davies TB, Lazinica B, Krieger JW, Pedisic Z', anio: 2018, revista: 'Sports Medicine 48(5):1207-1220', doi: '10.1007/s40279-018-0872-x', tipo: 'metaanalisis',
    conclusion: 'Más frecuencia se asoció con más fuerza, pero sobre todo porque aumenta el volumen total; con el mismo volumen, la frecuencia no marcó diferencia clara.' },
  schoenfeld2017carga: { titulo: 'Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis', autores: 'Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW', anio: 2017, revista: 'Journal of Strength and Conditioning Research 31(12):3508-3523', doi: '10.1519/JSC.0000000000002200', tipo: 'metaanalisis',
    conclusion: 'Con cargas ligeras o pesadas el músculo creció de forma parecida si las series eran exigentes; la fuerza máxima mejoró más con cargas pesadas.' },
  refalo2023: { titulo: 'Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis', autores: 'Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ', anio: 2023, revista: 'Sports Medicine 53(3):649-665', doi: '10.1007/s40279-022-01784-y', tipo: 'metaanalisis',
    conclusion: 'No hace falta llegar al fallo muscular: terminar las series cerca del fallo produjo un crecimiento muscular parecido.' },
  morton2018: { titulo: 'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults', autores: 'Morton RW, Murphy KT, McKellar SR, Schoenfeld BJ, Henselmans M, Helms E, et al.', anio: 2018, revista: 'British Journal of Sports Medicine 52(6):376-384', doi: '10.1136/bjsports-2017-097608', tipo: 'metaanalisis',
    conclusion: 'Más proteína mejoró las ganancias de masa magra con entrenamiento de fuerza; por encima de unos 1,6 g por kg al día no se vio beneficio adicional.' },
  helms2014sr: { titulo: 'A Systematic Review of Dietary Protein During Caloric Restriction in Resistance Trained Lean Athletes: A Case for Higher Intakes', autores: 'Helms ER, Zinn C, Rowlands DS, Brown SR', anio: 2014, revista: 'International Journal of Sport Nutrition and Exercise Metabolism 24(2):127-138', doi: '10.1123/ijsnem.2013-0054', tipo: 'revision',
    conclusion: 'En atletas delgados que comen menos de lo que gastan, una proteína más alta ayuda a conservar la masa magra.' },
  helms2014prep: { titulo: 'Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation', autores: 'Helms ER, Aragon AA, Fitschen PJ', anio: 2014, revista: 'Journal of the International Society of Sports Nutrition 11:20', doi: '10.1186/1550-2783-11-20', tipo: 'narrativa',
    conclusion: 'Recomienda perder alrededor del 0,5–1 % del peso por semana para conservar mejor la masa muscular.' },
  wilson2012: { titulo: 'Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises', autores: 'Wilson JM, Marin PJ, Rhea MR, Wilson SMC, Loenneke JP, Anderson JC', anio: 2012, revista: 'Journal of Strength and Conditioning Research 26(8):2293-2307', doi: '10.1519/JSC.0b013e31823a3e2d', tipo: 'metaanalisis',
    conclusion: 'Combinar cardio y fuerza puede reducir algo las ganancias, sobre todo de potencia, y más cuando el cardio es mucha carrera o muy frecuente y largo.' },
  schumann2022: { titulo: 'Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function: An Updated Systematic Review and Meta-Analysis', autores: 'Schumann M, Feuerbacher JF, Sünkeler M, Freitag N, Rønnestad BR, Doma K, et al.', anio: 2022, revista: 'Sports Medicine 52(3):601-612', doi: '10.1007/s40279-021-01587-7', tipo: 'metaanalisis',
    conclusion: 'Hacer cardio y fuerza no comprometió el crecimiento muscular ni la fuerza máxima; sí puede reducir la fuerza explosiva, sobre todo si se hacen el mismo día.' },
  murlasits2018: { titulo: 'The physiological effects of concurrent strength and endurance training sequence: A systematic review and meta-analysis', autores: 'Murlasits Z, Kneffel Z, Thalib L', anio: 2018, revista: 'Journal of Sports Sciences 36(11):1212-1219', doi: '10.1080/02640414.2017.1364405', tipo: 'metaanalisis',
    conclusion: 'Hacer la fuerza antes que el cardio dio más fuerza de piernas; no hubo diferencias en músculo, grasa ni capacidad aeróbica.' },
  watson2015: { titulo: 'Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society', autores: 'Watson NF, Badr MS, Belenky G, Bliwise DL, Buxton OM, Buysse D, et al.', anio: 2015, revista: 'SLEEP 38(6):843-844', doi: '10.5665/sleep.4716', tipo: 'consenso',
    conclusion: 'Los adultos deberían dormir 7 horas o más por noche de forma habitual.' },
  sherrington2019: { titulo: 'Exercise for preventing falls in older people living in the community', autores: 'Sherrington C, Fairhall NJ, Wallbank GK, Tiedemann A, Michaleff ZA, Howard K, et al.', anio: 2019, revista: 'Cochrane Database of Systematic Reviews 2019(1):CD012424', doi: '10.1002/14651858.CD012424.pub2', tipo: 'revision',
    conclusion: 'En mayores de 60 años, el ejercicio de equilibrio y funcional reduce las caídas.' },
  lauersen2014: { titulo: 'The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials', autores: 'Lauersen JB, Bertelsen DM, Andersen LB', anio: 2014, revista: 'British Journal of Sports Medicine 48(11):871-877', doi: '10.1136/bjsports-2013-092538', tipo: 'metaanalisis',
    conclusion: 'El entrenamiento de fuerza redujo claramente las lesiones deportivas; los estiramientos por sí solos no las previnieron.' },
};
for (const r of Object.values(REFERENCIAS)) r.enlace = doi(r.doi);

// Afirmaciones que usa el plan, con su nivel de evidencia y sus fuentes
export const AFIRMACIONES = {
  balance_energetico: { nivel: 'fuerte', refs: ['hall2012', 'donnelly2009'],
    texto: 'La pérdida de grasa depende sobre todo del balance de energía y de mantener el plan en el tiempo. El ejercicio ayuda a gastar más y, sobre todo la fuerza, a conservar o ganar músculo.' },
  no_hay_mejor_ejercicio: { nivel: 'moderada', refs: ['wewege2017', 'donnelly2009'],
    texto: 'No existe un único ejercicio que "queme más grasa": el cardio continuo y los intervalos dan resultados parecidos. Lo que más pesa es la alimentación y la constancia.' },
  fuerza_y_cardio_juntos: { nivel: 'moderada', refs: ['willis2012', 'donnelly2009'],
    texto: 'Con sobrepeso, el cardio ayuda más a reducir grasa y la fuerza es necesaria para ganar masa magra: combinarlos consigue ambas cosas.' },
  guias_minimas: { nivel: 'fuerte', refs: ['bull2020', 'piercy2018'],
    texto: 'Las guías recomiendan 150–300 minutos de actividad moderada por semana y fuerza al menos 2 días.' },
  programa_completo: { nivel: 'fuerte', refs: ['garber2011'],
    texto: 'Un programa completo combina cardio, fuerza, trabajo neuromotor (equilibrio, coordinación, agilidad) y movilidad, progresando poco a poco.' },
  volumen_hipertrofia: { nivel: 'moderada', refs: ['schoenfeld2017vol'],
    texto: 'Más series semanales por músculo suelen dar más crecimiento muscular, hasta un punto: se sube el volumen de forma gradual.' },
  frecuencia_dos: { nivel: 'moderada', refs: ['schoenfeld2016frec', 'grgic2018'],
    texto: 'Entrenar cada músculo al menos 2 veces por semana ayuda a repartir el volumen y favorece el crecimiento.' },
  cargas_en_casa: { nivel: 'moderada', refs: ['schoenfeld2017carga', 'refalo2023'],
    texto: 'Con poco peso el músculo también crece si las series son exigentes (cerca del fallo): en casa se conserva el estímulo con progresiones de peso corporal o bandas.' },
  cerca_del_fallo: { nivel: 'moderada', refs: ['refalo2023'],
    texto: 'No hace falta llegar al fallo: terminar con 1–3 repeticiones en reserva da resultados parecidos con menos fatiga y riesgo.' },
  proteina: { nivel: 'moderada', refs: ['morton2018'],
    texto: 'La proteína potencia lo que gana el entrenamiento de fuerza; por encima de unos 1,6 g por kg al día no se vio beneficio extra. No hace falta proteína en polvo si la comida alcanza.' },
  proteina_deficit: { nivel: 'limitada', refs: ['helms2014sr'],
    texto: 'Cuando se come menos de lo que se gasta, algo más de proteína puede ayudar a conservar músculo (estudiado sobre todo en atletas delgados).' },
  ritmo_perdida: { nivel: 'limitada', refs: ['helms2014prep'],
    texto: 'Perder alrededor de 0,5–1 % del peso por semana parece proteger mejor el músculo que ir más rápido.' },
  concurrente: { nivel: 'moderada', refs: ['schumann2022', 'wilson2012'],
    texto: 'Cardio y fuerza en el mismo plan son compatibles para el músculo y la fuerza máxima; la interferencia aparece sobre todo con mucho cardio de carrera o cuando se busca potencia.' },
  fuerza_antes_cardio: { nivel: 'moderada', refs: ['murlasits2018'],
    texto: 'Si el objetivo es fuerza o músculo, la fuerza va antes que el cardio intenso: así se gana más fuerza en las piernas.' },
  sueno: { nivel: 'moderada', refs: ['watson2015'],
    texto: 'Dormir 7 horas o más es la base de la recuperación (consenso de expertos).' },
  equilibrio: { nivel: 'limitada', refs: ['sherrington2019'],
    texto: 'El trabajo de equilibrio reduce caídas en mayores de 60 años; en edades menores se usa como prevención razonable.' },
  fuerza_previene_lesiones: { nivel: 'moderada', refs: ['lauersen2014'],
    texto: 'El entrenamiento de fuerza se asocia con menos lesiones; los estiramientos solos no las previenen.' },
  boxeo: { nivel: 'practica', refs: [],
    texto: 'El boxeo se usa como cardio por intervalos, coordinación y trabajo de pies. No hay estudios que lo comparen con otras opciones para tus objetivos: es una estrategia práctica.' },
  parkour: { nivel: 'practica', refs: ['garber2011'],
    texto: 'El parkour básico se usa para control corporal, equilibrio, agilidad y confianza al moverse, no para "quemar más". Su progresión es una estrategia práctica dentro del trabajo neuromotor.' },
  militar: { nivel: 'practica', refs: [],
    texto: 'El circuito tipo militar es acondicionamiento general (capacidad de trabajo). Su uso y dosis son una estrategia práctica.' },
  repetir_para_progresar: { nivel: 'practica', refs: ['garber2011'],
    texto: 'Repetir los mismos ejercicios varias semanas permite medir y progresar; se cambian solo cuando hace falta.' },
  descarga: { nivel: 'practica', refs: [],
    texto: 'Cada 3–4 semanas se baja el volumen para recuperar y asimilar: estrategia práctica habitual, sin estudios que fijen el momento exacto.' },
  hiit_dosificado: { nivel: 'moderada', refs: ['wewege2017'],
    texto: 'El HIIT no quema más grasa que el cardio moderado; ahorra tiempo pero cansa más, por eso se limita a 1–2 sesiones por semana.' },
};

export const refsDe = ids => [...new Set(ids)].map(id => ({ id, ...REFERENCIAS[id] })).filter(r => r.titulo);
// La afirmación conserva su texto; del nivel se toman la etiqueta, el icono y su descripción aparte
export function afirmacion(id) {
  const a = AFIRMACIONES[id];
  if (!a) return null;
  const n = NIVELES[a.nivel];
  return { id, ...a, etiqueta: n.etiqueta, icono: n.icono, nivelTexto: n.texto };
}
