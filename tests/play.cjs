#!/usr/bin/env node
//===== standart-npc play test ===============================
//= Plays the mod in a throwaway world, once per era: logs a character
//= in through the real game client, talks to the NPCs and checks what
//= they say and show. Set-up: tests/world.cjs (plus Chromium for
//= Playwright in the app clone). NPC talk goes through
//= tests/play-helper.js, the same packets the client's NPC windows send.
//=
//= Usage (from this repository):
//=   node tests/play.cjs                  both eras
//=   node tests/play.cjs renewal          one era (or pre-renewal)
//=   node tests/play.cjs --keep           leave the world running
//= Exit code 0 = every check passed. A screenshot per era lands in the
//= app clone's artifacts/rotest/.
//=
//= The test character is "Tester" on the tester account. Before each
//= run it is set, through SQL, to a Dragon Knight Lv 210 (Renewal) or a
//= Lord Knight Lv 99 (Pre-renewal), and its Bounty Hunter progress is
//= cleared, so every run starts from the same place.
//============================================================
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const W = require('./world.cjs');

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const ERAS = W.parseEras(args);
const HELPER = fs.readFileSync(path.join(__dirname, 'play-helper.js'), 'utf8');
const CHAR = 'Tester';

// Per era: the character, and what the NPCs should show.
const EXPECT = {
    'renewal': {
        job: 4252, level: 210,   // Dragon Knight
        bountyMenu: ['Target Hunt', 'Overlook Water Dungeon', 'Illusion Dungeons', 'Daily Area Purge', 'Cancel'],
        purgeMaps: ['sp_rudus4'],  // Lv 201-230: one map (#24)
        dummy: { 28412: ['Size:Medium', 'Lv:150'], 28413: ['Size:Large', 'Lv:150'] },
        blessing: true,            // Blacksmith Blessing in the Tool Dealer
    },
    'pre-renewal': {
        job: 4008, level: 99,    // Lord Knight
        bountyMenu: ['Target Hunt', 'Overlook Water Dungeon', 'Daily Area Purge', 'Cancel'],
        purgeMaps: ['ice_dun01', 'gl_church', 'yuno_fild08', 'ra_fild12', 'mosk_dun02', 'gef_fild06', 'gef_fild08'],
        dummy: { 28412: ['Size:Medium', 'Lv:99', 'DEF:0'], 28413: ['Size:Large', 'Lv:99', 'DEF:0'] },
        blessing: false,
    },
};

const ev = js => {
    const r = W.rotestJson('eval', js);
    return r.result !== undefined ? r.result : { error: r.error || JSON.stringify(r) };
};
const gm = text => W.rotest('gm', text);
const sqlRows = query => W.rotest('server', 'sql', query).out.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l));

// rotest's login waits for the newer login window's #user field. iRO client
// data has no art for that window, so the client shows the classic one,
// whose fields are .user/.pass, so that wait times out. Until rotest
// knows the classic window too, fill it here.
function login() {
    const first = W.rotestJson('login');
    if (first.ok || !/#user/.test(JSON.stringify(first))) return first;
    ev(`(async () => {
        const find = (sel, root = document) => root.querySelector(sel)
            || [...root.querySelectorAll('*')].filter(e => e.shadowRoot).map(e => find(sel, e.shadowRoot)).find(Boolean);
        const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
        set(find('input.user'), 'tester'); set(find('input.pass'), 'tester123');
        find('button.connect').click();
    })()`);
    for (let i = 0; i < 30; i++) {
        const seen = ev(`(() => { const find = (sel, root = document) => root.querySelector(sel)
            || [...root.querySelectorAll('*')].filter(e => e.shadowRoot).map(e => find(sel, e.shadowRoot)).find(Boolean);
            const s = find('#slot0'); return !!s && s.offsetParent !== null; })()`);
        if (seen === true) return { ok: true, via: 'classic login window' };
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
    return { ok: false, error: 'character select did not appear after the classic login' };
}

function setUpCharacter(era) {
    const e = EXPECT[era];
    const checks = [];
    let id = sqlRows(`SELECT char_id FROM \`char\` WHERE name='${CHAR}'`)[0];
    if (!id) {
        W.rotest('start');
        const login_ = login();
        if (!login_.ok) return [{ ok: false, text: 'log in to create the character', detail: JSON.stringify(login_).slice(0, 300) }];
        W.rotest('create', '0', CHAR);
        W.rotest('stop');
        id = sqlRows(`SELECT char_id FROM \`char\` WHERE name='${CHAR}'`)[0];
    }
    if (!id) return [{ ok: false, text: `character ${CHAR} exists` }];
    // Restarts the game servers, so before anyone is logged in.
    const w = W.rotest('server', 'sql', '--write',
        `UPDATE \`char\` SET class=${e.job}, base_level=${e.level}, job_level=50, last_map='prontera', last_x=156, last_y=180 WHERE char_id=${id};`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`
        + ` DELETE FROM char_reg_str WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`);
    checks.push({ ok: w.ok, text: `character set to job ${e.job}, Lv ${e.level}, no Bounty progress`, detail: w.ok ? '' : w.out.slice(-300) });
    return checks;
}

function enterGame() {
    W.rotest('start');
    const login_ = login();
    if (!login_.ok) return { ok: false, detail: JSON.stringify(login_).slice(0, 300) };
    const char = W.rotestJson('char', '0');
    if (!char.ok) return { ok: false, detail: JSON.stringify(char).slice(0, 300) };
    const helper = ev(HELPER);
    return { ok: helper === 'installed' || helper === 'ready', detail: `${char.player && char.player.map} ${JSON.stringify(helper)}` };
}

function runEra(era) {
    const e = EXPECT[era];
    const checks = [];
    const check = (ok, text, detail = '') => checks.push({ ok: !!ok, text, detail });

    const up = W.boot(era);
    check(up.ok, 'world starts', up.ok ? '' : up.out.trim().split('\n').slice(-5).join('\n'));
    if (!up.ok) return checks;
    checks.push(...setUpCharacter(era));
    const entered = enterGame();
    check(entered.ok, 'in game, NPC helper loaded', entered.detail);
    if (!entered.ok) return checks;

    // Buffer: no window; heals, buffs and says so in chat.
    gm('@warp prontera 163 190');
    ev(`snpc.talk('Buffer')`);
    const chat = ev(`snpc.chat(4)`);
    const line = Array.isArray(chat) ? chat.find(l => l.startsWith('Fully healed!')) : null;
    check(line === 'Fully healed! Buffs: Blessing, Increase AGI, Kyrie Eleison, Magnificat.', 'Buffer: heal and the default buffs', line || JSON.stringify(chat));

    // Bounty Hunter: the menu for this era, by item text.
    gm('@warp prontera 147 170');
    const opened = ev(`(async () => { await snpc.talk('Bounty Hunter'); let v = snpc.view(); for (let i = 0; i < 4 && !v.menu.length && v.next; i++) v = await snpc.next(); return v.menu; })()`);
    const labels = Array.isArray(opened) ? opened.map(i => i.text) : [];
    const menuOk = labels.length === e.bountyMenu.length && e.bountyMenu.every((p, i) => labels[i] && labels[i].startsWith(p));
    check(menuOk, 'Bounty Hunter: menu for this era', labels.join(' | ') || JSON.stringify(opened));

    // Daily Area Purge: picked by its text, so its number must still be
    // right when an option before it is hidden (Pre-renewal, #28); and at
    // Lv 201-230 the one-map pool must not stop the script (#24).
    const purge = ev(`(async () => { await snpc.pick('Daily Area Purge'); const v = await snpc.go('Accept'); const t = v.text || ''; await snpc.close(); return t; })()`);
    const area = typeof purge === 'string' ? (purge.match(/Your area: .*?\(([a-z0-9_]+)\)/) || [])[1] : null;
    check(area && e.purgeMaps.includes(area), `Bounty Hunter: Area Purge at Lv ${e.level} gives a map of its range`, area ? `area ${area}` : JSON.stringify(purge).slice(-300));

    // Training Dummies: both there, with their own size.
    gm('@warp prontera 155 160');
    const mobs = ev(`roAgent.entities({ type: 'MOB', radius: 8 }).map(m => m.name + ' ' + m.position.join(','))`);
    check(Array.isArray(mobs) && mobs.includes('Medium Dummy 153,163') && mobs.includes('Large Dummy 158,163'),
        'Training Dummies: Medium at 153,163 and Large at 158,163', JSON.stringify(mobs));
    for (const [id, wanted] of Object.entries(e.dummy)) {
        gm(`@mobinfo ${id}`);
        const info = ev(`snpc.chat(8).join(' ')`);
        check(typeof info === 'string' && wanted.every(w => info.includes(w)), `Training Dummies: @mobinfo ${id} shows ${wanted.join(', ')}`,
            typeof info === 'string' ? (info.match(/Lv:\d+|DEF:\d+|Size:\w+/g) || []).join(' ') : JSON.stringify(info));
    }

    // Tool Dealer: Blacksmith Blessing only where the item exists.
    gm('@warp prontera 143 176');
    const shop = ev(`snpc.shop('Tool Dealer')`);
    const items = shop && Array.isArray(shop.items) ? shop.items : [];
    check(items.includes('Red Potion'), 'Tool Dealer: shop opens', `${items.length} items`);
    check(items.includes('Blacksmith Blessing') === e.blessing, `Tool Dealer: Blacksmith Blessing ${e.blessing ? 'sold' : 'not sold'}`,
        items.includes('Blacksmith Blessing') ? 'listed' : 'not listed');

    const shot = W.rotestJson('shot', `play-${era}`);
    if (shot.file) checks.push({ ok: true, text: 'screenshot', detail: shot.file, info: true });
    return checks;
}

W.prepare();
const count = W.installMod();
console.log(`standart-npc play test: ${count} files installed in ${W.WORLD}`);
let failed = 0;
for (const era of ERAS) {
    console.log(`\n== ${era}`);
    for (const c of runEra(era)) {
        console.log(`${c.info ? 'info' : c.ok ? 'PASS' : 'FAIL'}  ${c.text}`);
        if (c.detail) console.log('      ' + String(c.detail).split('\n').join('\n      '));
        if (!c.ok) failed++;
    }
}
if (!keep) { W.rotest('stop'); W.rotest('world', 'down'); }
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
