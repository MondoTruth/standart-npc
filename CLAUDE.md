# standart-npc — instructions for Claude Code

All-in-one NPC pack (rAthena scripts) for
[Ragnarok Offline](https://github.com/Flux159/ragnarokoffline.app).
Owner/maintainer: **MondoTruth**. Use this name in `mod.json`, script headers,
README, and CHANGELOG. Repository: `MondoTruth/standart-npc`.

The files are the source of truth. If this document disagrees with the files,
trust the files and report the discrepancy.

## Read when relevant

- `docs/agent/repository-layout.md` — file locations and loading rules.
- `docs/agent/settings.md` — settings keys, limits, and UI synchronization.
- `docs/agent/script-conventions.md` — rAthena scripts, IDs, eras, variables,
  database files, and NPC rules.
- `docs/agent/testing.md` — test selection, logs, test-world setup, and app
  updates.
- `docs/agent/release.md` — releases, CHANGELOG, registry, and licensing.
- `docs/agent/outside-repos.md` — app/rAthena/roBrowserLegacy changes and fork
  synchronization.
- `docs/agent/reviewing.md` — reviewing or committing someone else's work.
- `docs/agent/features.md` — Bounty Hunter, mod store, and server extensions.
- `docs/agent/prontera.md` — NPC coordinates and collision checks.

Scripts in `tools/` are Git Bash scripts. `upstream.sh` handles app releases,
VENDOR_PINS, fork synchronization, upstream PRs, and registry collision checks.
`update-clone.sh` updates the app clone to the installed app version.

## Communication

- Reply in **Russian**. Code, script comments, README, CHANGELOG, commits,
  issues, and PR text are in **English**.
- Be concise and distinguish verified facts from assumptions.
- Run terminal commands yourself. For actions MondoTruth must perform in the
  game or GitHub UI, give one step at a time and state what should appear.
- Do not silently resolve disputed or unverifiable details; list them and ask.

## GitHub workflow

- Create issues only when requested. Otherwise check `gh issue list` and work
  on a task branch, never directly on `main`.
- Keep one task per branch and PR. If applicable, include `Closes #<issue>` in
  the PR body.
- Ask before opening a PR. First commit and push, report the change and checks,
  state the target and title, then wait for an explicit yes before `gh pr create`.
- Ask before posting a GitHub comment. Show the English draft first.
- Never merge PRs yourself; MondoTruth merges after in-game testing.
- Do not put Claude/Hermes session links or `Claude-Session:` trailers in
  GitHub content.

## Non-negotiable project rules

- Never rename a setting key or persistent variable without a migration.
- Verify all IDs and constants in the pinned rAthena fork; never use memory or
  unverified web values as fact.
- Use TAB in rAthena header lines where the format requires it.
- Keep Renewal and Pre-renewal behavior in the correct era folders.
- Do not edit generated release files manually when a project build script is
  the source of truth.
- Before adding or moving an NPC, check `docs/agent/prontera.md` and grep all
  relevant `prontera,` lines.
- Do not edit files under app `vendor/` checkouts; fixes belong in the fork or
  the app's documented patch mechanism.
- Prefer a mod change over a platform change. Optional server behavior belongs
  behind a server extension, not an unconditional core edit.

## Validation

Tests use the app clone at `../ragnarokoffline.app`, or the path in `SNPC_APP`,
on the installed app's tag. Read `docs/agent/testing.md` before running them.

- Script/NPC behavior change: targeted `node tests/play.cjs <era> --only=...`
  for every affected era.
- Startup/data-only change: `node tests/smoke.cjs <era>`.
- Several related changes: run once after the batch, not after every edit.
- Text-only or simple visual one-liner: static checks are sufficient unless
  behavior changed; state that it was not tested in game.
- Release: full `node tests/play.cjs` in both eras, plus static checks.
- A new NPC or fixed in-game bug gets its own section in `tests/play.cjs` when
  it can be tested through the client.
- Do not queue a new test behind a stale run; identify and stop the stale one.
