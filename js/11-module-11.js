'use strict';

/* =====================================================================
   [11] NGƯỜI CHƠI — máu + GIÁP + 2 slot súng + dao vĩnh viễn
   ===================================================================== */

class Player {
  constructor(game) {
    this.game = game;
    this.x = WORLD_W / 2;
    this.y = WORLD_H / 2;
    this.r = 14;
    this.hp = 100; this.hpMax = 100;
    this.armor = 0; this.armorMax = 100;      // GIÁP: hấp thụ 60% sát thương
    this.speed = 250;
    this.aim = 0;
    this.dead = false;

    // 2 slot súng: slot[0], slot[1]; null = trống
    this.gunSlots = ['pistol', null];
    this.activeSlot = 0;                        // 0 | 1 | 'melee'
    this.mag = {};
    this.reserve = {};
    for (const g of GUNS) { this.mag[g.id] = 0; this.reserve[g.id] = 0; }
    this.mag.pistol = gunById('pistol').mag;
    this.reserve.pistol = gunById('pistol').reserve;

    this.fireTimer = 0;
    this.reloadTimer = 0;
    this.reloading = false;
    this.triggerHeld = false;

    this.aiming = false;
    this.assistTarget = null;

    this.dashTimer = 0; this.dashCd = 0; this.dashRechargeTimer = 0;
    this.dashDir = { x: 1, y: 0 };
    this.invuln = 0;
    this.hurtFlash = 0;
    this.regenTimer = 0;
    this.slashAnim = 0;

    // nạp tự động trên mobile: joystick ngaim giữ => bắn liên tục
    this.autoFire = false;
    this.build = { damage: 1, speed: 1, rate: 1, reload: 1, bullet: 1, mag: 1, crit: 0.05, dashDist: 1, dashCd: 1, life: 0, pickup: 1, reduce: 0, pellet: 0, pierce: 0, drop: 0, score: 1, counts: {} };
    this.level = 1; this.xp = 0; this.xpNext = 100;
    this.dashMaxCharges = 1; this.dashCharges = 1;
    this.damageTakenThisWave = 0; this.lastWeaponId = 'pistol';
  }

  get isMelee()    { return this.activeSlot === 'melee'; }
  get curGunId()   { return this.isMelee ? null : this.gunSlots[this.activeSlot]; }
  get weapon()     { return this.isMelee ? MELEE : gunById(this.curGunId); }

  /* --- hệ thống vũ khí 2 slot --- */

  hasGun(id) { return this.gunSlots.includes(id); }

  giveGun(id, silent) {
    if (id === 'melee') return false;
    const w = gunById(id);
    if (!w) return false;

    if (this.hasGun(id)) {
      // đã có: tiếp đạn
      const before = this.reserve[id];
      this.reserve[id] = Math.min(w.reserveMax, this.reserve[id] + w.mag * 2);
      if (this.reserve[id] > before && !silent) Toast.show(w.name + ': +đạn dự trữ');
      return false;
    }

    const emptyIdx = this.gunSlots.indexOf(null);
    if (emptyIdx !== -1) {
      // còn chỗ trống: cứ đặt vào
      this.gunSlots[emptyIdx] = id;
      this.mag[id] = w.mag;
      this.reserve[id] = w.reserve;
      if (!silent) { Toast.show('Gắn ' + w.name + ' vào slot ' + (emptyIdx + 1)); Sound.levelup(); }
    } else {
      // hết chỗ: THAY khẩu đang cầm (nếu đang cầm dao thì thay slot 0)
      const slot = this.isMelee ? 0 : this.activeSlot;
      const old = this.gunSlots[slot];
      this.gunSlots[slot] = id;
      this.mag[id] = w.mag;
      this.reserve[id] = w.reserve;
      this.activeSlot = slot;
      if (!silent) {
        Toast.show('Đổi ' + (old ? gunById(old).name : '—') + ' → ' + w.name);
        Sound.levelup();
      }
    }
    this.cancelReload();
    HUD.buildSlots();
    return true;
  }

  swapGun() {
    if (this.isMelee) {
      const preferred = this.lastGunSlot === 1 ? 1 : 0;
      if (this.gunSlots[preferred]) this.activeSlot = preferred;
      else if (this.gunSlots[1 - preferred]) this.activeSlot = 1 - preferred;
      else { Toast.show('Chưa có súng trong slot'); return; }
    } else {
      const other = this.activeSlot === 0 ? 1 : 0;
      if (this.gunSlots[other]) { this.lastGunSlot = other; this.activeSlot = other; }
      else { Toast.show('Slot ' + (other + 1) + ' EMPTY'); return; }
    }
    this.cancelReload();
    this.railChargeReady = false;
    this.fireTimer = Math.max(this.fireTimer, 0.18);
    Sound.swap();
    HUD.buildSlots();
  }

  toMelee() {
    if (this.isMelee) return;
    this.lastGunSlot = this.activeSlot;
    this.activeSlot = 'melee';
    this.cancelReload();
    this.railChargeReady = false;
    this.fireTimer = Math.max(this.fireTimer, 0.12);
    Sound.swap();
    HUD.buildSlots();
  }

  selectSlot(i) {
    if (i !== 0 && i !== 1) return;
    if (!this.gunSlots[i]) {
      Toast.show('Slot ' + (i + 1) + ' trống');
      return;
    }
    if (this.activeSlot === i) return;
    this.activeSlot = i;
    this.lastGunSlot = i;
    this.cancelReload();
    this.railChargeReady = false;
    this.fireTimer = Math.max(this.fireTimer, 0.18);
    Sound.ui();
    HUD.buildSlots();
  }

  giveAmmo(frac) {
    let given = false;
    for (const id of this.gunSlots) {
      if (!id) continue;
      const w = gunById(id);
      const before = this.reserve[id];
      this.reserve[id] = Math.min(w.reserveMax, this.reserve[id] + Math.ceil(w.mag * frac));
      if (this.reserve[id] > before) given = true;
    }
    return given;
  }

  addArmor(v) {
    const before = this.armor;
    this.armor = Math.min(this.armorMax, this.armor + v);
    if (this.armor > before) Sound.armorUp();
    return this.armor - before;
  }

  tryReload() {
    if (this.isMelee || this.reloading || !this.curGunId) return;
    const w = this.weapon;
    if (this.mag[this.curGunId] >= Math.ceil(w.mag * (this.build.mag || 1))) return;
    if (this.reserve[this.curGunId] <= 0) return;
    this.reloading = true;
    this.reloadTimer = w.reload / (this.build.reload || 1);
    Sound.reloadStart();
  }

  cancelReload() { this.reloading = false; this.reloadTimer = 0; }

  update(dt) {
    if (this.dead) return;
    const g = this.game;
    const w = this.weapon;

    /* ---- input nguồn: desktop hay touch ---- */
    let ix = 0, iy = 0;
    if (Device.isTouch) {
      ix = Input.moveVec.x;
      iy = Input.moveVec.y;
    } else {
      if (Input.keys['KeyW'] || Input.keys['ArrowUp']) iy -= 1;
      if (Input.keys['KeyS'] || Input.keys['ArrowDown']) iy += 1;
      if (Input.keys['KeyA'] || Input.keys['ArrowLeft']) ix -= 1;
      if (Input.keys['KeyD'] || Input.keys['ArrowRight']) ix += 1;
    }
    const mag = Math.hypot(ix, iy);
    const moving = mag > 0.05;
    if (moving) { ix /= Math.max(1, mag); iy /= Math.max(1, mag); }

    /* ---- ngắm & bắn: touch ---- */
    let wantFire = false;
    let wantAim = false;
    if (Device.isTouch) {
      if (Input.aimActive) {
        // joystick phải kéo lệch đáng kể => ngắm theo hướng đó + tự bắn
        const tAim = Math.atan2(Input.aimVec.y, Input.aimVec.x);
        this.aim = angLerp(this.aim, tAim, 1 - Math.pow(0.0001, dt));
        wantFire = Math.hypot(Input.aimVec.x, Input.aimVec.y) > 0.45;
      }
      wantAim = Input.tbtn.aim && !this.isMelee;
      if (Input.tbtn.reload) this.tryReload();
      if (Input.tbtn.dash && this.canDash() && moving) this.doDash(ix, iy);
      if (Input.swapQueued) { Input.swapQueued = false; if (!g.pickupNearby()) this.swapGun(); }
    } else {
      const mx = Input.mouse.x + Camera.x - Camera.ox;
      const my = Input.mouse.y + Camera.y - Camera.oy;
      const rawAim = angTo(this.x, this.y, mx, my);
      wantFire = Input.mouse.down;
      wantAim = Input.mouse.rdown && !this.isMelee && !this.reloading;

      if (wantAim && SZSettings.aimAssist) {
        // aim assist nhẹ: địch gần nhất trong nón 7°, không qua tường
        let best = null, bestD = 850 * 850;
        for (const e of g.enemies) {
          if (e.dead || e.spawning) continue;
          const d2 = dist2(this.x, this.y, e.x, e.y);
          if (d2 > bestD) continue;
          if (g.world.raycast(this.x, this.y, e.x, e.y)) continue;
          if (Math.abs(angDiff(rawAim, angTo(this.x, this.y, e.x, e.y))) < 0.12) {
            best = e; bestD = d2;
          }
        }
        this.assistTarget = best;
        if (best) {
          this.aim = angLerp(this.aim, angTo(this.x, this.y, best.x, best.y), 1 - Math.pow(0.75, dt * 60));
        } else {
          this.aim = angLerp(this.aim, rawAim, 1 - Math.pow(0.001, dt));
        }
      } else {
        this.assistTarget = null;
        this.aim = rawAim;
      }
      if (consumePressed('ShiftLeft') || consumePressed('ShiftRight')) {
        if (this.canDash() && moving) this.doDash(ix, iy);
      }
      if (consumePressed('KeyR')) this.tryReload();
      if (consumePressed('KeyE')) { if (!g.pickupNearby()) this.swapGun(); }
      if (consumePressed('KeyQ') || consumePressed('Digit3')) this.toMelee();
      if (consumePressed('Digit1')) this.selectSlot(0);
      if (consumePressed('Digit2')) this.selectSlot(1);
      if (Input.wheel !== 0) { this.swapGun(); Input.wheel = 0; }
    }
    this.aiming = wantAim;
    this.autoFire = wantFire;

    /* ---- di chuyển ---- */
    const spd = (this.aiming ? this.speed * 0.6 : this.speed) * (this.build.speed || 1) * (SZHack.speed ? 2 : 1);
    if (SZHack.dash) { this.dashCharges = this.dashMaxCharges; this.dashCd = 0; this.dashRechargeTimer = 0; }
    else if (this.dashCharges < this.dashMaxCharges) { this.dashRechargeTimer = Math.max(0, this.dashRechargeTimer - dt); if (this.dashRechargeTimer === 0) { this.dashCharges++; if (this.dashCharges < this.dashMaxCharges) this.dashRechargeTimer = 1.5 / (this.build.dashCd || 1); } this.dashCd = this.dashRechargeTimer; }
    else { this.dashCd = 0; this.dashRechargeTimer = 0; }
    this.invuln = Math.max(0, this.invuln - dt);

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.x += this.dashDir.x * 620 * dt;
      this.y += this.dashDir.y * 620 * dt;
      Particles.ghost(this.x, this.y, this.aim, this.r);
      if (Math.random() < 0.4) Particles.smokePuff(this.x, this.y, 1, false);
    } else if (moving) {
      this.x += ix * spd * dt * Math.min(1, mag);
      this.y += iy * spd * dt * Math.min(1, mag);
    }
    g.world.circlePush(this);

    /* ---- bắn / chém ---- */
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.slashAnim = Math.max(0, this.slashAnim - dt);
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0 && this.curGunId) {
        const wg = this.weapon;
        const need = Math.ceil(wg.mag * (this.build.mag || 1)) - this.mag[this.curGunId];
        const take = Math.min(need, this.reserve[this.curGunId]);
        this.mag[this.curGunId] += take;
        this.reserve[this.curGunId] -= take;
        this.reloading = false;
        Sound.reloadEnd();
      }
    } else if (wantFire && this.fireTimer <= 0) {
      if (w.auto || !this.triggerHeld) {
        if (this.isMelee) {
          this.meleeAttack();
          this.triggerHeld = true;
        } else if (this.mag[this.curGunId] > 0) {
          this.fire();
          this.triggerHeld = true;
        } else {
          Sound.empty();
          if (this.reserve[this.curGunId] <= 0) {
            Toast.show('Hết đạn! Nhấn ' + (Device.isTouch ? 'E ĐỔI' : 'Q') + ' để rút dao');
          }
          this.tryReload();
          this.triggerHeld = true;
        }
      }
    }
    if (!wantFire) { this.triggerHeld = false; if (this.weapon.projectile === 'rail') this.railChargeReady = false; }

    /* ---- hồi máu ---- */
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.regenTimer += dt;
    if (this.regenTimer > 6 && this.hp < this.hpMax) {
      this.hp = Math.min(this.hpMax, this.hp + 4 * dt);
    }
  }

  doDash(ix, iy) {
    if (!this.canDash()) return;
    this.dashTimer = 0.16;
    if (!SZHack.dash) this.dashCharges--;
    this.dashRechargeTimer = SZHack.dash ? 0 : 1.5 / (this.build.dashCd || 1);
    this.dashCd = this.dashRechargeTimer;
    if (Game.runStats) Game.runStats.dashes++;
    this.dashDir = { x: ix, y: iy };
    this.invuln = 0.24;
    Sound.dash();
    Particles.smokePuff(this.x, this.y, 3, false);
  }

  fire() {
    const g = this.game;
    const w = this.weapon;
    if (w.projectile === 'rail' && !this.railChargeReady) {
      this.railChargeReady = true; this.fireTimer = w.charge || 0.65;
      const cx = this.x + Math.cos(this.aim) * (this.r + 16), cy = this.y + Math.sin(this.aim) * (this.r + 16);
      Particles.ring(cx, cy, 3, 34, w.charge || 0.65, '#ff8eff'); Sound.boss(); Camera.addTrauma(0.035); return;
    }
    this.railChargeReady = false;
    this.mag[this.curGunId]--;
    const rpm = SZHack.fireRate ? 24 : w.rpm * (this.build.rate || 1) * (1 + ((SZMastery[this.curGunId]?.level || 0) * 0.05));
    this.fireTimer = Math.max(1 / 24, 60 / Math.max(1, rpm));

    const md = this.r + 16;
    const mx = this.x + Math.cos(this.aim) * md;
    const my = this.y + Math.sin(this.aim) * md;
    const spreadMul = this.aiming ? 0.45 : 1;

    const pellets = Math.min(16, w.pellets + (this.curGunId === 'shotgun' ? (this.build.pellet || 0) : 0));
    const damage = SZHack.damage ? 9999 : w.dmg * (this.build.damage || 1) * (1 + ((SZMastery[this.curGunId]?.level || 0) * 0.05));
    for (let i = 0; i < pellets; i++) {
      const a = this.aim + (Math.random() - 0.5) * 2 * w.spread * spreadMul;
      Bullets.spawnPlayer({
        x: mx, y: my,
        vx: Math.cos(a) * w.bulletSpeed * (this.build.bullet || 1),
        vy: Math.sin(a) * w.bulletSpeed * (this.build.bullet || 1),
        dmg: damage, r: w.r * 0.5 + 1.2, trail: w.trail, pierce: w.pierce + (this.build.pierce || 0), color: w.color || '#fff0cf', projectile: w.projectile || 'bullet', weaponId: this.curGunId,
      });
    }
    this.lastWeaponId = this.curGunId; g.lastPlayerDamageWeapon = this.curGunId;
    g.stats.shotsFired += pellets;
    Particles.muzzle(mx, my, this.aim, w.flash);
    Particles.shell(this.x + Math.cos(this.aim) * 10, this.y + Math.sin(this.aim) * 10, this.aim);
    Camera.addTrauma(w.shake * (this.aiming ? 0.7 : 1));
    if (w.shake > 0.2) Camera.punchZoom(0.97);
    if (w.projectile === 'rail') { Particles.ring(mx, my, 4, 190, 0.42, '#ff8eff'); Camera.flash(0.14); Camera.addTrauma(0.24); }
    if (Sound[w.sfx]) Sound[w.sfx](); else Sound.rifle();

    this.x -= Math.cos(this.aim) * w.kick * 40;
    this.y -= Math.sin(this.aim) * w.kick * 40;
    g.world.circlePush(this);
  }

  meleeAttack() {
    const g = this.game;
    this.fireTimer = 60 / MELEE.rpm;
    this.slashAnim = 0.16;
    Sound.melee();
    Camera.addTrauma(MELEE.shake);
    Particles.slash(this.x, this.y, this.aim, MELEE.reach);

    let hitAny = false;
    for (const e of g.enemies) {
      if (e.dead || e.spawning) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d > MELEE.reach + e.r) continue;
      const a = angTo(this.x, this.y, e.x, e.y);
      if (Math.abs(angDiff(this.aim, a)) > MELEE.arc) continue;

      hitAny = true;
      const crit = Math.random() < Math.min(0.8, this.build.crit || 0.05);
      const dmg = MELEE.dmg * (this.build.damage || 1) * (crit ? 2 : 1);
      e.takeDamage(dmg, a, g, crit);
      Particles.dmgText(e.x, e.y - e.r, dmg, crit, '#9db6d8');
      g.hitmarker();
      const kb = MELEE.knockback * (e.isBoss ? 0.15 : 1);
      e.x += Math.cos(a) * kb * 0.06;
      e.y += Math.sin(a) * kb * 0.06;
    }
    if (!hitAny) {
      const wx = this.x + Math.cos(this.aim) * MELEE.reach * 0.8;
      const wy = this.y + Math.sin(this.aim) * MELEE.reach * 0.8;
      if (g.world.hitsAny(wx, wy, 2)) {
        Particles.sparkHit(wx, wy, this.aim + Math.PI);
        Particles.debrisBurst(wx, wy, 3);
      }
    }
  }

  takeDamage(dmg, game) {
    if (this.invuln > 0 || this.dead) return;
    let d = dmg * game.diff.dmgMul;

    // GIÁP hấp thụ 60% sát thương đến khi cạn
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, d * 0.6);
      this.armor -= absorbed;
      d -= absorbed;
      Particles.burst(this.x, this.y, 4, {
        spMin: 60, spMax: 180, lifeMin: 0.15, lifeMax: 0.3,
        rMin: 1, rMax: 2.5, colors: ['#6fb3c9', '#a8dde9'], type: 'spark',
      });
      if (this.armor <= 0) { this.armor = 0; Toast.show('Giáp vỡ!'); }
    }

    this.hp -= Math.round(d);
    this.regenTimer = 0;
    this.hurtFlash = 0.35;
    Sound.hurt();
    Camera.addTrauma(0.35);
    HUD.hurtPulse();
    Particles.blood(this.x, this.y, rand(0, TAU), 6);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      game.onPlayerDeath();
    }
  }

  heal(v) {
    const before = this.hp;
    this.hp = Math.min(this.hpMax, this.hp + v);
    return this.hp - before;
  }

  /* ---- vẽ ---- */

  draw(ctx) {
    if (this.dead) return;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.7, this.r * 1.05, this.r * 0.5, 0, 0, TAU);
    ctx.fill();

    const flash = this.hurtFlash > 0;
    const inv = this.invuln > 0 && Math.floor(performance.now() / 60) % 2 === 0;
    ctx.globalAlpha = inv ? 0.45 : 1;

    // vòng giáp ngoài
    if (this.armor > 0) {
      const ap = this.armor / this.armorMax;
      ctx.strokeStyle = rgba('#6fb3c9', 0.3 + ap * 0.4);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * ap);
      ctx.stroke();
    }

    ctx.fillStyle = flash ? '#e86a6a' : '#e8e4da';
    ctx.strokeStyle = '#23262c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = this.aiming ? '#3d5a80' : (flash ? '#c94b45' : '#2f333b');
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r - 3, this.aim - 0.55, this.aim + 0.55);
    ctx.arc(this.x, this.y, this.r - 8, this.aim + 0.55, this.aim - 0.55, true);
    ctx.closePath(); ctx.fill();

    const px = Math.cos(this.aim), py = Math.sin(this.aim);
    const perpX = -py, perpY = px;
    ctx.fillStyle = flash ? '#d3766f' : '#c9c4b8';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(this.x + px * (this.r - 2) + perpX * 5 * s, this.y + py * (this.r - 2) + perpY * 5 * s, 4.4, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x + px * (this.r + 3), this.y + py * (this.r + 3));
    ctx.rotate(this.aim);
    if (this.isMelee) this.drawKnife(ctx);
    else this.drawGun(ctx);
    ctx.restore();

    ctx.globalAlpha = 1;
  }

  drawKnife(ctx) {
    const swing = this.slashAnim > 0 ? (this.slashAnim / 0.16) : 0;
    ctx.rotate(-0.5 + swing * 1.2);
    ctx.fillStyle = '#3a3f48';
    ctx.fillRect(0, -1.6, 7, 3.2);
    ctx.fillStyle = '#dceaf7';
    ctx.beginPath();
    ctx.moveTo(7, -2.4); ctx.lineTo(24, -0.4); ctx.lineTo(7, 2.4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8fa8c4';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  drawGun(ctx) {
    const id = this.curGunId;
    if (!id) return;
    ctx.fillStyle = '#23262c';
    if (id === 'pistol') {
      ctx.fillRect(0, -2.2, 15, 4.4);
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(10, -1.4, 5, 2.8);
    } else if (id === 'revolver') {
      ctx.fillRect(0, -2.6, 13, 5.2);
      ctx.beginPath(); ctx.arc(2, 0, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(11, -1.6, 8, 3.2);
    } else if (id === 'smg') {
      ctx.fillRect(-2, -2.4, 22, 4.8);
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(5, 2, 3.4, 7); ctx.fillRect(18, -1.2, 6, 2.4);
    } else if (id === 'shotgun') {
      ctx.fillRect(0, -3.6, 26, 3); ctx.fillRect(0, 0.8, 26, 3);
      ctx.fillStyle = '#5b4a2f'; ctx.fillRect(-4, -2.6, 8, 5.2);
    } else if (id === 'rifle') {
      ctx.fillRect(-4, -2.6, 30, 5.2);
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(8, 2.4, 3.2, 8);
      ctx.fillStyle = '#5b4a2f'; ctx.fillRect(-6, -2, 7, 4);
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(24, -1, 6, 2);
    } else if (id === 'lmg') {
      ctx.fillRect(-5, -3.2, 32, 6.4);
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(6, 3, 5, 10);
      ctx.fillRect(24, -2, 8, 4);
      ctx.fillStyle = '#5b4a2f'; ctx.fillRect(-8, -2.4, 8, 4.8);
    } else if (id === 'sniper') {
      ctx.fillRect(-6, -2.4, 38, 4.8);
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(12, -7, 10, 3);
      ctx.fillStyle = '#5b4a2f'; ctx.fillRect(-8, -2.2, 8, 4.4);
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(30, -1.2, 7, 2.4);
    } else if (id === 'dualsmg') {
      ctx.fillRect(-1, -4.5, 20, 3.2);
      ctx.fillRect(-1, 1.3, 20, 3.2);
      ctx.fillStyle = '#3a3f48';
      ctx.fillRect(6, -4, 2.6, 6); ctx.fillRect(6, 1.8, 2.6, 6);
    }
  }
}
