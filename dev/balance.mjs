/* Balance sim: a greedy "AI player" plays a real MEDIUM game with normal
 * resources — buys towers and upgrades only with earned cash, auto-starts
 * rounds at 3x.  Reports lives/cash/level every round.
 * Run: node dev/balance.mjs [easy|medium|hard]
 */
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const diff = process.argv[2] || "medium";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const p = path.join(root, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  try { res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "text/plain" }); res.end(fs.readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8744, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1340, height: 760 } });
page.on("pageerror", e => console.log("PAGEERROR:", e.message));
await page.goto("http://localhost:8744/");
await page.click(`.diff-btn[data-diff="${diff}"]`);
await page.click("#btn-speed");
await page.check("#chk-auto");

// the AI's plan: build order + favored upgrade path per tower
await page.evaluate(() => {
  window.AI = {
    plan: [
      ["clucko", 250, 255, 0], ["drillbert", 480, 370, 0],
      ["clucko", 330, 180, 1], ["slick", 540, 505, 0],
      ["drillbert", 660, 200, 1], ["bomzo", 410, 480, 0],
      ["clucko", 560, 180, 0], ["buzzbot", 530, 370, 0],
      ["slick", 745, 350, 1], ["bomzo", 560, 470, 1],
      ["buzzbot", 470, 250, 0], ["yolker", 80, 250, 0],
      ["yolker", 940, 200, 0], ["buzzbot", 300, 370, 1],
      ["yolker", 100, 540, 0], ["yolker", 940, 120, 0],
      ["yolker", 200, 60, 0], ["yolker", 500, 600, 0],
      ["yolker", 880, 60, 0], ["yolker", 770, 170, 0],
      ["yolker", 200, 600, 0], ["yolker", 540, 60, 0],
    ],
    bought: 0,
    tick() {
      const g = PTD.game;
      if (g.phase !== "round" && g.phase !== "build") return;
      // buy next planned tower
      while (this.bought < this.plan.length) {
        const [id, x, y, pf] = this.plan[this.bought];
        const def = PTD.Towers.TYPES[id];
        if (g.level < def.unlockLevel) break;
        const cost = Math.round(def.cost * g.diff.priceMul);
        if (Math.floor(g.cash) < cost) break;
        if (!PTD.GameMap.canPlace(x, y, def.radius, g.towers)) { this.bought++; continue; }
        g.cash -= cost;
        const t = new PTD.Towers.Tower(id, x, y, g.diff.priceMul);
        t.aiPath = pf;
        if (id === "buzzbot" || id === "yolker") t.targetMode = "strong";
        g.towers.push(t);
        g.stats.towersBuilt++;
        this.bought++;
      }
      // then spend spare cash on upgrades (favored path first)
      for (const t of g.towers) {
        const pf = t.aiPath ?? 0;
        for (const p of [pf, 1 - pf]) {
          const cost = t.upgradeCost(p);
          if (cost == null) continue;
          if (!t.canUpgrade(p, g.level).ok) continue;
          if (Math.floor(g.cash) >= cost + 100) {
            g.cash -= cost;
            t.buyUpgrade(p);
          }
        }
      }
    },
  };
  window.AIint = setInterval(() => window.AI.tick(), 300);
});

await page.click("#btn-start");

let lastRound = 0;
const t0 = Date.now();
while (Date.now() - t0 < 14 * 60 * 1000) {
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => ({
    phase: PTD.game.phase, round: PTD.game.round, lives: Math.ceil(PTD.game.lives),
    cash: Math.floor(PTD.game.cash), level: PTD.game.level,
    towers: PTD.game.towers.length, won: PTD.game.won,
    spent: PTD.game.towers.reduce((a, t) => a + t.spent, 0),
  }));
  if (s.round !== lastRound) {
    console.log(`round ${String(s.round).padStart(2)} | lives ${String(s.lives).padStart(3)} | cash ${String(s.cash).padStart(6)} | lvl ${String(s.level).padStart(2)} | towers ${String(s.towers).padStart(2)} (spent ${s.spent})`);
    lastRound = s.round;
  }
  if (s.phase === "over") {
    console.log(s.won ? `\nAI WON ${diff.toUpperCase()} with ${s.lives} lives` : `\nAI LOST on round ${s.round}`);
    break;
  }
}

await browser.close();
server.close();
