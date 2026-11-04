# Changes outside this repository

Read before working in the app, rAthena or roBrowserLegacy, or syncing the
forks. Also read the app's `CLAUDE.md` and `CONTRIBUTING.md` first.

When the fix belongs in the app or its server/client, MondoTruth's forks
take branches and PRs. The same rules hold there as here: issues only when
asked, PRs only after a yes, never merge.

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
  repository as a remote, or `tools/upstream.sh`). Push the work branch to
  MondoTruth's fork and open the PR against Flux159's `ragnarokoffline`,
  never `master`.
- After a fork PR is merged, Flux159 moves `config/VENDOR_PINS` in the app
  himself: open only the fork PR, no second app PR.
- The installed app's map-server log: `ragnarok-stack.exe logs map 500`
  (`%APPDATA%\Ragnarok Offline\runtime\bin`).

## Syncing the forks

`tools/upstream.sh` does this. What follows what:

- `MondoTruth/ragnarokoffline.app` `main` ← Flux159 `main`
  (`gh repo sync MondoTruth/ragnarokoffline.app -b main` is safe: its
  parent is Flux159).
- `MondoTruth/rathena`, `MondoTruth/roBrowserLegacy` `ragnarokoffline` ←
  Flux159's `ragnarokoffline`. **Never `gh repo sync --source` for them**:
  it ignored `--source` and merged the GitHub parent's master (roBrowser)
  or silently did nothing (rathena). Check
  `gh api repos/Flux159/<repo>/compare/ragnarokoffline...MondoTruth:<repo>:ragnarokoffline`;
  only when `ahead_by` is 0 fast-forward with
  `gh api -X PATCH repos/MondoTruth/<repo>/git/refs/heads/ragnarokoffline -f sha=<upstream sha> -F force=false`.
  If the fork is ahead, ask before touching it.
- `MondoTruth/cashshopmod` `main` ← `LilArt420/cashshopmod` `main`.
- `MondoTruth/adventurers-chronicle` `main` ← `AlwaysGH/adventurers-chronicle` `main`.
- `MondoTruth/world-sync-extras` `main` ← `LilArt420/world-sync-extras` `main`.
- `MondoTruth/ragassets` `main` ← `adsonpleal/ragassets` `main`.

Fork workflows: on `MondoTruth/ragnarokoffline.app` the push-triggered
`Test`, `images` and `Deploy Documentation` are disabled (each sync started
an images build for nothing); `build` and `release` are manual-only and
stay on. On `MondoTruth/roBrowserLegacy` the GitHub Pages workflows are
disabled and `gh-pages` deleted.

## Building on Windows

The server images cannot be built locally, but the fork's GitHub Actions can
(tip from BlaXun):

1. `gh workflow enable images.yml -R MondoTruth/ragnarokoffline.app`.
2. Put the change on `main` of `MondoTruth/ragnarokoffline.app` (for a
   rathena/roBrowserLegacy change, point `config/VENDOR_PINS` at the
   commit on MondoTruth's fork — a commit there, not a PR). A push
   touching `third-party/`, `containers/` or `VENDOR_PINS` runs `images`,
   which publishes the fork's own `images` release. The `images` compile
   is also the first check that the C++ builds.
3. Run `build` by hand (Actions → build → Run workflow, `main`): its
   `ragnarok-offline-win-x64` artifact installs over the app.
4. Afterwards disable `images` again and put the fork's `main` back to
   upstream once the PR is merged.
