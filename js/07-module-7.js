'use strict';

/* =====================================================================
   [7] PARTICLE MỞ RỘNG
   ===================================================================== */

const Particles = {
  list: [],
  shells: [],
  texts: [],
  afterimages: [],
  slashes: [],
  rings: [],       // sóng xung kích
  debris: [],      // mảnh vỡ tường

  clear() {
    this.list.length = 0; this.shells.length = 0; this.texts.length = 0;
    this.afterimages.length = 0; this.slashes.length = 0; this.rings.length = 0; this.debris.length = 0;
  },

  spawn(o) {
    this.list.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, life: 0.5, maxLife: 0.5,
      r: 2, color: '#fff', type: 'dot', friction: 0.9, grow: 0,
    }, o));
  },

  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(opts.spMin || 40, opts.spMax || 220);
      this.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(opts.lifeMin || 0.2, opts.lifeMax || 0.6),
        r: rand(opts.rMin || 1.5, opts.rMax || 3.5),
        color: pick(opts.colors || ['#fff']), type: opts.type || 'dot',
        friction: opts.friction !== undefined ? opts.friction : 0.88,
        grow: opts.grow || 0,
      });
    }
  },

  ring(x, y, r0, r1, dur, color) {
    this.rings.push({ x, y, r0, r1, life: dur, maxLife: dur, color: color || '#ffd98a' });
  },

  muzzle(x, y, ang, size) {
    this.spawn({ x, y, vx: 0, vy: 0, life: 0.05, maxLife: 0.05, r: size, color: '#ffd27a', type: 'flash', ang });
    for (let i = 0; i < 4; i++) {
      const a = ang + rand(-0.4, 0.4), sp = rand(180, 420);
      this.spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.09, r: rand(1, 2), color: '#ffca6b', type: 'spark', friction: 0.8 });
    }
  },

  blood(x, y, ang, n) {
    for (let i = 0; i < n; i++) {
      const a = ang + rand(-1.1, 1.1), sp = rand(60, 300);
      this.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.15, 0.45), r: rand(1.5, 3.5),
        color: pick(['#a8232b', '#8f1d24', '#c53b3b']), type: 'dot', friction: 0.85,
      });
    }
  },

  sparkHit(x, y, ang) {
    for (let i = 0; i < 7; i++) {
      const a = ang + rand(-0.9, 0.9), sp = rand(100, 340);
      this.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.08, 0.2), r: rand(1, 2),
        color: pick(['#ffd27a', '#fff2d0', '#ffb454']), type: 'spark', friction: 0.8,
      });
    }
  },

  smokePuff(x, y, n, big) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(10, 60);
      this.spawn({
        x: x + rand(-8, 8), y: y + rand(-8, 8),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.5, 1.1), r: big ? rand(8, 18) : rand(4, 9),
        color: '#3a4049', type: 'smoke', friction: 0.94, grow: rand(6, 16),
      });
    }
  },

  shell(x, y, ang) {
    const a = ang + rand(1.6, 2.4), sp = rand(70, 150);
    this.shells.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rand(0, TAU), vr: rand(-9, 9), life: rand(2.5, 4) });
  },

  dmgText(x, y, val, crit, color) {
    this.texts.push({
      x: x + rand(-6, 6), y, vy: -55, life: 0.7, maxLife: 0.7,
      val: Math.round(val), label: crit ? 'CRITICAL! ' + Math.round(val) : null, crit: !!crit, color: color || null,
    });
  },

  ghost(x, y, ang, r) {
    this.afterimages.push({ x, y, ang, r, life: 0.28, maxLife: 0.28 });
  },

  slash(x, y, ang, reach) {
    this.slashes.push({ x, y, ang, reach, life: 0.16, maxLife: 0.16 });
  },

  debrisBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(60, 260);
      this.debris.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rot: rand(0, TAU), vr: rand(-14, 14),
        s: rand(2, 5), life: rand(0.5, 1.2),
      });
    }
  },

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.pow(p.friction, dt * 60);
      p.vy *= Math.pow(p.friction, dt * 60);
      if (p.grow) p.r += p.grow * dt;
    }
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.life -= dt;
      if (s.life <= 0) { this.shells.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.vx *= Math.pow(0.9, dt * 60); s.vy *= Math.pow(0.9, dt * 60);
      s.rot += s.vr * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) { this.texts.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= Math.pow(0.95, dt * 60);
    }
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.life -= dt;
      if (a.life <= 0) this.afterimages.splice(i, 1);
    }
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life -= dt;
      if (s.life <= 0) this.slashes.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) { this.debris.splice(i, 1); continue; }
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.vx *= Math.pow(0.92, dt * 60); d.vy *= Math.pow(0.92, dt * 60);
      d.rot += d.vr * dt;
    }
  },

  draw(ctx) {
    // sóng xung kích
    for (const r of this.rings) {
      const t = 1 - r.life / r.maxLife;
      const rr = lerp(r.r0, r.r1, t);
      ctx.strokeStyle = rgba(r.color, (1 - t) * 0.55);
      ctx.lineWidth = lerp(4, 1, t);
      ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, TAU); ctx.stroke();
    }
    // mảnh vỡ
    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = rgba('#4a5261', clamp(d.life, 0, 1));
      ctx.fillRect(-d.s / 2, -d.s / 2, d.s, d.s);
      ctx.restore();
    }
    // bóng lướt
    for (const a of this.afterimages) {
      ctx.fillStyle = rgba('#9db6d8', (a.life / a.maxLife) * 0.3);
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.fill();
    }
    // vệt chém
    for (const s of this.slashes) {
      const al = s.life / s.maxLife;
      const spread = 1.1;
      ctx.strokeStyle = rgba('#dceaf7', al * 0.9);
      ctx.lineWidth = 4 * al + 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.reach * 0.8, s.ang - spread, s.ang + spread);
      ctx.stroke();
      ctx.strokeStyle = rgba('#9db6d8', al * 0.4);
      ctx.lineWidth = 8 * al;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.reach * 0.66, s.ang - spread * 0.8, s.ang + spread * 0.8);
      ctx.stroke();
    }
    // khói
    for (const p of this.list) {
      if (p.type !== 'smoke') continue;
      ctx.fillStyle = rgba(p.color, clamp(p.life / 0.9, 0, 0.25));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    // dot & spark
    for (const p of this.list) {
      if (p.type !== 'dot' && p.type !== 'spark') continue;
      const al = clamp(p.life / 0.25, 0, 1);
      ctx.fillStyle = rgba(p.color, al);
      if (p.type === 'spark') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(0, -p.r * 0.4, p.r * 3.2, p.r * 0.8);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
    }
    // chớp nòng
    for (const p of this.list) {
      if (p.type !== 'flash') continue;
      const al = p.life / p.maxLife;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.fillStyle = rgba('#ffe9b0', al);
      ctx.beginPath();
      ctx.moveTo(0, -p.r * 0.5); ctx.lineTo(p.r * 1.6, 0);
      ctx.lineTo(0, p.r * 0.5); ctx.lineTo(p.r * 0.35, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // vỏ đạn
    ctx.fillStyle = '#b98f3e';
    for (const s of this.shells) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      ctx.globalAlpha = clamp(s.life / 1.2, 0, 1);
      ctx.fillRect(-3, -1.2, 6, 2.4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const al = clamp(t.life / t.maxLife, 0, 1);
      ctx.font = t.crit ? '700 17px "JetBrains Mono", monospace' : '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = t.color ? rgba(t.color, al) : (t.crit ? rgba('#ffb454', al) : rgba('#e8e4da', al * 0.9));
      ctx.fillText(t.label || t.val, t.x, t.y);
    }
    ctx.textAlign = 'left';
  },
};
