/* ===== PINGAS TD — the Badnik Brigade (towers) =====
 * BTD5-style upgrades: 2 paths x 4 tiers. You can buy into both paths,
 * but only one path may go past tier 2. Tier 4 needs player level.
 */
"use strict";

const Towers = (() => {

  // global balance: every tower attacks 15% faster
  const SPEED_BUFF = 1.15;

  const TYPES = {
    clucko: {
      id: "clucko", name: "CLUCKO", art: "clucko",
      desc: "Robo-rooster. Pelts the path with eggs.",
      cost: 170, radius: 19, unlockLevel: 1, t4Level: 3, t5Level: 14,
      base: { kind: "bullet", dmg: 1, pierce: 1, cooldown: 0.85, range: 115, projSpeed: 430, projCount: 1, spread: 0.18, dmgType: "sharp", projStyle: "egg", sfx: "shoot" },
      paths: [
        { title: "PECKING POWER", ups: [
          { name: "Sharp Shells",     cost: 90,   desc: "Eggs hit +1 enemy.",            fx: s => s.pierce += 1 },
          { name: "Rapid Peck",       cost: 170,  desc: "Pecks 35% faster.",             fx: s => s.cooldown *= 0.72 },
          { name: "Triple Yolk",      cost: 400,  desc: "Throws 3 eggs in a spread.",    fx: s => { s.projCount = 3; s.spread = 0.3; } },
          { name: "Gatling Gizzard",  cost: 1500, desc: "Egg minigun! +1 dmg, way faster.", fx: s => { s.cooldown *= 0.45; s.dmg += 1; } },
          { name: "THE EGGSECUTIONER", cost: 9000, desc: "T5: +3 dmg, 2x speed, +3 pierce, eggs detonate.", fx: s => { s.dmg += 3; s.cooldown *= 0.5; s.pierce += 3; s.aoe = Math.max(s.aoe, 45); s.dmgType = "explosive"; } },
        ]},
        { title: "BIRD BRAINS", ups: [
          { name: "Eagle Eye",        cost: 100,  desc: "+30 range.",                    fx: s => s.range += 30 },
          { name: "Hardboiled",       cost: 160,  desc: "Cracks METAL hedgehogs. +1 pierce.", fx: s => { s.metalPop = true; s.pierce += 1; } },
          { name: "Eggsplosive Yolks",cost: 450,  desc: "Eggs burst in a small blast.",  fx: s => { s.aoe = Math.max(s.aoe, 32); s.dmgType = "explosive"; } },
          { name: "Cluck of Doom",    cost: 1700, desc: "Huge blasts, +2 dmg.",          fx: s => { s.aoe = Math.max(s.aoe, 58); s.dmg += 2; } },
          { name: "NUCLEAR NUGGET",   cost: 12000, desc: "T5: +4 dmg, massive blasts that stun.", fx: s => { s.dmg += 4; s.aoe = Math.max(s.aoe, 95); s.stun = Math.max(s.stun, 0.4); } },
        ]},
        { title: "COOP COMMAND", ups: [
          { name: "Speedy Spurs",     cost: 120,  desc: "Pecks 15% faster.",             fx: s => s.cooldown *= 0.85 },
          { name: "Keen Talons",      cost: 280,  desc: "+1 damage.",                    fx: s => s.dmg += 1 },
          { name: "Free Range",       cost: 700,  desc: "+40 range, +1 pierce.",         fx: s => { s.range += 40; s.pierce += 1; } },
          { name: "Alpha Rooster",    cost: 2200, desc: "+1 dmg, 30% faster.",           fx: s => { s.dmg += 1; s.cooldown *= 0.7; } },
        ]},
      ],
    },

    drillbert: {
      id: "drillbert", name: "DRILLBERT", art: "drillbert",
      desc: "Dim but loyal drill tank. Sprays drills all around.",
      cost: 360, radius: 20, unlockLevel: 1, t4Level: 5,
      base: { kind: "radial", dmg: 1, pierce: 1, cooldown: 1.25, range: 80, projSpeed: 340, projCount: 8, dmgType: "sharp", projStyle: "drill", sfx: "thump" },
      paths: [
        { title: "SPIN CYCLE", ups: [
          { name: "Faster Spinning",  cost: 120,  desc: "Fires 25% faster.",             fx: s => s.cooldown *= 0.75 },
          { name: "Overdrive",        cost: 210,  desc: "Fires 30% faster again.",       fx: s => s.cooldown *= 0.7 },
          { name: "Drill Storm",      cost: 550,  desc: "12 drills per volley.",         fx: s => s.projCount = 12 },
          { name: "Tornado of Terror",cost: 1800, desc: "16 drills, +1 dmg, even faster.", fx: s => { s.projCount = 16; s.dmg += 1; s.cooldown *= 0.75; } },
        ]},
        { title: "HEAVY MACHINERY", ups: [
          { name: "Long Drills",      cost: 110,  desc: "+22 range.",                    fx: s => s.range += 22 },
          { name: "Diamond Tips",     cost: 260,  desc: "Pops METAL. +1 pierce.",        fx: s => { s.metalPop = true; s.pierce += 1; } },
          { name: "Red Hot Bits",     cost: 600,  desc: "+1 damage per drill.",          fx: s => s.dmg += 1 },
          { name: "Seismic Slam",     cost: 2000, desc: "Quakes every 2.5s: 4 dmg + stun in range.", fx: s => s.quake = { interval: 2.5, dmg: 4, stun: 1 } },
        ]},
        { title: "TUNNEL VISION", ups: [
          { name: "Grease Job",       cost: 130,  desc: "Fires 15% faster.",             fx: s => s.cooldown *= 0.85 },
          { name: "Wide Treads",      cost: 280,  desc: "+25 range.",                    fx: s => s.range += 25 },
          { name: "Carbide Drills",   cost: 650,  desc: "+1 pierce, faster drills.",     fx: s => { s.pierce += 1; s.projSpeed += 120; } },
          { name: "Mole Patrol",      cost: 2300, desc: "+1 dmg, +1 pierce, 20% faster.", fx: s => { s.dmg += 1; s.pierce += 1; s.cooldown *= 0.8; } },
        ]},
      ],
    },

    slick: {
      id: "slick", name: "SLICK", art: "slick",
      desc: "Oil-slinging serpent bot. Gums up the fast ones.",
      cost: 300, radius: 19, unlockLevel: 2, t4Level: 7,
      base: { kind: "bullet", dmg: 0, pierce: 1, cooldown: 1.1, range: 105, projSpeed: 380, projCount: 1, dmgType: "goo", projStyle: "goo", sfx: "thump",
              slow: { factor: 0.6, duration: 3 } },
      paths: [
        { title: "STICKY BUSINESS", ups: [
          { name: "Thicker Oil",      cost: 130,  desc: "Slows to 45% speed.",           fx: s => s.slow.factor = 0.45 },
          { name: "Long-Lasting Goo", cost: 180,  desc: "Slow lasts 5s.",                fx: s => s.slow.duration = 5 },
          { name: "Oil Spill",        cost: 480,  desc: "Goo splashes a whole area.",    fx: s => s.aoe = Math.max(s.aoe, 46) },
          { name: "Superglue",        cost: 1600, desc: "Targets stick fast (0.8s), then crawl at 35%.", fx: s => { s.stun = Math.max(s.stun, 0.8); s.slow.factor = 0.35; s.slow.duration = 6; } },
        ]},
        { title: "TOXIC SLUDGE", ups: [
          { name: "Acid Mix",         cost: 170,  desc: "Goo burns: 1 dmg per 1.2s.",    fx: s => s.dot = { dmg: 1, interval: 1.2, duration: 4 } },
          { name: "Quick Squirter",   cost: 200,  desc: "Fires 30% faster.",             fx: s => s.cooldown *= 0.7 },
          { name: "Corrosive Crude",  cost: 550,  desc: "1 dmg per 0.5s. Melts METAL.",  fx: s => s.dot = { dmg: 1, interval: 0.5, duration: 4, metalPop: true } },
          { name: "Total Meltdown",   cost: 1700, desc: "2 dmg per 0.4s, +2 pierce.",    fx: s => { s.dot = { dmg: 2, interval: 0.4, duration: 4, metalPop: true }; s.pierce += 2; } },
        ]},
        { title: "SLIPPERY BUSINESS", ups: [
          { name: "Extra Nozzle",     cost: 150,  desc: "Squirts 15% faster.",           fx: s => s.cooldown *= 0.85 },
          { name: "Pressure Pump",    cost: 300,  desc: "+25 range, faster globs.",      fx: s => { s.range += 25; s.projSpeed += 120; } },
          { name: "Double Glob",      cost: 700,  desc: "Fires 2 globs.",                fx: s => { s.projCount = 2; s.spread = 0.22; } },
          { name: "Oil Tycoon",       cost: 2000, desc: "Stickier (+5% slow), +1 pierce, 20% faster.", fx: s => { s.slow.factor = Math.max(0.2, s.slow.factor - 0.05); s.pierce += 1; s.cooldown *= 0.8; } },
        ]},
      ],
    },

    bomzo: {
      id: "bomzo", name: "BOMZO", art: "bomzo",
      desc: "Walking bomb with a grudge. Big splash damage.",
      cost: 650, radius: 21, unlockLevel: 4, t4Level: 9,
      base: { kind: "lob", dmg: 1, pierce: 99, cooldown: 1.5, range: 135, projSpeed: 280, projCount: 1, aoe: 45, dmgType: "explosive", projStyle: "bomb", sfx: "thump" },
      paths: [
        { title: "BIGGER BOOMS", ups: [
          { name: "Heavy Shells",     cost: 250,  desc: "Bigger blast radius.",          fx: s => s.aoe = Math.max(s.aoe, 62) },
          { name: "High Yield",       cost: 420,  desc: "+1 damage.",                    fx: s => s.dmg += 1 },
          { name: "Rocket Eggs",      cost: 900,  desc: "Fires 40% faster.",             fx: s => { s.cooldown *= 0.6; s.projSpeed = 420; } },
          { name: "Egg-pocalypse",    cost: 3000, desc: "+2 dmg, massive blasts, faster.", fx: s => { s.dmg += 2; s.aoe = Math.max(s.aoe, 88); s.cooldown *= 0.75; } },
        ]},
        { title: "SHRAPNEL CITY", ups: [
          { name: "Frag Shells",      cost: 300,  desc: "Blasts release 8 frags.",       fx: s => s.frags = 8 },
          { name: "Concussion",       cost: 450,  desc: "Blasts stun 0.4s.",             fx: s => s.stun = Math.max(s.stun, 0.4) },
          { name: "Cluster Eggs",     cost: 1000, desc: "Spawns 4 mini-bombs.",          fx: s => s.cluster = 4 },
          { name: "Gilded Crusher",   cost: 3200, desc: "+5 dmg vs GOLD & bosses. 14 frags.", fx: s => { s.goldBonus = (s.goldBonus || 0) + 5; s.frags = 14; } },
        ]},
        { title: "DEMOLITION CREW", ups: [
          { name: "Light Shells",     cost: 200,  desc: "Lobs 15% faster.",              fx: s => s.cooldown *= 0.85 },
          { name: "Long Lob",         cost: 350,  desc: "+30 range.",                    fx: s => s.range += 30 },
          { name: "Twin Tubes",       cost: 900,  desc: "Lobs 2 bombs.",                 fx: s => s.projCount = 2 },
          { name: "Big Red Button",   cost: 2800, desc: "+1 dmg, bigger blasts, 20% faster.", fx: s => { s.dmg += 1; s.aoe += 15; s.cooldown *= 0.8; } },
        ]},
      ],
    },

    buzzbot: {
      id: "buzzbot", name: "BUZZBOT", art: "buzzbot",
      desc: "Laser wasp. Zap zap zap zap zap.",
      cost: 800, radius: 19, unlockLevel: 6, t4Level: 10,
      base: { kind: "bullet", dmg: 1, pierce: 2, cooldown: 0.35, range: 140, projSpeed: 580, projCount: 1, spread: 0.1, dmgType: "energy", projStyle: "zap", sfx: "laser" },
      paths: [
        { title: "MORE DAKKA", ups: [
          { name: "Focus Coil",       cost: 300,  desc: "+1 damage.",                    fx: s => s.dmg += 1 },
          { name: "Overclock",        cost: 550,  desc: "Fires 30% faster.",             fx: s => s.cooldown *= 0.7 },
          { name: "Twin Stingers",    cost: 1200, desc: "Fires 2 bolts.",                fx: s => { s.projCount = 2; s.spread = 0.16; } },
          { name: "Hyper Swarm",      cost: 3400, desc: "Double fire rate, +1 pierce.",  fx: s => { s.cooldown *= 0.5; s.pierce += 1; } },
        ]},
        { title: "BIG SCIENCE", ups: [
          { name: "Wide Lens",        cost: 260,  desc: "+35 range.",                    fx: s => s.range += 35 },
          { name: "Pierce Beam",      cost: 520,  desc: "+2 pierce.",                    fx: s => s.pierce += 2 },
          { name: "Static Field",     cost: 1100, desc: "Hits arc to 2 nearby enemies.", fx: s => s.chain = 2 },
          { name: "DEATH RAY",        cost: 3600, desc: "+4 dmg, +60 range.",            fx: s => { s.dmg += 4; s.range += 60; } },
        ]},
        { title: "SWARM PROTOCOL", ups: [
          { name: "Aero Frame",       cost: 250,  desc: "Fires 12% faster.",             fx: s => s.cooldown *= 0.88 },
          { name: "Compound Eyes",    cost: 450,  desc: "+30 range.",                    fx: s => s.range += 30 },
          { name: "Stinger Mk II",    cost: 950,  desc: "+1 pierce, faster bolts.",      fx: s => { s.pierce += 1; s.projSpeed += 160; } },
          { name: "Queen's Guard",    cost: 2600, desc: "+1 dmg, 20% faster.",           fx: s => { s.dmg += 1; s.cooldown *= 0.8; } },
        ]},
      ],
    },

    yolker: {
      id: "yolker", name: "THE YOLKER", art: "yolker",
      desc: "Egg artillery. Hits anything, anywhere on the map.",
      cost: 2000, radius: 22, unlockLevel: 8, t4Level: 11, t5Level: 16,
      base: { kind: "ray", dmg: 10, pierce: 1, cooldown: 2.0, range: 4000, projCount: 1, aoe: 26, dmgType: "explosive", sfx: "boom", defaultTarget: "strong" },
      paths: [
        { title: "ARTILLERY SCHOOL", ups: [
          { name: "AP Yolks",         cost: 650,  desc: "+8 damage.",                    fx: s => s.dmg += 8 },
          { name: "Rapid Loader",     cost: 950,  desc: "Reloads 30% faster.",           fx: s => s.cooldown *= 0.7 },
          { name: "Devastator",       cost: 2000, desc: "+14 dmg, bigger splash.",       fx: s => { s.dmg += 14; s.aoe = Math.max(s.aoe, 48); } },
          { name: "PINGAS PARTICLE BEAM", cost: 5500, desc: "+45 dmg of pure science.",  fx: s => { s.dmg += 45; s.cooldown *= 0.8; } },
          { name: "THE OMELETTE PROTOCOL", cost: 22000, desc: "T5: +120 dmg, huge splash, faster. Goodbye.", fx: s => { s.dmg += 120; s.aoe = Math.max(s.aoe, 70); s.cooldown *= 0.7; } },
        ]},
        { title: "EGGSPLOSIVES", ups: [
          { name: "Wide Shells",      cost: 700,  desc: "Big splash radius.",            fx: s => s.aoe = Math.max(s.aoe, 64) },
          { name: "Stun Shells",      cost: 1100, desc: "Shots stun 1s.",                fx: s => s.stun = Math.max(s.stun, 1) },
          { name: "Double Barrel",    cost: 2400, desc: "Fires a second shot.",          fx: s => s.doubleShot = true },
          { name: "GOLD STANDARD",    cost: 6000, desc: "x2 damage vs GOLD & bosses.",   fx: s => s.goldMult = 2 },
        ]},
        { title: "LOGISTICS", ups: [
          { name: "Fast Crane",       cost: 500,  desc: "Reloads 12% faster.",           fx: s => s.cooldown *= 0.88 },
          { name: "Heavy Yolks",      cost: 800,  desc: "+6 damage.",                    fx: s => s.dmg += 6 },
          { name: "Shockwave Shells", cost: 1600, desc: "Bigger splash, 0.3s stun.",     fx: s => { s.aoe += 20; s.stun = Math.max(s.stun, 0.3); } },
          { name: "Artillery Network",cost: 4500, desc: "+10 dmg, 25% faster.",          fx: s => { s.dmg += 10; s.cooldown *= 0.75; } },
        ]},
      ],
    },

    farm: {
      id: "farm", name: "PINGAS FARM", art: "farm",
      desc: "Grows pingases. Hover to harvest. Don't ask questions.",
      cost: 900, radius: 22, unlockLevel: 3, t4Level: 13, t5Level: 15,
      base: { kind: "farm", dmg: 0, pierce: 0, cooldown: 1, range: 60, projCount: 0, dmgType: "none", sfx: "thump",
              farmCount: 4, farmValue: 45 },
      paths: [
        { title: "MASS PRODUCTION", ups: [
          { name: "Extra Crop",       cost: 350,  desc: "+2 pingases per round.",        fx: s => s.farmCount += 2 },
          { name: "Fertile Soil",     cost: 500,  desc: "+3 pingases per round.",        fx: s => s.farmCount += 3 },
          { name: "Pingas Plantation",cost: 1400, desc: "+6 pingases per round.",        fx: s => s.farmCount += 6 },
          { name: "Pingas Factory",   cost: 3000, desc: "+5 pingases, each worth +$30.", fx: s => { s.farmCount += 5; s.farmValue += 30; } },
          { name: "PINGAS REPUBLIC",  cost: 12000, desc: "T5: 30 huge pingases worth $120 each.", fx: s => { s.farmCount = 30; s.farmValue = Math.max(s.farmValue, 120); } },
        ]},
        { title: "AGRI-BUSINESS", ups: [
          { name: "Riper Pingases",   cost: 300,  desc: "Each worth +$15.",              fx: s => s.farmValue += 15 },
          { name: "Golden Skin",      cost: 700,  desc: "Each worth +$22.",              fx: s => s.farmValue += 22 },
          { name: "Auto-Chute",       cost: 1800, desc: "Uncollected pingases bank at round end.", fx: s => s.autoChute = true },
          { name: "Pingas Bank",      cost: 4000, desc: "+$38 value, +$300 interest per round.", fx: s => { s.farmValue += 38; s.roundBonus += 300; } },
        ]},
        { title: "FARMHANDS", ups: [
          { name: "Scarecrow",        cost: 250,  desc: "+1 pingas per round.",          fx: s => s.farmCount += 1 },
          { name: "Irrigation",       cost: 450,  desc: "+2 pingases per round.",        fx: s => s.farmCount += 2 },
          { name: "Harvest Drone",    cost: 1200, desc: "+3 pingases, each worth +$10.", fx: s => { s.farmCount += 3; s.farmValue += 10; } },
          { name: "Co-op Co-op",      cost: 2600, desc: "+$25 value, +$150 interest per round.", fx: s => { s.farmValue += 25; s.roundBonus += 150; } },
        ]},
      ],
    },

    slave: {
      id: "slave", name: "PINGAS SLAVE", art: "slave",
      desc: "Collects pingases so you don't have to look at them.",
      cost: 350, radius: 17, unlockLevel: 3, t4Level: 12,
      base: { kind: "slave", dmg: 0, pierce: 0, cooldown: 0.25, range: 110, projCount: 0, dmgType: "none", sfx: "thump",
              valueMul: 1 },
      paths: [
        { title: "WORK ETHIC", ups: [
          { name: "Long Arms",        cost: 200,  desc: "+45 collect range.",            fx: s => s.range += 45 },
          { name: "Roller Feet",      cost: 300,  desc: "+55 collect range.",            fx: s => s.range += 55 },
          { name: "Pingas Polish",    cost: 800,  desc: "Collected pingases +25% value.", fx: s => s.valueMul += 0.25 },
          { name: "Employee of the Month", cost: 2200, desc: "+35% value, +$150 per round.", fx: s => { s.valueMul += 0.35; s.roundBonus += 150; } },
        ]},
        { title: "SIDE HUSTLE", ups: [
          { name: "Tip Jar",          cost: 250,  desc: "+$30 every round.",             fx: s => s.roundBonus += 30 },
          { name: "Lemonade Stand",   cost: 500,  desc: "+$60 every round.",             fx: s => s.roundBonus += 60 },
          { name: "Pingas Resale",    cost: 1200, desc: "+$150 every round.",            fx: s => s.roundBonus += 150 },
          { name: "Questionable Crypto", cost: 3000, desc: "+$400 every round. Trust me.", fx: s => s.roundBonus += 400 },
        ]},
        { title: "OVERTIME", ups: [
          { name: "Coffee",           cost: 150,  desc: "Collects 40% faster.",          fx: s => s.cooldown *= 0.6 },
          { name: "Second Sack",      cost: 350,  desc: "+35 collect range.",            fx: s => s.range += 35 },
          { name: "Forklift Certified", cost: 900, desc: "Collected pingases +20% value.", fx: s => s.valueMul += 0.2 },
          { name: "Middle Management", cost: 2000, desc: "+15% value, +$250 per round.", fx: s => { s.valueMul += 0.15; s.roundBonus += 250; } },
        ]},
      ],
    },
  };

  const ORDER = ["clucko", "drillbert", "slick", "bomzo", "buzzbot", "yolker", "farm", "slave"];
  const TARGET_MODES = ["first", "last", "strong", "close"];

  let nextId = 1;

  class Tower {
    constructor(typeId, x, y, priceMul) {
      this.id = nextId++;
      this.def = TYPES[typeId];
      this.x = x; this.y = y;
      this.radius = this.def.radius;
      this.priceMul = priceMul;
      this.tiers = this.def.paths.map(() => 0);  // owned tiers per path
      this.spent = Math.round(this.def.cost * priceMul);
      this.targetMode = this.def.base.defaultTarget || "first";
      this.cd = 0;
      this.quakeCd = 0;
      this.prodCd = 2;                       // farm: time to first pingas
      this.flash = 0;                        // muzzle flash timer
      this.aimX = x + 1; this.aimY = y;
      this.recompute();
    }

    recompute() {
      const b = this.def.base;
      const s = {
        kind: b.kind, dmg: b.dmg, pierce: b.pierce, cooldown: b.cooldown,
        range: b.range, projSpeed: b.projSpeed || 0, projCount: b.projCount,
        spread: b.spread || 0, aoe: b.aoe || 0, dmgType: b.dmgType,
        projStyle: b.projStyle, sfx: b.sfx, metalPop: b.dmgType !== "sharp",
        slow: b.slow ? { factor: b.slow.factor, duration: b.slow.duration } : null,
        dot: null, stun: 0, frags: 0, cluster: 0, chain: 0,
        goldBonus: 0, goldMult: 1, doubleShot: false, quake: null,
        farmCount: b.farmCount || 0, farmValue: b.farmValue || 0,
        autoChute: false, valueMul: b.valueMul || 1, roundBonus: 0,
      };
      for (let p = 0; p < this.def.paths.length; p++) {
        for (let t = 0; t < this.tiers[p]; t++) {
          this.def.paths[p].ups[t].fx(s);
        }
      }
      s.cooldown /= SPEED_BUFF;
      this.stats = s;
    }

    upgradeCost(path) {
      const ups = this.def.paths[path].ups;
      const tier = this.tiers[path];
      if (tier >= ups.length) return null;
      return Math.round(ups[tier].cost * this.priceMul);
    }

    // BTD-style crosspathing: upgrades in at most 2 of the 3 paths,
    // and only one path may go past tier 2. Tier 4/5 need player level.
    canUpgrade(path, playerLevel) {
      const ups = this.def.paths[path].ups;
      const tier = this.tiers[path];
      if (tier >= ups.length) return { ok: false, reason: "MAXED" };
      const others = this.tiers.filter((_, i) => i !== path);
      if (tier === 0 && others.filter(t => t > 0).length >= 2) return { ok: false, reason: "2 PATHS MAX" };
      if (tier + 1 > 2 && others.some(t => t > 2)) return { ok: false, reason: "ONE PATH ONLY" };
      if (tier === 3 && playerLevel < this.def.t4Level) return { ok: false, reason: `NEEDS LVL ${this.def.t4Level}` };
      if (tier === 4 && playerLevel < (this.def.t5Level || 99)) return { ok: false, reason: `NEEDS LVL ${this.def.t5Level}` };
      return { ok: true };
    }

    buyUpgrade(path) {
      this.spent += this.upgradeCost(path);
      this.tiers[path]++;
      this.recompute();
    }

    sellValue() { return Math.round(this.spent * 0.8); }

    pickTarget(enemies) {
      let best = null, bestVal = null;
      const r2 = this.stats.range * this.stats.range;
      for (const e of enemies) {
        if (e.dead) continue;
        const dx = e.x - this.x, dy = e.y - this.y;
        if (dx * dx + dy * dy > r2) continue;
        let val;
        switch (this.targetMode) {
          case "last":   val = -e.dist; break;
          case "strong": val = e.hp * 1e7 + e.dist; break;
          case "close":  val = -(dx * dx + dy * dy); break;
          default:       val = e.dist; // first
        }
        if (bestVal === null || val > bestVal) { bestVal = val; best = e; }
      }
      return best;
    }

    update(dt, game) {
      this.cd -= dt;
      if (this.flash > 0) this.flash -= dt;
      const s = this.stats;

      // economy towers don't fight
      if (s.kind === "farm") {
        this.prodCd -= dt;
        if (this.prodCd <= 0) {
          this.prodCd += 42 / s.farmCount;   // spread one round's crop over ~42s
          const a = Math.random() * Math.PI * 2;
          const r = 34 + Math.random() * 26;
          const x = Math.max(14, Math.min(GameMap.W - 14, this.x + Math.cos(a) * r));
          const y = Math.max(14, Math.min(GameMap.H - 14, this.y + Math.sin(a) * r));
          game.pickups.push({ x, y, value: s.farmValue, t: 18, seed: Math.floor(Math.random() * 9999), farm: this });
          if (game.pickups.length > 80) game.pickups.shift();
        }
        return;
      }
      if (s.kind === "slave") {
        if (this.cd > 0) return;
        for (const p of game.pickups) {
          if (p.dead) continue;
          if (Math.hypot(p.x - this.x, p.y - this.y) <= s.range) {
            game.collectPickup(p, s.valueMul);
            this.cd = s.cooldown;
            this.flash = 0.1;
            break;
          }
        }
        return;
      }

      // seismic slam pulse
      if (s.quake) {
        this.quakeCd -= dt;
        if (this.quakeCd <= 0) {
          let hitAny = false;
          for (const e of game.enemies) {
            if (e.dead) continue;
            if (Math.hypot(e.x - this.x, e.y - this.y) <= s.range) {
              game.hitEnemy(e, s.quake.dmg, "explosive", {});
              e.applyStun(s.quake.stun);
              hitAny = true;
            }
          }
          if (hitAny) {
            this.quakeCd = s.quake.interval;
            game.addEffect({ type: "quake", x: this.x, y: this.y, r: s.range, t: 0.35, max: 0.35 });
            AudioSys.sfx("boom");
          } else {
            this.quakeCd = 0.2;
          }
        }
      }

      if (this.cd > 0) return;
      const target = this.pickTarget(game.enemies);
      if (!target) return;
      this.cd = s.cooldown;
      this.flash = 0.08;
      this.aimX = target.x; this.aimY = target.y;
      AudioSys.sfx(s.sfx);

      if (s.kind === "radial") {
        this.spin = (this.spin || 0) + 0.37;
        for (let i = 0; i < s.projCount; i++) {
          const ang = (Math.PI * 2 * i) / s.projCount + this.spin;
          game.projectiles.push(new Projectile(this, this.x, this.y, ang, s, s.range + 14));
        }
      } else if (s.kind === "ray") {
        this.fireRay(target, game);
        if (s.doubleShot) {
          const others = game.enemies.filter(e => !e.dead && e !== target);
          if (others.length) {
            others.sort((a, b) => b.hp - a.hp || b.dist - a.dist);
            this.fireRay(others[0], game);
          } else {
            this.fireRay(target, game);
          }
        }
      } else if (s.kind === "lob") {
        for (let i = 0; i < s.projCount; i++) {
          game.projectiles.push(Projectile.lob(this, this.x, this.y, target, s));
        }
      } else {
        // straight bullets with spread, slight lead on the target
        const lead = Math.min(0.4, Math.hypot(target.x - this.x, target.y - this.y) / s.projSpeed);
        const fut = GameMap.posAt(target.dist + target.currentSpeed() * lead);
        const baseAng = Math.atan2(fut.y - this.y, fut.x - this.x);
        const n = s.projCount;
        for (let i = 0; i < n; i++) {
          const off = n > 1 ? (i - (n - 1) / 2) * s.spread : 0;
          game.projectiles.push(new Projectile(this, this.x, this.y, baseAng + off, s, s.range + 40));
        }
      }
    }

    fireRay(target, game) {
      const s = this.stats;
      game.addEffect({ type: "ray", x1: this.x, y1: this.y - 14, x2: target.x, y2: target.y, t: 0.12, max: 0.12 });
      explode(game, target.x, target.y, s.aoe, s, this);
      this.aimX = target.x; this.aimY = target.y;
    }

    draw(c, selected) {
      const cv = Sprites.get(this.def.art, { scale: 3, flip: this.aimX < this.x });
      c.fillStyle = "rgba(40,25,5,.25)";
      c.beginPath();
      c.ellipse(this.x, this.y + cv.height / 2 - 4, cv.width / 2.4, 6, 0, 0, Math.PI * 2);
      c.fill();
      const hop = this.flash > 0 ? -2 : 0;
      c.drawImage(cv, Math.round(this.x - cv.width / 2), Math.round(this.y - cv.height / 2 + hop));
      // tier pips, color-coded per path
      const total = this.tiers.reduce((a, b) => a + b, 0);
      if (total > 0) {
        const colors = ["#5fd44a", "#4ab8e8", "#f08326"];
        let off = 0;
        for (let p = 0; p < this.tiers.length; p++) {
          for (let i = 0; i < this.tiers[p]; i++) {
            c.fillStyle = colors[p];
            c.fillRect(this.x - 14 + off * 4, this.y + cv.height / 2 + 2, 3, 3);
            off++;
          }
        }
      }
      void selected;
    }
  }

  /* ---------------- projectiles ---------------- */
  class Projectile {
    constructor(tower, x, y, angle, stats, maxDist) {
      this.tower = tower;
      this.x = x; this.y = y - 10;
      this.vx = Math.cos(angle) * stats.projSpeed;
      this.vy = Math.sin(angle) * stats.projSpeed;
      this.stats = stats;
      this.pierce = stats.pierce;
      this.travel = 0;
      this.maxDist = maxDist;
      this.dead = false;
      this.hitIds = new Set();
      this.style = stats.projStyle;
      this.isLob = false;
    }

    static lob(tower, x, y, target, stats) {
      const p = new Projectile(tower, x, y, 0, stats, 9999);
      p.isLob = true;
      // aim at where the target will be
      const eta = Math.hypot(target.x - x, target.y - y) / stats.projSpeed;
      const fut = GameMap.posAt(target.dist + target.currentSpeed() * eta);
      p.tx = fut.x; p.ty = fut.y;
      const d = Math.hypot(p.tx - x, p.ty - y) || 1;
      p.vx = ((p.tx - x) / d) * stats.projSpeed;
      p.vy = ((p.ty - y) / d) * stats.projSpeed;
      p.lobTime = d / stats.projSpeed;
      p.t = 0;
      return p;
    }

    update(dt, game) {
      if (this.dead) return;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.travel += Math.hypot(this.vx, this.vy) * dt;

      if (this.isLob) {
        this.t += dt;
        if (this.t >= this.lobTime) {
          explode(game, this.tx, this.ty, this.stats.aoe, this.stats, this.tower);
          if (this.stats.cluster) {
            for (let i = 0; i < this.stats.cluster; i++) {
              const ang = (Math.PI * 2 * i) / this.stats.cluster + 0.6;
              const cx = this.tx + Math.cos(ang) * 38, cy = this.ty + Math.sin(ang) * 38;
              explode(game, cx, cy, 30, { dmg: 1, dmgType: "explosive", stun: 0, frags: 0, goldBonus: 0, goldMult: 1, slow: null, dot: null }, this.tower);
            }
          }
          this.dead = true;
        }
        return;
      }

      if (this.travel > this.maxDist || this.x < -30 || this.x > GameMap.W + 30 || this.y < -30 || this.y > GameMap.H + 30) {
        this.dead = true;
        return;
      }

      const s = this.stats;
      for (const e of game.enemies) {
        if (e.dead || this.hitIds.has(e.id)) continue;
        const dx = e.x - this.x, dy = e.y - this.y;
        const rr = e.def.radius + 5;
        if (dx * dx + dy * dy > rr * rr) continue;
        this.hitIds.add(e.id);

        if (s.aoe > 0) {
          explode(game, this.x, this.y, s.aoe, s, this.tower);
          this.dead = true;
          return;
        }

        applyHit(game, e, s, this.tower);

        if (s.chain) {
          let chained = 0;
          for (const o of game.enemies) {
            if (chained >= s.chain) break;
            if (o.dead || o === e || this.hitIds.has(o.id)) continue;
            if (Math.hypot(o.x - e.x, o.y - e.y) < 95) {
              this.hitIds.add(o.id);
              game.addEffect({ type: "zap", x1: e.x, y1: e.y, x2: o.x, y2: o.y, t: 0.1, max: 0.1 });
              game.hitEnemy(o, 1, "energy", {});
              chained++;
            }
          }
        }

        this.pierce--;
        if (this.pierce <= 0) { this.dead = true; return; }
      }
    }

    draw(c) {
      const a = Math.atan2(this.vy, this.vx);
      c.save();
      c.translate(this.x, this.y);
      switch (this.style) {
        case "egg":
          c.fillStyle = "#fff7e0"; c.strokeStyle = "#181425"; c.lineWidth = 1.5;
          c.beginPath(); c.ellipse(0, 0, 5, 4, a, 0, Math.PI * 2); c.fill(); c.stroke();
          break;
        case "drill":
          c.rotate(a);
          c.fillStyle = "#b9bccc"; c.strokeStyle = "#181425"; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(7, 0); c.lineTo(-5, -4); c.lineTo(-5, 4); c.closePath(); c.fill(); c.stroke();
          break;
        case "goo":
          c.fillStyle = "#8a3ae0"; c.strokeStyle = "#181425"; c.lineWidth = 1.5;
          c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill(); c.stroke();
          break;
        case "bomb":
          c.fillStyle = "#3a3a46"; c.strokeStyle = "#181425"; c.lineWidth = 1.5;
          c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = "#f08326"; c.fillRect(-1, -9, 3, 4);
          break;
        case "zap":
          c.rotate(a);
          c.fillStyle = "#7ce8ff";
          c.fillRect(-8, -2, 16, 4);
          c.fillStyle = "#fff";
          c.fillRect(-4, -1, 8, 2);
          break;
        default:
          c.fillStyle = "#fff"; c.fillRect(-2, -2, 4, 4);
      }
      c.restore();
    }
  }

  // single-target hit with payloads
  function applyHit(game, e, s, tower) {
    let dmg = s.dmg;
    if ((e.def.tier === "gold") && (s.goldBonus || s.goldMult !== 1)) {
      dmg = dmg * (s.goldMult || 1) + (s.goldBonus || 0);
    }
    if (dmg > 0) game.hitEnemy(e, dmg, s.dmgType, { metalPop: s.metalPop, tower });
    if (e.dead) return;
    if (s.slow) e.applySlow(s.slow.factor, s.slow.duration);
    if (s.stun) e.applyStun(s.stun);
    if (s.dot) e.applyDot(s.dot);
  }

  // area hit (bombs, rays, eggsplosions, goo splashes)
  function explode(game, x, y, radius, s, tower) {
    const isGoo = s.dmgType === "goo";
    game.addEffect(isGoo
      ? { type: "splat", x, y, r: Math.max(radius, 22), t: 0.5, max: 0.5 }
      : { type: "boom", x, y, r: Math.max(radius, 18), t: 0.3, max: 0.3 });
    if (!isGoo) AudioSys.sfx("boom");
    const r = Math.max(radius, 1);
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - x, e.y - y) <= r + e.def.radius) {
        applyHit(game, e, s, tower);
      }
    }
    if (s.frags) {
      for (let i = 0; i < s.frags; i++) {
        const ang = (Math.PI * 2 * i) / s.frags + Math.random() * 0.4;
        const frag = new Projectile(tower, x, y, ang,
          { dmg: 1, pierce: 1, projSpeed: 300, dmgType: "sharp", metalPop: false, projStyle: "frag",
            aoe: 0, slow: null, dot: null, stun: 0, chain: 0, goldBonus: 0, goldMult: 1, frags: 0, cluster: 0 },
          90);
        frag.y += 10;
        game.projectiles.push(frag);
      }
    }
  }

  return { TYPES, ORDER, TARGET_MODES, Tower, Projectile };
})();
