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
//= its Welcoming gift is cleared. On Renewal it stands in the middle of
//= Episodes 16.2, 17.1, 17.2 and 18, for the Episode Valkyrie check,
//= with the Zeny for their tickets.
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
// Universal Enchanter (#46): a slotless Hat on the head, a slotless Cotton
// Shirt on the body, a Shard of Agility Jewel in the bag (Renewal only;
// checked in the fork's re/pre-re item_db: Hat and Cotton Shirt in both).
const ENCH_TEST = { hat: 2220, shirt: 2301, jewel: 27422 };
// Episode Valkyrie (#51), Renewal: with 16.1 as far as 16.2 needs
// (ep16_royal 17), the character stands in the middle of 16.2, 17.1, 17.2
// and 18 (a quest of each open). It first tries to skip 17.1, 17.2 and 18
// (refused: the part before is not finished), then buys and uses a ticket
// for 16.2, 17.1, 17.2, then 18. 16.2 and 17.1 share terra_gloria_main:
// 17.1 has no start of its own, and only the last part on a variable has
// its end checked. Quest and item IDs from the fork's npc/re/quests/
// quests_16_2.txt, quests_17_1.txt, quests_17_2.txt and quests_18.txt,
// db/re/quest_db.yml, db/re/item_db_etc.yml. `done` is a sample of what
// each skip completes.
const VALK_TEST = {
    parts: [
        { name: '16.2', ep: 16, ticket: 1000282, price: 4000000, priceText: '4,000,000', key: 'terra_gloria_main', start: 16, end: 25,
          open: 14614, done: [14600, 14601, 14602, 14613, 11462, 14615, 12374, 7741], doneBefore: 14601 },
        { name: '17.1', ep: 17, ticket: 1000287, price: 5000000, priceText: '5,000,000', key: 'terra_gloria_main', start: null, end: 26,
          open: 7852, done: [7850, 7862, 17014, 11603, 16354, 16360], doneBefore: 7850 },
        { name: '17.2', ep: 17, ticket: 1000287, price: 5000000, priceText: '5,000,000', key: 'ep17_2_main', start: 21, end: 36,
          open: 16449, done: [11620, 16452, 18018, 18021, 18020] },
        { name: '18', ep: 18, ticket: 1000288, price: 6000000, priceText: '6,000,000', key: 'ep18_main', start: 41, end: 57,
          open: 16573, done: [8681, 11720, 11724, 18085], doneBefore: 8681 },
    ],
    // Set before the run (16.1 as far as 16.2 needs it), and what 16.2's
    // skip raises to at least 10.
    before: { ep16_royal: 17 },
    side: { key: 'terra_gloria_lady_part', min: 10 },
};
const VALK_PRICE = VALK_TEST.parts.reduce((n, p) => n + p.price, 0);
const VALK_QUESTS = [...VALK_TEST.parts.flatMap(p => [p.open, ...p.done])];
const VALK_KEYS = [...new Set([...VALK_TEST.parts.map(p => p.key), ...Object.keys(VALK_TEST.before), VALK_TEST.side.key])];
const VALK_REGS = [
    ...VALK_TEST.parts.filter(p => p.start !== null).map(p => [p.key, p.start]),
    ...Object.entries(VALK_TEST.before),
];
// Smuggler's access quest: a Mr. Smile mask worn (does not count) and a
// ten 1carat Diamonds in the bag; a second mask is given in game. The free item
// asked for is a Red Potion. IDs from the fork's db/re and db/pre-re
// item_db (Mr_Smile 2278 sits on Head_Low + Head_Mid: equip 1 | 512).
const SMUG_TEST = { mask: 2278, gems: 730, gemsNeeded: 10, free: 501, worn: 513 };
let charId = null;

// Per era: the character, and what the NPCs should show.
const EXPECT = {
    'renewal': {
        job: 4252, level: 210,   // Dragon Knight
        bountyMenu: ['Target Hunt', 'Overlook Water Dungeon', 'Illusion Dungeons', 'Daily Area Purge', 'Cancel'],
        purgeMaps: ['sp_rudus4'],  // Lv 201-230: one map (#24)
        dummy: { 28412: ['Size:Medium', 'Lv:150', 'DEF:0'], 28413: ['Size:Medium', 'Lv:150', 'DEF:0'] },
        blessing: true,            // Blacksmith Blessing in the Tool Dealer
        mvp90: true,               // Dummy Master's "MVP, 90% less damage": Renewal only
        welcome: true,             // Welcoming in Izlude: Renewal only
        valkyrie: true,            // Episode Valkyrie: Renewal only
        jewel: true,               // headgear jewels exist (Enchanter check)
        warpFee: true,             // a Dragon Knight is 4th class: the Warper charges
        smugglerMarkup: 2,         // no cash-shop-extended in the test world
    },
    'pre-renewal': {
        job: 4008, level: 99,    // Lord Knight
        bountyMenu: ['Target Hunt', 'Overlook Water Dungeon', 'Daily Area Purge', 'Cancel'],
        purgeMaps: ['ice_dun01', 'gl_church', 'yuno_fild08', 'ra_fild12', 'mosk_dun02', 'gef_fild06', 'gef_fild08'],
        dummy: { 28412: ['Size:Medium', 'Lv:99', 'DEF:0'], 28413: ['Size:Medium', 'Lv:99', 'DEF:0'] },
        blessing: false,
        mvp90: false,
        welcome: false,
        valkyrie: false,
        jewel: false,
        warpFee: false,            // a Lord Knight: no 3rd class here, no fee
        smugglerMarkup: 2,
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
        `UPDATE \`char\` SET class=${e.job}, base_level=${e.level}, job_level=50, zeny=${100000 + VALK_PRICE}, last_map='prontera', last_x=156, last_y=180 WHERE char_id=${id};`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` IN (${VALK_KEYS.map(k => `'${k}'`).join(', ')});`
        + ` DELETE FROM quest WHERE char_id=${id} AND quest_id IN (${VALK_QUESTS.join(', ')});`
        + ` DELETE FROM inventory WHERE char_id=${id} AND nameid IN (${VALK_TEST.parts.map(p => p.ticket).join(', ')});`
        + (e.valkyrie ? ` INSERT INTO char_reg_num (char_id, \`key\`, \`index\`, value) VALUES ${VALK_REGS.map(([k, v]) => `(${id}, '${k}', 0, ${v})`).join(', ')};`
            + ` INSERT INTO quest (char_id, quest_id, state) VALUES `
            + VALK_TEST.parts.map(p => `(${id}, ${p.open}, '1')` + (p.doneBefore ? `, (${id}, ${p.doneBefore}, '2')` : '')).join(', ') + ';' : '')
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`
        + ` DELETE FROM char_reg_str WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\`='SNPC_WelcomeGift';`
        + ` UPDATE inventory SET equip=0 WHERE char_id=${id} AND (equip & (34 | 256 | 16)) <> 0;`
        + ` DELETE FROM inventory WHERE char_id=${id} AND nameid IN (${CARD_TEST.knife}, ${CARD_TEST.keep}, ${CARD_TEST.pull}, ${ENCH_TEST.hat}, ${ENCH_TEST.shirt}, ${ENCH_TEST.jewel}, ${SMUG_TEST.mask}, ${SMUG_TEST.gems}, ${SMUG_TEST.free});`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` LIKE 'SNPC\\_Smuggler%';`
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify) VALUES (${id}, ${SMUG_TEST.mask}, 1, ${SMUG_TEST.worn}, 1), (${id}, ${SMUG_TEST.gems}, ${SMUG_TEST.gemsNeeded}, 0, 1);`
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify, refine, card0, card1)`
        + ` VALUES (${id}, ${CARD_TEST.knife}, 1, 2, 1, 5, ${CARD_TEST.keep}, ${CARD_TEST.pull});`
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify) VALUES (${id}, ${ENCH_TEST.hat}, 1, 256, 1), (${id}, ${ENCH_TEST.shirt}, 1, 16, 1);`
        + (e.jewel ? ` INSERT INTO inventory (char_id, nameid, amount, equip, identify) VALUES (${id}, ${ENCH_TEST.jewel}, 1, 0, 1);` : ''));
    checks.push({ ok: w.ok, text: `character set to job ${e.job}, Lv ${e.level}, no Bounty progress, carded Knife, Hat and Cotton Shirt equipped`, detail: w.ok ? '' : w.out.slice(-300) });
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

    // Training Dummies: the dummy is up from the start, and the Dummy
    // Master's settings stick: after Done its menu shows them, and a
    // dummy is there again.
    gm('@warp prontera 153 222');
    // A replaced dummy fades out in the client with gid -1 for a moment; it
    // is not on the server any more, so it does not count.
    const dummies = () => ev(`roAgent.entities({ type: 'MOB', radius: 10 }).filter(m => m.name === 'Training Dummy' && m.gid > 0 && !m.dead).map(m => m.position.join(','))`);
    const dummyFirst = dummies();
    check(Array.isArray(dummyFirst) && dummyFirst.length === 1 && dummyFirst[0] === '156,225', 'Training Dummies: one dummy at 156,225', JSON.stringify(dummyFirst));
    const master = ev(`(async () => {
        const menu = async () => { let v = snpc.view(); for (let i = 0; i < 6 && !v.menu.length && v.next; i++) v = await snpc.next(); return v; };
        await snpc.talk('Dummy Master'); await menu();
        await snpc.pick('Size'); await snpc.pick('Large');
        await snpc.pick('Element ('); await snpc.pick('Fire');
        await snpc.pick('Element level'); await snpc.pick('3');
        await snpc.pick('Type');
        const types = snpc.view().menu.map(m => m.text);
        await snpc.pick(${e.mvp90 ? "'MVP, 90%'" : "'MVP'"});
        await snpc.pick('Done'); await snpc.close();
        await new Promise(r => setTimeout(r, 3000));
        await snpc.talk('Dummy Master'); const v = await menu();
        const labels = v.menu.map(m => m.text);
        await snpc.pick('Cancel'); await snpc.close();
        return { labels, types };
    })()`);
    const want = ['Size (Large)', 'Element (Fire)', 'Element level (3)', 'Race (Formless)', 'DEF (0)', 'MDEF (0)',
        e.mvp90 ? 'Type (MVP, 90% less damage)' : 'Type (MVP)', 'Done', 'Cancel'];
    const masterLabels = master && Array.isArray(master.labels) ? master.labels : [];
    check(want.every((w, i) => masterLabels[i] === w), 'Dummy Master: settings kept after Done', JSON.stringify(master));
    const types = master && Array.isArray(master.types) ? master.types : [];
    const wantTypes = e.mvp90 ? ['Normal', 'Boss', 'MVP', 'MVP, 90% less damage'] : ['Normal', 'Boss', 'MVP'];
    check(types.length === wantTypes.length && wantTypes.every((t, i) => types[i] === t),
        `Dummy Master: types ${e.mvp90 ? 'with' : 'without'} "MVP, 90% less damage"`, JSON.stringify(types));
    const dummyAfter = dummies();
    check(Array.isArray(dummyAfter) && dummyAfter.length === 1 && dummyAfter[0] === '156,225', 'Training Dummies: one dummy after Done', JSON.stringify(dummyAfter));
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
    // iRO's item table calls it "Blacksmith Blessing", the English
    // translation "Blacksmith's Blessing"; the client shows whichever it has.
    const blessing = items.some(n => /^Blacksmith('s)? Blessing$/.test(n));
    check(blessing === e.blessing, `Tool Dealer: Blacksmith Blessing ${e.blessing ? 'sold' : 'not sold'}`,
        blessing ? 'listed' : 'not listed');

    // Without cash-shop-extended (it is not in the test world): Master
    // Nokzin sells the Elemental Converters (not the Tool Dealer), the Tool
    // Dealer the Gym Pass, and the Cheffenia Gatekeeper offers Zeny only (#40).
    check(!items.some(n => /Converter/.test(n)), 'Tool Dealer: no Elemental Converters (Master Nokzin sells them)', items.filter(n => /Convert/.test(n)).join(', ') || 'none');
    check(items.includes('Gym Pass'), 'Tool Dealer: Gym Pass sold without cash-shop-extended', items.includes('Gym Pass') ? 'listed' : 'not listed');
    gm('@warp prontera 144 226');
    const nokzin = ev(`(async () => {
        await snpc.talk('Master Nokzin');
        const v = await snpc.go('What about converter scrolls?');
        const text = v.text || '';
        await snpc.close();
        await new Promise(r => setTimeout(r, 1500));
        const store = roAgent.modules.UIManager.getComponent('NpcStore');
        const root = store && store.getRoot ? store.getRoot() : null;
        const names = root ? [...root.querySelectorAll('.name')].map(e => e.textContent.trim()).filter(Boolean) : [];
        try { store.remove(); } catch { /* not open */ }
        return { text, items: [...new Set(names)] };
    })()`);
    const converters = nokzin && Array.isArray(nokzin.items) ? nokzin.items.filter(n => /Converter/.test(n)) : [];
    check(nokzin && /five thousand zeny each/.test(nokzin.text) && converters.length === 4, 'Master Nokzin: sells the four Elemental Converters',
        converters.join(', ') || JSON.stringify(nokzin).slice(-200));
    gm('@warp prontera 140 177');
    const gate = ev(`(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        await snpc.talk('Cheffenia Gatekeeper');
        let v = snpc.view();
        for (let i = 0; i < 20 && !v.menu.length; i++) { if (v.next) v = await snpc.next(); else { await sleep(200); v = snpc.view(); } }
        const out = v.menu.map(m => m.text);
        if (v.menu.some(m => m.text === 'Cancel')) await snpc.pick('Cancel');
        await snpc.close();
        return out;
    })()`);
    check(Array.isArray(gate) && gate.includes('Zeny') && !gate.includes('Cash Points') && !gate.some(t => /Reset My Pass/.test(t)),
        'Cheffenia Gatekeeper: Zeny only, no testing reset', JSON.stringify(gate));
    gm('@warp prontera 128 190');
    if (!e.valkyrie) {
        const valk = ev(`snpc.npcs(10).map(n => n.name)`);
        check(Array.isArray(valk) && !valk.some(n => n.startsWith('Valkyrie')), 'Episode Valkyrie: not on Pre-renewal', JSON.stringify(valk));
    } else {
        // 18 before 17.2 is refused; then per part: buy its episode's
        // ticket and use it (#51). Zeny is read after each talk; the quest
        // log and the main variables from SQL after logging out.
        const valkTalk = steps => ev(`(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const said = [];
            await snpc.talk('Valkyrie');
            let v = snpc.view();
            for (const want of ${JSON.stringify(steps)}) {
                for (let i = 0; i < 20 && !v.menu.some(m => m.text.startsWith(want)); i++) {
                    if (v.next) v = await snpc.next(); else { await sleep(200); v = snpc.view(); }
                }
                if (v.text) said.push(v.text);
                v = await snpc.pick(want);
            }
            for (let i = 0; i < 10 && v.next; i++) { if (v.text) said.push(v.text); v = await snpc.next(); }
            if (v.text) said.push(v.text);
            await snpc.close();
            return said.join(' / ');
        })()`);
        for (const [part, prev] of [['17.1', '16.2'], ['17.2', '17.1'], ['18', '17.2']]) {
            const order = valkTalk(['Use a ticket', `Episode ${part} `]);
            check(typeof order === 'string' && order.includes(`First finish Episode ${prev}`), `Episode Valkyrie: ${part} needs ${prev} finished first`, String(order).slice(-200));
        }
        for (const p of VALK_TEST.parts) {
            const before = ev('roAgent.modules.Session.zeny');
            const bought = valkTalk(['Buy a ticket', `Episode ${p.ep} ticket`, 'Buy it']);
            check(typeof bought === 'string' && bought.includes(`${p.priceText} Zeny`) && bought.includes('Here is your ticket'),
                `Episode Valkyrie: sells the Episode ${p.ep} ticket for ${p.priceText} Zeny`, String(bought).slice(-200));
            const after = ev('roAgent.modules.Session.zeny');
            check(after === before - p.price, `Episode Valkyrie: takes the Zeny for ${p.ep}`, `${before} -> ${after}`);
            const used = valkTalk(['Use a ticket', `Episode ${p.name} `, 'Yes, use it']);
            check(typeof used === 'string' && used.includes(`Episode ${p.name} is behind you`), `Episode Valkyrie: skips Episode ${p.name}`, String(used).slice(-200));
        }
        const again = valkTalk(['Use a ticket', 'Episode 18 ']);
        check(typeof again === 'string' && again.includes('already finished Episode 18'), 'Episode Valkyrie: a finished part keeps the ticket', String(again).slice(-200));
    }

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

    // Universal Enchanter (#46): the headgear jewel is offered for the Hat,
    // not for the Cotton Shirt.
    if (e.jewel) {
        gm('@warp prontera 164 167');
        // Each step waits for its menu item (pressing Next as it comes),
        // and the talk ends on Cancel, so no window is left open.
        const stones = slot => ev(`(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const step = async prefix => {
                for (let i = 0; i < 30; i++) {
                    const v = snpc.view();
                    if (v.menu.some(m => m.text.startsWith(prefix))) return snpc.pick(prefix);
                    if (v.next) await snpc.next(); else await sleep(200);
                }
                return snpc.view();
            };
            await snpc.talk('Universal Enchanter');
            await step('Regular Gear');
            await step('${slot}');
            await step('Socket 1');
            let v = snpc.view();
            for (let i = 0; i < 30 && !v.menu.length; i++) {
                if (v.next) v = await snpc.next(); else { await sleep(200); v = snpc.view(); }
                if (!v.next && !v.menu.length && v.close) break;
            }
            const out = v.menu.length ? v.menu.map(m => m.text) : [v.text];
            if (v.menu.some(m => m.text === 'Cancel')) await snpc.pick('Cancel');
            await snpc.close();
            return out;
        })()`);
        const head = stones('Top Headgear');
        check(Array.isArray(head) && head.includes('Shard of Agility Jewel'), 'Universal Enchanter: offers the jewel for the Top Headgear', JSON.stringify(head).slice(-200));
        const body = stones('Armor');
        check(Array.isArray(body) && !body.some(t => t.includes('Agility Jewel')), 'Universal Enchanter: not for the Armor', JSON.stringify(body).slice(-200));
    }

    // Warper (#36), with warp_fee and warp_quests on for this run (see the
    // bottom of this file): Bio Lab is locked without its quest; a town
    // costs 5,000 Zeny for a 3rd/4th class and nothing otherwise, and
    // Cancel at the price warps nowhere and keeps the Zeny.
    // path: menu items to pick in order (a leading "~ " is ignored);
    // answer: what to pick on the price question, if one comes.
    const warper = (path, answer) => ev(`(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const label = t => t.replace(/^~\\s*/, '');
        await snpc.talk('Warper');
        let v = snpc.view();
        for (const want of ${JSON.stringify(path)}) {
            for (let i = 0; i < 30 && !v.menu.some(m => label(m.text).startsWith(want)); i++) {
                if (v.next) v = await snpc.next(); else { await sleep(200); v = snpc.view(); }
            }
            const item = v.menu.find(m => label(m.text).startsWith(want));
            if (!item) break;
            v = await snpc.choose(item.n);
        }
        await sleep(1000);
        v = snpc.view();
        // The price is a menu item ("Pay 5,000 Zeny and go"), not a window.
        const price = v.menu.find(m => m.text.startsWith('Pay '));
        const said = v.text || (price ? price.text : '');
        const asked = !!price;
        if (asked && ${JSON.stringify(answer)}) {
            const item = v.menu.find(m => m.text.startsWith(${JSON.stringify(answer)}));
            if (item) await snpc.choose(item.n);
        }
        await sleep(3000);
        // Read before any Close: a paid warp must not wait for one.
        const map = roAgent.player().map;
        await snpc.close();
        return { said, asked, map, zeny: roAgent.modules.Session.zeny };
    })()`);
    gm('@warp prontera 160 189');
    const lab = warper(['Dungeons', 'Bio Labs', 'Bio Lab 1'], '');
    check(lab && String(lab.said).includes('Bio Lab pass quest') && /prontera/.test(lab.map),
        'Warper: Bio Lab locked without its quest', JSON.stringify(lab).slice(-200));
    const before = ev('roAgent.modules.Session.zeny');
    if (e.warpFee) {
        const no = warper(['Towns', 'Izlude'], 'Cancel');
        check(no && no.asked && String(no.said).includes('5,000 Zeny') && /prontera/.test(no.map) && no.zeny === before,
            'Warper: a town costs 5,000 Zeny; Cancel keeps it', JSON.stringify(no).slice(-200));
        const yes = warper(['Towns', 'Izlude'], 'Pay');
        check(yes && /izlude/.test(yes.map) && ev('roAgent.modules.Session.zeny') === before - 5000,
            'Warper: paying takes 5,000 Zeny and warps at once', JSON.stringify(yes).slice(-200) + ` before ${before}`);
    } else {
        const free = warper(['Towns', 'Izlude'], '');
        check(free && !free.asked && /izlude/.test(free.map) && ev('roAgent.modules.Session.zeny') === before,
            'Warper: free for a class below 3rd', JSON.stringify(free).slice(-200));
    }
    // The warp to Izlude is still loading; a GM command typed now is lost.
    W.rotest('wait', '4000');

    // Smuggler's access quest. steps: menu items to pick in order, or a
    // number for the input box; the talk ends on its last window.
    const smug = steps => ev(`(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const said = [];
        await snpc.talk('Smuggler');
        let v = snpc.view();
        for (const want of ${JSON.stringify(steps)}) {
            const ready = () => typeof want === 'number' ? snpc.inputOpen() : v.menu.some(m => m.text.startsWith(want));
            for (let i = 0; i < 30 && !ready(); i++) {
                if (v.text) said.push(v.text);
                if (v.next) v = await snpc.next(); else { await sleep(200); v = snpc.view(); }
            }
            if (v.text) said.push(v.text);
            v = typeof want === 'number' ? await snpc.input(want) : await snpc.pick(want);
        }
        for (let i = 0; i < 20 && v.next; i++) { if (v.text) said.push(v.text); v = await snpc.next(); }
        if (v.text) said.push(v.text);
        const menu = v.menu.map(m => m.text);
        // A menu left open would keep the next NPC from talking: cancel it.
        if (v.menu.length) await snpc.choose(255);
        await snpc.close();
        return { said: [...new Set(said)].join(' / '), menu };
    })()`);
    gm('@warp prontera 144 172');
    const no = smug(['Not interested']);
    check(no && String(no.said).includes('Your loss'), 'Smuggler: the pitch can be refused', JSON.stringify(no).slice(-200));
    const offer = smug(['Mystic Box']);
    check(offer && String(offer.said).includes('Smile Assistance') && String(offer.said).includes('Ten BILLION'),
        'Smuggler: 10 billion is too much, he asks for the mask and the diamonds', JSON.stringify(offer).slice(-200));
    const worn = smug([]);
    check(worn && String(worn.said).includes('No Mr. Smile in your bag'), 'Smuggler: a worn mask does not count', JSON.stringify(worn).slice(-200));
    gm(`@item ${SMUG_TEST.mask} 1`);
    W.rotest('wait', '1000');
    const deal = smug(['Hand them over', 'Open the box', 'Take my free item now', SMUG_TEST.free, 'That one']);
    const dealSaid = deal ? String(deal.said) : '';
    check(dealSaid.includes('around the corner') && dealSaid.includes('Ta-daa') && dealSaid.includes('GUAAAARDS'),
        'Smuggler: the box (he had it), the mask and the scene', dealSaid.slice(-200));
    check(dealSaid.includes(`just x${e.smugglerMarkup}`), `Smuggler: the "price coefficient" is the real markup, x${e.smugglerMarkup}`, (dealSaid.match(/just x\d+/) || [dealSaid.slice(-120)])[0]);
    check(dealSaid.includes("Now we're even"), 'Smuggler: the free item', dealSaid.slice(-120));
    const after = smug([]);
    check(after && after.menu.includes('Buy an item') && after.menu.includes('Repeat the deal (no free item)') && !after.menu.some(t => /free item$/.test(t) && !/no free/.test(t)),
        'Smuggler: then the shop menu, free item gone, replay offered', JSON.stringify(after && after.menu));

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
    if (e.valkyrie) {
        VALK_TEST.parts.forEach((p, i) => {
            const main = sqlOne(`SELECT value FROM char_reg_num WHERE char_id=${charId} AND \`key\`='${p.key}'`);
            const open = sqlOne(`SELECT COUNT(*) FROM quest WHERE char_id=${charId} AND quest_id=${p.open}`);
            const done = sqlOne(`SELECT COUNT(*) FROM quest WHERE char_id=${charId} AND state='2' AND quest_id IN (${p.done.join(', ')})`);
            // A later part on the same variable moved it on.
            if (!VALK_TEST.parts.slice(i + 1).some(q => q.key === p.key))
                check(main === String(p.end), `Episode Valkyrie: ${p.key} ${p.end}, the last step of ${p.name}`, `${p.key} ${main}`);
            check(open === '0' && done === String(p.done.length), `Episode Valkyrie: open ${p.name} quest closed, the finished ones completed`,
                `${p.open}: ${open} rows, completed ${done} of ${p.done.length}`);
        });
        const side = sqlOne(`SELECT COALESCE(MAX(value),0) FROM char_reg_num WHERE char_id=${charId} AND \`key\`='${VALK_TEST.side.key}'`);
        check(Number(side) >= VALK_TEST.side.min, `Episode Valkyrie: ${VALK_TEST.side.key} at least ${VALK_TEST.side.min} after 16.2`, `${VALK_TEST.side.key} ${side}`);
        const tickets = sqlOne(`SELECT COALESCE(SUM(amount),0) FROM inventory WHERE char_id=${charId} AND nameid IN (${VALK_TEST.parts.map(p => p.ticket).join(', ')})`);
        check(tickets === '0', 'Episode Valkyrie: the tickets are used up', `${tickets} left`);
    }
    const reg = k => sqlOne(`SELECT COALESCE(SUM(value),0) FROM char_reg_num WHERE char_id=${charId} AND \`key\`='${k}'`);
    const count = (item, extra = '') => sqlOne(`SELECT COALESCE(SUM(amount),0) FROM inventory WHERE char_id=${charId} AND nameid=${item}${extra}`);
    check(reg('SNPC_Smuggler') === '2' && reg('SNPC_SmugglerFree') === '0' && reg('SNPC_SmugglerPaid') === '0',
        'Smuggler: access open, free item used, nothing pending', `stage ${reg('SNPC_Smuggler')}, free ${reg('SNPC_SmugglerFree')}, paid ${reg('SNPC_SmugglerPaid')}`);
    check(count(SMUG_TEST.gems) === '0' && count(SMUG_TEST.mask) === '2' && count(SMUG_TEST.mask, ` AND equip=${SMUG_TEST.worn}`) === '1' && count(SMUG_TEST.free) === '1',
        'Smuggler: diamonds taken, the bag mask back, the worn one untouched, one Red Potion',
        `diamonds ${count(SMUG_TEST.gems)}, masks ${count(SMUG_TEST.mask)} (worn ${count(SMUG_TEST.mask, ` AND equip=${SMUG_TEST.worn}`)}), potions ${count(SMUG_TEST.free)}`);
    return checks;
}

W.prepare();
const count = W.installMod();
// The Warper's optional rules (#36) on for this run, as the settings window
// would save them; put back as they were at the end.
const SETTINGS = path.join(W.WORLD, 'state', 'mod-settings.json');
const savedSettings = fs.existsSync(SETTINGS) ? fs.readFileSync(SETTINGS, 'utf8') : null;
{
    const all = savedSettings ? JSON.parse(savedSettings) : {};
    all[W.MOD] = { ...(all[W.MOD] || {}), warp_fee: true, warp_quests: true };
    fs.writeFileSync(SETTINGS, JSON.stringify(all, null, 2));
}
process.on('exit', () => {
    if (savedSettings === null) fs.rmSync(SETTINGS, { force: true });
    else fs.writeFileSync(SETTINGS, savedSettings);
});
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
