// Jax on foot: walking and sprinting, fists and the pistol, getting in and
// out of cars, and taking damage.
import { PLAYER, VEHICLE_TYPES } from './config.js';
import { nearestCar } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: 0,
    aimAngle: 0,
    health: PLAYER.health,
    money: 0,
    inCar: false,
    car: null,
    ammo: PLAYER.magazine,
    reserveAmmo: 48,
    hasPistol: true,
    reloading: 0,
    punchCooldown: 0,
    shootCooldown: 0,
    lastHurt: -100,
    lastShotAt: -100,
    dead: false,
    speed: 0,
  };
}

export function hurtPlayer(game, amount, source) {
  const p = game.player;
  if (p.dead || p.inCar) return;
  p.health -= amount;
  p.lastHurt = game.time;
  if (p.health <= 0) {
    p.health = 0;
    p.dead = true;
    game.audio.fail();
  }
}

// Aim at the mouse: the screen position converts through the camera.
export function updateAim(game, input, camera) {
  const p = game.player;
  const wx = camera.x + input.mouse.x;
  const wy = camera.y + input.mouse.y;
  p.aimAngle = Math.atan2(wy - p.y, wx - p.x);
}

export function updatePlayerOnFoot(game, dt, input) {
  const p = game.player;
  if (p.dead || p.inCar) return;
  const dir = input.direction();
  const speed = input.sprinting() ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  p.speed = (dir.x !== 0 || dir.y !== 0) ? speed : 0;
  if (dir.x !== 0 || dir.y !== 0) {
    p.angle = Math.atan2(dir.y, dir.x);
  }
  const nx = p.x + dir.x * speed * dt;
  const ny = p.y + dir.y * speed * dt;
  const fixed = game.world.resolveCircle(nx, ny, PLAYER.radius);
  p.x = fixed.x;
  p.y = fixed.y;
  updateAim(game, input, game.camera);
  p.punchCooldown = Math.max(0, p.punchCooldown - dt);
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);
  if (p.reloading > 0) {
    p.reloading -= dt;
    if (p.reloading <= 0) {
      const need = PLAYER.magazine - p.ammo;
      const take = Math.min(need, p.reserveAmmo);
      p.ammo += take;
      p.reserveAmmo -= take;
    }
  }
  // Slow health recovery when nobody has hurt Jax for a while.
  if (game.time - p.lastHurt > PLAYER.regenDelay && p.health > 0 && p.health < PLAYER.health) {
    p.health = Math.min(PLAYER.health, p.health + PLAYER.regenRate * dt);
  }
  // Firing: hold the mouse to shoot the pistol, or punch when unarmed.
  if (input.mouse.down && p.shootCooldown <= 0 && p.reloading <= 0) {
    if (p.hasPistol && p.ammo > 0) {
      shootPistol(game);
    } else if (!p.hasPistol) {
      punch(game);
    }
  }
}

export function shootPistol(game) {
  const p = game.player;
  p.ammo -= 1;
  p.shootCooldown = PLAYER.pistolRate;
  p.lastShotAt = game.time;
  const spread = (Math.random() - 0.5) * 0.06;
  const angle = p.aimAngle + spread;
  game.bullets.push({
    x: p.x + Math.cos(angle) * 16,
    y: p.y + Math.sin(angle) * 16,
    vx: Math.cos(angle) * 780,
    vy: Math.sin(angle) * 780,
    damage: PLAYER.pistolDamage,
    fromPlayer: true,
    life: 0.9,
  });
  game.audio.gunshot();
  game.particles.push({ x: p.x + Math.cos(angle) * 20, y: p.y + Math.sin(angle) * 20, vx: 0, vy: 0, life: 0.08, maxLife: 0.08, color: '#ffe9a3', size: 8 });
  game.police.reportGunshot(game, p.x, p.y);
}

export function punch(game) {
  const p = game.player;
  p.punchCooldown = PLAYER.punchRate;
  p.shootCooldown = PLAYER.punchRate;
  game.audio.punch();
  const px = p.x + Math.cos(p.aimAngle) * PLAYER.punchRange;
  const py = p.y + Math.sin(p.aimAngle) * PLAYER.punchRange;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - px, e.y - py) < 30) {
      e.health -= PLAYER.punchDamage;
      if (e.health <= 0) killEnemy(game, e);
    }
  }
  for (const ped of game.peds) {
    if (Math.hypot(ped.x - px, ped.y - py) < 26) {
      ped.fleeing = true;
      ped.fleeX = p.x;
      ped.fleeY = p.y;
      game.police.addWanted(game, 1);
    }
  }
}

export function reloadPistol(game) {
  const p = game.player;
  if (!p.hasPistol || p.reloading > 0 || p.ammo >= PLAYER.magazine || p.reserveAmmo <= 0) return;
  p.reloading = PLAYER.reloadTime;
  game.audio.reload();
}

// Steal or borrow the nearest car; getting out puts Jax beside it.
export function tryEnterCar(game) {
  const p = game.player;
  if (p.inCar) {
    const car = p.car;
    p.inCar = false;
    p.car = null;
    car.driver = 'parked';
    car.speed = 0;
    const side = Math.cos(car.angle + Math.PI / 2);
    const sideY = Math.sin(car.angle + Math.PI / 2);
    const fixed = game.world.resolveCircle(car.x + side * 30, car.y + sideY * 30, PLAYER.radius);
    p.x = fixed.x;
    p.y = fixed.y;
    game.audio.setEngine(0, false);
    return true;
  }
  const car = nearestCar(game, p.x, p.y, 56);
  if (!car) return false;
  if (car.driver === 'traffic' || car.driver === 'parked') {
    const wasDriven = car.driver === 'traffic';
    car.driver = 'player';
    car.parked = false;
    p.inCar = true;
    p.car = car;
    p.x = car.x;
    p.y = car.y;
    if (wasDriven) {
      game.police.addWanted(game, 1);
      game.toast('Car stolen! The cops noticed.');
    } else {
      game.toast(`${VEHICLE_TYPES[car.type].name} — nice ride.`);
    }
    game.audio.pickup();
    return true;
  }
  return false;
}

export function killEnemy(game, e) {
  e.dead = true;
  e.deadAt = game.time;
  game.money += 25;
  game.player.reserveAmmo += 6;
  game.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.5, maxLife: 0.5, color: '#e5534b', size: 10 });
  game.audio.pickup();
}
