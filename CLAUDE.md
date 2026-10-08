# standart-npc — instructions for Claude Code

All-in-one NPC pack (rAthena scripts) for [Ragnarok Offline](https://github.com/Flux159/ragnarokoffline.app).
Owner/maintainer: **MondoTruth** — use this name everywhere (mod.json author,
script headers, README, CHANGELOG). Repo: `MondoTruth/standart-npc`.

The files in this repository are the source of truth. If anything in this
document disagrees with the files, trust the files and say so.

## Talking to MondoTruth

- Reply in **Russian**. Code, script comments, CHANGELOG, README, commit
  messages, issue and PR texts — in **English**.
- Short and to the point. If something is not verified, say so plainly —
  never present a guess as a fact.
- He is new to GitHub. When he has to do something himself, give one step at
  a time: exact command or button, and what should appear on screen.
  Windows 11, Russian locale.
- Disputed or unverifiable things in a change: list them and ask. Don't fix
  them silently.

## Workflow

- Create issues only when MondoTruth asks for it.
- Otherwise go straight to a branch. If the work matches an existing issue,
  put `Closes #<issue>` in the PR body.
- Work in a branch named after the task, never commit to `main` directly.
- **Ask before opening a PR.** Commit and push the branch, say what changed
  and what was checked, name the PR's target and title, and wait for
  MondoTruth's clear yes. Only then `gh pr create`.
- **Don't merge PRs yourself.** MondoTruth merges after testing in game.
- No links to Claude sessions (`claude.ai/code/session_...`, `Claude-Session:`
  trailers) in commits, issues, PRs or comments.
- Contributors without GitHub (Lil Art) send zips. Commit their files as they
  are first (message mentions the author), then our fixes in a separate
  commit, so the history shows who did what.
- When the fix belongs in the app or its server/client, MondoTruth's forks
  can take branches and PRs: `MondoTruth/ragnarokoffline.app`,
  `MondoTruth/rathena`, `MondoTruth/roBrowserLegacy` (see "Changes outside
  this repository"). The same rules hold there: issues only when asked,
  PRs only after a yes, never merge.

## Repository layout

The repository root is the mod folder (the release zip wraps it in
`standart-npc/`).

```
mod.json                 -- version, author, requires, settingsPage, settings[]
CHANGELOG.md             -- full history, one ## <version> section per release
                            (shipped; the app shows players the sections an
                            update skips)
settings/index.html      -- the mod's own settings window
db/when/enable_dummies/  -- mob_db.yml, mob_avail.yml: the Training Dummy (Normal, Boss)
db/when/enable_attendance/ -- attendance.yml (Renewal rewards) and extension_db.yml
                            (attendance_repeat): rAthena's Attendance Check
System/CheckAttendance.lub -- the client's copy of the rewards (always shipped;
                            does nothing while the server has no period)
npc/
  custom/snpc_settings.txt  -- F_SNPC_Off: switch for always-loaded NPCs
  *.txt                     -- always-loaded NPCs (Warper, Buffer, Job Master, ...)
  when/<setting key>/      -- loaded only if that boolean setting is on
                              (Bounty Hunter, MVP dungeon, Training Dummies)
    */*_era.txt            -- Renewal-only spawns
pre-renewal/npc/when/...   -- Pre-renewal copies of the *_era.txt files
pre-renewal/db/when/...    -- Pre-renewal copies of the dummies' mob_db.yml and of
                            attendance.yml
pre-renewal/System/        -- Pre-renewal CheckAttendance.lub
                              ("prerenewalFolder" in mod.json, app 1.4.3+)
README.md, assets/, CLAUDE.md, tests/  -- repo only, never in the release zip
```

### Two kinds of on/off switch

- **Folder toggles**: `npc/when/<key>/` loads only if boolean setting `<key>`
  is on. When off, nothing in the folder loads (NPCs, `monster` spawns, warps).
- **Always-loaded NPCs** in `npc/` call `callfunc("F_SNPC_Off", "<name>")` at
  start-up and hide themselves if listed in the string setting `npc_off`
  (comma list: `warper, buffer, jobmaster, reset, stylist, epvalk, falcon,
  kafra, weightmax, plagiarism, tooldealer, smuggler, cardexchanger, refiner,
  grade, enchanter, nokzin, welcome`; empty = all on; `daily` was
  Daily Rewards, removed in 4.9.5).
- Buffer: the chosen buffs are two string settings, `buffer_set` (1st-3rd
  class) and `buffer_set4` (4th class), comma lists of codes; a string
  holds at most 200 characters, so a new class group may need its own key. A `shop` has no OnInit, so
  Tool Dealer uses a small helper script. `disablenpc` hides only the NPC — `monster` lines in the same file
  still load, so anything with spawns must be a folder toggle.
- Scripts read settings with
  `callfunc("F_ModSetting", "standart-npc", "<key>", <default>)`.
- Files in `db/` load even when the related NPC is switched off. Since app
  1.4.3 the same `when/<key>/` switch also works for `db/when/<key>/`
  (table added to the mod's own copy) and `lua/when/<key>/`, and
  `conf/when/<key>/` for `groups.yml`/`atcommands.yml`. Using `db/when/` or
  `lua/when/` needs app 1.4.3 (we require 1.5.5, for the `attendance_repeat` extension).
- A `db/` file only loads if its name is a table rAthena imports
  (`mob_db.yml`, `item_db.yml`, ... — the stubs in rAthena's
  `db/import-tmpl`). Any other name lands in `db/import/` and is never read
  (see #25).

### Settings — 9 of max 20 used

App limits: `type` is `boolean`, `number` or `string`; max 20 settings;
`label` up to 120 and `description` up to **400 bytes** (UTF-8; over that
the whole mod is refused: "setting ... has an over-long label or
description", `stack/src/mods.rs`); `key` up to 40 characters, a string
value up to 200;
`requires.mods` gates the whole mod only. Settings window groups (in
`settings/index.html`, const `GROUPS`): Travel and services, Character,
Shops, Hunting quests, Dungeons, Equipment, Training, Other (keys not in a
group land in Other).

**Never rename a setting `key`.** Players' values are stored by key outside
the mod folder; on update the app treats a renamed key as one option removed
and another added, so every player silently loses that choice. If a key
really must go, say so in CHANGELOG.md.

## NPCs in Prontera (grepped from files, 4.9.5)

| NPC | x,y | File / toggle |
|---|---|---|
| Warper | 160,192 + duplicates in towns | npc/warper.txt, npc_off `warper` |
| Buffer | 163,192 + duplicates in towns | npc_off `buffer` |
| Job Master | 157,195 | npc_off `jobmaster` |
| Reset Girl | 154,195 | npc_off `reset` |
| Stylist | 169,180 | npc_off `stylist` |
| Episode Valkyrie | 128,193 | npc_off `epvalk` |
| Falcon Breeder | 128,211 | npc_off `falcon` |
| Premium Service Manager | 160,187 | npc_off `kafra` (was Kafra Employee) |
| Weight Maxxer | 147,172 | npc_off `weightmax` |
| Plagiarism Master | 171,182 | npc_off `plagiarism` |
| Tool Dealer | 143,178 | npc_off `tooldealer` |
| Smuggler | 144,174 | npc_off `smuggler` |
| Card Exchanger | 151,187 | npc_off `cardexchanger` |
| Bounty Hunter | 147,169 | enable_bounties |
| Cheffenia Gatekeeper | 140,180 | enable_mvp |
| Safe Refiner | 164,172 | npc_off `refiner` |
| Grade Refiner | 164,166 | npc_off `grade` (Renewal only) |
| Universal Enchanter | 164,169 | npc_off `enchanter` |
| Master Nokzin | 144,229 | npc_off `nokzin` |
| Training Dummy / Dummy Master | 156,225 / 150,225 | enable_dummies |

Before placing a new NPC, grep all `prontera,` lines to avoid collisions.
Other things in Prontera since app 1.4.6:

- **prontera-vendors** (BlaXun, registry mod): stalls at random in columns
  x=147 and x=164 (y 52-111, ~135-173), buyers at x=140 and x=171
  (y 136-172) and rows y=110 / y=125 (x 104-135). From app 1.4.8
  (Flux159/ragnarokoffline.app#294) stalls keep 3 cells from any NPC; on
  older apps a stall can land on one of ours.
- **Companion Recruiter** (app): two cells east of each town's healer
  (`prontera,164,193`, next to our Buffer), visible only when Companions
  are "Hired from a Companion Recruiter".
- **card-remover** (BlaXun, registry mod, app 1.4.8): Card Remover at
  `prontera,182,216`, also in geffen 115,73, alberta 104,61, morocc 155,64,
  payon 166,99, izlude 119,157 and aldebaran 160,100. Its card extraction
  overlaps our Card Exchanger's (#41).

## Script conventions

- Header block on every `.txt`:
  ```
  //===== rAthena Script =======================================
  //= <Name>
  //===== By: <author> ===========================================
  //===== Description: =========================================
  //= <what it does, plain language>
  //===== How to customize: ====================================
  //= <what to tweak and where>
  //============================================================
  ```
- **TAB, not spaces** between the fields of `script`, `duplicate`, `monster`,
  `mapflag` lines. A space silently drops the line. After editing such lines
  check with `cat -A` (tabs show as `^I`).
- Never take monster/item IDs or script constants from memory or other
  sites. Verify in the rAthena fork the app uses (`Flux159/rathena`, commit
  pinned in the app's `config/VENDOR_PINS`), or mark them "to verify" and
  say how (server console, `@mobinfo`, `@iteminfo`).
- Renewal-only features/items must be guarded: `checkre(0)` (1 = Renewal,
  0 = Pre-renewal) or `getitemname(<id>) == "null"`. `monster`, `shop` and
  other header lines cannot be guarded that way; for them use era folders
  (app >= 1.4.3): `"renewalFolder": "renewal"` / `"prerenewalFolder":
  "pre-renewal"` in mod.json. An era folder is laid out like the mod
  (`npc/`, `db/`, `npc/when/<key>/` ...), applied over it only in its era: a
  file at the same path replaces the mod's copy, anything else is added.
  Needs `requires.app >= 1.4.3`.
- `a ? b : c` in rAthena evaluates **both** `b` and `c`, then picks one
  (`op_3` in `script.cpp`). Never put a call with side effects or errors
  (`rand`, `getitem`, `set`, ...) inside a ternary; use `if`. This is why the
  4.8.1 Area Purge fix still crashed (#24).
- NPC sprite names: a wrong constant is only a warning
  (`npc_parseview: Invalid NPC constant ... Defaulting to INVISIBLE`) — the
  NPC loads but nobody can see it. Use a name that is in use in the fork's
  `npc/` folder, or a numeric sprite ID that exists.
- Call user functions only via `callfunc("Name", ...)`. A direct call failed
  to parse here and dropped the whole NPC.
- Character variables by default; `#var` only when deliberately
  account-wide; avoid permanent global `$var` for static data (use `.var`).
  Variables have no namespace: another mod with a `progress` variable shares
  it on the same character. New permanent variables get a prefix that says
  whose they are (`SNPC_`, or the NPC's existing prefix like `BB_`). Do not
  rename existing ones without a migration — players' progress is in them.
- **Mod store** (app 1.5.2, experimental until 1.6, Flux159/ragnarokoffline.app#440):
  key/value data of the mod's own, `global` / `account` / `char` (deleted
  with the character), via `modstore_get/set/inc/...` in scripts, `store.*`
  in Lua, `api.store.get` (paths under `client` only) in a client plugin.
  Only files under the mod's `npc/` can use it. Reference:
  `docs/MOD_STORE.md` in the app. Moving existing variables there needs a
  migration and `requires.app >= 1.5.2`; don't start before MondoTruth
  decides.
- Mods' `query_sql` / `query_logsql` are **read-only** (app 1.5.2): no
  INSERT/UPDATE/CREATE, and tables `login` and `mod_store` are hidden.
- `db/*.yml` needs a real `Header: {Type, Version}` / `Body:` wrapper.
- Coordinates in mod.json descriptions and README: always grep from the file.
- New NPC: by default always loaded -- file in `npc/`, `OnInit` with
  `F_SNPC_Off`, an entry in `ALWAYS_LOADED` and a group in
  `settings/index.html`. Only NPCs with `monster`/`mapflag` lines or `db/`
  tables need a folder `npc/when/<new_key>/` + boolean in `mod.json` (mind
  the 20-settings cap).
- Bounty Hunter: all contracts are in `bounty_contracts.txt`, one line each;
  keep the first lines of each type in their old order (progress migration
  depends on it); new hunting monsters also need spawn lines in
  `bounty_mobs.txt`. Monsters of one era only: spawns in
  `bounty_mobs_era.txt` (Renewal) or `pre-renewal/.../bounty_mobs_era.txt`.
  The board hides any contract whose monster is not in the running era's
  mob db; a type with nothing left is left out of the menu with an empty
  `select()` option (Illusion Dungeons on Pre-renewal).
- Optional server behaviour that a script cannot do (new events, commands,
  formulas) is a **server extension** in the rAthena fork: an entry in its
  `db/extension_db.yml`, switched on by a mod shipping its own
  `db/extension_db.yml`; scripts check `getextension("<id>")`. In game:
  `@extensions`, `@extensioninfo <id>`. Guide: `doc/extensions.md` in
  `Flux159/rathena` (branch `ragnarokoffline`). A mod using one needs an app
  version whose pinned fork has it.

## Checking a change

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
  `--only=dummies,nokzin`); the server checks always run.
- Both tests print only failures and a count per era; `--verbose` prints
  every passed check too.
- **Job quest check**: `node tests/jobquests.cjs` (or a file filter like
  `2-1/assassin`, `--from=3-1/`, `--no-boot`) looks at rAthena's own
  Renewal job-change quests, not ours: with Tester in the quest's class it
  warps to every NPC the job scripts place (the app's navigation index)
  and talks to it. Finds missing, undrawn or silent NPCs, not bugs in the
  middle of a quest. About three hours for all; results in the app
  clone's `artifacts/rotest/jobquests.jsonl`. Run when players report job
  quest problems, not per change.
- All three share `tests/world.cjs` (the world, its ports, installing the
  mod, the server checks).
- **What to run** (runs are slow and reading them costs MondoTruth's
  usage limit):
  - A script change: `node tests/play.cjs <era> --only=<the NPC's
    section>`, in the era(s) the change touches. It covers the smoke
    checks too. A change with no visible NPC part (a table, a start-up
    line): `node tests/smoke.cjs <era>`.
  - Several changes in a row: one run at the end, not one per change.
  - A one-liner (a sprite, a facing, a text): no run; say so in the PR.
  - After a full pass, a later small change re-tests only what it
    touches. Never queue a run behind one whose result is already stale;
    stop the stale one (check which process is which first).
  - Before a release: `node tests/play.cjs` in both eras, every section
    (MondoTruth may skip it when the release's changes all passed).
  - Run tests in the background and read only the summary (failures and
    counts), not the whole log.
- After the installed app is updated: put the app clone on the new tag,
  `cargo build` in its `stack/`, and copy from the installed runtime
  (`%APPDATA%\Ragnarok Offline\runtime`) into the clone the build outputs
  `world prepare` takes: `bin/robrowser-remoteclient.exe`,
  `vendor/roBrowserLegacy/dist/Web`, `vendor/ROenglishRE/Translation` and
  `dist/images.tar.gz` (a stale one in the clone wins over the runtime's).
  `tests/world.cjs` then sees `runtime/APP_VERSION` differ and makes the
  world again. Before 1.5.1 the world kept running 1.4.8's server.
- The test world can also load someone else's mod for a check: copy it
  into `<world>/state/mods/<name>`, add the name to `enabled.txt`, boot,
  and take it out again afterwards so our tests stay ours.

## Changes outside this repository

Read the app's `CLAUDE.md` and `CONTRIBUTING.md` first. Where a change goes:

| What | Repository | PR against |
|---|---|---|
| app, population engine (`third-party/population-engine`), bundled and registry mods | `Flux159/ragnarokoffline.app`, from `MondoTruth/ragnarokoffline.app` | `main` |
| rAthena bug or server extension | `Flux159/rathena`, from `MondoTruth/rathena` | `ragnarokoffline` |
| client (roBrowserLegacy) bug | `Flux159/roBrowserLegacy`, from `MondoTruth/roBrowserLegacy` | `ragnarokoffline` |

- `MondoTruth/rathena` and `MondoTruth/roBrowserLegacy` are forks of the
  upstream projects, in the same network as Flux159's (one fork per
  network, so they cannot be re-forked from Flux159). Each has a copy of
  Flux159's `ragnarokoffline` branch, which does not follow Flux159's on
  its own: bring it up to Flux159's before branching (add Flux159's
  repository as a remote). Push the work branch to MondoTruth's fork and
  open the PR against Flux159's `ragnarokoffline`, never `master`. A fork
  fix then needs a second, small app PR moving `config/VENDOR_PINS`.
- **Building on Windows.** The server images cannot be built locally, but
  the fork's GitHub Actions can (tip from BlaXun): put the change on
  `main` of `MondoTruth/ragnarokoffline.app` (for a rathena/roBrowserLegacy
  change, point `config/VENDOR_PINS` at the commit on MondoTruth's fork).
  A push touching `third-party/`, `containers/` or `VENDOR_PINS` runs
  `images`, which publishes the fork's own `images` release. Then run
  `build` by hand (Actions → build → Run workflow, `main`): its
  `ragnarok-offline-win-x64` artifact installs over the app. The `images`
  compile is also the first check that the C++ builds. Afterwards put the
  fork's `main` back to upstream once the PR is merged.
- The installed app's map-server log: `ragnarok-stack.exe logs map 500`
  (`%APPDATA%\Ragnarok Offline\runtime\bin`).

## Reviewing contributions

Diff file by file against current `main` (contributors often work from an old
copy): look for rolled-back features, coordinate collisions, unverified
IDs/constants, missing headers. IceGlaive writes his code with Gemini —
check it especially carefully.

## Release

1. Changes merged into `main` via PRs.
2. Bump `version` in `mod.json` (and `requires.app` if new app features are
   used).
3. Add a `## <version>` section to `CHANGELOG.md` — short plain bullets,
   credit the authors.
4. Update README.md if NPCs, coordinates or credits changed.
5. The zip is built automatically by `.github/workflows/release.yml`:
   `standart-npc-<version>.zip`, files inside a `standart-npc/` folder,
   **without** README.md, assets/, CLAUDE.md, tests/, .git, .github, .gitattributes.
   To check the build before a release: Actions → "Build release zip" → Run
   workflow, then download the zip from the run's Artifacts. CHANGELOG.md
   ships in the zip; the workflow fails a release whose version has no
   `## <version>` section in it (only a warning on a manual run).
6. Before tagging: `node tests/play.cjs` passes in both eras (it makes the
   smoke checks too), tabs check,
   same version everywhere, README coordinates, credits.
7. Publish a GitHub release with tag `v<version>` and the CHANGELOG.md section
   as description. Don't attach the zip by hand: the workflow builds it and
   attaches it to the release. If the tag is not `v<version>` from mod.json,
   the workflow fails and attaches nothing.

What the app's registry expects (entry `registry/mods/standart-npc/mod.json`
in the app repo points at our releases, asset `standart-npc-*.zip`):

- Only a **full release** is offered to players (`releases/latest`); drafts
  and pre-releases never are — use a pre-release to test with a few people.
- Tags only go up; compared as dotted numbers.
- `requires.app` in the release's mod.json is checked before installing: a
  player on an older app keeps the old version and is told why. Raise it
  whenever we use something new in the app.
- Refused: zip over 50 MB, unpacked over 96 MB or 2000 files, links, `../`
  paths, a mod.json the app cannot read (unknown `requires` keys, bad
  settings).
- Players read the release notes on Settings → Mods → Updates ("What's
  new", a few lines and Show all; app 1.5.1). With Flux159/ragnarokoffline.app#437
  they see the notes of every release the update skips, not only the latest
  — write them for players.
- Licence: MIT (`LICENSE`, PR #27). Exceptions are scripts based on
  rAthena's own (`warper`, `jobmaster`, `resetnpc`, `stylist`): they stay
  GPL-3.0 (`LICENSE-GPL-3.0`) and say so in their header. A new script
  copied from rAthena's `npc/` gets the same header line and an entry in
  `LICENSE`.

Open questions and plans live in the repo's GitHub issues — check
`gh issue list` before starting work.
