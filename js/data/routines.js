// Planes de salida y bloques de calentar y soltar. Al primer arranque se copian a la base de datos,
// y a partir de ahí cada persona edita su copia desde la app.
//
// Día: { title: [línea 1, línea 2], kind, items: [{ exerciseId, sets, repsMin, repsMax | secs, startKg?, fromWeek?, untilWeek?, note? }] }
// kind: 'pull' tirón · 'push' empuje · 'legs' pierna · 'kb' kettlebell · 'full' cuerpo completo · 'easy' día suave

const it = (exerciseId, sets, repsMin, repsMax = repsMin, more = {}) => ({ exerciseId, sets, repsMin, repsMax, ...more });
const hold = (exerciseId, sets, secs, more = {}) => ({ exerciseId, sets, secs, ...more });

export const KINDS = {
  pull: { name: 'Tirón', color: '#4C8DFF' }, push: { name: 'Empuje', color: '#FF4A1C' }, legs: { name: 'Pierna', color: '#E9B949' },
  kb: { name: 'Kettlebell', color: '#7BD88F' }, full: { name: 'Cuerpo completo', color: '#FF4A1C' }, easy: { name: 'Suave', color: '#8F8E88' },
};
export const KB_LADDER = [8, 12, 16, 22];

export const TEMPLATES = [
  {
    id: 'fuerza-5', name: 'Fuerza, 5 días', mode: 'fuerza',
    about: 'Espalda y bíceps, pecho y hombro, pierna. Lunes y martes más pesado; jueves y viernes más repeticiones.',
    days: {
      1: { title: ['Espalda', 'y bíceps'], kind: 'pull', items: [
        it('jalon-pecho', 3, 8, 10), it('remo-sentado-polea', 3, 8, 10), it('remo-una-mano-polea', 3, 10, 12), it('face-pull', 3, 12, 15),
        it('curl-barra-z', 3, 8, 10), it('curl-martillo', 2, 10, 12), hold('plancha-lateral', 2, 30), it('bird-dog', 2, 8),
      ] },
      2: { title: ['Pecho,', 'hombro y tríceps'], kind: 'push', items: [
        it('press-inclinado-mancuernas', 3, 8, 10), it('press-inclinado-maquina', 3, 8, 10), it('aperturas-mancuernas', 2, 10, 12),
        it('press-hombro-maquina', 3, 8, 10), it('elevaciones-laterales', 3, 12, 15), it('triceps-polea-una-mano', 2, 10, 12), it('triceps-cuerda', 3, 10, 12), it('curl-up', 3, 8),
      ] },
      3: { title: ['Pierna', 'y glúteo'], kind: 'legs', items: [
        it('prensa', 3, 10, 12), it('extension-cuadriceps', 3, 10, 12), it('curl-femoral', 3, 10, 12), it('puente-gluteo-maquina', 3, 10, 12),
        it('gemelos-maquina', 3, 12, 15), it('abductores', 2, 15), hold('plancha', 3, 40),
      ] },
      4: { title: ['Espalda', 'y bíceps'], kind: 'pull', items: [
        it('jalon-agarre-ancho', 3, 12, 15), it('remo-sentado-polea', 3, 12, 15), it('remo-una-mano-polea', 3, 12, 15), it('face-pull', 3, 15),
        it('elevaciones-laterales', 3, 12, 15), it('curl-martillo', 2, 12, 15), it('veintiuno', 2, 21, 21, { note: 'Poco peso, sin balanceo.' }), it('curl-femoral', 3, 12, 15), hold('plancha-lateral', 2, 30),
      ] },
      5: { title: ['Pecho,', 'hombro y tríceps'], kind: 'push', items: [
        it('press-inclinado-mancuernas', 3, 12, 15), it('press-inclinado-maquina', 3, 12, 15), it('cruce-poleas', 2, 12, 15),
        it('press-hombro-maquina', 3, 12, 15), it('elevaciones-laterales', 3, 12, 15), it('triceps-polea-una-mano', 2, 12, 15), it('triceps-cuerda', 2, 12, 15),
        it('extension-cuadriceps', 3, 12, 15), it('gemelos-maquina', 3, 12, 15), it('bird-dog', 2, 8),
      ] },
    },
  },
  {
    id: 'kettlebell-3-2', name: 'Kettlebell, 3 días + 2 suaves', mode: 'kettlebell',
    about: 'Doce semanas. Primero la bisagra de cadera; el swing llega en la semana 3 y la zancada en la 5.',
    days: {
      1: { title: ['Bisagra', 'y cadera'], kind: 'kb', items: [
        it('kb-peso-muerto', 5, 10, 10, { startKg: 16 }), it('kb-swing', 5, 15, 15, { startKg: 12, fromWeek: 3, note: 'Con 16 kg desde la semana 5 si sale limpio.' }),
        it('kb-goblet', 4, 10, 10, { startKg: 12 }), hold('plancha', 3, 30),
      ] },
      2: { title: ['Día', 'suave'], kind: 'easy', cardio: 25, items: [
        it('kb-peso-muerto', 3, 8, 8, { startKg: 12, note: 'Técnica: lento y limpio.' }), it('bird-dog', 2, 8), it('curl-up', 2, 8),
      ] },
      3: { title: ['Empuje', 'y tirón'], kind: 'kb', items: [
        it('kb-press', 4, 8, 8, { startKg: 8 }), it('kb-remo', 4, 10, 10, { startKg: 12 }), it('kb-halo', 3, 10, 10, { startKg: 8 }),
        it('kb-peso-muerto', 3, 10, 10, { startKg: 16, untilWeek: 2 }), it('kb-swing', 4, 15, 15, { startKg: 12, fromWeek: 3 }), hold('plancha-lateral', 2, 30),
      ] },
      4: { title: ['Día', 'suave'], kind: 'easy', cardio: 25, items: [
        it('kb-halo', 2, 10, 10, { startKg: 8 }), it('kb-goblet', 3, 8, 8, { startKg: 8, note: 'Técnica: baja despacio.' }), it('bird-dog', 2, 8),
      ] },
      5: { title: ['Circuito', 'completo'], kind: 'kb', items: [
        it('kb-peso-muerto', 3, 10, 10, { startKg: 16, untilWeek: 2 }), it('kb-swing', 4, 10, 10, { startKg: 12, fromWeek: 3 }), it('kb-goblet', 4, 8, 8, { startKg: 12 }),
        it('kb-press', 3, 6, 6, { startKg: 8 }), it('kb-remo', 3, 8, 8, { startKg: 12 }), it('kb-zancada-atras', 3, 8, 8, { startKg: 8, fromWeek: 5 }),
        hold('paseo-granjero', 3, 40, { startKg: 16 }), hold('plancha', 3, 30),
      ] },
    },
  },
  {
    id: 'completo-3', name: 'Cuerpo completo, 3 días', mode: 'fuerza',
    about: 'Lunes, miércoles y viernes. Para empezar o para semanas con poco tiempo.',
    days: Object.fromEntries([1, 3, 5].map((d, i) => [d, { title: ['Cuerpo', 'completo'], kind: 'full', items: [
      it('prensa', 3, 10, 12), it(i === 1 ? 'press-pecho-maquina' : 'press-inclinado-mancuernas', 3, 8, 10), it(i === 1 ? 'remo-sentado-polea' : 'jalon-pecho', 3, 8, 10),
      it(i === 1 ? 'puente-gluteo-maquina' : 'curl-femoral', 3, 10, 12), it('press-hombro-maquina', 2, 10, 12), it(i === 1 ? 'triceps-cuerda' : 'curl-martillo', 2, 10, 12), hold('plancha', 3, 30),
    ] }])),
  },
  {
    id: 'torso-pierna-4', name: 'Torso y pierna, 4 días', mode: 'fuerza',
    about: 'Lunes y jueves torso; martes y viernes pierna. Miércoles libre.',
    days: {
      1: { title: ['Torso'], kind: 'push', items: [it('press-inclinado-mancuernas', 3, 8, 10), it('jalon-pecho', 3, 8, 10), it('press-hombro-maquina', 3, 8, 10), it('remo-sentado-polea', 3, 8, 10), it('elevaciones-laterales', 3, 12, 15), it('curl-barra-z', 2, 10, 12), it('triceps-cuerda', 2, 10, 12)] },
      2: { title: ['Pierna', 'y glúteo'], kind: 'legs', items: [it('prensa', 3, 8, 10), it('curl-femoral', 3, 10, 12), it('puente-gluteo-maquina', 3, 10, 12), it('extension-cuadriceps', 2, 12, 15), it('gemelos-maquina', 3, 12, 15), hold('plancha', 3, 40)] },
      4: { title: ['Torso'], kind: 'pull', items: [it('jalon-agarre-ancho', 3, 10, 12), it('press-pecho-maquina', 3, 10, 12), it('remo-una-mano-polea', 3, 10, 12), it('cruce-poleas', 2, 12, 15), it('face-pull', 3, 15), it('curl-martillo', 2, 12, 15), it('triceps-polea-una-mano', 2, 12, 15)] },
      5: { title: ['Pierna', 'y glúteo'], kind: 'legs', items: [it('prensa', 3, 12, 15), it('puente-gluteo-maquina', 3, 12, 15), it('curl-femoral', 3, 12, 15), it('abductores', 2, 15), it('gemelos-maquina', 3, 12, 15), hold('plancha-lateral', 2, 30)] },
    },
  },
  { id: 'vacio', name: 'Empezar de cero', mode: 'fuerza', about: 'Un plan en blanco. Tú eliges qué va cada día.', days: {} },
];

// ---------- Calentar y Soltar ----------
// Paso: { name, secs, cue, move, sides? }. `sides: 2` = por lado (el cronómetro corre dos veces).
// `move`: la postura del muñeco (data/moves.js). Todos los pasos llevan la suya.
const st = (name, secs, cue, move, sides) => ({ name, secs, cue, move, ...(sides ? { sides } : {}) });
const CARDIO = st('Cardio suave', 240, 'Elíptica o cinta llana. Que puedas hablar sin ahogarte.', 'elliptical');
const CAT = st('Gato-camello', 40, 'A cuatro patas. Redondea y arquea la espalda despacio.', 'm-cat');
const THOR = st('Rotación torácica', 30, 'A cuatro patas, mano en la nuca. Abre el codo al techo.', 'm-thoracic', 2);
const BOOK = st('Libro abierto', 30, 'Tumbado de lado, rodillas juntas. Abre el brazo de arriba.', 'm-book', 2);
const CIRC = st('Círculos de hombro', 30, 'Grandes y lentos. Hacia delante y hacia atrás.', 'm-circles');
const WALL = st('Deslizamientos en pared', 40, 'Espalda y codos pegados a la pared. Sube y baja los brazos.', 'm-wall');
const CHIN = st('Retracción de mentón', 30, 'Mete la barbilla hacia atrás, sin bajar la cabeza. Papada.', 'm-chin');
const NECK = st('Inclinaciones de cuello', 30, 'Oreja al hombro, suave. Sin forzar.', 'm-neck', 2);
const HINGE = st('Bisagra de cadera sin peso', 40, 'Culo atrás, espalda larga, rodillas apenas dobladas.', 'm-hinge');
const HIPS = st('Círculos de cadera', 30, 'De pie, manos en la cintura. Amplios y lentos.', 'm-hips');
const BAND = st('Separar banda', 40, 'O face pull muy ligero. 15 repeticiones, hombros abajo.', 'm-band');
const DOG = st('Bird dog', 40, 'Brazo y pierna contraria. Sin girar la cadera.', 'bird-dog');
const BRIDGE = st('Puente de glúteo', 40, 'Sube la cadera apretando el glúteo. 12 repeticiones.', 'glute-bridge');

export const WARMUP = {
  pull: [CARDIO, CAT, THOR, BOOK, CIRC, WALL, CHIN, NECK, BAND, DOG],
  push: [CARDIO, CAT, THOR, BOOK, CIRC, WALL, CHIN, NECK, BAND, DOG],
  legs: [CARDIO, CAT, HIPS, HINGE, THOR, CHIN, BRIDGE, DOG],
  kb: [CARDIO, CAT, HIPS, HINGE, THOR, CIRC, CHIN, BRIDGE, DOG],
  full: [CARDIO, CAT, THOR, CIRC, WALL, HINGE, CHIN, BRIDGE, DOG],
  easy: [CARDIO, CAT, HIPS, HINGE, CHIN, NECK],
};

const TRAP = st('Trapecio superior', 35, 'Oreja al hombro; la otra mano tira suave hacia el suelo.', 'm-trap', 2);
const LEV = st('Elevador de la escápula', 35, 'Mira hacia tu axila y baja la cabeza con la mano.', 'm-levator', 2);
const PEC = st('Pectoral en marco', 35, 'Antebrazo en el marco de una puerta. Gira el cuerpo hacia fuera.', 'm-pec', 2);
const LAT = st('Dorsal: postura del niño', 45, 'De rodillas, culo a los talones, brazos largos al frente.', 'm-child');
const HIPF = st('Flexor de cadera', 35, 'Zancada con la rodilla de atrás en el suelo. Cadera adelante.', 'm-hipflex', 2);
const HAM = st('Isquios', 35, 'Tumbado, pierna arriba cogida por detrás del muslo.', 'm-ham', 2);
const GLU = st('Glúteo', 35, 'Tumbado, tobillo sobre la rodilla contraria. Tira hacia ti.', 'm-glute', 2);
const BREATH = st('Respiración lenta', 120, 'Por la nariz. Mandíbula suelta, dientes separados.', 'm-breath');

export const COOLDOWN = {
  pull: [TRAP, LEV, PEC, LAT, HIPF, HAM, BREATH],
  push: [TRAP, LEV, PEC, LAT, HIPF, HAM, BREATH],
  legs: [HIPF, HAM, GLU, LAT, TRAP, LEV, BREATH],
  kb: [HIPF, HAM, GLU, LAT, TRAP, LEV, BREATH],
  full: [TRAP, LEV, PEC, LAT, HIPF, HAM, BREATH],
  easy: [TRAP, LEV, LAT, HIPF, BREATH],
};

// Rutina corta para cualquier día, también en casa.
export const NECK_ROUTINE = [CHIN, NECK, TRAP, LEV, CIRC, WALL, st('Respiración lenta', 60, 'Por la nariz. Mandíbula suelta, lengua al paladar.', 'm-breath')];

export const blockMinutes = steps => Math.round(steps.reduce((t, s) => t + s.secs * (s.sides || 1), 0) / 60);

// Claves fijas para cuello y mandíbula en los ejercicios pesados.
export const JAW_CUE = 'Dientes separados, lengua al paladar, hombros lejos de las orejas.';
export const WEAK_SIDE_CUE = 'Empieza por tu lado débil. Mismas repeticiones en los dos.';
