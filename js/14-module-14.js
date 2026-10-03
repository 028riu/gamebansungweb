'use strict';

/* =====================================================================
   [14] VẬT PHẨM — giờ có GIÁP
   ===================================================================== */

class Pickup {
  constructor(kind, x, y, data) {
    this.kind = kind;   // 'med' | 'medbig' | 'ammo' | 'armor' | 'armorbig' | 'gun'
    this.x = x; this.y = y;
    this.data = data || null;
    this.t = rand(0, TAU);
    this.life = 22;
    this.r = 13;
    this.dead = false;
  }

  update(dt, game) {
    this.t += dt; this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const p = game.player;
    if (!p.dead && dist(this.x, this.y, p.x, p.y) < p.r + this.r + 6) {
      this.apply(game, p);
      this.dead = true;
    }
  }

  apply(game, p) {
    Sound.pickup();
    Particles.burst(this.x, this.y, 10, {
      spMin: 40, spMax: 160, lifeMin: 0.2, lifeMax: 0.5, rMin: 1.5, rMax: 3,
      colors: ['#ffd98a', '#e8e4da'],
    });
    Particles.ring(this.x, this.y, 4, 26, 0.3, '#ffd98a');
    if (this.kind === 'med') {
      const h = p.heal(25);
      Toast.show(h > 0 ? 'Hồi ' + Math.round(h) + ' HP' : 'Đã đầy máu');
    } else if (this.kind === 'medbig') {
      const h = p.heal(70);
      Toast.show(h > 0 ? 'Hồi ' + Math.round(h) + ' HP' : 'Đã đầy máu');
    } else if (this.kind === 'armor') {
      const a = p.addArmor(35);
      Toast.show(a > 0 ? '+Giáp ' + Math.round(a) : 'Giáp đã đầy');
    } else if (this.kind === 'armorbig') {
      const a = p.addArmor(100);
      Toast.show(a > 0 ? '+Giáp ' + Math.round(a) : 'Giáp đã đầy');
    } else if (this.kind === 'ammo') {
      const ok = p.giveAmmo(2);
      Toast.show(ok ? 'Tiếp đạn toàn bộ' : 'Không cần thêm đạn');
    } else if (this.kind === 'gun') {
      p.giveGun(this.data);
    }
  }

  draw(ctx) {
    const bob = Math.sin(this.t * 3) * 3;
    const y = this.y + bob;
    const fade = this.life < 3 ? (Math.sin(this.life * 12) > 0 ? 0.35 : 1) : 1;
    ctx.globalAlpha = fade;

    const ringColor = this.kind.startsWith('armor') ? '#6fb3c9' : '#ffb454';
    ctx.strokeStyle = rgba(ringColor, 0.4);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 10, 13, 6, 0, 0, TAU); ctx.stroke();

    if (this.kind === 'med' || this.kind === 'medbig') {
      const s = this.kind === 'medbig' ? 8 : 6.5;
      ctx.fillStyle = '#e8e4da'; ctx.fillRect(this.x - s, y - s, s * 2, s * 2);
      ctx.fillStyle = '#e23b3b';
      ctx.fillRect(this.x - s * 0.75, y - s * 0.28, s * 1.5, s * 0.56);
      ctx.fillRect(this.x - s * 0.28, y - s * 0.75, s * 0.56, s * 1.5);
    } else if (this.kind === 'armor' || this.kind === 'armorbig') {
      // khiên giáp hình thoi
      const s = this.kind === 'armorbig' ? 9 : 7;
      ctx.fillStyle = '#2a3d47';
      ctx.beginPath();
      ctx.moveTo(this.x, y - s);
      ctx.lineTo(this.x + s * 0.8, y);
      ctx.lineTo(this.x, y + s);
      ctx.lineTo(this.x - s * 0.8, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6fb3c9'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#6fb3c9';
      ctx.fillRect(this.x - s * 0.15, y - s * 0.4, s * 0.3, s * 0.8);
    } else if (this.kind === 'ammo') {
      ctx.fillStyle = '#7a8394'; ctx.fillRect(this.x - 9, y - 6, 18, 12);
      ctx.fillStyle = '#ffb454';
      ctx.fillRect(this.x - 6, y - 3, 3, 6);
      ctx.fillRect(this.x - 1, y - 3, 3, 6);
      ctx.fillRect(this.x + 4, y - 3, 3, 6);
    } else if (this.kind === 'gun') {
      ctx.fillStyle = '#2e3a2e'; ctx.fillRect(this.x - 12, y - 9, 24, 18);
      ctx.strokeStyle = '#9db6d8'; ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x - 12, y - 9, 24, 18);
      ctx.beginPath();
      ctx.moveTo(this.x - 12, y - 9); ctx.lineTo(this.x + 12, y + 9);
      ctx.moveTo(this.x + 12, y - 9); ctx.lineTo(this.x - 12, y + 9);
      ctx.stroke();
      ctx.fillStyle = '#9db6d8'; ctx.fillRect(this.x - 4, y - 2, 8, 4);
    }
    ctx.globalAlpha = 1;
  }
}
