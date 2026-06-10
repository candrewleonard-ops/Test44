/* ===== PINGAS TD — overworld map (classic console world-map style) ===== */
"use strict";

const GameMap = (() => {
  const W = 1000, H = 640;
  const PATH_RADIUS = 23;   // half width of the road

  // winding road from the west edge to the Pingas Citadel island (SE)
  const PATH = [
    { x: -40, y: 130 },
    { x: 170, y: 130 },
    { x: 170, y: 320 },
    { x: 380, y: 320 },
    { x: 380, y: 130 },
    { x: 620, y: 130 },
    { x: 620, y: 420 },
    { x: 250, y: 420 },
    { x: 250, y: 555 },
    { x: 700, y: 555 },
    { x: 700, y: 255 },
    { x: 868, y: 255 },
    { x: 868, y: 462 },
  ];

  // cumulative segment lengths for distance->position lookup
  const segs = [];
  let TOTAL = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], b = PATH[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len, start: TOTAL });
    TOTAL += len;
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

  // the lake (SE corner). Castle island sits inside it; road crosses on a bridge.
  const LAKE = { x: 758, y: 318, w: 242, h: 322 };
  const ISLAND = { cx: 868, cy: 487, r: 86 };

  function inLake(x, y) {
    if (x < LAKE.x || x > LAKE.x + LAKE.w || y < LAKE.y || y > LAKE.y + LAKE.h) return false;
    // island is land
    if (Math.hypot(x - ISLAND.cx, y - ISLAND.cy) < ISLAND.r - 6) return false;
    return true;
  }

  // decor: blocks tower placement within radius r
  const DECOR = [
    { art: "cactus", x: 70,  y: 80,  s: 3, r: 18 },
    { art: "cactus", x: 290, y: 80,  s: 3, r: 18 },
    { art: "bush",   x: 480, y: 70,  s: 3, r: 18 },
    { art: "cactus", x: 730, y: 90,  s: 3, r: 18 },
    { art: "bush",   x: 60,  y: 480, s: 3, r: 18 },
    { art: "rock",   x: 90,  y: 590, s: 3, r: 18 },
    { art: "rock",   x: 470, y: 480, s: 3, r: 18 },
    { art: "cactus", x: 270, y: 215, s: 3, r: 18 },
    { art: "bush",   x: 520, y: 230, s: 3, r: 18 },
    { art: "rock",   x: 720, y: 145, s: 3, r: 18 },
    { art: "cactus", x: 440, y: 600, s: 3, r: 18 },
    { art: "bush",   x: 640, y: 615, s: 3, r: 18 },
    { art: "cactus", x: 905, y: 120, s: 3, r: 18 },
    { art: "rock",   x: 815, y: 70,  s: 3, r: 18 },
  ];

  const BASE = { x: 868, y: 470 }; // Dr. Pingas stands here (end of road)

  /* ---------------- placement ---------------- */
  function canPlace(x, y, radius, towers) {
    if (x < radius + 4 || x > W - radius - 4 || y < radius + 4 || y > H - radius - 4) return false;
    if (distToPath(x, y) < PATH_RADIUS + radius - 4) return false;
    if (inLake(x, y)) return false;
    // keep off the island (castle home)
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
  let bg = null;

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

    // sandy ground with subtle checker
    c.fillStyle = "#ecd6a4";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#e6cd96";
    for (let y = 0; y < H; y += 32) {
      for (let x = (y / 32) % 2 ? 32 : 0; x < W; x += 64) {
        c.fillRect(x, y, 32, 32);
      }
    }
    // scattered speckles
    c.fillStyle = "#d9bd82";
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 320; i++) {
      const x = rnd() * W, y = rnd() * H;
      c.fillRect(Math.floor(x), Math.floor(y), 3, 3);
    }

    // lake
    c.fillStyle = "#2e72c8";
    c.strokeStyle = "#1b4a8c";
    c.lineWidth = 5;
    const L = LAKE;
    c.beginPath();
    c.moveTo(L.x + 40, L.y);
    c.quadraticCurveTo(L.x - 18, L.y + 60, L.x + 8, L.y + 150);
    c.quadraticCurveTo(L.x - 14, L.y + 250, L.x + 70, L.y + H);
    c.lineTo(W, H);
    c.lineTo(W, L.y - 10);
    c.quadraticCurveTo(L.x + 120, L.y - 26, L.x + 40, L.y);
    c.closePath();
    c.fill();
    c.stroke();
    // water shimmer
    c.fillStyle = "#5b9ade";
    for (let i = 0; i < 26; i++) {
      const x = L.x + 24 + rnd() * (L.w - 40);
      const y = L.y + 16 + rnd() * (L.h - 30);
      if (inLake(x, y)) c.fillRect(Math.floor(x), Math.floor(y), 10, 3);
    }

    // island
    c.fillStyle = "#ecd6a4";
    c.strokeStyle = "#caa45e";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(ISLAND.cx, ISLAND.cy, ISLAND.r, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // road: dark border then sand fill then center dots (classic map style)
    c.strokeStyle = "#a87b3e";
    roundedPath(c, PATH_RADIUS);
    c.strokeStyle = "#f7e3b2";
    roundedPath(c, PATH_RADIUS - 5);
    // path dots
    c.fillStyle = "#d8b878";
    for (let d = 26; d < TOTAL; d += 42) {
      const p = posAt(d);
      c.beginPath();
      c.arc(p.x, p.y, 5, 0, Math.PI * 2);
      c.fill();
    }

    // bridge planks where the road crosses water (segment into the island)
    const bridge = segs[segs.length - 2]; // (700,255)->(868,255) crosses lake edge
    c.fillStyle = "#9a6a30";
    for (const s of [segs[segs.length - 3], segs[segs.length - 2], segs[segs.length - 1]]) {
      const steps = Math.floor(s.len / 14);
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
    void bridge;

    // decor sprites
    for (const d of DECOR) {
      const cv = Sprites.get(d.art, { scale: d.s });
      c.drawImage(cv, Math.round(d.x - cv.width / 2), Math.round(d.y - cv.height + 8));
      // little shadow
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
    c.drawImage(sign, 14, 130 - PATH_RADIUS - sign.height - 6);

    return bg;
  }

  function background() {
    if (!bg) bakeBackground();
    return bg;
  }

  return {
    W, H, PATH_RADIUS, TOTAL, BASE, ISLAND,
    posAt, distToPath, canPlace, inLake, background,
  };
})();
