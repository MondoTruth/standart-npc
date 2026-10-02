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
    RAGNAROK_OFFLINE_AGENT_PORT: '17490', ROTEST_PORT: '17480',
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
    if (!fs.existsSync(WORLD)) {
        const r = rotest('world', 'prepare');
        if (!r.ok) die('world prepare failed:\n' + r.out);
    }
    // Before Flux159/ragnarokoffline.app#265, world prepare copied only bin/
    // and guest/ from the installed app; on Windows the engine also needs
    // runtime/lib (krun.dll), and mod tables want db-import.
    const installed = process.env.RO_E2E_RUNTIME || path.join(process.env.APPDATA || '', 'Ragnarok Offline', 'runtime');
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

function parseEras(args) {
    const eras = args.filter(a => !a.startsWith('--'));
    for (const era of eras) if (!ERAS.includes(era)) die(`unknown era: ${era}`);
    return eras.length ? eras : ERAS;
}

module.exports = { REPO, APP, WORLD, MOD, ENV, die, rotest, rotestJson, prepare, installMod, boot, parseEras };
