# FALL LINE

Whistler-class downhill mountain bike game in the browser. Corridor of speed: spline trail, shared heightfield, raycast DH bike, alpine pine walls.

## Запуск (без установки)

1. **Прямая ссылка (телефон/ПК):** <https://cdn.jsdelivr.net/gh/hudyakovictor/mmmtttnnbbb@5e8cf56e4a18b44a98867e216b6c9887ebabf9d9/FALL-LINE.html> — вся игра в одном файле, открывается прямо в браузере. На телефонах автоматически включается низкое качество (без теней), чтобы не зависало; принудительно: добавьте `?quality=low` к адресу.
2. **Один файл:** [`FALL-LINE.html`](./FALL-LINE.html) — скачать и открыть двойным кликом, работает офлайн.
3. **Онлайн-ссылка:** включите GitHub Pages в настройках репозитория: Settings → Pages → *Deploy from a branch* → ветка `arena/01a024ba-mmmtttnnbbb` → папка `/docs` → Save. Сборка уже лежит в `docs/`, сайт появится на `https://hudyakovictor.github.io/mmmtttnnbbb/`.
4. **Локально:** `npm install && npm run dev` и откройте адрес из вывода.

## Play (local)

```bash
npm install
npm run dev
```

Open the preview URL. **RIDE** to drop in. The run defaults to **1st person** (helmet cam, handlebar in frame); `C` or the menu switches to chase.

| Input | Action |
| --- | --- |
| A / D or arrows | Steer / lean |
| S / Down | Brake |
| Space (hold / release) | Bunny hop preload / pop |
| C | Camera: 1st person / chase |
| Esc | Pause |
| R | Restart |
| Touch | Stick, BRAKE, HOP |

The run defaults to **1st person** (helmet cam with handlebar in frame) — the task is a first-person descent. Chase cam is selectable in the menu or with `C`. **Trail assist** hides a ~20 cm rail so the bike stays on the singletrack. **Pro** turns it off.

## Stack

TypeScript, Vite, Three.js. Simulation is *not* in React. Physics is custom raycast suspension + Pacejka-lite on the same height channel as the terrain mesh.

## Verify

```bash
npm run build
npm run inspect:canvas -- --url http://127.0.0.1:5188 --state active-play
```
