'use strict';

/* =====================================================================
   [17] RENDER THẾ GIỚI + HIỆU ỨNG
   ===================================================================== */

function drawFloor(ctx, g) {
  ctx.fillStyle = g.mapId === 'dunes' ? '#14130f' : '#101216';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.strokeStyle = g.mapId === 'dunes' ? 'rgba(52,46,34,0.5)' : 'rgba(38,43,51,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= WORLD_W; x += 130) { ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); }
  for (let y = 0; y <= WORLD_H; y += 130) { ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,180,84,0.10)'; ctx.lineWidth = 2;
  ctx.strokeRect(WORLD_W / 2 - 260, WORLD_H / 2 - 200, 520, 400);
  Stains.draw(ctx);
}

function drawObstacles(ctx) {
  for (const o of Game.world.obstacles) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(o.x + 5, o.y + 6, o.w, o.h);
    if (o.kind === 'rock') {
      ctx.fillStyle = '#2e2a22';
      ctx.strokeStyle = '#403a2e'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x + o.w * 0.2, o.y);
      ctx.lineTo(o.x + o.w, o.y + o.h * 0.25);
      ctx.lineTo(o.x + o.w * 0.85, o.y + o.h);
      ctx.lineTo(o.x + o.w * 0.1, o.y + o.h * 0.8);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (o.kind === 'wall' || o.kind === 'wall2') {
      ctx.fillStyle = '#23272f';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#31363f'; ctx.lineWidth = 2;
      ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
      ctx.strokeStyle = 'rgba(16,18,22,0.6)';
      ctx.beginPath();
      if (o.w > o.h) {
        for (let x = o.x + 40; x < o.x + o.w; x += 40) { ctx.moveTo(x, o.y); ctx.lineTo(x, o.y + o.h); }
      } else {
        for (let y = o.y + 40; y < o.y + o.h; y += 40) { ctx.moveTo(o.x, y); ctx.lineTo(o.x + o.w, y); }
      }
      ctx.stroke();
    } else if (o.kind === 'block') {
      ctx.fillStyle = '#2a2f39';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#3c424e'; ctx.lineWidth = 2;
      ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
      ctx.fillStyle = 'rgba(255,180,84,0.5)';
      ctx.fillRect(o.x, o.y, o.w, 4);
      ctx.fillRect(o.x, o.y + o.h - 4, o.w, 4);
    } else {
      ctx.fillStyle = '#262b33';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#38404c'; ctx.lineWidth = 2;
      ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
      ctx.strokeStyle = 'rgba(56,64,76,0.9)';
      ctx.beginPath();
      ctx.moveTo(o.x + 4, o.y + 4); ctx.lineTo(o.x + o.w - 4, o.y + o.h - 4);
      ctx.moveTo(o.x + o.w - 4, o.y + 4); ctx.lineTo(o.x + 4, o.y + o.h - 4);
      ctx.stroke();
    }
  }
}

function drawAimLine(ctx, g) {
  const p = g.player;
  if (!p.aiming || p.dead) return;
  const maxLen = 1200;
  const endX = p.x + Math.cos(p.aim) * maxLen;
  const endY = p.y + Math.sin(p.aim) * maxLen;
  const hit = g.world.raycast(p.x, p.y, endX, endY);
  let len = hit ? maxLen * hit.t : maxLen;
  const t = p.assistTarget;
  const hasTarget = t && !t.dead;
  if (hasTarget) len = dist(p.x, p.y, t.x, t.y);
  const ex = p.x + Math.cos(p.aim) * len;
  const ey = p.y + Math.sin(p.aim) * len;

  ctx.save();
  ctx.setLineDash([4, 10]);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = hasTarget ? 'rgba(157,182,216,0.75)' : 'rgba(157,182,216,0.35)';
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.aim) * (p.r + 8), p.y + Math.sin(p.aim) * (p.r + 8));
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);

  const pa = p.aim + Math.PI / 2;
  ctx.strokeStyle = hasTarget ? 'rgba(157,182,216,0.9)' : 'rgba(157,182,216,0.4)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(ex + Math.cos(pa) * 6, ey + Math.sin(pa) * 6);
  ctx.lineTo(ex - Math.cos(pa) * 6, ey - Math.sin(pa) * 6);
  ctx.stroke();

  if (hasTarget) {
    const s = t.r + 8;
    ctx.strokeStyle = 'rgba(157,182,216,0.85)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(t.x - s, t.y - s, s * 2, s * 2);
  }
  ctx.restore();
}

function drawTelegraphs(ctx, g) {
  for (const e of g.enemies) {
    if (e.dead || !e.laserOn) continue;
    const p = g.player;
    const len = dist(e.x, e.y, p.x, p.y);
    const prog = clamp(e.aimT / e.def.aimTime, 0, 1);
    ctx.strokeStyle = rgba('#ff4d4d', 0.2 + prog * 0.4);
    ctx.lineWidth = 1 + prog * 1.6;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + Math.cos(e.aimAng) * len, e.y + Math.sin(e.aimAng) * len);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = rgba('#ff4d4d', 0.4 + prog * 0.5);
    ctx.beginPath(); ctx.arc(p.x, p.y, 4 + prog * 5, 0, TAU); ctx.fill();
  }
}

function drawCrosshair(ctx, g) {
  if (Game.state !== 'playing') return;
  if (Device.isTouch) return; // mobile ngắm bằng joystick, không cần crosshair
  const p = g.player;
  const mx = Input.mouse.x, my = Input.mouse.y;
  if (p.isMelee) {
    ctx.strokeStyle = 'rgba(157,182,216,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mx, my, 8, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,228,218,0.9)';
    ctx.beginPath();
    ctx.moveTo(mx - 5, my); ctx.lineTo(mx + 5, my);
    ctx.moveTo(mx, my - 5); ctx.lineTo(mx, my + 5);
    ctx.stroke();
    return;
  }
  const spread = p.weapon.spread * (p.aiming ? 0.45 : 1);
  const gap = 5 + spread * 90;
  ctx.strokeStyle = 'rgba(232,228,218,0.9)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(mx - gap - 7, my); ctx.lineTo(mx - gap, my);
  ctx.moveTo(mx + gap, my);     ctx.lineTo(mx + gap + 7, my);
  ctx.moveTo(mx, my - gap - 7); ctx.lineTo(mx, my - gap);
  ctx.moveTo(mx, my + gap);     ctx.lineTo(mx, my + gap + 7);
  ctx.stroke();
  ctx.fillStyle = p.aiming && p.assistTarget ? 'rgba(157,182,216,0.95)' : 'rgba(255,180,84,0.9)';
  ctx.fillRect(mx - 1, my - 1, 2, 2);
}
