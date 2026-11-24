// Cars: the player's ride, traffic and the police. Top-down driving physics,
// traffic that follows the road grid, and car collisions.
import { VEHICLE_TYPES, WORLD } from './config.js';
import { roadCenter } from './world.js';

let nextId = 1;

export function createVehicle(type, x, y, angle, driver) {
  const def = VEHICLE_TYPES[type];
  return {
    id: nextId,
    type,
    name: def.name,
    x, y, angle,
    speed: 0,
    color: def.color,
    length: def.length,
    width: def.width,
    mass: def.mass,
    topSpeed: def.topSpeed,
    accel: def.accel,
    brake: def.brake,
    steer: def.steer,
    driver: driver || 'traffic',
    // Traffic AI state.
    axis: 'x',
    dir: 1,
    lane: 0,
    cruise: 150,
    turnCooldown: 0,
    parked: driver === 'parked',
    siren: false,
    damage: 0,
  };
}

function laneOffset(axis, dir) {
  // Right-hand traffic: the lane sits to the right of the direction of travel.
  if (axis === 'x') return dir > 0 ? 18 : -18;
  return dir > 0 ? -18 : 18;
}

export function placeOnRoad(game, car, roadIndex, axis, dir) {
  const c = roadCenter(roadIndex);
  car.axis = axis;
  car.dir = dir;
  car.lane = laneOffset(axis, dir);
  if (axis === 'x') {
    car.x = game.rng.range(100, WORLD - 100);
    car.y = c + car.lane;
    car.angle = dir > 0 ? 0 : Math.PI;
  } else {
    car.y = game.rng.range(100, WORLD - 100);
    car.x = c + car.lane;
    car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  car.cruise = game.rng.range(130, 200);
  car.speed = car.cruise;
}

export function spawnTrafficCar(game) {
  const types = ['sedan', 'sedan', 'taxi', 'taxi', 'truck', 'sedan'];
  const type = game.rng.pick(types);
  const car = createVehicle(type, 0, 0, 0, 'traffic');
  const axis = game.rng.chance(0.5) ? 'x' : 'y';
  const dir = game.rng.chance(0.5) ? 1 : -1;
  placeOnRoad(game, car, game.rng.int(0, 7), axis, dir);
  // Keep traffic near the action, never on top of the player.
  const px = game.player.x;
  const py = game.player.y;
  const dx = car.x - px;
  const dy = car.y - py;
  if (dx * dx + dy * dy < 260 * 260) {
    car.x = px + (dx >= 0 ? 700 : -700);
    car.y = py + (dy >= 0 ? 500 : -500);
  }
  if (game.world.blocked(car.x, car.y, 30)) return null;
  game.vehicles.push(car);
  return car;
}

export function spawnParkedCar(game, type, x, y, angle) {
  const car = createVehicle(type, x, y, angle, 'parked');
  car.speed = 0;
  game.vehicles.push(car);
  return car;
}

// A car is three circles (nose, middle, tail): cheap and good enough for
// building and car collisions at this scale.
function samplePoints(car) {
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  const half = car.length / 2 - 6;
  return [
    { x: car.x + cos * half, y: car.y + sin * half, r: car.width / 2 + 2 },
    { x: car.x, y: car.y, r: car.width / 2 + 2 },
    { x: car.x - cos * half, y: car.y - sin * half, r: car.width / 2 + 2 },
  ];
}

function collideBuildings(game, car) {
  let hit = false;
  for (const p of samplePoints(car)) {
    const fixed = game.world.resolveCircle(p.x, p.y, p.r);
    if (fixed.x !== p.x || fixed.y !== p.y) {
      const dx = fixed.x - p.x;
      const dy = fixed.y - p.y;
      car.x += dx;
      car.y += dy;
      hit = true;
    }
  }
  return hit;
}

function collideCars(game, car) {
  for (const other of game.vehicles) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const dist = Math.hypot(dx, dy);
    const min = (car.length + other.length) / 2 - 8;
    if (dist > 0.01 && dist < min) {
      const push = (min - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      car.x -= nx * push;
      car.y -= ny * push;
      if (other.driver !== 'parked') {
        other.x += nx * push;
        other.y += ny * push;
      }
      const impact = Math.abs(car.speed - other.speed);
      if (impact > 140) {
        game.audio.crash();
        game.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#ffd34d', size: 6 });
        if (car.driver === 'player') damagePlayerCar(game, impact);
        if (other.driver === 'player') damagePlayerCar(game, impact);
      }
      car.speed *= 0.82;
      other.speed *= 0.82;
    }
  }
}

export function damagePlayerCar(game, impact) {
  const hurt = Math.min(5, impact / 40);
  game.player.health -= hurt;
  game.player.lastHurt = game.time;
}

function driveStep(game, car, dt) {
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  car.x += cos * car.speed * dt;
  car.y += sin * car.speed * dt;
  if (collideBuildings(game, car)) {
    if (Math.abs(car.speed) > 200) {
      game.audio.crash();
      game.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#ffd34d', size: 7 });
      if (car.driver === 'player') damagePlayerCar(game, Math.abs(car.speed));
    }
    car.speed *= 0.45;
  }
  collideCars(game, car);
}

// The player's car: throttle, brake, reverse and steering that bites more
// the faster the car goes.
export function updatePlayerCar(game, dt, input) {
  const car = game.player.car;
  if (!car) return;
  const dir = input.direction();
  const def = car;
  if (dir.y < 0) {
    car.speed += def.accel * dt;
  } else if (dir.y > 0) {
    if (car.speed > 10) car.speed -= def.brake * dt;
    else car.speed -= def.accel * 0.55 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 140 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  if (car.speed > def.topSpeed) car.speed = def.topSpeed;
  if (car.speed < -130) car.speed = -130;
  const steerAmount = dir.x * def.steer * Math.min(1, Math.abs(car.speed) / 160) * Math.sign(car.speed || 1);
  car.angle += steerAmount * dt;
  driveStep(game, car, dt);
  // The player rides in the car: keep their position on it for the minimap
  // and every system that reads the player's place.
  game.player.x = car.x;
  game.player.y = car.y;
  game.audio.setEngine(Math.abs(car.speed) / car.topSpeed, true);
  if (Math.abs(car.speed) > 300 && Math.random() < 0.3) {
    game.particles.push({
      x: car.x - Math.cos(car.angle) * car.length / 2,
      y: car.y - Math.sin(car.angle) * car.length / 2,
      vx: 0, vy: 0, life: 0.3, maxLife: 0.3, color: '#9aa0a8', size: 4,
    });
  }
}

// Traffic: hold the lane, slow for the car ahead, and at intersections
// sometimes turn onto the cross street.
export function updateTraffic(game, dt) {
  for (const car of game.vehicles) {
    if (car.driver !== 'traffic') continue;
    car.turnCooldown -= dt;
    // Car ahead in the same lane: ease off.
    let ahead = Infinity;
    for (const other of game.vehicles) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const along = car.axis === 'x' ? dx * car.dir : dy * car.dir;
      const across = car.axis === 'x' ? Math.abs(dy) : Math.abs(dx);
      if (along > 0 && along < 90 && across < 26) ahead = Math.min(ahead, along);
    }
    const want = ahead < 90 ? car.cruise * 0.25 : car.cruise;
    car.speed += Math.sign(want - car.speed) * 260 * dt;
    // At an intersection, maybe turn.
    const c = car.axis === 'x' ? car.y : car.x;
    const roadIndex = Math.round((c - 40) / 400);
    const cross = roadCenter(roadIndex);
    const alongPos = car.axis === 'x' ? car.x : car.y;
    const nearCross = Math.abs(alongPos - cross) < 14;
    if (nearCross && car.turnCooldown <= 0 && game.rng.chance(0.02)) {
      const newAxis = car.axis === 'x' ? 'y' : 'x';
      const newDir = game.rng.chance(0.5) ? 1 : -1;
      const old = { x: car.x, y: car.y };
      car.axis = newAxis;
      car.dir = newDir;
      car.lane = laneOffset(newAxis, newDir);
      if (newAxis === 'x') {
        car.y = cross + car.lane;
        car.angle = newDir > 0 ? 0 : Math.PI;
      } else {
        car.x = cross + car.lane;
        car.angle = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      if (game.world.blocked(car.x, car.y, 26)) {
        car.x = old.x;
        car.y = old.y;
      }
      car.turnCooldown = 3;
    }
    // Stay glued to the lane centre.
    if (car.axis === 'x') {
      const targetY = roadCenter(Math.round((car.y - 40) / 400)) + car.lane;
      car.y += (targetY - car.y) * Math.min(1, dt * 4);
    } else {
      const targetX = roadCenter(Math.round((car.x - 40) / 400)) + car.lane;
      car.x += (targetX - car.x) * Math.min(1, dt * 4);
    }
    driveStep(game, car, dt);
  }
}

// Keep the streets busy near the player, and clear cars left far behind.
export function maintainTraffic(game) {
  let traffic = 0;
  for (const car of game.vehicles) if (car.driver === 'traffic') traffic += 1;
  while (traffic < 14) {
    if (spawnTrafficCar(game)) traffic += 1;
    else break;
  }
  game.vehicles = game.vehicles.filter((car) => {
    if (car.driver !== 'traffic') return true;
    const dx = car.x - game.player.x;
    const dy = car.y - game.player.y;
    return dx * dx + dy * dy < 1500 * 1500;
  });
}

export function nearestCar(game, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of game.vehicles) {
    if (car.driver === 'police') continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}
