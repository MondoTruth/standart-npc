#!/usr/bin/env node
//===== standart-npc smoke test ==============================
//= Starts a throwaway Ragnarok Offline world with this mod, once per
//= era, and checks the map-server log: no script errors, no unknown
//= IDs, the mod's tables read, the mod's own start-up lines there.
//= No browser, no player: it only proves the server loads the mod.
//= Set-up: tests/world.cjs.
//=
//= Usage (from this repository, in Git Bash or any shell with node):
//=   node tests/smoke.cjs                 both eras
//=   node tests/smoke.cjs renewal         one era (or pre-renewal)
//=   node tests/smoke.cjs --keep          leave the world running
//= Exit code 0 = every check passed. The map-server log of each run is
//= saved next to the world as smoke-<era>.log.
//============================================================
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const W = require('./world.cjs');

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const ERAS = W.parseEras(args);

// rAthena colours its log; the app's copy also runs lines together.
const clean = text => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/\r/g, '\n')
    .replace(/(\[(?:Status|Info|Warning|Error|Debug|Notice|SQL)\])/g, '\n$1');

// Errors from the app's own scripts, not this mod's. Listed under "note"
// instead of failing the run.
const APP_OWN = [
    // Population engine's recruiter.txt (app 1.4.8): the floating template
    // runs OnInit and tries to hide itself by a name no NPC on a map has.
    /buildin_hide: Attempted to disablenpc a non-existing NPC 'Companion Recruiter'/,
];

function runEra(era) {
    const checks = [];
    const check = (ok, text, detail = '') => checks.push({ ok, text, detail });

    const up = W.boot(era);
    check(up.ok, 'world starts', up.ok ? '' : up.out.trim().split('\n').slice(-5).join('\n'));
    if (!up.ok) return { checks, notes: [] };
    const modsLine = up.out.split('\n').find(l => /^mods: /.test(l) && l.includes(W.MOD) && !l.includes('was not applied'));
    check(!!modsLine, 'mod applied (supervisor "mods:" line)', up.out.split('\n').filter(l => l.includes(W.MOD)).join('\n'));

    // Only the last start of the map server: the log keeps every start.
    const all = clean(W.rotest('server', 'logs', 'map', '20000').out).split('\n');
    let start = 0;
    all.forEach((line, i) => { if (/Done reading '\d+' messages in 'conf\/msg_conf\/map_msg\.conf'/.test(line)) start = i; });
    const log = all.slice(start);
    fs.writeFileSync(path.join(path.dirname(W.WORLD), `smoke-${era}.log`), log.join('\n'));
    check(log.some(l => /Server is 'ready'/.test(l)), 'map server ready');

    // Problems this mod has caused before (#22, #24, #25) or could.
    const bad = log.filter(l => !APP_OWN.some(re => re.test(l)) && (
        /script error|npc_parse|buildin_|Unknown mob ID|Invalid sell item|does not exists? in the item_db|parse_simpleexpr|Invalid NPC constant|was not applied/i.test(l)
        || (l.includes(W.MOD) && /\[(Error|Warning)\]/.test(l))));
    check(bad.length === 0, 'no script errors, unknown IDs or NPC parse problems', bad.slice(0, 15).join('\n'));

    // The mod's own tables (Training Dummies: 2 monsters, 2 looks).
    for (const table of ['mob_db', 'mob_avail']) {
        const m = log.map(l => l.match(new RegExp(`Done reading '(\\d+)' entries in 'db/import/${table}\\.yml'`))).find(Boolean);
        check(m && Number(m[1]) >= 2, `db/import/${table}.yml read`, m ? `${m[1]} entries` : 'not in the log');
    }

    // The mod's own start-up lines.
    const bounty = log.map(l => l.match(/Bounty Hunter: (\d+) contracts loaded, (\d+) hidden/)).find(Boolean);
    check(!!bounty, 'Bounty Hunter loaded its contracts', bounty ? bounty[0] : 'no "Bounty Hunter:" line');
    if (bounty && era === 'renewal') check(bounty[2] === '0', 'Renewal: no contract hidden', bounty[0]);
    if (bounty && era === 'pre-renewal') check(Number(bounty[2]) > 0, 'Pre-renewal: Renewal-only contracts hidden', bounty[0]);
    const dummies = log.find(l => /Training Dummies:.*no dummies spawned/.test(l));
    check(!dummies, 'Training Dummies spawned', dummies || '');

    // Everything else rAthena warned about, for a look; not a failure.
    const notes = log.filter(l => /\[(Error|Warning)\]/.test(l) && !bad.includes(l));
    return { checks, notes };
}

W.prepare();
const count = W.installMod();
console.log(`standart-npc smoke test: ${count} files installed in ${W.WORLD}`);
let failed = 0;
for (const era of ERAS) {
    console.log(`\n== ${era}`);
    const { checks, notes } = runEra(era);
    for (const c of checks) {
        console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.text}`);
        if (c.detail && (!c.ok || /Bounty|entries/.test(c.detail))) console.log('      ' + c.detail.split('\n').join('\n      '));
        if (!c.ok) failed++;
    }
    if (notes.length) console.log(`note  ${notes.length} other rAthena warning(s), not from this mod's checks; see smoke-${era}.log`);
}
if (!keep) W.rotest('world', 'down');
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
