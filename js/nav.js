// Repintar la pantalla actual. Vive aparte de app.js para que las pantallas no dependan del arranque
// (app.js espera a la base de datos antes de terminar de cargarse; importarlo desde una pantalla la bloquearía).
let paint = async () => {};
export const setPaint = fn => { paint = fn; };
export const refresh = async () => { const y = scrollY; await paint(); scrollTo(0, y); };
