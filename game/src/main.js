// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between four screens: title, play, paused and game over.
//
// ?seed=N fixes the city. ?shot=start|street|mission|chase (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, WORLD, VIEW_W, VIEW_H } from './config.js';
import { createGame, stepGame } from './update.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { drawHud } from './hud.js';
import { saveGame, loadSave, hasSave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

let game = createGame(seed);
game.audio = audio;
game.hasSave = hasSave();

function applySave(data) {
  game.money = data.money || 0;
  game.missions.done = Array.isArray(data.missionsDone) ? data.missionsDone.slice() : [];
  game.missions.index = data.missionIndex || 0;
  game.player.x = data.px ?? game.player.x;
  game.player.y = data.py ?? game.player.y;
  game.player.health = data.health ?? 100;
  game.player.ammo = data.ammo ?? 12;
  game.player.hasPistol = data.hasPistol !== false;
  game.player.reserveAmmo = 48;
  game.player.dead = false;
  game.over = false;
  game.startMarker = null;
  game.missions.active = false;
  game.missions.marker = null;
  game.missions.objective = '';
  game.toast('Save loaded. Welcome back to Costa Verde.');
}

function runShot(name) {
  const scene = stageShot(name, game);
  // Snap the camera onto the action before painting: the renderer's lerp
  // would need many frames to get there from the corner.
  const p = game.player;
  const fx = p.inCar && p.car ? p.car.x : p.x;
  const fy = p.inCar && p.car ? p.car.y : p.y;
  game.camera.x = Math.max(0, Math.min(WORLD - VIEW_W, fx - VIEW_W / 2));
  game.camera.y = Math.max(0, Math.min(WORLD - VIEW_H, fy - VIEW_H / 2));
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen);
    if (scene.screen === SCREEN_PLAY) drawHud(game, renderer.ctx);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      if (params.get('debug')) {
        const box = document.getElementById('err');
        if (box) {
          box.style.display = 'block';
          box.textContent = JSON.stringify({
            px: Math.round(p.x), py: Math.round(p.y), inCar: p.inCar,
            carX: p.car ? Math.round(p.car.x) : null, carY: p.car ? Math.round(p.car.y) : null,
            carSpeed: p.car ? Math.round(p.car.speed) : null,
            camX: Math.round(game.camera.x), camY: Math.round(game.camera.y),
            stars: game.police.stars, vehicles: game.vehicles.length,
            police: game.police.cars.length, hp: Math.round(p.health),
            missionActive: game.missions.active, objective: game.missions.objective,
          });
        }
      }
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  game.input = input;
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startNewGame() {
    game = createGame(seed);
    game.audio = audio;
    game.hasSave = hasSave();
    game.input = input;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Follow the gold marker to start the first mission.');
  }

  function continueGame() {
    const data = loadSave();
    if (!data) {
      startNewGame();
      return;
    }
    game = createGame(seed);
    game.audio = audio;
    game.hasSave = true;
    game.input = input;
    applySave(data);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Save loaded.');
  }

  function respawn() {
    const money = Math.round(game.money * 0.5);
    const done = game.missions.done.slice();
    const index = game.missions.index;
    game = createGame(seed);
    game.audio = audio;
    game.hasSave = hasSave();
    game.input = input;
    game.money = money;
    game.missions.done = done;
    game.missions.index = index;
    const clinic = game.world.places.clinic;
    game.player.x = clinic.x;
    game.player.y = clinic.y;
    game.player.health = 100;
    accumulator = 0;
    screen = SCREEN_PLAY;
    game.toast('Patched up at St. Clara Clinic. Half your cash went to bail.');
    announce('Respawned at the clinic.');
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      game.toast(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) {
        audio.ensure();
        if (game.hasSave) continueGame();
        else startNewGame();
      }
      return;
    }
    if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) {
        audio.ensure();
        respawn();
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    // SCREEN_PLAY
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      audio.setEngine(0, false);
      announce('Paused.');
    }
  }

  // S to save and Q to quit, only on the pause screen; N for a new game
  // on the title screen.
  window.addEventListener('keydown', (event) => {
    if (screen === SCREEN_PAUSED && event.code === 'KeyS') {
      const ok = saveGame(game);
      game.toast(ok ? 'Game saved.' : 'Could not save here.');
    } else if (screen === SCREEN_PAUSED && event.code === 'KeyQ') {
      screen = SCREEN_TITLE;
      audio.setEngine(0, false);
      announce('Title screen.');
    } else if (screen === SCREEN_TITLE && event.code === 'KeyN') {
      audio.ensure();
      startNewGame();
    }
  });

  // The title screen's living backdrop: traffic and pedestrians move, but
  // the player stands still and no key does anything there.
  const quietInput = {
    mouse: { x: 640, y: 300, down: false },
    direction() { return { x: 0, y: 0 }; },
    sprinting() { return false; },
    takeActions() { return 0; },
  };

  function frame(now) {
    requestAnimationFrame(frame);
    window.__game = game;
    window.__screen = screen;
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Take the frame's presses once and hand them to the screen handler and
    // to the first world step, so nothing is eaten or double-counted.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_PLAY && !game.dialogue) {
      let first = true;
      while (accumulator >= STEP) {
        stepGame(game, STEP, input, first ? actions : 0);
        first = false;
        accumulator -= STEP;
        if (game.player.dead) {
          screen = SCREEN_OVER;
          break;
        }
      }
    } else if (screen === SCREEN_PLAY && game.dialogue) {
      // Dialogue open: still let the player advance it, world frozen.
      stepGame(game, 0, input, actions);
      accumulator = 0;
    } else if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        stepGame(game, STEP, quietInput, 0);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    audio.update(STEP, game.police.stars);
    renderer.draw(game, screen);
    if (screen === SCREEN_PLAY) drawHud(game, renderer.ctx);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.setEngine(0, false);
      announce('Paused.');
    }
  });

  announce('Costa Verde. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
