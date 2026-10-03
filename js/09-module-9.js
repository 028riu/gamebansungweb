'use strict';

/* =====================================================================
   [9] ĐẠN HAI PHE
   ===================================================================== */

const Bullets = {
  list: [],
  clear() { this.list.length = 0; },

  spawnPlayer(o) {
    this.list.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, dmg: 10, r: 2.5, life: 1.4,
      pierce: 0, hitSet: null, trail: 26,
    }, o));
  },

  update(dt, game) {
    const world = game.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.life -= dt;
      if (b.life <= 0) { this.list.splice(i, 1); continue; }

      let dead = false;
      for (let s = 0; s < 2 && !dead; s++) {
        const nx = b.x + b.vx * dt * 0.5, ny = b.y + b.vy * dt * 0.5;
        const hit = world.raycast(b.x, b.y, nx, ny);
        if (hit) {
          const hx = lerp(b.x, nx, hit.t), hy = lerp(b.y, ny, hit.t);
          Particles.sparkHit(hx, hy, Math.atan2(-b.vy, -b.vx) + Math.PI);
          Particles.debrisBurst(hx, hy, 2);
          Sound.hitMetal();
          Stains.splat(hx, hy, 2.5, '#0d0e10', 0.35);
          dead = true;
          break;
        }
        b.x = nx; b.y = ny;

        for (const e of game.enemies) {
          if (e.spawning || e.dead) continue;
          if (b.hitSet && b.hitSet.has(e)) continue;
          if (dist2(b.x, b.y, e.x, e.y) < (e.r + b.r) * (e.r + b.r)) {
      const crit = Math.random() < Math.min(0.8, game.player.build.crit || 0.05);
            game.lastPlayerDamageWeapon=b.weaponId||game.lastPlayerDamageWeapon;const dealt=b.dmg*(crit?2:1);e.takeDamage(dealt,Math.atan2(b.vy,b.vx),game,crit);if(crit){game.stats.crits=(game.stats.crits||0)+1;Sound.critical();Camera.addTrauma(SZSettings.shake ? 0.16 : 0)}if(game.player.build.life>0)game.player.heal(dealt*game.player.build.life);if(b.projectile==='plasma')Particles.ring(e.x,e.y,3,24,.22,'#63e8ff');if(b.projectile==='rail'){Particles.ring(e.x,e.y,5,62,.25,'#ff8eff');Camera.addTrauma(SZSettings.shake ? 0.1 : 0)}
            game.stats.hits++;
            game.hitmarker();
            if (b.pierce > 0) {
              b.pierce--; b.dmg *= 0.7;
              if (!b.hitSet) b.hitSet = new Set();
              b.hitSet.add(e);
            } else dead = true;
            break;
          }
        }
      }
      if (dead) this.list.splice(i, 1);
    }
  },

  draw(ctx) {
    for (const b of this.list) {
      const ang = Math.atan2(b.vy, b.vx);
      ctx.strokeStyle = rgba('#ffd98a', clamp(b.life / 0.3, 0, 1) * 0.55);
      ctx.lineWidth = b.r * 1.1;
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(ang) * b.trail, b.y - Math.sin(ang) * b.trail);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = b.color || '#fff0cf';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      if(b.projectile==='plasma'){ctx.save();ctx.shadowBlur=13;ctx.shadowColor=b.color||'#63e8ff';ctx.beginPath();ctx.arc(b.x,b.y,b.r*1.5,0,TAU);ctx.fill();ctx.restore()}
    }
  },
};

const EnemyBullets = {
  list: [],
  clear() { this.list.length = 0; },

  spawn(o) {
    if (this.list.length >= 280) return;
    this.list.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, dmg: 8, r: 3, life: 3.5, color: '#ff6a4d', trail: 14,
    }, o));
  },

  update(dt, game) {
    const world = game.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.life -= dt;
      if (b.life <= 0) { this.list.splice(i, 1); continue; }

      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      let dead = false;
      const hit = world.raycast(b.x, b.y, nx, ny);
      if (hit) {
        Particles.sparkHit(lerp(b.x, nx, hit.t), lerp(b.y, ny, hit.t), Math.atan2(-b.vy, -b.vx) + Math.PI);
        dead = true;
      } else {
        b.x = nx; b.y = ny;
        const p = game.player;
        if (!p.dead && dist2(b.x, b.y, p.x, p.y) < (p.r + b.r) * (p.r + b.r)) {
          p.takeDamage(b.dmg, game);
          Particles.sparkHit(b.x, b.y, Math.atan2(-b.vy, -b.vx));
          dead = true;
        }
      }
      if (dead) this.list.splice(i, 1);
    }
  },

  draw(ctx) {
    for (const b of this.list) {
      const ang = Math.atan2(b.vy, b.vx);
      ctx.strokeStyle = rgba(b.color, 0.5);
      ctx.lineWidth = b.r * 0.9;
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(ang) * b.trail, b.y - Math.sin(ang) * b.trail);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd9c9';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
    }
  },
};
