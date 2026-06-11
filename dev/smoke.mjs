/* Headless smoke test: boots the game, plays several rounds at high speed,
 * places/upgrades towers, fast-forwards to the 67.67 final round, and
 * captures screenshots along the way.  Run:  node dev/smoke.mjs
 */
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shots = path.join(root, "dev", "shots");
fs.mkdirSync(shots, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const p = path.join(root, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  try {
    const data = fs.readFileSync(p);
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("nope");
  }
});
await new Promise(r => server.listen(8741, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1340, height: 760 } });
const errors = [];
page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

await page.goto("http://localhost:8741/");
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(shots, "01-menu.png") });

// start a hard game (all 68 rounds available)
await page.click('.diff-btn[data-diff="hard"]');
await page.waitForTimeout(300);

// place a couple of starter towers via the real placement flow
async function place(towerIndex, x, y) {
  const cards = page.locator(".tcard");
  await cards.nth(towerIndex).click();
  const canvas = page.locator("#game");
  const box = await canvas.boundingBox();
  const sx = box.width / 1000, sy = box.height / 640;
  await page.mouse.move(box.x + x * sx, box.y + y * sy);
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(shots, "02-placing.png") });
  await page.mouse.click(box.x + x * sx, box.y + y * sy);
  await page.keyboard.press("Escape");
}
await place(0, 250, 255);   // clucko
await place(1, 480, 370);   // drillbert

const state1 = await page.evaluate(() => ({
  towers: PTD.game.towers.length, cash: Math.floor(PTD.game.cash), phase: PTD.game.phase,
}));
console.log("after placement:", state1);
if (state1.towers !== 2) errors.push(`expected 2 towers, got ${state1.towers}`);

// red-circle check: try to place on the path (must be rejected)
const before = state1.towers;
await page.locator(".tcard").nth(0).click();
const box = await page.locator("#game").boundingBox();
await page.mouse.move(box.x + 170 * (box.width / 1000), box.y + 200 * (box.height / 640));
await page.waitForTimeout(80);
await page.screenshot({ path: path.join(shots, "03-invalid-placement.png") });
await page.mouse.click(box.x + 170 * (box.width / 1000), box.y + 200 * (box.height / 640));
await page.keyboard.press("Escape");
const after = await page.evaluate(() => PTD.game.towers.length);
if (after !== before) errors.push("tower was placed on the path!");

// run the first rounds at 3x with auto-start
await page.click("#btn-speed");
await page.check("#chk-auto");
await page.click("#btn-start");

// give the player a sandbox boost so the sim can survive deep rounds quickly
await page.waitForTimeout(500);
await page.evaluate(() => { PTD.game.cash += 20000; PTD.game.gainXp(6000); });

// build a real defense through the UI-equivalent API
await page.evaluate(() => {
  const spots = [[300, 250], [330, 380], [560, 200], [560, 480], [650, 320], [770, 200], [420, 480], [200, 480]];
  const types = ["bomzo", "buzzbot", "slick", "yolker", "drillbert", "clucko", "buzzbot", "bomzo"];
  for (let i = 0; i < spots.length; i++) {
    if (PTD.GameMap.canPlace(spots[i][0], spots[i][1], 21, PTD.game.towers)) {
      const t = new PTD.Towers.Tower(types[i], spots[i][0], spots[i][1], 1);
      PTD.game.towers.push(t);
      // max out one path, two tiers in the other (validates the BTD5 rule)
      for (let k = 0; k < 4; k++) if (t.canUpgrade(0, PTD.game.level).ok) t.buyUpgrade(0);
      for (let k = 0; k < 2; k++) if (t.canUpgrade(1, PTD.game.level).ok) t.buyUpgrade(1);
    }
  }
});
const rule = await page.evaluate(() => {
  const t = PTD.game.towers.find(t => t.tiers[0] === 4);
  return t ? t.canUpgrade(1, PTD.game.level) : null;
});
console.log("path rule check (should be blocked):", rule);
if (rule && rule.ok) errors.push("BTD5 one-path rule not enforced!");

// let it play a few rounds
await page.waitForTimeout(9000);
await page.screenshot({ path: path.join(shots, "04-midgame.png") });
// close-up of the action near the spawn road
const cb = await page.locator("#game").boundingBox();
await page.screenshot({
  path: path.join(shots, "04b-closeup.png"),
  clip: { x: cb.x, y: cb.y, width: cb.width * 0.55, height: cb.height * 0.6 },
});
let st = await page.evaluate(() => ({ round: PTD.game.round, lives: PTD.game.lives, level: PTD.game.level, phase: PTD.game.phase }));
console.log("midgame:", st);
if (st.phase === "over") errors.push("lost the game in early rounds — balance is way off");

// open the upgrade panel on the first tower
await page.evaluate(() => { PTD.game.selected = PTD.game.towers[0]; });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(shots, "05-upgrades.png") });

// jump near the end: round 66, huge bank, strong level, serious defense
await page.evaluate(() => {
  const g = PTD.game;
  g.enemies = []; g.projectiles = []; g.waves = null;
  g.phase = "build"; g.round = 65; g.cash = 250000; g.lives = 100;
  g.gainXp(100000);
  g.selected = null;
  const maxed = (id, x, y, pathFirst = 0) => {
    const r = PTD.Towers.TYPES[id].radius;
    if (!PTD.GameMap.canPlace(x, y, r, g.towers)) return false;
    const t = new PTD.Towers.Tower(id, x, y, 1);
    for (let k = 0; k < 4; k++) if (t.canUpgrade(pathFirst, g.level).ok) t.buyUpgrade(pathFirst);
    for (let k = 0; k < 2; k++) if (t.canUpgrade(1 - pathFirst, g.level).ok) t.buyUpgrade(1 - pathFirst);
    g.towers.push(t);
    return true;
  };
  // beef up the early towers
  for (const t of g.towers) {
    for (let k = 0; k < 4; k++) if (t.canUpgrade(0, g.level).ok) t.buyUpgrade(0);
    for (let k = 0; k < 2; k++) if (t.canUpgrade(1, g.level).ok) t.buyUpgrade(1);
  }
  // glue coverage along the whole route
  maxed("slick", 210, 180, 0); maxed("slick", 430, 250, 0);
  maxed("slick", 320, 505, 0); maxed("slick", 540, 505, 0);
  maxed("slick", 640, 500, 0); maxed("slick", 790, 300, 0);
  maxed("slick", 745, 350, 0);
  // yolker artillery battery (map-wide)
  const spots = [[80, 250], [80, 400], [100, 540], [940, 120], [880, 60], [200, 60],
                 [500, 600], [560, 615], [200, 600], [770, 170], [540, 60], [940, 200]];
  for (const [x, y] of spots) maxed("yolker", x, y, 0);
  // buzz swarm mid-map, focused on the strongest target
  maxed("buzzbot", 470, 250, 0); maxed("buzzbot", 530, 370, 0);
  maxed("buzzbot", 300, 370, 0); maxed("buzzbot", 645, 475, 0);
  for (const t of g.towers) if (t.def.id === "buzzbot") t.targetMode = "strong";
  // bombers for the gold floods
  maxed("bomzo", 410, 480, 0); maxed("bomzo", 560, 300, 1);
  // economy corner: farm drops pingases, slave hoovers them up
  maxed("farm", 350, 60, 0); maxed("slave", 430, 60, 0);
});
await page.waitForTimeout(300);

// play rounds 66-67, then the 67.67 final
await page.uncheck("#chk-auto");
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => { if (PTD.game.phase === "build") PTD.startRound(); });
  // wait for the round to finish or the final to start
  for (let w = 0; w < 240; w++) {
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => ({ phase: PTD.game.phase, round: PTD.game.round, final: PTD.game.finalRound, t: PTD.game.surviveT }));
    if (s.final && s.t > 2 && s.t < 22) {
      await page.screenshot({ path: path.join(shots, "06-final-round.png") });
    }
    if (s.phase !== "round") break;
  }
  const s = await page.evaluate(() => ({ phase: PTD.game.phase, round: PTD.game.round, won: PTD.game.won, lives: PTD.game.lives }));
  console.log("late round state:", s);
  if (s.phase === "over") break;
}

const end = await page.evaluate(() => ({ phase: PTD.game.phase, won: PTD.game.won, round: PTD.game.round, lives: PTD.game.lives }));
console.log("END:", end);
await page.screenshot({ path: path.join(shots, "07-end.png") });
if (end.phase !== "over") errors.push("game did not reach an end state");
else if (!end.won) console.log("NOTE: lost the final — check balance/screenshots");

// ---- freeplay: continue past 67.67 into round 69 ----
if (end.won) {
  console.log("pre-freeplay:", await page.evaluate(() => ({
    auto: document.getElementById("chk-auto").checked,
    total: PTD.game.totalRounds,
  })));
  await page.click("#btn-freeplay");
  await page.waitForTimeout(2000);
  // a player may also start manually — either way round 69 must run
  if (await page.evaluate(() => PTD.game.phase === "build")) {
    console.log("auto-start idle, clicking START");
    await page.click("#btn-start");
  }
  await page.waitForTimeout(4000);
  const fp = await page.evaluate(() => ({
    phase: PTD.game.phase, round: PTD.game.round,
    freeplay: PTD.game.freeplay, enemies: PTD.game.enemies.length,
    pickups: PTD.game.pickups.length,
  }));
  console.log("freeplay:", fp);
  if (!fp.freeplay || fp.round < 69) errors.push("freeplay did not continue past 67.67");
  await page.screenshot({ path: path.join(shots, "10-freeplay.png") });
}

// ---- second map: menu -> GREEN HILL GAUNTLET -> play round 1 ----
await page.evaluate(() => {
  document.getElementById("menu").classList.remove("hidden");
  document.getElementById("endscreen").classList.add("hidden");
  const g = PTD.game;
  g.enemies = []; g.towers = []; g.projectiles = []; g.pickups = []; g.waves = null;
  g.phase = "menu";
});
await page.click('.map-btn[data-map="hills"]');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shots, "11-menu-hills.png") });
await page.click('.diff-btn[data-diff="easy"]');
await page.evaluate(() => {
  if (PTD.GameMap.canPlace(500, 170, 19, PTD.game.towers)) {
    PTD.game.towers.push(new PTD.Towers.Tower("clucko", 500, 170, PTD.game.diff.priceMul));
  }
  PTD.startRound();
});
await page.waitForTimeout(5000);
const m2 = await page.evaluate(() => ({
  phase: PTD.game.phase, round: PTD.game.round,
  lives: PTD.game.lives, map: PTD.GameMap.currentId,
}));
console.log("map2:", m2);
if (m2.map !== "hills") errors.push("second map did not load");
if (m2.phase !== "round" && m2.phase !== "build") errors.push("map2 round did not run");
await page.screenshot({ path: path.join(shots, "12-map2-play.png") });

// fps sanity at 3x with lots of action
const fps = await page.evaluate(() => new Promise(res => {
  let frames = 0; const t0 = performance.now();
  function tick() { frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(frames / 2); }
  requestAnimationFrame(tick);
}));
console.log("approx fps:", fps);

await browser.close();
server.close();

if (errors.length) {
  console.error("\nFAILURES:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log("\nSMOKE TEST PASSED");
