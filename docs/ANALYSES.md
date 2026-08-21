# 20 analyses — merge the best into FALL LINE

Compared: zip versions in this repo, Terrain Rider / Summit Rush / Eternal Ride notes, and `threejs-game-skills`.

1. **Repo versions are the wrong genre.** v1/v2 are 360° detective React apps; v3 is an empty Next/Postgres stub; v4 is an empty Vite shell. None contain a DH loop. Keep only their *stack lesson*: Vite+TS ships faster than Next for a WebGL game.
2. **Skills repo vs detective shells.** `threejs-game-skills` wants vanilla Vite + Three modules, sim outside React, test hooks, scorecard. Detective zips put Three inside React. **Winner: vanilla loop, React only if UI-config needs it. We did not use React.**
3. **Open world vs corridor of speed.** Full Alps are a lie at 60fps. Terrain Rider / the brief: spline corridor + local height + cheap far ridges. **Winner: authored spline ribbon ~1.3 km.**
4. **Physics engine.** Rapier is the skills default for vehicles; arcade DH wants authored feel (raycast suspension, not hinge chains). Keys for Tripo/GLB missing anyway. **Winner: custom raycast + shared height channel, reported as custom-raycast-heightfield.**
5. **Bike body.** One rigid body + two wheel rays beats frame–fork–rim joints. Visual fork/shock follow compression so the picture does not lie.
6. **Balance.** Scripted gyro is fake; raw lean is unplayable on web. **Winner: PID lean to a speed-scaled target + berm probes; 20 cm rail on Assist, off on Pro.**
7. **Tires.** Speed-threshold “drift animation” is rejected. Simplified Pacejka (long/lat slip, load, surface table) drives brake lock, dust, and audio.
8. **Crash.** Not a clip. Fail-state: bike keeps inertia, rider pose breaks, camera stays, sector retry.
9. **Bunny hop.** Hold = preload, release = up-axis impulse + pitch. Space is hop, S is brake.
10. **Ground.** Not a pretty alp. One height function feeds mesh vertex Y *and* wheel rays. No vertex displacement without CPU sample.
11. **Location.** Whistler-class: steep, narrow, berms, roots, chairlift reset landmark, finish gate. Alpine pine + dirt/rock, not snow (hides micro-relief) or desert (no corridor walls).
12. **Biome readability.** Trees are walls. Instanced pines with wind sway matter more than a horizon forest.
13. **Shaders.** Custom terrain blend (dirt / packed / rock) via `onBeforeCompile` + vertex trail/rock/AO. Bike uses cookbook PBR roles (paint, rubber, trim, cloth, glass).
14. **Atmosphere.** Gradient sky + ACES + fog closer than “pretty” to hide far LOD. No fat bloom. High tier: vignette only.
15. **Camera.** Chase + spline lookahead analog (forward look), FOV(speed), roll(lean), trauma shake from impacts/fork, air pull-back.
16. **Audio.** ElevenLabs missing. Procedural layers: wind(airspeed), roll(contact×speed), skid(slip), impacts, UI. Slip is heard before it is seen.
17. **Quality tiers.** View distance/density/shadows/grass/post. Physics timestep and colliders identical on all GPUs.
18. **UI.** Not stat cards. Speed arc, fork wells, slip bar, sector ribbon, minimap, lean needle, menu/pause/fail/win, 44px touch.
19. **Float / seams.** Track < 2 km so float32 is enough (no floating origin). UV along length with large repeats; one mesh, no chunk seams.
20. **Delivery.** Vite, Three modules, Rapier skipped (no WASM tax), Draco not needed (procedural), test hooks + inspector + bot playtest. Generators probed: all MISSING, so procedural kit is the legal premium fallback.

Combined recipe: **arcade–sim hybrid** — gravity + Pacejka + raycast, spline rail only on Assist, Whistler corridor, alpine kit, genre HUD.
