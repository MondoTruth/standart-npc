# Testing in detail

Read before running or changing the tests, debugging a failed run, or after
the installed app was updated. Which run to pick for a change is in
CLAUDE.md, "What to run".

## Where to look

The app's docs (`docs/MODDING.md`, `docs/MOD_REGISTRY.md` in
`Flux159/ragnarokoffline.app`) are the reference for the mod format; read
them before relying on a mod.json key or folder.

- Did the mod load at all? The supervisor log prints `mods: ...` on start.
  Not in that line = look for `... was not applied -- <reason>`.
- Settings → Mods shows under the mod any `db/` table the server rejected,
  with rAthena's message, file and line. No message ≠ the table was read;
  look for `Loading 'N' entries in 'db/import/...'` in the server log.
- Script errors: map-server log, `script error`, `npc_parse_*`,
  `buildin_*`. `debugmes` in `OnInit` proves a script ran.
- **Test in both eras.** Pre-renewal has its own binaries, database and
  monster/item tables (#22).
- Quick script iteration: edit the copy in `state/modbuild` and
  `@reloadscript` on a test character, then copy the change back — modbuild
  is rebuilt on every start.

## The tests

All three share `tests/world.cjs` (the world, its ports, installing the
mod, the server checks). Both smoke and play print only failures and a
count per era; `--verbose` prints every passed check too. Tests run from a
worktree need `SNPC_APP` pointing at the app clone.

- **Smoke test**: `node tests/smoke.cjs` (or `renewal` / `pre-renewal`)
  starts a throwaway world with the mod in each era and checks the
  map-server log: no script errors, unknown IDs or NPC parse problems, the
  dummy's tables read, Bounty Hunter's start-up line. A few minutes per
  era. It needs the app clone at `../ragnarokoffline.app` (or `SNPC_APP`)
  with the client, supervisor and asset server built and
  `dist/images.tar.gz` downloaded (app's `docs/AGENT_TESTING.md`,
  "Setting up a world"); the world runs on its own ports, so the installed
  app can stay open.
- **Play test**: `node tests/play.cjs` (or one era) makes the smoke test's
  checks on its own start (`serverChecks` in `tests/world.cjs`), then logs
  the character "Tester" in through the real client (app's
  `scripts/rotest`) and talks to the NPCs. Before each run the character
  is set through SQL (class, level, Bounty progress cleared). NPC talk
  goes through `tests/play-helper.js`, which sends the client's own NPC
  packets and reads the NPC windows, so no screen coordinates. Needs
  `npx playwright install chromium` in the app clone too. A new NPC or a
  fixed bug gets a check here when it can be seen in game, in its own
  section (`SECTIONS` at the top of the file).
  `--only=<section>,...` plays only those NPCs (e.g. `--only=valkyrie`,
  `--only=dummies,nokzin`); the server checks always run. A full Renewal
  play run takes over 10 minutes.
- **Job quest check**: `node tests/jobquests.cjs` (or a file filter like
  `2-1/assassin`, `--from=3-1/`, `--no-boot`) looks at rAthena's own
  Renewal job-change quests, not ours: with Tester in the quest's class it
  warps to every NPC the job scripts place (the app's navigation index)
  and talks to it. Finds missing, undrawn or silent NPCs, not bugs in the
  middle of a quest. About three hours for all; results in the app
  clone's `artifacts/rotest/jobquests.jsonl`. Run when players report job
  quest problems, not per change. Pitfalls: OnTouch NPCs fire when `@warp`
  lands in their area; an open NPC input box swallows chat (`@` commands).
  Last full run 2026-10-06: every quest-start NPC present and talking; one
  real bug, `Training Instructor#1a` (`npc/re/jobs/novice/academy.txt`)
  warps to `iz_int 98,88`, an invalid cell; no quests then for 4th jobs,
  Star Emperor, Soul Reaper (Job Master only). Since then the fork got the
  Dragon Knight, Imperial Guard and Shadow Cross quests (apps 1.6.7, 1.7.0,
  1.7.3, `npc/re/jobs/4-1|4-2/`), not yet covered by a run.

## After the installed app is updated

Run `tools/update-clone.sh`. It puts the app clone on the installed app's
tag, runs `cargo build` in its `stack/`, and copies from the installed
runtime (`%APPDATA%\Ragnarok Offline\runtime`) into the clone the build
outputs `world prepare` takes: `bin/robrowser-remoteclient.exe`,
`vendor/roBrowserLegacy/dist/Web`, `vendor/ROenglishRE/Translation` and
`dist/images.tar.gz` (a stale one in the clone wins over the runtime's).
`tests/world.cjs` then sees `runtime/APP_VERSION` differ and makes the
world again.

## Someone else's mod in the test world

Copy it into `<world>/state/mods/<name>`, add the name to `enabled.txt`,
boot, and take it out again afterwards so our tests stay ours.

A mod's `System/` files are only served after a forced relink of the test
world's assets (a wrong `port:` in `state/assets/Config.local.js` showed
it).
