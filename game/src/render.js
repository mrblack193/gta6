// The renderer: a camera that follows Jax, the city painted from the world
// data, every car, pedestrian, thug, bullet and particle, and the title,
// pause and game-over screens.
import { VIEW_W, VIEW_H, WORLD, PALETTE, GAME_TITLE, GAME_SUBTITLE, CITY_NAME, STORY } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  function updateCamera(game) {
    const p = game.player;
    const fx = p.inCar && p.car ? p.car.x : p.x;
    const fy = p.inCar && p.car ? p.car.y : p.y;
    const tx = Math.max(0, Math.min(WORLD - VIEW_W, fx - VIEW_W / 2));
    const ty = Math.max(0, Math.min(WORLD - VIEW_H, fy - VIEW_H / 2));
    game.camera.x += (tx - game.camera.x) * 0.12;
    game.camera.y += (ty - game.camera.y) * 0.12;
  }

  function drawWorld(game) {
    const world = game.world;
    const cam = game.camera;
    const x0 = Math.max(0, Math.floor(cam.x) - 40);
    const y0 = Math.max(0, Math.floor(cam.y) - 40);
    const x1 = Math.min(WORLD, cam.x + VIEW_W + 40);
    const y1 = Math.min(WORLD, cam.y + VIEW_H + 40);
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    // Ground.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Beach and sea.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, world.beach.y, x1 - x0, world.beach.h);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(x0, world.sea.y, x1 - x0, world.sea.h);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let i = 0; i < 12; i += 1) {
      const wx = ((i * 271) % WORLD);
      const wy = world.sea.y + 30 + ((i * 137) % 180);
      ctx.fillRect(wx, wy, 90, 6);
    }
    // Park.
    ctx.fillStyle = PALETTE.parkGrass;
    ctx.fillRect(world.park.x, world.park.y, world.park.w, world.park.h);
    ctx.strokeStyle = '#d8c9a3';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(world.park.x, world.park.y + world.park.h / 2);
    ctx.lineTo(world.park.x + world.park.w, world.park.y + world.park.h / 2);
    ctx.moveTo(world.park.x + world.park.w / 2, world.park.y);
    ctx.lineTo(world.park.x + world.park.w / 2, world.park.y + world.park.h);
    ctx.stroke();
    // Roads: asphalt, sidewalks, centre dashes.
    for (let i = 0; i < 8; i += 1) {
      const c = i * 400 + 40;
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(0, c - 52, WORLD, 104);
      ctx.fillRect(c - 52, 0, 104, WORLD);
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(0, c - 40, WORLD, 80);
      ctx.fillRect(c - 40, 0, 80, WORLD);
    }
    ctx.fillStyle = PALETTE.roadLine;
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    for (let i = 0; i < 8; i += 1) {
      const c = i * 400 + 40;
      ctx.beginPath();
      ctx.moveTo(0, c);
      ctx.lineTo(WORLD, c);
      ctx.moveTo(c, 0);
      ctx.lineTo(c, WORLD);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Buildings.
    for (const b of world.buildings) {
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      ctx.fillStyle = b.edge;
      ctx.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      const cols = b.windows;
      const rows = Math.max(1, Math.floor(b.h / 46));
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          ctx.fillRect(b.x + 12 + cx * ((b.w - 24) / cols), b.y + 12 + cy * ((b.h - 24) / rows), 14, 10);
        }
      }
      if (b.label) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(CITY_NAME.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 + 4);
        ctx.textAlign = 'left';
      }
    }
    // Trees.
    for (const t of world.trees) {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      ctx.fillStyle = '#4a7d33';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6aa84c';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Street lamps.
    ctx.fillStyle = '#2c313a';
    for (const lamp of world.lamps) {
      if (lamp.x < x0 || lamp.x > x1 || lamp.y < y0 || lamp.y > y1) continue;
      ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
    }
    // Mission marker beacon.
    const marker = game.missions.marker || game.startMarker;
    if (marker) {
      const pulse = 1 + Math.sin(game.time * 4) * 0.15;
      ctx.save();
      ctx.translate(marker.x, marker.y);
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 211, 77, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd34d';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(marker.label || '', marker.x, marker.y - 36);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCar(game, car) {
    const cam = game.camera;
    // Cull in screen space, but draw in world space: drawEntities already
    // translated the context by the camera.
    const sx = car.x - cam.x;
    const sy = car.y - cam.y;
    if (sx < -80 || sx > VIEW_W + 80 || sy < -80 || sy > VIEW_H + 80) return;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-car.length / 2 + 3, -car.width / 2 + 3, car.length, car.width);
    // Body.
    ctx.fillStyle = car.color;
    roundRect(-car.length / 2, -car.width / 2, car.length, car.width, 7);
    ctx.fill();
    // Hood shading.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(car.length / 2 - 12, -car.width / 2 + 2, 10, car.width - 4);
    // Windshield and rear window.
    ctx.fillStyle = '#1d2733';
    ctx.fillRect(2, -car.width / 2 + 3, 12, car.width - 6);
    ctx.fillRect(-car.length / 2 + 8, -car.width / 2 + 3, 8, car.width - 6);
    // Roof.
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(-6, -car.width / 2 + 4, 10, car.width - 8);
    // Taxi checker and sign.
    if (car.type === 'taxi') {
      ctx.fillStyle = '#111111';
      for (let i = 0; i < 4; i += 1) ctx.fillRect(-14 + i * 7, -car.width / 2 + 2, 4, 4);
      ctx.fillStyle = '#ffd34d';
      ctx.fillRect(-4, -3, 8, 6);
    }
    // Police light bar, flashing.
    if (car.type === 'police') {
      const flash = Math.floor(game.time * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#3b82f6';
      ctx.fillRect(-4, -car.width / 2 - 1, 8, 5);
      ctx.fillStyle = flash ? '#3b82f6' : '#ff3b30';
      ctx.fillRect(-4, car.width / 2 - 4, 8, 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, 3);
      ctx.textAlign = 'left';
    }
    // Headlights.
    ctx.fillStyle = '#fff6c9';
    ctx.fillRect(car.length / 2 - 2, -car.width / 2 + 3, 3, 4);
    ctx.fillRect(car.length / 2 - 2, car.width / 2 - 7, 3, 4);
    ctx.restore();
  }

  function drawPed(game, ped) {
    const cam = game.camera;
    const sx = ped.x - cam.x;
    const sy = ped.y - cam.y;
    if (sx < -20 || sx > VIEW_W + 20 || sy < -20 || sy > VIEW_H + 20) return;
    const x = ped.x;
    const y = ped.y;
    const bob = Math.sin(ped.walkPhase) * 1.5;
    ctx.fillStyle = ped.pants;
    ctx.fillRect(x - 4, y + 2 + bob, 8, 7);
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(x + Math.cos(ped.angle) * 3, y + Math.sin(ped.angle) * 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer(game) {
    const p = game.player;
    if (p.dead || p.inCar) return;
    const cam = game.camera;
    const x = p.x - cam.x;
    const y = p.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(p.angle);
    ctx.fillStyle = '#1f9d8a';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(6, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    if (p.hasPistol) {
      ctx.fillStyle = '#222222';
      ctx.fillRect(8, -2, 10, 3);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(p.aimAngle) * 16, y + Math.sin(p.aimAngle) * 16);
    ctx.lineTo(x + Math.cos(p.aimAngle) * 44, y + Math.sin(p.aimAngle) * 44);
    ctx.stroke();
  }

  function drawEntities(game) {
    const cam = game.camera;
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    for (const car of game.vehicles) drawCar(game, car);
    for (const ped of game.peds) drawPed(game, ped);
    const follower = game.missions.follower;
    if (follower && !game.player.inCar) {
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(follower.x, follower.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath();
      ctx.arc(follower.x, follower.y - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of game.enemies) {
      if (e.dead) continue;
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(e.angle) * 4, e.y + Math.sin(e.angle) * 4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222222';
      ctx.fillRect(e.x + Math.cos(e.angle) * 8 - 2, e.y + Math.sin(e.angle) * 8 - 2, 8, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - 12, e.y - 20, 24, 4);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(e.x - 12, e.y - 20, 24 * Math.max(0, e.health / 60), 4);
    }
    ctx.strokeStyle = '#ffe9a3';
    ctx.lineWidth = 3;
    for (const b of game.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const pt of game.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    drawPlayer(game);
  }

  function drawTitle(game) {
    ctx.fillStyle = 'rgba(6, 10, 18, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.fillText(GAME_TITLE, VIEW_W / 2, 210);
    ctx.fillStyle = '#f2f4f6';
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText(GAME_SUBTITLE, VIEW_W / 2, 258);
    ctx.fillStyle = '#9aa4b2';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(`You are ${STORY.player}, getaway driver. ${STORY.fixer} has work for you —`, VIEW_W / 2, 310);
    ctx.fillText(`and ${STORY.villain} owns the city you are about to take back.`, VIEW_W / 2, 336);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(game.hasSave ? '▶  Continue  (Enter)' : '▶  New Game  (Enter)', VIEW_W / 2, 420);
    ctx.fillText('New Game  (N)', VIEW_W / 2, 456);
    ctx.fillStyle = '#c8cdd4';
    ctx.font = '16px system-ui, sans-serif';
    const controls = [
      'WASD / arrows — move or drive    •    Mouse — aim    •    Click — shoot / punch',
      'E — enter or leave a car    •    R — reload    •    Shift — sprint',
      'P — pause    •    M — mute    •    Steal cars, lose the cops, finish all 5 missions',
    ];
    controls.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 540 + i * 28));
    ctx.fillStyle = '#7a828e';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('An original game. No part of it comes from any commercial game.', VIEW_W / 2, 680);
    ctx.textAlign = 'left';
  }

  function drawPaused(game) {
    ctx.fillStyle = 'rgba(6, 10, 18, 0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('PAUSED', VIEW_W / 2, 320);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#c8cdd4';
    ctx.fillText('P / Esc — resume      S — save game      Q — quit to title', VIEW_W / 2, 380);
    ctx.fillText(`Missions done: ${game.missions.done.length} / 5      Money: $${Math.round(game.money)}`, VIEW_W / 2, 420);
    ctx.textAlign = 'left';
  }

  function drawOver(game) {
    ctx.fillStyle = 'rgba(20, 4, 6, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    const busted = game.player.busted;
    ctx.fillStyle = busted ? '#4d8ef7' : '#e5534b';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText(busted ? 'BUSTED' : 'WASTED', VIEW_W / 2, 320);
    ctx.fillStyle = '#f2f4f6';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(busted
      ? 'The Costa Verde police hauled you in. Vera will post bail — for a price.'
      : 'Jax went down in the streets of Costa Verde.', VIEW_W / 2, 372);
    ctx.fillStyle = '#c8cdd4';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(`Money kept: $${Math.round(game.money * 0.5)}      Missions done: ${game.missions.done.length} / 5`, VIEW_W / 2, 420);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Enter — respawn at the hospital', VIEW_W / 2, 480);
    ctx.textAlign = 'left';
  }

  function draw(game, screen) {
    updateCamera(game);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawWorld(game);
    drawEntities(game);
    if (screen === SCREEN_TITLE) drawTitle(game);
    else if (screen === SCREEN_PAUSED) drawPaused(game);
    else if (screen === SCREEN_OVER) drawOver(game);
  }

  return { draw, updateCamera, canvas, ctx };
}
