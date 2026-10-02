#!/usr/bin/env node
//===== standart-npc smoke test ==============================
//= Starts a throwaway Ragnarok Offline world with this mod, once per
//= era, and checks the map-server log: no script errors, no unknown
//= IDs, the mod's tables read, the mod's own start-up lines there.
//= No browser, no player: it only proves the server loads the mod.
//=
//= Needs a clone of the app (Flux159/ragnarokoffline.app, or a fork)
//= with the client, supervisor and asset server built and the server
//= images downloaded -- docs/AGENT_TESTING.md in that repository,
//= "Setting up a world". The app itself can stay open: the world runs
//= on its own ports.
//=
//= Usage (from this repository, in Git Bash or any shell with node):
//=   node tests/smoke.cjs                 both eras
//=   node tests/smoke.cjs renewal         one era (or pre-renewal)
//=   node tests/smoke.cjs --keep          leave the world running
//= Environment:
//=   SNPC_APP    the app clone (default ../ragnarokoffline.app)
//=   SNPC_WORLD  the test world (default <app>/artifacts/snpc-world)
//= Exit code 0 = every check passed. The full map-server log of each
//= run is saved next to the world as smoke-<era>.log.
//============================================================
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const APP = path.resolve(process.env.SNPC_APP || path.join(REPO, '..', 'ragnarokoffline.app'));
const WORLD = path.resolve(process.env.SNPC_WORLD || path.join(APP, 'artifacts', 'snpc-world'));
const ROTEST = path.join(APP, 'scripts', 'rotest.cjs');
const MOD = 'standart-npc';

// Ports of their own, so the world runs beside the player's app
// (docs/AGENT_TESTING.md, "Running beside the app").
const ENV = {
    ...process.env, RO_E2E_WORLD: WORLD,
    RAGNAROK_OFFLINE_ASSET_PORT: '13338', RAGNAROK_OFFLINE_LOGIN_PORT: '16900',
    RAGNAROK_OFFLINE_CHAR_PORT: '16121', RAGNAROK_OFFLINE_MAP_PORT: '15121',
    RAGNAROK_OFFLINE_AGENT_PORT: '17490', ROTEST_PORT: '17480',
};

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const eras = args.filter(a => !a.startsWith('--'));
const ERAS = eras.length ? eras : ['renewal', 'pre-renewal'];
for (const era of ERAS) if (!['renewal', 'pre-renewal'].includes(era)) die(`unknown era: ${era}`);

function die(text) { console.error('smoke: ' + text); process.exit(2); }
function rotest(...words) {
    const r = spawnSync(process.execPath, [ROTEST, ...words], { env: ENV, encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.error) throw r.error;
    return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}
// rAthena colours its log; the app's copy also runs lines together.
const clean = text => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/\r/g, '\n')
    .replace(/(\[(?:Status|Info|Warning|Error|Debug|Notice|SQL)\])/g, '\n$1');

// ---- the world ----------------------------------------------------------
function prepareWorld() {
    if (!fs.existsSync(ROTEST)) die(`no app clone at ${APP} (set SNPC_APP)`);
    if (!fs.existsSync(WORLD)) {
        const r = rotest('world', 'prepare');
        if (!r.ok) die('world prepare failed:\n' + r.out);
    }
    // world prepare copies only bin/ and guest/ from the installed app. On
    // Windows the engine also needs runtime/lib (krun.dll), and every mod
    // table wants rAthena's db-import stubs.
    const installed = process.env.RO_E2E_RUNTIME || path.join(process.env.APPDATA || '', 'Ragnarok Offline', 'runtime');
    for (const name of ['lib', 'db-import']) {
        const from = path.join(installed, name), to = path.join(WORLD, 'runtime', name);
        if (fs.existsSync(from) && !fs.existsSync(to)) fs.cpSync(from, to, { recursive: true });
    }
}

// The mod as the release zip ships it (.github/workflows/release.yml).
function installMod() {
    const mods = path.join(WORLD, 'state', 'mods');
    fs.rmSync(path.join(mods, MOD), { recursive: true, force: true });
    fs.mkdirSync(mods, { recursive: true });
    const files = spawnSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8' }).stdout.split('\0').filter(Boolean)
        .filter(f => !/^(README\.md|CLAUDE\.md|\.gitattributes|assets\/|\.github\/|tests\/)/.test(f));
    for (const f of files) {
        const to = path.join(mods, MOD, f);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(path.join(REPO, f), to);
    }
    // mod.json says "default": "off"; switch it on.
    const enabled = path.join(mods, 'enabled.txt');
    const list = fs.existsSync(enabled) ? fs.readFileSync(enabled, 'utf8').split(/\r?\n/).filter(Boolean) : [];
    if (!list.includes(MOD)) fs.writeFileSync(enabled, [...list, MOD].join('\n') + '\n');
    return files.length;
}

// ---- one era ------------------------------------------------------------
function runEra(era) {
    const checks = [];
    const check = (ok, text, detail = '') => checks.push({ ok, text, detail });
    const marker = path.join(WORLD, 'state', 'prerenewal');
    if (era === 'pre-renewal') fs.writeFileSync(marker, 'true'); else fs.rmSync(marker, { force: true });

    rotest('world', 'down');
    const up = rotest('world', 'up');
    check(up.ok, 'world starts', up.ok ? '' : up.out.trim().split('\n').slice(-5).join('\n'));
    if (!up.ok) return { checks, notes: [] };
    const modsLine = up.out.split('\n').find(l => /^mods: .*\b/.test(l) && l.includes(MOD) && !l.includes('was not applied'));
    check(!!modsLine, 'mod applied (supervisor "mods:" line)', up.out.split('\n').filter(l => l.includes(MOD)).join('\n'));

    // Only the last start of the map server: the log keeps every start.
    const all = clean(rotest('server', 'logs', 'map', '20000').out).split('\n');
    let start = 0;
    all.forEach((line, i) => { if (/Done reading '\d+' messages in 'conf\/msg_conf\/map_msg\.conf'/.test(line)) start = i; });
    const log = all.slice(start);
    fs.writeFileSync(path.join(path.dirname(WORLD), `smoke-${era}.log`), log.join('\n'));
    check(log.some(l => /Server is 'ready'/.test(l)), 'map server ready');

    // Problems this mod has caused before (#22, #24, #25) or could.
    const bad = log.filter(l => /script error|npc_parse|buildin_|Unknown mob ID|Invalid sell item|does not exists? in the item_db|parse_simpleexpr|Invalid NPC constant|was not applied/i.test(l)
        || (l.includes(MOD) && /\[(Error|Warning)\]/.test(l)));
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

// ---- main ---------------------------------------------------------------
prepareWorld();
const count = installMod();
console.log(`standart-npc smoke test: ${count} files installed in ${WORLD}`);
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
if (!keep) rotest('world', 'down');
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
