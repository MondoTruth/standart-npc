# standart-npc — instructions for Claude Code

All-in-one NPC pack (rAthena scripts) for [Ragnarok Offline](https://github.com/Flux159/ragnarokoffline.app).
Owner/maintainer: **MondoTruth** — use this name everywhere (mod.json author,
script headers, README, patch notes). Repo: `MondoTruth/standart-npc`.

The files in this repository are the source of truth. If anything in this
document disagrees with the files, trust the files and say so.

## Talking to MondoTruth

- Reply in **Russian**. Code, script comments, Patch Notes, README, commit
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
- Otherwise go straight to a branch and a PR. If the work matches an existing
  issue, put `Closes #<issue>` in the PR body.
- Work in a branch named after the task, never commit to `main` directly.
- Open a PR with `gh pr create`.
- **Don't merge PRs yourself.** MondoTruth merges after testing in game.
- Contributors without GitHub (Lil Art) send zips. Commit their files as they
  are first (message mentions the author), then our fixes in a separate
  commit, so the history shows who did what.

## Repository layout

The repository root is the mod folder (the release zip wraps it in
`standart-npc/`).

```
mod.json                 -- version, author, requires, settingsPage, settings[]
Patch Notes.txt          -- full history, one ## <version> section per release
settings/index.html      -- the mod's own settings window
db/                      -- prontera_dummies.yml
npc/
  custom/snpc_settings.txt  -- F_SNPC_Off: switch for always-loaded NPCs
  *.txt                     -- always-loaded NPCs (Warper, Buffer, Job Master, ...)
  when/<setting key>/      -- loaded only if that boolean setting is on
                              (Bounty Hunter, MVP dungeon, Training Dummies)
README.md, assets/, CLAUDE.md  -- repo only, never in the release zip
```

### Two kinds of on/off switch

- **Folder toggles**: `npc/when/<key>/` loads only if boolean setting `<key>`
  is on. When off, nothing in the folder loads (NPCs, `monster` spawns, warps).
- **Always-loaded NPCs** in `npc/` call `callfunc("F_SNPC_Off", "<name>")` at
  start-up and hide themselves if listed in the string setting `npc_off`
  (comma list: `warper, buffer, jobmaster, reset, stylist, epvalk, falcon,
  kafra, weightmax, plagiarism, tooldealer, smuggler, cardexchanger, refiner,
  grade, enchanter, nokzin, daily`; empty = all on). A `shop` has no OnInit, so
  Tool Dealer uses a small helper script. `disablenpc` hides only the NPC — `monster` lines in the same file
  still load, so anything with spawns must be a folder toggle.
- Scripts read settings with
  `callfunc("F_ModSetting", "standart-npc", "<key>", <default>)`.
- Files in `db/` load even when the related NPC is switched off.

### Settings — 5 of max 20 used

App limits: `type` is `boolean`, `number` or `string`; max 20 settings;
`requires.mods` gates the whole mod only. Settings window groups (in
`settings/index.html`, const `GROUPS`): Travel and services, Character,
Shops, Hunting quests, Dungeons, Equipment, Training, Other (keys not in a
group land in Other).

## NPCs in Prontera (grepped from files, 4.8.0)

| NPC | x,y | File / toggle |
|---|---|---|
| Warper | 160,192 + duplicates in towns | npc/warper.txt, npc_off `warper` |
| Buffer | 163,192 + duplicates in towns | npc_off `buffer` |
| Job Master | 157,195 | npc_off `jobmaster` |
| Reset Girl | 154,195 | npc_off `reset` |
| Stylist | 169,180 | npc_off `stylist` |
| Episode Valkyrie | 128,193 | npc_off `epvalk` |
| Falcon Breeder | 128,211 | npc_off `falcon` |
| Kafra Employee | 160,187 | npc_off `kafra` |
| Weight Maxxer | 147,169 | npc_off `weightmax` |
| Plagiarism Master | 171,182 | npc_off `plagiarism` |
| Tool Dealer | 143,178 | npc_off `tooldealer` |
| Smuggler | 144,174 | npc_off `smuggler` |
| Card Exchanger | 151,187 | npc_off `cardexchanger` |
| Bounty Hunter | 147,172 | enable_bounties |
| Cheffenia Gatekeeper | 140,180 | enable_mvp |
| Safe Refiner | 164,172 | npc_off `refiner` |
| Grade Refiner | 164,166 | npc_off `grade` (Renewal only) |
| Universal Enchanter | 164,169 | npc_off `enchanter` |
| Master Nokzin | 167,178 | npc_off `nokzin` |
| Daily Rewards | 147,166 | npc_off `daily` |
| Training Dummies | near 153-158,163 | enable_dummies |

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
  0 = Pre-renewal) or `getitemname(<id>) == "null"`.
- Call user functions only via `callfunc("Name", ...)`. A direct call failed
  to parse here and dropped the whole NPC.
- Character variables by default; `#var` only when deliberately
  account-wide; avoid permanent global `$var` for static data (use `.var`).
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
  `bounty_mobs.txt`.

## Reviewing contributions

Diff file by file against current `main` (contributors often work from an old
copy): look for rolled-back features, coordinate collisions, unverified
IDs/constants, missing headers. IceGlaive writes his code with Gemini —
check it especially carefully.

## Release

1. Changes merged into `main` via PRs.
2. Bump `version` in `mod.json` (and `requires.app` if new app features are
   used).
3. Add a `## <version>` section to `Patch Notes.txt` — short plain bullets,
   credit the authors.
4. Update README.md if NPCs, coordinates or credits changed.
5. The zip is built automatically by `.github/workflows/release.yml`:
   `standart-npc-<version>.zip`, files inside a `standart-npc/` folder,
   **without** README.md, assets/, CLAUDE.md, .git, .github, .gitattributes.
   To check the build before a release: Actions → "Build release zip" → Run
   workflow, then download the zip from the run's Artifacts.
6. Before tagging: tabs check, same version everywhere, README coordinates,
   credits. If possible start the server with the zip and look for
   `script error` in the map-server log.
7. Publish a GitHub release with tag `v<version>` and the Patch Notes section
   as description. Don't attach the zip by hand: the workflow builds it and
   attaches it to the release. If the tag is not `v<version>` from mod.json,
   the workflow fails and attaches nothing.

Open questions and plans live in the repo's GitHub issues — check
`gh issue list` before starting work.
