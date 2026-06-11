/* ===== PINGAS TD — tiny WebAudio chiptune engine (no assets) ===== */
"use strict";

const AudioSys = (() => {
  let ctx = null;
  let sfxOn = true;
  let musicOn = true;
  let musicTimer = null;
  let musicGain = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.045;
      musicGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // one synthesized blip
  function tone(freq, dur, type, vol, slide = 0, when = 0) {
    if (!sfxOn || !ensure()) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, when = 0) {
    if (!sfxOn || !ensure()) return;
    const t = ctx.currentTime + when;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(ctx.destination);
    src.start(t);
  }

  const SFX = {
    shoot()    { tone(880, 0.05, "square", 0.025, -400); },
    thump()    { tone(160, 0.1, "square", 0.05, -80); },
    laser()    { tone(1400, 0.06, "sawtooth", 0.022, -900); },
    pop()      { tone(520 + Math.random() * 200, 0.07, "square", 0.06, 300); noise(0.04, 0.03); },
    coin()     { tone(988, 0.05, "square", 0.045); tone(1319, 0.09, "square", 0.045, 0, 0.05); },
    metal()    { tone(220, 0.08, "sawtooth", 0.05, -60); },
    boom()     { noise(0.25, 0.12); tone(90, 0.25, "triangle", 0.12, -50); },
    place()    { tone(330, 0.08, "square", 0.06); tone(495, 0.1, "square", 0.06, 0, 0.07); },
    cantPlace(){ tone(140, 0.15, "square", 0.07, -40); },
    sell()     { tone(620, 0.07, "square", 0.06); tone(420, 0.1, "square", 0.06, 0, 0.06); },
    upgrade()  { tone(440, 0.07, "square", 0.06); tone(660, 0.07, "square", 0.06, 0, 0.06); tone(880, 0.1, "square", 0.06, 0, 0.12); },
    leak()     { tone(200, 0.2, "sawtooth", 0.09, -120); },
    levelup()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.06, 0, i * 0.08)); },
    roundEnd() { tone(523, 0.09, "square", 0.05); tone(784, 0.13, "square", 0.05, 0, 0.09); },
    bossWarn() { tone(110, 0.3, "sawtooth", 0.1, 30); tone(110, 0.3, "sawtooth", 0.1, 30, 0.35); },
    win()      { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, "square", 0.06, 0, i * 0.11)); },
    lose()     { [392, 370, 349, 330, 262].forEach((f, i) => tone(f, 0.22, "triangle", 0.09, 0, i * 0.18)); },
  };

  /* ---- looping chiptune (original jolly 8-bar loop) ---- */
  const N = { C4:262, D4:294, E4:330, F4:349, G4:392, A4:440, B4:494,
              C5:523, D5:587, E5:659, F5:698, G5:784, A5:880,
              C3:131, E3:165, F3:175, G3:196, A3:220, B3:247, C2:65, G2:98, A2:110, F2:87 };
  // [note, beats] — melody, square wave
  const MELODY = [
    ["E5",.5],["E5",.5],["G5",1],["E5",.5],["D5",.5],["C5",1],
    ["D5",.5],["E5",.5],["D5",.5],["C5",.5],["A4",1],["G4",1],
    ["C5",.5],["C5",.5],["E5",1],["G5",.5],["E5",.5],["D5",1],
    ["E5",.5],["D5",.5],["C5",.5],["D5",.5],["C5",2],
    ["A4",.5],["C5",.5],["E5",1],["A5",.5],["G5",.5],["E5",1],
    ["F5",.5],["E5",.5],["D5",.5],["C5",.5],["B4",1],["G4",1],
    ["E5",.5],["G5",.5],["A5",1],["G5",.5],["E5",.5],["D5",1],
    ["C5",.5],["D5",.5],["E5",.5],["D5",.5],["C5",2],
  ];
  const BASS = [
    ["C3",1],["G2",1],["C3",1],["G2",1],["A2",1],["E3",1],["G2",1],["G2",1],
    ["C3",1],["G2",1],["C3",1],["G2",1],["F2",1],["G2",1],["C3",2],
    ["A2",1],["E3",1],["A2",1],["E3",1],["G2",1],["G2",1],["B3",1],["G2",1],
    ["A2",1],["E3",1],["F2",1],["G2",1],["C3",2],["G2",2],
  ];
  const BPM = 152;

  function scheduleLoop() {
    if (!musicOn || !ensure()) return;
    const beat = 60 / BPM;
    const t0 = ctx.currentTime + 0.05;
    let total = 0;
    const note = (name, beats, when, type, vol) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = N[name];
      const dur = beats * beat;
      g.gain.setValueAtTime(vol, when);
      g.gain.setValueAtTime(vol, when + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, when + dur * 0.95);
      o.connect(g); g.connect(musicGain);
      o.start(when); o.stop(when + dur);
    };
    let t = t0;
    for (const [n, b] of MELODY) { note(n, b, t, "square", 1); t += b * beat; total = Math.max(total, t - t0); }
    t = t0;
    for (const [n, b] of BASS) { note(n, b, t, "triangle", 1.6); t += b * beat; }
    musicTimer = setTimeout(scheduleLoop, (total - 0.05) * 1000);
  }

  function startMusic() {
    if (musicTimer || !musicOn) return;
    if (!ensure()) return;
    scheduleLoop();
  }
  function stopMusic() {
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  }

  return {
    sfx(name) { if (SFX[name]) SFX[name](); },
    toggleSfx() { sfxOn = !sfxOn; return sfxOn; },
    toggleMusic() {
      musicOn = !musicOn;
      if (musicOn) startMusic(); else stopMusic();
      return musicOn;
    },
    startMusic,
    unlock() { ensure(); },
    get sfxOn() { return sfxOn; },
    get musicOn() { return musicOn; },
  };
})();
