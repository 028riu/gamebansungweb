'use strict';

/* =====================================================================
   [13] BOSS WARDEN
   ===================================================================== */

const Boss = {
  get phase() { return this.hp / this.hpMax > 0.70 ? 1 : (this.hp / this.hpMax > 0.35 ? 2 : 3); },

  update(dt, g, p, dToP, angToP) {
    this.aimAng = angToP;
    this.spin = (this.spin || 0) + dt * 0.7;
    this.act = this.act || { mode: 'idle', t: 0 };
    const a = this.act;
    a.t -= dt;

    if (a.mode === 'idle' && a.t <= 0) {
      const ph = this.phase;
      const roll = Math.random();
      if (ph >= 2 && roll < 0.28 && g.enemies.length < 26) {
        a.mode = 'spawn'; a.t = 1.1; Sound.boss();
      } else if (roll < 0.55) {
        a.mode = 'ring'; a.t = 0.5;
        this.ringLeft = 3 + ph; this.ringGap = 0;
      } else {
        a.mode = 'chargeAim'; a.t = 0.75;
        a.dx = Math.cos(angToP); a.dy = Math.sin(angToP);
      }
    }

    if (a.mode === 'ring') {
      this.ringGap -= dt;
      if (a.t <= 0 && this.ringGap <= 0 && this.ringLeft > 0) {
        this.ringLeft--; a.t = 0.5; this.ringGap = 0.18;
        const n = 14 + this.phase * 4, off = rand(0, TAU);
        for (let i = 0; i < n; i++) {
          const ang = off + i / n * TAU;
          EnemyBullets.spawn({
            x: this.x + Math.cos(ang) * (this.r + 8), y: this.y + Math.sin(ang) * (this.r + 8),
            vx: Math.cos(ang) * 330, vy: Math.sin(ang) * 330,
            dmg: 12, r: 4, color: '#ff7a4d',
          });
        }
        Particles.ring(this.x, this.y, this.r, this.r + 60, 0.35, '#ff7a4d');
        Sound.enemyShot();
        Camera.addTrauma(0.12);
      }
      if (this.ringLeft <= 0 && a.t <= 0) { a.mode = 'idle'; a.t = rand(0.9, 1.5) / this.phase; }
    }

    if (a.mode === 'chargeAim') {
      this.chargeAimAng = angToP;
      if (a.t <= 0) {
        a.mode = 'charge'; a.t = 0.55;
        a.dx = Math.cos(this.chargeAimAng); a.dy = Math.sin(this.chargeAimAng);
        Sound.dash();
      }
    }

    if (a.mode === 'charge') {
      this.x += a.dx * 640 * dt;
      this.y += a.dy * 640 * dt;
      Particles.ghost(this.x, this.y, this.aimAng, this.r * 0.9);
      if (a.t <= 0) { a.mode = 'idle'; a.t = 1.0; }
      if (dToP < this.r + p.r + 4 && !p.dead) p.takeDamage(26, g);
    }

    if (a.mode === 'spawn' && a.t <= 0) {
      for (let i = 0; i < 3; i++) {
        const ang = rand(0, TAU);
        g.spawnEnemy('drone', this.x + Math.cos(ang) * 70, this.y + Math.sin(ang) * 70);
      }
      a.mode = 'idle'; a.t = 1.2;
      Toast.show('WARDEN triệu hồi drone!');
    }

    if (dToP > 700 && a.mode !== 'charge') {
      this.x += Math.cos(angToP) * this.speed * dt;
      this.y += Math.sin(angToP) * this.speed * dt;
    }
  },

  draw(ctx, flash) {
    const ph = this.phase;
    ctx.save(); ctx.rotate(this.spin || 0);
    ctx.fillStyle = flash ? '#ff7d6e' : '#6e2323';
    ctx.strokeStyle = '#1c0f0f'; ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      const rr = this.r * (i % 2 === 0 ? 1 : 0.82);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.save(); ctx.rotate(-(this.spin || 0) * 1.6);
    ctx.strokeStyle = rgba('#e23b3b', 0.85); ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU;
      ctx.moveTo(Math.cos(a) * -this.r * 0.9, Math.sin(a) * -this.r * 0.9);
      ctx.lineTo(Math.cos(a) * this.r * 0.9, Math.sin(a) * this.r * 0.9);
    }
    ctx.stroke(); ctx.restore();

    const pulse = 0.6 + Math.sin(performance.now() / 200) * 0.2;
    ctx.fillStyle = ph >= 3 ? rgba('#ff4d4d', pulse) : rgba('#ffdf6b', pulse * 0.8);
    ctx.beginPath(); ctx.arc(0, 0, this.r * 0.34, 0, TAU); ctx.fill();

    if (this.act && this.act.mode === 'chargeAim') {
      ctx.strokeStyle = rgba('#ff4d4d', 0.35 + Math.sin(performance.now() / 40) * 0.15);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(this.chargeAimAng) * 900, Math.sin(this.chargeAimAng) * 900);
      ctx.stroke();
    }
  },
};

function makeBoss(game) {
  const b = new Enemy('grunt', 0, 0, game);
  b.type = 'boss'; b.isBoss = true;
  b.def = ENEMY_TYPES.grunt;
  b.r = 46;
  b.speed = 55 * game.diff.spdMul;
  b.hpMax = Math.round(1400 * game.diff.bossMul * (1 + game.wave * 0.06));
  b.hp = b.hpMax;
  b.score = 1500;
  b.act = { mode: 'idle', t: 1.5 };
  b.spawnT = 1.0; b.spawning = true;
  return b;
}
