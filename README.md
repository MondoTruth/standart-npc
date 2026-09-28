<p align="center">
  <img src="assets/banner.svg" alt="standart-npc — All-in-one NPC pack for Ragnarok Offline" width="100%">
</p>

<p align="center">
  <a href="../../releases/latest"><img src="https://img.shields.io/github/v/release/MondoTruth/standart-npc?style=for-the-badge&label=latest&color=d9a233" alt="Latest release"></a>
  <a href="../../releases"><img src="https://img.shields.io/github/downloads/MondoTruth/standart-npc/total?style=for-the-badge&color=5da9e0" alt="Downloads"></a>
  <a href="https://github.com/Flux159/ragnarokoffline.app"><img src="https://img.shields.io/badge/Ragnarok%20Offline-%E2%89%A5%201.3.2-c8503f?style=for-the-badge" alt="Requires Ragnarok Offline 1.3.2 or newer"></a>
</p>

<p align="center">
  <b>Warper, Buffer, Job Master and a whole town of custom NPCs — one mod, one checkbox.</b>
</p>

<p align="center">
  <a href="#-install">📥 Install</a> &nbsp;•&nbsp;
  <a href="#-whats-included">🗺️ What's included</a> &nbsp;•&nbsp;
  <a href="#-credits">🏆 Credits</a> &nbsp;•&nbsp;
  <a href="#-contributing">🤝 Contributing</a>
</p>

---

## 📥 Install

1. Download the [latest release](../../releases/latest) (or clone this repo).
2. Drop the folder into your Ragnarok Offline mods directory.
3. **Settings → Mods** → tick **standart-npc** → **Apply**.

> [!IMPORTANT]
> Requires app version **1.3.4 or newer**. Older versions don't support the individual on/off checkboxes below, and toggling them will silently do nothing.

---

## Settings

On Ragnarok Offline 1.3.4 or newer, open **Settings → Mods → standart-npc → Settings…** to switch NPCs
on and off by group and restart the server from the same window. On older versions the same options
are checkboxes in the Mods tab.

---

## 🗺️ What's included

### ⭐ Always on

These are the core of the pack and can't be switched off.

| | NPC | What it does | Location |
|:-:|---|---|---|
| 🌀 | **Warper** | Menu-based travel — towns, fields, dungeons, guild castles, instances. Duplicated in every major town. | Every major town |
| 🎓 | **Job Master** | Full job changer up to 4th class, including job-change equipment (Wolf Flute for Ranger, etc.). | Prontera (157, 195) |
| 🔄 | **Reset Girl** | Resets skills, stats, or both, for Zeny. | Prontera (154, 195) |
| 💇 | **Stylist** | Hair style, hair color, cloth color changer. | Prontera (169, 180) |
| 🛡️ | **Episode Valkyrie** | Redeems Episode Clear Tickets (Episodes 13-20), bought via the Cash Shop, for EXP and quest completion. | Prontera (128, 193) |

### 🎛️ Optional — each has its own checkbox

Everything below can be turned on or off in **Settings → Mods → standart-npc**. All of them are on by default.

#### 🧰 Services

| | NPC | What it does | Location |
|:-:|---|---|---|
| ✨ | **Buffer** | Free instant heal + buffs on click, no dialog window. Blessing, Agi Up, Assumptio, Kyrie, Magnificat, Poem of Bragi, class-matched Soul Link, Kaupe, Kaizel. Duplicated in every major town. | Every major town |
| 📦 | **Kafra Employee** | Save point, storage, and free identify-all. | Prontera (160, 187) |
| 🏋️ | **Weight Maxxer** | Trades a Gym Pass for +1 permanent carry capacity, up to 10 times. | Prontera (164, 166) |
| 🎯 | **Training Dummies** | Stationary target dummies (Medium & Large) for testing damage output. | Prontera, near the fountain |

#### 🛒 Shops & cards

| | NPC | What it does | Location |
|:-:|---|---|---|
| 🧪 | **Tool Dealer** | Standard fixed-price shop — potions, wings, Blacksmith Blessing, and a few other staples. | Prontera (143, 178) |
| 🕵️ | **Smuggler** | Buy any item by ID, no restrictions. Detects the server era automatically: on Renewal the price depends on item type, on Pre-renewal every item costs its normal price x2. | Prontera (144, 174) |
| 🃏 | **Card Exchanger** | 10 cards → Old Card Album, 30 cards → Mystical Card Album. Also extracts a card out of equipped gear. | Prontera (151, 187) |

#### ⚔️ Bounties & dungeons

| | NPC | What it does | Location |
|:-:|---|---|---|
| 👴 | **Gramps** | Level-bracketed hunting bounties, 7 brackets from Lv 70 up to 231+, scaling EXP rewards. Bounties can be abandoned. | Prontera (147, 172) |
| 🍀 | **Lucky John** | Daily area-purge contracts — kill any 500 monsters on an assigned map. 9 level brackets from Lv 30 to 231+, one contract per day per character, can be abandoned. | Prontera (138, 172) |
| 🌫️ | **Illusion Manager** | Bounty quests across 9 Illusion dungeons, same style as Gramps. | Prontera (147, 166) |
| 🐉 | **Cheffenia Gatekeeper** | Timed access to the Cheffenia MVP Dungeon, paid in Zeny or Cash Points. | Prontera (140, 180) |
| 🎣 | **Overlook Fisherman** | Overlook Water Dungeon — 4 floors of bounty quests, ending in a choice of card reward. | Prontera (147, 169) |

#### 🔨 Gear upgrades

| | NPC | What it does | Location |
|:-:|---|---|---|
| ⚒️ | **Safe Refiner** | Refine gear to +7 through +15 using certificates. | Prontera (164, 172) |
| 💎 | **Costume Stone Enchanter** | Attach an Enchant/Class Stone (or similar item) to a costume slot, for free. | Prontera (164, 169) |
| 🔥 | **Master Nokzin** | Endows your weapon with an element for an hour, works on carded weapons too. Can also remove an endow for free. Portable Elemental Converter scrolls are sold in the Cash Shop instead. | Prontera (167, 178) |

> [!NOTE]
> Some NPCs (Master Nokzin, Episode Valkyrie) may need the Cash Shop for full functionality.

📜 Full version history: [`Patch Notes.txt`](./Patch%20Notes.txt)

---

## 🏆 Credits

- 👑 **MondoTruth** — pack owner/maintainer, and the `npc/when/<setting>` support in the app itself (the PR that makes the checkboxes above work).
- 🎨 **Lil Art** — Safe Refiner, Costume Stone Enchanter, Gramps, Overlook Fisherman, the 231+ Gramps bracket, Cheffenia MVP Dungeon, Illusion Dungeon bounties, Weight Maxxer, Training Dummies, Episode Valkyrie, and the Tool Dealer's Blacksmith Blessing.
- ❄️ **IceGlaive** — Lucky John, Gramps per-character progress tracking, live kill notifications, the original 3 extended Gramps level brackets (with monster IDs verified live via `@mobinfo`), the bounty penalty/abandon system, the Gramps EXP rebalance, the reduced over-level penalty, the 231+ bracket monster fix, and the shared bounty rewards file with the EXP rebalance for Gramps, Lucky John, and Illusion Manager.
- 🔥 **Nokzin** — Master Nokzin (elemental weapon endows).
- 🌍 **The Ragnarok Offline community** — bug reports and testing.
- 🤖 **Claude** (Anthropic) — AI assistant used throughout development: writing and reviewing NPC scripts, diagnosing bugs, and packaging releases.

---

## 🤝 Contributing

Found a bug or want to add something? [Open an issue](../../issues) or a [pull request](../../pulls) — bounty script tweaks, new NPCs, and bug fixes are all welcome.

## 📄 License

No license set yet.
