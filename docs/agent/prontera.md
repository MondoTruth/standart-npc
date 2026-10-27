# NPCs in Prontera

Read before placing a new NPC or moving one. Coordinates grepped from the
files on 2026-10-27 (5.0.3); the files win if this list disagrees.
Always grep all `prontera,` lines (and `monster "prontera"` calls) before
placing anything.

## Ours

| NPC | x,y | File / toggle |
|---|---|---|
| Warper | 160,192 + duplicates in towns | npc/warper.txt, npc_off `warper` |
| Buffer | 163,192 + duplicates in towns | npc_off `buffer` |
| Job Master | 157,195 | npc_off `jobmaster` |
| Reset Girl | 154,195 | npc_off `reset` |
| Stylist | 169,180 | npc_off `stylist` |
| Episode Valkyrie | 128,193 | npc_off `epvalk` |
| Falcon Breeder | 128,211 | npc_off `falcon` |
| Premium Service Manager | 160,187 | npc_off `kafra` (was Kafra Employee) |
| Weight Maxxer | 147,172 | npc_off `weightmax` |
| Plagiarism Master | 171,182 | npc_off `plagiarism` |
| Tool Dealer | 143,178 | npc_off `tooldealer` |
| Smuggler | 187,194 | npc_off `smuggler` |
| Card Exchanger | 151,187 | npc_off `cardexchanger` |
| Bounty Hunter | 147,169 | enable_bounties |
| Cheffenia Gatekeeper | 140,180 | enable_mvp |
| Grade Refiner | 164,166 | npc_off `grade` |
| Universal Enchanter | 164,169 | npc_off `enchanter` |
| Elemental Endower | 147,166 | npc_off `nokzin` |
| Training Dummy / Dummy Master | 156,225 / 150,225 | enable_dummies |
| Medium Dummy / MVP Dummy | 153,163 / 158,163 | enable_dummies + dummy_pair (off by default) |

## Other mods and the app (app 1.4.6+)

- **prontera-vendors** (BlaXun): random stalls in columns x=147 and x=164
  (y 52-111, ~135-173), buyers at x=140 and x=171 (y 136-172) and rows
  y=110 / y=125 (x 104-135). From app 1.4.8 stalls keep 3 cells from any
  NPC; on older apps a stall can land on one of ours.
- **Companion Recruiter** (app): two cells east of each town's healer
  (`prontera,164,193`, next to our Buffer), only when Companions are
  "Hired from a Companion Recruiter".
- **card-remover** (BlaXun, app 1.4.8): `prontera,182,216`, also geffen
  115,73, alberta 104,61, morocc 155,64, payon 166,99, izlude 119,157,
  aldebaran 160,100. Overlaps our Card Exchanger's extraction (#41).
