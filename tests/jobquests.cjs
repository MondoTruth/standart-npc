#!/usr/bin/env node
//===== standart-npc job quest check =========================
//= A quick look at rAthena's own Renewal job-change quests (not this
//= mod's NPCs), for when players report missing NPCs or stuck quests.
//= For every NPC a Renewal job script places, the character "Tester"
//= is turned into the class the quest is for (@jobchange, levels,
//= no unused skill points), warped next to the NPC, and talks to it:
//= is it there, is it drawn, what does it say. It does not play the
//= quests through, so a bug in the middle of one is not found here.
//=
//= The NPC list is the app's navigation index
//= (mods/navigation-server-npcs/npc-index.tsv in the app clone, or
//= read from its origin/main or upstream/main), made from the rAthena
//= the app's main branch pins. Set-up: tests/world.cjs, as play.cjs.
//=
//= Usage (from this repository):
//=   node tests/jobquests.cjs                  every Renewal job script
//=   node tests/jobquests.cjs 2-1/assassin     only files whose path has it
//=   node tests/jobquests.cjs --from=3-1/      start at that file
//=   node tests/jobquests.cjs --no-boot        use the running world
//= Takes about three hours for all of them. Results: one JSON line per
//= NPC in <app>/artifacts/rotest/jobquests.jsonl, a summary on screen,
//= and the map-server log lines naming job scripts in
//= jobquests-maplog.txt beside it.
//=
//= What the summary means:
//=   ok       shown, drawn, said something
//=   ABSENT   the client does not show it. Usually hidden by its script
//=            until a quest step (hideonnpc, cloakonnpc), but check.
//=   UNDRAWN  shown but not drawn: cloaked, or a sprite the client lacks
//=   SILENT   no dialog: signs, waiting rooms, OnTouch-only NPCs
//=   NOWARP   no walkable cell near it to warp to
//=   CORNER   a helper in a map corner (x and y <= 5), skipped
//= Pitfalls: warping onto an OnTouch NPC's area sets off its script
//= (Tester's quest variables change), and the run leaves Tester in
//= whatever class it ended with; play.cjs sets the character again.
//============================================================
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const W = require('./world.cjs');

const args = process.argv.slice(2);
const noBoot = args.includes('--no-boot');
const fromArg = (args.find(a => a.startsWith('--from=')) || '').slice(7);
const only = args.filter(a => !a.startsWith('--'));
const HELPER = fs.readFileSync(path.join(__dirname, 'play-helper.js'), 'utf8');
const OUTDIR = path.join(W.APP, 'artifacts', 'rotest');
const OUT = path.join(OUTDIR, 'jobquests.jsonl');
const INDEX = 'mods/navigation-server-npcs/npc-index.tsv';

// The class to talk with, per quest file: [job id, base level, job level].
// Job IDs: enum e_job in Flux159/rathena src/common/mmo.hpp.
// Keys match the end of the file's path (or its start, for folders);
// the longest match wins.
const NOVICE_10 = [0, 10, 10];
const CLASS = {
    'npc/re/jobs/1-1/': NOVICE_10, 'npc/jobs/1-1e/': NOVICE_10, 'npc/re/jobs/1-1e/': NOVICE_10,
    'novice/novice.txt': [0, 1, 1], 'novice/academy.txt': [0, 1, 1],
    'novice/supernovice.txt': [0, 45, 10], 'novice/supernovice_ex.txt': [23, 99, 99],
    'knight.txt': [1, 60, 50], 'priest.txt': [4, 60, 50], 'wizard.txt': [2, 60, 50],
    'blacksmith.txt': [5, 60, 50], 'hunter.txt': [3, 60, 50], 'assassin.txt': [6, 60, 50],
    'crusader.txt': [1, 60, 50], 'monk.txt': [4, 60, 50], 'sage.txt': [2, 60, 50],
    'alchemist.txt': [5, 60, 50], 'bard.txt': [3, 60, 50], 'dancer.txt': [3, 60, 50], 'rogue.txt': [6, 60, 50],
    'LordKnight.txt': [4002, 60, 50], 'HighPriest.txt': [4005, 60, 50], 'HighWizard.txt': [4003, 60, 50],
    'WhiteSmith.txt': [4006, 60, 50], 'Sniper.txt': [4004, 60, 50], 'AssassinCross.txt': [4007, 60, 50],
    'Paladin.txt': [4002, 60, 50], 'Champion.txt': [4005, 60, 50], 'Professor.txt': [4003, 60, 50],
    'Creator.txt': [4006, 60, 50], 'Clown.txt': [4004, 60, 50], 'Gypsy.txt': [4004, 60, 50], 'Stalker.txt': [4007, 60, 50],
    'StarGladiator.txt': [4046, 60, 50], 'SoulLinker.txt': [4046, 60, 50],
    'kagerou_oboro.txt': [25, 99, 70], 'rebellion.txt': [24, 99, 70],
    'rune_knight.txt': [7, 99, 50], 'archbishop.txt': [8, 99, 50], 'warlock.txt': [9, 99, 50],
    'mechanic.txt': [10, 99, 50], 'ranger.txt': [11, 99, 50], 'guillotine_cross.txt': [12, 99, 50],
    'royal_guard.txt': [14, 99, 50], 'sura.txt': [15, 99, 50], 'sorcerer.txt': [16, 99, 50],
    'shadow_chaser.txt': [17, 99, 50], 'genetic.txt': [18, 99, 50], 'minstrel.txt': [19, 99, 50], 'wanderer.txt': [20, 99, 50],
    'spirit_handler.txt': [4218, 200, 60], 'valkyrie.txt': [7, 99, 50], 'repair.txt': [7, 99, 50],
};
function classFor(file) {
    let best = [0, 1, 1], len = -1;
    for (const [k, v] of Object.entries(CLASS))
        if ((file.endsWith(k) || file.startsWith(k)) && k.length > len) { best = v; len = k.length; }
    return best;
}

function readIndexText() {
    const local = path.join(W.APP, INDEX);
    if (fs.existsSync(local)) return fs.readFileSync(local, 'utf8');
    for (const ref of ['origin/main', 'upstream/main']) {
        const r = spawnSync('git', ['-C', W.APP, 'show', `${ref}:${INDEX}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
        if (r.status === 0) return r.stdout;
    }
    W.die(`no ${INDEX} in the app clone or its origin/main, upstream/main (git fetch there)`);
}

// Renewal job scripts in load order, with their NPCs.
function readIndex() {
    const loaded = [], npcs = {};
    let cur = null;
    for (const line of readIndexText().split('\n')) {
        const f = line.split('\t');
        if (f[0] === 'load' && f[1] === 'renewal' && /jobs\//.test(f[2])) loaded.push(f[2]);
        else if (f[0] === 'file') cur = f[1];
        else if (f[0] === 'npc' && cur) (npcs[cur] = npcs[cur] || []).push({ map: f[1], x: +f[2], y: +f[3], sprite: +f[5], name: f[6] });
    }
    return loaded.map(file => {
        let list = npcs[file] || [];
        if (file.endsWith('academy.txt')) {   // hundreds of repeats: one of each name
            const seen = new Set();
            list = list.filter(n => !seen.has(n.name) && seen.add(n.name));
        }
        return { file, npcs: list };
    });
}

const ev = js => {
    const r = W.rotestJson('eval', js);
    return r.result !== undefined ? r.result : { error: r.error || JSON.stringify(r).slice(0, 300) };
};
const gm = text => W.rotest('gm', text);
const pause = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Talks to the NPC called `name` (the part before '#') nearest to x,y and
// reads its dialog: Next until a menu (cancelled) or Close, at most 15 pages.
const talk = (name, x, y) => `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const me = roAgent.player();
    const all = roAgent.entities({ radius: 30 }).filter(e => /^NPC/.test(e.type));
    const same = all.filter(e => e.name.split('#')[0] === ${JSON.stringify(name)})
        .map(e => ({ ...e, d: Math.hypot(e.position[0] - ${x}, e.position[1] - ${y}) })).sort((a, b) => a.d - b.d);
    const out = { me: me && [me.map, ...me.position], seen: same.length > 0 };
    if (!same.length) {
        out.near = all.filter(e => Math.hypot(e.position[0] - ${x}, e.position[1] - ${y}) <= 3).map(e => e.name + ' ' + e.position.join(','));
        return out;
    }
    const npc = same[0];
    Object.assign(out, { full: npc.name, at: npc.position, off: Math.round(npc.d * 10) / 10, drawn: !!npc.pickRect, job: npc.job });
    const chatBefore = roAgent.chat(30);
    const M = roAgent.modules;
    const p = new M.PACKET.CZ.CONTACTNPC(); p.NAID = npc.gid; p.type = 1; M.Network.sendPacket(p);
    let v = snpc.view();
    for (let i = 0; i < 12 && !v.text && !v.menu.length; i++) { await sleep(250); v = snpc.view(); }
    out.pages = [];
    for (let i = 0; i < 15; i++) {
        if (v.text) out.pages.push(v.text.slice(0, 400));
        if (v.menu.length) { out.menu = v.menu.map(m => m.text); v = await snpc.choose(255); break; }
        if (v.next) { v = await snpc.next(); continue; }
        if (v.close) { await snpc.close(); out.closed = true; break; }
        break;
    }
    if (snpc.inputOpen()) { out.input = true; await snpc.input(''); }
    const left = snpc.view();
    if (left.menu.length) await snpc.choose(255);
    if (left.close || left.next) await snpc.close();
    out.chat = roAgent.chat(30).filter(l => !chatBefore.includes(l)).slice(-5);
    return out;
})()`;

// Closes whatever NPC window is still open: an input box left open takes
// the next @ command as its answer.
const UNSTICK = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 3; i++) {
        if (snpc.inputOpen()) await snpc.input('');
        const v = snpc.view();
        if (v.menu.length) await snpc.choose(255);
        if (v.next || v.close) await snpc.close();
        await sleep(200);
    }
    try { roAgent.modules.UIManager.getComponent('InputBox').remove(); } catch { /* not open */ }
    return 'ok';
})()`;

function near(n, limit) {
    const me = ev('roAgent.player()');
    return !!(me && me.map && me.map.replace(/\.gat$/, '') === n.map && Math.hypot(me.position[0] - n.x, me.position[1] - n.y) <= limit);
}

// @warp onto a cell that cannot be walked lands on a random one, so a
// few cells around the NPC are tried.
function warpNear(n) {
    if (near(n, 9)) return true;
    ev(UNSTICK);
    for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0], [0, -1], [1, 1], [-1, -1], [0, -4], [0, 4], [-4, 0], [4, 0]]) {
        gm(`@warp ${n.map} ${n.x + dx} ${n.y + dy}`);
        if (near(n, 12)) return true;
    }
    return false;
}

let current = null;
function setClass(cls) {
    current = cls;
    const [job, base, jl] = cls;
    gm(`@jobchange ${job}`);
    gm('@blvl -999'); if (base > 1) gm(`@blvl ${base - 1}`);
    gm('@jlvl -999'); if (jl > 1) gm(`@jlvl ${jl - 1}`);
    gm('@skpoint -999');   // 2nd-class quests refuse unused skill points
    gm('@heal');
}

function enter() {
    W.rotest('stop'); pause(5000);
    let login = {};
    for (let i = 0; i < 3 && !login.ok; i++) {
        W.rotest('start');
        login = W.rotestJson('login');
        if (!login.ok) { W.rotest('stop'); pause(5000); }
    }
    if (!login.ok) W.die('log in: ' + JSON.stringify(login).slice(0, 300));
    const char = W.rotestJson('char', '0');
    if (!char.ok) W.die('enter the game: ' + JSON.stringify(char).slice(0, 300));
    ev(HELPER);
    gm('@speed 0');
    if (current) setClass(current);
}

function tagOf(r) {
    if (r.warp === 'corner') return 'CORNER';
    if (r.warp) return 'NOWARP';
    if (!r.seen) return 'ABSENT';
    if (!r.drawn) return 'UNDRAWN';
    return (r.pages && r.pages.length) || (r.menu && r.menu.length) ? 'ok' : 'SILENT';
}

let files = readIndex().filter(f => !only.length || only.some(o => f.file.includes(o)));
if (fromArg) {
    const at = files.findIndex(f => f.file.includes(fromArg));
    if (at < 0) W.die(`no job script matching ${fromArg}`);
    files = files.slice(at);
}
console.log(`standart-npc job quest check: ${files.length} Renewal job scripts, ${files.reduce((s, f) => s + f.npcs.length, 0)} NPCs`);
if (!noBoot) {
    W.prepare();
    W.installMod();
    const up = W.boot('renewal');
    if (!up.ok) W.die('world up failed:\n' + up.out.trim().split('\n').slice(-5).join('\n'));
}
fs.mkdirSync(OUTDIR, { recursive: true });
if (!fromArg) fs.writeFileSync(OUT, '');
enter();
const counts = {};
for (const f of files) {
    setClass(classFor(f.file));
    console.log(`\n== ${f.file} (job ${current.join('/')}), ${f.npcs.length} NPCs`);
    const sorted = [...f.npcs].sort((a, b) => a.map.localeCompare(b.map) || a.x - b.x || a.y - b.y);
    for (const n of sorted) {
        const rec = { file: f.file, cls: current, ...n };
        if (n.x <= 5 && n.y <= 5) rec.warp = 'corner';
        else {
            let ok = warpNear(n);
            if (!ok) { console.log('  (stuck or disconnected: logging in again)'); enter(); ok = warpNear(n); rec.relogin = true; }
            if (!ok) rec.warp = 'failed';
            else { ev(HELPER); Object.assign(rec, ev(talk(n.name, n.x, n.y))); }
        }
        fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
        const tag = tagOf(rec);
        counts[tag] = (counts[tag] || 0) + 1;
        const said = ((rec.pages || []).slice(-1)[0] || '').replace(/\s+/g, ' ').slice(-90);
        console.log(`  ${tag.padEnd(7)} ${n.map} ${n.x},${n.y} ${n.name}${said ? '  | ' + said : ''}`);
    }
}
const log = W.rotest('server', 'logs', 'map', '30000').out.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').split('\n');
const jobLines = [];
log.forEach((line, i) => { if (/jobs\//.test(line)) jobLines.push(...log.slice(Math.max(0, i - 4), i + 1), '----'); });
fs.writeFileSync(path.join(OUTDIR, 'jobquests-maplog.txt'), jobLines.join('\n'));
W.rotest('stop');
console.log('\n' + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(`results: ${OUT}`);
console.log(`map-server log lines naming job scripts: ${jobLines.filter(l => /jobs\//.test(l)).length} (jobquests-maplog.txt)`);
