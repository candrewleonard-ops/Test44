/* ===== PINGAS TD — enemies: the hedgehog horde =====
 * Works like classic bloon layers: kill one, it degrades into its children.
 * Gold = the "ceramic" of this world. Bosses are always gold, big, and mean.
 */
"use strict";

const Enemies = (() => {

  // global pace: every enemy moves 25% slower than its listed speed
  const WORLD_SPEED = 0.75;

  const TYPES = {
    // hedgehog layers (BTD-style): pop one, it sheds the next color down.
    // blue (1 hit) -> red (2) -> green (3) -> yellow (4) -> pink (5)
    blue:   { tier: "blue",   hp: 1,  speed: 60,  xp: 1,  scale: 2,   radius: 13, children: [] },
    red:    { tier: "red",    hp: 1,  speed: 84,  xp: 2,  scale: 2,   radius: 13, children: ["blue"] },
    green:  { tier: "green",  hp: 1,  speed: 108, xp: 3,  scale: 2,   radius: 13, children: ["red"] },
    yellow: { tier: "yellow", hp: 1,  speed: 168, xp: 4,  scale: 2,   radius: 13, children: ["green"] },
    pink:   { tier: "pink",   hp: 1,  speed: 192, xp: 5,  scale: 2,   radius: 13, children: ["yellow"] },
    metal:  { tier: "metal",  hp: 3,  speed: 54,  xp: 8,  scale: 2,   radius: 13, children: ["green", "green"], sharpImmune: true },
    shadow: { tier: "shadow", hp: 1,  speed: 122, xp: 8,  scale: 1.6, radius: 11, children: ["pink", "pink"] },
    gold:   { tier: "gold",   hp: 14, speed: 96,  xp: 25, scale: 2.4, radius: 16, children: ["shadow", "shadow"] },
    // bosses: hp passed at spawn time; always gold, bigger, more health
    boss:   { tier: "gold",   hp: 1200, speed: 42, xp: 250, scale: 3.4, radius: 26, children: ["gold", "gold", "gold", "gold"], boss: true },
    // MOAB-class mega hedgehogs (round 45+): blue -> red -> green, like
    // MOAB -> BFB -> ZOMG. Each one bursts into the sonics inside it.
    moab_blue:  { tier: "blue",  hp: 2200,  speed: 40, xp: 300,  scale: 4.0, radius: 30, children: ["gold", "gold", "gold", "gold"], boss: true },
    moab_red:   { tier: "red",   hp: 6500,  speed: 32, xp: 800,  scale: 4.4, radius: 33, children: ["moab_blue", "moab_blue"], boss: true },
    moab_green: { tier: "green", hp: 16000, speed: 26, xp: 2000, scale: 4.8, radius: 36, children: ["moab_red", "moab_red"], boss: true },
    // (final keeps its real-world pace despite the global slowdown — it's the finale)
    final:  { tier: "gold",   hp: 30000, speed: 128, xp: 5000, scale: 4.6, radius: 36, children: [], boss: true, final: true },
  };

  // RBE = damage you take if it leaks (its hp + everything inside it)
  const rbeCache = {};
  function rbe(typeId, hpOverride) {
    const t = TYPES[typeId];
    const ownHp = hpOverride != null ? hpOverride : t.hp;
    if (hpOverride == null && rbeCache[typeId] != null) return rbeCache[typeId];
    let total = ownHp;
    for (const ch of t.children) total += rbe(ch);
    if (hpOverride == null) rbeCache[typeId] = total;
    return total;
  }

  let nextId = 1;

  class Enemy {
    constructor(typeId, dist = 0, opts = {}) {
      const def = TYPES[typeId];
      this.id = nextId++;
      this.typeId = typeId;
      this.def = def;
      this.dist = dist;
      this.hp = opts.hp != null ? opts.hp : def.hp;
      this.maxHp = this.hp;
      this.speedMul = opts.speedMul || 1;
      this.dead = false;
      this.leaked = false;
      // status effects
      this.slowFactor = 1;     // current speed multiplier from goo
      this.slowTimer = 0;
      this.stunTimer = 0;
      this.dot = null;         // { dmg, interval, t, timeLeft, metalPop }
      this.wobble = Math.random() * 10;
      const p = GameMap.posAt(this.dist);
      this.x = p.x; this.y = p.y; this.dx = p.dx;
    }

    get isBoss() { return !!this.def.boss; }
    get isFinal() { return !!this.def.final; }
    get rbe() { return this.hp + this.def.children.reduce((a, c) => a + rbe(c), 0); }

    currentSpeed() {
      let s = this.def.speed * WORLD_SPEED * this.speedMul;
      if (this.slowTimer > 0) {
        // bosses shrug off half of the slow
        const f = this.isBoss ? (this.slowFactor + 1) / 2 : this.slowFactor;
        s *= f;
      }
      return s;
    }

    applySlow(factor, duration) {
      // strongest slow wins; duration refreshes
      if (this.slowTimer <= 0 || factor <= this.slowFactor) this.slowFactor = factor;
      this.slowTimer = Math.max(this.slowTimer, duration);
    }

    applyStun(duration) {
      if (this.isBoss) return; // bosses can't be stunned
      this.stunTimer = Math.max(this.stunTimer, duration);
    }

    applyDot(dot) {
      // strongest dps wins
      const dps = dot.dmg / dot.interval;
      if (!this.dot || dps >= this.dot.dmg / this.dot.interval) {
        this.dot = { dmg: dot.dmg, interval: dot.interval, t: dot.interval, timeLeft: dot.duration, metalPop: !!dot.metalPop };
      } else {
        this.dot.timeLeft = Math.max(this.dot.timeLeft, dot.duration);
      }
    }

    update(dt, game) {
      if (this.dead) return;
      if (this.stunTimer > 0) this.stunTimer -= dt;
      if (this.slowTimer > 0) this.slowTimer -= dt;

      if (this.dot) {
        this.dot.t -= dt;
        this.dot.timeLeft -= dt;
        if (this.dot.t <= 0) {
          this.dot.t += this.dot.interval;
          game.hitEnemy(this, this.dot.dmg, this.dot.metalPop ? "acid" : "sharp", { silent: true });
          if (this.dead) return;
        }
        if (this.dot.timeLeft <= 0) this.dot = null;
      }

      if (this.stunTimer <= 0) {
        this.dist += this.currentSpeed() * dt;
      }
      if (this.dist >= GameMap.TOTAL) {
        this.leaked = true;
        this.dead = true;
        return;
      }
      const p = GameMap.posAt(this.dist);
      this.x = p.x; this.y = p.y;
      if (p.dx !== 0) this.dx = p.dx;
    }

    draw(c) {
      const flip = this.dx < 0;
      const cv = Sprites.enemy(this.def.tier, { boss: this.isBoss, scale: this.def.scale, flip });
      const bob = Math.sin(this.dist * 0.11 + this.wobble) * 2;
      // shadow
      c.fillStyle = "rgba(40,25,5,.22)";
      c.beginPath();
      c.ellipse(this.x, this.y + cv.height / 2 - 2, cv.width / 2.6, 4 + (this.isBoss ? 3 : 0), 0, 0, Math.PI * 2);
      c.fill();
      // final boss aura
      if (this.isFinal) {
        const t = performance.now() / 300;
        c.strokeStyle = `rgba(255,210,60,${0.45 + 0.3 * Math.sin(t)})`;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(this.x, this.y, cv.width / 1.7 + 4 * Math.sin(t * 1.7), 0, Math.PI * 2);
        c.stroke();
      }
      c.drawImage(cv, Math.round(this.x - cv.width / 2), Math.round(this.y - cv.height / 2 + bob));
      // stun stars
      if (this.stunTimer > 0) {
        c.fillStyle = "#ffd23e";
        const a = performance.now() / 120;
        for (let i = 0; i < 3; i++) {
          const ang = a + i * 2.1;
          c.fillRect(this.x + Math.cos(ang) * 12 - 2, this.y - cv.height / 2 - 6 + Math.sin(ang) * 3, 4, 4);
        }
      } else if (this.slowTimer > 0) {
        // goo drip tint
        c.fillStyle = "rgba(120,60,200,.35)";
        c.beginPath();
        c.ellipse(this.x, this.y + cv.height / 2 - 4, cv.width / 3, 3, 0, 0, Math.PI * 2);
        c.fill();
      }
      // hp bar for tougher units
      if ((this.maxHp >= 8 || this.isBoss) && this.hp < this.maxHp) {
        const w = this.isBoss ? 52 : 26;
        const x = this.x - w / 2, y = this.y - cv.height / 2 - 9;
        c.fillStyle = "#181425";
        c.fillRect(x - 1, y - 1, w + 2, 6);
        c.fillStyle = this.isBoss ? "#ffd23e" : "#5fd44a";
        c.fillRect(x, y, w * Math.max(0, this.hp / this.maxHp), 4);
      }
    }
  }

  return { TYPES, Enemy, rbe };
})();
