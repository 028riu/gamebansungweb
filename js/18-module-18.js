'use strict';

/* =====================================================================
   [18] TRẠNG THÁI GAME
   ===================================================================== */

const Game = {
  state: 'menu',
  mode: 'survival',
  mapId: 'warehouse',
  player: null,
  world: null,
  enemies: [],
  pickups: [],
  pendingSpawns: [],
  wave: 0,
  waveState: 'rest',
  waveRestT: 0,
  levelIndex: 0,
  diff: DIFFS[1],
  comboMult: 1,
  comboT: 0,
  kills: 0,
  timeScale: 1,
  slowmoT: 0,
  matchTime: 0,
  hitmarkT: 0,
  campaignProgress: safeLocalInt('sz_campaign', LEVELS.length),
  bestWave: safeLocalInt('sz_best', 100000),
  stats: { score: 0, shotsFired: 0, hits: 0, dealt: 0, crits: 0 },

  hitmarker() { this.hitmarkT = 0.12; },

  reset() {
    this.world = new GameWorld(this.mapId);
    this.player = new Player(this);
    this.enemies.length = 0;
    this.pickups.length = 0;
    this.pendingSpawns.length = 0;
    this.wave = 0;
    this.waveState = 'rest';
    this.waveRestT = 2.2;
    this.comboMult = 1; this.comboT = 0;
    this.kills = 0; this.matchTime = 0;
    this.timeScale = 1; this.slowmoT = 0;
    this.hitmarkT = 0;
    this.stats = { score: 0, shotsFired: 0, hits: 0, dealt: 0, crits: 0 };
    Bullets.clear();
    EnemyBullets.clear();
    Particles.clear();
    Stains.reset();
    Camera.x = this.player.x - innerWidth / 2;
    Camera.y = this.player.y - innerHeight / 2;
    Camera.trauma = 0;
    Camera.zoom = 1;
    Camera.zoomTarget = 1;
  },

  start() {
    this.reset();
    this.state = 'playing';
    HUD.show();
    HUD.buildSlots();
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('gameover').classList.add('hidden');
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('levelsel').classList.add('hidden');
    Sound.resume();
    if (this.mode === 'campaign') {
      this.beginLevel();
    } else {
      Sound.wave();
      HUD.banner('ĐỢT <em>1</em>', 'Chuẩn bị tác chiến', 2000);
    }
    HUD.rotateHint();
  },

  beginLevel() {
    const lv = LEVELS[this.levelIndex];
    this.waveState = 'fighting';
    let delay = 0.3;
    const cm = this.diff.countMul;
    for (const [type, baseCount] of Object.entries(lv.enemies)) {
      const count = type === 'BOSS' ? 1 : Math.max(1, Math.round(baseCount * cm));
      for (let i = 0; i < count; i++) {
        const pos = findSpawn(this, type === 'BOSS' ? 420 : 160);
        this.pendingSpawns.push({ type, x: pos.x, y: pos.y, t: delay });
        delay += type === 'BOSS' ? 0.2 : rand(0.14, 0.3);
      }
    }
    if (lv.enemies.BOSS) {
      Sound.boss();
      HUD.banner('MÀN <em>' + (this.levelIndex + 1) + '</em>', '⚠ WARDEN — ' + lv.name, 2800);
    } else {
      Sound.wave();
      HUD.banner('MÀN <em>' + (this.levelIndex + 1) + '</em>', lv.name, 1800);
    }
  },

  finishLevel() {
    this.waveState = 'rest';
    this.stats.score += 250 * (this.levelIndex + 1);
    this.player.giveAmmo(2);
    this.player.heal(35);
    this.player.addArmor(50);
    this.slowmoT = 0.7;
    Sound.levelup();
    if (this.levelIndex >= LEVELS.length - 1) {
      if (this.campaignProgress < LEVELS.length) {
        this.campaignProgress = LEVELS.length;
        safeLocalWrite('sz_campaign', this.campaignProgress);
      }
      Sound.victory();
      setTimeout(() => this.gameOver(true), 1400);
      HUD.banner('CHIẾN DỊCH <em>HOÀN TẤT</em>', 'Khu vực đã được bình định', 3000);
    } else {
      if (this.campaignProgress < this.levelIndex + 1) {
        this.campaignProgress = this.levelIndex + 1;
        safeLocalWrite('sz_campaign', this.campaignProgress);
      }
      HUD.banner('MÀN <em>' + (this.levelIndex + 1) + '</em> HOÀN TẤT', 'Đã mở khóa màn tiếp theo', 2600);
      Toast.show('Màn ' + (this.levelIndex + 1) + ' xong! +đạn +HP +giáp');
      setTimeout(() => {
        if (this.state === 'playing' && this.mode === 'campaign') {
          this.levelIndex++;
          this.beginLevel();
        }
      }, 4000);
    }
  },

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    document.getElementById('pause-info').textContent =
      (this.mode === 'campaign' ? 'Màn ' + (this.levelIndex + 1) : 'Đợt ' + this.wave) +
      ' — ' + this.stats.score.toLocaleString('vi-VN') + ' điểm — ' + this.kills + ' tiêu diệt';
    document.getElementById('pause').classList.remove('hidden');
  },

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    document.getElementById('pause').classList.add('hidden');
  },

  toMenu() {
    this.state = 'menu';
    HUD.hide();
    document.getElementById('menu').classList.remove('hidden');
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('gameover').classList.add('hidden');
    document.getElementById('levelsel').classList.add('hidden');
  },

  onPlayerDeath() {
    Sound.die();
    Camera.addTrauma(0.9);
    Camera.flash(0.5);
    Particles.burst(this.player.x, this.player.y, 30, {
      spMin: 80, spMax: 380, lifeMin: 0.3, lifeMax: 0.9, rMin: 2, rMax: 5,
      colors: ['#a8232b', '#e8e4da', '#c94b45'], type: 'dot',
    });
    Particles.ring(this.player.x, this.player.y, 6, 90, 0.6, '#a8232b');
    Stains.splat(this.player.x, this.player.y, 26, '#6e1620', 0.6);
    this.slowmoT = 1.0;
    setTimeout(() => this.gameOver(false), 1300);
  },

  gameOver(win) {
    if (this.state === 'over') return;
    this.state = 'over';
    HUD.hide();

    if (this.mode === 'survival' && this.wave > this.bestWave) {
      this.bestWave = this.wave;
      safeLocalWrite('sz_best', this.wave);
    }

    const s = this.stats;
    const acc = s.shotsFired > 0 ? Math.round(s.hits / s.shotsFired * 100) : 0;
    document.getElementById('over-title').textContent = win ? 'NHIỆM VỤ HOÀN THÀNH' : 'ĐÃ HẠ CÁNH';
    document.getElementById('over-title').className = win ? 'win' : 'lose';
    document.getElementById('st-score').textContent = s.score.toLocaleString('vi-VN');
    document.getElementById('st-kills').textContent = this.kills;
    document.getElementById('st-acc').textContent = acc + '%';
    if (this.mode === 'campaign') {
      document.getElementById('st-wave').textContent = (this.levelIndex + 1) + '/' + LEVELS.length;
      document.getElementById('st-wave-k').textContent = 'Màn đạt được';
      document.getElementById('st-best').textContent = this.campaignProgress + '/' + LEVELS.length;
    } else {
      document.getElementById('st-wave').textContent = this.wave;
      document.getElementById('st-wave-k').textContent = 'Đợt đạt được';
      document.getElementById('st-best').textContent = this.bestWave > 0 ? this.bestWave : '—';
    }
    document.getElementById('st-time').textContent = fmtTime(this.matchTime);
    document.getElementById('over-sub').textContent = win
      ? 'Toàn bộ khu vực đã an toàn. Anh là người hùng của SECTOR ZERO.'
      : pick([
          'Trạm điều phối đã ghi nhận toàn bộ quá trình tác chiến của anh.',
          'Bộ chỉ huy sẽ trích xuất anh ở lần sau. Lần này sống sót lâu hơn.',
          'Mỗi lần ra trận là một bài học. Lần sau sẽ xa hơn.',
        ]);
    document.getElementById('gameover').classList.remove('hidden');
  },

  addScore(base) {
    this.comboT = 3.2;
    this.comboMult = clamp(this.comboMult + 1, 1, 10);
    this.stats.score += Math.round(base * this.comboMult * (1 + this.wave * 0.05));
  },

  onEnemyKilled(e, noScore, crit) {
    if (!noScore) {
      this.kills++;
      this.addScore(e.isBoss ? e.score : (e.def ? e.def.score || 60 : 60));
      HUD.killfeed(
        e.isBoss ? 'WARDEN' : (e.def ? e.def.label : '?'),
        this.player.isMelee ? 'Dao' : (this.player.curGunId ? gunById(this.player.curGunId).name : '?'),
        crit
      );
    }
    this.tryDrop(e);
  },

  tryDrop(e) {
    const p = this.player;
    const roll = Math.random();
    if (e.isBoss) {
      this.pickups.push(new Pickup('medbig', e.x, e.y));
      this.pickups.push(new Pickup('armorbig', e.x + 30, e.y + 20));
      this.pickups.push(new Pickup('ammo', e.x - 30, e.y + 25));
      this.pickups.push(new Pickup('gun', e.x, e.y - 30, pick(GUNS.filter(g => !p.hasGun(g.id)).map(g => g.id) || ['rifle'])));
      Toast.show('WARDEN đã gục! Nhận đủ tiếp tế.');
      return;
    }
    if (p.hp < 45 && roll < 0.20) {
      this.pickups.push(new Pickup('med', e.x, e.y));
    } else if (p.armor < 40 && roll < 0.34) {
      this.pickups.push(new Pickup('armor', e.x, e.y));
    } else if (roll < 0.44) {
      this.pickups.push(new Pickup('ammo', e.x, e.y));
    } else if (roll < 0.49) {
      const missing = GUNS.filter(g => !p.hasGun(g.id)).map(g => g.id);
      if (missing.length > 0) this.pickups.push(new Pickup('gun', e.x, e.y, pick(missing)));
      else this.pickups.push(new Pickup('ammo', e.x, e.y));
    }
  },

  spawnEnemy(type, x, y) {
    let e;
    if (type === 'BOSS') { e = makeBoss(this); e.x = x; e.y = y; }
    else e = new Enemy(type, x, y, this);
    this.enemies.push(e);
    return e;
  },

  beginWave() {
    this.wave++;
    this.waveState = 'fighting';
    const comp = Waves.composition(this.wave, this.diff);
    let delay = 0.3;
    for (const type of comp) {
      const pos = findSpawn(this, type === 'BOSS' ? 420 : 160);
      this.pendingSpawns.push({ type, x: pos.x, y: pos.y, t: delay });
      delay += type === 'BOSS' ? 0.2 : rand(0.14, 0.3);
    }
    if (this.wave % 5 === 0) {
      Sound.boss();
      HUD.banner('ĐỢT <em>' + this.wave + '</em>', '⚠ CẢNH BÁO — WARDEN xuất hiện', 2800);
    } else {
      Sound.wave();
      HUD.banner('ĐỢT <em>' + this.wave + '</em>', comp.length + ' mục tiêu — tác chiến', 1800);
    }
    if (this.wave % 3 === 0) HUD.rotateHint();
  },

  updateFlow(dt) {
    for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
      const s = this.pendingSpawns[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.spawnEnemy(s.type, s.x, s.y);
        this.pendingSpawns.splice(i, 1);
      }
    }

    const left = this.enemies.filter(e => !e.dead).length + this.pendingSpawns.length;

    if (this.mode === 'survival') {
      if (this.waveState === 'rest') {
        this.waveRestT -= dt;
        if (this.waveRestT <= 0) this.beginWave();
      } else if (this.waveState === 'fighting' && left === 0) {
        this.waveState = 'rest';
        this.waveRestT = 4;
        this.stats.score += 100 * this.wave;
        this.player.giveAmmo(1.5);
        const healed = this.player.heal(20);
        this.player.addArmor(25);
        Toast.show('Đợt ' + this.wave + ' xong! +' + (100 * this.wave) + ' điểm' + (healed > 0 ? ' · +HP' : '') + ' · +giáp');
        Sound.levelup();
        this.slowmoT = Math.max(this.slowmoT, 0.55);
        HUD.banner('ĐỢT <em>' + this.wave + '</em> HOÀN TẤT', 'Tiếp tế — 4 giây tới đợt sau', 2400);
      }
    } else {
      if (this.waveState === 'fighting' && left === 0) {
        this.finishLevel();
      }
    }
  },

  update(dt) {
    if (this.state !== 'playing') return;
    if (this.slowmoT > 0) {
      this.slowmoT -= dt;
      this.timeScale = lerp(this.timeScale, 0.35, 0.2);
    } else {
      this.timeScale = lerp(this.timeScale, 1, 0.15);
    }
    const sdt = dt * this.timeScale;
    this.matchTime += dt;
    this.hitmarkT = Math.max(0, this.hitmarkT - dt);

    this.player.update(sdt);
    for (const e of this.enemies) if (!e.dead) e.update(sdt);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].dead) this.enemies.splice(i, 1);
    }

    Bullets.update(sdt, this);
    EnemyBullets.update(sdt, this);

    for (const pk of this.pickups) pk.update(sdt, this);
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      if (this.pickups[i].dead) this.pickups.splice(i, 1);
    }

    Particles.update(sdt);
    this.comboT -= dt;
    if (this.comboT <= 0) this.comboMult = 1;
    this.updateFlow(sdt);
    Camera.follow(this.player.x, this.player.y, sdt, innerWidth, innerHeight);
  },
};
window.Game = Game;
