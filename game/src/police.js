// The wanted level and the Costa Verde police: patrol cars that chase, ram
// and roadblock, and a heat meter that fades when Jax stays out of sight.
import { WANTED, WORLD } from './config.js';
import { createVehicle as makeCar } from './vehicles.js';
import { hurtPlayer } from './player.js';

export function createPolice(game) {
  const police = {
    stars: 0,
    hiddenTimer: 0,
    cars: [],
    roadblockTimer: 0,

    addWanted(g, amount) {
      const before = police.stars;
      police.stars = Math.min(WANTED.maxStars, police.stars + amount);
      police.hiddenTimer = 0;
      if (police.stars > before) {
        g.toast(police.stars >= 3 ? 'Wanted level up — the whole force is coming!' : 'The police are onto you!');
      }
    },

    reportGunshot(g, x, y) {
      const p = g.player;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < 700) police.addWanted(g, 1);
      for (const car of police.cars) {
        if (Math.hypot(car.x - x, car.y - y) < 800) police.addWanted(g, 1);
      }
    },

    setStars(g, stars) {
      police.stars = Math.max(0, Math.min(WANTED.maxStars, stars));
      police.hiddenTimer = 0;
    },

    // A patrol car spawns on a road near the player, facing them.
    spawnPatrol(g) {
      const p = g.player;
      const angle = g.rng.range(0, Math.PI * 2);
      const dist = g.rng.range(420, 560);
      let x = p.x + Math.cos(angle) * dist;
      let y = p.y + Math.sin(angle) * dist;
      const road = g.world.nearestRoadPoint(x, y);
      x = road.x;
      y = road.y;
      if (x < 60 || y < 60 || x > WORLD - 60 || y > WORLD - 60) return;
      const car = makeCar('police', x, y, Math.atan2(p.y - y, p.x - x), 'police');
      car.siren = true;
      car.speed = car.topSpeed * 0.7;
      g.vehicles.push(car);
      police.cars.push(car);
      g.audio.setSiren(true);
    },

    update(g, dt) {
      const p = g.player;
      const want = WANTED.carsPerStar[police.stars];
      // Spawn patrol cars until the wanted level's quota is on the road.
      // Roadblock cars do not count toward the quota.
      police.cars = police.cars.filter((c) => g.vehicles.includes(c));
      const patrols = () => police.cars.filter((c) => !c.parkedBlock);
      while (patrols().length < want) police.spawnPatrol(g);
      while (patrols().length > want) {
        const idx = police.cars.findIndex((c) => !c.parkedBlock);
        if (idx === -1) break;
        const car = police.cars.splice(idx, 1)[0];
        car.driver = 'traffic';
        car.siren = false;
      }
      if (police.cars.length === 0) g.audio.setSiren(false);

      // Chase: steer at the player, ram them, and at 3+ stars throw up
      // roadblocks ahead of them. Roadblock cars hold their ground.
      for (const car of police.cars) {
        if (car.parkedBlock) continue;
        car.ramCooldown = Math.max(0, (car.ramCooldown || 0) - dt);
        const dx = p.x - car.x;
        const dy = p.y - car.y;
        const dist = Math.hypot(dx, dy);
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - car.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const steer = Math.max(-1, Math.min(1, diff * 2.2));
        car.angle += steer * car.steer * Math.min(1, Math.abs(car.speed) / 140) * dt;
        const wantSpeed = dist > 320 ? car.topSpeed : car.topSpeed * 0.85;
        car.speed += Math.sign(wantSpeed - car.speed) * car.accel * dt;
        if (car.speed > car.topSpeed) car.speed = car.topSpeed;
        const cos = Math.cos(car.angle);
        const sin = Math.sin(car.angle);
        car.x += cos * car.speed * dt;
        car.y += sin * car.speed * dt;
        const fixed = g.world.resolveCircle(car.x, car.y, car.width / 2 + 2);
        if (fixed.x !== car.x || fixed.y !== car.y) {
          car.x = fixed.x;
          car.y = fixed.y;
          car.speed *= 0.5;
          if (Math.abs(car.speed) > 180) g.audio.crash();
        }
        // Ram the player's car, or run Jax down on foot.
        if (p.inCar && p.car) {
          const cd = Math.hypot(p.car.x - car.x, p.car.y - car.y);
          if (cd < (car.length + p.car.length) / 2 - 4) {
            const push = ((car.length + p.car.length) / 2 - 4 - cd) / 2;
            const nx = (p.car.x - car.x) / (cd || 1);
            const ny = (p.car.y - car.y) / (cd || 1);
            p.car.x += nx * push;
            p.car.y += ny * push;
            car.x -= nx * push;
            car.y -= ny * push;
            p.car.speed *= 0.86;
            if (Math.abs(car.speed) > 160 && car.ramCooldown <= 0) {
              car.ramCooldown = 0.7;
              g.audio.crash();
              p.health -= 1;
              p.lastHurt = g.time;
            }
          }
        } else if (!p.dead) {
          if (dist < 30 && Math.abs(car.speed) < 120) {
            // Caught on foot: busted.
            p.dead = true;
            p.busted = true;
            g.audio.fail();
          } else if (dist < 40) {
            hurtPlayer(g, 26 * dt, 'ram');
          }
        }
      }

      // Roadblocks at 3 stars and up: two parked patrol cars across the road
      // ahead of the player, refreshed every 14 seconds.
      if (police.stars >= 3) {
        police.roadblockTimer -= dt;
        if (police.roadblockTimer <= 0) {
          police.roadblockTimer = 14;
          const ahead = p.inCar && p.car ? p.car.angle : p.angle;
          const bx = p.x + Math.cos(ahead) * 420;
          const by = p.y + Math.sin(ahead) * 420;
          const road = g.world.nearestRoadPoint(bx, by);
          for (let i = -1; i <= 1; i += 2) {
            const car = makeCar('police', road.x + i * 26, road.y, ahead + Math.PI / 2, 'police');
            car.speed = 0;
            car.parkedBlock = true;
            g.vehicles.push(car);
            police.cars.push(car);
          }
        }
      }

      // Fading: out of every patrol car's sight for long enough, lose a star.
      let seen = false;
      for (const car of police.cars) {
        if (Math.hypot(car.x - p.x, car.y - p.y) < WANTED.sightRange) {
          seen = true;
          break;
        }
      }
      if (police.stars > 0 && !seen) {
        police.hiddenTimer += dt;
        if (police.hiddenTimer > WANTED.fadeSeconds) {
          police.stars -= 1;
          police.hiddenTimer = 0;
          g.toast(police.stars === 0 ? 'You lost them. Clean — for now.' : 'Heat is cooling off.');
          if (police.stars === 0) g.audio.setSiren(false);
        }
      } else {
        police.hiddenTimer = 0;
      }
      // Roadblock cars that are not part of the quota drift back to patrol.
      for (const car of police.cars) {
        if (car.parkedBlock && Math.hypot(car.x - p.x, car.y - p.y) > 900) {
          car.parkedBlock = false;
          car.driver = 'traffic';
        }
      }
    },
  };
  return police;
}
