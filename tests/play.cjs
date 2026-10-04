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
//= cleared, so every run starts from the same place. It also gets a
//= +5 Knife [4] with two cards, for the Card Exchanger check, and
//= its Welcoming gift is cleared.
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
// Card Exchanger (#41): item and card IDs checked in the fork's
// db/re and db/pre-re item_db (Knife_ 1202 has 4 slots in both eras).
const CARD_TEST = { knife: 1202, keep: 4001, pull: 4002 };   // Knife [4], Poring Card, Fabre Card
let charId = null;

// Per era: the character, and what the NPCs should show.
const EXPECT = {
    'renewal': {
        job: 4252, level: 210,   // Dragon Knight
        bountyMenu: ['Target Hunt', 'Overlook Water Dungeon', 'Illusion Dungeons', 'Daily Area Purge', 'Cancel'],
        purgeMaps: ['sp_rudus4'],  // Lv 201-230: one map (#24)
        dummy: { 28412: ['Size:Medium', 'Lv:150'], 28413: ['Size:Large', 'Lv:150'] },
        blessing: true,            // Blacksmith Blessing in the Tool Dealer
        welcome: true,             // Welcoming in Izlude: Renewal only
    },
    'pre-renewal': {
        job: 4008, level: 99,    // Lord Knight
        bountyMenu: ['Target Hunt', 'Overlook Water Dungeon', 'Daily Area Purge', 'Cancel'],
        purgeMaps: ['ice_dun01', 'gl_church', 'yuno_fild08', 'ra_fild12', 'mosk_dun02', 'gef_fild06', 'gef_fild08'],
        dummy: { 28412: ['Size:Medium', 'Lv:99', 'DEF:0'], 28413: ['Size:Large', 'Lv:99', 'DEF:0'] },
        blessing: false,
        welcome: false,
    },
};

const ev = js => {
    const r = W.rotestJson('eval', js);
    return r.result !== undefined ? r.result : { error: r.error || JSON.stringify(r) };
};
const gm = text => W.rotest('gm', text);
const sqlOne = query => sqlRows(query)[0];
const sqlRows = query => W.rotest('server', 'sql', query).out.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l));

function setUpCharacter(era) {
    const e = EXPECT[era];
    const checks = [];
    let id = sqlRows(`SELECT char_id FROM \`char\` WHERE name='${CHAR}'`)[0];
    if (!id) {
        W.rotest('start');
        const login_ = W.rotestJson('login');
        if (!login_.ok) return [{ ok: false, text: 'log in to create the character', detail: JSON.stringify(login_).slice(0, 300) }];
        W.rotest('create', '0', CHAR);
        W.rotest('stop');
        id = sqlRows(`SELECT char_id FROM \`char\` WHERE name='${CHAR}'`)[0];
    }
    if (!id) return [{ ok: false, text: `character ${CHAR} exists` }];
    charId = id;
    // Restarts the game servers, so before anyone is logged in.
    // For the Card Exchanger: a +5 Knife [4] in the right hand with a Poring
    // Card in slot 0 and a Fabre Card in slot 1, and no loose cards of either.
    const w = W.rotest('server', 'sql', '--write',
        `UPDATE \`char\` SET class=${e.job}, base_level=${e.level}, job_level=50, last_map='prontera', last_x=156, last_y=180 WHERE char_id=${id};`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`
        + ` DELETE FROM char_reg_str WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\`='SNPC_WelcomeGift';`
        + ` UPDATE inventory SET equip=0 WHERE char_id=${id} AND (equip & 34) <> 0;`
        + ` DELETE FROM inventory WHERE char_id=${id} AND nameid IN (${CARD_TEST.knife}, ${CARD_TEST.keep}, ${CARD_TEST.pull});`
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify, refine, card0, card1)`
        + ` VALUES (${id}, ${CARD_TEST.knife}, 1, 2, 1, 5, ${CARD_TEST.keep}, ${CARD_TEST.pull});`);
    checks.push({ ok: w.ok, text: `character set to job ${e.job}, Lv ${e.level}, no Bounty progress, carded Knife equipped`, detail: w.ok ? '' : w.out.slice(-300) });
    return checks;
}

function enterGame() {
    W.rotest('start');
    const login_ = W.rotestJson('login');
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

    // Welcoming (Izlude, Renewal only): the gift once; on Pre-renewal no NPC.
    gm('@warp izlude 189 206');
    if (e.welcome) {
        const gift = ev(`(async () => {
            await snpc.talk('Welcoming');
            const v = await snpc.go('Yes, please!');
            let t = v.text || '';
            if (!t.includes('Here is')) { const w = await snpc.next(); t = w.text || t; }
            await snpc.close();
            return t;
        })()`);
        const giftText = typeof gift === 'string' ? gift : JSON.stringify(gift);
        check(giftText.includes('150,000 Zeny') && giftText.includes('starter reward items'), 'Welcoming: 150,000 Zeny and the items', giftText.slice(-200));
        const again = ev(`(async () => { const v = await snpc.talk('Welcoming'); const t = v.text || ''; await snpc.close(); return t; })()`);
        check(typeof again === 'string' && again.includes('Welcome back'), 'Welcoming: only once per character', String(again).slice(-120));
    } else {
        const near = ev(`snpc.npcs(20).map(n => n.name)`);
        check(Array.isArray(near) && !near.some(n => n.startsWith('Welcoming')), 'Welcoming: not on Pre-renewal', JSON.stringify(near));
    }

    // Card Exchanger: pull the Fabre Card (slot 1) out of the Knife; the
    // Poring Card in slot 0 and the refine must stay (#41).
    gm('@warp prontera 151 185');
    const talk = ev(`(async () => {
        const said = [];
        await snpc.talk('Card Exchanger');
        let v = await snpc.go('Extract a card');
        v = await snpc.pick('Right Hand');
        said.push(v.text);
        v = await snpc.go('Fabre Card');
        v = await snpc.go('Do it');
        said.push(v.text);
        await snpc.close();
        return said;
    })()`);
    const said = Array.isArray(talk) ? talk.join(' / ') : JSON.stringify(talk);
    check(said.includes('That has 2 card(s)'), 'Card Exchanger: lists the 2 cards in the Knife', said.slice(-300));
    check(said.includes('There you go.'), 'Card Exchanger: pulls the chosen card', said.slice(-300));

    const shot = W.rotestJson('shot', `play-${era}`);
    if (shot.file) checks.push({ ok: true, text: 'screenshot', detail: shot.file, info: true });

    // Logging out saves the character; then the item is read from SQL.
    W.rotest('stop');
    let knife = null;
    for (let i = 0; i < 10 && !knife; i++) {
        const q = col => sqlOne(`SELECT ${col} FROM inventory WHERE char_id=${charId} AND nameid=${CARD_TEST.knife}`);
        const row = { card0: q('card0'), card1: q('card1'), refine: q('refine') };
        if (row.card1 === '0') knife = row;
        else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
    const loose = sqlOne(`SELECT COALESCE(SUM(amount),0) FROM inventory WHERE char_id=${charId} AND nameid=${CARD_TEST.pull} AND card0=0`);
    check(knife && knife.card0 === String(CARD_TEST.keep) && knife.refine === '5',
        'Card Exchanger: Knife keeps its Poring Card and +5, slot 1 empty', JSON.stringify(knife));
    check(loose === '1', 'Card Exchanger: Fabre Card back in the inventory', `${loose} loose`);
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
