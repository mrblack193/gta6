// Costa Verde — shared constants: the city, the story names, the vehicles,
// the tuning every system agrees on. Nothing here reaches the network.
export const STEP = 1 / 60;
export const WORLD = 3200;
export const ROAD_W = 80;
export const BLOCK = 320;
export const PITCH = BLOCK + ROAD_W;
export const VIEW_W = 1280;
export const VIEW_H = 800;

export const CITY_NAME = 'Costa Verde';
export const GAME_TITLE = 'COSTA VERDE';
export const GAME_SUBTITLE = 'Streets of the Sun — an open-world crime story';
export const SAVE_KEY = 'costa-verde-save-v1';

export const PLAYER = {
  radius: 11,
  walkSpeed: 175,
  sprintSpeed: 265,
  health: 100,
  punchRange: 36,
  punchDamage: 14,
  punchRate: 0.32,
  pistolRange: 430,
  pistolDamage: 34,
  pistolRate: 0.22,
  magazine: 12,
  reloadTime: 1.1,
  regenDelay: 6,
  regenRate: 4,
};

// Vehicle types: top speed, acceleration, steering and size. Police is the
// fastest chaser; the truck is slow but heavy; the sports car is the prize.
export const VEHICLE_TYPES = {
  sedan: { name: 'Sedan', topSpeed: 330, accel: 420, brake: 700, steer: 2.6, length: 46, width: 22, color: '#c94f43', mass: 1.0 },
  taxi: { name: 'Taxi', topSpeed: 340, accel: 430, brake: 700, steer: 2.7, length: 46, width: 22, color: '#e8b93a', mass: 1.0 },
  truck: { name: 'Truck', topSpeed: 245, accel: 300, brake: 520, steer: 2.0, length: 58, width: 26, color: '#5b7fa6', mass: 1.8 },
  sports: { name: 'Sports', topSpeed: 470, accel: 560, brake: 800, steer: 3.1, length: 48, width: 22, color: '#d7263d', mass: 0.9 },
  police: { name: 'Police', topSpeed: 405, accel: 520, brake: 820, steer: 3.0, length: 48, width: 22, color: '#2b4c7e', mass: 1.1 },
};

export const WANTED = {
  maxStars: 5,
  // How many patrol cars each star level puts on the player.
  carsPerStar: [0, 1, 2, 3, 4, 5],
  // Seconds out of every police car's sight before one star fades.
  fadeSeconds: 9,
  sightRange: 620,
};

export const MISSION_REWARDS = [500, 400, 600, 1200, 2500];

// The story's people and places. All original, none borrowed.
export const STORY = {
  player: 'Jax Marlow',
  fixer: 'Vera Kline',
  crew: 'Tico',
  driver: 'Mara',
  villain: 'Donovan Marsh',
  safehouse: 'Palm Row Safehouse',
  docks: 'Solano Docks',
  marina: 'Marina Bay',
  park: 'Verde Park',
  plaza: 'North Plaza',
  clinic: 'St. Clara Clinic',
  warehouse: 'Marsh Warehouse',
  garage: 'Reyes Garage',
};

export const PALETTE = {
  grass: '#79b657',
  grassDark: '#6aa84c',
  road: '#3b4048',
  roadLine: '#d8c95a',
  sidewalk: '#b3a893',
  curb: '#8f8672',
  sand: '#e6d49a',
  water: '#2f7fb5',
  waterDeep: '#256b9c',
  parkGrass: '#5da244',
  buildingRoof: '#8a6f5c',
};

// Keys, by KeyboardEvent.code, so layouts do not matter.
export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  enterCar: ['KeyE'],
  reload: ['KeyR'],
  pause: ['KeyP', 'Escape'],
  confirm: ['Enter', 'Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  mute: ['KeyM'],
  interact: ['KeyE'],
};
