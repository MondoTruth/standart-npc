# Repository layout

Read this before adding a new file type or changing where generated files live.

The repository root is the mod folder. A release zip wraps it in `standart-npc/`.

```text
mod.json                         version, author, requirements, settings
CHANGELOG.md                     release notes shipped to players
settings/index.html              settings window
client/index.js                  client plugin for Attendance Check

db/when/enable_dummies/          Renewal dummy tables
db/when/enable_attendance/       Renewal attendance tables and extensions
System/CheckAttendance.lub       Renewal client reward copy

npc/custom/snpc_settings.txt     F_SNPC_Off switch
npc/*.txt                        always-loaded NPCs
npc/when/<setting>/              setting-controlled NPCs and spawns

pre-renewal/npc/when/             Pre-renewal NPC replacements
pre-renewal/db/when/              Pre-renewal database replacements
pre-renewal/System/               Pre-renewal client files

README.md, assets/, CLAUDE.md,
docs/, tools/, tests/              repository-only files; never ship in the zip
```

## Loading rules

- `npc/when/<key>/` is loaded only when boolean setting `<key>` is enabled.
- The same setting mechanism applies to `db/when/`, `lua/when/`, and
  `conf/when/` on supported app versions.
- Always-loaded NPCs call `F_SNPC_Off` and use the `npc_off` string setting.
- A `shop` has no `OnInit`; use the existing helper pattern.
- `disablenpc` hides only an NPC. Spawns in the same file still load, so use a
  folder toggle for files containing `monster` or `mapflag` lines.
- Database files must use a table name rAthena imports (`mob_db.yml`,
  `item_db.yml`, etc.) and a real `Header`/`Body` wrapper.
- Era folders replace or add files at the same relative paths for their era.

The current `mod.json` requires app `>=1.7.0`. Treat `mod.json` as the source
of truth and verify it before changing the requirement.
