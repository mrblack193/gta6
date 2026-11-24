// Keyboard and mouse state, read once a frame. Actions are edge-triggered:
// takeActions returns the ones pressed since the last read, then clears them.
import { KEYS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_RELOAD = 8;
export const ACTION_MUTE = 16;
export const ACTION_CLICK = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  const mouse = { x: 0, y: 0, down: false };

  function codeToAction(code) {
    if (KEYS.confirm.includes(code)) return ACTION_CONFIRM;
    if (KEYS.pause.includes(code)) return ACTION_PAUSE;
    if (KEYS.enterCar.includes(code)) return ACTION_ENTER;
    if (KEYS.reload.includes(code)) return ACTION_RELOAD;
    if (KEYS.mute.includes(code)) return ACTION_MUTE;
    return 0;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) actions |= codeToAction(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouse.down = true;
      actions |= ACTION_CLICK;
    }
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  // Touch: tap to confirm on menus, drag to aim on foot.
  canvas.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((touch.clientY - rect.top) / rect.height) * canvas.height;
    mouse.down = true;
    actions |= ACTION_CLICK;
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => {
    mouse.down = false;
  });

  function held(list) {
    return list.some((code) => keys.has(code));
  }

  return {
    mouse,
    direction() {
      let x = 0;
      let y = 0;
      if (held(KEYS.left)) x -= 1;
      if (held(KEYS.right)) x += 1;
      if (held(KEYS.up)) y -= 1;
      if (held(KEYS.down)) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    sprinting() {
      return held(KEYS.sprint);
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
