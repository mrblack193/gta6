// The story: five missions from fixer Vera Kline, from a getaway drive to
// the showdown with Donovan Marsh. Each mission is a small state machine:
// stages with an objective, a marker, a timer where the story needs one,
// and a reward when it lands.
import { MISSION_REWARDS, STORY } from './config.js';
import { createThug } from './combat.js';
import { spawnParkedCar } from './vehicles.js';

export function createMissions() {
  return {
    index: 0,
    done: [],
    active: false,
    stage: 0,
    timer: 0,
    timerMax: 0,
    marker: null,
    objective: '',
    title: '',
    wave: 0,
    thugsLeft: 0,
    targetCar: null,
    follower: null,
  };
}

function setMarker(game, x, y, label) {
  game.missions.marker = { x, y, label };
}

function say(game, speaker, lines) {
  game.dialogue = { speaker, lines, index: 0 };
}

function setObjective(game, text) {
  game.missions.objective = text;
}

function spawnThugs(game, cx, cy, count, spread) {
  const thugs = [];
  for (let i = 0; i < count; i += 1) {
    const x = cx + game.rng.range(-spread, spread);
    const y = cy + game.rng.range(-spread, spread);
    const fixed = game.world.resolveCircle(x, y, 12);
    const thug = createThug(game, fixed.x, fixed.y);
    game.enemies.push(thug);
    thugs.push(thug);
  }
  return thugs;
}

function thugsAlive(game) {
  return game.enemies.filter((e) => !e.dead).length;
}

const MISSIONS = [
  {
    id: 0,
    title: 'The Getaway',
    start(game) {
      const m = game.missions;
      m.stage = 0;
      m.title = 'The Getaway';
      const docks = game.world.places.docks;
      setMarker(game, docks.x, docks.y, STORY.docks);
      setObjective(game, `Meet Tico at ${STORY.docks}`);
      say(game, STORY.fixer, [
        'Jax. Marsh’s crew grabbed my driver, and the docks are crawling.',
        'Pick up Tico at Solano Docks and get him to the Palm Row Safehouse.',
        'Drive fast, keep it clean, and don’t stop for anyone.',
      ]);
    },
    update(game, dt) {
      const m = game.missions;
      const p = game.player;
      if (m.stage === 0) {
        const d = game.world.places.docks;
        if (Math.hypot(p.x - d.x, p.y - d.y) < 70) {
          m.stage = 1;
          m.timerMax = 90;
          m.timer = 90;
          const safe = game.world.places.safehouse;
          setMarker(game, safe.x, safe.y, STORY.safehouse);
          setObjective(game, `Drive Tico to ${STORY.safehouse} — 90s`);
          game.police.addWanted(game, 1);
          say(game, 'Tico', [
            'Jax! They’re right behind us — go, go, GO!',
            'Safehouse on Palm Row. Lose the cops on the way.',
          ]);
        }
      } else if (m.stage === 1) {
        m.timer -= dt;
        setObjective(game, `Drive Tico to ${STORY.safehouse} — ${Math.max(0, Math.ceil(m.timer))}s`);
        const safe = game.world.places.safehouse;
        if (Math.hypot(p.x - safe.x, p.y - safe.y) < 70) {
          completeMission(game, 'Tico’s safe. Vera’s pleased — and she pays well.');
        } else if (m.timer <= 0) {
          failMission(game, 'Too slow — Tico got caught. Vera will call again.');
        }
      }
    },
  },
  {
    id: 1,
    title: 'Rush Hour',
    start(game) {
      const m = game.missions;
      m.stage = 0;
      m.title = 'Rush Hour';
      const garage = game.world.places.garage;
      setMarker(game, garage.x, garage.y, STORY.garage);
      setObjective(game, `Pick up the package at ${STORY.garage}`);
      say(game, STORY.fixer, [
        'A package needs to reach North Plaza. No questions, no stops.',
        'Grab it at Reyes Garage. The clock starts when you do.',
      ]);
    },
    update(game, dt) {
      const m = game.missions;
      const p = game.player;
      if (m.stage === 0) {
        const g = game.world.places.garage;
        if (Math.hypot(p.x - g.x, p.y - g.y) < 70) {
          m.stage = 1;
          m.timerMax = 75;
          m.timer = 75;
          const plaza = game.world.places.plaza;
          setMarker(game, plaza.x, plaza.y, STORY.plaza);
          setObjective(game, `Deliver the package to ${STORY.plaza} — 75s`);
          say(game, 'Vera Kline', ['Package is in the car. Seventy-five seconds, Jax.']);
        }
      } else if (m.stage === 1) {
        m.timer -= dt;
        setObjective(game, `Deliver the package to ${STORY.plaza} — ${Math.max(0, Math.ceil(m.timer))}s`);
        const plaza = game.world.places.plaza;
        if (Math.hypot(p.x - plaza.x, p.y - plaza.y) < 70) {
          completeMission(game, 'Delivered with seconds to spare. The client is happy.');
        } else if (m.timer <= 0) {
          failMission(game, 'Too late — the client walked. The package is worthless now.');
        }
      }
    },
  },
  {
    id: 2,
    title: 'Park Rescue',
    start(game) {
      const m = game.missions;
      m.stage = 0;
      m.title = 'Park Rescue';
      const gate = game.world.places.parkGate;
      setMarker(game, gate.x, gate.y, STORY.park);
      setObjective(game, `Reach ${STORY.park}`);
      say(game, 'Mara', [
        'Jax, it’s Mara. Tico’s pinned down in Verde Park — Marsh’s thugs.',
        'Get in there and clear them out. He’s hurt, so bring him to St. Clara after.',
      ]);
    },
    update(game, dt) {
      const m = game.missions;
      const p = game.player;
      if (m.stage === 0) {
        const gate = game.world.places.parkGate;
        if (Math.hypot(p.x - gate.x, gate.y - gate.y) < 80) {
          m.stage = 1;
          const park = game.world.park;
          spawnThugs(game, park.x + park.w / 2, park.y + park.h / 2, 4, 110);
          setMarker(game, park.x + park.w / 2, park.y + park.h / 2, STORY.park);
          setObjective(game, 'Clear the thugs from Verde Park (0/4 down)');
          say(game, 'Tico', ['Jax! Over here! There are four of them!']);
        }
      } else if (m.stage === 1) {
        const left = thugsAlive(game);
        setObjective(game, `Clear the thugs from Verde Park (${4 - left}/4 down)`);
        if (left === 0) {
          m.stage = 2;
          m.follower = { x: p.x + 20, y: p.y + 20 };
          const clinic = game.world.places.clinic;
          setMarker(game, clinic.x, clinic.y, STORY.clinic);
          setObjective(game, `Take Tico to ${STORY.clinic}`);
          say(game, 'Tico', ['Thanks, man. My leg’s busted — clinic, quick.']);
        }
      } else if (m.stage === 2) {
        const clinic = game.world.places.clinic;
        if (Math.hypot(p.x - clinic.x, p.y - clinic.y) < 80) {
          m.follower = null;
          completeMission(game, 'Tico’s patched up. Vera owes you one — and she knows it.');
        }
      }
    },
  },
  {
    id: 3,
    title: 'Marina Heist',
    start(game) {
      const m = game.missions;
      m.stage = 0;
      m.title = 'Marina Heist';
      const marina = game.world.places.marina;
      setMarker(game, marina.x, marina.y, STORY.marina);
      setObjective(game, `Reach ${STORY.marina}`);
      say(game, STORY.fixer, [
        'Marsh just unloaded a custom sports car at Marina Bay.',
        'Two of his guards watch it. Take the car — and take it quietly, or not at all.',
      ]);
    },
    update(game, dt) {
      const m = game.missions;
      const p = game.player;
      if (m.stage === 0) {
        const marina = game.world.places.marina;
        if (Math.hypot(p.x - marina.x, p.y - marina.y) < 90) {
          m.stage = 1;
          const car = spawnParkedCar(game, 'sports', marina.x + 60, marina.y - 40, Math.PI / 2);
          m.targetCar = car;
          spawnThugs(game, marina.x + 60, marina.y - 40, 2, 60);
          setMarker(game, car.x, car.y, 'Sports car');
          setObjective(game, 'Steal the sports car at Marina Bay');
        }
      } else if (m.stage === 1) {
        if (p.inCar && p.car === m.targetCar) {
          m.stage = 2;
          game.police.setStars(game, 3);
          const garage = game.world.places.garage;
          setMarker(game, garage.x, garage.y, STORY.garage);
          setObjective(game, `Deliver the sports car to ${STORY.garage}`);
          say(game, 'Vera Kline', ['That’s the one! Three stars and counting — get it to Reyes Garage.']);
        }
      } else if (m.stage === 2) {
        const garage = game.world.places.garage;
        if (p.inCar && p.car === m.targetCar && Math.hypot(p.x - garage.x, p.y - garage.y) < 80) {
          completeMission(game, 'The sports car is Vera’s now. Marsh is going to be furious.');
        }
      }
    },
  },
  {
    id: 4,
    title: 'The Showdown',
    start(game) {
      const m = game.missions;
      m.stage = 0;
      m.title = 'The Showdown';
      const wh = game.world.places.warehouse;
      setMarker(game, wh.x, wh.y, STORY.warehouse);
      setObjective(game, `Go to ${STORY.warehouse}`);
      say(game, STORY.fixer, [
        'This ends tonight, Jax. Marsh is at his warehouse with his whole crew.',
        'Take them all down, then get out. Whatever happens — you did good.',
      ]);
    },
    update(game, dt) {
      const m = game.missions;
      const p = game.player;
      if (m.stage === 0) {
        const wh = game.world.places.warehouse;
        if (Math.hypot(p.x - wh.x, p.y - wh.y) < 90) {
          m.stage = 1;
          m.wave = 1;
          spawnThugs(game, wh.x, wh.y, 4, 120);
          setMarker(game, wh.x, wh.y, STORY.warehouse);
          setObjective(game, 'Survive Marsh’s men — wave 1');
        }
      } else if (m.stage === 1) {
        const left = thugsAlive(game);
        setObjective(game, `Survive Marsh’s men — wave ${m.wave} (${left} left)`);
        if (left === 0 && m.wave === 1) {
          m.wave = 2;
          const wh = game.world.places.warehouse;
          spawnThugs(game, wh.x, wh.y, 4, 120);
          say(game, 'Donovan Marsh', ['You think this is over? I own this city, Marlow!']);
        } else if (left === 0 && m.wave === 2) {
          m.stage = 2;
          const safe = game.world.places.safehouse;
          setMarker(game, safe.x, safe.y, STORY.safehouse);
          setObjective(game, `Escape to ${STORY.safehouse}`);
          say(game, 'Vera Kline', ['It’s done. Marsh’s crew is finished. Get to the safehouse, Jax.']);
        }
      } else if (m.stage === 2) {
        const safe = game.world.places.safehouse;
        if (Math.hypot(p.x - safe.x, p.y - safe.y) < 80) {
          completeMission(game, 'Marsh is done. Costa Verde is yours now, Jax — drive into the sunset.');
        }
      }
    },
  },
];

export function startMission(game, index) {
  const m = game.missions;
  m.index = index;
  m.active = true;
  m.stage = 0;
  m.timer = 0;
  m.timerMax = 0;
  m.wave = 0;
  m.targetCar = null;
  m.follower = null;
  MISSIONS[index].start(game);
  game.audio.pickup();
}

export function updateMissions(game, dt) {
  const m = game.missions;
  if (!m.active) return;
  // The follower rides with Jax or trails him on foot.
  if (m.follower) {
    const p = game.player;
    if (p.inCar) {
      m.follower.x = p.x;
      m.follower.y = p.y;
    } else {
      const dx = p.x - m.follower.x;
      const dy = p.y - m.follower.y;
      const d = Math.hypot(dx, dy);
      if (d > 46) {
        const step = Math.min(d, 150 * dt);
        const fixed = game.world.resolveCircle(m.follower.x + (dx / d) * step, m.follower.y + (dy / d) * step, 9);
        m.follower.x = fixed.x;
        m.follower.y = fixed.y;
      }
    }
  }
  MISSIONS[m.index].update(game, dt);
}

export function completeMission(game, note) {
  const m = game.missions;
  const reward = MISSION_REWARDS[m.index];
  game.money += reward;
  m.done.push(m.index);
  m.active = false;
  m.marker = null;
  m.objective = '';
  game.police.setStars(game, 0);
  game.audio.missionDone();
  game.toast(`Mission complete! +$${reward}`);
  if (note) game.toast(note);
  if (m.index < MISSIONS.length - 1) {
    game.toast(`Next mission: ${MISSIONS[m.index + 1].title} — find the marker.`);
  }
}

export function failMission(game, reason) {
  const m = game.missions;
  m.active = false;
  m.marker = null;
  m.objective = '';
  m.follower = null;
  game.audio.fail();
  game.toast(`Mission failed: ${reason}`);
}

export function missionCount() {
  return MISSIONS.length;
}

export function missionTitle(index) {
  return MISSIONS[index].title;
}

export function nextMissionIndex(game) {
  for (let i = 0; i < MISSIONS.length; i += 1) {
    if (!game.missions.done.includes(i)) return i;
  }
  return -1;
}

// The marker a player walks or drives into to start the next mission.
export function startMarkerFor(game) {
  const next = nextMissionIndex(game);
  if (next === -1) return null;
  const spots = [
    game.world.places.docks,
    game.world.places.garage,
    game.world.places.parkGate,
    game.world.places.marina,
    game.world.places.warehouse,
  ];
  return { ...spots[next], missionIndex: next, label: MISSIONS[next].title };
}
