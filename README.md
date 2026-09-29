# standart-npc

All-in-one NPC pack for [Ragnarok Offline](https://github.com/Flux159/ragnarokoffline.app).
One mod instead of many: warper, buffer, job changer, hunting contracts, shops and services.

**Current version: 4.7.0** · needs Ragnarok Offline **1.3.4 or newer**

## Install

1. Download `standart-npc-4_7_0.zip` from the latest release.
2. In Ragnarok Offline open **Settings → Mods** and install the zip.
3. Tick **standart-npc** to turn it on. This turns on every NPC in the pack.
4. Optional: press **Settings…** next to the mod to switch single NPCs off or choose the Buffer's buffs.
5. Restart the server (the settings window has a button for it).

> ⚠ Some NPCs are built around items from the Cash Shop (Episode Clear Tickets, refine certificates, Gym Pass and so on).

## Settings window

**Settings → Mods → standart-npc → Settings…**

- Every NPC has its own checkbox, grouped: Travel and services, Character, Shops, Hunting quests, Dungeons, Equipment, Training.
- A group's checkbox switches the whole group; groups can be folded.
- **Buffer → Choose buffs…** opens the list of buffs by class, each with a short description.
- **Save** keeps the changes for the next server start, **Save and restart server** applies them right away.

## NPCs

| NPC | Where | What it does | Author |
|---|---|---|---|
| Warper | every major town, Prontera (160,192) | Teleports to towns, fields and dungeons | MondoTruth |
| Buffer | every major town, Prontera (163,192) | Free buffs of your choice + full heal | MondoTruth, Claude |
| Job Master | Prontera (157,195) | Job changes up to 4th class | MondoTruth |
| Reset Girl | Prontera (154,195) | Resets skills, stats, or both | MondoTruth |
| Stylist | Prontera (169,180) | Hair style, hair color, cloth color | Euphy (base script), Claude |
| Episode Valkyrie | Prontera (128,193) | Redeems Episode Clear Tickets from the Cash Shop | Lil Art |
| Kafra Employee | Prontera (160,187) | Save point, storage, free identify | MondoTruth |
| Weight Maxxer | Prontera (164,166) | Gym Pass → +1 permanent carry capacity, up to 10 times | Lil Art |
| Tool Dealer | Prontera (143,178) | Fixed-price shop | MondoTruth, Lil Art |
| Smuggler | Prontera (144,174) | Any item by ID, any amount | MondoTruth |
| Card Exchanger | Prontera (151,187) | Cards → card albums, card removal | MondoTruth |
| **Bounty Hunter** | Prontera (147,172) | Hunting contracts, see below | MondoTruth, Claude — on the work of Lil Art and IceGlaive |
| Cheffenia Gatekeeper | Prontera (140,180) | Timed MVP dungeon, Zeny or Cash Points | Lil Art |
| Safe Refiner | Prontera (164,172) | +7 to +15 with certificates | Lil Art |
| Costume Stone Enchanter | Prontera (164,169) | Puts an Enchant/Class Stone on a costume slot | Lil Art |
| Master Nokzin | Prontera (167,178) | Elemental weapon endow for an hour | Nokzin |
| Training Dummies | Prontera (153–158,163) | Target dummies for testing damage | Lil Art |

### Bounty Hunter

One NPC with four kinds of work. You can hold one contract of each kind at the same time.

| Work | Levels | How it works | Reward |
|---|---|---|---|
| Target Hunt | 70 – 231+ | Pick a map, hunt its 2 monsters × 400 | EXP |
| Overlook Water Dungeon | 30 – 85 | 4 floors in order, each once | EXP per floor; all 4 = one card of your choice |
| Illusion Dungeons | 99+ | Pick one of 9 dungeons, hunt its 3 monsters × 150 | EXP |
| Daily Area Purge | 30+ | Once a day: any 500 monsters in a random area for your level | EXP and Zeny |

Contracts, maps and rewards are one table: `npc/when/enable_bounties/bounty_contracts.txt`.
Adding a map is one line there plus its monster spawns in `bounty_mobs.txt`.

### Buffer

Choose the buffs in the settings window. On by default: Blessing, Increase AGI, Kyrie Eleison, Magnificat.
Also available: Gloria, Angelus, Impositio Manus, Suffragium, Assumptio, Providence, Weapon Perfection, Over Thrust,
Poem of Bragi, Soul Link (for your class), Kaupe, Kaizel, Kaahi, Kaite, Expiatio, Sacrament, Renovatio,
Gentle Touch – Revitalize / Change, and the Soul Reaper souls (Shadow, Falcon, Fairy, Golem).
Buffs that cancel each other in the game can't be ticked together. The full heal always comes last.

## For modders

```
standart-npc/
  mod.json                 name, version, settings
  Patch Notes.txt          full history
  settings/index.html      the settings window
  db/prontera_dummies.yml  training dummy monsters
  npc/                     always loaded: Warper, Job Master, Reset Girl, Stylist, Episode Valkyrie
    custom/snpc_settings.txt   on/off switch for the always-loaded NPCs
  npc/when/<setting>/      loaded only while that setting is on
```

Every script starts with a **How to customize** block that says what to change and where.

## Credits

- **MondoTruth** — owner and maintainer
- **Lil Art** — Gramps, Overlook, Illusion Manager, Cheffenia MVP Dungeon, Safe Refiner, Costume Stone Enchanter, Weight Maxxer, Episode Valkyrie, Training Dummies
- **IceGlaive** — Lucky John, shared rewards and EXP balance
- **Nokzin** — Master Nokzin
- **Euphy** — base Stylist script
- **Claude** (Anthropic) — scripting help
- the Ragnarok Offline community

Full history: `Patch Notes.txt` inside the mod.
