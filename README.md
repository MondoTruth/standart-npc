# standart-npc

<!-- badges: start -->
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/MondoTruth/standart-npc?logo=github&sort=semver)](https://github.com/MondoTruth/standart-npc/releases/latest)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/MondoTruth/standart-npc)](https://github.com/MondoTruth/standart-npc/commits/main)
[![License](https://img.shields.io/github/license/MondoTruth/standart-npc)](LICENSE)
<!-- badges: end -->

**NOTE: This mod requires `app` v1.5.2+ to run.** It does not work in the older app.

<!-- toc -->

- [What this does](#what-this-does)
- [Usage](#usage)
- [Bounty Hunter](#bounty-hunter)
- [Daily Rewards](#daily-rewards)
- [MVP Dungeon](#mvp-dungeon)
- [Welcome Gift](#welcome-gift)
- [Old man who asks you to killrats](#old-man-who-asks-you-to-killrats)
- [FAQ](#faq)
  - [Q. How often can I claim Daily Rewards?](#q-how-often-can-i-claim-daily-rewards)
  - [Q. Can the MVP dungeon clear be shared across characters?](#q-can-the-mvp-dungeon-clear-be-shared-across-characters)
  - [Q. Can the MVP dungeon progress be shared across characters?](#q-can-the-mvp-dungeon-progress-be-shared-across-characters)
  - [Q. Why do daily reward streaks reset when I transfer to a different server?](#q-why-do-daily-reward-streaks-reset-when-i-transfer-to-a-different-server)
  - [Q. How are killcounts tracked?](#q-how-are-killcounts-tracked)
  - [Q. How are contract records stored?](#q-how-are-contract-records-stored)

<!-- tocstop -->

## What this does

This NPC mod is a combination of several NPCs. The primary focus is on Daily Rewards and the MVP Dungeon.

This mod is inspired by [MysteryGift](https://github.com/rathena/MysteryGift), but improved with additional features.

If you want an old-style NPC with just one feature, consider using one of [the standalone NPC repositories](https://github.com/search?q=topic%3Anpc-mod&type=repositories).

## Usage

1. Make sure you have the required dependencies installed.
2. Run `npm run build` to compile the NPC.
3. Copy the compiled files to your Ragnarok Online server's `npc/` directory.
4. Restart the server.

## Bounty Hunter

The Bounty Hunter feature allows players to accept bounties on specific monsters and earn rewards for killing them.

## Daily Rewards

The Daily Rewards feature gives players a reward once per day. The reward can vary depending on the day of the week or special events.

## MVP Dungeon

The MVP Dungeon feature allows players to challenge MVP monsters in a special dungeon. Clearing the dungeon earns rewards and progresses through the dungeon floors.

## Welcome Gift

The Welcome Gift feature gives new players a one-time gift when they first talk to the NPC.

## Old man who asks you to killrats

This NPC asks players to kill a certain number of rats as a quest.

## FAQ

### Q. How often can I claim Daily Rewards?

You can claim the Daily Rewards **once every 24 hours**. The cooldown is tracked per account.

### Q. Can the MVP dungeon clear be shared across characters?

No. The MVP dungeon clear status is tracked **per character**. Each character must clear the dungeon individually.

### Q. Can the MVP dungeon progress be shared across characters?

Yes. The MVP dungeon progress (which floors have been completed) is tracked **per account**, so all characters on the same account share the same progress.

### Q. Why do daily reward streaks reset when I transfer to a different server?

Daily reward streaks are tracked **per server**. When you transfer to a different server, your streak will reset because the data is not shared across servers.

### Q. How are killcounts tracked?

Killcounts are tracked **per character** using the character's unique ID. This ensures that each character's progress is independent.

### Q. How are contract records stored?

Contract records (for the Bounty Hunter feature) are stored **per character** in the database. This allows each character to have their own set of contracts.
