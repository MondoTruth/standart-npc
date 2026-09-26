# standart-npc

All-in-one NPC pack for [Ragnarok Offline](https://github.com/Flux159/ragnarokoffline.app) — Warper, Buffer, Job Master, and a handful of custom NPCs, all in one mod.

## Install

1. Download the [latest release](../../releases) (or clone this repo).
2. Drop the folder into your Ragnarok Offline mods directory.
3. Settings → Mods → tick **standart-npc** → Apply.
4. Requires app version **1.3.2 or newer** — older versions don't support the individual on/off checkboxes below, and toggling them will silently do nothing.

## What's included

Warper, Job Master, Reset Girl, Stylist, and Episode Valkyrie are always on. Everything else below has its own checkbox in Settings → Mods, on by default.

| NPC | What it does | Location |
|---|---|---|
| **Warper** | Menu-based travel — towns, fields, dungeons, guild castles, instances. Duplicated in every major town. | Every major town |
| **Buffer** | Free instant heal + buffs on click, no dialog window. Blessing, Agi Up, Assumptio, Kyrie, Magnificat, Poem of Bragi, class-matched Soul Link, Kaupe, Kaizel. Duplicated in every major town. | Every major town |
| **Job Master** | Full job changer up to 4th class, including job-change equipment (Wolf Flute for Ranger, etc.). | Prontera (157, 195) |
| **Reset Girl** | Resets skills, stats, or both, for Zeny. | Prontera (154, 195) |
| **Stylist** | Hair style, hair color, cloth color changer. | Prontera (169, 180) |
| **Episode Valkyrie** | Redeems Episode Clear Tickets (Episodes 13-20), bought via the Cash Shop, for EXP and quest completion. | Prontera (128, 193) |
| **Tool Dealer** | Standard fixed-price shop — potions, wings, Blacksmith Blessing, and a few other staples. | Prontera (143, 178) |
| **Card Exchanger** | 10 cards → Old Card Album, 30 cards → Mystical Card Album. Also extracts a card out of equipped gear. | Prontera (151, 187) |
| **Kafra Employee** | Save point, storage, and free identify-all. | Prontera (160, 187) |
| **Smuggler** | Buy any item by ID, no restrictions. Detects the server era automatically: on Renewal the price depends on item type, on Pre-renewal every item costs its normal price x2. | Prontera (144, 174) |
| **Gramps** | Level-bracketed hunting bounties, 7 brackets from Lv 70 up to 231+, scaling EXP rewards. Bounties can be abandoned. | Prontera (147, 172) |
| **Lucky John** | Daily area-purge contracts — kill any 500 monsters on an assigned map. 9 level brackets from Lv 30 to 231+, one contract per day per character, can be abandoned. | Prontera (138, 172) |
| **Illusion Manager** | Bounty quests across 9 Illusion dungeons, same style as Gramps. | Prontera (147, 166) |
| **Cheffenia Gatekeeper** | Timed access to the Cheffenia MVP Dungeon, paid in Zeny or Cash Points. | Prontera (140, 180) |
| **Overlook Fisherman** | Overlook Water Dungeon — 4 floors of bounty quests, ending in a choice of card reward. | Prontera (147, 169) |
| **Safe Refiner** | Refine gear to +7 through +15 using certificates. | Prontera (164, 172) |
| **Costume Stone Enchanter** | Attach an Enchant/Class Stone (or similar item) to a costume slot, for free. | Prontera (164, 169) |
| **Master Nokzin** | Endows your weapon with an element for an hour, works on carded weapons too. Can also remove an endow for free. Portable Elemental Converter scrolls are sold in the Cash Shop instead. | Prontera (167, 178) |
| **Weight Maxxer** | Trades a Gym Pass for +1 permanent carry capacity, up to 10 times. | Prontera (164, 166) |
| **Training Dummies** | Stationary target dummies (Medium & Large) for testing damage output. | Prontera, near the fountain |

⚠ Some NPCs (Master Nokzin, Episode Valkyrie) may need the Cash Shop for full functionality.

Full version history: [`Patch Notes.txt`](./Patch%20Notes.txt).

## Credits

- **MondoTruth** — pack owner/maintainer, and the `npc/when/<setting>` support in the app itself (the PR that makes the checkboxes above work).
- **Lil Art** — Safe Refiner, Costume Stone Enchanter, Gramps, Overlook Fisherman, the 231+ Gramps bracket, Cheffenia MVP Dungeon, Illusion Dungeon bounties, Weight Maxxer, Training Dummies, Episode Valkyrie, and the Tool Dealer's Blacksmith Blessing.
- **IceGlaive** — Lucky John, Gramps per-character progress tracking, live kill notifications, the original 3 extended Gramps level brackets (with monster IDs verified live via `@mobinfo`), the bounty penalty/abandon system, the Gramps EXP rebalance, the reduced over-level penalty, the 231+ bracket monster fix, and the shared bounty rewards file with the EXP rebalance for Gramps, Lucky John, and Illusion Manager.
- **Nokzin** — Master Nokzin (elemental weapon endows).
- **The Ragnarok Offline community** — bug reports and testing.
- **Claude** (Anthropic) — AI assistant used throughout development: writing and reviewing NPC scripts, diagnosing bugs, and packaging releases.

## Contributing

Found a bug or want to add something? Open an issue or a pull request — bounty script tweaks, new NPCs, and bug fixes are all welcome.

## License

No license set yet.
