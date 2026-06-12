/* ===== PINGAS TD — overworld maps (classic console world-map style) =====
 * Multiple maps share one engine: a path polyline, themed terrain,
 * a lake with the citadel island, and decor that blocks placement.
 */
"use strict";

const GameMap = (() => {
  const W = 1000, H = 640;
  const PATH_RADIUS = 23;   // half width of the road

  const MAPS = {
    desert: {
      name: "DESERT DOMAIN",
      theme: {
        g1: "#ecd6a4", g2: "#e6cd96", spk: "#d9bd82",
        roadO: "#a87b3e", roadI: "#f7e3b2", dot: "#d8b878",
        water: "#2e72c8", waterEdge: "#1b4a8c", shim: "#5b9ade", islandEdge: "#caa45e",
      },
      path: [
        { x: -40, y: 130 }, { x: 170, y: 130 }, { x: 170, y: 320 },
        { x: 380, y: 320 }, { x: 380, y: 130 }, { x: 620, y: 130 },
        { x: 620, y: 420 }, { x: 250, y: 420 }, { x: 250, y: 555 },
        { x: 700, y: 555 }, { x: 700, y: 255 }, { x: 868, y: 255 },
        { x: 868, y: 462 },
      ],
      decor: [
        { art: "cactus", x: 70,  y: 80 },  { art: "cactus", x: 290, y: 80 },
        { art: "bush",   x: 480, y: 70 },  { art: "cactus", x: 730, y: 90 },
        { art: "bush",   x: 60,  y: 480 }, { art: "rock",   x: 90,  y: 590 },
        { art: "rock",   x: 470, y: 480 }, { art: "cactus", x: 270, y: 215 },
        { art: "bush",   x: 520, y: 230 }, { art: "rock",   x: 720, y: 145 },
        { art: "cactus", x: 440, y: 600 }, { art: "bush",   x: 640, y: 615 },
        { art: "cactus", x: 905, y: 120 }, { art: "rock",   x: 815, y: 70 },
      ],
      lake: { cx: 884, cy: 484, rx: 132, ry: 172 },
      island: { cx: 868, cy: 487, r: 86 },
      base: { x: 868, y: 470 },
    },

    hills: {
      name: "GREEN HILL GAUNTLET",
      theme: {
        g1: "#8cc463", g2: "#84ba5b", spk: "#6da64a",
        roadO: "#8a6a3a", roadI: "#ecd9a6", dot: "#cdb37c",
        water: "#2e72c8", waterEdge: "#1b4a8c", shim: "#5b9ade", islandEdge: "#5a9440",
      },
      path: [
        { x: -40, y: 90 }, { x: 880, y: 90 }, { x: 880, y: 250 },
        { x: 120, y: 250 }, { x: 120, y: 410 }, { x: 880, y: 410 },
        { x: 880, y: 555 }, { x: 170, y: 555 },
      ],
      decor: [
        { art: "bush", x: 80,  y: 170 },  { art: "bush", x: 320, y: 170 },
        { art: "rock", x: 560, y: 170 },  { art: "bush", x: 780, y: 170 },
        { art: "bush", x: 240, y: 330 },  { art: "rock", x: 470, y: 330 },
        { art: "bush", x: 700, y: 330 },  { art: "bush", x: 940, y: 330 },
        { art: "rock", x: 320, y: 490 },  { art: "bush", x: 540, y: 490 },
        { art: "bush", x: 60,  y: 40 },   { art: "rock", x: 500, y: 40 },
        { art: "bush", x: 940, y: 610 },  { art: "bush", x: 620, y: 615 },
      ],
      lake: { cx: 150, cy: 565, rx: 175, ry: 105 },
      island: { cx: 170, cy: 552, r: 78 },
      base: { x: 170, y: 545 },
    },
  };

  // ---- current map state ----
  let cur = null;
  let PATH = [], segs = [], TOTAL = 0;
  let DECOR = [], LAKE = null, ISLAND = null, BASE = null, THEME = null;
  let bg = null;
  let currentId = "desert";

  function load(id) {
    cur = MAPS[id] || MAPS.desert;
    currentId = MAPS[id] ? id : "desert";
    PATH = cur.path;
    DECOR = cur.decor.map(d => ({ ...d, s: 3, r: 18 }));
    LAKE = cur.lake; ISLAND = cur.island; BASE = cur.base; THEME = cur.theme;
    segs = []; TOTAL = 0;
    for (let i = 0; i < PATH.length - 1; i++) {
      const a = PATH[i], b = PATH[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ a, b, len, start: TOTAL });
      TOTAL += len;
    }
    bg = null;
  }

  function posAt(dist) {
    if (dist <= 0) {
      const s = segs[0];
      return { x: s.a.x + (s.b.x - s.a.x) * (dist / s.len), y: s.a.y + (s.b.y - s.a.y) * (dist / s.len), dx: Math.sign(s.b.x - s.a.x), dy: Math.sign(s.b.y - s.a.y) };
    }
    for (const s of segs) {
      if (dist <= s.start + s.len) {
        const t = (dist - s.start) / s.len;
        return {
          x: s.a.x + (s.b.x - s.a.x) * t,
          y: s.a.y + (s.b.y - s.a.y) * t,
          dx: Math.sign(s.b.x - s.a.x), dy: Math.sign(s.b.y - s.a.y),
        };
      }
    }
    const s = segs[segs.length - 1];
    return { x: s.b.x, y: s.b.y, dx: Math.sign(s.b.x - s.a.x), dy: Math.sign(s.b.y - s.a.y) };
  }

  function distToSegment(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - a.x) * dx + (py - a.y) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
  }

  function distToPath(x, y) {
    let d = Infinity;
    for (const s of segs) d = Math.min(d, distToSegment(x, y, s.a, s.b));
    return d;
  }

  function inLake(x, y) {
    const ex = (x - LAKE.cx) / LAKE.rx, ey = (y - LAKE.cy) / LAKE.ry;
    if (ex * ex + ey * ey > 1) return false;
    if (Math.hypot(x - ISLAND.cx, y - ISLAND.cy) < ISLAND.r - 6) return false; // island is land
    return true;
  }

  /* ---------------- placement ---------------- */
  function canPlace(x, y, radius, towers) {
    if (x < radius + 4 || x > W - radius - 4 || y < radius + 4 || y > H - radius - 4) return false;
    if (distToPath(x, y) < PATH_RADIUS + radius - 4) return false;
    if (inLake(x, y)) return false;
    if (Math.hypot(x - ISLAND.cx, y - ISLAND.cy) < ISLAND.r + radius - 10) return false;
    for (const d of DECOR) {
      if (Math.hypot(x - d.x, y - d.y) < d.r + radius - 6) return false;
    }
    for (const t of towers) {
      if (Math.hypot(x - t.x, y - t.y) < t.radius + radius - 2) return false;
    }
    return true;
  }

  /* ---------------- background baking ---------------- */
  function roundedPath(c, r) {
    c.lineJoin = "round";
    c.lineCap = "round";
    c.lineWidth = r * 2;
    c.beginPath();
    c.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) c.lineTo(PATH[i].x, PATH[i].y);
    c.stroke();
  }

  function bakeBackground() {
    bg = document.createElement("canvas");
    bg.width = W; bg.height = H;
    const c = bg.getContext("2d");
    const T = THEME;

    // ground: soft gradient base with big mottled patches (BTD6-style)
    const gbg = c.createRadialGradient(W * 0.45, H * 0.4, 120, W * 0.5, H * 0.5, 720);
    gbg.addColorStop(0, T.g1);
    gbg.addColorStop(1, T.g2);
    c.fillStyle = gbg;
    c.fillRect(0, 0, W, H);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * H, r = 50 + rnd() * 110;
      const gp = c.createRadialGradient(x, y, 0, x, y, r);
      gp.addColorStop(0, T.g2 + "");
      gp.addColorStop(1, "rgba(0,0,0,0)");
      c.globalAlpha = 0.35;
      c.fillStyle = gp;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    // fine speckles
    c.fillStyle = T.spk;
    c.globalAlpha = 0.5;
    for (let i = 0; i < 280; i++) {
      c.beginPath();
      c.arc(rnd() * W, rnd() * H, 1 + rnd() * 1.6, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // lake: deep gradient with a bright shoreline
    const gw = c.createRadialGradient(LAKE.cx - LAKE.rx * 0.25, LAKE.cy - LAKE.ry * 0.3, 20, LAKE.cx, LAKE.cy, Math.max(LAKE.rx, LAKE.ry));
    gw.addColorStop(0, T.shim);
    gw.addColorStop(0.5, T.water);
    gw.addColorStop(1, T.waterEdge);
    c.fillStyle = gw;
    c.strokeStyle = T.waterEdge;
    c.lineWidth = 5;
    c.beginPath();
    c.ellipse(LAKE.cx, LAKE.cy, LAKE.rx, LAKE.ry, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = "rgba(255,255,255,.35)";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(LAKE.cx, LAKE.cy, LAKE.rx - 5, LAKE.ry - 5, 0, 0, Math.PI * 2);
    c.stroke();
    // ripples
    c.strokeStyle = "rgba(255,255,255,.3)";
    c.lineWidth = 2;
    for (let i = 0; i < 22; i++) {
      const x = LAKE.cx - LAKE.rx + rnd() * LAKE.rx * 2;
      const y = LAKE.cy - LAKE.ry + rnd() * LAKE.ry * 2;
      if (inLake(x, y)) {
        c.beginPath();
        c.arc(x, y, 5 + rnd() * 7, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
      }
    }

    // island
    c.fillStyle = T.g1;
    c.strokeStyle = T.islandEdge;
    c.lineWidth = 5;
    c.beginPath();
    c.arc(ISLAND.cx, ISLAND.cy, ISLAND.r, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // road: drop shadow, dark border, dirt fill, worn center line
    c.save();
    c.globalAlpha = 0.25;
    c.strokeStyle = "#1b1530";
    c.translate(0, 4);
    roundedPath(c, PATH_RADIUS + 2);
    c.restore();
    c.strokeStyle = T.roadO;
    roundedPath(c, PATH_RADIUS + 1);
    c.strokeStyle = T.roadI;
    roundedPath(c, PATH_RADIUS - 4);
    // dirt mottling along the road
    c.fillStyle = T.dot;
    c.globalAlpha = 0.5;
    for (let d = 14; d < TOTAL; d += 26) {
      const p = posAt(d);
      c.beginPath();
      c.arc(p.x + (rnd() - 0.5) * 22, p.y + (rnd() - 0.5) * 22, 2 + rnd() * 3.5, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    // dashed center line
    c.save();
    c.strokeStyle = "rgba(255,255,255,.4)";
    c.lineWidth = 3;
    c.setLineDash([14, 16]);
    c.lineJoin = "round"; c.lineCap = "round";
    c.beginPath();
    c.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) c.lineTo(PATH[i].x, PATH[i].y);
    c.stroke();
    c.restore();

    // bridge planks wherever the road crosses water
    c.fillStyle = "#9a6a30";
    for (const s of segs) {
      const steps = Math.max(1, Math.floor(s.len / 14));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = s.a.x + (s.b.x - s.a.x) * t;
        const y = s.a.y + (s.b.y - s.a.y) * t;
        if (inLake(x, y - PATH_RADIUS - 4) || inLake(x, y + PATH_RADIUS + 4) ||
            inLake(x - PATH_RADIUS - 4, y) || inLake(x + PATH_RADIUS + 4, y)) {
          if (Math.abs(s.b.y - s.a.y) > Math.abs(s.b.x - s.a.x)) {
            c.fillRect(x - PATH_RADIUS - 2, y - 3, PATH_RADIUS * 2 + 4, 6);
          } else {
            c.fillRect(x - 3, y - PATH_RADIUS - 2, 6, PATH_RADIUS * 2 + 4);
          }
        }
      }
    }

    // decor sprites
    for (const d of DECOR) {
      const cv = Sprites.get(d.art, { scale: d.s });
      c.drawImage(cv, Math.round(d.x - cv.width / 2), Math.round(d.y - cv.height + 8));
      c.fillStyle = "rgba(60,40,10,.18)";
      c.beginPath();
      c.ellipse(d.x, d.y + 8, cv.width / 2.4, 5, 0, 0, Math.PI * 2);
      c.fill();
    }

    // castle + Dr. Pingas on the island (Pingas in front, castle behind)
    const castle = Sprites.get("castle", { scale: 4 });
    c.drawImage(castle, Math.round(ISLAND.cx - castle.width / 2 + 4), Math.round(ISLAND.cy - castle.height + 16));
    const pingas = Sprites.get("pingas", { scale: 2 });
    c.drawImage(pingas, Math.round(BASE.x - pingas.width / 2 - 26), Math.round(BASE.y - pingas.height + 32));

    // GO! sign by the spawn road
    const sign = Sprites.get("sign", { scale: 3 });
    c.drawImage(sign, 14, PATH[0].y - PATH_RADIUS - sign.height - 6);

    // soft vignette
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(20,12,40,.28)");
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);

    return bg;
  }

  function background() {
    if (!bg) bakeBackground();
    return bg;
  }

  load("desert");

  return {
    W, H, PATH_RADIUS, MAPS,
    get TOTAL() { return TOTAL; },
    get currentId() { return currentId; },
    load, posAt, distToPath, canPlace, inLake, background,
  };
})();
