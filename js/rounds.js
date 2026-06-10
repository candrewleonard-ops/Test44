/* ===== PINGAS TD — round schedule & difficulties =====
 * 68 hand-tuned rounds. Easy ends at 30, Medium at 50,
 * Hard at 67.67 (the infamous two-thirds survival round).
 */
"use strict";

const Rounds = (() => {

  const DIFFS = {
    easy:   { label: "EASY",   rounds: 30, lives: 200, cash: 650, priceMul: 0.85, final: false },
    medium: { label: "MEDIUM", rounds: 50, lives: 150, cash: 650, priceMul: 1.0,  final: false },
    hard:   { label: "HARD",   rounds: 68, lives: 100, cash: 650, priceMul: 1.08, final: true },
  };

  // the survival stretch of round 67.67: two thirds of a nominal 60s round
  const FINAL_TIME = 40;

  // wave: { t: start delay (s), n: count, type, gap (s), hp?: override }
  const w = (t, n, type, gap, hp) => ({ t, n, type, gap, hp });

  const ROUNDS = [
    /* 1  */ [w(0, 12, "blue", 0.8)],
    /* 2  */ [w(0, 18, "blue", 0.62)],
    /* 3  */ [w(0, 10, "blue", 0.65), w(7, 8, "green", 0.7)],
    /* 4  */ [w(0, 18, "blue", 0.5), w(5, 10, "green", 0.6)],
    /* 5  */ [w(0, 16, "green", 0.55), w(9, 6, "red", 0.7)],
    /* 6  */ [w(0, 25, "blue", 0.3), w(4, 12, "green", 0.5)],
    /* 7  */ [w(0, 18, "green", 0.45), w(6, 12, "red", 0.55)],
    /* 8  */ [w(0, 24, "red", 0.45)],
    /* 9  */ [w(0, 30, "green", 0.3), w(5, 12, "red", 0.45)],
    /* 10 */ [w(0, 18, "red", 0.4), w(8, 8, "yellow", 0.7)],
    /* 11 */ [w(0, 30, "red", 0.35)],
    /* 12 */ [w(0, 8, "metal", 1.0), w(3, 16, "red", 0.4)],
    /* 13 */ [w(0, 40, "green", 0.22), w(4, 18, "red", 0.3)],
    /* 14 */ [w(0, 24, "red", 0.3), w(6, 12, "yellow", 0.5)],
    /* 15 */ [w(0, 16, "yellow", 0.45), w(8, 4, "pink", 0.9)],
    /* 16 */ [w(0, 30, "red", 0.25), w(5, 15, "yellow", 0.4)],
    /* 17 */ [w(0, 8, "metal", 0.9), w(4, 4, "shadow", 1.1), w(9, 12, "yellow", 0.45)],
    /* 18 */ [w(0, 24, "yellow", 0.32), w(7, 8, "pink", 0.55)],
    /* 19 */ [w(0, 40, "red", 0.2), w(4, 20, "yellow", 0.3)],
    /* 20 */ [w(0, 26, "yellow", 0.32), w(5, 12, "pink", 0.45), w(10, 6, "metal", 0.8)],
    /* 21 */ [w(0, 3, "gold", 2.5), w(4, 16, "yellow", 0.35)],
    /* 22 */ [w(0, 6, "shadow", 0.8), w(4, 18, "pink", 0.35)],
    /* 23 */ [w(0, 12, "metal", 0.55), w(5, 25, "yellow", 0.32)],
    /* 24 */ [w(0, 6, "gold", 1.5), w(5, 10, "shadow", 0.6)],
    /* 25 */ [w(0, 45, "yellow", 0.22), w(6, 16, "pink", 0.35)],
    /* 26 */ [w(0, 10, "gold", 1.1), w(6, 16, "shadow", 0.45)],
    /* 27 */ [w(0, 14, "metal", 0.45), w(4, 32, "pink", 0.3)],
    /* 28 */ [w(0, 12, "gold", 0.9)],
    /* 29 */ [w(0, 16, "shadow", 0.45), w(5, 26, "pink", 0.28), w(10, 8, "metal", 0.55)],
    /* 30 — EASY FINAL: first true boss */
              [w(0, 1, "boss", 0, 1200), w(4, 8, "gold", 1.6), w(12, 18, "pink", 0.32)],
    /* 31 */ [w(0, 20, "gold", 0.7)],
    /* 32 */ [w(0, 30, "shadow", 0.3), w(5, 20, "metal", 0.4)],
    /* 33 */ [w(0, 26, "gold", 0.6)],
    /* 34 */ [w(0, 60, "pink", 0.15), w(6, 20, "shadow", 0.3)],
    /* 35 */ [w(0, 30, "gold", 0.5)],
    /* 36 */ [w(0, 2, "boss", 5, 1000), w(4, 20, "shadow", 0.35)],
    /* 37 */ [w(0, 40, "metal", 0.25), w(5, 40, "yellow", 0.2)],
    /* 38 */ [w(0, 36, "gold", 0.4)],
    /* 39 */ [w(0, 50, "shadow", 0.2)],
    /* 40 */ [w(0, 1, "boss", 0, 3400), w(6, 16, "gold", 0.8)],
    /* 41 */ [w(0, 44, "gold", 0.35)],
    /* 42 */ [w(0, 60, "shadow", 0.18), w(6, 30, "metal", 0.3)],
    /* 43 */ [w(0, 2, "boss", 6, 2000), w(4, 20, "gold", 0.7)],
    /* 44 */ [w(0, 56, "gold", 0.3)],
    /* 45 */ [w(0, 80, "pink", 0.1), w(6, 40, "shadow", 0.2)],
    /* 46 */ [w(0, 3, "boss", 5, 1800), w(5, 24, "gold", 0.6)],
    /* 47 */ [w(0, 64, "gold", 0.28)],
    /* 48 */ [w(0, 60, "metal", 0.2), w(5, 50, "shadow", 0.22)],
    /* 49 */ [w(0, 70, "gold", 0.25)],
    /* 50 — MEDIUM FINAL: the triple threat */
              [w(0, 1, "boss", 0, 9500), w(6, 2, "boss", 6, 2600), w(14, 20, "gold", 0.6)],
    /* 51 */ [w(0, 80, "gold", 0.22)],
    /* 52 */ [w(0, 4, "boss", 4, 2400), w(6, 40, "shadow", 0.25)],
    /* 53 */ [w(0, 90, "gold", 0.2)],
    /* 54 */ [w(0, 100, "shadow", 0.12), w(5, 60, "metal", 0.15)],
    /* 55 */ [w(0, 2, "boss", 6, 6500), w(5, 50, "gold", 0.3)],
    /* 56 */ [w(0, 100, "gold", 0.18)],
    /* 57 */ [w(0, 6, "boss", 3.5, 2800)],
    /* 58 */ [w(0, 110, "gold", 0.16)],
    /* 59 */ [w(0, 3, "boss", 5, 8500), w(6, 60, "gold", 0.25)],
    /* 60 */ [w(0, 1, "boss", 0, 21000), w(8, 30, "gold", 0.5)],
    /* 61 */ [w(0, 120, "gold", 0.15)],
    /* 62 */ [w(0, 8, "boss", 3, 3800)],
    /* 63 */ [w(0, 130, "gold", 0.14), w(8, 40, "metal", 0.2)],
    /* 64 */ [w(0, 4, "boss", 5, 10000), w(6, 60, "gold", 0.25)],
    /* 65 */ [w(0, 150, "gold", 0.12)],
    /* 66 */ [w(0, 8, "boss", 3.2, 4200)],
    /* 67 */ [w(0, 1, "boss", 0, 30000), w(5, 100, "gold", 0.15)],
    /* 68 — ROUND 67.67: THE GOLDEN BLUR. Survive 2/3 of a round to win. */
              [w(0, 1, "final", 0, 30000),
               w(6, 30, "gold", 0.7),
               w(15, 4, "boss", 3, 5000),
               w(24, 60, "shadow", 0.25),
               w(30, 40, "gold", 0.25)],
  ];

  // gold & boss hedgehogs toughen up late game
  function hpScale(round, typeId) {
    if (typeId === "gold" && round > 40) return 1 + 0.05 * (round - 40);
    return 1;
  }

  // XP awarded for clearing a round
  function roundXp(round) { return 20 + 5 * round; }

  // cash awarded for clearing a round
  function roundCash(round) { return 100 + round; }

  return { DIFFS, ROUNDS, FINAL_TIME, hpScale, roundXp, roundCash };
})();
