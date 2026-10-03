'use strict';

/* =====================================================================
   [16] HUD / MINIMAP / KILL FEED / TOAST
   ===================================================================== */

const HUD = {
  el: {
    hud: document.getElementById('hud'),
    hpFill: document.getElementById('hp-fill'),
    armorFill: document.getElementById('armor-fill'),
    weaponName: document.getElementById('weapon-name'),
    ammoMag: document.getElementById('ammo-mag'),
    ammoReserve: document.getElementById('ammo-reserve'),
    reloadHint: document.getElementById('reload-hint'),
    slots: document.getElementById('weapon-slots'),
    score: document.getElementById('score-val'),
    combo: document.getElementById('combo-tag'),
    waveNum: document.getElementById('wave-num'),
    waveLeft: document.getElementById('wave-left'),
    dashBar: document.querySelector('#dash-bar .bar-fill'),
    dashText: document.getElementById('dash-text'),
    aimTag: document.getElementById('aim-tag'),
    vignette: document.getElementById('hurt-vignette'),
    flashOv: document.getElementById('flash-overlay'),
    minimap: document.getElementById('minimap'),
    banner: document.getElementById('wave-banner'),
    bannerBig: document.getElementById('banner-big'),
    bannerSub: document.getElementById('banner-sub'),
    hint: document.getElementById('hint-line'),
    killfeed: document.getElementById('killfeed'),
  },
  mmCtx: null,
  vignetteT: 0,
  _hints: [
    'Giữ CHUỘT PHẢI (hoặc nút NGẮM) để ngắm: giảm tỏa đạn + hỗ trợ nhẹ.',
    'Hết đạn? Rút DAO — chém cận chiến không tốn đạn, đẩy lùi địch.',
    'Chỉ mang tối đa 2 khẩu súng. Nhấn E để đổi nhanh.',
    'Nhặt KHIÊN để hấp thụ 60% sát thương.',
    'Kẻ bắn tỉa có tia laser đỏ: né ngay khi thấy nó.',
    'Bomber nhấp nháy là sắp nổ — bắn từ xa hoặc chạy.',
    'Súng lục / ngắn nổ / săn / tỉa: bấm từng phát. Còn lại giữ để bắn.',
    'Không bị thương 6 giây sẽ hồi máu từ từ.',
  ],
  _hintIdx: 0,
  _killfeedItems: [],

  init() {
    this.mmCtx = this.el.minimap.getContext('2d');
    this.el.hint.textContent = '» ' + this._hints[0];
  },
  rotateHint() {
    this._hintIdx = (this._hintIdx + 1) % this._hints.length;
    this.el.hint.textContent = '» ' + this._hints[this._hintIdx];
  },
  show() { this.el.hud.classList.remove('hidden'); },
  hide() { this.el.hud.classList.add('hidden'); },

  killfeed(label, gunName, crit) {
    const div = document.createElement('div');
    div.className = 'kf-item' + (crit ? ' crit' : '');
    div.innerHTML = '<b>' + label + '</b> † ' + gunName;
    this.el.killfeed.appendChild(div);
    setTimeout(() => div.remove(), 3200);
    // giữ tối đa 5 dòng
    while (this.el.killfeed.children.length > 5) {
      this.el.killfeed.firstChild.remove();
    }
  },

  buildSlots() {
    const p = Game.player;
    if (!p) return;
    this.el.slots.innerHTML = '';
    // 2 slot súng
    for (let i = 0; i < 2; i++) {
      const div = document.createElement('div');
      div.className = 'slot';
      const gid = p.gunSlots[i];
      if (gid) {
        const g = gunById(gid);
        div.classList.add('owned');
        div.textContent = (i + 1) + ' ' + g.name.split(' ')[0].slice(0, 5);
        if (!p.isMelee && p.activeSlot === i) div.classList.add('active');
      } else {
        div.textContent = (i + 1) + ' —';
      }
      this.el.slots.appendChild(div);
    }
    // dao
    const m = document.createElement('div');
    m.className = 'slot melee-slot owned';
    m.textContent = '3 Dao';
    if (p.isMelee) m.classList.add('active');
    this.el.slots.appendChild(m);
  },

  update(dt) {
    const g = Game;
    if (!g || !g.player) return;
    const p = g.player;

    const hpPct = clamp(p.hp / p.hpMax, 0, 1);
    this.el.hpFill.style.width = (hpPct * 100) + '%';
    this.el.hpFill.classList.toggle('low', hpPct < 0.3);
    this.el.armorFill.style.width = clamp(p.armor / p.armorMax, 0, 1) * 100 + '%';
    this.el.armorFill.classList.toggle('empty', p.armor <= 0);

    if (p.isMelee) {
      this.el.ammoMag.textContent = '∞';
      this.el.ammoMag.classList.remove('empty');
      this.el.ammoReserve.textContent = 'cận chiến';
      this.el.reloadHint.classList.add('hidden');
      this.el.weaponName.textContent = MELEE.name;
    } else if (p.curGunId) {
      const w = gunById(p.curGunId);
      this.el.ammoMag.textContent = p.mag[p.curGunId];
      this.el.ammoMag.classList.toggle('empty', p.mag[p.curGunId] === 0 && !p.reloading);
      this.el.ammoReserve.textContent = '/ ' + p.reserve[p.curGunId];
      this.el.reloadHint.classList.toggle('hidden', !p.reloading);
      this.el.weaponName.textContent = w.name + (p.reloading ? ' — nạp' : '') + (p.aiming ? ' ◈' : '');
    }

    const dashPct = 1 - clamp(p.dashCd / 1.5, 0, 1);
    this.el.dashBar.style.width = (dashPct * 100) + '%';
    this.el.dashText.textContent = dashPct >= 1 ? 'Sẵn sàng' : 'Đang hồi…';
    this.el.aimTag.classList.toggle('hidden', !p.aiming);

    this.el.score.textContent = g.stats.score.toLocaleString('vi-VN');
    this.el.waveNum.textContent = g.mode === 'campaign'
      ? (g.levelIndex + 1) + '/' + LEVELS.length
      : g.wave;
    this.el.waveLeft.textContent = g.enemies.filter(e => !e.dead).length + g.pendingSpawns.length;

    if (g.comboMult > 1) {
      this.el.combo.classList.remove('hidden');
      this.el.combo.textContent = 'Chuỗi ×' + g.comboMult + ' (' + Math.ceil(g.comboT) + 's)';
    } else {
      this.el.combo.classList.add('hidden');
    }

    this.vignetteT = Math.max(0, this.vignetteT - dt * 2);
    const lowHp = p.hp < 30 && !p.dead ? 0.35 : 0;
    this.el.vignette.style.opacity = Math.max(this.vignetteT * 0.9, lowHp);
    this.el.flashOv.style.opacity = Camera.flashT * 0.5;

    this.drawMinimap();
  },

  hurtPulse() { this.vignetteT = 1; },

  banner(big, sub, ms) {
    this.el.bannerBig.innerHTML = big;
    this.el.bannerSub.textContent = sub;
    this.el.banner.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => this.el.banner.classList.remove('show'), ms || 2200);
  },

  drawMinimap() {
    const g = Game;
    const c = this.mmCtx;
    const W = this.el.minimap.width, H = this.el.minimap.height;
    const sx = W / WORLD_W, sy = H / WORLD_H;
    c.fillStyle = '#0d0f13';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#2a2f38';
    for (const o of g.world.obstacles) {
      c.fillRect(o.x * sx, o.y * sy, Math.max(1, o.w * sx), Math.max(1, o.h * sy));
    }
    for (const pk of g.pickups) {
      if (pk.dead) continue;
      c.fillStyle = pk.kind === 'gun' ? (pk.rarity==='legendary'?'#ffbb4d':pk.rarity==='epic'?'#c07cff':pk.rarity==='rare'?'#68aaff':'#b5c2ca') : (pk.kind==='chest'?'#ffb454':(pk.kind.startsWith('armor') ? '#6fb3c9' : '#ffb454'));
      if (pk.rarity==='legendary' && Math.floor(performance.now()/180)%2===0) c.fillStyle='#fff1a1';
      c.fillRect(pk.x * sx - 1.5, pk.y * sy - 1.5, 3, 3);
    }
    for (const e of g.enemies) {
      if (e.dead) continue;
      c.fillStyle = e.isBoss ? '#ff4d4d' : (e.elite ? '#ffb454' : '#e23b3b');
      const s = e.isBoss ? 6 : (e.elite ? 4 : 3);
      c.fillRect(e.x * sx - s / 2, e.y * sy - s / 2, s, s);
    }
    const p = g.player;
    c.fillStyle = '#e8e4da';
    c.beginPath(); c.arc(p.x * sx, p.y * sy, 3.4, 0, TAU); c.fill();
    c.strokeStyle = '#e8e4da'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(p.x * sx, p.y * sy);
    c.lineTo(p.x * sx + Math.cos(p.aim) * 9, p.y * sy + Math.sin(p.aim) * 9);
    c.stroke();
  },
};

const Toast = {
  el: document.getElementById('toast'),
  t: null,
  show(msg) {
    this.el.textContent = msg;
    this.el.classList.add('show');
    clearTimeout(this.t);
    this.t = setTimeout(() => this.el.classList.remove('show'), 2100);
  },
};
