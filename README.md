# Costa Verde

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![rank](https://make.fun/badge/gta6-01/mrblack193/gta6/rank.svg)](https://make.fun/competitions/gta6-01)
[![reward](https://make.fun/badge/gta6-01/mrblack193/gta6/reward.svg)](https://make.fun/competitions/gta6-01)

An original 2D top-down open-world crime game, built for the make.fun
["Make GTA 6"](https://make.fun/competitions/gta6-01) bounty. No libraries, no
network requests — plain HTML canvas and JavaScript, everything drawn in code.

You are **Jax Marlow**, a getaway driver in the coastal city of **Costa Verde**.
Fixer **Vera Kline** has work for you; **Donovan Marsh** owns the docks and
wants you gone. Steal cars, outrun the Verde City police, and run five story
missions — a timed getaway, a rush-hour delivery, a rescue in Verde Park, a
marina heist, and a final showdown at Marsh's warehouse.

## Play

Serve the game locally, then open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` directly from any static file server.

## Controls

| Key | Action |
| --- | --- |
| W / A / S / D | Walk / drive (W accelerates, S brakes and reverses) |
| Mouse | Aim (on foot) |
| Left click | Shoot the pistol (R reloads, F punch) |
| E | Enter / exit a car, steal a parked or driven car, talk / advance dialogue |
| P | Pause (S save, Q quit to the title screen) |
| M | Mute sound |

## Features

- A city to explore on foot and by car: grid streets, blocks, buildings, sidewalks, Verde Park, and a beachfront with a marina.
- Traffic AI driving on the roads, pedestrians walking the sidewalks and fleeing danger.
- Five vehicle types with different speed and handling: sedan, taxi, truck, sports car, police car.
- Wanted level 1–5 stars: patrol cars chase and ram, roadblocks appear at 3+ stars; lose the heat by hiding or outrunning them.
- Five story missions with objectives, dialogue, and money rewards, shown on the HUD with a marker and distance.
- Combat: fists and pistol with ammo and reload, enemies with health, player health and respawn.
- HUD: health, money, wanted stars, minimap (player, cars, police, mission marker), objective, speed while driving.
- Start screen with New Game / Continue, pause menu, game over (BUSTED / WASTED) with respawn at the clinic, and save / load in localStorage.
- Synthesized WebAudio sound effects (engine, siren, gunshot, crash, pickup) and a music loop — no audio files.

## Files

- `game/` — the game: `index.html` plus ES modules under `game/src/` (one file per system: `world.js`, `vehicles.js`, `player.js`, `pedestrians.js`, `combat.js`, `police.js`, `missions.js`, `hud.js`, `render.js`, `update.js`, `audio.js`, `input.js`, `save.js`, `config.js`, `random.js`, `shots.js`, `main.js`).
- `screenshots/` — four real renders of the game.
- `main.ts` — copies `game/` and `screenshots/` to the output directory and writes `dossier.json` via the vendored make.fun library.
