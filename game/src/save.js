// Save and load through localStorage: money, missions finished, the player's
// place and health, and the pistol. The wanted level never saves — a fresh
// visit starts clean.
import { SAVE_KEY } from './config.js';

export function saveGame(game) {
  const data = {
    money: Math.round(game.money),
    missionsDone: game.missions.done.slice(),
    missionIndex: game.missions.index,
    px: Math.round(game.player.x),
    py: Math.round(game.player.y),
    health: Math.round(game.player.health),
    ammo: game.player.ammo,
    hasPistol: game.player.hasPistol,
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}
