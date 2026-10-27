# Bounty Hunter, mod store, server extensions

Read before touching Bounty Hunter contracts, storing data outside
character variables, or needing server behaviour a script cannot do.

## Bounty Hunter

- All contracts are in `bounty_contracts.txt`, one line each; keep the
  first lines of each type in their old order (progress migration depends
  on it).
- New hunting monsters also need spawn lines in `bounty_mobs.txt`.
  Monsters of one era only: spawns in `bounty_mobs_era.txt` (Renewal) or
  `pre-renewal/.../bounty_mobs_era.txt`.
- The board hides any contract whose monster is not in the running era's
  mob db; a type with nothing left is left out of the menu with an empty
  `select()` option (Illusion Dungeons on Pre-renewal).

## Mod store

App 1.5.2 (Flux159/ragnarokoffline.app#440, closed). The app's
`docs/MOD_STORE.md` still calls it experimental at 1.7.4 ("may still change
before 1.6", never updated); data stored now is kept across API changes.

- The mod's own key/value data, `global` / `account` / `char` (deleted
  with the character), via `modstore_get/set/inc/...` in scripts, `store.*`
  in Lua, `api.store.get` (paths under `client` only) in a client plugin.
- Only files under the mod's `npc/` can use it (era folders like
  `pre-renewal/npc/`: unverified). Reference: `docs/MOD_STORE.md` in the
  app.
- Moving existing variables (`BB_*`, `SNPC_*`) there needs a migration and
  `requires.app >= 1.5.2`; don't start before MondoTruth decides. Our
  issues: #78 leaderboards, #79 client window, #80 variable migration.
- Mods' `query_sql` / `query_logsql` are **read-only** (app 1.5.2): no
  INSERT/UPDATE/CREATE; tables `login` and `mod_store` are hidden.

## Server extensions

Optional server behaviour a script cannot do (new events, commands,
formulas) is a server extension in the rAthena fork: an entry in its
`db/extension_db.yml`, switched on by a mod shipping its own
`db/extension_db.yml`; scripts check `getextension("<id>")`. In game:
`@extensions`, `@extensioninfo <id>`. Guide: `doc/extensions.md` in
`Flux159/rathena` (branch `ragnarokoffline`). A mod using one needs an app
version whose pinned fork has it. We use `attendance_repeat` and
`attendance_script_rewards` (`db/when/enable_attendance/extension_db.yml`)
and `stylist_script_costs` (`db/extension_db.yml`, always on: the Stylist
sets the styling window's costs with `setstylistcost` in OnInit). The app
merges a mod's `db/extension_db.yml` with its `db/when/<key>/` copies.
