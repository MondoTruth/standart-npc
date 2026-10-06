//===== standart-npc test world ==============================
//= Shared by tests/smoke.cjs and tests/play.cjs: a throwaway Ragnarok
//= Offline world from the app's scripts/rotest, with this mod installed
//= as the release zip ships it, on ports of its own so the player's app
//= can stay open.
//=
//= Needs a clone of the app (Flux159/ragnarokoffline.app, or a fork)
//= with the client, supervisor and asset server built and the server
//= images downloaded -- docs/AGENT_TESTING.md there, "Setting up a
//= world". play.cjs also needs `npx playwright install chromium` there.
//= Environment:
//=   SNPC_APP    the app clone (default ../ragnarokoffline.app)
//=   SNPC_WORLD  the test world (default <app>/artifacts/snpc-world)
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
const ERAS = ['renewal', 'pre-renewal'];

// Ports of their own (docs/AGENT_TESTING.md, "Running beside the app").
const ENV = {
    ...process.env, RO_E2E_WORLD: WORLD,
    RAGNAROK_OFFLINE_ASSET_PORT: '13338', RAGNAROK_OFFLINE_LOGIN_PORT: '16900',
    RAGNAROK_OFFLINE_CHAR_PORT: '16121', RAGNAROK_OFFLINE_MAP_PORT: '15121',
    RAGNAROK_OFFLINE_AGENT_PORT: '17490', RAGNAROK_OFFLINE_WEB_PORT: '18888',
    ROTEST_PORT: '17480',
};

function die(text) { console.error('test: ' + text); process.exit(2); }

function rotest(...words) {
    const r = spawnSync(process.execPath, [ROTEST, ...words], { env: ENV, encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.error) throw r.error;
    return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}

// rotest prints one JSON object per command.
function rotestJson(...words) {
    const r = rotest(...words);
    try { return JSON.parse(r.out); } catch { return { error: r.out.trim() }; }
}

function prepare() {
    if (!fs.existsSync(ROTEST)) die(`no app clone at ${APP} (set SNPC_APP)`);
    const installed = process.env.RO_E2E_RUNTIME || path.join(process.env.APPDATA || '', 'Ragnarok Offline', 'runtime');
    // world prepare copies the installed app's runtime (server, supervisor)
    // once. After the app is updated the world would go on testing the old
    // server, so a world from another app version is made again.
    const version = dir => { try { return fs.readFileSync(path.join(dir, 'APP_VERSION'), 'utf8').trim(); } catch { return ''; } };
    const want = version(installed), have = version(path.join(WORLD, 'runtime'));
    if (fs.existsSync(WORLD) && want && have !== want) {
        console.log(`test world is from app ${have || '?'}, the installed app is ${want}: making it again`);
        rotest('world', 'down');
        fs.rmSync(WORLD, { recursive: true, force: true });
    }
    if (!fs.existsSync(WORLD)) {
        const r = rotest('world', 'prepare');
        if (!r.ok) die('world prepare failed:\n' + r.out);
    }
    // Before Flux159/ragnarokoffline.app#265, world prepare copied only bin/
    // and guest/ from the installed app; on Windows the engine also needs
    // runtime/lib (krun.dll), and mod tables want db-import.
    for (const name of ['lib', 'db-import']) {
        const from = path.join(installed, name), to = path.join(WORLD, 'runtime', name);
        if (fs.existsSync(from) && !fs.existsSync(to)) fs.cpSync(from, to, { recursive: true });
    }
}

// The mod as the release zip ships it (.github/workflows/release.yml),
// switched on: mod.json says "default": "off".
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
    const enabled = path.join(mods, 'enabled.txt');
    const list = fs.existsSync(enabled) ? fs.readFileSync(enabled, 'utf8').split(/\r?\n/).filter(Boolean) : [];
    if (!list.includes(MOD)) fs.writeFileSync(enabled, [...list, MOD].join('\n') + '\n');
    return files.length;
}

// Restarts the world in `era`. Returns { ok, out } of `world up`.
function boot(era) {
    const marker = path.join(WORLD, 'state', 'prerenewal');
    if (era === 'pre-renewal') fs.writeFileSync(marker, 'true'); else fs.rmSync(marker, { force: true });
    rotest('stop');
    rotest('world', 'down');
    return rotest('world', 'up');
}

// rAthena colours its log; the app's copy also runs lines together.
const clean = text => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/\r/g, '\n')
    .replace(/(\[(?:Status|Info|Warning|Error|Debug|Notice|SQL)\])/g, '\n$1');

// Errors from the app's own scripts, not this mod's: a note, not a failure.
const APP_OWN = [
    // Population engine's recruiter.txt (app 1.4.8): the floating template
    // runs OnInit and tries to hide itself by a name no NPC on a map has.
    /buildin_hide: Attempted to disablenpc a non-existing NPC 'Companion Recruiter'/,
];

// What the server says about the mod after boot(era) (its { ok, out }):
// the mod applied, the map server ready, no script errors or unknown IDs,
// the mod's tables read, its start-up lines. Saves the map-server log of
// this start as smoke-<era>.log next to the world. Returns
// { checks: [{ ok, text, detail }], notes }: notes are rAthena's other
// warnings, for a look.
function serverChecks(era, up) {
    const checks = [];
    const check = (ok, text, detail = '') => checks.push({ ok: !!ok, text, detail });
    const modsLine = up.out.split('\n').find(l => /^mods: /.test(l) && l.includes(MOD) && !l.includes('was not applied'));
    check(modsLine, 'mod applied (supervisor "mods:" line)', up.out.split('\n').filter(l => l.includes(MOD)).join('\n'));

    // Only the last start of the map server: the log keeps every start.
    const all = clean(rotest('server', 'logs', 'map', '20000').out).split('\n');
    let start = 0;
    all.forEach((line, i) => { if (/Done reading '\d+' messages in 'conf\/msg_conf\/map_msg\.conf'/.test(line)) start = i; });
    const log = all.slice(start);
    fs.writeFileSync(path.join(path.dirname(WORLD), `smoke-${era}.log`), log.join('\n'));
    check(log.some(l => /Server is 'ready'/.test(l)), 'map server ready');

    // Problems this mod has caused before (#22, #24, #25) or could.
    const bad = log.filter(l => !APP_OWN.some(re => re.test(l)) && (
        /script error|npc_parse|buildin_|Unknown mob ID|Invalid sell item|does not exists? in the item_db|parse_simpleexpr|Invalid NPC constant|was not applied/i.test(l)
        || (l.includes(MOD) && /\[(Error|Warning)\]/.test(l))));
    check(bad.length === 0, 'no script errors, unknown IDs or NPC parse problems', bad.slice(0, 15).join('\n'));

    // The mod's own tables (Training Dummy: 2 monsters, 2 looks).
    for (const table of ['mob_db', 'mob_avail']) {
        const m = log.map(l => l.match(new RegExp(`Done reading '(\\d+)' entries in 'db/import/${table}\\.yml'`))).find(Boolean);
        check(m && Number(m[1]) >= 2, `db/import/${table}.yml read`, m ? `${m[1]} entries` : 'not in the log');
    }

    // The mod's own start-up lines.
    const bounty = log.map(l => l.match(/Bounty Hunter: (\d+) contracts loaded, (\d+) hidden/)).find(Boolean);
    check(bounty, 'Bounty Hunter loaded its contracts', bounty ? bounty[0] : 'no "Bounty Hunter:" line');
    if (bounty && era === 'renewal') check(bounty[2] === '0', 'Renewal: no contract hidden', bounty[0]);
    if (bounty && era === 'pre-renewal') check(Number(bounty[2]) > 0, 'Pre-renewal: Renewal-only contracts hidden', bounty[0]);
    const dummies = log.find(l => /Training Dummies:.*(no dummies spawned|did not spawn)/.test(l));
    check(!dummies, 'Training Dummies spawned', dummies || '');

    const notes = log.filter(l => /\[(Error|Warning)\]/.test(l) && !bad.includes(l));
    return { checks, notes };
}

// Prints one era's checks: failures with their detail, info lines and a
// count; every passed check too with --verbose. Returns the failures.
function report(checks, { verbose = false } = {}) {
    let failed = 0, passed = 0;
    for (const c of checks) {
        if (c.info) { console.log(`info  ${c.text}${c.detail ? ': ' + c.detail : ''}`); continue; }
        if (c.ok) passed++; else failed++;
        if (c.ok && !verbose) continue;
        console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.text}`);
        if (c.detail) console.log('      ' + String(c.detail).split('\n').join('\n      '));
    }
    console.log(`${passed} passed, ${failed} failed`);
    return failed;
}

function parseEras(args) {
    const eras = args.filter(a => !a.startsWith('-'));
    for (const era of eras) if (!ERAS.includes(era)) die(`unknown era: ${era}`);
    return eras.length ? eras : ERAS;
}

module.exports = { REPO, APP, WORLD, MOD, ENV, die, rotest, rotestJson, prepare, installMod, boot, parseEras, serverChecks, report };
