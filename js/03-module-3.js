'use strict';

/* =====================================================================
   [3] ÂM THANH TỔNG HỢP
   ===================================================================== */

const Sound = (() => {
  let ctx = null, master = null, enabled = true, volume = 1, musicLevel = 0.35, musicNodes = [];

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35 * volume;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return !!ctx;
  }
  function resume() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }
  function startMusic() {
    if (!ensure() || musicNodes.length) return;
    const gain = ctx.createGain(); gain.gain.value = musicLevel * 0.055; gain.connect(master);
    for (const [freq, type] of [[55, 'sine'], [82.4, 'triangle']]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.connect(gain); o.start(); musicNodes.push(o); }
    musicNodes.push(gain);
  }
  function stopMusic() { for (const n of musicNodes) { try { if (n.stop) n.stop(); n.disconnect(); } catch (_) {} } musicNodes = []; }

  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      const len = ctx.sampleRate * 0.6;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    return src;
  }

  function shot(kind) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(master);
    let dur = 0.09, vol = 0.5, hp = 900, thump = 90;
    if (kind === 'shotgun') { dur = 0.16; vol = 0.75; hp = 500; thump = 60; }
    if (kind === 'smg')     { dur = 0.06; vol = 0.4;  hp = 1200; }
    if (kind === 'sniper')  { dur = 0.28; vol = 0.9;  hp = 350; thump = 50; }
    if (kind === 'rifle')   { dur = 0.12; vol = 0.6;  hp = 700; thump = 75; }
    if (kind === 'lmg')     { dur = 0.1;  vol = 0.65; hp = 600; thump = 80; }
    if (kind === 'revolver'){ dur = 0.14; vol = 0.7;  hp = 600; thump = 65; }
    const n = noise();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    n.connect(f); f.connect(g);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.start(t); n.stop(t + dur + 0.02);
    if (thump) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(thump, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
      og.gain.setValueAtTime(vol * 0.7, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(og); og.connect(master);
      o.start(t); o.stop(t + 0.15);
    }
  }

  function hit(flesh) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = flesh ? 'lowpass' : 'bandpass';
    f.frequency.value = flesh ? 500 : 2400;
    n.connect(f); f.connect(g); g.connect(master);
    g.gain.setValueAtTime(flesh ? 0.35 : 0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    n.start(t); n.stop(t + 0.1);
  }

  function tone(freq, dur, type, vol, slide) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function explosion() {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.5);
    n.connect(f); f.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    n.start(t); n.stop(t + 0.6);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.4);
    og.gain.setValueAtTime(0.8, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + 0.5);
  }

  return {
    resume,
    get enabled() { return enabled; },
    toggle() { enabled = !enabled; if (enabled) resume(); if (master && ctx) master.gain.setTargetAtTime(enabled ? 0.35 * volume : 0, ctx.currentTime, 0.04); return enabled; },
    setVolume(v) { volume = clamp(Number(v) || 0, 0, 1); if (master && ctx) master.gain.setTargetAtTime((enabled ? 0.35 : 0) * volume, ctx.currentTime, 0.04); },
    setVolumes(sfx, music) { volume = clamp(Number(sfx) || 0, 0, 1); musicLevel = clamp(Number(music) || 0, 0, 1); this.setVolume(volume); if (musicNodes.length) musicNodes[musicNodes.length - 1].gain.setTargetAtTime(musicLevel * 0.055, ctx.currentTime, 0.08); },
    startMusic, stopMusic,
    pistol()   { shot('pistol'); },
    smg()      { shot('smg'); },
    shotgun()  { shot('shotgun'); },
    rifle()    { shot('rifle'); },
    sniper()   { shot('sniper'); },
    lmg()      { shot('lmg'); },
    revolver() { shot('revolver'); },
    plasma() { tone(170, 0.08, 'sawtooth', 0.2, 520); },
    railgun() { tone(80, 0.23, 'sine', 0.5, 35); setTimeout(() => tone(900, 0.07, 'square', 0.15, 300), 40); },
    critical() { tone(1040, 0.08, 'sine', 0.28, 1580); },
    chestOpen() { tone(360, 0.12, 'triangle', 0.22, 740); setTimeout(() => tone(740, 0.12, 'triangle', 0.2, 1040), 100); },
    swap() { tone(480, 0.05, 'square', 0.16, 720); },
    melee()    { tone(220, 0.07, 'sawtooth', 0.22, 500); },
    enemyShot(){ shot('smg'); },
    hitFlesh() { hit(true); },
    hitMetal() { hit(false); },
    reloadStart(){ tone(300, 0.05, 'square', 0.15); },
    reloadEnd()  { tone(520, 0.06, 'square', 0.2, 700); },
    empty()      { tone(180, 0.04, 'square', 0.18); },
    dash()       { tone(200, 0.15, 'sawtooth', 0.12, 90); },
    pickup()     { tone(660, 0.07, 'square', 0.2); setTimeout(() => tone(990, 0.1, 'square', 0.18), 70); },
    armorUp()    { tone(440, 0.08, 'triangle', 0.22); setTimeout(() => tone(587, 0.12, 'triangle', 0.2), 80); },
    hurt()       { tone(140, 0.15, 'sawtooth', 0.3, 70); },
    die()        { tone(220, 0.5, 'sawtooth', 0.35, 40); },
    enemyDie()   { tone(rand(160, 200), 0.12, 'square', 0.16, 60); },
    explosion()  { explosion(); },
    ui()         { tone(880, 0.04, 'square', 0.12); },
    wave()       { tone(440, 0.1, 'square', 0.2); setTimeout(() => tone(587, 0.14, 'square', 0.2), 120); },
    boss()       { tone(110, 0.4, 'sawtooth', 0.3, 55); setTimeout(() => tone(110, 0.5, 'sawtooth', 0.3, 45), 350); },
    levelup()    { tone(523, 0.09, 'square', 0.2); setTimeout(() => tone(659, 0.09, 'square', 0.2), 90); setTimeout(() => tone(784, 0.16, 'square', 0.22), 180); },
    victory()    { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'square', 0.22), i * 160)); },
  };
})();
