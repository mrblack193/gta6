// The game's assembly and its fixed-step update: everything that changes
// the world in one 1/60 s step, driven by either the real input or the
// screenshot autopilot. Rendering lives in render.js; screens live in main.js.
import { STEP, PLAYER } from './config.js';
import { createRandom } from './random.js';
import { createWorld, roadCenter } from './world.js';
import { createPlayer, updatePlayerOnFoot, tryEnterCar, reloadPistol } from './player.js';
import { createPolice } from './police.js';
import { createMissions, updateMissions, startMission, nextMissionIndex, startMarkerFor, missionTitle, failMission } from './missions.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updateBullets, updateEnemies } from './combat.js';
import { updateTraffic, updatePlayerCar, maintainTraffic, spawnParkedCar } from './vehicles.js';
import { ACTION_ENTER, ACTION_RELOAD, ACTION_CLICK, ACTION_CONFIRM } from './input.js';
import { createSilentAudio } from './audio.js';

export function createGame(seed) {
  const rng = createRandom(seed);
  const world = createWorld(rng);
  const game = {
    rng,
    world,
    seed,
    time: 0,
    player: null,
    vehicles: [],
    peds: [],
    enemies: [],
    bullets: [],
    particles: [],
    money: 0,
    camera: { x: 0, y: 0 },
    toasts: [],
    dialogue: null,
    audio: createSilentAudio(),
    input: null,
    missions: createMissions(),
    police: null,
    startMarker: null,
    hasSave: false,
    nextMissionTitle: '',
    over: false,
  };
  game.player = createPlayer(roadCenter(1), roadCenter(1));
  game.police = createPolice(game);
  // A few parked cars around town, waiting to be borrowed: on roads, facing
  // along them, so they pull away cleanly.
  spawnParkedCar(game, 'sedan', roadCenter(2), roadCenter(1), -Math.PI / 2);
  spawnParkedCar(game, 'taxi', roadCenter(4), roadCenter(3), 0);
  spawnParkedCar(game, 'sedan', roadCenter(5), roadCenter(6), Math.PI / 2);
  spawnParkedCar(game, 'truck', roadCenter(6), roadCenter(2), 0);
  spawnPeds(game, 24);
  maintainTraffic(game);
  game.startMarker = startMarkerFor(game);
  game.nextMissionTitle = game.startMarker ? game.startMarker.label : '';
  game.toast = function (text) {
    // The same message twice in a row refreshes instead of stacking.
    const last = game.toasts[game.toasts.length - 1];
    if (last && last.text === text) {
      last.life = 4;
      return;
    }
    game.toasts.push({ text, life: 4 });
    if (game.toasts.length > 3) game.toasts.shift();
  };
  return game;
}

function updateParticles(game, dt) {
  for (const pt of game.particles) {
    pt.life -= dt;
    pt.x += (pt.vx || 0) * dt;
    pt.y += (pt.vy || 0) * dt;
  }
  game.particles = game.particles.filter((pt) => pt.life > 0);
}

function updateToasts(game, dt) {
  for (const t of game.toasts) t.life -= dt;
  game.toasts = game.toasts.filter((t) => t.life > 0);
}

// One fixed step of the living city. `input` is the real input or an
// autopilot with the same shape. `actions` are the edge-triggered presses
// taken once per frame by the caller (the loop takes them once, so a press
// is never eaten by the screen handler and never counted twice).
export function stepGame(game, dt, input, actions) {
  game.time += dt;
  // Dialogue pauses the world; E or click moves to the next line.
  if (game.dialogue) {
    if (actions & (ACTION_ENTER | ACTION_CLICK | ACTION_CONFIRM)) {
      game.dialogue.index += 1;
      if (game.dialogue.index >= game.dialogue.lines.length) game.dialogue = null;
    }
    return;
  }
  const p = game.player;
  if (!p.dead) {
    if (actions & ACTION_ENTER) tryEnterCar(game);
    if (actions & ACTION_RELOAD) reloadPistol(game);
    if (p.inCar) updatePlayerCar(game, dt, input);
    else updatePlayerOnFoot(game, dt, input);
  }
  if (!p.inCar && game.audio) game.audio.setEngine(0, false);
  updateTraffic(game, dt);
  maintainTraffic(game);
  updatePeds(game, dt);
  game.police.update(game, dt);
  updateBullets(game, dt);
  updateEnemies(game, dt);
  updateMissions(game, dt);
  updateParticles(game, dt);
  updateToasts(game, dt);
  // Walk into the gold marker to start the next mission.
  if (!game.missions.active && game.startMarker) {
    const s = game.startMarker;
    if (Math.hypot(p.x - s.x, p.y - s.y) < 80) {
      startMission(game, s.missionIndex);
      game.startMarker = null;
    }
  }
  if (!game.missions.active && !game.startMarker) {
    game.startMarker = startMarkerFor(game);
    game.nextMissionTitle = game.startMarker ? game.startMarker.label : '';
  }
  // Death ends the mission and the run.
  if (p.dead && !game.over) {
    game.over = true;
    if (game.missions.active) failMission(game, p.busted ? 'Busted by the police.' : 'Jax went down.');
    if (game.audio) game.audio.setEngine(0, false);
  }
}

export { STEP };
