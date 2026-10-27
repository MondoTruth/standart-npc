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
//= its Welcoming gift is cleared. On Renewal it stands in the middle of
//= Episodes 15.1, 15.2, 16.1, 16.2, 17.1, 17.2 and 18, for the Episode
//= Valkyrie check, with the Zeny for their tickets.
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
    'attendance', 'welcome', 'enchanter', 'grade', 'warper', 'smuggler', 'cardexchanger', 'plagiarism', 'premium', 'stylist'];
const onlyArg = args.find(a => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',').map(t => t.trim()).filter(Boolean)) : null;
if (only) for (const name of only) if (!SECTIONS.includes(name)) W.die(`unknown section: ${name} (sections: ${SECTIONS.join(', ')})`);
const want = name => !only || only.has(name);
const HELPER = fs.readFileSync(path.join(__dirname, 'play-helper.js'), 'utf8');
const CHAR = 'Tester';
// Card Exchanger (#41): item and card IDs checked in the fork's
// db/re and db/pre-re item_db (Knife_ 1202 has 4 slots in both eras).
const CARD_TEST = { knife: 1202, keep: 4001, pull: 4002 };   // Knife [4], Poring Card, Fabre Card
// Premium Service Manager (#76): an account-bound +3 Main Gauche and five
// bound Yellow Potions to dispose of, and a plain Jellopy that must not be
// offered. IDs from the fork's db/re and db/pre-re item_db.
const PREM_TEST = { gauche: 1207, potion: 503, jellopy: 909 };
// Universal Enchanter (#46): a slotless Hat on the head, a slotless Cotton
// Shirt on the body, a Shard of Agility Jewel in the bag (Renewal only;
// checked in the fork's re/pre-re item_db: Hat and Cotton Shirt in both).
const ENCH_TEST = { hat: 2220, shirt: 2301, jewel: 27422, stone: 953 };  // stone: Stone Heart, an Etc material in both eras
// Universal Enchanter's Add a slot (#111): a Slotting Advertisement and a
// Mantle (2307 -> slotted Mantle 2308, on the slot list) in the bag; both
// IDs in the fork's re/pre-re item_db.
const SLOT_TEST = { coupon: 6188, mantle: 2307 };
// Grade Refiner's "Refine with a ticket" (#120), both eras: a +6 Armor
// Refine Ticket takes the worn Hat (armor level 1) from +0 to +6; a +5
// Weapon Refine Ticket is refused for the +5 Knife and kept. IDs from the
// fork's db/re and db/pre-re item_db_etc.yml (Guarantee_Armor_6Up,
// Guarantee_Weapon_5Up).
const GRADE_TEST = { armor6: 6235, weapon5: 6456 };
// Episode Valkyrie (#51), Renewal: with the way to the New World open
// (ep13_ryu 100, which 16.1 asks for) and an Eden Group Mark (which 15.1
// asks for), the character stands in the middle of 13.1, 13.2, 13.3, 14.1,
// 14.2, 14.3, 15.1, 16.1, 16.2, 17.1, 17.2, 18 and 19 (a quest of each
// open). It first tries to skip 13.2, 13.3, 14.3, 15.2, 16.2, 17.1, 17.2,
// 18 and 19
// (refused: the part before is not finished), then buys and uses a ticket
// for 13.1, 13.2 (which gives the Ring of the Ancient Wise King), 13.3,
// 14.1, 14.2 (14.1 is not needed), 14.3, 16.1 (15 not finished: 16.1
// does not need it), 15.1, 15.2, 16.2, 17.1, 17.2, 18, then 19 (base
// level 200: the Dragon Knight is 210). Parts sharing a variable (15.1
// and 15.2, 16.2 and 17.1) have the end checked only on the last one; a
// part with start null has no start of its own. Quest and item IDs from
// the fork's npc/quests/quests_13_1.txt, quests_13_2.txt,
// npc/re/quests/quests_dicastes.txt, quests_mora.txt, quests_eclage.txt,
// quests_14_3_bis.txt, npc/re/instances/HazyForest.txt, IsleOfBios.txt,
// quests_15_1.txt, quests_15_2.txt,
// quests_16_1.txt, quests_16_2.txt, quests_17_1.txt, quests_17_2.txt,
// quests_18.txt and quests_19.txt, db/re/quest_db.yml, db/re/item_db_etc.yml. `done` is a
// sample of what each skip completes (all of it for 15). 15.1's open
// quest 7617 is the excavation report, which S_Skip closes only while it
// is the story's.
const VALK_TEST = {
    parts: [
        { name: '13.1', ep: 13, ticket: 1000284, price: 1000000, priceText: '1,000,000', key: 'ep13_1_edq', start: 5, end: 14,
          open: 3088, done: [10078, 11086, 11090, 11098, 11100, 8210, 3094] },
        { name: '13.2', ep: 13, ticket: 1000284, price: 1000000, priceText: '1,000,000', key: 'ep13_mdrama', start: 10, end: 28,
          open: 7060, done: [8241, 8242, 8243, 8253, 7071] },
        { name: '13.3', ep: 13, ticket: 1000284, price: 1000000, priceText: '1,000,000', key: 'ep13_3_secret', start: 10, end: 24,
          open: 7193, done: [7184, 7203] },
        { name: '14.1', ep: 14, ticket: 1000285, price: 2000000, priceText: '2,000,000', key: 'ep14_1_bs', start: 11, end: 19,
          open: 11189, done: [11208, 7213] },
        { name: '14.2', ep: 14, ticket: 1000285, price: 2000000, priceText: '2,000,000', key: 'ep14_2_oliver', start: 1, end: 3,
          open: 7440, done: [11311, 7418, 7419, 7420, 7427, 7444, 7453] },
        { name: '14.3', ep: 14, ticket: 1000285, price: 2000000, priceText: '2,000,000', key: 'ep14_3_newerabs', start: 16, end: 24,
          open: 11355, done: [11349, 11353, 11362, 15006] },
        { name: '16.1', ep: 16, ticket: 1000282, price: 4000000, priceText: '4,000,000', key: 'ep16_royal', start: 13, end: 24,
          open: 7695, done: [7682] },
        { name: '15.1', ep: 15, ticket: 1000286, price: 3000000, priceText: '3,000,000', key: 'ep15_1_atnad', start: 12, end: 19,
          open: 7617, done: [7608, 7610, 7619, 11363, 11364, 11365, 11366, 11367, 11368, 11369, 11370, 11371, 11372, 11373, 11374, 11375] },
        { name: '15.2', ep: 15, ticket: 1000286, price: 3000000, priceText: '3,000,000', key: 'ep15_1_atnad', start: null, end: 34,
          open: 7642, done: [7641, 11382, 11383, 11384, 11385, 11386, 11387, 11388, 11389] },
        { name: '16.2', ep: 16, ticket: 1000282, price: 4000000, priceText: '4,000,000', key: 'terra_gloria_main', start: 16, end: 25,
          open: 14614, done: [14600, 14601, 14602, 14613, 11462, 14615, 12374, 7741], doneBefore: 14601 },
        { name: '17.1', ep: 17, ticket: 1000287, price: 5000000, priceText: '5,000,000', key: 'terra_gloria_main', start: null, end: 26,
          open: 7852, done: [7850, 7862, 17014, 11603, 16354, 16360], doneBefore: 7850 },
        { name: '17.2', ep: 17, ticket: 1000287, price: 5000000, priceText: '5,000,000', key: 'ep17_2_main', start: 21, end: 36,
          open: 16449, done: [11620, 16452, 18018, 18021, 18020] },
        { name: '18', ep: 18, ticket: 1000288, price: 6000000, priceText: '6,000,000', key: 'ep18_main', start: 41, end: 57,
          open: 16573, done: [8681, 11720, 11724, 18085], doneBefore: 8681 },
        { name: '19', ep: 19, ticket: 1000988, price: 7000000, priceText: '7,000,000', key: 'ep19_main', start: 30, end: 100,
          open: 17635, done: [16639, 16640, 16641, 16642, 16643, 16644, 17649] },
    ],
    // Set before the run (what 16.1 needs), and the other variables the
    // skips raise to at least these values.
    // 14.2's main variable is checked here: 14.3 raises it to 34.
    before: { ep13_ryu: 100, ep14_2_mylord: 18 },
    after: { ep13_newbs: 100, ep13_1_rhea: 100, ep13_2_rhea: 100, ep13_3_invite: 6, ep14_1_mistwoods: 10, ep14_2_mylord: 34, ep14_3_isle: 1, ep14_3_mors01: 1, terra_gloria_lady_part: 10, ep15_1_elb: 15, ep15_2_permit: 6, ep15_2_bslast: 9, ep15_2_bsmemo: 18, ep19_side_saint: 1 },
    mark: 6219,   // Eden Group Mark (Para_Team_Mark), db/re/item_db_etc.yml
    ring: 2782,   // Ring of the Ancient Wise King (Ring_Of_Wise_King), db/re/item_db_equip.yml
};
const VALK_PRICE = VALK_TEST.parts.reduce((n, p) => n + p.price, 0);
const VALK_QUESTS = [...VALK_TEST.parts.flatMap(p => [p.open, ...p.done])];
const VALK_KEYS = [...new Set([...VALK_TEST.parts.map(p => p.key), ...Object.keys(VALK_TEST.before), ...Object.keys(VALK_TEST.after)])];
const VALK_REGS = [
    ...VALK_TEST.parts.filter(p => p.start !== null).map(p => [p.key, p.start]),
    ...Object.entries(VALK_TEST.before),
];
// Smuggler's access quest: a Mr. Smile mask worn (does not count) and a
// ten 1carat Diamonds in the bag; a second mask is given in game. The free item
// asked for is a Red Potion. IDs from the fork's db/re and db/pre-re
// item_db (Mr_Smile 2278 sits on Head_Low + Head_Mid: equip 1 | 512).
const SMUG_TEST = { mask: 2278, gems: 730, gemsNeeded: 10, free: 501, worn: 513 };
// Banned goods (tests/world.cjs sets the options): Baphomet Card, which
// Baphomet (1039, Mvp mode) drops; Angeling Card, which Angeling (1096,
// Class Boss) drops; T Spinx Helm (Costume_Head_Top); Orange Potion,
// typed in as an ID. All in the fork's re and pre-re dbs.
const SMUG_BANNED = { mvpCard: 4147, bossCard: 4054, costume: 19501, typed: 502 };
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
// Stylist's alternative outfit (Renewal): the run's Dragon Knight (4th class,
// gets the Rune Knight's) and a Rune Knight (4054) wear it; a Super Novice
// (23) is not offered one. JOB_RUNE_KNIGHT_2ND = 4332, all from the fork's
// src/common/mmo.hpp.
const STYLE_TEST = { at: '169 182', rk2nd: 4332,
    jobs: [{ id: 4252, name: 'Dragon Knight' }, { id: 4054, name: 'Rune Knight' }],
    none: { id: 23, name: 'Super Novice' } };
let charId = null;

// Per era: the character, and what the NPCs should show.
const EXPECT = {
    'renewal': {
        job: 4252, level: 210,   // Dragon Knight
        bountyMenu: ['Target Hunt', 'Overlook Water Dungeon', 'Illusion Dungeons', 'Daily Area Purge', 'Cancel'],
        purgeMaps: ['sp_rudus4'],  // Lv 201-230: one map (#24)
        dummy: { 28412: ['Size:Medium', 'Lv:150', 'DEF:0'], 28413: ['Size:Medium', 'Lv:150', 'DEF:0'],
            28414: ['Size:Medium', 'Lv:150', 'DEF:120'], 28415: ['Size:Large', 'Lv:150', 'DEF:120'] },
        blessing: true,            // Blacksmith Blessing in the Tool Dealer
        mvp90: true,               // Dummy Master's "MVP, 90% less damage": Renewal only
        welcome: true,             // Welcoming in Izlude: Renewal only
        valkyrie: true,            // Episode Valkyrie: Renewal only
        jewel: true,               // headgear jewels exist (Enchanter check)
        gradeUi: true,             // Grade Refiner's grading and refine windows: Renewal only
        warpFee: true,             // a Dragon Knight is 4th class: the Warper charges
        smugglerMarkup: 2,         // no cash-shop-extended in the test world
        thirdClass: true,          // Shadow Chaser exists: Plagiarism Master's Reproduce check
        // Attendance Check days 1-3 with tests/world.cjs's settings: day 1
        // set to 3 Red Potions, days 2 and 3 the mod's own attendance.yml.
        attendance: ['501:3', '969:7', '14545:3'],
    },
    'pre-renewal': {
        job: 4008, level: 99,    // Lord Knight
        bountyMenu: ['Target Hunt', 'Overlook Water Dungeon', 'Daily Area Purge', 'Cancel'],
        purgeMaps: ['ice_dun01', 'gl_church', 'yuno_fild08', 'ra_fild12', 'mosk_dun02', 'gef_fild06', 'gef_fild08'],
        dummy: { 28412: ['Size:Medium', 'Lv:99', 'DEF:0'], 28413: ['Size:Medium', 'Lv:99', 'DEF:0'],
            28414: ['Size:Medium', 'Lv:99', 'DEF:0'], 28415: ['Size:Large', 'Lv:99', 'DEF:0'] },
        blessing: false,
        mvp90: false,
        welcome: false,
        valkyrie: false,
        jewel: false,
        gradeUi: false,
        warpFee: false,            // a Lord Knight: no 3rd class here, no fee
        smugglerMarkup: 2,
        thirdClass: false,
        attendance: ['501:3', '14545:3', '12412:5'],
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
        `UPDATE \`char\` SET class=${e.job}, body=${e.job}, base_level=${e.level}, job_level=50, zeny=${100000 + VALK_PRICE}, last_map='prontera', last_x=156, last_y=180 WHERE char_id=${id};`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` IN (${VALK_KEYS.map(k => `'${k}'`).join(', ')});`
        + ` DELETE FROM quest WHERE char_id=${id} AND quest_id IN (${VALK_QUESTS.join(', ')});`
        + ` DELETE FROM inventory WHERE char_id=${id} AND nameid IN (${[...VALK_TEST.parts.map(p => p.ticket), VALK_TEST.mark, VALK_TEST.ring].join(', ')});`
        + (e.valkyrie ? ` INSERT INTO inventory (char_id, nameid, amount, equip, identify) VALUES (${id}, ${VALK_TEST.mark}, 1, 0, 1);`
            + ` INSERT INTO char_reg_num (char_id, \`key\`, \`index\`, value) VALUES ${VALK_REGS.map(([k, v]) => `(${id}, '${k}', 0, ${v})`).join(', ')};`
            + ` INSERT INTO quest (char_id, quest_id, state) VALUES `
            + VALK_TEST.parts.map(p => `(${id}, ${p.open}, '1')` + (p.doneBefore ? `, (${id}, ${p.doneBefore}, '2')` : '')).join(', ') + ';' : '')
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`
        + ` DELETE FROM char_reg_str WHERE char_id=${id} AND \`key\` LIKE 'BB\\_%';`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\`='SNPC_WelcomeGift';`
        + ` UPDATE inventory SET equip=0 WHERE char_id=${id} AND (equip & (34 | 256 | 16)) <> 0;`
        + ` DELETE FROM inventory WHERE char_id=${id} AND nameid IN (${CARD_TEST.knife}, ${CARD_TEST.keep}, ${CARD_TEST.pull}, ${ENCH_TEST.hat}, ${ENCH_TEST.shirt}, ${ENCH_TEST.jewel}, ${ENCH_TEST.stone}, ${SLOT_TEST.coupon}, ${SLOT_TEST.mantle}, ${SMUG_TEST.mask}, ${SMUG_TEST.gems}, ${SMUG_TEST.free}, ${PREM_TEST.gauche}, ${PREM_TEST.potion}, ${PREM_TEST.jellopy}, ${GRADE_TEST.armor6}, ${GRADE_TEST.weapon5});`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` LIKE 'SNPC\\_Smuggler%';`
        // Plagiarism Master's run leaves copied skills and a Shadow Chaser's skills.
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` IN ('CLONE_SKILL', 'CLONE_SKILL_LV', 'REPRODUCE_SKILL', 'REPRODUCE_SKILL_LV');`
        + ` DELETE FROM skill WHERE char_id=${id} AND id IN (${PLAG_IDS});`
        + ` DELETE FROM char_reg_num WHERE char_id=${id} AND \`key\` IN (${PLAG_TEST.regs.map(k => `'${k}'`).join(', ')});`
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify) VALUES (${id}, ${SMUG_TEST.mask}, 1, ${SMUG_TEST.worn}, 1), (${id}, ${SMUG_TEST.gems}, ${SMUG_TEST.gemsNeeded}, 0, 1);`
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify, refine, card0, card1)`
        + ` VALUES (${id}, ${CARD_TEST.knife}, 1, 2, 1, 5, ${CARD_TEST.keep}, ${CARD_TEST.pull});`
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify) VALUES (${id}, ${ENCH_TEST.hat}, 1, 256, 1), (${id}, ${ENCH_TEST.shirt}, 1, 16, 1);`
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify, refine, bound) VALUES (${id}, ${PREM_TEST.gauche}, 1, 0, 1, 3, 1),`
        + ` (${id}, ${PREM_TEST.potion}, 5, 0, 1, 0, 1), (${id}, ${PREM_TEST.jellopy}, 1, 0, 1, 0, 0);`
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify) VALUES (${id}, ${ENCH_TEST.stone}, 1, 0, 1),`
        + ` (${id}, ${SLOT_TEST.coupon}, 1, 0, 1), (${id}, ${SLOT_TEST.mantle}, 1, 0, 1);`
        + (e.jewel ? ` INSERT INTO inventory (char_id, nameid, amount, equip, identify) VALUES (${id}, ${ENCH_TEST.jewel}, 1, 0, 1);` : '')
        + ` INSERT INTO inventory (char_id, nameid, amount, equip, identify) VALUES (${id}, ${GRADE_TEST.armor6}, 1, 0, 1), (${id}, ${GRADE_TEST.weapon5}, 1, 0, 1);`);
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
        // The Medium and MVP dummies (dummy_pair, on in the test world).
        gm('@warp prontera 155 160');
        // Polls a few seconds: right after the warp the client may not have them yet.
        const pair = ev(`(async () => {
            const seen = () => roAgent.entities({ type: 'MOB', radius: 10 }).filter(m => /^(Medium|MVP) Dummy$/.test(m.name) && m.gid > 0 && !m.dead).map(m => m.name + '@' + m.position.join(',')).sort();
            for (let i = 0; i < 10 && seen().length < 2; i++) await new Promise(r => setTimeout(r, 500));
            return seen();
        })()`);
        check(Array.isArray(pair) && pair.join(' ') === 'MVP Dummy@158,163 Medium Dummy@153,163', 'Training Dummies: Medium Dummy at 153,163 and MVP Dummy at 158,163', JSON.stringify(pair));
        for (const [id, wanted] of Object.entries(e.dummy)) {
            gm(`@mobinfo ${id}`);
            // An MVP's @mobinfo is 9 lines; read more and keep this monster's part.
            const info = ev(`(() => { const t = snpc.chat(14).join(' '); return t.slice(t.lastIndexOf('Monster: ')); })()`);
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
        check(!items.some(n => /Converter/.test(n)), 'Tool Dealer: no Elemental Converters (the Elemental Endower sells them)', items.filter(n => /Convert/.test(n)).join(', ') || 'none');
        check(items.includes('Gym Pass'), 'Tool Dealer: Gym Pass sold without cash-shop-extended', items.includes('Gym Pass') ? 'listed' : 'not listed');
    }
    if (want('nokzin')) {
        gm('@warp prontera 147 163');
        const nokzin = ev(`(async () => {
            await snpc.talk('Elemental Endower');
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
        check(nokzin && /5,000 z/.test(nokzin.text) && converters.length === 4, 'Elemental Endower: sells the four Elemental Converters',
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
        gm('@warp prontera 128 190');
        if (!e.valkyrie) {
            const valk = ev(`snpc.npcs(10).map(n => n.name)`);
            check(Array.isArray(valk) && !valk.some(n => n.startsWith('Valkyrie')), 'Episode Valkyrie: not on Pre-renewal', JSON.stringify(valk));
        } else {
            // A part before the one ahead of it is refused; then per part: buy its episode's
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
            for (const [part, prev] of [['13.2', '13.1'], ['13.3', '13.2'], ['14.3', '14.2'], ['15.2', '15.1'], ['16.2', '16.1'], ['17.1', '16.2'], ['17.2', '17.1'], ['18', '17.2'], ['19', '18']]) {
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
    }

    if (want('attendance')) {
        // Attendance Check reward editor (#84): the window the client draws
        // from its own CheckAttendance.lub shows, through the mod's client
        // plugin, the rewards the server really gives.
        const days = ev(`(async () => {
            const c = roAgent.modules.UIManager.getComponent('CheckAttendance');
            if (c._host && c._host.style.display !== 'none') c.toggle();
            c.toggle();
            const read = () => { const r = c.getRoot(); return r ? [0, 1, 2].map(i => r.querySelector('#attendance_day_' + i + ' .item')) : []; };
            const shown = () => read().map(el => el ? (el.dataset.snpcIcon || '-') + ':' + ((el.querySelector('.item-quantity') || {}).textContent || '-') : 'none');
            for (let i = 0; i < 40 && !(read()[0] && read()[0].dataset.snpcIcon); i++) await new Promise(r => setTimeout(r, 250));
            const first = shown();
            // Reopened in game, the window redraws its days from its own list
            // again: the plugin has to put the server's rewards back (Discord
            // report after 4.9.7).
            c.toggle();
            await new Promise(r => setTimeout(r, 500));
            c.toggle();
            for (let i = 0; i < 40 && !(read()[0] && read()[0].dataset.snpcIcon); i++) await new Promise(r => setTimeout(r, 250));
            await new Promise(r => setTimeout(r, 1000));
            const again = shown();
            if (c._host && c._host.style.display !== 'none') c.toggle();
            return [first, again];
        })()`);
        for (const [n, label] of [[0, 'window shows'], [1, 'reopened window shows']])
            check(Array.isArray(days) && Array.isArray(days[n]) && e.attendance.every((d, i) => days[n][i] === d),
                `Attendance Check: ${label} ${e.attendance.join(', ')} for days 1-3`, JSON.stringify(days && days[n]));
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
        // not for the Cotton Shirt; an Etc "Stone" (Stone Heart) never is.
        {
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
            if (e.jewel) {
                check(Array.isArray(head) && head.includes('Shard of Agility Jewel'), 'Universal Enchanter: offers the jewel for the Top Headgear', JSON.stringify(head).slice(-200));
                const body = stones('Armor');
                check(Array.isArray(body) && !body.some(t => t.includes('Agility Jewel')), 'Universal Enchanter: not for the Armor', JSON.stringify(body).slice(-200));
            }
            check(Array.isArray(head) && !head.some(t => t.includes('Stone Heart')), 'Universal Enchanter: no Etc items (Stone Heart)', JSON.stringify(head).slice(-200));
        }
        // Add a slot (#111) is offered only with cash-shop-extended, which
        // the test world does not load: hidden here, though the Tester
        // carries a coupon and a Mantle. The slotting itself is not
        // played (it needs cash-shop-extended's CashPointRewards NPC).
        {
            const first = ev(`(async () => {
                const sleep = ms => new Promise(r => setTimeout(r, ms));
                await snpc.talk('Universal Enchanter');
                let v = snpc.view();
                for (let i = 0; i < 30 && !v.menu.length; i++) {
                    if (v.next) v = await snpc.next(); else { await sleep(200); v = snpc.view(); }
                }
                const out = v.menu.map(m => m.text);
                if (out.includes('Cancel')) await snpc.pick('Cancel');
                await snpc.close();
                return out;
            })()`);
            check(Array.isArray(first) && first.includes('Regular Gear') && !first.some(t => t.includes('Add a slot')),
                'Universal Enchanter: no Add a slot without cash-shop-extended', JSON.stringify(first).slice(-200));
        }
    }
    if (want('grade')) {
        // Grade Refiner (#120): a ticket refines worn gear up to its level;
        // one at or below the item's refine is refused and kept.
        gm('@warp prontera 164 167');
        const refine = (part, ticket, confirm) => ev(`(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            await snpc.talk('Grade Refiner');
            let v = snpc.view();
            for (let i = 0; i < 6 && !v.menu.length && v.next; i++) v = await snpc.next();
            const first = v.menu.map(m => m.text);
            const steps = [await snpc.go('Refine with a ticket'), await snpc.go('${part}'), await snpc.go('${ticket}')];
            if (${confirm}) steps.push(await snpc.go('Yes'));
            v = snpc.view();
            for (let i = 0; i < 10 && v.next; i++) v = await snpc.next();
            await sleep(300);
            const said = snpc.view().text;
            await snpc.close();
            return { first, said, errors: steps.filter(s => s && s.error).map(s => s.error) };
        })()`);
        const knife = refine('Knife', '+5 Weapon', false);
        check(knife && !knife.errors.length && /already at \+5/.test(knife.said), 'Grade Refiner: a +5 ticket is refused for a +5 Knife', JSON.stringify(knife).slice(-200));
        const hat = refine('Hat', '+6 Armor', true);
        check(hat && !hat.errors.length && /now \+6/.test(hat.said), 'Grade Refiner: a +6 Armor ticket refines the Hat to +6', JSON.stringify(hat).slice(-200));
        const ui = knife && Array.isArray(knife.first) && knife.first.includes('Equipment Grading');
        check(ui === e.gradeUi, `Grade Refiner: grading window ${e.gradeUi ? 'offered' : 'not offered on Pre-renewal'}`, JSON.stringify(knife && knife.first));
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
        // Maps app 1.6.6's world sync filled with monsters: every new entry
        // lands on its map in Renewal; Pre-renewal has none of them.
        const synced = [
            [['Fields', 'Destroyed Geffen Field'], 'hem_fild'],
            [['Fields', 'Power Twisted Plains'], 'ra_pol01'],
            [['Fields', 'Twisted Land of Darkness'], 'ygg_roots'],
            [['Fields', 'Volund Fields', 'Outside the Volund Valley'], 'mu_fild01'],
            [['Fields', 'Volund Fields', 'Volund Plain'], 'mu_fild02'],
            [['Fields', 'Volund Fields', 'Volund Forest'], 'mu_fild03'],
            [['Fields', 'Niflheim Fields', 'Niflheim Pumpkin Farm'], 'nif_fild03'],
            [['Fields', 'Frozen Scale Fields', 'Frozen Scale Beach'], 'jor_back4'],
            [['Fields', 'Frozen Scale Fields', 'Ancient Ice Canyon East'], 'jor_back5'],
            [['Fields', 'Frozen Scale Fields', 'Ancient Ice Canyon West'], 'jor_back6'],
            [['Fields', 'Frozen Scale Fields', 'Drift Ice Zone'], 'jor_twice'],
            [['Fields', 'Frozen Scale Fields', 'Northern Rising Land'], 'jor_raise1'],
            [['Fields', 'Frozen Scale Fields', 'Southern Rising Land'], 'jor_raise2'],
            [['Fields', 'Frozen Scale Fields', 'Jornville'], 'jor_base'],
            [['Dungeons', 'Ancient Temple Akhet'], 'moc_akhet'],
            [['Dungeons', 'Destroyed Valkyrie Realm'], 'hem_dun02'],
            [['Dungeons', 'Destroyed Verus'], 'hem_dun01'],
            [['Dungeons', 'Devoured Geffenia', 'Devoured Geffenia East'], 'ch1_gfn01'],
            [['Dungeons', 'Devoured Geffenia', 'Devoured Geffenia West'], 'ch1_gfn03'],
            [['Dungeons', 'Distorted Brimir', 'Distorted Brimir 1'], 'uknw_ruin'],
            [['Dungeons', 'Distorted Brimir', 'Distorted Brimir 2'], 'uknw_ruin2'],
            [['Dungeons', 'Distorted Ragsrut'], 'rgs_dun1'],
            [['Dungeons', 'Issgard Dungeon', "Snake God's Root 1st"], 'jor_root1'],
            [['Dungeons', 'Issgard Dungeon', "Snake God's Root 2nd"], 'jor_root2'],
            [['Dungeons', 'Issgard Dungeon', 'Deep Root Cave'], 'jor_root3'],
            [['Dungeons', 'Issgard Dungeon', 'Snake Labyrinth'], 'jor_maze'],
            [['Dungeons', 'Jormungand Cult Temple', 'Cult Temple 1st'], 'jor_sklf1'],
            [['Dungeons', 'Jormungand Cult Temple', 'Cult Temple 2nd'], 'jor_sklf2'],
            [['Dungeons', 'Jormungand Cult Temple', 'Gimleh 1st'], 'jor_tmple1'],
            [['Dungeons', 'Jormungand Cult Temple', 'Gimleh 2nd'], 'jor_tmple2'],
            [['Dungeons', 'Mjolnir Underground Cave'], 'mjo_wst01'],
            [['Dungeons', 'Primordial Flame', 'Primordial Flame 1'], 'mu_dun01'],
            [['Dungeons', 'Primordial Flame', 'Primordial Flame 2'], 'mu_dun02'],
            [['Dungeons', 'Root of Death'], 'deadroot'],
            [['Dungeons', 'Unknown Blue Hole'], 'cmd_bhole'],
            [['Dungeons', "Varmundt's Dungeon", 'Soul Rune'], 'bl_soul'],
            [['Dungeons', "Varmundt's Dungeon", 'Temple Rune'], 'bl_temple'],
            [['Dungeons', "Varmundt's Dungeon", 'Venom Rune'], 'bl_venom'],
            [['Dungeons', "Varmundt's Dungeon", 'Biosphere Depth 1'], 'bl_depth1'],
            [['Dungeons', "Varmundt's Dungeon", 'Biosphere Depth 2'], 'bl_depth2'],
            [['Dungeons', 'Zerocell Sector', 'Lux'], 'ch1zero1'],
            [['Dungeons', 'Zerocell Sector', 'Nox'], 'ch1zero2'],
            [['Dungeons', 'Zerocell Sector', 'Vita'], 'ch1zero3'],
            [['Dungeons', 'Zerocell Sector', 'Arc'], 'ch1zero4'],
            ...['death', 'factory', 'ground', 'ice', 'jungle', 'lava', 'soul', 'temple', 'valley', 'venom']
                .map(k => [['Dungeons', 'Dimensional Biosphere', k[0].toUpperCase() + k.slice(1)], `ab_${k}1`]),
            [['Towns', 'Yongjirak'], 'kindlbrk'],
            [['Dungeons', 'Herosria Dungeon'], 'hero_dun1'],
        ];
        // The monsters there are level 205+: while it is on, they leave the
        // tester alone (a dead character's chat no longer takes GM commands).
        gm('@monsterignore');
        const list = era === 'renewal' ? synced : synced.slice(0, 1);
        for (const [i, [path, map]] of list.entries()) {
            // Dozens of big maps in a row crash the test browser: a fresh
            // client every 12 (monsterignore ends with the session).
            if (i && i % 12 === 0) {
                W.rotest('stop');
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
                const again = enterGame();
                if (!again.ok) { check(false, 'Warper: client restarted', again.detail); break; }
                gm('@monsterignore');
            }
            // A big map may still be loading: a GM command typed then is lost.
            for (let k = 0; k < 3 && !/prontera/.test(ev('roAgent.player() && roAgent.player().map')); k++) {
                gm('@alive');
                gm('@warp prontera 160 189');
                W.rotest('wait', '4000');
            }
            const r = warper(path, 'Pay');
            // Pre-renewal: "not enabled" is a message over the head, not in the window.
            const ok = era === 'renewal' ? r && String(r.map).replace(/\.gat$/, '') === map
                : r && /prontera/.test(r.map);
            check(ok, `Warper: ${path.slice(1).join(' > ')} ${era === 'renewal' ? 'lands on ' + map : 'closed in Pre-renewal'}`,
                JSON.stringify(r).slice(-200));
            W.rotest('wait', '4000');
        }
        // Yongjirak has its own Warper and Buffer (npc/*_era.txt, Renewal only).
        if (era === 'renewal') {
            gm('@warp kindlbrk 181 125');
            W.rotest('wait', '6000');
            const town = ev(`roAgent.entities({ type: 'NPC', radius: 12 }).map(n => n.name + '@' + n.position.join(','))`);
            check(Array.isArray(town) && town.includes('Warper@184,128') && town.includes('Buffer@177,122'),
                'Warper and Buffer stand in Yongjirak', JSON.stringify(town).slice(-200));
        }
        gm('@warp prontera 160 189');
        W.rotest('wait', '4000');
        gm('@monsterignore');
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
        gm('@warp prontera 187 192');
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
        for (const [what, id] of [['an MVP card', SMUG_BANNED.mvpCard], ['a mini-boss card', SMUG_BANNED.bossCard],
            ['a costume', SMUG_BANNED.costume], ['a banned ID', SMUG_BANNED.typed]]) {
            const buy = smug(['Buy an item', id]);
            check(buy && String(buy.said).includes('forbade me to sell this'), `Smuggler: refuses ${what} (${id})`, JSON.stringify(buy).slice(-200));
        }
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
    if (want('premium')) {
        // Premium Service Manager: the bound Main Gauche goes whole, two of
        // the five bound potions go, the tradable Jellopy is not offered.
        gm('@warp prontera 160 185');
        const talk = ev(`(async () => {
            const said = [];
            await snpc.talk('Premium Service Manager');
            let v = await snpc.go('Discard an item');
            said.push(v.text);
            v = await snpc.next();
            const menu = v.menu.map(i => i.text);
            v = await snpc.pick('+3 Main Gauche');
            said.push(v.text);
            v = await snpc.go('Dispose of it');
            said.push(v.text);
            await snpc.close();
            await snpc.talk('Premium Service Manager');
            await snpc.go('Discard an item');
            await snpc.next();
            v = await snpc.pick('Yellow Potion x5');
            await snpc.next();
            v = await snpc.input(2);
            said.push(v.text);
            v = await snpc.go('Dispose of it');
            said.push(v.text);
            await snpc.close();
            return { said, menu };
        })()`);
        const said = talk && talk.said ? talk.said.join(' / ') : JSON.stringify(talk);
        const menu = talk && talk.menu ? talk.menu : [];
        check(menu.some(t => t.startsWith('+3 Main Gauche')) && menu.includes('Yellow Potion x5'),
            'Premium Service Manager: lists the bound Main Gauche and potions', JSON.stringify(menu));
        check(!menu.some(t => t.startsWith('Jellopy')), 'Premium Service Manager: a tradable Jellopy is not listed', JSON.stringify(menu));
        check(said.includes('Dispose of +3 Main Gauche') && said.includes('Dispose of 2 x Yellow Potion'),
            'Premium Service Manager: asks before disposing', said.slice(-400));
        check((said.match(/is gone\./g) || []).length === 2, 'Premium Service Manager: disposes of both', said.slice(-400));
    }
    if (want('stylist')) {
        // Stylist: the styling window, then the 3rd class alternative outfit
        // bought in it (Renewal only). The server sends a body style 1 (outfit) or 0 to this client
        // (clif_sprite_change, packetver < 20231220), and the client then
        // draws a costume_1 body. Relog visuals are not checked: the
        // installed client still has Flux159/roBrowserLegacy#147's bugs.
        gm(`@warp prontera ${STYLE_TEST.at}`);
        const body = () => ev(`(async () => {
            await new Promise(r => setTimeout(r, 2000));
            const p = roAgent.modules.Session.Entity;
            return { body: p._body, spr: (p.files && p.files.body && p.files.body.spr) || '' };
        })()`);
        // The styling window (both eras): the Stylist says the prices (the
        // settings' defaults), Close opens the window, and a hair color
        // bought through it (the packet its Apply sends) costs 100,000 Zeny.
        gm('@zeny 200000');
        ev('new Promise(r => setTimeout(r, 1000))');
        const win = ev(`(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const v = await snpc.talk('Stylist');
            const said = v.text;
            await snpc.close();
            await sleep(1500);
            const M = roAgent.modules;
            const c = M.UIManager.getComponent('Stylist');
            const open = !!(c && c._host && c._host.isConnected);
            const p = M.Session.Entity;
            const before = { zeny: M.Session.zeny, color: p.headpalette | 0 };
            const pkt = new M.PACKET.CZ.REQ_STYLE_CHANGE2();
            pkt.HeadPalette = before.color % 8 + 1;
            M.Network.sendPacket(pkt);
            await sleep(2500);
            try { if (c._host && c._host.isConnected) c.remove(); } catch { /* closed */ }
            return { said, open, want: pkt.HeadPalette, before, after: { zeny: M.Session.zeny, color: p.headpalette | 0 } };
        })()`);
        check(win && ['Hair style: 100,000 Zeny', 'Hair color: 100,000 Zeny', 'Cloth color: 100,000 Zeny'].every(t => String(win.said).includes(t)),
            'Stylist: says the window prices', JSON.stringify(win));
        check(win && win.open, 'Stylist: Close opens the styling window', JSON.stringify(win));
        check(win && win.after.color === win.want && win.after.zeny === win.before.zeny - 100000,
            'Stylist: a hair color from the window costs 100,000 Zeny', JSON.stringify(win));
        // Paying with a coupon: the window's "Pay with coupons" sends
        // @snpcstylist <request> pay 1 before the purchase; a cloth color then
        // takes one Clothing Dye Coupon (6046) and no Zeny.
        gm('@item 6046 1');
        ev(`(async () => {
            await snpc.talk('Stylist');
            await snpc.close();
            await new Promise(r => setTimeout(r, 1500));
        })()`);
        gm('@snpcstylist 1 pay 1');
        const coupon = ev(`(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            await sleep(1000);
            const M = roAgent.modules;
            const c = M.UIManager.getComponent('Stylist');
            const p = M.Session.Entity;
            const inv = M.UIManager.getComponent('Inventory');
            const coupons = () => { const i = inv.getItemById(6046); return i ? i.count || 1 : 0; };
            const before = { zeny: M.Session.zeny, coupons: coupons(), color: p.bodypalette | 0 };
            const pkt = new M.PACKET.CZ.REQ_STYLE_CHANGE2();
            pkt.BodyPalette = before.color === 3 ? 4 : 3;
            M.Network.sendPacket(pkt);
            await sleep(2500);
            try { if (c._host && c._host.isConnected) c.remove(); } catch { /* closed */ }
            return { want: pkt.BodyPalette, before, after: { zeny: M.Session.zeny, coupons: coupons(), color: p.bodypalette | 0 } };
        })()`);
        check(coupon && coupon.after.color === coupon.want && coupon.after.zeny === coupon.before.zeny
            && coupon.after.coupons === coupon.before.coupons - 1,
            'Stylist: paying with coupons takes a Clothing Dye Coupon, not Zeny', JSON.stringify(coupon));
        // The outfit, bought in the styling window (Renewal): opens the
        // Stylist, keeps what it says, and with `style` buys it the way the
        // window's Outfit tab does (BodyStyle 1 standard, 2 alternative; the
        // indices of db/re/stylist.yml's Body2). Needs the fork's Body2 fix.
        const outfit = style => ev(`(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const v = await snpc.talk('Stylist');
            const said = v.text;
            await snpc.close();
            await sleep(1500);
            const M = roAgent.modules;
            const c = M.UIManager.getComponent('Stylist');
            const before = M.Session.zeny;
            if (${style || 0}) {
                const pkt = new M.PACKET.CZ.REQ_STYLE_CHANGE2();
                pkt.BodyStyle = ${style || 0};
                M.Network.sendPacket(pkt);
                await sleep(2500);
            }
            try { if (c._host && c._host.isConnected) c.remove(); } catch { /* closed */ }
            return { said, paid: before - M.Session.zeny };
        })()`);
        const offered = r => r && /Outfit: 100,000 Zeny/.test(String(r.said));
        const wearing = b => b && b.body === 1 && /costume_1/.test(b.spr);
        const plain = b => b && b.body === 0 && b.spr && !/costume_1/.test(b.spr);
        if (!e.thirdClass) {
            const none = outfit(0);
            check(none && !offered(none) && !/Outfit:/.test(String(none.said)), 'Stylist: no outfit on Pre-renewal', JSON.stringify(none));
        } else {
            gm('@zeny 1000000');
            for (const job of STYLE_TEST.jobs) {
                if (job.id !== e.job) { gm(`@jobchange ${job.id}`); ev('new Promise(r => setTimeout(r, 1500))'); }
                const on = outfit(2);
                check(offered(on), `Stylist: outfit offered to a ${job.name}`, JSON.stringify(on));
                const b1 = body();
                check(wearing(b1) && on.paid === 100000, `Stylist: ${job.name} buys the alternative outfit (costume_1) for 100,000 Zeny`, JSON.stringify({ on, b1 }));
                const off = outfit(1);
                const b2 = body();
                check(plain(b2) && off.paid === 100000, `Stylist: ${job.name} back to the standard outfit`, JSON.stringify({ off, b2 }));
            }
            gm(`@jobchange ${STYLE_TEST.none.id}`);
            ev('new Promise(r => setTimeout(r, 1500))');
            const none = outfit(2);
            const b3 = body();
            check(none && !/Outfit:/.test(String(none.said)) && none.paid === 0 && plain(b3),
                `Stylist: no outfit for a ${STYLE_TEST.none.name}, and the server refuses one`, JSON.stringify({ none, b3 }));
            // Back to the run's class, outfit on: logging out must save it.
            gm(`@jobchange ${e.job}`);
            ev('new Promise(r => setTimeout(r, 1500))');
            outfit(2);
        }
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
    if (want('stylist') && e.thirdClass) {
        // The outfit was left on: logging out saves it as the body style.
        let saved = null;
        for (let i = 0; i < 10 && saved !== String(STYLE_TEST.rk2nd); i++) {
            if (i) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
            saved = sqlOne(`SELECT body FROM \`char\` WHERE char_id=${charId}`);
        }
        check(saved === String(STYLE_TEST.rk2nd), 'Stylist: the outfit is saved with the character (body = Rune_Knight_2nd)', `body ${saved}`);
    }
    if (want('valkyrie') && e.valkyrie) {
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
        for (const [key, min] of Object.entries(VALK_TEST.after)) {
            const v = sqlOne(`SELECT COALESCE(MAX(value),0) FROM char_reg_num WHERE char_id=${charId} AND \`key\`='${key}'`);
            check(Number(v) >= min, `Episode Valkyrie: ${key} at least ${min}`, `${key} ${v}`);
        }
        const tickets = sqlOne(`SELECT COALESCE(SUM(amount),0) FROM inventory WHERE char_id=${charId} AND nameid IN (${VALK_TEST.parts.map(p => p.ticket).join(', ')})`);
        check(tickets === '0', 'Episode Valkyrie: the tickets are used up', `${tickets} left`);
        const ring = sqlOne(`SELECT COALESCE(SUM(amount),0) FROM inventory WHERE char_id=${charId} AND nameid=${VALK_TEST.ring}`);
        check(ring === '1', 'Episode Valkyrie: 13.2 gives the Ring of the Ancient Wise King', `${ring} rings`);
    }
    if (want('grade')) {
        const count = nameid => sqlOne(`SELECT COALESCE(SUM(amount),0) FROM inventory WHERE char_id=${charId} AND nameid=${nameid}`);
        const hat = sqlOne(`SELECT refine FROM inventory WHERE char_id=${charId} AND nameid=${ENCH_TEST.hat}`);
        check(hat === '6' && count(GRADE_TEST.armor6) === '0' && count(GRADE_TEST.weapon5) === '1',
            'Grade Refiner: Hat saved at +6, the +6 ticket used, the +5 ticket kept',
            `hat +${hat}, armor6 ${count(GRADE_TEST.armor6)}, weapon5 ${count(GRADE_TEST.weapon5)}`);
    }
    if (want('premium')) {
        const count = nameid => sqlOne(`SELECT COALESCE(SUM(amount),0) FROM inventory WHERE char_id=${charId} AND nameid=${nameid}`);
        check(count(PREM_TEST.gauche) === '0' && count(PREM_TEST.potion) === '3' && count(PREM_TEST.jellopy) === '1',
            'Premium Service Manager: Main Gauche gone, 3 potions and the Jellopy left',
            `gauche ${count(PREM_TEST.gauche)}, potions ${count(PREM_TEST.potion)}, jellopy ${count(PREM_TEST.jellopy)}`);
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
        `UPDATE \`char\` SET class=${PLAG_TEST.job}, body=${PLAG_TEST.job}, base_level=175, last_map='prontera', last_x=171, last_y=180 WHERE char_id=${charId};`
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
