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
export const FOCAL_LENGTH = (CANVAS_WIDTH * 0.5) / Math.tan(FOV * 0.5);

/** Horizon line position (fraction from top) */
export const HORIZON_Y = CANVAS_HEIGHT * 0.45;

/** Radar */
export const RADAR_X = CANVAS_WIDTH * 0.5;
export const RADAR_Y = 50 * RENDER_SCALE;
export const RADAR_RADIUS = 35 * RENDER_SCALE;
export const RADAR_RANGE = 1500; // world units visible on radar

/** Colors — green vector on black */
export const COLORS = {
  background: '#000000',
  wireframe: '#00FF00',
  wireframeBright: '#44FF44',
  wireframeDim: '#007700',
  wireframeVeryDim: '#004400',
  hudRed: '#FF0000',
  hudRedDim: '#880000',
  radar: '#005500',
  radarBorder: '#00FF00',
  radarPlayer: '#00FF00',
  radarEnemy: '#FF0000',
  radarObstacle: '#007700',
  text: '#00FF00',
  crosshair: '#00FF00',
  mountains: '#005500',
  ground: '#003300',
  explosion: '#00FF00',
  shell: '#FFFFFF',
};

/** Scoring */
export const SCORE_TANK = 1000;
export const SCORE_SUPER_TANK = 3000;
export const SCORE_MISSILE = 2000;
export const SCORE_SAUCER = 5000;
export const SCORE_EXTRA_LIFE_1 = 15000;
export const SCORE_EXTRA_LIFE_2 = 100000;

/** Player tank */
export const TANK_SPEED = 80;
export const TANK_TURN_SPEED = 1.8;
export const CANNON_RELOAD_TIME = 2.0;
export const SHELL_SPEED = 300;
export const SHELL_MAX_DIST = 800;

/** Enemy behavior */
export const ENEMY_TANK_SPEED = 40;
export const ENEMY_SUPER_TANK_SPEED = 60;
export const ENEMY_MISSILE_SPEED = 120;
export const ENEMY_SAUCER_SPEED = 80;
export const ENEMY_FIRE_INTERVAL = 3.0;       // seconds between shots
export const ENEMY_SUPER_FIRE_INTERVAL = 1.5;
export const ENEMY_SHELL_SPEED = 150;
export const ENEMY_SPAWN_DISTANCE = 600;
export const ENEMY_DESPAWN_DISTANCE = 1200;

/** World */
export const WORLD_SIZE = 2000; // world extends -WORLD_SIZE to +WORLD_SIZE
export const OBSTACLE_COUNT = 12;
export const OBSTACLE_SIZE = 30;
export const PLAYER_RADIUS = 15;
export const ENEMY_RADIUS = 15;
export const HIT_RADIUS = 18;
