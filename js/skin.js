// Pieles: la misma app con otro aspecto. «cartel» es la original (negro y naranja); «dir» es la propuesta
// para el gimnasio DIR (clara y azul). Se elige con ?skin=dir o ?skin=cartel en la dirección, y ese navegador
// la recuerda (lo hace index.html, antes de pintar). Los colores de las pantallas van en css/app.css;
// aquí solo lo que el CSS no alcanza: el nombre y el muñeco 3D.
const SKINS = {
  cartel: {
    brand: null,
    man: { lights: [[0xfff4ea, 2.4, [-2, 4, 5]], [0xffffff, .7, [3, 1, 4]], [0xff4a1c, 4, [-4, 2.5, -4]], [0xff7a45, 3, [4, 1.5, -3]]], hemi: [0xffffff, 0x1a0a05, .6],
      ring: 0xff4a1c, skin: 0xd8a27c, top: 0xf1efe8, shorts: 0x26262b, hair: 0x2b1d15, shoe: 0x2a2a2f, sole: 0xf1efe8, hot: 0xff4a1c, hotGlow: [0xff3a0c, .45],
      steel: 0xf4f3ee, dark: 0x232327, frame: 0x3a3a40, wire: 0xa9a9b2, accent: 0xff4a1c, mat: 0x1c1c20 },
  },
  dir: {
    brand: ['DIR', 'Entrena'],
    man: { lights: [[0xffffff, 2.5, [-2, 4, 5]], [0xffffff, 1.1, [3, 1, 4]], [0x36affa, 2.2, [-4, 2.5, -4]], [0xffffff, 1.5, [4, 1.5, -3]]], hemi: [0xffffff, 0xd7e6f3, 1.0],
      ring: 0x0075c9, skin: 0xd8a27c, top: 0x0075c9, shorts: 0x072a4a, hair: 0x2b1d15, shoe: 0x040711, sole: 0xffffff, hot: 0xe64a0d, hotGlow: [0xe64a0d, .3],
      steel: 0xb9c0ca, dark: 0x2a303c, frame: 0x6b7280, wire: 0x6b7280, accent: 0xe64a0d, mat: 0xd5e2ee },
  },
};
export const SKIN_NAME = typeof document !== 'undefined' && SKINS[document.documentElement.dataset.skin] ? document.documentElement.dataset.skin : 'cartel';
export const SKIN = SKINS[SKIN_NAME];
