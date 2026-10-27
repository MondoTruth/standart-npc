<p align="center">
  <img src="assets/banner.svg" alt="standart-npc — All-in-one NPC pack for Ragnarok Offline" width="100%">
</p>

<p align="center">
  <a href="../../releases/latest"><img src="https://img.shields.io/github/v/release/MondoTruth/standart-npc?style=for-the-badge&label=latest&color=d9a233" alt="Latest release"></a>
  <a href="../../releases"><img src="https://img.shields.io/github/downloads/MondoTruth/standart-npc/total?style=for-the-badge&color=5da9e0" alt="Downloads"></a>
  <a href="https://github.com/Flux159/ragnarokoffline.app"><img src="https://img.shields.io/badge/Ragnarok%20Offline-%E2%89%A5%201.6.5-c8503f?style=for-the-badge" alt="Requires Ragnarok Offline 1.6.5 or newer"></a>
</p>

<p align="center">
  <b>Warper, Buffer, Job Master and a whole town of custom NPCs — one mod, one checkbox.</b>
</p>

<p align="center">
  <a href="#-install">📥 Install</a> &nbsp;•&nbsp;
  <a href="#settings">⚙️ Settings</a> &nbsp;•&nbsp;
  <a href="#-whats-included">🗺️ What's included</a> &nbsp;•&nbsp;
  <a href="#-credits">🏆 Credits</a> &nbsp;•&nbsp;
  <a href="#-contributing">🤝 Contributing</a>
</p>

---

## 📥 Install

In Ragnarok Offline: **Settings → Mods → Find Mods** → install **standart-npc**. Updates show up in **Settings → Mods → Updates**.

Or by hand: download the zip from the [latest release](../../releases/latest), then **Settings → Mods → Add mod from folder…** and pick the zip.

> [!IMPORTANT]
> Needs Ragnarok Offline **1.6.5 or newer**; the Warper's newest maps need **1.6.6**. On an older app you keep the version you have until you update the app.

---

<a id="settings"></a>

## ⚙️ Settings

Everything is on after install. To change it: **Settings → Mods → standart-npc → Settings…**

| What | Where in the window |
|---|---|
| 🧩 **Pick the NPCs you want** | Every NPC has its own checkbox, grouped as in the list below; a group's checkbox switches the whole group. Quick presets on top: **All on**, **Essentials** (Warper, Buffer, Premium Service Manager, Job Master, Reset Girl, Stylist), **All off**. |
| ✨ **Buffer: which buffs** | **Buffer → Choose buffs…**: tick the buffs, grouped by class, each with a short description. Presets: Default, Acolyte line, Everything, 4th class, Heal only. |
| 🌀 **Warper: fees and locked dungeons** | **Warper → Options…**: switch off the fee for 3rd/4th classes, or open the quest-locked dungeons (Bio Lab, the Culvert, Dewata Dungeon, Nidhoggur's Dungeon, Rachel Sanctuary) without the quest. |
| 🕵️ **Smuggler: banned goods** | **Smuggler → Options…**: keep him from selling cards, MVP cards, mini-boss cards, costumes, or any item IDs you list. |
| 📅 **Attendance Check: your own rewards** | **Attendance Check → Rewards…**: an item ID and amount for each of the 20 days, separately for Renewal and Pre-renewal. An empty day keeps the mod's reward. |

**Save and restart server** applies the changes right away; **Save** keeps them for the next server start. A switched-off NPC disappears from the world, but players' progress with it stays on their characters.

> [!TIP]
> Need an item ID? In game: `@iteminfo <name>`.

---

## 🗺️ What's included

#### 🧭 Travel & services

| | NPC | What it does | Location |
|:-:|---|---|---|
| 🌀 | **Warper** | Menu-based travel — towns, fields, dungeons, guild castles, instances. 3rd/4th classes pay 5,000 Zeny (15,000 for dungeons and instances); some dungeons need their quest first. Both can be switched off. On Renewal it also reaches the maps app 1.6.6 filled with monsters (Dimensional Biosphere, Jormungand Cult Temple, Zerocell Sector, Yongjirak and more). | Every major town |
| ✨ | **Buffer** | Free instant buffs + full heal on click, no dialog window. You choose the buffs ([list](#-buffer)). | Every major town |
| 📦 | **Premium Service Manager** | Save point, storage, free identify-all, and disposing of items that cannot be dropped or traded (account-bound and the like). | Prontera (160, 187) |
| 🏋️ | **Weight Maxxer** | Trades a Gym Pass for +1 permanent carry capacity, up to 10 times. Gym Pass: the Cash Shop with cash-shop-extended, the Tool Dealer (100,000 Zeny) without it. | Prontera (147, 172) |
| 📅 | **Attendance Check** | The game's own attendance window after login: one reward a day by mail, 20 days that start over. Rewards can be changed in the settings. | Window, no NPC |

#### 🎓 Character

| | NPC | What it does | Location |
|:-:|---|---|---|
| 🎓 | **Job Master** | Full job changer up to 4th class (and the Druid line — Druid, Karnos, Alitea — on app 1.6.4 or newer), including job-change equipment (Wolf Flute for Ranger, etc.). | Prontera (157, 195) |
| 🔄 | **Reset Girl** | Resets skills, stats, or both, for Zeny. | Prontera (154, 195) |
| 💇 | **Stylist** | Styling window for hair style, hair color, cloth color and, on Renewal, the 3rd class alternative outfit, paid in Zeny (prices in Settings…) or with a coupon. | Prontera (169, 180) |
| 🛡️ | **Episode Valkyrie** | Sells Episode Clear Tickets for Zeny. A ticket skips one part of an episode's main story, as on official servers: its maps, instances and daily quests open, no rewards. Parts 13.1 – 21 for now (20 and 21 with the World Sync Extras mod), in story order ([what each opens](#episode-valkyrie)). Renewal only. | Prontera (128, 193) |
| 🎭 | **Plagiarism Master** | Rogue, Stalker, Shadow Chaser and Abyss Chaser copy any skill Plagiarism can copy. The level goes up to your Plagiarism level. Shadow Chaser and Abyss Chaser can also put a 3rd class skill into their Reproduce slot (Renewal). | Prontera (171, 182) |

#### 🛒 Shops & cards

| | NPC | What it does | Location |
|:-:|---|---|---|
| 🧪 | **Tool Dealer** | Standard fixed-price shop — potions, wings, Blacksmith Blessing, and a few other staples. | Prontera (143, 178) |
| 🕵️ | **Smuggler** | Buy any item by ID, as many as you want at once. First earn his trust with a short quest, once per character (a quest bubble shows until it is done). On Renewal the price depends on item type, on Pre-renewal every item costs its normal price x2. What he won't sell is up to you (settings). | Prontera (187, 194) |
| 🃏 | **Card Exchanger** | 10 cards → Old Card Album, 30 cards → Mystical Card Album. Also pulls one card of your choice out of equipped gear. | Prontera (151, 187) |
| 🦅 | **Falcon Breeder** | Falcon for Hunters and Snipers, Wolf Flute for Rangers and Windhawks, Hawk Flute for Windhawks (Renewal only). | Prontera (128, 211) |

#### ⚔️ Hunting & dungeons

| | NPC | What it does | Location |
|:-:|---|---|---|
| 🏹 | **Bounty Hunter** | All hunting contracts in one NPC — four kinds of work, one contract of each at a time (see below). | Prontera (147, 169) |
| 🐉 | **Cheffenia Gatekeeper** | Timed access to the Cheffenia MVP Dungeon, paid in Zeny or Cash Points. | Prontera (140, 180) |

#### 🔨 Gear upgrades

| | NPC | What it does | Location |
|:-:|---|---|---|
| 📊 | **Grade Refiner** | Refines with refine tickets (the +5 to +19 Weapon and Armor Certificates, and the [ROS] tickets for level 5 weapons and level 2 armor) up to the ticket's level, with no chance of failure. Renewal: also opens the game's grading and refining windows. Pre-renewal: tickets only, +5 to +9 and +11 (the others don't exist there). | Prontera (164, 166) |
| 💎 | **Universal Enchanter** | Attach an Enchant/Class Stone (or similar item) to costume, shadow or regular gear, for free. Keeps the refine level. With cash-shop-extended: add a slot to the equipment the official slotting NPCs work on, for a Slotting Advertisement (their success chance; a failure only uses up the coupon). | Prontera (164, 169) |
| 🔥 | **Elemental Endower** | Endows your weapon with an element for an hour, works on carded weapons too. Can also remove an endow for free. Portable Elemental Converter scrolls: the Cash Shop with cash-shop-extended; without it he sells them himself (5,000z). | Prontera (147, 166) |

#### 🥊 Training

| | NPC | What it does | Location |
|:-:|---|---|---|
| 🎯 | **Training Dummies** | A training dummy for testing damage output, always there. The Dummy Master next to it sets its size, element and element level, race, DEF, MDEF and type: Normal, Boss, MVP, or (Renewal) MVP taking 90% less damage. Optional (settings, off by default): two more fixed dummies, a Medium Dummy and an MVP Dummy (Large, Boss class with MVP mode); on Renewal both have 120 DEF and MDEF and the MVP Dummy takes 90% less damage. A dummy that dies comes back after 2 seconds. | Prontera: dummy (156, 225), Dummy Master (150, 225); Medium Dummy (153, 163), MVP Dummy (158, 163) |

#### 🎁 Other

| | NPC | What it does | Location |
|:-:|---|---|---|
| 👼 | **Welcoming** | A one-time starter gift for every new character: 150,000 Zeny, a Premium Booster Box and two costumes. Renewal only. Steps aside while the mega-booster mod is on: its Booster Guide hands out the same box. | Izlude (189, 209) |

> [!NOTE]
> Lil Art's **cash-shop-extended** (Find Mods, Renewal only) adds a Cash Shop and Cash Points. With it, the Cheffenia Gatekeeper also takes Cash Points, the Smuggler charges more (so it does not undercut the shop) and the Elemental Endower points to the Cash Shop for converters. Without it, Zeny only, the Smuggler's lower prices, the Elemental Endower sells the converters and the Tool Dealer the Gym Pass.

### 🏹 Bounty Hunter

Gramps, Overlook Fisherman, Illusion Manager and Lucky John in one NPC. Each kind of work keeps its own rules and maps.

| | Work | Levels | How it works | Reward |
|:-:|---|---|---|---|
| 👴 | **Target Hunt** | 70 – 231+ (Pre-renewal: up to 125) | Pick a map, hunt its 2 monsters × 400. | EXP |
| 🎣 | **Overlook Water Dungeon** | 30 – 85 | 4 floors in order, each once. | EXP per floor; all 4 = a card of your choice |
| 🌫️ | **Illusion Dungeons** | 99+ | Pick one of 9 Illusion dungeons, hunt its 3 monsters × 150. Renewal only. | EXP |
| 🍀 | **Daily Area Purge** | 30+ | Once a day: any 500 monsters in a random area for your level. | EXP and Zeny |

All contracts, maps and rewards are one table: [`npc/when/enable_bounties/bounty_contracts.txt`](./npc/when/enable_bounties/bounty_contracts.txt).

<a id="episode-valkyrie"></a>

### 🛡️ Episode Valkyrie

One ticket per part. A part needs the one before it finished, played or skipped, except where the game itself lets you start fresh (14.1, 14.2, 15.1, 16.1). [cash-shop-extended](https://github.com/LilArt420/cashshopmod)'s Cash Shop also sells tickets 13 – 18.

| Part | Opens |
|---|---|
| 13.1 | Nydhogg's Nest |
| 13.2 | the Sapha translator ring |
| 13.3 | El Dicastes |
| 14.1 | Mora dailies |
| 14.2 | Eclage |
| 14.3 | Flame Basin, the Demon God |
| 15.1 | Verus research facilities |
| 15.2 | Last Room |
| 16.1 | Room of Consciousness |
| 16.2 | Heart Hunter War Base, Werner Laboratory, Einbech |
| 17.1 | Rekenber, Rudus, Clana Nemieri |
| 17.2 | the Mansion areas, Lost Farm, Hidden Garden |
| 18 | Villa of Deception |
| 19 | Issgard: the Ice Castle, the snake's nest, Airship Destruction, Bagot's Laboratory |
| 20 | Episode 20's dailies (needs the [World Sync Extras](https://github.com/LilArt420/world-sync-extras) mod) |
| 21 | Episode 21's dailies and memorial dungeons, base level 230 (needs the [World Sync Extras](https://github.com/LilArt420/world-sync-extras) mod) |

### ✨ Buffer

On by default: **Blessing, Increase AGI, Kyrie Eleison, Magnificat**. The full heal always comes last.

Can be switched on in **Settings… → Buffer → Choose buffs…**:

| Class | Buffs |
|---|---|
| Acolyte / Priest | Gloria, Angelus, Impositio Manus, Suffragium, Assumptio |
| Crusader | Providence |
| Bard | Poem of Bragi |
| Blacksmith | Weapon Perfection, Over Thrust |
| Soul Linker | Soul Link (matched to your class), Kaupe, Kaizel, Kaahi, Kaite |
| Arch Bishop | Expiatio, Sacrament, Renovatio |
| Sura | Gentle Touch – Revitalize, Gentle Touch – Change |
| Soul Reaper | Shadow Soul, Falcon Soul, Fairy Soul, Golem Soul |
| Cardinal | Argutus Vita, Argutus Telum, Presens Acies, Competentia, Religio, Benedictum, Mediale Votum |
| Imperial Guard | Guardian Shield |
| Elemental Master | Spell Enchanting |
| Troubadour / Trouvère | Musical Interlude, Jawaii Serenade, Pron March |
| Meister | Defense Machine |
| Soul Ascetic | Talisman of Warrior, Talisman of Magician, Talisman of Five Elements, Talisman of Protection |
| Spirit Handler | Temporary Communion |

Buffs that cancel each other in the game can't be ticked together. 3rd and 4th class buffs work on Renewal only; 4th class buffs (level 5) raise P.ATK, S.MATK, RES, MRES, C.RATE and trait stats, so they matter mostly for 4th classes.

📜 Full version history: [`CHANGELOG.md`](./CHANGELOG.md)

---

## 🏆 Credits

- 👑 **MondoTruth** — pack owner/maintainer, and just a good guy.
- 🎨 **Lil Art** — Safe Refiner, Grade Refiner, Universal Enchanter, the Daily Rewards (now Attendance Check) rewards, Welcoming, Gramps, Overlook Fisherman, the 231+ Gramps bracket, Cheffenia MVP Dungeon, Illusion Dungeon bounties, Weight Maxxer, Training Dummies, Episode Valkyrie, the Tool Dealer's Blacksmith Blessing, and the Job Master's Druid line.
- ❄️ **IceGlaive** — Lucky John, Gramps per-character progress tracking, live kill notifications, the original 3 extended Gramps level brackets (with monster IDs verified live via `@mobinfo`), the bounty penalty/abandon system, the Gramps EXP rebalance, the reduced over-level penalty, the 231+ bracket monster fix, and the shared bounty rewards file with the EXP rebalance for Gramps, Lucky John, and Illusion Manager.
- 🔥 **Nokzin** — the Elemental Endower (elemental weapon endows).
- 🎭 **iguera** — Plagiarism Master (from his arpg-equipments mod, used with permission).
- 🌍 **The Ragnarok Offline community** — bug reports and testing.
- 🤖 **Claude** (Anthropic) — AI assistant used throughout development: writing and reviewing NPC scripts, diagnosing bugs, and packaging releases.

> The 🏹 Bounty Hunter is built on the Gramps, Overlook, Illusion Manager and Lucky John work of Lil Art and IceGlaive.

---

## 🤝 Contributing

Found a bug or want to add something? [Open an issue](../../issues) or a [pull request](../../pulls) — bounty script tweaks, new NPCs, and bug fixes are all welcome.

## 📄 License

[MIT](./LICENSE) — use, change and share it freely, just keep the authors' names and the licence text.

Exception: `npc/warper.txt`, `npc/jobmaster.txt`, `npc/resetnpc.txt` and `npc/stylist.txt` are based on rAthena's custom scripts, and `pre-renewal/db/stylist.yml` on rAthena's `db/re/stylist.yml`, and stay under rAthena's [GPL-3.0](./LICENSE-GPL-3.0).
