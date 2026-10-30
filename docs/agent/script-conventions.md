# Script conventions

Read this before adding or changing rAthena scripts, database files, Lua hooks,
or NPC settings.

## Required format

Every `.txt` script has the standard rAthena header:

```text
//===== rAthena Script =======================================
//= <Name>
//===== By: <author> =========================================
//===== Description: ==========================================
//= <what it does, plain language>
//===== How to customize: ====================================
//= <what to tweak and where>
//============================================================
```

Use **TAB**, not spaces, between fields on `script`, `duplicate`, `monster`,
and `mapflag` lines. A space can silently drop the line. After editing those
lines, inspect them with `cat -A`; tabs appear as `^I`.

## IDs, eras, and variables

- Never take monster IDs, item IDs, sprite constants, or script constants from
  memory. Verify them in the pinned `Flux159/rathena` fork, or mark them as
  unverified and state how they must be checked (`@mobinfo`, `@iteminfo`, or
  the server log).
- Renewal-only logic must use `checkre(0)` or an appropriate item existence
  check. Header lines such as `monster` and `shop` cannot be guarded in script;
  use Renewal/Pre-renewal era folders instead.
- Call user functions through `callfunc("Name", ...)`.
- Use character variables by default. Use `#var` only for deliberate
  account-wide state, and avoid permanent global `$var` for static data.
- Variables have no namespace. New permanent variables must use a project
  prefix such as `SNPC_` or an existing feature prefix. Do not rename existing
  persistent variables without a migration.
- A wrong NPC sprite constant may only produce a warning and make the NPC
  invisible. Use a known constant from the fork or a verified numeric ID.

## Script behavior

- rAthena evaluates both branches of a ternary expression. Never put calls with
  side effects or possible errors (`rand`, `getitem`, `set`, etc.) in a ternary;
  use `if` instead.
- A new NPC is normally always loaded: put it in `npc/`, call
  `F_SNPC_Off` from `OnInit`, add it to `ALWAYS_LOADED`, and add its settings UI
  group. Use a setting-controlled folder when the file contains spawns,
  `mapflag`, or related database tables.
- Check all `prontera,` coordinates before placing or moving an NPC.
- Coordinates in README and `mod.json` descriptions must be grepped from the
  source file rather than copied from memory.

## Database files

- Use a real `Header: {Type, Version}` and `Body:` wrapper.
- The filename must be a table rAthena imports (`mob_db.yml`, `item_db.yml`,
  and similar). Arbitrary names are copied to `db/import/` but are not read.
- Optional server behavior that scripts cannot implement belongs in a server
  extension in the pinned rAthena fork, not an unconditional core edit.
