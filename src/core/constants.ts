/** Battlezone display (approximated from vector monitor) */
export const NATIVE_WIDTH = 320;
export const NATIVE_HEIGHT = 256;

export const RENDER_SCALE = 3;
export const CANVAS_WIDTH = NATIVE_WIDTH * RENDER_SCALE;   // 960
export const CANVAS_HEIGHT = NATIVE_HEIGHT * RENDER_SCALE;  // 768

export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS;

/** Field of view in radians (~90 degrees) */
export const FOV = Math.PI / 2;

/** Colors — green vector on black */
export const COLORS = {
  background: '#000000',
  wireframe: '#00FF00',
  wireframeDim: '#008800',
  hudRed: '#FF0000',
  radar: '#00FF00',
  radarEnemy: '#FF0000',
  text: '#00FF00',
  scoreText: '#00FF00',
  mountains: '#008800',
};

/** Scoring */
export const SCORE_TANK = 1000;
export const SCORE_SUPER_TANK = 3000;
export const SCORE_MISSILE = 2000;
export const SCORE_SAUCER = 5000;
export const SCORE_EXTRA_LIFE = 15000;
export const SCORE_1812_OVERTURE = 100000;

/** Tank physics */
export const TANK_SPEED = 60;
export const TANK_TURN_SPEED = 1.5;
export const CANNON_RELOAD_TIME = 2.0;
export const SHELL_SPEED = 200;
