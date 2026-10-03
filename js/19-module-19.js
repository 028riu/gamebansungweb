'use strict';

/* =====================================================================
   [19] VÒNG LẶP CHÍNH
   ===================================================================== */

const ctx = gameCanvas.getContext('2d');

function resize() {
  gameCanvas.width = innerWidth;
  gameCanvas.height = innerHeight;
}
window.addEventListener('resize', resize);
resize();

let lastT = performance.now();
let hintTimer = 0;

/* Interaction bridge: this function was referenced by the render loop but
   was missing after the modular split. Keep it lightweight and safe. */
function szUpdateInteraction() {
  const el = document.getElementById('sz-interact');
  if (!el || !Game || !Game.player || Game.state !== 'playing') {
    if (el) el.textContent = '';
    return;
  }
  let nearest = null;
  let best = Infinity;
  for (const pk of Game.pickups || []) {
    if (!pk || pk.dead) continue;
    const d = dist(Game.player.x, Game.player.y, pk.x, pk.y);
    const range = (Game.player.r || 12) + (pk.r || 13) + 34;
    if (d < range && d < best) { best = d; nearest = pk; }
  }
  if (!nearest) {
    el.textContent = '';
    el.classList.remove('active');
    return;
  }
  const labels = {
    gun: 'E — NHẶT / THAY SÚNG',
    ammo: 'ĐẠN — NHẶT',
    med: 'MEDKIT — NHẶT',
    medbig: 'MEDKIT LỚN — NHẶT',
    armor: 'GIÁP — NHẶT',
    armorbig: 'GIÁP LỚN — NHẶT'
  };
  el.textContent = labels[nearest.kind] || 'VẬT PHẨM — NHẶT';
  el.classList.add('active');
}

/* Accessibility: give the campaign selector an explicit accessible name. */
const szCampaignButton = document.querySelector('.mode-btn[data-mode="campaign"]');
if (szCampaignButton) {
  szCampaignButton.setAttribute('aria-label', 'Chiến dịch — 8 màn — dọn sạch để mở màn kế');
  szCampaignButton.setAttribute('title', 'Chiến dịch — 8 màn');
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.05) dt = 0.05;

  if (Game.state === 'playing') Game.update(dt);

  if (consumePressed('Escape') || consumePressed('KeyP')) {
    if (Game.state === 'playing') Game.pause();
    else if (Game.state === 'paused') Game.resume();
  }

  Camera.update(dt);
  if (Game.state === 'playing' || Game.state === 'paused') HUD.update(dt);
  szUpdateInteraction();

  hintTimer += dt;
  if (hintTimer > 14) { hintTimer = 0; HUD.rotateHint(); }

  ctx.fillStyle = '#0b0d10';
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  if (Game.state === 'menu') { drawMenuBackdrop(now); return; }

  ctx.save();
  ctx.translate(gameCanvas.width / 2, gameCanvas.height / 2);
  ctx.scale(Camera.zoom, Camera.zoom);
  ctx.translate(-gameCanvas.width / 2, -gameCanvas.height / 2);
  ctx.translate(-Camera.x + Camera.ox, -Camera.y + Camera.oy);

  drawFloor(ctx, Game);
  drawObstacles(ctx);
  drawAimLine(ctx, Game);

  for (const pk of Game.pickups) if (!pk.dead) pk.draw(ctx);
  drawTelegraphs(ctx, Game);

  for (const e of Game.enemies) if (e.isBoss && e.laserWarm > 0) { ctx.save(); ctx.strokeStyle='rgba(255,70,70,'+(0.35+0.45*Math.min(1,e.laserWarm/.8))+')'; ctx.lineWidth=12; ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.x+Math.cos(e.laserAng)*950,e.y+Math.sin(e.laserAng)*950); ctx.stroke(); ctx.strokeStyle='#ffd0c8'; ctx.lineWidth=2; ctx.stroke(); ctx.restore(); }

  for (const e of Game.enemies) if (!e.dead) { e.draw(ctx); if(e.elite){ctx.save();ctx.strokeStyle='rgba(255,180,84,.48)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.r+7+Math.sin(now/180)*2,0,TAU);ctx.stroke();ctx.restore()} }
  if (Game.player) Game.player.draw(ctx);

  Bullets.draw(ctx);
  EnemyBullets.draw(ctx);
  Particles.draw(ctx);
  Particles.drawTexts(ctx);

  const boss = Game.enemies.find(e => e.isBoss && !e.dead);
  if (boss) drawBossBar(boss);

  ctx.restore();

  drawWorldVignette();

  if (Game.hitmarkT > 0) {
    const mx = Device.isTouch ? gameCanvas.width / 2 : Input.mouse.x;
    const my = Device.isTouch ? gameCanvas.height / 2 : Input.mouse.y;
    const al = Game.hitmarkT / 0.12;
    ctx.strokeStyle = 'rgba(255,255,255,' + al + ')';
    ctx.lineWidth = 2;
    const s = 7;
    ctx.beginPath();
    ctx.moveTo(mx - s, my - s); ctx.lineTo(mx - s * 0.4, my - s * 0.4);
    ctx.moveTo(mx + s, my - s); ctx.lineTo(mx + s * 0.4, my - s * 0.4);
    ctx.moveTo(mx - s, my + s); ctx.lineTo(mx - s * 0.4, my + s * 0.4);
    ctx.moveTo(mx + s, my + s); ctx.lineTo(mx + s * 0.4, my + s * 0.4);
    ctx.stroke();
  }

  if (Game.player && Game.player.dead) {
    ctx.fillStyle = 'rgba(140,20,20,0.18)';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  }

  drawCrosshair(ctx, Game);
}

function drawWorldVignette() {
  const g = ctx.createRadialGradient(
    gameCanvas.width / 2, gameCanvas.height / 2, Math.min(gameCanvas.width, gameCanvas.height) * 0.42,
    gameCanvas.width / 2, gameCanvas.height / 2, Math.max(gameCanvas.width, gameCanvas.height) * 0.78
  );
  g.addColorStop(0, 'rgba(4,5,7,0)');
  g.addColorStop(1, 'rgba(4,5,7,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
}

function drawBossBar(boss) {
  const w = Math.min(520, gameCanvas.width - 160);
  const bx = (gameCanvas.width - w) / 2 / Camera.zoom;
  const by = 46 / Camera.zoom;
  ctx.fillStyle = '#101216';
  ctx.fillRect(bx, by, w, 16);
  ctx.strokeStyle = '#3c424e';
  ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, 15);
  const pct = clamp(boss.hp / boss.hpMax, 0, 1);
  const ph = boss.phase;
  ctx.fillStyle = ph >= 3 ? '#ff4d4d' : (ph === 2 ? '#e2633b' : '#e23b3b');
  ctx.fillRect(bx + 3, by + 3, (w - 6) * pct, 10);
  ctx.fillStyle = '#e8e4da';
  ctx.font = '700 12px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WARDEN — GIAI ĐOẠN ' + ph, bx + w / 2, by + 30);
  ctx.textAlign = 'left';
}

const menuDust = [];
for (let i = 0; i < 40; i++) {
  menuDust.push({ x: Math.random(), y: Math.random(), s: rand(0.4, 1.6), v: rand(0.01, 0.05) });
}
function drawMenuBackdrop(now) {
  const t = now / 1000;
  const cx = gameCanvas.width / 2, cy = gameCanvas.height / 2;
  ctx.strokeStyle = 'rgba(38,43,51,0.7)'; ctx.lineWidth = 1;
  for (let i = 1; i <= 7; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, 60 + i * 90 + Math.sin(t * 0.5 + i) * 8, 0, TAU);
    ctx.stroke();
  }
  const sweep = (t * 0.9) % TAU;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 690);
  grad.addColorStop(0, 'rgba(255,180,84,0.06)');
  grad.addColorStop(1, 'rgba(255,180,84,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 690, sweep - 0.5, sweep);
  ctx.closePath(); ctx.fill();
  for (const d of menuDust) {
    d.y += d.v * 0.016;
    if (d.y > 1) d.y = 0;
    ctx.fillStyle = 'rgba(139,147,161,0.4)';
    ctx.fillRect(d.x * gameCanvas.width, d.y * gameCanvas.height, d.s, d.s);
  }
}

/* Feature modules must load before the first animation frame. */
if (document.readyState === 'loading') {
  document.write('<script src="js/features/progression.js"><\\/script>');
  document.write('<script src="js/features/esp.js"><\\/script>');
  document.write('<script src="js/features/weapon-drops.js"><\\/script>');
}

requestAnimationFrame(frame);