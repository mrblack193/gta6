// The screenshot scenes behind ?shot=start|street|mission|chase. Each one
// plays the real rules forward from a fresh world for a fixed number of
// seconds, steered by a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { createGame, stepGame } from './update.js';
import { createVehicle, spawnParkedCar } from './vehicles.js';
import { roadCenter } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

// A fake input with the real input's shape: the autopilot drives with it.
// It seeks the nearest road when off it, follows the grid toward the
// mission marker, and reverses out when it gets wedged.
function autopilotInput(game, mode) {
  let lastTime = game.time;
  let stuckTime = 0;
  let reverseUntil = 0;
  const p = game.player;
  return {
    mouse: { x: 640, y: 300, down: false },
    direction() {
      if (mode === 'walk') {
        // Stroll east along the sidewalk, turning at the road's end.
        return { x: 1, y: 0 };
      }
      if (mode === 'drive' && p.inCar && p.car) {
        const car = p.car;
        const dt = Math.max(0, game.time - lastTime);
        lastTime = game.time;
        // Stuck detection: barely moving while trying to drive.
        if (Math.abs(car.speed) < 25) stuckTime += dt;
        else stuckTime = 0;
        if (stuckTime > 1.1) {
          reverseUntil = game.time + 0.8;
          stuckTime = 0;
        }
        if (game.time < reverseUntil) return { x: -1, y: 1 };
        const marker = game.missions.marker;
        let tx = marker ? marker.x : car.x + 600;
        let ty = marker ? marker.y : car.y;
        // Off the road: head for the nearest road centreline first.
        if (!game.world.isOnRoad(car.x, car.y)) {
          const road = game.world.nearestRoadPoint(car.x, car.y);
          tx = road.x;
          ty = road.y;
        }
        const dx = tx - car.x;
        const dy = ty - car.y;
        const wantAngle = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 0 : Math.PI)
          : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
        let diff = wantAngle - car.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const steer = Math.max(-1, Math.min(1, diff * 2));
        return { x: steer, y: -1 };
      }
      return { x: 0, y: 0 };
    },
    sprinting() {
      return false;
    },
    takeActions() {
      return 0;
    },
  };
}

function simulate(game, seconds, mode) {
  const input = autopilotInput(game, mode);
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) stepGame(game, STEP, input);
}

function placePlayerInCar(game, type, x, y, angle) {
  const car = createVehicle(type, x, y, angle, 'player');
  game.vehicles.push(car);
  const p = game.player;
  p.inCar = true;
  p.car = car;
  p.x = x;
  p.y = y;
  return car;
}

/**
 * Set `game` to the named scene and return the screen to draw over it.
 * start: the title over a living city. street: Jax on foot in traffic.
 * mission: mission 1, driving Tico to the safehouse. chase: the sports-car
 * heist escape at three stars, two patrol cars on Jax's tail.
 */
export function stageShot(name, game) {
  if (name === 'street') {
    // Jax on foot at a busy four-way, strolling east past the traffic.
    game.player.x = roadCenter(2);
    game.player.y = roadCenter(2) + 52;
    game.player.angle = 0;
    simulate(game, 4, 'walk');
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // Mission 1 mid-flight: Tico aboard, one star, racing the clock.
    const m = game.missions;
    m.active = true;
    m.index = 0;
    m.stage = 1;
    m.title = 'The Getaway';
    m.timerMax = 90;
    m.timer = 88;
    const safe = game.world.places.safehouse;
    m.marker = { x: safe.x, y: safe.y, label: safe.name };
    m.objective = `Drive Tico to ${safe.name} — 88s`;
    const docks = game.world.places.docks;
    placePlayerInCar(game, 'sedan', docks.x + 120, docks.y, 0);
    game.police.addWanted(game, 1);
    simulate(game, 7, 'drive');
    // The autopilot may have finished the drive: put the scene back.
    m.active = true;
    m.index = 0;
    m.stage = 1;
    m.marker = { x: safe.x, y: safe.y, label: safe.name };
    m.objective = `Drive Tico to ${safe.name}`;
    if (game.police.stars < 1) game.police.setStars(game, 1);
    game.player.health = 100;
    game.toasts = [];
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // The Marina Heist escape at three stars, two patrol cars on the tail.
    const m = game.missions;
    m.active = true;
    m.index = 3;
    m.stage = 2;
    m.title = 'Marina Heist';
    const marina = game.world.places.marina;
    const car = spawnParkedCar(game, 'sports', marina.x + 60, marina.y - 40, Math.PI / 2);
    m.targetCar = car;
    const garage = game.world.places.garage;
    m.marker = { x: garage.x, y: garage.y, label: garage.name };
    m.objective = `Deliver the sports car to ${garage.name}`;
    const p = game.player;
    p.x = car.x;
    p.y = car.y;
    p.inCar = true;
    p.car = car;
    car.driver = 'player';
    game.police.setStars(game, 3);
    // Two patrol cars right on the tail.
    for (let i = 0; i < 2; i += 1) {
      const pc = createVehicle('police', car.x - 120 - i * 90, car.y + (i === 0 ? -50 : 50), Math.PI / 2, 'police');
      pc.siren = true;
      pc.speed = 380;
      game.vehicles.push(pc);
      game.police.cars.push(pc);
    }
    simulate(game, 5, 'drive');
    // The autopilot may have delivered the car: put the scene back.
    m.active = true;
    m.index = 3;
    m.stage = 2;
    m.marker = { x: garage.x, y: garage.y, label: garage.name };
    m.objective = `Deliver the sports car to ${garage.name}`;
    game.police.setStars(game, 3);
    game.player.health = 100;
    game.money = 0;
    game.toasts = [];
    return { screen: SCREEN_PLAY };
  }
  // start (and anything else): the title over a living city.
  simulate(game, 6, 'walk');
  return { screen: SCREEN_TITLE };
}

export function createShotGame(seed) {
  return createGame(seed);
}
