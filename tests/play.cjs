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
//=   node tests/play.cjs renewal --only=dummies,nokzin
//=                                        only those NPCs' checks
//=   node tests/play.cjs --verbose        every passed check too
//= Sections for --only: see SECTIONS below. Without it, all of them.
//= Before it plays, it makes the smoke test's checks of the map-server
//= log (serverChecks in tests/world.cjs), so it needs no smoke run first.
//= Exit code 0 = every check passed. Only failures are listed, with a
//= count per era. A screenshot per era lands in the app clone's
//= artifacts/rotest/.
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
const verbose = args.includes('--verbose');
const ERAS = W.parseEras(args);
// The parts of a run, each an NPC (or a few that belong together), in the
// order they are played.
const SECTIONS = ['buffer', 'bounty', 'dummies', 'tooldealer', 'nokzin', 'gatekeeper', 'valkyrie',
    'welcome', 'enchanter', 'warper', 'smuggler', 'cardexchanger', 'plagiarism'];
const onlyArg = args.find(a => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',').map(t => t.trim()).filter(Boolean)) : null;
if (only) for (const name of only) if (!SECTIONS.includes(name)) W.die(`unknown section: ${name} (sections: ${SECTIONS.join(', ')})`);
const want = name => !only || only.has(name);
const HELPER = fs.readFileSync(path.join(__dirname, 'play-helper.js'), 'utf8');
const CHAR = 'Tester';
// Card Exchanger (#41): item and card IDs checked in the fork's
// db/re and db/pre-re item_db (Knife_ 1202 has 4 slots in both eras).
const CARD_TEST = { knife: 1202, keep: 4001, pull: 4002 };   // Knife [4], Poring Card, Fabre Card
// Universal Enchanter (#46): a slotless Hat on the head, a slotless Cotton
// Shirt on the body, a Shard of Agility Jewel in the bag (Renewal only;
// checked in the fork's re/pre-re item_db: Hat and Cotton Shirt in both).
const ENCH_TEST = { hat: 2220, shirt: 2301, jewel: 27422 };
// Smuggler's access quest: a Mr. Smile mask worn (does not count) and a
// ten 1carat Diamonds in the bag; a second mask is given in game. The free item
// asked for is a Red Potion. IDs from the fork's db/re and db/pre-re
// item_db (Mr_Smile 2278 sits on Head_Low + Head_Mid: equip 1 | 512).
const SMUG_TEST = { mask: 2278, gems: 730, gemsNeeded: 10, free: 501, worn: 513 };
// Plagiarism Master (#74): the character is made a Shadow Chaser (4072) with
// Plagiarism (225) and Reproduce (2285) Lv 10, then copies Bash (5, Lv 10)
// and Comet (2213, max Lv 5). IDs from the fork's mmo.hpp and db/re/skill_db.
// The server drops a skill on log-in unless the ones it needs (skill_tree)
// are learned too, so `skills` is the whole chain: [id, level], with Basic
// Skill 9. It also uses a lower class's tree until enough points went into
// the classes before (pc_calc_skilltree_normalize_job): the job levels the
// character changed class at are set to 1 so that check passes.
const PLAG_TEST = { job: 4072, bash: 5, comet: 2213,
    skills: [[1, 9], [225, 10], [2285, 10], [219, 5], [212, 4], [211, 4], [210, 4], [50, 5], [214, 5], [213, 2], [51, 1]],
    regs: ['jobchange_level', 'jobchange_level_3rd'] };
const PLAG_IDS = PLAG_TEST.skills.map(([id]) => id).join(', ');
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
        jewel: true,               // headgear jewels exist (Enchanter check)
        warpFee: true,             // a Dragon Knight is 4th class: the Warper charges
        smugglerMarkup: 2,         // no cash-shop-extended in the test world
        thirdClass: true,          // Shadow Chaser exists: Plagiarism Master's Reproduce check
    },
    'pre-renewal': {
        job: 4008, level: 99,    // Lord Knight
        bountyMenu: ['Target Hunt', 'Overlook Water Dungeon', 'Daily Area Purge', 'Cancel'],
        purgeMaps: ['ice_dun01', 'gl_church', 'yuno_fild08', 'ra_fild12', 'mosk_dun02', 'gef_fild06', 'gef_fild08'],
        dummy: { 28412: ['Size:Medium', 'Lv:99', 'DEF:0'], 28413: ['Size:Medium', 'Lv:99', 'DEF:0'] },
        blessing: false,
        mvp90: false,
        welcome: false,
        jewel: false,
        warpFee: false,            // a Lord Knight: no 3rd class here, no fee
        smugglerMarkup: 2,
        thirdClass: false,
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
        `UPDATE \`char\` SET class=${e.job}, base_level=${e.level}, job_level=50, zeny=100000, last_map='prontera', last_x=156, last_y=180 WHERE char_id=${id};`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`
        + ` DELETE FROM char_reg_str WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\`='SNPC_WelcomeGift';`
        + ` UPDATE inventory SET equip=0 WHERE char_id=${id} AND (equip & (34 | 256 | 16)) <> 0;`
        + ` DELETE FROM inventory WHERE char_id=${id} AND nameid IN (${CARD_TEST.knife}, ${CARD_TEST.keep}, ${CARD_TEST.pull}, ${ENCH_TEST.hat}, ${ENCH_TEST.shirt}, ${ENCH_TEST.jewel}, ${SMUG_TEST.mask}, ${SMUG_TEST.gems}, ${SMUG_TEST.free});`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` LIKE 'SNPC\\_Smuggler%';`
        // Plagiarism Master's run leaves copied skills and a Shadow Chaser's skills.
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` IN ('CLONE_SKILL', 'CLONE_SKILL_LV', 'REPRODUCE_SKILL', 'REPRODUCE_SKILL_LV');`
        + ` DELETE FROM skill WHERE char_id=${id} AND id IN (${PLAG_IDS});`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` IN (${PLAG_TEST.regs.map(k => `'${k}'`).join(', ')});`
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
    // The smoke test's checks, on the same start.
    checks.push(...W.serverChecks(era, up).checks);
    checks.push(...setUpCharacter(era));
    const entered = enterGame();
    check(entered.ok, 'in game, NPC helper loaded', entered.detail);
    if (!entered.ok) return checks;

    if (want('buffer')) {
        // Buffer: no window; heals, buffs and says so in chat.
        gm('@warp prontera 163 190');
        ev(`snpc.talk('Buffer')`);
        const chat = ev(`snpc.chat(4)`);
        const line = Array.isArray(chat) ? chat.find(l => l.startsWith('Fully healed!')) : null;
        check(line === 'Fully healed! Buffs: Blessing, Increase AGI, Kyrie Eleison, Magnificat.', 'Buffer: heal and the default buffs', line || JSON.stringify(chat));
    }
    if (want('bounty')) {
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
    }
    if (want('dummies')) {
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
        const wantLabels = ['Size (Large)', 'Element (Fire)', 'Element level (3)', 'Race (Formless)', 'DEF (0)', 'MDEF (0)',
            e.mvp90 ? 'Type (MVP, 90% less damage)' : 'Type (MVP)', 'Done', 'Cancel'];
        const masterLabels = master && Array.isArray(master.labels) ? master.labels : [];
        check(wantLabels.every((w, i) => masterLabels[i] === w), 'Dummy Master: settings kept after Done', JSON.stringify(master));
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
    }
    if (want('tooldealer')) {
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
    }
    if (want('nokzin')) {
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
    }
    if (want('gatekeeper')) {
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
    }
    if (want('valkyrie')) {
        if (!e.welcome) {
            gm('@warp prontera 128 190');
            const valk = ev(`snpc.npcs(10).map(n => n.name)`);
            check(Array.isArray(valk) && !valk.some(n => n.startsWith('Valkyrie')), 'Episode Valkyrie: not on Pre-renewal', JSON.stringify(valk));
        }
    }

    if (want('welcome')) {
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
    }
    if (want('enchanter')) {
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
    }
    if (want('warper')) {
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
    }

    if (want('smuggler')) {
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
    }
    if (want('cardexchanger')) {
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
    }
    const shot = W.rotestJson('shot', `play-${era}`);
    if (shot.file) checks.push({ ok: true, text: 'screenshot', detail: shot.file, info: true });

    // Logging out saves the character; then the items and variables are
    // read from SQL.
    W.rotest('stop');
    if (want('cardexchanger')) {
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
    }
    if (want('plagiarism') && e.thirdClass) checks.push(...plagiarism());
    if (want('smuggler')) {
        const reg = k => sqlOne(`SELECT COALESCE(SUM(value),0) FROM char_reg_num WHERE char_id=${charId} AND \`key\`='${k}'`);
        const count = (item, extra = '') => sqlOne(`SELECT COALESCE(SUM(amount),0) FROM inventory WHERE char_id=${charId} AND nameid=${item}${extra}`);
        check(reg('SNPC_Smuggler') === '2' && reg('SNPC_SmugglerFree') === '0' && reg('SNPC_SmugglerPaid') === '0',
            'Smuggler: access open, free item used, nothing pending', `stage ${reg('SNPC_Smuggler')}, free ${reg('SNPC_SmugglerFree')}, paid ${reg('SNPC_SmugglerPaid')}`);
        check(count(SMUG_TEST.gems) === '0' && count(SMUG_TEST.mask) === '2' && count(SMUG_TEST.mask, ` AND equip=${SMUG_TEST.worn}`) === '1' && count(SMUG_TEST.free) === '1',
            'Smuggler: diamonds taken, the bag mask back, the worn one untouched, one Red Potion',
            `diamonds ${count(SMUG_TEST.gems)}, masks ${count(SMUG_TEST.mask)} (worn ${count(SMUG_TEST.mask, ` AND equip=${SMUG_TEST.worn}`)}), potions ${count(SMUG_TEST.free)}`);
    }
    return checks;
}

// Plagiarism Master (#74), last: it makes Tester a Shadow Chaser, which
// takes its own log-in (setUpCharacter puts the class back next run).
function plagiarism() {
    const checks = [];
    const check = (ok, text, detail = '') => checks.push({ ok: !!ok, text, detail });
    const w = W.rotest('server', 'sql', '--write',
        `UPDATE \`char\` SET class=${PLAG_TEST.job}, base_level=175, last_map='prontera', last_x=171, last_y=180 WHERE char_id=${charId};`
        + ` DELETE FROM skill WHERE char_id=${charId} AND id IN (${PLAG_IDS});`
        + ` INSERT INTO skill (char_id, id, lv, flag) VALUES ${PLAG_TEST.skills.map(([id, lv]) => `(${charId}, ${id}, ${lv}, 0)`).join(', ')};`
        + ` DELETE FROM char_reg_num WHERE char_id=${charId} AND \`key\` IN (${PLAG_TEST.regs.map(k => `'${k}'`).join(', ')});`
        + ` INSERT INTO char_reg_num (char_id, \`key\`, \`index\`, value) VALUES ${PLAG_TEST.regs.map(k => `(${charId}, '${k}', 0, 1)`).join(', ')};`);
    check(w.ok, 'Plagiarism Master: character made a Shadow Chaser with Plagiarism and Reproduce Lv 10', w.ok ? '' : w.out.slice(-300));
    const entered = enterGame();
    check(entered.ok, 'Plagiarism Master: in game as Shadow Chaser', entered.detail);
    if (!entered.ok) return checks;
    // path: menu items to pick in order (Next pressed as needed); returns
    // the first menu's items and the last window's text.
    const talk = path => ev(`(async () => {
        await snpc.talk('Plagiarism Master');
        let first = null, v = snpc.view();
        for (const want of ${JSON.stringify(path)}) {
            for (let i = 0; i < 6 && !v.menu.length && v.next; i++) v = await snpc.next();
            if (!first) first = v.menu.map(m => m.text);
            v = await snpc.pick(want);
        }
        const text = v.text || '';
        await snpc.close();
        return { first, text };
    })()`);
    const plag = talk(['Plagiarism (', 'Swordsman', 'Bash']);
    check(plag && Array.isArray(plag.first) && plag.first.join('|') === 'Plagiarism (1st and 2nd class skills)|Reproduce (3rd class skills)|Cancel',
        'Plagiarism Master: a Shadow Chaser chooses the slot', JSON.stringify(plag && plag.first));
    check(plag && String(plag.text).includes('learned Bash Lv 10'), 'Plagiarism Master: Bash into the Plagiarism slot', String(plag && plag.text).slice(-120));
    const repro = talk(['Reproduce (', 'Warlock', 'Comet']);
    check(repro && String(repro.text).includes('learned Comet Lv 5'), 'Plagiarism Master: Comet into the Reproduce slot, at its max Lv 5', String(repro && repro.text).slice(-120));
    W.rotest('stop');
    const reg = k => sqlOne(`SELECT COALESCE(SUM(value),0) FROM char_reg_num WHERE char_id=${charId} AND \`key\`='${k}'`);
    const slots = { clone: reg('CLONE_SKILL'), cloneLv: reg('CLONE_SKILL_LV'), repro: reg('REPRODUCE_SKILL'), reproLv: reg('REPRODUCE_SKILL_LV') };
    check(slots.clone === String(PLAG_TEST.bash) && slots.cloneLv === '10' && slots.repro === String(PLAG_TEST.comet) && slots.reproLv === '5',
        'Plagiarism Master: both slots saved (Bash 10, Comet 5)', JSON.stringify(slots));
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
console.log(`standart-npc play test: ${count} files installed in ${W.WORLD}${only ? '; only ' + [...only].join(', ') : ''}`);
let failed = 0;
for (const era of ERAS) {
    console.log(`\n== ${era}`);
    failed += W.report(runEra(era), { verbose });
}
if (!keep) { W.rotest('stop'); W.rotest('world', 'down'); }
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
