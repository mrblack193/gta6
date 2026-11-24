// The HUD: health, money, wanted stars, ammo, the mission objective, the
// minimap, and the dialogue and toast boxes. All drawn in screen space.
import { VIEW_W, VIEW_H, WORLD, PLAYER, STORY } from './config.js';

const MINIMAP = 196;

function drawStars(ctx, stars, x, y) {
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? '#ffd34d' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    const sx = x + i * 30;
    ctx.strokeText('★', sx, y);
    ctx.fillText('★', sx, y);
  }
}

function drawMinimap(game, ctx) {
  const x0 = VIEW_W - MINIMAP - 16;
  const y0 = VIEW_H - MINIMAP - 16;
  const scale = MINIMAP / WORLD;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 24, 0.82)';
  ctx.fillRect(x0 - 6, y0 - 6, MINIMAP + 12, MINIMAP + 12);
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 - 6, y0 - 6, MINIMAP + 12, MINIMAP + 12);
  ctx.beginPath();
  ctx.rect(x0, y0, MINIMAP, MINIMAP);
  ctx.clip();
  // Water and beach along the south edge.
  ctx.fillStyle = '#2f7fb5';
  ctx.fillRect(x0, y0 + game.world.sea.y * scale, MINIMAP, MINIMAP);
  ctx.fillStyle = '#e6d49a';
  ctx.fillRect(x0, y0 + game.world.beach.y * scale, MINIMAP, game.world.beach.h * scale);
  // Roads.
  ctx.fillStyle = '#565d68';
  for (let i = 0; i < 8; i += 1) {
    const c = i * 400 + 40;
    ctx.fillRect(x0, y0 + (c - 40) * scale, MINIMAP, 80 * scale);
    ctx.fillRect(x0 + (c - 40) * scale, y0, 80 * scale, MINIMAP);
  }
  // Park.
  ctx.fillStyle = '#5da244';
  ctx.fillRect(x0 + game.world.park.x * scale, y0 + game.world.park.y * scale, game.world.park.w * scale, game.world.park.h * scale);
  // Mission marker: a pulsing gold diamond.
  const marker = game.missions.marker || game.startMarker;
  if (marker) {
    const pulse = 5 + Math.sin(game.time * 5) * 2;
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(x0 + marker.x * scale, y0 + marker.y * scale - pulse);
    ctx.lineTo(x0 + marker.x * scale + pulse, y0 + marker.y * scale);
    ctx.lineTo(x0 + marker.x * scale, y0 + marker.y * scale + pulse);
    ctx.lineTo(x0 + marker.x * scale - pulse, y0 + marker.y * scale);
    ctx.closePath();
    ctx.fill();
  }
  // Traffic as grey dots, police as blue flashing dots, thugs as red dots.
  ctx.fillStyle = '#c8cdd4';
  for (const car of game.vehicles) {
    if (car.driver !== 'traffic') continue;
    ctx.fillRect(x0 + car.x * scale - 1.5, y0 + car.y * scale - 1.5, 3, 3);
  }
  ctx.fillStyle = Math.floor(game.time * 4) % 2 === 0 ? '#4d8ef7' : '#ff5a5a';
  for (const car of game.police.cars) {
    ctx.beginPath();
    ctx.arc(x0 + car.x * scale, y0 + car.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff5a5a';
  for (const e of game.enemies) {
    if (e.dead) continue;
    ctx.fillRect(x0 + e.x * scale - 2, y0 + e.y * scale - 2, 4, 4);
  }
  // The player: a white arrow that turns with them.
  const p = game.player;
  ctx.save();
  ctx.translate(x0 + p.x * scale, y0 + p.y * scale);
  ctx.rotate(p.inCar && p.car ? p.car.angle : p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Viewport rectangle.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + game.camera.x * scale, y0 + game.camera.y * scale, VIEW_W * scale, VIEW_H * scale);
  ctx.restore();
}

function drawDialogue(game, ctx) {
  const d = game.dialogue;
  if (!d) return;
  const line = d.lines[d.index];
  const w = 760;
  const h = 92;
  const x = (VIEW_W - w) / 2;
  const y = VIEW_H - h - 24;
  ctx.fillStyle = 'rgba(8, 12, 20, 0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(d.speaker, x + 18, y + 12);
  ctx.fillStyle = '#f2f4f6';
  ctx.font = '16px system-ui, sans-serif';
  wrapText(ctx, line, x + 18, y + 38, w - 36, 21);
  ctx.fillStyle = '#9aa4b2';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('E / click — continue', x + w - 14, y + h - 20);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

export function drawHud(game, ctx) {
  const p = game.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left: health bar, money, ammo.
  ctx.fillStyle = 'rgba(8, 12, 20, 0.72)';
  ctx.fillRect(14, 14, 250, 74);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(14, 14, 250, 74);
  ctx.fillStyle = '#e5534b';
  ctx.fillRect(26, 26, 150, 14);
  ctx.fillStyle = '#7ed957';
  ctx.fillRect(26, 26, 150 * Math.max(0, p.health / PLAYER.health), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HP ${Math.ceil(p.health)}`, 184, 38);
  ctx.fillStyle = '#7ed957';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`$${Math.round(game.money)}`, 26, 66);
  if (p.hasPistol) {
    ctx.fillStyle = p.reloading > 0 ? '#ffd34d' : '#ffffff';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(p.reloading > 0 ? 'Reloading…' : `Ammo ${p.ammo} / ${p.reserveAmmo}`, 120, 66);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Fists', 120, 66);
  }
  // Top-right: wanted stars.
  drawStars(ctx, game.police.stars, VIEW_W - 176, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(game.police.stars > 0 ? 'WANTED' : 'CLEAN', VIEW_W - 26, 58);
  ctx.textAlign = 'left';
  // Bottom-left: objective.
  const objective = game.missions.objective || (game.missions.done.length >= 5
    ? 'Costa Verde is yours. Free roam — cause chaos or cruise the beach.'
    : `Next: ${game.nextMissionTitle || 'find the gold marker'}`);
  const marker = game.missions.marker || game.startMarker;
  let objectiveLine = objective;
  if (marker) {
    // The world is 3200 units across; call 10 units a metre for the readout.
    const d = Math.round(Math.hypot(p.x - marker.x, p.y - marker.y) / 10);
    objectiveLine += `  •  ${d}m`;
  }
  ctx.fillStyle = 'rgba(8, 12, 20, 0.72)';
  const ow = Math.min(560, 24 + ctx.measureText(objectiveLine).width);
  ctx.fillRect(14, VIEW_H - 58, ow, 44);
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, VIEW_H - 58, ow, 44);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('OBJECTIVE', 26, VIEW_H - 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(objectiveLine, 26, VIEW_H - 24);
  // Speed when driving.
  if (p.inCar && p.car) {
    const mph = Math.round(Math.abs(p.car.speed) * 0.14);
    ctx.fillStyle = 'rgba(8, 12, 20, 0.72)';
    ctx.fillRect(VIEW_W - 240, VIEW_H - 58, 210, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${mph} mph`, VIEW_W - 40, VIEW_H - 28);
    ctx.textAlign = 'left';
  }
  // Toasts, newest on top.
  ctx.textAlign = 'center';
  let ty = 108;
  for (const toast of game.toasts) {
    const alpha = Math.min(1, toast.life / 0.8);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8, 12, 20, 0.8)';
    const tw = ctx.measureText(toast.text).width + 28;
    ctx.fillRect((VIEW_W - tw) / 2, ty, tw, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(toast.text, VIEW_W / 2, ty + 20);
    ctx.globalAlpha = 1;
    ty += 36;
  }
  ctx.textAlign = 'left';
  drawMinimap(game, ctx);
  drawDialogue(game, ctx);
  // Mute + controls hint.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`M — ${game.audio.muted ? 'unmute' : 'mute'}   •   P — pause   •   E — enter/exit car`, 16, VIEW_H - 66);
}
