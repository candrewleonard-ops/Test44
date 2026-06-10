/* ===== PINGAS TD — main game: loop, economy, UI ===== */
"use strict";

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  /* ---------------- leveling ---------------- */
  // cumulative XP required to reach level L
  function xpForLevel(L) {
    if (L <= 1) return 0;
    return 40 * (L - 1) * (L - 1) + 110 * (L - 1);
  }
  const MAX_LEVEL = 30;
  const LEVEL_UNLOCKS = { 2: "slick", 4: "bomzo", 6: "buzzbot", 8: "yolker" };
  const T4_BY_LEVEL = {};
  for (const id of Towers.ORDER) T4_BY_LEVEL[Towers.TYPES[id].t4Level] = Towers.TYPES[id].name;

  /* ---------------- game state ---------------- */
  const game = {
    phase: "menu",           // menu | build | round | over
    diff: null,
    totalRounds: 30,
    round: 0,
    lives: 200,
    cash: 650,
    xp: 0,
    level: 1,
    enemies: [],
    towers: [],
    projectiles: [],
    effects: [],
    spawnBuffer: [],
    waves: null,             // active round spawner
    roundT: 0,
    finalRound: false,       // is the 67.67 survival round active
    surviveT: 0,
    speedMul: 1,
    armed: null,             // tower typeId being placed
    selected: null,          // selected tower
    mouse: { x: -100, y: -100, over: false },
    stats: { pops: 0, cashEarned: 0, towersBuilt: 0 },
    won: false,
    lastPopSfx: 0,
    shake: 0,

    addEffect(e) { this.effects.push(e); },

    hitEnemy(e, dmg, dmgType, opts = {}) {
      if (e.dead || dmg <= 0) return 0;
      if (e.def.sharpImmune && dmgType === "sharp" && !opts.metalPop) {
        if (!opts.silent) {
          AudioSys.sfx("metal");
          this.addEffect({ type: "clink", x: e.x, y: e.y - 10, t: 0.2, max: 0.2 });
        }
        return 0;
      }
      const dealt = Math.min(e.hp, dmg);
      e.hp -= dmg;
      const rate = e.isBoss ? 0.4 : e.def.tier === "gold" ? 0.8 : 1;
      this.cash += dealt * rate;
      this.stats.cashEarned += dealt * rate;
      if (e.hp <= 0) this.killEnemy(e);
      return dealt;
    },

    killEnemy(e) {
      if (e.dead) return;
      e.dead = true;
      this.stats.pops++;
      this.gainXp(e.def.xp);
      // children burst out where it died
      const kids = e.def.children;
      for (let i = 0; i < kids.length; i++) {
        const hpMul = Rounds.hpScale(this.round, kids[i]);
        const child = new Enemies.Enemy(kids[i], Math.max(1, e.dist - 6 * i), {
          hp: Math.round(Enemies.TYPES[kids[i]].hp * hpMul),
        });
        this.spawnBuffer.push(child);
      }
      // pop particles in the body color
      const col = Sprites.ENEMY_PALS[e.def.tier].B;
      const n = e.isBoss ? 26 : 7;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 140;
        this.addEffect({
          type: "bit", x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
          col, t: 0.45, max: 0.45,
        });
      }
      const now = performance.now();
      if (now - this.lastPopSfx > 35) {
        AudioSys.sfx(e.isBoss ? "boom" : "pop");
        this.lastPopSfx = now;
      }
      if (e.isBoss) {
        this.cash += 250;
        this.shake = Math.max(this.shake, 0.35);
        toast(e.isFinal ? "THE GOLDEN BLUR IS DOWN!!" : "BOSS DOWN! +$250");
      }
    },

    gainXp(n) {
      if (this.level >= MAX_LEVEL) return;
      this.xp += n;
      while (this.level < MAX_LEVEL && this.xp >= xpForLevel(this.level + 1)) {
        this.level++;
        AudioSys.sfx("levelup");
        let msg = `LEVEL UP! ${this.level}`;
        if (LEVEL_UNLOCKS[this.level]) msg += ` — ${Towers.TYPES[LEVEL_UNLOCKS[this.level]].name} UNLOCKED!`;
        else if (T4_BY_LEVEL[this.level]) msg += ` — ${T4_BY_LEVEL[this.level]} TIER 4 UNLOCKED!`;
        else { this.cash += 250; msg += " — +$250"; }
        toast(msg);
        ui.cardsDirty = true;
        ui.panelDirty = true;
      }
    },
  };

  /* ---------------- rounds / spawning ---------------- */
  function startRound() {
    if (game.phase !== "build" || game.round >= game.totalRounds) return;
    game.round++;
    game.phase = "round";
    game.roundT = 0;
    const waves = Rounds.ROUNDS[game.round - 1];
    game.waves = waves.map(wv => ({ ...wv, spawned: 0 }));
    game.finalRound = game.diff.final && game.round === 68;
    if (game.finalRound) {
      game.surviveT = 0;
      surviveWrap.classList.add("active");
      toast("ROUND 67.67 — SURVIVE THE GOLDEN BLUR!");
      AudioSys.sfx("bossWarn");
    } else if (waves.some(wv => wv.type === "boss")) {
      toast(`ROUND ${game.round} — BOSS INCOMING!`);
      AudioSys.sfx("bossWarn");
    } else {
      toast(`ROUND ${game.round}`);
    }
    ui.syncButtons();
  }

  function spawnFromWaves(dt) {
    if (!game.waves) return true;
    game.roundT += dt;
    let allDone = true;
    for (const wv of game.waves) {
      while (wv.spawned < wv.n && game.roundT >= wv.t + wv.spawned * wv.gap) {
        const def = Enemies.TYPES[wv.type];
        const hp = Math.round((wv.hp != null ? wv.hp : def.hp) * Rounds.hpScale(game.round, wv.type));
        game.enemies.push(new Enemies.Enemy(wv.type, 0, { hp }));
        wv.spawned++;
      }
      if (wv.spawned < wv.n) allDone = false;
    }
    return allDone;
  }

  function endRound() {
    game.phase = "build";
    game.waves = null;
    const cash = Rounds.roundCash(game.round);
    game.cash += cash;
    game.gainXp(Rounds.roundXp(game.round));
    AudioSys.sfx("roundEnd");
    if (game.round >= game.totalRounds) { winGame(); return; }
    ui.syncButtons();
    if (chkAuto.checked) {
      setTimeout(() => { if (game.phase === "build") startRound(); }, 900);
    }
  }

  function winGame() {
    game.phase = "over";
    game.won = true;
    surviveWrap.classList.remove("active");
    AudioSys.sfx("win");
    endTitle.textContent = "VICTORY!";
    endTitle.style.color = "#ffd23e";
    endStats.innerHTML =
      `Dr. Pingas reigns supreme on ${game.diff.label}!<br>` +
      `${game.stats.pops} hedgehogs popped &middot; $${Math.floor(game.stats.cashEarned)} earned &middot; level ${game.level}`;
    endScreen.classList.remove("hidden");
  }

  function loseGame() {
    game.phase = "over";
    game.won = false;
    surviveWrap.classList.remove("active");
    AudioSys.sfx("lose");
    endTitle.textContent = "GAME OVER";
    endTitle.style.color = "#e84545";
    endStats.innerHTML =
      `The citadel has fallen on round ${game.round}...<br>` +
      `${game.stats.pops} hedgehogs popped &middot; ${game.stats.towersBuilt} badniks deployed`;
    endScreen.classList.remove("hidden");
  }

  /* ---------------- simulation step ---------------- */
  function step(dt) {
    if (game.phase === "round") {
      const spawned = spawnFromWaves(dt);

      if (game.finalRound) {
        game.surviveT += dt;
        if (game.surviveT >= Rounds.FINAL_TIME) {
          // survived 67.67 — instant win, leftover enemies don't matter
          game.round = game.totalRounds;
          winGame();
          return;
        }
      }

      for (const e of game.enemies) e.update(dt, game);
      if (game.spawnBuffer.length) {
        game.enemies.push(...game.spawnBuffer);
        game.spawnBuffer.length = 0;
      }
      // leaks
      for (const e of game.enemies) {
        if (e.leaked) {
          game.lives -= e.rbe;
          game.shake = Math.max(game.shake, 0.25);
          AudioSys.sfx("leak");
          if (game.lives <= 0) { game.lives = 0; loseGame(); return; }
        }
      }
      game.enemies = game.enemies.filter(e => !e.dead);

      for (const t of game.towers) t.update(dt, game);
      void spawned;
    }

    // projectiles keep flying even between rounds
    for (const p of game.projectiles) p.update(dt, game);
    if (game.spawnBuffer.length) {
      game.enemies.push(...game.spawnBuffer);
      game.spawnBuffer.length = 0;
    }
    game.enemies = game.enemies.filter(e => !e.dead);
    game.projectiles = game.projectiles.filter(p => !p.dead);
    if (game.phase === "round" && game.waves && !game.finalRound &&
        game.waves.every(wv => wv.spawned >= wv.n) && game.enemies.length === 0) {
      endRound();
    }

    // effects always animate
    for (const fx of game.effects) {
      fx.t -= dt;
      if (fx.type === "bit") {
        fx.x += fx.vx * dt; fx.y += fx.vy * dt; fx.vy += 320 * dt;
      }
    }
    game.effects = game.effects.filter(fx => fx.t > 0);
    if (game.shake > 0) game.shake -= dt;
  }

  /* ---------------- drawing ---------------- */
  function draw() {
    ctx.save();
    if (game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 8 * game.shake, (Math.random() - 0.5) * 8 * game.shake);
    }
    ctx.drawImage(GameMap.background(), 0, 0);

    // goo splats under everything
    for (const fx of game.effects) {
      if (fx.type !== "splat") continue;
      ctx.fillStyle = `rgba(120,50,200,${0.4 * (fx.t / fx.max)})`;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2); ctx.fill();
    }

    // selected tower range
    if (game.selected) drawRange(game.selected.x, game.selected.y, game.selected.stats.range, true);

    // enemies in path order (front-runners on top)
    const sorted = game.enemies.slice().sort((a, b) => a.dist - b.dist);
    for (const e of sorted) e.draw(ctx);

    // towers by y for nice overlap
    const ts = game.towers.slice().sort((a, b) => a.y - b.y);
    for (const t of ts) t.draw(ctx, t === game.selected);

    for (const p of game.projectiles) p.draw(ctx);

    // effects
    for (const fx of game.effects) {
      const k = fx.t / fx.max;
      switch (fx.type) {
        case "boom": {
          ctx.strokeStyle = `rgba(255,140,40,${k})`;
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 - k * 0.6), 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `rgba(255,220,90,${k * 0.5})`;
          ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * 0.5 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case "quake": {
          ctx.strokeStyle = `rgba(180,120,40,${k * 0.8})`;
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 - k), 0, Math.PI * 2); ctx.stroke();
          break;
        }
        case "ray": {
          ctx.strokeStyle = `rgba(255,230,120,${k})`;
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${k})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
          break;
        }
        case "zap": {
          ctx.strokeStyle = `rgba(124,232,255,${k})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1);
          const mx = (fx.x1 + fx.x2) / 2 + (Math.random() - 0.5) * 10;
          const my = (fx.y1 + fx.y2) / 2 + (Math.random() - 0.5) * 10;
          ctx.lineTo(mx, my); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
          break;
        }
        case "bit": {
          ctx.fillStyle = fx.col;
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillRect(fx.x - 2, fx.y - 2, 4, 4);
          ctx.globalAlpha = 1;
          break;
        }
        case "clink": {
          ctx.fillStyle = `rgba(255,255,255,${k})`;
          ctx.font = "bold 12px Courier New";
          ctx.fillText("clink", fx.x - 14, fx.y - 8);
          break;
        }
      }
    }

    // placement ghost
    if (game.armed && game.mouse.over) {
      const def = Towers.TYPES[game.armed];
      const ok = GameMap.canPlace(game.mouse.x, game.mouse.y, def.radius, game.towers);
      drawRange(game.mouse.x, game.mouse.y, def.base.range, ok);
      const cv = Sprites.get(def.art, { scale: 3 });
      ctx.globalAlpha = 0.75;
      ctx.drawImage(cv, Math.round(game.mouse.x - cv.width / 2), Math.round(game.mouse.y - cv.height / 2));
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // BTD-style: neutral circle normally, red only when it can't go there
  function drawRange(x, y, r, ok) {
    // map-wide towers (Yolker) would white out the screen; show a compact marker
    if (r > 900) { if (ok) return; r = 50; }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = ok ? "rgba(255,255,255,.14)" : "rgba(232,69,69,.25)";
    ctx.strokeStyle = ok ? "rgba(255,255,255,.6)" : "rgba(232,69,69,.85)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

  /* ---------------- DOM refs ---------------- */
  const livesVal = document.getElementById("lives-val");
  const cashVal = document.getElementById("cash-val");
  const roundVal = document.getElementById("round-val");
  const levelVal = document.getElementById("level-val");
  const xpFill = document.getElementById("xpbar-fill");
  const surviveWrap = document.getElementById("survive-wrap");
  const surviveFill = document.getElementById("survivebar-fill");
  const btnSpeed = document.getElementById("btn-speed");
  const btnSfx = document.getElementById("btn-sfx");
  const btnMusic = document.getElementById("btn-music");
  const btnStart = document.getElementById("btn-start");
  const chkAuto = document.getElementById("chk-auto");
  const cardsEl = document.getElementById("tower-cards");
  const panel = document.getElementById("upgrade-panel");
  const upIcon = document.getElementById("up-icon");
  const upName = document.getElementById("up-name");
  const upStats = document.getElementById("up-stats");
  const upPaths = document.getElementById("up-paths");
  const btnTarget = document.getElementById("btn-target");
  const btnSell = document.getElementById("btn-sell");
  const menu = document.getElementById("menu");
  const endScreen = document.getElementById("endscreen");
  const endTitle = document.getElementById("end-title");
  const endStats = document.getElementById("end-stats");
  const toastEl = document.getElementById("toast");

  /* ---------------- UI ---------------- */
  const ui = {
    cardsDirty: true,
    panelDirty: true,
    lastCash: -1,

    buildCards() {
      cardsEl.innerHTML = "";
      for (let i = 0; i < Towers.ORDER.length; i++) {
        const id = Towers.ORDER[i];
        const def = Towers.TYPES[id];
        const card = document.createElement("div");
        card.className = "tcard";
        card.dataset.tower = id;
        const icon = Sprites.get(def.art, { scale: 2 });
        card.appendChild(icon);
        const info = document.createElement("div");
        info.className = "tc-info";
        info.innerHTML = `<div class="tc-name">${def.name}</div><div class="tc-desc">${def.desc}</div>`;
        card.appendChild(info);
        const cost = document.createElement("div");
        cost.className = "tc-cost";
        card.appendChild(cost);
        const key = document.createElement("div");
        key.className = "tc-key";
        key.textContent = i + 1;
        card.appendChild(key);
        card.addEventListener("click", () => armTower(id));
        cardsEl.appendChild(card);
      }
    },

    refreshCards() {
      if (!game.diff) return;
      const cash = Math.floor(game.cash);
      for (const card of cardsEl.children) {
        const def = Towers.TYPES[card.dataset.tower];
        const cost = Math.round(def.cost * game.diff.priceMul);
        const locked = game.level < def.unlockLevel;
        card.classList.toggle("locked", locked);
        card.classList.toggle("poor", !locked && cash < cost);
        card.classList.toggle("armed", game.armed === card.dataset.tower);
        card.querySelector(".tc-cost").textContent = locked ? `LVL ${def.unlockLevel}` : `$${cost}`;
      }
    },

    renderPanel() {
      const t = game.selected;
      if (!t) { panel.classList.add("hidden"); return; }
      panel.classList.remove("hidden");
      const ic = upIcon.getContext("2d");
      ic.imageSmoothingEnabled = false;
      ic.clearRect(0, 0, 48, 48);
      ic.drawImage(Sprites.get(t.def.art, { scale: 3 }), 0, 0);
      upName.textContent = t.def.name;
      const s = t.stats;
      const rate = (1 / s.cooldown).toFixed(1);
      let extra = [];
      if (s.aoe) extra.push(`blast ${Math.round(s.aoe)}`);
      if (s.slow) extra.push(`slow ${Math.round((1 - s.slow.factor) * 100)}%`);
      if (s.dot) extra.push(`acid ${(s.dot.dmg / s.dot.interval).toFixed(1)}/s`);
      if (s.metalPop && t.def.base.dmgType === "sharp") extra.push("pops metal");
      upStats.textContent =
        `dmg ${s.dmg} | pierce ${s.pierce} | ${rate}/s | range ${Math.round(s.range)}` +
        (extra.length ? `\n${extra.join(" | ")}` : "");

      upPaths.innerHTML = "";
      for (let p = 0; p < 2; p++) {
        const pd = t.def.paths[p];
        const div = document.createElement("div");
        div.className = "upath";
        const pips = [0, 1, 2, 3].map(i =>
          `<span class="pip${i < t.tiers[p] ? " on" : ""}"></span>`).join("");
        div.innerHTML = `<div class="upath-title">${pd.title}<span class="pips">${pips}</span></div>`;
        const tier = t.tiers[p];
        const btn = document.createElement("button");
        btn.className = "up-buy";
        if (tier >= 4) {
          btn.classList.add("maxed");
          btn.innerHTML = `<span class="ub-name">FULLY UPGRADED</span>`;
        } else {
          const up = pd.ups[tier];
          const cost = t.upgradeCost(p);
          const chk = t.canUpgrade(p, game.level);
          const afford = Math.floor(game.cash) >= cost;
          btn.innerHTML =
            `<span class="ub-cost">${chk.ok ? "$" + cost : chk.reason}</span>` +
            `<span class="ub-name">${tier === 3 ? "★ " : ""}${up.name}</span>` +
            `<div class="ub-desc">${up.desc}</div>`;
          if (!chk.ok) btn.classList.add("locked");
          else if (!afford) btn.classList.add("poor");
          else {
            btn.addEventListener("click", () => {
              if (game.phase === "over") return;
              game.cash -= t.upgradeCost(p);
              t.buyUpgrade(p);
              AudioSys.sfx("upgrade");
              ui.panelDirty = true;
            });
          }
        }
        div.appendChild(btn);
        upPaths.appendChild(div);
      }
      btnTarget.textContent = `TARGET: ${t.targetMode.toUpperCase()}`;
      btnSell.textContent = `SELL $${t.sellValue()}`;
    },

    syncButtons() {
      btnStart.disabled = game.phase !== "build";
      btnStart.textContent = game.phase === "round" ? "ROUND IN PROGRESS" : "START ROUND";
    },

    refreshHud() {
      livesVal.textContent = Math.max(0, Math.ceil(game.lives));
      cashVal.textContent = "$" + Math.floor(game.cash);
      if (game.diff) {
        const shown = game.diff.final
          ? (game.round >= 68 ? "FINAL 67.67" : `${game.round}/67.67`)
          : `${game.round}/${game.totalRounds}`;
        roundVal.textContent = "Round " + shown;
      }
      levelVal.textContent = "LVL " + game.level;
      const lo = xpForLevel(game.level), hi = xpForLevel(game.level + 1);
      xpFill.style.width = game.level >= MAX_LEVEL ? "100%" :
        Math.min(100, ((game.xp - lo) / (hi - lo)) * 100) + "%";
      if (game.finalRound) {
        surviveFill.style.width = Math.min(100, (game.surviveT / Rounds.FINAL_TIME) * 100) + "%";
      }
    },
  };

  /* ---------------- toasts ---------------- */
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 1900);
  }

  /* ---------------- placement & selection ---------------- */
  function armTower(id) {
    const def = Towers.TYPES[id];
    if (game.level < def.unlockLevel) { toast(`UNLOCKS AT LEVEL ${def.unlockLevel}`); return; }
    game.selected = null;
    ui.panelDirty = true;
    game.armed = game.armed === id ? null : id;
    ui.cardsDirty = true;
  }

  function tryPlace(x, y) {
    const def = Towers.TYPES[game.armed];
    const cost = Math.round(def.cost * game.diff.priceMul);
    if (Math.floor(game.cash) < cost) { toast("NOT ENOUGH CASH"); AudioSys.sfx("cantPlace"); return; }
    if (!GameMap.canPlace(x, y, def.radius, game.towers)) { AudioSys.sfx("cantPlace"); return; }
    game.cash -= cost;
    const t = new Towers.Tower(game.armed, x, y, game.diff.priceMul);
    game.towers.push(t);
    game.stats.towersBuilt++;
    AudioSys.sfx("place");
    ui.cardsDirty = true;
    // keep placing if you can afford another (BTD-style shift behavior always on)
    if (Math.floor(game.cash) < cost) { game.armed = null; ui.cardsDirty = true; }
  }

  function canvasPos(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (canvas.width / r.width),
      y: (ev.clientY - r.top) * (canvas.height / r.height),
    };
  }

  canvas.addEventListener("mousemove", ev => {
    const p = canvasPos(ev);
    game.mouse.x = p.x; game.mouse.y = p.y; game.mouse.over = true;
  });
  canvas.addEventListener("mouseleave", () => { game.mouse.over = false; });

  canvas.addEventListener("click", ev => {
    if (game.phase === "menu" || game.phase === "over") return;
    const p = canvasPos(ev);
    if (game.armed) { tryPlace(p.x, p.y); return; }
    // select a tower?
    let hit = null;
    for (const t of game.towers) {
      if (Math.hypot(t.x - p.x, t.y - p.y) < t.radius + 8) hit = t;
    }
    game.selected = hit;
    ui.panelDirty = true;
  });

  canvas.addEventListener("contextmenu", ev => {
    ev.preventDefault();
    game.armed = null;
    game.selected = null;
    ui.cardsDirty = true;
    ui.panelDirty = true;
  });

  /* ---------------- buttons ---------------- */
  btnStart.addEventListener("click", () => { AudioSys.unlock(); startRound(); });
  btnSpeed.addEventListener("click", () => {
    game.speedMul = game.speedMul === 1 ? 3 : 1;
    btnSpeed.innerHTML = `&#9193;${game.speedMul}x`;
  });
  btnSfx.addEventListener("click", () => btnSfx.classList.toggle("off", !AudioSys.toggleSfx()));
  btnMusic.addEventListener("click", () => btnMusic.classList.toggle("off", !AudioSys.toggleMusic()));
  document.getElementById("up-close").addEventListener("click", () => {
    game.selected = null;
    ui.panelDirty = true;
  });
  btnTarget.addEventListener("click", () => {
    const t = game.selected;
    if (!t) return;
    const i = Towers.TARGET_MODES.indexOf(t.targetMode);
    t.targetMode = Towers.TARGET_MODES[(i + 1) % Towers.TARGET_MODES.length];
    ui.panelDirty = true;
  });
  btnSell.addEventListener("click", () => {
    const t = game.selected;
    if (!t) return;
    game.cash += t.sellValue();
    game.towers = game.towers.filter(x => x !== t);
    game.selected = null;
    AudioSys.sfx("sell");
    ui.panelDirty = true;
    ui.cardsDirty = true;
  });

  for (const btn of document.querySelectorAll(".diff-btn[data-diff]")) {
    btn.addEventListener("click", () => {
      AudioSys.unlock();
      AudioSys.startMusic();
      newGame(btn.dataset.diff);
    });
  }
  document.getElementById("btn-replay").addEventListener("click", () => {
    endScreen.classList.add("hidden");
    newGame(game.diffId);
  });
  document.getElementById("btn-menu").addEventListener("click", () => {
    endScreen.classList.add("hidden");
    menu.classList.remove("hidden");
    game.phase = "menu";
  });

  window.addEventListener("keydown", ev => {
    if (game.phase === "menu" || game.phase === "over") return;
    const k = ev.key;
    if (k === "Escape") {
      game.armed = null; game.selected = null;
      ui.cardsDirty = true; ui.panelDirty = true;
    } else if (k === " ") {
      ev.preventDefault();
      startRound();
    } else if (k === "f" || k === "F") {
      btnSpeed.click();
    } else if (k === "s" || k === "S") {
      btnSfx.click();
    } else if (k === "m" || k === "M") {
      btnMusic.click();
    } else if (k >= "1" && k <= "6") {
      const id = Towers.ORDER[+k - 1];
      if (id) armTower(id);
    }
  });

  /* ---------------- new game ---------------- */
  function newGame(diffId) {
    const d = Rounds.DIFFS[diffId];
    game.diffId = diffId;
    game.diff = d;
    game.totalRounds = d.rounds;
    game.round = 0;
    game.lives = d.lives;
    game.cash = d.cash;
    game.xp = 0;
    game.level = 1;
    game.enemies = [];
    game.towers = [];
    game.projectiles = [];
    game.effects = [];
    game.spawnBuffer = [];
    game.waves = null;
    game.finalRound = false;
    game.surviveT = 0;
    game.armed = null;
    game.selected = null;
    game.won = false;
    game.stats = { pops: 0, cashEarned: 0, towersBuilt: 0 };
    game.phase = "build";
    menu.classList.add("hidden");
    endScreen.classList.add("hidden");
    surviveWrap.classList.remove("active");
    ui.cardsDirty = true;
    ui.panelDirty = true;
    ui.syncButtons();
    toast(`${d.label} MODE — GOOD LUCK!`);
  }

  /* ---------------- main loop ---------------- */
  let lastT = performance.now();
  function frame(now) {
    let dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (game.phase === "round" || game.phase === "build") {
      const eff = dt * game.speedMul;
      const n = Math.max(1, Math.ceil(eff / (1 / 60)));
      const sub = eff / n;
      for (let i = 0; i < n; i++) {
        step(sub);
        if (game.phase === "over") break;
      }
    }
    draw();

    // DOM refresh (cheap text updates every frame, structural only when dirty)
    ui.refreshHud();
    const cashInt = Math.floor(game.cash);
    if (ui.cardsDirty || cashInt !== ui.lastCash) {
      ui.refreshCards();
      ui.cardsDirty = false;
    }
    if (ui.panelDirty || (game.selected && cashInt !== ui.lastCash)) {
      ui.renderPanel();
      ui.panelDirty = false;
    }
    ui.lastCash = cashInt;

    requestAnimationFrame(frame);
  }

  /* ---------------- viewport scaling ---------------- */
  function rescale() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 710, 1.35);
    const el = document.getElementById("scaler");
    el.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  window.addEventListener("resize", rescale);

  /* ---------------- title art ---------------- */
  function drawTitleArt() {
    const cv = document.getElementById("title-art");
    const c = cv.getContext("2d");
    c.imageSmoothingEnabled = false;
    const ping = Sprites.get("pingas", { scale: 4 });
    c.drawImage(ping, cv.width / 2 - ping.width / 2, cv.height - ping.height);
    const h1 = Sprites.enemy("blue", { scale: 2 });
    const h2 = Sprites.enemy("gold", { scale: 2, flip: true });
    c.drawImage(h1, 30, cv.height - h1.height - 4);
    c.drawImage(h2, cv.width - h2.width - 30, cv.height - h2.height - 4);
  }

  /* ---------------- boot ---------------- */
  Sprites.icon(document.getElementById("ico-lives"), "icon_heart", 2);
  Sprites.icon(document.getElementById("ico-cash"), "icon_coin", 2);
  Sprites.icon(document.getElementById("ico-round"), "icon_flag", 2);
  Sprites.icon(document.getElementById("ico-level"), "icon_star", 2);
  ui.buildCards();
  drawTitleArt();
  rescale();
  ui.syncButtons();
  requestAnimationFrame(frame);

  // dev/debug hook
  window.PTD = { game, newGame, startRound, Towers, Enemies, Rounds, GameMap, Sprites };
})();
