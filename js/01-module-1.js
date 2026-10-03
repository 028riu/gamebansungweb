'use strict';

/* =====================================================================
   [1] TIỆN ÍCH & HẰNG SỐ
   ===================================================================== */

const TAU = Math.PI * 2;

function rand(a, b)    { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr)     { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b){ return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
function dist2(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; }
function angTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }
function angLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function steerAvoid(x, y, tx, ty, self, world) {
  const base = angTo(x, y, tx, ty);
  const probes = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4];
  for (const off of probes) {
    const a = base + off;
    if (!world.hitsAny(x + Math.cos(a) * 70, y + Math.sin(a) * 70, self.r + 2)) return a;
  }
  return base;
}
function rgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}
function safeLocalInt(key, max) { try { const n=parseInt(localStorage.getItem(key)||'0',10); return Number.isFinite(n)?clamp(n,0,max):0; } catch (_) { return 0; } }
function safeLocalWrite(key,value) { try { localStorage.setItem(key,String(value)); } catch (_) {} }

const WORLD_W = 2600, WORLD_H = 1900, WALL_T = 40;

const DIFFS = [
  { name: 'Trinh sát', hpMul: 0.75, spdMul: 0.9,  countMul: 0.7, dmgMul: 0.7,  bossMul: 0.7 },
  { name: 'Chiến sự',  hpMul: 1.0,  spdMul: 1.0,  countMul: 1.0, dmgMul: 1.0,  bossMul: 1.0 },
  { name: 'Địa ngục',  hpMul: 1.3,  spdMul: 1.15, countMul: 1.4, dmgMul: 1.35, bossMul: 1.3 },
];
