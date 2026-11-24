// The city of Costa Verde: a grid of streets and blocks, one park block, a
// sandy beach and the sea along the south edge, the marina, and the places
// the story happens. All geometry is generated from the seed, so the city is
// the same for every run with the same seed.
import { WORLD, ROAD_W, BLOCK, PITCH, STORY } from './config.js';

const ROAD_COLORS = ['#7a6a58', '#8a7a68', '#6e7d8a', '#9a8a6a', '#7d6a7a', '#6a8a7a', '#8a6a5c', '#5c7a8a'];
const ROOF_COLORS = ['#a9805e', '#7e9ab0', '#b09a7e', '#8fa07a', '#b07a7a', '#7a8ab0', '#a89a5e', '#96708a'];

function roadBands() {
  const bands = [];
  for (let i = 0; i < 8; i += 1) bands.push(i * PITCH);
  return bands;
}

export function isOnRoad(x, y) {
  for (let i = 0; i < 8; i += 1) {
    const band = i * PITCH;
    if (x >= band && x < band + ROAD_W) return true;
    if (y >= band && y < band + ROAD_W) return true;
  }
  return false;
}

export function roadCenter(i) {
  return i * PITCH + ROAD_W / 2;
}

// The nearest point on a road centreline to (x, y): where traffic drives.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < 8; i += 1) {
    const c = roadCenter(i);
    const d1 = Math.abs(x - c);
    if (d1 < bestDist) {
      bestDist = d1;
      best = { x: c, y };
    }
    const d2 = Math.abs(y - c);
    if (d2 < bestDist) {
      bestDist = d2;
      best = { x, y: c };
    }
  }
  return best;
}

export function createWorld(rng) {
  const roads = roadBands();
  const buildings = [];
  const trees = [];
  const lamps = [];

  // Park block: grid (2, 2) — x 880..1200, y 880..1200.
  const park = { x: 2 * PITCH + ROAD_W, y: 2 * PITCH + ROAD_W, w: BLOCK, h: BLOCK };
  // Waterfront: beach from y 2880, sea from y 2960 to the edge.
  const beach = { x: 0, y: 7 * PITCH + ROAD_W, w: WORLD, h: ROAD_W };
  const sea = { x: 0, y: 7 * PITCH + ROAD_W + ROAD_W, w: WORLD, h: WORLD - (7 * PITCH + 2 * ROAD_W) };

  for (let bx = 0; bx < 7; bx += 1) {
    for (let by = 0; by < 7; by += 1) {
      if (bx === 2 && by === 2) continue; // the park
      if (by === 6) continue; // the beachfront row stays open
      const x0 = bx * PITCH + ROAD_W;
      const y0 = by * PITCH + ROAD_W;
      const count = rng.int(1, 2);
      for (let b = 0; b < count; b += 1) {
        const w = rng.range(110, 190);
        const h = rng.range(100, 170);
        const x = x0 + 14 + rng.range(0, Math.max(1, BLOCK - w - 28));
        const y = y0 + 14 + rng.range(0, Math.max(1, BLOCK - h - 28));
        buildings.push({
          x, y, w, h,
          color: rng.pick(ROOF_COLORS),
          edge: rng.pick(ROAD_COLORS),
          windows: rng.int(2, 4),
          label: rng.chance(0.3),
        });
      }
    }
  }

  // Trees in the park and along the beach.
  for (let i = 0; i < 26; i += 1) {
    trees.push({
      x: park.x + rng.range(20, park.w - 20),
      y: park.y + rng.range(20, park.h - 20),
      r: rng.range(10, 16),
    });
  }
  for (let i = 0; i < 14; i += 1) {
    trees.push({ x: rng.range(60, WORLD - 60), y: beach.y + 40 + rng.range(0, 20), r: rng.range(9, 14) });
  }
  // Street lamps at intersections.
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      lamps.push({ x: roadCenter(i) + 46, y: roadCenter(j) + 46 });
    }
  }

  // Story places, all on roads so cars can reach them.
  const places = {
    safehouse: { x: roadCenter(1), y: roadCenter(5), name: STORY.safehouse },
    docks: { x: roadCenter(0), y: roadCenter(3), name: STORY.docks },
    marina: { x: roadCenter(4), y: roadCenter(7), name: STORY.marina },
    plaza: { x: roadCenter(3), y: roadCenter(0), name: STORY.plaza },
    clinic: { x: roadCenter(5), y: roadCenter(2), name: STORY.clinic },
    warehouse: { x: roadCenter(6), y: roadCenter(5), name: STORY.warehouse },
    garage: { x: roadCenter(2), y: roadCenter(6), name: STORY.garage },
    parkGate: { x: park.x + park.w / 2, y: park.y + park.h + 20, name: STORY.park },
  };

  function buildingAt(x, y, pad) {
    for (let i = 0; i < buildings.length; i += 1) {
      const b = buildings[i];
      if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
    }
    return null;
  }

  function blocked(x, y, pad) {
    if (x < 10 || y < 10 || x > WORLD - 10 || y > WORLD - 10) return true;
    if (y >= sea.y) return true;
    return buildingAt(x, y, pad) !== null;
  }

  // Push a circle out of buildings and the sea; returns the corrected point.
  function resolveCircle(x, y, radius) {
    const b = buildingAt(x, y, radius);
    if (b) {
      const left = b.x - radius;
      const right = b.x + b.w + radius;
      const top = b.y - radius;
      const bottom = b.y + b.h + radius;
      const dxLeft = x - left;
      const dxRight = right - x;
      const dyTop = y - top;
      const dyBottom = bottom - y;
      const min = Math.min(dxLeft, dxRight, dyTop, dyBottom);
      if (min === dxLeft) x = left;
      else if (min === dxRight) x = right;
      else if (min === dyTop) y = top;
      else y = bottom;
    }
    if (y > sea.y - radius) y = sea.y - radius;
    if (x < radius) x = radius;
    if (y < radius) y = radius;
    if (x > WORLD - radius) x = WORLD - radius;
    return { x, y };
  }

  return {
    roads, buildings, trees, lamps, park, beach, sea, places,
    isOnRoad, roadCenter, nearestRoadPoint,
    buildingAt, blocked, resolveCircle,
  };
}
