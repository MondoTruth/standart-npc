# standart-npc — instructions for Claude Code

All-in-one NPC pack (rAthena scripts) for [Ragnarok Offline](https://github.com/Flux159/ragnarokoffline.app).
Owner/maintainer: **MondoTruth** — use this name everywhere (mod.json author,
script headers, README, CHANGELOG). Repo: `MondoTruth/standart-npc`.
The files are the source of truth: if this document disagrees with them,
trust the files and say so.

Read when needed (`docs/agent/`, repo only):
- `release.md` — releasing, CHANGELOG layout, registry rules, licence.
- `testing.md` — test details, log locations, job quest check, after an app update.
- `outside-repos.md` — work in the app/rathena/roBrowserLegacy, fork sync, building on Windows.
- `reviewing.md` — reviewing or committing someone else's work.
- `features.md` — Bounty Hunter contracts, mod store, server extensions.
- `prontera.md` — our NPCs' coordinates, other mods' NPCs in Prontera.

Scripts (`tools/`, Git Bash): `upstream.sh` — new app releases, VENDOR_PINS
changes, fork sync, open upstream PRs, Prontera collisions from new registry
mods; `update-clone.sh` — app clone onto the installed app's version.

## Talking to MondoTruth

- Reply in **Russian**. Code, script comments, CHANGELOG, README, commit
  messages, issue and PR texts — in **English**.
- Short and to the point. If something is not verified, say so plainly —
  never present a guess as a fact.
- He is new to GitHub and doesn't use the terminal: run commands yourself.
  When he has to do something (in game, a GitHub button, installing the
  app), give one step at a time and what should appear on screen.
  Windows 11, Russian locale.
- Disputed or unverifiable things in a change: list them and ask. Don't fix
  them silently.
- His usage limit runs out: when a task is done, suggest a new session for
  the next one.

## Workflow

- Create issues only when MondoTruth asks. Otherwise go straight to a
  branch named after the task, never commit to `main`. If the work matches
  an issue, put `Closes #<issue>` in the PR body. Check `gh issue list`
  before starting work.
- **Ask before opening a PR** (any repo): commit and push, say what changed
  and what was checked, name the PR's target and title, wait for a clear
  yes. Only then `gh pr create`.
- **Ask before posting** a GitHub comment: show the English draft, post
  only on an explicit yes. "Напиши/укажи, что ..." is content for the
  draft, not a go.
- **Don't merge PRs yourself.** MondoTruth merges after testing in game.
- No links to Claude sessions (`claude.ai/code/session_...`, `Claude-Session:`
  trailers) in commits, issues, PRs or comments.

## Repository layout

The repository root is the mod folder (the release zip wraps it in
`standart-npc/`).

```
mod.json                 -- version, author, requires, settingsPage, settings[]
CHANGELOG.md             -- one ## <version> section per release (shipped;
                            the app shows players the sections an update skips)
settings/index.html      -- the mod's own settings window
client/index.js          -- client plugin: redraws the Attendance Check window with
                            the rewards the server gives (settings may change them)
db/when/enable_dummies/  -- mob_db.yml, mob_avail.yml: the Training Dummy (Normal, Boss)
                            and the Medium/MVP pair (dummy_pair)
db/when/enable_attendance/ -- attendance.yml (Renewal rewards) and extension_db.yml
                            (attendance_repeat, attendance_script_rewards):
                            rAthena's Attendance Check
System/CheckAttendance.lub -- the client's copy of the rewards (always shipped;
                            does nothing while the server has no period)
npc/
  custom/snpc_settings.txt  -- F_SNPC_Off: switch for always-loaded NPCs
  *.txt                     -- always-loaded NPCs (Warper, Buffer, Job Master, ...)
  when/<setting key>/      -- loaded only if that boolean setting is on
                              (Bounty Hunter, MVP dungeon, Training Dummies,
                              Attendance Check rewards from the settings)
    */*_era.txt            -- Renewal-only spawns
pre-renewal/npc/when/...   -- Pre-renewal copies of the *_era.txt files
pre-renewal/db/when/...    -- Pre-renewal mob_db.yml (dummies), attendance.yml
pre-renewal/System/        -- Pre-renewal CheckAttendance.lub
                              ("prerenewalFolder" in mod.json, app 1.4.3+)
README.md, assets/, CLAUDE.md, docs/, tools/, tests/  -- repo only, never in the zip
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
  holds at most 200 characters, so a new class group may need its own key.
- A `shop` has no OnInit, so Tool Dealer uses a small helper script.
  `disablenpc` hides only the NPC — `monster` lines in the same file still
  load, so anything with spawns must be a folder toggle.
- Scripts read settings with
  `callfunc("F_ModSetting", "standart-npc", "<key>", <default>)`.
- Files in `db/` load even when the related NPC is switched off. Since app
  1.4.3 the `when/<key>/` switch also works for `db/when/<key>/`,
  `lua/when/<key>/` and `conf/when/<key>/` (`groups.yml`/`atcommands.yml`).
  We require app 1.6.5 (Episode 19's quests for Episode Valkyrie,
  Flux159/rathena#53).
- A `db/` file only loads if its name is a table rAthena imports
  (`mob_db.yml`, `item_db.yml`, ... — the stubs in rAthena's
  `db/import-tmpl`). Any other name lands in `db/import/` and is never read
  (#25).

### Settings — 25 of max 40 used

App limits: `type` is `boolean`, `number` or `string`; max 40 settings (20
before app 1.5.5); `label` up to 120 and `description` up to **400 bytes**
(UTF-8; over that the whole mod is refused: "setting ... has an over-long
label or description", `stack/src/mods.rs`; `enable_bounties` is at 396
and `npc_off` at 379 bytes, so count bytes after any edit); `key` up to
40 characters, a string value up to 200; `requires.mods` gates the whole
mod only. Settings
window groups (`settings/index.html`, const `GROUPS`): Travel and services,
Character, Shops, Hunting quests, Dungeons, Equipment, Training, Other (keys
not in a group land in Other).

**Never rename a setting `key`.** Players' values are stored by key outside
the mod folder; a renamed key is one option removed and another added, so
every player silently loses that choice. If a key really must go, say so in
CHANGELOG.md.

## NPCs in Prontera

Our NPCs' coordinates and the other mods' NPCs there: `docs/agent/prontera.md`.
Before placing a new NPC, grep all `prontera,` lines to avoid collisions.

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
  other header lines cannot be guarded that way; use era folders
  (`"renewalFolder": "renewal"` / `"prerenewalFolder": "pre-renewal"` in
  mod.json, app >= 1.4.3). An era folder is laid out like the mod (`npc/`,
  `db/`, `npc/when/<key>/` ...) and applied over it only in its era: a file
  at the same path replaces the mod's copy, anything else is added.
- `a ? b : c` in rAthena evaluates **both** `b` and `c`, then picks one
  (`op_3` in `script.cpp`). Never put a call with side effects or errors
  (`rand`, `getitem`, `set`, ...) inside a ternary; use `if` (#24).
- NPC sprite names: a wrong constant is only a warning
  (`npc_parseview: Invalid NPC constant ... Defaulting to INVISIBLE`) — the
  NPC loads but nobody can see it. Use a name in use in the fork's `npc/`
  folder, or a numeric sprite ID that exists.
- Call user functions only via `callfunc("Name", ...)`. A direct call failed
  to parse here and dropped the whole NPC.
- Character variables by default; `#var` only when deliberately
  account-wide; no permanent global `$var` for static data (use `.var`).
  Variables have no namespace: another mod's `progress` is the same
  variable. New permanent variables get a prefix saying whose they are
  (`SNPC_`, or the NPC's existing prefix like `BB_`). Don't rename existing
  ones without a migration — players' progress is in them.
- Mod store, read-only `query_sql`, server extensions, Bounty Hunter
  contracts: `docs/agent/features.md`.
- `db/*.yml` needs a real `Header: {Type, Version}` / `Body:` wrapper.
- Coordinates in mod.json descriptions and README: always grep from the file.
- New NPC: by default always loaded -- file in `npc/`, `OnInit` with
  `F_SNPC_Off`, an entry in `ALWAYS_LOADED` and a group in
  `settings/index.html`. Only NPCs with `monster`/`mapflag` lines or `db/`
  tables need a folder `npc/when/<new_key>/` + boolean in `mod.json` (mind
  the 40-settings cap; over 20 needs `requires.app >= 1.5.5`).

## What to run

Tests need the app clone at `../ragnarokoffline.app` (or `SNPC_APP`) on the
installed app's tag; details in `docs/agent/testing.md`. Runs are slow and
reading them costs MondoTruth's usage limit:

- A script change: `node tests/play.cjs <era> --only=<the NPC's section>`
  in the era(s) the change touches (covers the smoke checks). No visible
  NPC part (a table, a start-up line): `node tests/smoke.cjs <era>`.
- Several changes in a row: one run at the end, not one per change.
- A one-liner (a sprite, a facing, a text): no run; say in the PR it is
  untested and left for the release run. Still check IDs/constants and
  tabs statically.
- After a full pass, a later small change re-tests only what it touches.
  Never queue a run behind one whose result is already stale; stop the
  stale one (check which process is which first).
- Before a release: `node tests/play.cjs` in both eras, every section
  (MondoTruth may skip it when the release's changes all passed).
- Run tests in the background and read only the summary (failures and
  counts), not the whole log. A new NPC or a fixed bug visible in game gets
  a check in `tests/play.cjs`, in its own section.
