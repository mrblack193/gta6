// Combat: bullets, armed thugs, and what a bullet hits. Thugs are the
// mission enemies; they shoot at Jax and take cover in nothing — they just
// strafe and miss a lot.
import { PLAYER } from './config.js';
import { hurtPlayer, killEnemy } from './player.js';

export function createThug(game, x, y) {
  return {
    x, y,
    angle: game.rng.range(0, Math.PI * 2),
    health: 60,
    speed: 95,
    shootCooldown: game.rng.range(0.4, 1.2),
    strafeDir: game.rng.chance(0.5) ? 1 : -1,
    strafeTimer: game.rng.range(1, 2),
    dead: false,
    isThug: true,
  };
}

export function updateBullets(game, dt) {
  for (const b of game.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (game.world.blocked(b.x, b.y, 0)) {
      b.life = 0;
      game.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, maxLife: 0.25, color: '#ffd34d', size: 4 });
      continue;
    }
    if (b.fromPlayer) {
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < 16) {
          e.health -= b.damage;
          b.life = 0;
          game.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, color: '#e5534b', size: 6 });
          if (e.health <= 0) killEnemy(game, e);
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const car of game.vehicles) {
        if (car.driver === 'player') continue;
        const dx = b.x - car.x;
        const dy = b.y - car.y;
        const along = Math.abs(dx * Math.cos(car.angle) + dy * Math.sin(car.angle));
        const across = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
        if (along < car.length / 2 && across < car.width / 2 + 4) {
          b.life = 0;
          car.damage += 1;
          game.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, maxLife: 0.25, color: '#ffd34d', size: 4 });
          if (car.driver === 'traffic') game.police.addWanted(game, 1);
          break;
        }
      }
    } else {
      const p = game.player;
      if (!p.inCar && !p.dead && Math.hypot(p.x - b.x, p.y - b.y) < PLAYER.radius + 3) {
        hurtPlayer(game, b.damage, 'bullet');
        b.life = 0;
      }
    }
  }
  game.bullets = game.bullets.filter((b) => b.life > 0);
}

export function updateEnemies(game, dt) {
  const p = game.player;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    e.strafeTimer -= dt;
    if (e.strafeTimer <= 0) {
      e.strafeDir *= -1;
      e.strafeTimer = game.rng.range(0.8, 1.8);
    }
    if (dist > 320) {
      // Close the distance.
      const nx = e.x + (dx / dist) * e.speed * dt;
      const ny = e.y + (dy / dist) * e.speed * dt;
      const fixed = game.world.resolveCircle(nx, ny, 10);
      e.x = fixed.x;
      e.y = fixed.y;
    } else if (dist > 120) {
      // Strafe sideways at mid range.
      const px = -dy / dist;
      const py = dx / dist;
      const fixed = game.world.resolveCircle(e.x + px * e.strafeDir * e.speed * 0.6 * dt, e.y + py * e.strafeDir * e.speed * 0.6 * dt, 10);
      e.x = fixed.x;
      e.y = fixed.y;
    }
    e.angle = Math.atan2(dy, dx);
    e.shootCooldown -= dt;
    if (e.shootCooldown <= 0 && dist < 380 && !p.dead) {
      e.shootCooldown = game.rng.range(0.9, 1.6);
      const spread = (Math.random() - 0.5) * 0.35;
      const angle = Math.atan2(dy, dx) + spread;
      game.bullets.push({
        x: e.x + Math.cos(angle) * 16,
        y: e.y + Math.sin(angle) * 16,
        vx: Math.cos(angle) * 620,
        vy: Math.sin(angle) * 620,
        damage: 9,
        fromPlayer: false,
        life: 1.1,
      });
      game.audio.gunshot();
      game.particles.push({ x: e.x + Math.cos(angle) * 20, y: e.y + Math.sin(angle) * 20, vx: 0, vy: 0, life: 0.08, maxLife: 0.08, color: '#ffe9a3', size: 7 });
    }
  }
  game.enemies = game.enemies.filter((e) => !e.dead || game.time - (e.deadAt || 0) < 2);
}
