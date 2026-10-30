# Settings

`mod.json` is the source of truth for the current setting list and defaults.
The settings UI is `settings/index.html`; keep its keys synchronized with
`mod.json`.

## Stable rules

- Never rename an existing `key`. Player values are stored by key outside the
  mod folder. Removing a key is a breaking change and must be mentioned in
  `CHANGELOG.md`.
- Supported types are `boolean`, `number`, and `string`.
- The app supports up to 40 settings. Versions before app 1.5.5 supported 20.
- A key is at most 40 characters; a string value is at most 200 characters.
- A label is at most 120 characters.
- A description is at most 400 UTF-8 bytes, not 400 visible characters. Check
  byte length after editing.
- `requires.mods` gates the whole mod. It is not a per-setting dependency.
- Keep settings grouped using the `GROUPS` constant in `settings/index.html`.
  Unknown keys appear in `Other`.

## Current settings

There are currently 25 settings in `mod.json`; the mod requires app `>=1.7.0`.
Do not copy this list into another document: read `mod.json` when a task needs
exact defaults, labels, descriptions, or limits.

The settings are grouped by purpose:

- NPC visibility: `npc_off`
- Buffer: `buffer_set`, `buffer_set4`
- Warper: `warp_fee`, `warp_quests`
- Stylist prices: `stylist_price_hair`, `stylist_price_hair_color`,
  `stylist_price_cloth_color`, `stylist_price_outfit`
- Smuggler: `smuggler_no_cards`, `smuggler_no_mvp_cards`,
  `smuggler_no_boss_cards`, `smuggler_no_costumes`, `smuggler_ban`,
  `smuggler_ban2`, `smuggler_ban3`
- Attendance: `enable_attendance`, `attendance_re`, `attendance_re2`,
  `attendance_pre`, `attendance_pre2`
- Hunting and dungeons: `enable_bounties`, `enable_mvp`
- Training: `enable_dummies`, `dummy_pair`

## Editing checklist

1. Read the existing key in `mod.json`; preserve it unless migration is
   explicitly planned.
2. Check the UTF-8 byte length of changed labels and descriptions.
3. Add or update the matching UI entry and `GROUPS` membership.
4. Check that scripts use `F_ModSetting` with the correct type and default.
5. Update README or CHANGELOG when player-visible behavior changes.
