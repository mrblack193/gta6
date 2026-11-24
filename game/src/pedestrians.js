// Pedestrians: they stroll the sidewalks, cross at corners, and run from
// gunfire, crashes and speeding cars.
import { WORLD, ROAD_W, PITCH } from './config.js';

const SHIRT_COLORS = ['#e8e8e8', '#f2c94c', '#7ec8e3', '#e39a7a', '#a8d8a8', '#d8a8d8', '#f0f0f0', '#8ab4f8'];
const PANTS_COLORS = ['#3a4a5a', '#5a3a3a', '#2a3a2a', '#4a4a4a', '#6a5a3a'];

export function createPed(game, x, y) {
  return {
    x, y,
    angle: game.rng.range(0, Math.PI * 2),
    speed: game.rng.range(38, 62),
    shirt: game.rng.pick(SHIRT_COLORS),
    pants: game.rng.pick(PANTS_COLORS),
    walkPhase: game.rng.range(0, Math.PI * 2),
    fleeing: false,
    fleeX: 0,
    fleeY: 0,
    targetX: x,
    targetY: y,
    retarget: 0,
  };
}

function pickSidewalkTarget(game, ped) {
  // Walk to a nearby sidewalk point: along a road edge, then along it.
  const roadIndex = game.rng.int(0, 7);
  const horizontal = game.rng.chance(0.5);
  const c = roadIndex * PITCH + ROAD_W / 2;
  if (horizontal) {
    ped.targetX = game.rng.range(60, WORLD - 60);
    ped.targetY = c + (game.rng.chance(0.5) ? 1 : -1) * (ROAD_W / 2 + 12);
  } else {
    ped.targetX = c + (game.rng.chance(0.5) ? 1 : -1) * (ROAD_W / 2 + 12);
    ped.targetY = game.rng.range(60, WORLD - 60);
  }
}

export function spawnPeds(game, count) {
  for (let i = 0; i < count; i += 1) {
    const ped = createPed(game, game.rng.range(100, WORLD - 100), game.rng.range(100, WORLD - 100));
    pickSidewalkTarget(game, ped);
    ped.x = ped.targetX;
    ped.y = ped.targetY;
    game.peds.push(ped);
  }
}

export function updatePeds(game, dt) {
  const player = game.player;
  for (const ped of game.peds) {
    ped.walkPhase += dt * 8;
    // Flee from danger: gunfire, crashes, or a car bearing down.
    let dangerX = null;
    let dangerY = null;
    if (game.time - player.lastShotAt < 1.2) {
      dangerX = player.x;
      dangerY = player.y;
    }
    if (!dangerX) {
      for (const car of game.vehicles) {
        if (Math.abs(car.speed) < 120) continue;
        const d = Math.hypot(car.x - ped.x, car.y - ped.y);
        if (d < 130) {
          dangerX = car.x;
          dangerY = car.y;
          break;
        }
      }
    }
    if (dangerX !== null) {
      ped.fleeing = true;
      ped.fleeX = dangerX;
      ped.fleeY = dangerY;
    }
    let tx;
    let ty;
    let speed = ped.speed;
    if (ped.fleeing) {
      const dx = ped.x - ped.fleeX;
      const dy = ped.y - ped.fleeY;
      const d = Math.hypot(dx, dy) || 1;
      tx = ped.x + (dx / d) * 100;
      ty = ped.y + (dy / d) * 100;
      speed = ped.speed * 2.4;
      if (d > 320) ped.fleeing = false;
    } else {
      ped.retarget -= dt;
      if (ped.retarget <= 0 || Math.hypot(ped.targetX - ped.x, ped.targetY - ped.y) < 24) {
        pickSidewalkTarget(game, ped);
        ped.retarget = game.rng.range(4, 9);
      }
      tx = ped.targetX;
      ty = ped.targetY;
    }
    const dx = tx - ped.x;
    const dy = ty - ped.y;
    const d = Math.hypot(dx, dy);
    if (d > 4) {
      ped.angle = Math.atan2(dy, dx);
      const step = Math.min(d, speed * dt);
      const fixed = game.world.resolveCircle(ped.x + (dx / d) * step, ped.y + (dy / d) * step, 8);
      ped.x = fixed.x;
      ped.y = fixed.y;
    }
  }
  // Keep the crowd near the player.
  let near = 0;
  for (const ped of game.peds) {
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;
    if (dx * dx + dy * dy < 900 * 900) near += 1;
  }
  while (near < 20) {
    const ped = createPed(game, player.x + game.rng.range(-800, 800), player.y + game.rng.range(-800, 800));
    pickSidewalkTarget(game, ped);
    ped.x = ped.targetX;
    ped.y = ped.targetY;
    if (game.world.blocked(ped.x, ped.y, 10)) continue;
    game.peds.push(ped);
    near += 1;
  }
  game.peds = game.peds.filter((ped) => {
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;
    return dx * dx + dy * dy < 1600 * 1600;
  });
}
