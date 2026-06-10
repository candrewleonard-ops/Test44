import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";
const root = "/home/user/Test44";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const p = path.join(root, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  try { res.writeHead(200, {"Content-Type": MIME[path.extname(p)] || "text/plain"}); res.end(fs.readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8743, r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1340, height: 760 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:8743/");
await page.click('.diff-btn[data-diff="hard"]');
await page.evaluate(() => {
  const g = PTD.game;
  const types = ["blue","green","red","yellow","pink","shadow","metal","gold"];
  types.forEach((t, i) => {
    const e = new PTD.Enemies.Enemy(t, 40 + i * 55);
    g.enemies.push(e);
  });
  const b = new PTD.Enemies.Enemy("boss", 560); g.enemies.push(b);
  const f = new PTD.Enemies.Enemy("final", 760); f.hp = 20000; g.enemies.push(f);
  g.enemies.forEach(e => e.update(0.001, g));
});
await page.waitForTimeout(300);
const box = await page.locator("#game").boundingBox();
await page.screenshot({ path: "/home/user/Test44/dev/shots/08-enemy-lineup.png",
  clip: { x: box.x, y: box.y + 40 * (box.height/640), width: 700 * (box.width/1000), height: 360 * (box.height/640) } });
await browser.close(); server.close();
