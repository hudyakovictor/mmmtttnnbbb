# FALL LINE

Whistler-class downhill mountain bike game in the browser. Corridor of speed: spline trail, shared heightfield, raycast DH bike, alpine pine walls.

## Play

```bash
npm install
npm run dev
```

Open the preview URL. **RIDE** to drop in.

| Input | Action |
| --- | --- |
| A / D or arrows | Steer / lean |
| S / Down | Brake |
| Space (hold / release) | Bunny hop preload / pop |
| Esc | Pause |
| R | Restart |
| Touch | Stick, BRAKE, HOP |

**Trail assist** pulls the bike along the spline like a hidden rail. **Pro** turns it off and rides the pure physics — steer, brake and lean or eat a pine tree.

## What is in the box

- **One height channel** feeds the terrain mesh *and* the wheel rays — the bike can't float above the texture. Spline-interpolated bed, banked cross-section, whoops/roots micro-relief, a river cut you ride through (MUD).
- **Raycast DH bike**: two pitched-frame wheel rays, fork/rear spring + bump/rebound, Pacejka-lite long/lat slip, brake lockup, bunny hop with preload, speed-shrinking steer range.
- **Fail-state, not a clip**: crash → capsule-chain ragdoll with the bike's momentum, bike keeps its inertia, camera stays on the rider, sector retry.
- **Runtime sockets**: two-bone IK hands on grips and feet on pedals every frame; crouch on brake/air/hop; visual fork/shock follow the sim.
- **Atmosphere**: analytic sky, ACES, cloud shadows with wind drift, wind motes, instanced pines/bushes/ferns/rocks, animated river, fog closer than "pretty".
- **Camera**: chase with spline lookahead, FOV(speed), lean roll, trauma + fork-compression shake, air pull-back, crash follow-cam.
- **Audio graph** from the sim: wind(airspeed), tire roll(contact), skid(slip — heard before seen), freewheel, breathing, impacts, checkpoints.
- **Quality tiers** low/med/high (DPR, shadows, density, grass, post). Physics is identical on every GPU.
- High tier post: camera-velocity afterimage + RGB shift on impacts + vignette. No fat bloom.

## Stack

TypeScript, Vite, Three.js r184. Simulation is *not* in React. Physics is custom raycast suspension + Pacejka-lite on the same height channel as the terrain mesh.

## Verify

```bash
npm run build          # strict tsc + vite
npm run sim:smoke      # deterministic Node smoke: track/sim/ragdoll/IK
npm run inspect:canvas -- --url http://127.0.0.1:5188 --state active-play   # needs Playwright chromium
npm test               # Playwright visual + bot playtest (needs chromium)
```

Docs: [20 analyses](docs/ANALYSES.md) (all repo versions compared, scored 0–100) and the [500-factor audit](docs/SCORE-500.md) — current score **95.4 / 100**.
