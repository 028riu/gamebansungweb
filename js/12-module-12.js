'use strict';

/* =====================================================================
   [12] KẺ ĐỊCH
   ===================================================================== */

const ENEMY_TYPES = {
  grunt:  { hp: 42, speed: 85, r: 13, score: 60, keep: 230, fireCd: [1.0, 1.6], bulletSpeed: 430, bulletDmg: 8, label: 'Grunt' },
  drone:  { hp: 24, speed: 185, r: 10, score: 45, contactDmg: 10, contactCd: 0.8, label: 'Drone' },
  brute:  { hp: 260, speed: 46, r: 24, score: 220, keep: 160, fireCd: [1.8, 2.6], bulletSpeed: 380, bulletDmg: 7, burst: 5, spread: 0.32, label: 'Brute' },
  sniper: { hp: 34, speed: 70, r: 12, score: 130, keep: 560, aimTime: 1.05, bulletSpeed: 1500, bulletDmg: 42, label: 'Sniper' },
  bomber: { hp: 30, speed: 150, r: 12, score: 90, fuseDist: 95, fuseTime: 0.85, boomDmg: 46, boomR: 130, label: 'Bomber' },
};

class Enemy {
  constructor(type, x, y, game) {
    const def = ENEMY_TYPES[type];
    this.type = type; this.def = def; this.game = game;
    this.x = x; this.y = y; this.r = def.r;
    this.hpMax = Math.round(def.hp * game.diff.hpMul * (1 + game.wave * 0.045));
    this.hp = this.hpMax;
    this.speed = def.speed * game.diff.spdMul;
    this.dead = false;
    this.spawnT = 0.55; this.spawning = true;
    this.thinkT = 0; this.fireT = rand(0.6, 1.4);
    this.aimAng = 0; this.aimT = 0; this.laserOn = false;
    this.contactT = 0; this.fuseT = -1; this.hurtFlash = 0;
    this.wanderA = rand(0, TAU);
  }

  takeDamage(dmg, ang, game, crit) {
    if (this.dead || this.spawning) return;
    this.hp -= dmg;
    this.hurtFlash = 0.1;
    game.stats.dealt += dmg;
    Particles.blood(this.x, this.y, ang, crit ? 10 : 5);
    Particles.dmgText(this.x, this.y - this.r, dmg, crit);
    Sound.hitFlesh();
    Stains.splat(this.x + rand(-6, 6), this.y + rand(-6, 6), rand(3, 7), '#6e1620', 0.5);
    if (this.hp <= 0) this.die(ang, game, crit);
  }

  die(ang, game, crit) {
    this.dead = true;
    game.onEnemyKilled(this, false, crit);
    Particles.blood(this.x, this.y, ang, 14);
    Particles.ring(this.x, this.y, 4, this.r * 2.4, 0.3, '#a8232b');
    Stains.splat(this.x, this.y, this.r * 1.3, '#5c121b', 0.55);
    Particles.smokePuff(this.x, this.y, 4, false);
    Sound.enemyDie();
    if (this.type === 'bomber') this.explode(game, false);
  }

  explode(game, hurtPlayer) {
    Sound.explosion();
    Camera.addTrauma(0.5);
    Camera.punchZoom(0.96);
    Camera.flash(0.35);
    Particles.burst(this.x, this.y, 22, {
      spMin: 120, spMax: 420, lifeMin: 0.2, lifeMax: 0.6, rMin: 2, rMax: 5,
      colors: ['#ffd27a', '#ff8a4d', '#e8e4da'], type: 'spark',
    });
    Particles.ring(this.x, this.y, 10, this.def.boomR, 0.4, '#ffd27a');
    Particles.smokePuff(this.x, this.y, 8, true);
    Particles.debrisBurst(this.x, this.y, 6);
    Stains.scorch(this.x, this.y, this.def.boomR * 0.5);
    const p = game.player;
    if (hurtPlayer && !p.dead) {
      const d = dist(this.x, this.y, p.x, p.y);
      if (d < this.def.boomR) p.takeDamage(this.def.boomDmg * (1 - d / this.def.boomR) * 0.9, game);
    }
    for (const e of game.enemies) {
      if (e === this || e.dead || e.spawning) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < this.def.boomR) e.takeDamage(28, angTo(this.x, this.y, e.x, e.y), game, false);
    }
  }

  update(dt) {
    if (this.dead) return;
    const g = this.game, p = g.player;
    if (this.spawning) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) this.spawning = false;
      return;
    }
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    const dToP = dist(this.x, this.y, p.x, p.y);
    const angToP = angTo(this.x, this.y, p.x, p.y);

    switch (this.type) {
      case 'drone':  this.updateDrone(dt, g, p, dToP, angToP); break;
      case 'grunt':
      case 'brute':  this.updateShooter(dt, g, p, dToP, angToP); break;
      case 'sniper': this.updateSniper(dt, g, p, dToP, angToP); break;
      case 'bomber': this.updateBomber(dt, g, p, dToP, angToP); break;
      case 'boss':   this.updateBoss(dt, g, p, dToP, angToP); break;
    }
    g.world.circlePush(this);
  }

  updateDrone(dt, g, p, dToP, angToP) {
    const a = steerAvoid(this.x, this.y, p.x, p.y, this, g.world);
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    this.aimAng = a;
    this.contactT = Math.max(0, this.contactT - dt);
    if (dToP < this.r + p.r + 2 && this.contactT <= 0 && !p.dead) {
      this.contactT = this.def.contactCd;
      p.takeDamage(this.def.contactDmg, g);
    }
  }

  updateShooter(dt, g, p, dToP, angToP) {
    const keep = this.def.keep;
    let want = 0;
    if (dToP > keep + 60) want = 1;
    else if (dToP < keep - 50) want = -1;
    if (want !== 0) {
      const a = steerAvoid(this.x, this.y, p.x, p.y, this, g.world);
      const dir = want > 0 ? a : a + Math.PI;
      this.x += Math.cos(dir) * this.speed * dt * Math.abs(want);
      this.y += Math.sin(dir) * this.speed * dt * Math.abs(want);
    } else {
      this.thinkT -= dt;
      if (this.thinkT <= 0) { this.wanderA = pick([-1, 1]); this.thinkT = rand(1.2, 2.4); }
      const side = angToP + this.wanderA * Math.PI / 2;
      this.x += Math.cos(side) * this.speed * 0.5 * dt;
      this.y += Math.sin(side) * this.speed * 0.5 * dt;
    }
    this.aimAng = angToP;
    this.fireT -= dt;
    if (this.fireT <= 0 && dToP < 640) {
      if (!g.world.raycast(this.x, this.y, p.x, p.y)) {
        this.fireT = rand(this.def.fireCd[0], this.def.fireCd[1]);
        const n = this.def.burst || 1;
        for (let i = 0; i < n; i++) {
          const spread = this.def.spread ? (Math.random() - 0.5) * 2 * this.def.spread : rand(-0.06, 0.06);
          const a = angToP + spread;
          EnemyBullets.spawn({
            x: this.x + Math.cos(a) * (this.r + 6), y: this.y + Math.sin(a) * (this.r + 6),
            vx: Math.cos(a) * this.def.bulletSpeed, vy: Math.sin(a) * this.def.bulletSpeed,
            dmg: this.def.bulletDmg, r: this.type === 'brute' ? 3.6 : 3,
          });
        }
        Particles.muzzle(this.x + Math.cos(angToP) * (this.r + 6), this.y + Math.sin(angToP) * (this.r + 6), angToP, 8);
        Sound.enemyShot();
        if (this.type === 'brute') Camera.addTrauma(0.05);
      } else this.fireT = 0.4;
    }
  }

  updateSniper(dt, g, p, dToP, angToP) {
    this.aimAng = angToP;
    if (dToP < 260) {
      this.laserOn = false; this.aimT = 0;
      this.x += Math.cos(angToP + Math.PI) * this.speed * dt;
      this.y += Math.sin(angToP + Math.PI) * this.speed * dt;
      return;
    }
    if (dToP > this.def.keep + 120) {
      const a = steerAvoid(this.x, this.y, p.x, p.y, this, g.world);
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
    }
    if (g.world.raycast(this.x, this.y, p.x, p.y)) { this.aimT = 0; this.laserOn = false; return; }
    this.laserOn = true;
    this.aimT += dt;
    if (this.aimT >= this.def.aimTime) {
      this.aimT = 0; this.laserOn = false;
      const a = angToP + rand(-0.012, 0.012);
      EnemyBullets.spawn({
        x: this.x + Math.cos(a) * (this.r + 10), y: this.y + Math.sin(a) * (this.r + 10),
        vx: Math.cos(a) * this.def.bulletSpeed, vy: Math.sin(a) * this.def.bulletSpeed,
        dmg: this.def.bulletDmg, r: 4, color: '#ff4d4d', trail: 46,
      });
      Sound.sniper();
      Camera.addTrauma(0.1);
      Particles.muzzle(this.x + Math.cos(a) * (this.r + 10), this.y + Math.sin(a) * (this.r + 10), a, 14);
    }
  }

  updateBomber(dt, g, p, dToP, angToP) {
    if (this.fuseT >= 0) {
      this.fuseT -= dt;
      if (this.fuseT <= 0) {
        this.dead = true;
        g.onEnemyKilled(this, true, false);
        this.explode(g, true);
      }
      return;
    }
    if (dToP < this.def.fuseDist) { this.fuseT = this.def.fuseTime; return; }
    const a = steerAvoid(this.x, this.y, p.x, p.y, this, g.world);
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    this.aimAng = a;
  }

  updateBoss(dt, g, p, dToP, angToP) { Boss.update.call(this, dt, g, p, dToP, angToP); }

  draw(ctx) {
    if (this.dead) return;
    if (this.spawning) {
      const t = 1 - this.spawnT / 0.55;
      ctx.strokeStyle = rgba('#e23b3b', 0.7 * (1 - t));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 26 * (1 - t), 0, TAU); ctx.stroke();
      ctx.globalAlpha = t;
    }
    const flash = this.hurtFlash > 0;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.7, this.r, this.r * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(this.x, this.y);
    switch (this.type) {
      case 'grunt':  this.drawGrunt(ctx, flash); break;
      case 'drone':  this.drawDrone(ctx, flash); break;
      case 'brute':  this.drawBrute(ctx, flash); break;
      case 'sniper': this.drawSniper(ctx, flash); break;
      case 'bomber': this.drawBomber(ctx, flash); break;
      case 'boss':   Boss.draw.call(this, ctx, flash); break;
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (!this.spawning && this.hp < this.hpMax && this.type !== 'boss') {
      const w = this.r * 2.2, y = this.y - this.r - 12;
      ctx.fillStyle = '#101216';
      ctx.fillRect(this.x - w / 2, y, w, 4);
      ctx.fillStyle = '#e23b3b';
      ctx.fillRect(this.x - w / 2, y, w * clamp(this.hp / this.hpMax, 0, 1), 4);
    }
  }

  drawGrunt(ctx, flash) {
    ctx.rotate(this.aimAng);
    ctx.fillStyle = flash ? '#ff7d6e' : '#b5453c';
    ctx.strokeStyle = '#26140f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffdf6b';
    ctx.beginPath(); ctx.arc(this.r - 3, 0, 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b2020'; ctx.fillRect(this.r - 4, -1.6, 14, 3.2);
  }
  drawDrone(ctx, flash) {
    ctx.rotate(this.aimAng);
    ctx.fillStyle = flash ? '#ff7d6e' : '#8f2f2f';
    ctx.strokeStyle = '#26140f'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.r + 3, 0); ctx.lineTo(-this.r, this.r * 0.85);
    ctx.lineTo(-this.r * 0.4, 0); ctx.lineTo(-this.r, -this.r * 0.85);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffdf6b';
    ctx.beginPath(); ctx.arc(1, 0, 2.6, 0, TAU); ctx.fill();
  }
  drawBrute(ctx, flash) {
    ctx.rotate(this.aimAng);
    const s = this.r;
    ctx.fillStyle = flash ? '#ff7d6e' : '#7e2f2a';
    ctx.strokeStyle = '#26140f'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, -s * 0.85); ctx.lineTo(s * 0.8, -s * 0.85);
    ctx.quadraticCurveTo(s, -s * 0.85, s, -s * 0.5); ctx.lineTo(s, s * 0.5);
    ctx.quadraticCurveTo(s, s * 0.85, s * 0.8, s * 0.85); ctx.lineTo(-s * 0.8, s * 0.85);
    ctx.quadraticCurveTo(-s, s * 0.85, -s, s * 0.5); ctx.lineTo(-s, -s * 0.5);
    ctx.quadraticCurveTo(-s, -s * 0.85, -s * 0.8, -s * 0.85);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5b2320'; ctx.fillRect(-s * 0.55, -s * 0.55, s * 0.9, s * 1.1);
    ctx.fillStyle = '#26140f';
    ctx.fillRect(s * 0.6, -6, s * 0.75, 4.4); ctx.fillRect(s * 0.6, 1.6, s * 0.75, 4.4);
    ctx.fillStyle = '#ffdf6b'; ctx.fillRect(s * 0.35, -4, 5, 8);
  }
  drawSniper(ctx, flash) {
    ctx.rotate(this.aimAng);
    ctx.fillStyle = flash ? '#ff7d6e' : '#9c3b52';
    ctx.strokeStyle = '#241118'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      const px = Math.cos(a) * this.r, py = Math.sin(a) * this.r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2020';
    ctx.fillRect(this.r - 2, -1.4, 24, 2.8); ctx.fillRect(this.r + 4, -6, 6, 3);
    ctx.fillStyle = this.laserOn ? '#ff4d4d' : '#ffdf6b';
    ctx.beginPath(); ctx.arc(3, 0, 3, 0, TAU); ctx.fill();
  }
  drawBomber(ctx, flash) {
    const t = performance.now() / 1000;
    const fusing = this.fuseT >= 0;
    const blink = fusing ? (Math.sin(t * (30 - this.fuseT * 20)) > 0) : false;
    ctx.fillStyle = blink ? '#ffe08a' : (flash ? '#ff7d6e' : '#c96a2b');
    ctx.strokeStyle = '#2b1c0e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = blink ? '#ff4d4d' : '#3a2412';
    ctx.beginPath(); ctx.arc(0, 0, this.r * 0.45, 0, TAU); ctx.fill();
    if (fusing) {
      ctx.strokeStyle = rgba('#ff4d4d', 0.8); ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 9, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - this.fuseT / this.def.fuseTime));
      ctx.stroke();
    }
  }
}
