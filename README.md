# PINGAS TOWER DEFENSE

A retro 2D tower defense game in the spirit of BTD5, with classic-console
world-map looks and an all-original cast of fair-use parody characters.
Dr. Pingas holds the citadel; the hedgehog horde wants it. Deploy the
Badnik Brigade and pop everything that runs.

**Zero dependencies, zero assets** — every sprite is pixel art generated in
code at load time, all sound is synthesized WebAudio chiptune.

## Play

Open `index.html` in any modern browser, or serve the folder:

```
python3 -m http.server 8080     # then visit http://localhost:8080
```

## How it works

- **Difficulties** — Easy: 30 rounds / 200 lives / cheaper towers.
  Medium: 50 rounds / 150 lives. Hard: **67.67 rounds** / 100 lives.
- **Round 67.67** (hard only) — THE GOLDEN BLUR spawns immediately: huge,
  fast, furious. The round runs for two thirds of a normal round and the
  HUD shows a 0→1 survival bar. You don't have to kill anything — just
  don't let your lives hit zero before the bar fills.
- **Enemies** — hedgehog "speedsters" work like layers: blue → green →
  red → yellow → pink, plus shadows (spawn two pinks), metals (immune to
  sharp damage) and **gold** hedgehogs (this world's ceramic — 14 HP,
  bursts into shadows). Bosses are always gold, always bigger, always
  meaner, and scale up with the round number.
- **XP & levels** — kills and cleared rounds grant XP. Levels unlock the
  later towers (Slick lvl 2, Bomzo lvl 4, Buzzbot lvl 6, The Yolker lvl 8)
  and then each tower's **tier 4** upgrades (levels 3–11). Past that,
  level-ups pay cash.
- **Upgrades** — BTD5 rules: every tower has 2 paths × 4 tiers, you can
  buy into both paths but only one may pass tier 2.
- **Placement** — BTD5 feel: a range circle follows your cursor and turns
  red only where the tower can't go (path, water, props, other towers).

## The Badnik Brigade

| Tower | Cost | Role |
|---|---|---|
| CLUCKO | $170 | Robo-rooster; cheap rapid egg-pelter (tier 5: THE EGGSECUTIONER) |
| DRILLBERT | $360 | Drill tank; 360° drill volleys |
| SLICK | $300 | Oil-slinger; slows, then melts with acid |
| BOMZO | $650 | Walking bomb; big splash, frags, clusters |
| BUZZBOT | $800 | Laser wasp; very fast energy bolts |
| THE YOLKER | $2000 | Egg artillery; hits anything on the map |
| PINGAS FARM | $900 | Grows censored pingas chunks — hover to harvest (tier 5: PINGAS REPUBLIC) |
| PINGAS SLAVE | $350 | Auto-collects pingases in range; side-hustle income upgrades |

## Maps & extras

- **Two maps**: Desert Domain and Green Hill Gauntlet, picked from the title
  screen (which runs a live hedgehog parade behind the menu).
- **Free play**: after winning any difficulty, continue the same save up to
  **round 120** with steadily growing freeplay waves. Surviving 67.67 in
  freeplay scatters the horde and play simply continues.
- **Multiplayer**: button's there. It does nothing. Dream big.

## Controls

- **1–6** select tower · **click** place · **right-click / Esc** cancel
- **Space** start round · **F** 1x/3x speed · **S** sfx · **M** music
- Click a placed tower to open its upgrade panel (target priority: first /
  last / strong / close; sell refunds 80%).

## Dev

`dev/smoke.mjs` is a Playwright harness that boots the game headless,
places towers through the real UI, validates the upgrade-path rule and
placement blocking, plays the late rounds including the 67.67 finale, and
captures screenshots to `dev/shots/`:

```
npm install && npx playwright install chromium
node dev/smoke.mjs
```
