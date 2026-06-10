/* Debug the 67.67 final round: build a late-game defense, start round 68,
 * and log boss hp / position over time.  Run: node dev/final-debug.mjs
 */
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const p = path.join(root, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  try { res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "text/plain" }); res.end(fs.readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8742, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1340, height: 760 } });
page.on("pageerror", e => console.log("PAGEERROR:", e.message));
await page.goto("http://localhost:8742/");
await page.click('.diff-btn[data-diff="hard"]');

const setup = await page.evaluate(() => {
  const g = PTD.game;
  g.cash = 250000; g.lives = 100; g.round = 67; g.gainXp(100000);
  const log = [];
  const maxed = (id, x, y, pf = 0) => {
    const r = PTD.Towers.TYPES[id].radius;
    if (!PTD.GameMap.canPlace(x, y, r, g.towers)) { log.push(`FAIL ${id} @${x},${y}`); return false; }
    const t = new PTD.Towers.Tower(id, x, y, 1);
    for (let k = 0; k < 4; k++) if (t.canUpgrade(pf, g.level).ok) t.buyUpgrade(pf);
    for (let k = 0; k < 2; k++) if (t.canUpgrade(1 - pf, g.level).ok) t.buyUpgrade(1 - pf);
    g.towers.push(t);
    return true;
  };
  // glue coverage along the whole route
  maxed("slick", 210, 180, 0); maxed("slick", 430, 250, 0);
  maxed("slick", 320, 505, 0); maxed("slick", 540, 505, 0);
  maxed("slick", 640, 500, 0); maxed("slick", 790, 300, 0);
  maxed("slick", 745, 350, 0);
  const spots = [[80, 250], [80, 400], [100, 540], [940, 120], [880, 60], [200, 60],
                 [500, 600], [560, 615], [200, 600], [770, 170], [540, 60], [940, 200]];
  let yolk = 0;
  for (const [x, y] of spots) if (maxed("yolker", x, y, 0)) yolk++;
  maxed("buzzbot", 470, 250, 0); maxed("buzzbot", 530, 370, 0);
  maxed("buzzbot", 300, 370, 0); maxed("buzzbot", 645, 475, 0);
  maxed("bomzo", 410, 480, 0); maxed("bomzo", 560, 300, 1);
  for (const t of g.towers) if (t.def.id === "buzzbot") t.targetMode = "strong";
  // sample yolker dps
  const y0 = g.towers.find(t => t.def.id === "yolker");
  return { yolk, towers: g.towers.length, fails: log,
           yolkStats: y0 ? { dmg: y0.stats.dmg, cd: y0.stats.cooldown, tiers: y0.tiers } : null };
});
console.log(JSON.stringify(setup, null, 1));

await page.click("#btn-speed"); // 3x
await page.evaluate(() => PTD.startRound());

for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(1000);
  const s = await page.evaluate(() => {
    const g = PTD.game;
    const fb = g.enemies.find(e => e.isFinal);
    return {
      t: g.surviveT.toFixed(1), phase: g.phase, lives: g.lives, won: g.won,
      boss: fb ? { hp: fb.hp, dist: Math.round(fb.dist), slow: fb.slowTimer > 0 } : null,
      enemies: g.enemies.length,
    };
  });
  console.log(JSON.stringify(s));
  if (s.phase === "over") break;
}

await browser.close();
server.close();
