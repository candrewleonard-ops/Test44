/* ===== PINGAS TD — procedural pixel art (no external assets) =====
 * Every sprite is an original fair-use parody design, drawn from
 * character grids and baked to offscreen canvases at load time.
 */
"use strict";

const Sprites = (() => {

  // shared palette: char -> color
  const PAL = {
    K: "#181425", // outline / black
    W: "#ffffff", // white
    L: "#e8ebf7", // light grey
    S: "#f2c896", // skin tan
    s: "#d9a366", // skin shade
    R: "#e23434", // red
    r: "#9c1f1f", // red shade
    Y: "#ffd23e", // yellow
    y: "#d09a18", // yellow shade
    M: "#b9bccc", // metal light
    N: "#6f7287", // metal dark
    T: "#3a3a46", // near-black body
    G: "#46b04a", // green
    g: "#2a7a30", // green shade
    P: "#9a5bd0", // purple
    p: "#6a3a96", // purple shade
    O: "#f08326", // orange
    H: "#8a5526", // mustache brown
    h: "#5f3a16", // brown shade
    C: "#54c79e", // cactus teal
    c: "#2e8a6a", // cactus shade
    E: "#1b2a52", // eye dark blue
    B: "#2a62e0", // body (default blue, swapped per enemy)
    D: "#1a3da0", // body shade
    F: "#f08bb8", // pingas pink
  };

  /* ---------------- ENEMY: hedgehog "speedster" (faces right) ---------------- */
  const HEDGE = [
    "......BBBB......",
    "..B..BBBBBB.....",
    "..BB.BBBBBBB....",
    "...BBBBBBBBBB...",
    "..BBBBBBBWWWK...",
    ".BBBBBBBBWEWK...",
    "..BBBBBBSWWWK...",
    ".BBBBBBSSSWW....",
    "..BBBBSSSSSKK...",
    "...BBBSSSSSS....",
    "..BBBBDSSS......",
    "...BBBBBBB......",
    "...WBBBBBW......",
    "....RRRRR.......",
    "...RRWRRRR......",
    "...KK...KK......",
  ];

  // boss: angrier, more spikes (faces right)
  const HEDGE_BOSS = [
    "..B...BBBB......",
    "..BB.BBBBBB.....",
    "B.BBBBBBBBBB....",
    "BB.BBBBBBBBBB...",
    ".BBBBBBBBKKK....",
    "BBBBBBBBBWEWK...",
    ".BBBBBBBSWWWK...",
    "BBBBBBBSSSWW....",
    ".BBBBBSSSSSKK...",
    "..BBBSSKKSSS....",
    ".BBBBBDSSS......",
    "..BBBBBBBB......",
    "..WBBBBBBW......",
    "....RRRRR.......",
    "...RRWRRRR......",
    "...KK...KK......",
  ];

  // enemy tier palettes: body / shade (+ optional eye)
  const ENEMY_PALS = {
    blue:   { B: "#2a62e0", D: "#1a3da0" },
    green:  { B: "#2fb944", D: "#1c8a2e" },
    red:    { B: "#e23434", D: "#9c1f1f" },
    yellow: { B: "#f2c322", D: "#c08a10" },
    pink:   { B: "#f263ae", D: "#c03a80" },
    shadow: { B: "#3c3a52", D: "#262338", E: "#e23434" },
    metal:  { B: "#a9b2c4", D: "#5f6880", E: "#e23434" },
    gold:   { B: "#ffce30", D: "#bd8a0e" },
  };

  /* ---------------- TOWERS ---------------- */

  // CLUCKO — robot rooster (parody goon). Faces right.
  const T_CLUCKO = [
    ".....RR.........",
    "....RRRR........",
    "...KLLLLK.......",
    "..KLLELLLK......",
    "..KLLLLLLKYY....",
    "..KLLLLLKYYY....",
    "...KLLLLK.Y.....",
    "....KKKK........",
    "...KMMMMK.......",
    "..KMLLMMMK......",
    "..KMLMMLMK......",
    "..KMMLLMMK......",
    "...KMMMMK.......",
    "....KK.KK.......",
    "....Y...Y.......",
    "...YY...YY......",
  ];

  // DRILLBERT — drill tank (parody goon). Faces right.
  const T_DRILLBERT = [
    "................",
    "....KKKKK.......",
    "...KGGGGGK......",
    "..KGWGGWGGK.....",
    "..KGEGGEGGK.....",
    "..KGGGGGGGKM....",
    "..KGGGGGGKMMM...",
    "..KGGGGGKMMMMM..",
    "...KGGGGKMMM....",
    "..KNNNNNNKM.....",
    ".KNGGGGGGNK.....",
    ".KTTTTTTTTTK....",
    ".KTLTLTLTLTK....",
    ".KTTTTTTTTTK....",
    "..KKKKKKKKK.....",
    "................",
  ];

  // SLICK — oil-slinging serpent bot. Faces right.
  const T_SLICK = [
    "................",
    "....KKKK........",
    "...KPPPPK.......",
    "..KPWPPWPK......",
    "..KPEPPEPK......",
    "..KPPPPPPK......",
    "...KPPPPK.......",
    "..KNNNNNNK......",
    ".KNPPPPPPNKKK...",
    ".KNPpppPPNKTK...",
    ".KNPPPPPPNK.K...",
    ".KNNNNNNNNK.T...",
    "..KNNNNNNK......",
    "...KK..KK.......",
    "...KT..KT.......",
    "................",
  ];

  // BOMZO — round bomber bot.
  const T_BOMZO = [
    "......KYK.......",
    ".....KYOYK......",
    "......KKK.......",
    "....KKKKKKK.....",
    "...KRRRRRRRK....",
    "..KRRRRRRRRRK...",
    "..KTTTTTTTTTK...",
    ".KTTWWTTTWWTTK..",
    ".KTTWETTTWETTK..",
    ".KTTTTTTTTTTTK..",
    ".KTTTTKKKTTTTK..",
    "..KTTTTTTTTTK...",
    "...KTTTTTTTK....",
    "....KKKKKKK.....",
    "...KK.....KK....",
    "................",
  ];

  // BUZZBOT — laser wasp drone.
  const T_BUZZBOT = [
    "...LL.....LL....",
    "..LLLL...LLLL...",
    "..LLLLL.LLLLL...",
    "...KKKKKKKKK....",
    "..KYYYYYYYYYK...",
    ".KYWEYYYYYWEYK..",
    ".KYYYYYYYYYYYK..",
    "..KKKKKKKKKKK...",
    "..KYYYYYYYYYK...",
    "..KTTTTTTTTTK...",
    "..KYYYYYYYYYK...",
    "...KTTTTTTTK....",
    "....KYYYYYK.....",
    ".....KTTTK......",
    "......KKK.......",
    ".......K........",
  ];

  // YOLKER — heavy egg artillery.
  const T_YOLKER = [
    "...........KK...",
    "..........KMMK..",
    ".........KMMK...",
    "........KMMK....",
    ".......KMMMK....",
    "..KKKKKMMMK.....",
    ".KMMMMMMMK......",
    ".KMNNNNMK.......",
    ".KKKKKKKKK......",
    ".KRRRRRRRRK.....",
    "KRRWWWWWWRRK....",
    "KRWWYYYYWWRK....",
    "KRRWWWWWWRRK....",
    ".KRRRRRRRRK.....",
    ".KTTTTTTTTK.....",
    "..KKKKKKKK......",
  ];

  // PINGAS FARM — a barn that grows... those.
  const T_FARM = [
    "....KKKKKKKK....",
    "...KNNNNNNNNK...",
    "..KNNNNNNNNNNK..",
    ".KNNNNNNNNNNNNK.",
    "KKKKKKKKKKKKKKKK",
    ".KRRRRRRRRRRRRK.",
    ".KRWWRRRRRRWWRK.",
    ".KRRRRKKKKRRRRK.",
    ".KRRRRKWWKRRRRK.",
    ".KRWWRKWWKRWWRK.",
    ".KRRRRKKKKRRRRK.",
    ".KKKKKKKKKKKKKK.",
    "..FFF.F..F.FFF..",
    "..F.FF.FF.FF.F..",
    "................",
    "................",
  ];

  // PINGAS SLAVE — hooded little collector with a sack. He has seen things.
  const T_SLAVE = [
    ".....KKKK.......",
    "....KNNNNK......",
    "...KNNNNNNK.....",
    "...KNWNNWNK.....",
    "...KNNNNNNK.....",
    "....KNNNNK......",
    "..KKMMMMMMKK....",
    ".KMMMMMMMMMMK...",
    ".KMKMMMMMMKMK...",
    ".KK.KMMMMK.KK...",
    "....KMMMMK.KKKK.",
    "....KMMMMKKhFhK.",
    "....KMKKMK.KhhK.",
    "....KM..MK..KK..",
    "....KK..KK......",
    "................",
  ];

  /* ---------------- BASE: DR. PINGAS ---------------- */
  const PINGAS = [
    "......KKKKKK........",
    ".....KSSSSSSK.......",
    "....KSSSSSSSSK......",
    "....KSWKSSWKSK......",
    "....KSEKSSEKSK......",
    "...KSSSSSSSSSSK.....",
    ".KHHHSSSSSSSHHHK....",
    "KHHHHHHHHHHHHHHHK...",
    "KHHHHHHHHHHHHHHHK...",
    ".KHHHKKSSKKHHHHK....",
    "..KKKRRRRRRKKK......",
    "..KRRRYYYYRRRRK.....",
    ".KRRRYYYYYYRRRRK....",
    ".KWWRRYYYYRRRWWK....",
    "KWWWRRRYYRRRRWWWK...",
    "KWWKRRRRRRRRRKWWK...",
    ".KKKTTTTTTTTTTKKK...",
    "..KTTTTTTTTTTTTK....",
    "..KTTTTTTTTTTTTK....",
    "...KTTTTTTTTTTK.....",
    "....KTTTTTTTTK......",
    "....KTT....TTK......",
    "...KTTK....KTTK.....",
    "...KKK......KKK.....",
  ];

  /* ---------------- MAP DECOR ---------------- */
  const CACTUS = [
    "....CC......",
    "...CcCC.....",
    "...CCCC.....",
    "CC.CcCC.CC..",
    "CcCCCCCCCc..",
    ".CCcCCCcCC..",
    "..CCcCCC....",
    "...CcCC.....",
    "...CCCC.....",
    "...CcCC.....",
  ];

  const BUSH = [
    "....CCCC....",
    "..CCCcCCCC..",
    ".CCcCCCCcCC.",
    "CCCCCcCCCCCC",
    "CcCCCCCCcCCC",
    ".CCCcCCCCCC.",
    "..CCCCcCCC..",
  ];

  const ROCK = [
    "....NNNN....",
    "..NNMMMNNN..",
    ".NMMLMMMMNN.",
    "NMMMMMNMMMN.",
    "NMMNMMMMMNN.",
    ".NNNNNNNNN..",
  ];

  const CASTLE = [
    "......KRK.......",
    "......KRRK......",
    "......KRK.......",
    "....KKKMKKK.....",
    "....KM.KM.K.....",
    "....KMMMMMK.....",
    "....KMKMKMK.....",
    "....KMMMMMK.....",
    "KK.KKMMMMMKK.KK.",
    "KMKKMMMMMMMKKMK.",
    "KMMMMMMMMMMMMMK.",
    "KMKMKMMKKMMKMKK.",
    "KMMMMMKrrKMMMMK.",
    "KMMMMMKrrKMMMMK.",
    "KMNMNMKrrKMNMNK.",
    "KKKKKKKKKKKKKKK.",
  ];

  const SIGN = [
    ".KKKKKKKKKKKKKK.",
    "KWWWWWWWWWWWWWWK",
    "KW.RRR..RR...R.K",
    "KWR.....R.R..R.K",
    "KWR.RR..R.R..R.K",
    "KWR..R..R.R....K",
    "KW.RRR..RR...R.K",
    "KWWWWWWWWWWWWWWK",
    ".KKKKKKKKKKKKKK.",
    ".......hh.......",
    ".......hh.......",
    ".......hh.......",
  ];

  /* ---------------- HUD ICONS ---------------- */
  const ICON_HEART = [
    ".RR..RR.",
    "RRRRRRRR",
    "RWRRRRRR",
    "RRRRRRRR",
    ".RRRRRR.",
    "..RRRR..",
    "...RR...",
  ];
  const ICON_COIN = [
    "..YYYY..",
    ".YYyyYY.",
    "YYyWWyYY",
    "YYyWWyYY",
    "YYyyyyYY",
    ".YYyyYY.",
    "..YYYY..",
  ];
  const ICON_FLAG = [
    "KRRRRR..",
    "KRRWRRR.",
    "KRRRRR..",
    "KRRRR...",
    "K.......",
    "K.......",
    "K.......",
  ];
  const ICON_STAR = [
    "...Y....",
    "..YYY...",
    "YYYWYYY.",
    ".YYYYY..",
    "..YYY...",
    ".YY.YY..",
  ];

  const ART = {
    hedge: HEDGE, hedge_boss: HEDGE_BOSS,
    clucko: T_CLUCKO, drillbert: T_DRILLBERT, slick: T_SLICK,
    bomzo: T_BOMZO, buzzbot: T_BUZZBOT, yolker: T_YOLKER,
    farm: T_FARM, slave: T_SLAVE,
    pingas: PINGAS,
    cactus: CACTUS, bush: BUSH, rock: ROCK, castle: CASTLE, sign: SIGN,
    icon_heart: ICON_HEART, icon_coin: ICON_COIN, icon_flag: ICON_FLAG, icon_star: ICON_STAR,
  };

  /* ---------------- baking ---------------- */
  const cache = new Map();

  function bake(rows, palOverride, scale, flip) {
    const pal = palOverride ? Object.assign({}, PAL, palOverride) : PAL;
    const h = rows.length;
    let w = 0;
    for (const r of rows) w = Math.max(w, r.length);
    const cv = document.createElement("canvas");
    cv.width = w * scale; cv.height = h * scale;
    const c = cv.getContext("2d");
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === "." || ch === " ") continue;
        const col = pal[ch];
        if (!col) continue;
        const dx = flip ? (w - 1 - x) : x;
        c.fillStyle = col;
        c.fillRect(dx * scale, y * scale, scale, scale);
      }
    }
    return cv;
  }

  // get(name, {pal, scale, flip}) -> cached canvas
  function get(name, opts = {}) {
    const scale = opts.scale || 1;
    const flip = !!opts.flip;
    const palId = opts.palId || "";
    const key = `${name}|${palId}|${scale}|${flip}`;
    let cv = cache.get(key);
    if (!cv) {
      cv = bake(ART[name], opts.pal || null, scale, flip);
      cache.set(key, cv);
    }
    return cv;
  }

  // enemy sprite by tier id
  function enemy(tier, opts = {}) {
    const art = opts.boss ? "hedge_boss" : "hedge";
    return get(art, {
      pal: ENEMY_PALS[tier], palId: tier + (opts.boss ? "+b" : ""),
      scale: opts.scale || 2, flip: opts.flip,
    });
  }

  // draw centered with bottom anchor (feet on y)
  function draw(ctx, cv, x, y, anchor = "center") {
    if (anchor === "feet") ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height));
    else ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height / 2));
  }

  // stamp an icon into a DOM element as a canvas
  function icon(el, name, scale = 2) {
    const cv = get(name, { scale });
    el.innerHTML = "";
    el.appendChild(cv);
  }

  return { get, enemy, draw, icon, PAL, ENEMY_PALS };
})();
