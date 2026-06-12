/* ===== PINGAS TD — vector art renderer (BTD6-style look) =====
 * Every sprite is drawn with canvas paths, gradients and gloss, then
 * baked to an offscreen canvas. Same API as the old pixel baker:
 *   Sprites.get(name, {pal, palId, scale, flip})
 *   Sprites.enemy(tier, {boss, scale, flip})
 * Original fair-use parody designs throughout.
 */
"use strict";

const Sprites = (() => {

  const OUT = "#1b1530"; // universal outline

  // enemy tier palettes: B body, D shade, E pupil
  const ENEMY_PALS = {
    blue:   { B: "#3a78f2", D: "#1c46b8", E: "#16306e" },
    green:  { B: "#3ecb55", D: "#1f9434", E: "#0e5c20" },
    red:    { B: "#f04848", D: "#b02020", E: "#6e1010" },
    yellow: { B: "#ffd23e", D: "#cf9612", E: "#7a5a08" },
    pink:   { B: "#ff74bc", D: "#cf3f88", E: "#7a1c4e" },
    shadow: { B: "#4a4664", D: "#2c2940", E: "#e23434" },
    metal:  { B: "#b9c0d4", D: "#767e98", E: "#e23434" },
    gold:   { B: "#ffce30", D: "#c08a10", E: "#6e4a06" },
  };

  /* ---------- tiny paint helpers (unit space) ---------- */
  function lin(c, x0, y0, x1, y1, a, b) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, a); g.addColorStop(1, b);
    return g;
  }
  function rad(c, x, y, r, a, b, fx = -0.3, fy = -0.35) {
    const g = c.createRadialGradient(x + r * fx, y + r * fy, r * 0.15, x, y, r);
    g.addColorStop(0, a); g.addColorStop(1, b);
    return g;
  }
  function lighten(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + 255 * f);
    const g = Math.min(255, ((n >> 8) & 255) + 255 * f);
    const b = Math.min(255, (n & 255) + 255 * f);
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  function ell(c, x, y, rx, ry, fill, stroke, lw = 0.7) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  function rr(c, x, y, w, h, r, fill, stroke, lw = 0.7) {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  function poly(c, pts, fill, stroke, lw = 0.7) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  function gloss(c, x, y, rx, ry, alpha = 0.35) {
    ell(c, x, y, rx, ry, `rgba(255,255,255,${alpha})`);
  }

  /* ---------- the hedgehog (16x16 units, faces right) ---------- */
  function drawHedge(c, pal, boss) {
    const B = pal.B, D = pal.D, E = pal.E || "#16306e";
    const spikes = boss ? 7 : 5;
    // back spikes fanning up-left
    for (let i = 0; i < spikes; i++) {
      const a = Math.PI * (0.55 + 0.62 * (i / (spikes - 1))); // up to back-left
      const bx = 8 + Math.cos(a) * 4.2, by = 8.6 + Math.sin(a) * 4.2;
      const tx = 8 + Math.cos(a) * (boss ? 8.2 : 7.4), ty = 8.6 + Math.sin(a) * (boss ? 8.2 : 7.4);
      const px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2);
      c.beginPath();
      c.moveTo(bx + px * 1.5, by + py * 1.5);
      c.quadraticCurveTo(tx + px * 0.4, ty + py * 0.4, tx - px * 0.6, ty - py * 0.6);
      c.lineTo(bx - px * 1.5, by - py * 1.5);
      c.closePath();
      c.fillStyle = lin(c, bx, by, tx, ty, B, D);
      c.fill();
      c.strokeStyle = OUT; c.lineWidth = 0.6; c.stroke();
    }
    // body
    ell(c, 8.5, 8.8, 5.1, 5.0, rad(c, 8.5, 8.8, 5.4, lighten(B, 0.25), D), OUT, 0.8);
    // muzzle
    ell(c, 11.2, 10.4, 2.6, 2.1, rad(c, 11.2, 10.4, 2.6, "#ffe7c4", "#e8b87e"), OUT, 0.55);
    // eye (big glossy white with pupil)
    ell(c, 11.0, 7.4, 2.3, 2.7, "#ffffff", OUT, 0.6);
    if (boss) { // angry brow
      poly(c, [[8.6, 5.0], [13.2, 6.6], [13.0, 7.6], [8.4, 6.0]], D, OUT, 0.5);
    }
    ell(c, 11.8, 7.9, 1.0, 1.4, E);
    gloss(c, 11.5, 7.2, 0.4, 0.55, 0.85);
    // nose
    ell(c, 13.5, 9.3, 0.85, 0.65, OUT);
    gloss(c, 13.3, 9.1, 0.25, 0.18, 0.6);
    // mouth
    c.beginPath();
    if (boss) c.arc(11.6, 12.6, 1.3, Math.PI * 1.15, Math.PI * 1.85); // frown
    else c.arc(11.4, 11.2, 1.4, Math.PI * 0.12, Math.PI * 0.8);       // smile
    c.strokeStyle = OUT; c.lineWidth = 0.55; c.stroke();
    // shoes
    rr(c, 5.2, 13.2, 3.4, 2.3, 1.1, lin(c, 5, 13, 5, 15.5, "#f25454", "#9c1f1f"), OUT, 0.6);
    rr(c, 9.4, 13.2, 3.6, 2.3, 1.1, lin(c, 9, 13, 9, 15.5, "#f25454", "#9c1f1f"), OUT, 0.6);
    c.fillStyle = "#fff";
    c.fillRect(6.3, 13.9, 1.2, 0.8);
    c.fillRect(10.6, 13.9, 1.2, 0.8);
  }

  /* ---------- towers & friends (16x16 unless noted) ---------- */

  function drawClucko(c) {
    // legs
    c.strokeStyle = "#c79a18"; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(6.6, 12.6); c.lineTo(6.4, 14.8); c.moveTo(9.4, 12.6); c.lineTo(9.6, 14.8); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 0.5;
    poly(c, [[5.2, 15.2], [6.4, 14.4], [7.4, 15.2]], "#ffb627", OUT, 0.45);
    poly(c, [[8.6, 15.2], [9.6, 14.4], [10.8, 15.2]], "#ffb627", OUT, 0.45);
    // body (metal egg)
    ell(c, 8, 10.2, 3.6, 3.3, rad(c, 8, 10.2, 3.8, "#f2f4fb", "#a9aec4"), OUT, 0.8);
    // wing
    ell(c, 6.6, 10.6, 1.6, 2.0, lin(c, 5, 9, 8, 12, "#d9dded", "#8a90aa"), OUT, 0.55);
    // head
    ell(c, 9.2, 4.9, 2.9, 2.7, rad(c, 9.2, 4.9, 3.0, "#ffffff", "#c2c6da"), OUT, 0.8);
    // comb
    for (let i = 0; i < 3; i++) {
      ell(c, 7.7 + i * 1.4, 1.9 + (i === 1 ? -0.5 : 0), 0.85, 1.1, lin(c, 0, 1, 0, 3, "#ff5a5a", "#c02020"), OUT, 0.5);
    }
    // beak
    poly(c, [[11.6, 4.6], [14.6, 5.4], [11.6, 6.4]], lin(c, 11, 4, 15, 6, "#ffc23e", "#e08a10"), OUT, 0.55);
    // eye
    ell(c, 10.4, 4.4, 0.95, 1.05, "#fff", OUT, 0.45);
    ell(c, 10.7, 4.5, 0.45, 0.5, "#1b1530");
    gloss(c, 8.4, 3.9, 1.0, 0.6, 0.5);
    gloss(c, 7.0, 9.0, 1.2, 0.7, 0.4);
  }

  function drawDrillbert(c) {
    // treads
    rr(c, 2.2, 11.4, 11.6, 3.4, 1.7, lin(c, 0, 11, 0, 15, "#4a4a58", "#23232e"), OUT, 0.7);
    for (let i = 0; i < 4; i++) ell(c, 4.2 + i * 2.6, 13.1, 0.85, 0.85, "#8a8a9c", OUT, 0.4);
    // dome body
    ell(c, 7.4, 8.0, 4.6, 4.3, rad(c, 7.4, 7.6, 4.8, "#7ade62", "#2a7a30"), OUT, 0.8);
    // belt
    rr(c, 3.4, 9.4, 8.0, 1.6, 0.8, lin(c, 0, 9, 0, 11, "#5a5a6e", "#30303e"), OUT, 0.5);
    // drill cone
    poly(c, [[11.2, 6.4], [15.8, 8.1], [11.2, 9.8]],
      lin(c, 11, 6, 16, 9, "#e8ebf7", "#8a90aa"), OUT, 0.7);
    c.strokeStyle = "#6f7287"; c.lineWidth = 0.45;
    c.beginPath(); c.moveTo(12.0, 6.8); c.lineTo(12.0, 9.4); c.moveTo(13.2, 7.2); c.lineTo(13.2, 9.0); c.moveTo(14.4, 7.7); c.lineTo(14.4, 8.6); c.stroke();
    // eyes
    ell(c, 6.0, 6.6, 1.1, 1.25, "#fff", OUT, 0.5);
    ell(c, 8.8, 6.6, 1.1, 1.25, "#fff", OUT, 0.5);
    ell(c, 6.3, 6.8, 0.5, 0.55, "#1b1530");
    ell(c, 9.1, 6.8, 0.5, 0.55, "#1b1530");
    gloss(c, 5.6, 5.2, 1.4, 0.8, 0.4);
  }

  function drawSlick(c) {
    // coiled tail
    ell(c, 6.2, 12.6, 4.6, 2.6, rad(c, 6.2, 12.4, 4.6, "#b070e8", "#5e3390"), OUT, 0.75);
    ell(c, 6.2, 12.4, 2.9, 1.5, rad(c, 6.2, 12.3, 3.0, "#8a4cc4", "#4e2a78"), OUT, 0.55);
    // body up
    ell(c, 8.6, 7.6, 2.7, 3.6, rad(c, 8.6, 7.0, 3.6, "#c98ef2", "#6a3a96"), OUT, 0.75);
    // head
    ell(c, 9.2, 4.4, 2.3, 2.0, rad(c, 9.2, 4.2, 2.4, "#d9aaf7", "#7a48a8"), OUT, 0.7);
    // eyes
    ell(c, 8.6, 4.0, 0.85, 0.95, "#fff", OUT, 0.45);
    ell(c, 10.4, 4.0, 0.85, 0.95, "#fff", OUT, 0.45);
    ell(c, 8.8, 4.2, 0.4, 0.45, "#1b1530");
    ell(c, 10.6, 4.2, 0.4, 0.45, "#1b1530");
    // nozzle
    rr(c, 11.2, 4.0, 3.2, 1.5, 0.7, lin(c, 11, 4, 15, 5, "#9aa0b8", "#5a6076"), OUT, 0.5);
    ell(c, 14.6, 4.75, 0.7, 0.75, "#3a2a52", OUT, 0.45);
    // drip
    ell(c, 14.8, 6.6, 0.55, 0.8, "#8a3ae0");
    gloss(c, 8.0, 3.4, 0.9, 0.5, 0.5);
    gloss(c, 4.6, 11.7, 1.4, 0.6, 0.3);
  }

  function drawBomzo(c) {
    // feet
    ell(c, 5.6, 14.6, 1.5, 0.9, "#2c2c38", OUT, 0.5);
    ell(c, 10.4, 14.6, 1.5, 0.9, "#2c2c38", OUT, 0.5);
    // round bomb body
    ell(c, 8, 9.2, 4.9, 4.7, rad(c, 8, 9.2, 5.2, "#5a5a6e", "#16161e"), OUT, 0.85);
    // cap
    rr(c, 6.0, 3.2, 4.0, 2.0, 0.9, lin(c, 6, 3, 6, 5.4, "#f25454", "#9c1f1f"), OUT, 0.6);
    // fuse + spark
    c.strokeStyle = "#caa45e"; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(8, 3.2); c.quadraticCurveTo(8.8, 1.8, 9.9, 1.7); c.stroke();
    ell(c, 10.4, 1.5, 0.8, 0.8, rad(c, 10.4, 1.5, 0.9, "#fff7c4", "#ff9a2a"));
    // eyes
    ell(c, 6.4, 8.2, 1.2, 1.35, "#fff", OUT, 0.5);
    ell(c, 9.6, 8.2, 1.2, 1.35, "#fff", OUT, 0.5);
    ell(c, 6.8, 8.4, 0.55, 0.6, "#1b1530");
    ell(c, 10.0, 8.4, 0.55, 0.6, "#1b1530");
    // grin
    c.beginPath(); c.arc(8, 10.6, 1.7, Math.PI * 0.1, Math.PI * 0.9);
    c.strokeStyle = "#0c0c12"; c.lineWidth = 0.6; c.stroke();
    gloss(c, 5.8, 6.4, 1.6, 1.0, 0.25);
  }

  function drawBuzzbot(c) {
    // wings
    ell(c, 4.6, 3.4, 2.8, 1.7, "rgba(255,255,255,.65)", "rgba(120,130,170,.8)", 0.45);
    ell(c, 11.4, 3.4, 2.8, 1.7, "rgba(255,255,255,.65)", "rgba(120,130,170,.8)", 0.45);
    // striped abdomen
    ell(c, 8, 9.6, 3.6, 4.6, rad(c, 8, 9.0, 4.6, "#ffd95e", "#caa410"), OUT, 0.8);
    c.save();
    c.beginPath(); c.ellipse(8, 9.6, 3.6, 4.6, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = "#2c2c38";
    c.fillRect(4, 8.0, 8, 1.5);
    c.fillRect(4, 11.0, 8, 1.5);
    c.restore();
    c.strokeStyle = OUT; c.lineWidth = 0.7;
    c.beginPath(); c.ellipse(8, 9.6, 3.6, 4.6, 0, 0, Math.PI * 2); c.stroke();
    // stinger
    poly(c, [[7.2, 13.9], [8, 15.8], [8.8, 13.9]], "#5a5a6e", OUT, 0.5);
    // head
    ell(c, 8, 4.6, 2.5, 2.2, rad(c, 8, 4.4, 2.6, "#ffe89a", "#cfa928"), OUT, 0.7);
    // big lens eyes
    ell(c, 6.9, 4.4, 1.05, 1.2, rad(c, 6.9, 4.2, 1.2, "#9ae8ff", "#2a7ab8"), OUT, 0.45);
    ell(c, 9.1, 4.4, 1.05, 1.2, rad(c, 9.1, 4.2, 1.2, "#9ae8ff", "#2a7ab8"), OUT, 0.45);
    // antennae
    c.strokeStyle = OUT; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(7.0, 2.6); c.lineTo(6.3, 1.3); c.moveTo(9.0, 2.6); c.lineTo(9.7, 1.3); c.stroke();
    ell(c, 6.2, 1.1, 0.4, 0.4, "#ffd23e");
    ell(c, 9.8, 1.1, 0.4, 0.4, "#ffd23e");
    gloss(c, 6.6, 7.6, 1.2, 0.8, 0.35);
  }

  function drawYolker(c) {
    // base chassis (egg shaped)
    ell(c, 7.2, 11.6, 5.4, 3.6, rad(c, 7.2, 11.0, 5.4, "#f25454", "#8c1818"), OUT, 0.85);
    rr(c, 3.0, 10.4, 8.4, 2.2, 1.1, "rgba(255,255,255,.85)", OUT, 0.55);
    ell(c, 7.2, 11.5, 1.1, 1.1, "#ffd23e", OUT, 0.5);
    // turret mount
    ell(c, 8.4, 8.6, 2.6, 1.8, lin(c, 6, 7, 11, 10, "#9aa0b8", "#5a6076"), OUT, 0.6);
    // big barrel angled up-right
    c.save();
    c.translate(8.8, 8.2);
    c.rotate(-0.62);
    rr(c, 0, -1.25, 7.4, 2.5, 1.0, lin(c, 0, -1.3, 0, 1.3, "#e8ebf7", "#7c8298"), OUT, 0.7);
    rr(c, 6.2, -1.55, 1.6, 3.1, 0.6, "#5a6076", OUT, 0.55);
    c.restore();
    // gold trim
    ell(c, 8.4, 8.4, 1.2, 1.0, rad(c, 8.4, 8.2, 1.2, "#ffe89a", "#cfa018"), OUT, 0.5);
    gloss(c, 5.0, 10.4, 1.6, 0.8, 0.3);
  }

  function drawFarm(c) {
    // roof
    poly(c, [[1.6, 7.2], [8, 1.6], [14.4, 7.2]], lin(c, 0, 1, 0, 7, "#8a90aa", "#4e5468"), OUT, 0.8);
    // walls
    rr(c, 2.6, 7.0, 10.8, 6.6, 0.8, lin(c, 0, 7, 0, 14, "#f25454", "#9c1f1f"), OUT, 0.8);
    // door with X trim
    rr(c, 6.3, 8.6, 3.4, 5.0, 0.6, lin(c, 6, 8, 10, 14, "#fff", "#d9dded"), OUT, 0.6);
    c.strokeStyle = "#b02020"; c.lineWidth = 0.55;
    c.beginPath();
    c.moveTo(6.5, 8.9); c.lineTo(9.5, 13.3);
    c.moveTo(9.5, 8.9); c.lineTo(6.5, 13.3);
    c.stroke();
    // loft window
    ell(c, 8, 5.6, 1.2, 1.2, "#fff7d9", OUT, 0.55);
    // pingas crops out front
    for (let i = 0; i < 4; i++) {
      ell(c, 3.4 + i * 3.1, 14.6, 1.0, 0.75, rad(c, 3.4 + i * 3.1, 14.4, 1.0, "#ffb8d8", "#d9789e"), OUT, 0.4);
    }
    gloss(c, 4.6, 8.4, 1.2, 0.6, 0.25);
  }

  function drawSlave(c) {
    // hood / head
    ell(c, 7.4, 4.6, 2.9, 3.0, rad(c, 7.4, 4.2, 3.1, "#8a90aa", "#454a5e"), OUT, 0.75);
    ell(c, 7.4, 5.0, 1.9, 1.7, "#23232e", OUT, 0.5);
    // glowing eyes
    ell(c, 6.6, 4.9, 0.5, 0.55, "#7ce8ff");
    ell(c, 8.2, 4.9, 0.5, 0.55, "#7ce8ff");
    // robe body
    poly(c, [[4.4, 7.2], [10.4, 7.2], [11.2, 14.6], [3.6, 14.6]],
      lin(c, 0, 7, 0, 15, "#9aa0b8", "#4e5468"), OUT, 0.75);
    c.strokeStyle = "#3a3f52"; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(5.6, 8.4); c.lineTo(5.2, 13.8); c.moveTo(9.2, 8.4); c.lineTo(9.6, 13.8); c.stroke();
    // sack
    ell(c, 12.6, 11.6, 2.3, 2.7, rad(c, 12.6, 11.0, 2.7, "#b88a52", "#6e4a22"), OUT, 0.7);
    c.strokeStyle = "#4e3416"; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(11.6, 9.4); c.lineTo(10.2, 7.6); c.stroke();
    ell(c, 12.2, 10.6, 0.5, 0.4, "#ffb8d8"); // a pingas peeking out. no comment.
    gloss(c, 6.2, 3.2, 1.0, 0.6, 0.35);
  }

  // Dr. Pingas himself — 18x20 (hero + citadel boss-man)
  function drawPingas(c) {
    // hover pad
    ell(c, 9, 18.4, 6.2, 1.6, lin(c, 3, 17, 15, 20, "#8a90aa", "#3a3f52"), OUT, 0.7);
    ell(c, 9, 19.2, 3.0, 0.8, "rgba(124,232,255,.55)");
    // egg body: red jacket
    ell(c, 9, 12.0, 6.0, 5.4, rad(c, 9, 11.2, 6.4, "#f25454", "#8c1818"), OUT, 0.85);
    // black lower
    c.save();
    c.beginPath(); c.ellipse(9, 12.0, 6.0, 5.4, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = lin(c, 0, 13.5, 0, 18, "#2c2c38", "#0e0e14");
    c.fillRect(2, 13.6, 14, 6);
    c.restore();
    c.strokeStyle = OUT; c.lineWidth = 0.85;
    c.beginPath(); c.ellipse(9, 12.0, 6.0, 5.4, 0, 0, Math.PI * 2); c.stroke();
    // yellow chest trapezoid
    poly(c, [[6.6, 7.6], [11.4, 7.6], [10.2, 12.8], [7.8, 12.8]],
      lin(c, 0, 7, 0, 13, "#ffe06a", "#d9a018"), OUT, 0.6);
    // gloves
    ell(c, 2.9, 11.2, 1.7, 1.5, rad(c, 2.9, 10.9, 1.7, "#ffffff", "#b8bccf"), OUT, 0.6);
    ell(c, 15.1, 11.2, 1.7, 1.5, rad(c, 15.1, 10.9, 1.7, "#ffffff", "#b8bccf"), OUT, 0.6);
    // head
    ell(c, 9, 4.6, 3.3, 2.9, rad(c, 9, 4.2, 3.4, "#ffd9ae", "#d9a366"), OUT, 0.75);
    // goggles
    rr(c, 6.2, 3.0, 5.6, 1.7, 0.8, lin(c, 6, 3, 12, 5, "#7ce8ff", "#2a7ab8"), OUT, 0.55);
    c.strokeStyle = OUT; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(9, 3.0); c.lineTo(9, 4.7); c.stroke();
    // grand mustache
    ell(c, 5.6, 6.6, 3.0, 1.5, rad(c, 5.6, 6.2, 3.0, "#a86a32", "#5f3a16"), OUT, 0.6);
    ell(c, 12.4, 6.6, 3.0, 1.5, rad(c, 12.4, 6.2, 3.0, "#a86a32", "#5f3a16"), OUT, 0.6);
    ell(c, 9, 6.1, 1.0, 0.7, "#ffd9ae", OUT, 0.45); // nose over the stache
    gloss(c, 6.8, 9.4, 1.6, 0.9, 0.3);
  }

  function drawCastle(c) {
    // flag
    c.strokeStyle = OUT; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(8, 0.6); c.lineTo(8, 3.2); c.stroke();
    poly(c, [[8, 0.6], [11, 1.5], [8, 2.4]], "#f25454", OUT, 0.45);
    // tower keep
    rr(c, 5.4, 3.2, 5.2, 5.4, 0.5, lin(c, 5, 3, 11, 9, "#d9dded", "#8a90aa"), OUT, 0.65);
    // crenellations
    for (let i = 0; i < 3; i++) c.fillStyle = "#c2c6da", c.fillRect(5.4 + i * 1.85, 2.4, 1.3, 1.0);
    // main hall
    rr(c, 2.0, 7.4, 12.0, 7.4, 0.7, lin(c, 2, 7, 14, 15, "#e8ebf7", "#9aa0b8"), OUT, 0.75);
    for (let i = 0; i < 4; i++) c.fillStyle = "#c2c6da", c.fillRect(2.4 + i * 3.0, 6.6, 1.6, 1.0);
    // gate
    c.beginPath();
    c.moveTo(6.4, 14.8); c.lineTo(6.4, 11.4);
    c.arc(8, 11.4, 1.6, Math.PI, 0);
    c.lineTo(9.6, 14.8);
    c.closePath();
    c.fillStyle = lin(c, 0, 10, 0, 15, "#8c1818", "#4e0e0e"); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 0.6; c.stroke();
    // windows
    ell(c, 4.2, 9.4, 0.6, 0.9, "#3a5e8c", OUT, 0.4);
    ell(c, 11.8, 9.4, 0.6, 0.9, "#3a5e8c", OUT, 0.4);
    ell(c, 8, 5.0, 0.6, 0.9, "#3a5e8c", OUT, 0.4);
  }

  function drawCactus(c) {
    const G = (x0, y0, x1, y1) => lin(c, x0, y0, x1, y1, "#6ad9a8", "#2e8a6a");
    rr(c, 4.6, 2.0, 2.8, 10.6, 1.4, G(4, 2, 8, 12), OUT, 0.6);
    rr(c, 1.2, 4.4, 2.2, 4.4, 1.1, G(1, 4, 3, 9), OUT, 0.55);
    rr(c, 1.2, 7.2, 4.0, 1.8, 0.9, G(1, 7, 5, 9), OUT, 0.55);
    rr(c, 8.6, 3.2, 2.2, 3.8, 1.1, G(9, 3, 11, 7), OUT, 0.55);
    rr(c, 6.8, 5.4, 4.0, 1.6, 0.8, G(7, 5, 11, 7), OUT, 0.55);
    c.fillStyle = "rgba(255,255,255,.5)";
    for (let i = 0; i < 5; i++) c.fillRect(5.3 + (i % 2), 3 + i * 1.8, 0.5, 0.5);
  }

  function drawBush(c) {
    ell(c, 3.6, 4.8, 3.2, 2.6, rad(c, 3.6, 4.2, 3.2, "#6ad9a8", "#2e8a6a"), OUT, 0.6);
    ell(c, 8.4, 4.6, 3.4, 2.8, rad(c, 8.4, 4.0, 3.4, "#7ae8b8", "#2e8a6a"), OUT, 0.6);
    ell(c, 6, 3.0, 2.8, 2.2, rad(c, 6, 2.5, 2.8, "#8af2c4", "#3aa87e"), OUT, 0.6);
    gloss(c, 5.2, 2.2, 1.0, 0.5, 0.3);
  }

  function drawRock(c) {
    poly(c, [[1.2, 5.6], [3.0, 2.2], [6.4, 1.2], [9.8, 2.4], [11.0, 5.6], [8.6, 6.4], [3.2, 6.4]],
      lin(c, 2, 1, 10, 6, "#c2c6da", "#767e98"), OUT, 0.65);
    c.strokeStyle = "rgba(80,86,110,.6)"; c.lineWidth = 0.45;
    c.beginPath(); c.moveTo(4.4, 2.4); c.lineTo(5.6, 5.8); c.moveTo(7.8, 2.0); c.lineTo(7.2, 6.0); c.stroke();
    gloss(c, 4.0, 2.4, 1.4, 0.7, 0.3);
  }

  function drawSign(c) {
    rr(c, 7.0, 8.6, 1.6, 4.4, 0.5, lin(c, 7, 8, 9, 13, "#a86a32", "#5f3a16"), OUT, 0.55);
    rr(c, 0.8, 1.2, 14.4, 7.0, 1.2, lin(c, 0, 1, 0, 8, "#fffdf2", "#d9d2b8"), OUT, 0.75);
    c.fillStyle = "#e23434";
    c.font = "bold 4.6px Trebuchet MS, Verdana, sans-serif";
    c.textAlign = "center";
    c.fillText("GO!", 8, 6.4);
    c.textAlign = "left";
  }

  /* ---------- HUD icons (8x8) ---------- */
  function drawHeart(c) {
    c.beginPath();
    c.moveTo(4, 7.4);
    c.bezierCurveTo(-1.2, 3.6, 1.4, -0.4, 4, 2.2);
    c.bezierCurveTo(6.6, -0.4, 9.2, 3.6, 4, 7.4);
    c.fillStyle = rad(c, 4, 3, 4, "#ff7474", "#c01818");
    c.fill();
    c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
    gloss(c, 2.6, 2.2, 0.8, 0.5, 0.55);
  }
  function drawCoin(c) {
    ell(c, 4, 4, 3.5, 3.5, rad(c, 4, 3.4, 3.6, "#ffe89a", "#cfa018"), OUT, 0.55);
    ell(c, 4, 4, 2.2, 2.2, null, "#b8860b", 0.5);
    c.fillStyle = "#9a7008";
    c.font = "bold 3.6px Trebuchet MS, Verdana, sans-serif";
    c.textAlign = "center";
    c.fillText("$", 4, 5.3);
    c.textAlign = "left";
  }
  function drawFlag(c) {
    c.strokeStyle = OUT; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(1.4, 0.6); c.lineTo(1.4, 7.8); c.stroke();
    poly(c, [[1.4, 0.8], [7.4, 2.0], [1.4, 3.6]], lin(c, 1, 0, 7, 3, "#ff5a5a", "#b02020"), OUT, 0.5);
  }
  function drawStar(c) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 1.6 : 3.6;
      const a = -Math.PI / 2 + (Math.PI * i) / 5;
      c[i ? "lineTo" : "moveTo"](4 + Math.cos(a) * r, 4.2 + Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = rad(c, 4, 3.4, 3.8, "#fff2b8", "#e0a818");
    c.fill();
    c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke();
  }

  /* ---------- registry & baking ---------- */
  const BAKERS = {
    hedge: (c, o) => drawHedge(c, o.pal || ENEMY_PALS.blue, false),
    hedge_boss: (c, o) => drawHedge(c, o.pal || ENEMY_PALS.gold, true),
    clucko: drawClucko, drillbert: drawDrillbert, slick: drawSlick,
    bomzo: drawBomzo, buzzbot: drawBuzzbot, yolker: drawYolker,
    farm: drawFarm, slave: drawSlave,
    hero: drawPingas, pingas: drawPingas, castle: drawCastle,
    cactus: drawCactus, bush: drawBush, rock: drawRock, sign: drawSign,
    icon_heart: drawHeart, icon_coin: drawCoin, icon_flag: drawFlag, icon_star: drawStar,
  };

  const SIZES = {
    hedge: [16, 16], hedge_boss: [16, 16],
    clucko: [16, 16], drillbert: [16, 16], slick: [16, 16],
    bomzo: [16, 16], buzzbot: [16, 16], yolker: [16, 16],
    farm: [16, 16], slave: [16, 16],
    hero: [18, 20], pingas: [18, 20], castle: [16, 16],
    cactus: [12, 13], bush: [12, 8], rock: [12, 7], sign: [16, 13],
    icon_heart: [8, 8], icon_coin: [8, 8], icon_flag: [8, 8], icon_star: [8, 8],
  };

  const cache = new Map();

  function get(name, opts = {}) {
    const scale = opts.scale || 1;
    const flip = !!opts.flip;
    const palId = opts.palId || "";
    const key = `${name}|${palId}|${scale}|${flip}`;
    let cv = cache.get(key);
    if (!cv) {
      const [w, h] = SIZES[name];
      cv = document.createElement("canvas");
      cv.width = Math.ceil(w * scale);
      cv.height = Math.ceil(h * scale);
      const c = cv.getContext("2d");
      if (flip) { c.translate(cv.width, 0); c.scale(-1, 1); }
      c.scale(scale, scale);
      c.lineJoin = "round";
      c.lineCap = "round";
      BAKERS[name](c, opts);
      cache.set(key, cv);
    }
    return cv;
  }

  function enemy(tier, opts = {}) {
    const art = opts.boss ? "hedge_boss" : "hedge";
    return get(art, {
      pal: ENEMY_PALS[tier], palId: tier + (opts.boss ? "+b" : ""),
      scale: opts.scale || 2, flip: opts.flip,
    });
  }

  function draw(ctx, cv, x, y, anchor = "center") {
    if (anchor === "feet") ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height));
    else ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height / 2));
  }

  function icon(el, name, scale = 2) {
    const cv = get(name, { scale });
    el.innerHTML = "";
    el.appendChild(cv);
  }

  return { get, enemy, draw, icon, ENEMY_PALS };
})();
