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

**Trail assist** hides a ~20 cm rail so the bike stays on the singletrack. **Pro** turns it off.

## Stack

TypeScript, Vite, Three.js. Simulation is *not* in React. Physics is custom raycast suspension + Pacejka-lite on the same height channel as the terrain mesh.

## Verify

```bash
npm run build
npm run inspect:canvas -- --url http://127.0.0.1:5188 --state active-play
```
