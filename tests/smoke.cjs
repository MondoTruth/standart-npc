#!/usr/bin/env node
//===== standart-npc smoke test ==============================
//= Starts a throwaway Ragnarok Offline world with this mod, once per
//= era, and checks the map-server log: no script errors, no unknown
//= IDs, the mod's tables read, the mod's own start-up lines there.
//= No browser, no player: it only proves the server loads the mod.
//= The play test (tests/play.cjs) makes the same checks before it
//= plays, so a play run needs no smoke run before it.
//= Set-up: tests/world.cjs.
//=
//= Usage (from this repository, in Git Bash or any shell with node):
//=   node tests/smoke.cjs                 both eras
//=   node tests/smoke.cjs renewal         one era (or pre-renewal)
//=   node tests/smoke.cjs --keep          leave the world running
//=   node tests/smoke.cjs --verbose       every passed check too
//= Exit code 0 = every check passed. Only failures are listed, with a
//= count per era. The map-server log of each run is saved next to the
//= world as smoke-<era>.log.
//============================================================
'use strict';
const W = require('./world.cjs');

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const verbose = args.includes('--verbose');
const ERAS = W.parseEras(args);

W.prepare();
const count = W.installMod();
console.log(`standart-npc smoke test: ${count} files installed in ${W.WORLD}`);
let failed = 0;
for (const era of ERAS) {
    console.log(`\n== ${era}`);
    const up = W.boot(era);
    const checks = [{ ok: up.ok, text: 'world starts', detail: up.ok ? '' : up.out.trim().split('\n').slice(-5).join('\n') }];
    let notes = [];
    if (up.ok) {
        const server = W.serverChecks(era, up);
        checks.push(...server.checks);
        notes = server.notes;
    }
    failed += W.report(checks, { verbose });
    if (notes.length) console.log(`note  ${notes.length} other rAthena warning(s), not from this mod's checks; see smoke-${era}.log`);
}
if (!keep) W.rotest('world', 'down');
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
