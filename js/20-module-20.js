'use strict';

/* =====================================================================
   [20] KHỞI TẠO UI
   ===================================================================== */

let selDiff = 1, selMap = 'warehouse', selMode = 'survival';

function drawMapThumbs() {
  document.querySelectorAll('[data-map-thumb]').forEach(cv => {
    const id = cv.dataset.mapThumb;
    const w = new GameWorld(id);
    const c = cv.getContext('2d');
    const sx = cv.width / WORLD_W, sy = cv.height / WORLD_H;
    c.fillStyle = '#0d0f13';
    c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#2a2f38';
    for (const o of w.obstacles) {
      c.fillRect(o.x * sx, o.y * sy, Math.max(1, o.w * sx), Math.max(1, o.h * sy));
    }
    c.fillStyle = '#ffb454';
    c.beginPath(); c.arc(cv.width / 2, cv.height / 2, 3, 0, TAU); c.fill();
  });
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    selMode = btn.dataset.mode;
    Sound.ui();
  });
});
document.querySelectorAll('.map-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    selMap = btn.dataset.map;
    Sound.ui();
  });
});
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    selDiff = parseInt(btn.dataset.diff, 10);
    Game.diff = DIFFS[selDiff];
    Sound.ui();
  });
});

const btnSoundMain = document.getElementById('btn-sound');
const btnSoundPause = document.getElementById('btn-sound-p');
function syncSoundLabels() {
  const label = 'Âm thanh: ' + (Sound.enabled ? 'Bật' : 'Tắt');
  btnSoundMain.textContent = label;
  btnSoundPause.textContent = label;
}
btnSoundMain.addEventListener('click', () => { Sound.toggle(); syncSoundLabels(); });
btnSoundPause.addEventListener('click', () => { Sound.toggle(); syncSoundLabels(); });

document.getElementById('btn-start').addEventListener('click', () => {
  Sound.ui();
  if (selMode === 'campaign') {
    openLevelSelect();
  } else {
    Game.mode = 'survival';
    Game.mapId = selMap;
    Game.diff = DIFFS[selDiff];
    Game.levelIndex = 0;
    Game.start();
  }
});

function openLevelSelect() {
  Game.mode = 'campaign';
  Game.mapId = selMap;
  Game.diff = DIFFS[selDiff];
  const list = document.getElementById('level-list');
  list.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const unlocked = i <= Game.campaignProgress;
    const cleared = i < Game.campaignProgress;
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (unlocked ? '' : ' locked');
    const count = Object.entries(lv.enemies)
      .map(([t, n]) => (t === 'BOSS' ? 'BOSS' : n + ' ' + t)).join(' · ');
    btn.innerHTML =
      '<span class="lv-name">Màn ' + (i + 1) + ' — ' + lv.name +
      (cleared ? '<span class="lv-check">✓</span>' : '') + '</span>' +
      '<span class="lv-info">' + (unlocked ? count : 'Chưa mở khóa') + '</span>';
    if (unlocked) {
      btn.addEventListener('click', () => {
        Sound.ui();
        Game.levelIndex = i;
        Game.start();
      });
    }
    list.appendChild(btn);
  });
  document.getElementById('levelsel').classList.remove('hidden');
  document.getElementById('menu').classList.add('hidden');
}

document.getElementById('btn-ls-back').addEventListener('click', () => {
  Sound.ui();
  document.getElementById('levelsel').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
});
document.getElementById('btn-resume').addEventListener('click', () => { Sound.ui(); Game.resume(); });
document.getElementById('btn-restart-p').addEventListener('click', () => { Sound.ui(); Game.start(); });
document.getElementById('btn-menu-p').addEventListener('click', () => { Sound.ui(); Game.toMenu(); });
document.getElementById('btn-again').addEventListener('click', () => {
  Sound.ui();
  if (Game.mode === 'campaign') {
    Game.levelIndex = Math.min(Game.levelIndex, LEVELS.length - 1);
  }
  Game.start();
});
document.getElementById('btn-menu-g').addEventListener('click', () => { Sound.ui(); Game.toMenu(); });

/* Profile, settings, achievements, and local cheat access. */
const SZ_STORAGE_KEY='sector_zero_profile_v1';
function szReadSave(){try{const v=JSON.parse(localStorage.getItem(SZ_STORAGE_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(_){return {}}}
const SZSave={data:szReadSave(),flush(){try{localStorage.setItem(SZ_STORAGE_KEY,JSON.stringify(this.data))}catch(_){Toast.show('Không thể lưu tiến trình trên thiết bị này')}}};
const SZDefaults={master:.8,sfx:.8,music:.35,shake:true,numbers:true,particles:'high',minimap:true,autoPickup:true,aimAssist:true};
function szLoadSettings(raw){const v=raw&&typeof raw==='object'?raw:{};return {master:clamp(Number(v.master??SZDefaults.master)||0,0,1),sfx:clamp(Number(v.sfx??SZDefaults.sfx)||0,0,1),music:clamp(Number(v.music??SZDefaults.music)||0,0,1),shake:v.shake!==false,numbers:v.numbers!==false,particles:['low','medium','high'].includes(v.particles)?v.particles:'high',minimap:v.minimap!==false,autoPickup:v.autoPickup!==false,aimAssist:v.aimAssist!==false}}
const SZSettings=szLoadSettings(SZSave.data.settings);
const SZRarity={pistol:'common',revolver:'rare',smg:'common',shotgun:'common',rifle:'rare',lmg:'rare',sniper:'epic',dualsmg:'rare',plasma:'epic',railgun:'legendary'};
function szNonNegative(v,max=1e9){const n=Number(v);return Number.isFinite(n)?clamp(n,0,max):0}
const SZMastery=Object.create(null),SZAchievements=Object.create(null);
for(const gun of GUNS){const m=SZSave.data.mastery?.[gun.id];if(m&&typeof m==='object')SZMastery[gun.id]={xp:szNonNegative(m.xp,1e6),level:Math.max(1,Math.floor(szNonNegative(m.level,1000))),kills:Math.floor(szNonNegative(m.kills))}}
for(const id of ['firstBlood','kills100','kills1000','boss','crit','collector','survivor','noDamage','combo','railgun','fullArsenal'])SZAchievements[id]=SZSave.data.achievements?.[id]===true;
const SZLifetime=Object.create(null);for(const id of ['kills','damage','shots','hits','crits','bestCombo','bestWave','bestScore','playTime','bosses','weapons','dashes'])SZLifetime[id]=szNonNegative(SZSave.data.lifetime?.[id]);
const SZUpgrades=[
 {id:'hp',icon:'✚',name:'+25% MAX HP',desc:'Tăng máu tối đa và hồi 25 HP ngay.',apply:p=>{p.hpMax=Math.round(p.hpMax*1.25);p.heal(25)}},
 {id:'speed',icon:'➤',name:'+25% MOVE SPEED',desc:'Tăng tốc độ di chuyển thường thêm 25%.',apply:p=>p.build.speed*=1.25},
 {id:'damage',icon:'✹',name:'+25% DAMAGE',desc:'Mọi sát thương tăng thêm 25%.',apply:p=>p.build.damage*=1.25},
 {id:'rate',icon:'⌁',name:'+25% FIRE RATE',desc:'Tăng tốc độ bắn thêm 25%.',apply:p=>p.build.rate*=1.25},
 {id:'reload',icon:'↻',name:'+20% RELOAD SPEED',desc:'Rút ngắn thời gian nạp đạn 20%.',apply:p=>p.build.reload*=1.2},
 {id:'bullet',icon:'➟',name:'+15% BULLET SPEED',desc:'Đạn bay nhanh hơn 15%.',apply:p=>p.build.bullet*=1.15},
 {id:'mag',icon:'▤',name:'+20% MAGAZINE SIZE',desc:'Băng đạn lớn hơn 20%; dung lượng mới áp dụng ngay.',apply:p=>p.build.mag*=1.2},
 {id:'crit',icon:'✦',name:'+15% CRITICAL CHANCE',desc:'Tăng 15 điểm phần trăm tỷ lệ chí mạng.',apply:p=>p.build.crit+=.15},
 {id:'dashDist',icon:'»',name:'+25% DASH DISTANCE',desc:'Tăng quãng lướt thêm 25%.',apply:p=>p.build.dashDist*=1.25},
 {id:'dashCd',icon:'◷',name:'-20% DASH COOLDOWN',desc:'Hồi lướt nhanh hơn 20%.',apply:p=>p.build.dashCd*=1.25},
 {id:'dashCharge',icon:'↯',name:'+1 DASH CHARGE',desc:'Có thêm một lượt lướt trước khi hồi.',apply:p=>{p.dashMaxCharges++;p.dashCharges++}},
 {id:'life',icon:'♥',name:'+10% LIFESTEAL',desc:'Hồi máu bằng 10% sát thương gây ra.',apply:p=>p.build.life+=.1},
 {id:'armor',icon:'⬟',name:'+20% ARMOR CAPACITY',desc:'Tăng giới hạn giáp tối đa thêm 20.',apply:p=>{p.armorMax+=20;p.addArmor(20)}},
 {id:'pickup',icon:'◎',name:'+25% PICKUP RANGE',desc:'Nhặt vật phẩm từ khoảng cách xa hơn.',apply:p=>p.build.pickup*=1.25},
 {id:'reduce',icon:'▣',name:'+10% DAMAGE REDUCTION',desc:'Giảm sát thương nhận vào 10%.',apply:p=>p.build.reduce+=.1},
 {id:'pellet',icon:'✣',name:'+1 SHOTGUN PROJECTILE',desc:'Súng săn bắn thêm một viên mỗi lần.',apply:p=>p.build.pellet++},
 {id:'pierce',icon:'⇢',name:'+1 BULLET PIERCE',desc:'Đạn đi xuyên thêm một kẻ địch.',apply:p=>p.build.pierce++},
 {id:'drop',icon:'◇',name:'+15% DROP CHANCE',desc:'Tăng khả năng nhận tiếp tế từ kẻ địch.',apply:p=>p.build.drop+=.15},
 {id:'score',icon:'★',name:'+10% SCORE MULTIPLIER',desc:'Điểm nhận được tăng thêm 10%.',apply:p=>p.build.score*=1.1}
];
const SZStats={commit(){SZLifetime.kills+=Game.kills||0;SZLifetime.damage+=Math.round(Game.stats.dealt||0);SZLifetime.shots+=Game.stats.shotsFired||0;SZLifetime.hits+=Game.stats.hits||0;SZLifetime.crits+=Game.stats.crits||0;SZLifetime.bestCombo=Math.max(SZLifetime.bestCombo,Game.comboMult||1);SZLifetime.bestWave=Math.max(SZLifetime.bestWave,Game.wave||0);SZLifetime.bestScore=Math.max(SZLifetime.bestScore,Game.stats.score||0);SZLifetime.playTime+=Game.matchTime||0;SZLifetime.bosses+=Game.runStats?.bosses||0;SZLifetime.weapons+=Game.runStats?.weapons||0;SZLifetime.dashes+=Game.runStats?.dashes||0;SZSave.data.lifetime=SZLifetime;SZSave.data.mastery=SZMastery;SZSave.data.achievements=SZAchievements;SZSave.data.settings=SZSettings;SZSave.flush()}};
const szAccess=document.getElementById('sz-access'),szTerm=document.getElementById('sz-terminal'),szBadge=document.getElementById('sz-hack-logo');
const SZHack={damage:false,fireRate:false,speed:false,dash:false,authenticated:false};
function szUpdateHackUi(){const on=SZHack.damage||SZHack.fireRate||SZHack.speed||SZHack.dash;document.querySelectorAll('[data-hack]').forEach(i=>{i.checked=SZHack[i.dataset.hack];const s=i.parentElement.querySelector('.sz-hack-state');s.textContent=i.checked?'ON':'OFF';s.classList.toggle('on',i.checked)});document.getElementById('sz-hack-status').textContent=on?'ONLINE':'OFFLINE';document.getElementById('sz-hack-summary').textContent=on?'ONLINE':'OFF';document.getElementById('sz-hack-dmg').textContent=SZHack.damage?'9999':'OFF';document.getElementById('sz-hack-rpm').textContent=SZHack.fireRate?'9999':'OFF';document.getElementById('sz-hack-speed').textContent=SZHack.speed?'×2':'OFF';document.getElementById('sz-hack-dash').textContent=SZHack.dash?'INFINITE':'OFF';szBadge.classList.toggle('active',on)}
function szOpenHack(){if(!SZHack.authenticated){szAccess.classList.remove('hidden');document.getElementById('sz-access-code').value='';document.getElementById('sz-denied').textContent='';document.getElementById('sz-access-code').focus()}else{szTerm.classList.remove('hidden');szBadge.classList.add('hidden');szUpdateHackUi()}}
document.getElementById('sz-access-form').addEventListener('submit',e=>{e.preventDefault();if(document.getElementById('sz-access-code').value==='0028'){SZHack.authenticated=true;szAccess.classList.add('hidden');szTerm.classList.remove('hidden');szBadge.classList.add('hidden');Sound.levelup();szUpdateHackUi()}else{const i=document.getElementById('sz-access-code');document.getElementById('sz-denied').textContent='ACCESS DENIED';i.animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(0)'}],{duration:180});i.select()}});
document.querySelectorAll('[data-hack]').forEach(i=>i.addEventListener('change',()=>{SZHack[i.dataset.hack]=i.checked;szUpdateHackUi();Sound.pickup();if(Game.player)Game.player.fireTimer=Math.max(Game.player.fireTimer,.03)}));
document.getElementById('hack-lock').addEventListener('click',szOpenHack);
document.getElementById('sz-terminal-close').addEventListener('click',()=>{szTerm.classList.add('hidden');szBadge.classList.remove('hidden')});szBadge.addEventListener('click',szOpenHack);
for(const x of document.querySelectorAll('[data-close]'))x.addEventListener('click',()=>document.getElementById(x.dataset.close).classList.add('hidden'));
function szDrag(handle,target){let d=null;handle.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=target.getBoundingClientRect();d={x:e.clientX-r.left,y:e.clientY-r.top};handle.setPointerCapture(e.pointerId)});handle.addEventListener('pointermove',e=>{if(!d)return;const w=target.offsetWidth,h=target.offsetHeight;target.style.left=clamp(e.clientX-d.x,8,innerWidth-w-8)+'px';target.style.top=clamp(e.clientY-d.y,8,innerHeight-h-8)+'px';target.style.transform='none'});handle.addEventListener('pointerup',()=>d=null);handle.addEventListener('pointercancel',()=>d=null)}
szDrag(document.getElementById('sz-terminal-head'),szTerm);szDrag(szBadge,szBadge);
const btnSettings=document.createElement('button');btnSettings.className='btn ghost';btnSettings.textContent='Cài đặt';btnSettings.addEventListener('click',()=>szShowSettings());document.querySelector('#menu .btn-row').append(btnSettings);
const btnStats=document.createElement('button');btnStats.className='btn ghost';btnStats.textContent='Thống kê';btnStats.addEventListener('click',()=>szShowInfo('stats'));document.querySelector('#menu .btn-row').append(btnStats);
const btnAch=document.createElement('button');btnAch.className='btn ghost';btnAch.textContent='Thành tích';btnAch.addEventListener('click',()=>szShowInfo('achievements'));document.querySelector('#menu .btn-row').append(btnAch);
const btnReset=document.createElement('button');btnReset.className='btn ghost';btnReset.textContent='Đặt lại dữ liệu';btnReset.addEventListener('click',()=>{if(confirm('Đặt lại toàn bộ tiến trình đã lưu? Xác nhận lần 1.')&&confirm('Xác nhận lần 2: campaign, thống kê và thành tích sẽ bị xóa trên thiết bị này.')){localStorage.removeItem(SZ_STORAGE_KEY);localStorage.removeItem('sz_campaign');localStorage.removeItem('sz_best');location.reload()}});document.querySelector('#menu .btn-row').append(btnReset);
function szShowSettings(){const g=document.getElementById('sz-settings-grid');g.replaceChildren();for(const [id,label] of [['master','Âm lượng tổng'],['sfx','Âm thanh hiệu ứng'],['music','Âm lượng nhạc']]){const row=document.createElement('label');row.className='sz-row';const b=document.createElement('b');b.textContent=label;const i=document.createElement('input');i.type='range';i.min=0;i.max=1;i.step=.05;i.value=SZSettings[id];i.setAttribute('aria-label',label);i.addEventListener('input',()=>{SZSettings[id]=Number(i.value);Sound.setVolumes(SZSettings.master*SZSettings.sfx,SZSettings.master*SZSettings.music);SZSave.data.settings=SZSettings;SZSave.flush()});row.append(b,i);g.append(row)}for(const [id,label] of [['shake','Rung camera'],['numbers','Hiện damage number'],['minimap','Hiện minimap'],['autoPickup','Tự nhặt vật phẩm thường'],['aimAssist','Hỗ trợ ngắm']]){const row=document.createElement('label');row.className='sz-row';const b=document.createElement('b');b.textContent=label;const i=document.createElement('input');i.type='checkbox';i.checked=!!SZSettings[id];i.addEventListener('change',()=>{SZSettings[id]=i.checked;szApplySettings();SZSave.data.settings=SZSettings;SZSave.flush()});row.append(b,i);g.append(row)}const row=document.createElement('label');row.className='sz-row';const b=document.createElement('b');b.textContent='Mật độ hạt';const sel=document.createElement('select');for(const v of ['low','medium','high']){const o=document.createElement('option');o.value=v;o.textContent=v.toUpperCase();sel.append(o)}sel.value=SZSettings.particles;sel.addEventListener('change',()=>{SZSettings.particles=sel.value;SZSave.data.settings=SZSettings;SZSave.flush()});row.append(b,sel);g.append(row);document.getElementById('sz-settings').classList.remove('hidden')}
function szShowInfo(which){const body=document.getElementById('sz-info-body');body.replaceChildren();const title=document.getElementById('sz-info-title'),kick=document.getElementById('sz-info-kicker');let rows=[];if(which==='stats'){title.textContent='THỐNG KÊ';kick.textContent='HỒ SƠ TÁC CHIẾN';rows=[['TOTAL KILLS',SZLifetime.kills],['TOTAL DAMAGE',SZLifetime.damage],['TOTAL SHOTS',SZLifetime.shots],['TOTAL HITS',SZLifetime.hits],['TOTAL CRITS',SZLifetime.crits],['BEST COMBO','×'+SZLifetime.bestCombo],['BEST WAVE',SZLifetime.bestWave],['BEST SCORE',SZLifetime.bestScore],['PLAY TIME',fmtTime(SZLifetime.playTime)],['BOSSES KILLED',SZLifetime.bosses],['WEAPONS COLLECTED',SZLifetime.weapons],['DASHES USED',SZLifetime.dashes]]}else{title.textContent='THÀNH TÍCH';kick.textContent='MỤC TIÊU ĐÃ MỞ';rows=[['FIRST BLOOD',SZLifetime.kills>=1],['100 KILLS',SZLifetime.kills>=100],['1000 KILLS',SZLifetime.kills>=1000],['BOSS SLAYER',SZLifetime.bosses>=1],['CRITICAL MASTER',SZLifetime.crits>=100],['WEAPON COLLECTOR',SZLifetime.weapons>=5],['SURVIVOR',SZLifetime.bestWave>=10],['NO DAMAGE',!!SZAchievements.noDamage],['COMBO ×10',SZLifetime.bestCombo>=10],['RAILGUN MASTER',(SZMastery.railgun?.kills||0)>=50],['FULL ARSENAL',!!SZAchievements.fullArsenal]].map(([a,b])=>[a,b?'UNLOCKED':'LOCKED'])}for(const [a,b] of rows){const d=document.createElement('div');d.className='sz-row';const x=document.createElement('b');x.textContent=a;const y=document.createElement('span');y.textContent=String(b);d.append(x,y);body.append(d)}document.getElementById('sz-info').classList.remove('hidden')}
function szApplySettings(){document.getElementById('minimap-box').style.display=SZSettings.minimap?'':'none';document.body.classList.toggle('no-shake',!SZSettings.shake)}
szApplySettings();Sound.setVolumes(SZSettings.master*SZSettings.sfx,SZSettings.master*SZSettings.music);
/* Player progression, weapons, pickups, and projectile limits. */
Object.defineProperty(Enemy.prototype,'phase',{configurable:true,get(){if(!this.isBoss)return 1;const ratio=this.hp/this.hpMax;return ratio>.7?1:ratio>.35?2:3}});
Player.prototype.canDash=function(){return SZHack.dash||this.dashCharges>0};
Player.prototype.effectiveMag=function(id){return Math.max(1,Math.ceil(gunById(id).mag*(this.build.mag||1)))};
Player.prototype.refreshMagCapacity=function(){if(!this.curGunId)return;const cap=this.effectiveMag(this.curGunId);this.mag[this.curGunId]=Math.min(this.mag[this.curGunId],cap)};
Player.prototype.giveXp=function(amount){this.xp+=Math.max(0,Math.round(amount));while(this.xp>=this.xpNext){this.xp-=this.xpNext;this.level++;this.xpNext=Math.round(this.xpNext*1.22);Game.offerUpgrade('level')}szUpdateRunHud()};
function szUpdateRunHud(){const p=Game.player;if(!p)return;document.getElementById('sz-xp-label').textContent='RUN LEVEL '+p.level+' · XP '+p.xp+' / '+p.xpNext;document.getElementById('sz-xp-fill').style.width=(100*p.xp/p.xpNext)+'%';const b=p.build,parts=['UPGRADES '+Object.values(b.counts).reduce((a,n)=>a+n,0)];if(b.damage>1)parts.push('DAMAGE ×'+b.damage.toFixed(2));if(b.speed>1)parts.push('SPEED ×'+b.speed.toFixed(2));if(b.rate>1)parts.push('FIRE ×'+b.rate.toFixed(2));document.getElementById('sz-build').textContent=parts.join(' · ')}
function szTakeNewGun(player,id,silent){const gun=gunById(id);if(!gun)return false;if(player.hasGun(id)){const before=player.reserve[id];player.reserve[id]=Math.min(gun.reserveMax,player.reserve[id]+gun.mag*2);if(!silent&&player.reserve[id]>before)Toast.show(gun.name+': +đạn dự trữ');HUD.buildSlots();return false}const slot=player.gunSlots.indexOf(null);if(slot>=0){player.gunSlots[slot]=id;player.mag[id]=gun.mag;player.reserve[id]=gun.reserve;if(!silent)Toast.show(gun.name+' vào slot '+(slot+1))}else{const replace=player.isMelee?0:player.activeSlot;player.gunSlots[replace]=id;player.mag[id]=gun.mag;player.reserve[id]=gun.reserve;player.activeSlot=replace;if(!silent)Toast.show('Thay đúng slot '+(replace+1)+' bằng '+gun.name)}player.cancelReload();HUD.buildSlots();if(Game.runStats)Game.runStats.weapons++;return true}
Player.prototype.giveGun=function(id,silent){return szTakeNewGun(this,id,silent)};
Player.prototype.tryReload=function(){if(this.isMelee||this.reloading||!this.curGunId)return;const w=this.weapon;if(this.mag[this.curGunId]>=this.effectiveMag(this.curGunId)||this.reserve[this.curGunId]<=0)return;this.reloading=true;this.reloadTimer=w.reload/(this.build.reload||1);Sound.reloadStart()};
Player.prototype.takeDamage=function(d,game){if(this.dead||this.invuln>0)return;d=Math.max(0,d*(1-Math.min(.8,this.build.reduce||0)));this.damageTakenThisWave=(this.damageTakenThisWave||0)+d;const absorbed=Math.min(this.armor,d*.6);this.armor-=absorbed;this.hp-=d-absorbed;this.hurtFlash=.18;this.regenTimer=0;HUD.hurtPulse();Camera.addTrauma(SZSettings.shake ? 0.28 : 0);Sound.hurt();Particles.blood(this.x,this.y,Math.random()*TAU,8);if(this.hp<=0){this.hp=0;this.dead=true;game.onPlayerDeath()}};
const szBaseDamageText=Particles.dmgText;
Particles.dmgText=function(...args){if(!SZSettings.numbers)return;if(this.texts.length>=140)this.texts.shift();szBaseDamageText.apply(this,args)};
const szBaseSpawnParticle=Particles.spawn;
Particles.spawn=function(o){const cap=SZSettings.particles==='low'?280:(SZSettings.particles==='medium'?520:800);if(this.list.length>=cap)return;szBaseSpawnParticle.call(this,o)};
const szBaseSpawnPlayerBullet=Bullets.spawnPlayer;
Bullets.spawnPlayer=function(o){if(this.list.length>=360)return;szBaseSpawnPlayerBullet.call(this,o)};
/* Wave rewards, bosses, drops, and HUD integrations. */
const szUpgradeModal=document.getElementById('sz-upgrade-modal');
function szShuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
Game.upgradeQueue=[];Game.upgradeCurrent=null;Game.runStats={bosses:0,weapons:0,dashes:0};
Game.offerUpgrade=function(reason,after){this.upgradeQueue.push({reason,after});if(this.state!=='upgrade')this.showNextUpgrade()};
Game.showNextUpgrade=function(){const item=this.upgradeQueue.shift();if(!item){this.state='playing';szUpgradeModal.classList.add('hidden');return}this.upgradeCurrent=item;this.state='upgrade';const level=item.reason==='level';document.getElementById('sz-upgrade-kicker').textContent=level?'LEVEL UP // RUN LEVEL '+this.player.level:'WAVE COMPLETE // '+this.mode.toUpperCase();document.getElementById('sz-upgrade-title').textContent=level?'LEVEL '+this.player.level+' REACHED':'ĐỢT '+(this.mode==='campaign'?this.levelIndex+1:this.wave)+' HOÀN THÀNH';document.getElementById('sz-upgrade-sub').textContent='CHỌN 1 TRONG 3 NÂNG CẤP · BUILD ĐƯỢC GIỮ QUA CÁC WAVE';const cards=document.getElementById('sz-upgrade-cards');cards.replaceChildren();for(const u of szShuffle(SZUpgrades).slice(0,3)){const b=document.createElement('button');b.className='sz-upgrade';const icon=document.createElement('span');icon.className='icon';icon.textContent=u.icon;const name=document.createElement('b');name.textContent=u.name;const desc=document.createElement('small');desc.textContent=u.desc;b.append(icon,name,desc);b.addEventListener('click',()=>{u.apply(this.player);this.player.build.counts[u.id]=(this.player.build.counts[u.id]||0)+1;this.runBuildCount=(this.runBuildCount||0)+1;Particles.ring(this.player.x,this.player.y,12,120,.6,'#ffb454');Particles.burst(this.player.x,this.player.y,12,{spMin:50,spMax:220,lifeMin:.2,lifeMax:.55,rMin:1,rMax:3,colors:['#ffb454','#fff0cf']});Sound.levelup();Toast.show('NÂNG CẤP: '+u.name);this.player.refreshMagCapacity();const done=this.upgradeCurrent.after;this.upgradeCurrent=null;szUpgradeModal.classList.add('hidden');this.state='playing';if(done)done();if(this.upgradeQueue.length)this.showNextUpgrade();HUD.buildSlots()});cards.append(b)}szUpgradeModal.classList.remove('hidden')};
const szBaseUpdateFlow=Game.updateFlow;
Game.updateFlow=function(dt){const before=this.waveState;szBaseUpdateFlow.call(this,dt);if(this.mode==='survival'&&before==='fighting'&&this.waveState==='rest'&&!this.waveUpgradeQueued){this.waveUpgradeQueued=true;if(this.player.damageTakenThisWave===0)SZAchievements.noDamage=true;this.offerUpgrade('wave',()=>{this.waveUpgradeQueued=false;this.waveState='rest';this.waveRestT=0;this.beginWave()})}};
const szBaseFinishLevel=Game.finishLevel;
Game.finishLevel=function(){if(this.levelUpgradeQueued)return;this.levelUpgradeQueued=true;if(this.player.damageTakenThisWave===0)SZAchievements.noDamage=true;this.offerUpgrade('wave',()=>{this.levelUpgradeQueued=false;szBaseFinishLevel.call(this)})};
const szBaseStart=Game.start;
Game.start=function(){this.upgradeQueue.length=0;this.upgradeCurrent=null;this.waveUpgradeQueued=false;this.levelUpgradeQueued=false;this._profileCommittedRun=false;this.runStats={bosses:0,weapons:0,dashes:0};this.runBuildCount=0;szBaseStart.call(this);Sound.startMusic();document.getElementById('sz-runhud').classList.remove('hidden');szUpdateRunHud();szUpdateHackUi()};
const szBaseToMenu=Game.toMenu;
Game.toMenu=function(){szBaseToMenu.call(this);Sound.stopMusic();document.getElementById('sz-runhud').classList.add('hidden')};
const szBaseGameOver=Game.gameOver;
Game.gameOver=function(win){const already=this.state==='over';szBaseGameOver.call(this,win);if(!already&&!this._profileCommittedRun){this._profileCommittedRun=true;SZStats.commit();szCheckAchievements();Sound.stopMusic()}document.getElementById('sz-runhud').classList.add('hidden')};
const szBaseSpawnEnemy=Game.spawnEnemy;
Game.spawnEnemy=function(type,x,y){const e=szBaseSpawnEnemy.call(this,type,x,y);if(!e.isBoss&&Math.random()<Math.min(.2,.07+this.wave*.006)){e.elite=true;e.hpMax*=2;e.hp=e.hpMax;e.speed*=1.2;e.def=Object.assign({},e.def);for(const k of ['bulletDmg','contactDmg','boomDmg'])if(e.def[k])e.def[k]*=1.5;Particles.ring(e.x,e.y,e.r,e.r+38,.55,'#ffb454')}return e};
const szBaseBeginWave=Game.beginWave;
Game.beginWave=function(){if(this.player)this.player.damageTakenThisWave=0;szBaseBeginWave.call(this);if(Math.random()<.18){const p=findSpawn(this,240);this.pickups.push(new Pickup('chest',p.x,p.y));Toast.show('Supply Crate đã xuất hiện trên minimap')}SZLifetime.bestWave=Math.max(SZLifetime.bestWave,this.wave);SZSave.data.lifetime=SZLifetime;SZSave.flush()};
const szBaseBeginLevel=Game.beginLevel;
Game.beginLevel=function(){if(this.player)this.player.damageTakenThisWave=0;szBaseBeginLevel.call(this);if(Math.random()<.15){const p=findSpawn(this,240);this.pickups.push(new Pickup('chest',p.x,p.y))}};
Game.pickupNearby=function(){if(!this.player||this.state!=='playing')return false;const pk=szFindInteractable(this);if(!pk)return false;if(pk.kind==='gun'){const id=typeof pk.data==='string'?pk.data:pk.data?.id;if(!gunById(id))return false;this.player.giveGun(id);pk.dead=true;Sound.pickup();HUD.buildSlots();szCheckAchievements();return true}if(pk.kind==='chest'){szOpenChest(pk);return true}pk.apply(this,this.player);pk.dead=true;return true};
function szFindInteractable(g){if(!g.player)return null;let best=null,bestD=Infinity;for(const pk of g.pickups){if(pk.dead||((pk.kind==='gun'||pk.kind==='chest')?false:SZSettings.autoPickup))continue;const d=dist2(pk.x,pk.y,g.player.x,g.player.y),r=(pk.kind==='gun'?125:(pk.kind==='chest'?112:70))*(g.player.build.pickup||1);if(d<r*r&&d<bestD){best=pk;bestD=d}}return best}
function szOpenChest(pk){pk.dead=true;Sound.chestOpen();Particles.ring(pk.x,pk.y,8,76,.45,'#ffb454');Particles.burst(pk.x,pk.y,16,{spMin:60,spMax:240,lifeMin:.2,lifeMax:.7,rMin:1,rMax:3,colors:['#ffb454','#d7e4f5']});const r=Math.random(),p=Game.player;if(r<.22){p.heal(45);Toast.show('Supply Crate: +45 HP')}else if(r<.42){p.addArmor(45);Toast.show('Supply Crate: +45 giáp')}else if(r<.64){p.giveAmmo(2);Toast.show('Supply Crate: tiếp đạn')}else if(r<.88){const pool=GUNS.filter(w=>!p.hasGun(w.id));const id=pool.length?pick(pool).id:pick(GUNS).id;p.giveGun(id);Toast.show('Supply Crate: '+gunById(id).name)}else{p.giveXp(85);Toast.show('Supply Crate: +85 XP')}}
const szBasePickupUpdate=Pickup.prototype.update;
Pickup.prototype.update=function(dt,g){this.t+=dt;this.life-=dt;if(this.life<=0){this.dead=true;return}if(this.kind==='gun'||this.kind==='chest')return;const p=g.player;if(SZSettings.autoPickup&&!p.dead&&dist(this.x,this.y,p.x,p.y)<p.r+this.r+6){this.apply(g,p);this.dead=true}};
const szBasePickupDraw=Pickup.prototype.draw;
Pickup.prototype.draw=function(c){if(this.kind==='chest'){const y=this.y+Math.sin(this.t*2.3)*2;c.save();c.shadowBlur=14;c.shadowColor='#ffb454';c.fillStyle='#20232a';c.fillRect(this.x-13,y-8,26,18);c.strokeStyle='#ffb454';c.lineWidth=2;c.strokeRect(this.x-13,y-8,26,18);c.fillStyle='#ffb454';c.fillRect(this.x-2,y-6,4,14);c.restore();return}if(this.kind==='gun'){const id=typeof this.data==='string'?this.data:this.data?.id,w=gunById(id),rar=this.rarity||SZRarity[id]||'common',color={common:'#b5c2ca',rare:'#68aaff',epic:'#c07cff',legendary:'#ffbb4d'}[rar],y=this.y+Math.sin(this.t*3)*3;c.save();c.globalAlpha=this.life<3&&Math.sin(this.life*12)<0 ? 0.35 : 1;c.shadowBlur=rar==='legendary'?23:12;c.shadowColor=color;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(this.x,this.y+9,15,6,0,0,TAU);c.stroke();c.translate(this.x,y);c.rotate(Math.sin(this.t*.7)*.12);c.fillStyle='#222831';c.fillRect(-12,-4,24,8);c.fillStyle=color;c.fillRect(-3,-2,13,4);c.fillRect(-9,3,5,5);c.restore();return}szBasePickupDraw.call(this,c)};

const szBaseDrop=Game.tryDrop;
Game.tryDrop=function(e){if(e.isBoss){this.pickups.push(new Pickup('medbig',e.x,e.y),new Pickup('armorbig',e.x+30,e.y+20),new Pickup('ammo',e.x-30,e.y+25));const id=pick(Math.random()<.22?['railgun','plasma','sniper']:['railgun','plasma','shotgun','rifle','lmg','sniper']);const pk=new Pickup('gun',e.x,e.y-34,id);pk.rarity=SZRarity[id];this.pickups.push(pk);Toast.show('WARDEN đã gục! Rơi vũ khí '+pk.rarity.toUpperCase());return}const drops={grunt:[['pistol',.08],['smg',.05],['rifle',.02]],drone:[['smg',.08],['plasma',.04]],sniper:[['sniper',.15],['rifle',.05]],brute:[['shotgun',.1],['lmg',.05]],bomber:[['revolver',.04],['ammo',.12]]},bonus=(this.player.build.drop||0)+Math.max(0,this.comboMult-1)*.015;let roll=Math.random()*(e.elite ? 0.5 : 1);for(const [id,chance] of (drops[e.type]||[])){if(roll<chance+bonus){if(id==='ammo')this.pickups.push(new Pickup('ammo',e.x,e.y));else{const p=new Pickup('gun',e.x,e.y,id);p.rarity=SZRarity[id]||'common';this.pickups.push(p)}return}roll-=chance+bonus}if(Math.random()<.08)this.pickups.push(new Pickup(this.player.hp<45?'med':'ammo',e.x,e.y))};
const szBaseKilled=Game.onEnemyKilled;
Game.onEnemyKilled=function(e,noScore,crit){szBaseKilled.call(this,e,noScore,crit);if(noScore)return;const id=this.lastPlayerDamageWeapon||this.player.lastWeaponId||'pistol',baseXp=e.isBoss?500:Math.max(12,Math.round((e.def?.score||60)*.35)),xp=baseXp*Math.max(1,this.comboMult||1);this.player.giveXp(xp);const m=SZMastery[id]||(SZMastery[id]={xp:0,level:1,kills:0});m.kills++;m.xp+=e.isBoss?180:35;while(m.xp>=m.level*120){m.xp-=m.level*120;m.level++;Toast.show(gunById(id).name+' — MASTERY '+m.level);Sound.levelup()}SZSave.data.mastery=SZMastery;if(e.isBoss)this.runStats.bosses++;szCheckAchievements()};
function szCheckAchievements(){const put=(id,ok)=>{if(ok&&!SZAchievements[id]){SZAchievements[id]=true;Toast.show('THÀNH TÍCH MỞ: '+id.toUpperCase());Sound.levelup()}},run=Game.state==='over'?0:1;put('firstBlood',SZLifetime.kills+(Game.kills||0)*run>=1);put('kills100',SZLifetime.kills+(Game.kills||0)*run>=100);put('kills1000',SZLifetime.kills+(Game.kills||0)*run>=1000);put('boss',SZLifetime.bosses+(Game.runStats?.bosses||0)*run>=1);put('crit',SZLifetime.crits+(Game.stats?.crits||0)*run>=100);put('collector',SZLifetime.weapons+(Game.runStats?.weapons||0)*run>=5);put('survivor',Math.max(SZLifetime.bestWave,Game.wave||0)>=10);put('combo',Math.max(SZLifetime.bestCombo,Game.comboMult||1)>=10);put('railgun',((SZMastery.railgun||{}).kills||0)>=50);put('fullArsenal',GUNS.every(w=>Game.player?.hasGun(w.id)));SZSave.data.achievements=SZAchievements;SZSave.flush()}
const szBaseAddScore=Game.addScore;
Game.addScore=function(base){szBaseAddScore.call(this,base*(this.player?.build?.score||1));SZLifetime.bestCombo=Math.max(SZLifetime.bestCombo,this.comboMult)};
HUD.buildSlots=function(){const p=Game.player;if(!p)return;this.el.slots.replaceChildren();for(let i=0;i<2;i++){const d=document.createElement('div'),id=p.gunSlots[i];d.className='slot'+(id?' owned':'');if(!p.isMelee&&p.activeSlot===i)d.classList.add('active');d.textContent=id?(i+1)+' '+gunById(id).name.toUpperCase():(i+1)+' EMPTY';this.el.slots.append(d)}const m=document.createElement('div');m.className='slot melee-slot owned'+(p.isMelee?' active':'');m.textContent='🔪 DAO';this.el.slots.append(m)};
const szBaseHudUpdate=HUD.update;
HUD.update=function(dt){szBaseHudUpdate.call(this,dt);if(Game.player){document.getElementById('sz-level-hud').textContent=Game.player.level;szUpdateRunHud();this.el.dashText.textContent=(SZHack.dash?'∞':Game.player.dashCharges+'/'+Game.player.dashMaxCharges)+'  '+(Game.player.dashCd<=0?'Sẵn sàng':'Đang hồi…');if(Game.player.curGunId){const m=SZMastery[Game.player.curGunId]||{level:1,xp:0};this.el.weaponName.textContent+=' · M'+m.level+' '+m.xp+'/'+(m.level*120)}document.getElementById('minimap-box').style.display=SZSettings.minimap?'':'none';if(!Game.player.isMelee&&!Game.player.curGunId){this.el.weaponName.textContent='EMPTY';this.el.ammoMag.textContent='—';this.el.ammoReserve.textContent='';this.el.reloadHint.classList.add('hidden')}}};
const szBaseMinimap=HUD.drawMinimap;
HUD.drawMinimap=function(){szBaseMinimap.call(this);const g=Game,c=this.mmCtx,sx=this.el.minimap.width/WORLD_W,sy=this.el.minimap.height/WORLD_H;for(const pk of g.pickups){if(pk.dead)continue;if(pk.kind==='gun'&&pk.rarity==='legendary'&&Math.floor(performance.now()/180)%2===0){c.fillStyle='#fff1a1';c.fillRect(pk.x*sx-2.5,pk.y*sy-2.5,5,5)}if(pk.kind==='chest'){c.fillStyle='#ffb454';c.fillRect(pk.x*sx-2,pk.y*sy-2,4,4)}}};
const szBaseSetTrauma=Camera.addTrauma;
Camera.addTrauma=function(v){szBaseSetTrauma.call(this,SZSettings.shake?v:0)};
const szBaseEnemyDamage=Enemy.prototype.takeDamage;
Enemy.prototype.takeDamage=function(dmg,ang,g,crit){const old=this.isBoss?this.phase:0;szBaseEnemyDamage.call(this,dmg,ang,g,crit);if(this.isBoss&&this.phase!==old){Sound.boss();Camera.addTrauma(.4);Particles.ring(this.x,this.y,this.r,this.r+90,.6,this.phase===3?'#ff4d4d':'#ffb454')}};
const szBaseBossUpdate=Boss.update;
Boss.update=function(dt,g,p,d,a){szBaseBossUpdate.call(this,dt,g,p,d,a);this.laserCooldown=(this.laserCooldown??5)-dt;if(this.laserWarm>0){this.laserWarm-=dt;if(this.laserWarm<=0){const n=this.phase===3?11:7;for(let i=0;i<n;i++){const off=(i-(n-1)/2)*.032,ang=this.laserAng+off;EnemyBullets.spawn({x:this.x+Math.cos(ang)*(this.r+6),y:this.y+Math.sin(ang)*(this.r+6),vx:Math.cos(ang)*920,vy:Math.sin(ang)*920,dmg:12+this.phase*3,r:4.5,color:'#ff4d4d',life:2.2})}Camera.addTrauma(.2);Sound.enemyShot();this.laserCooldown=6.5}}else if(this.phase>=2&&this.laserCooldown<=0){this.laserAng=angTo(this.x,this.y,p.x,p.y);this.laserWarm=.8;Sound.boss()}};
function szUpdateInteraction(){const el=document.getElementById('sz-interact');if(Game.state!=='playing'){el.classList.remove('show');return}const pk=szFindInteractable(Game);if(!pk){el.classList.remove('show');return}el.replaceChildren();el.append(document.createTextNode(pk.kind==='gun'?'E — NHẶT':pk.kind==='chest'?'E — MỞ HÒM':'E — NHẶT VẬT PHẨM'));const b=document.createElement('b');if(pk.kind==='gun'){const id=typeof pk.data==='string'?pk.data:pk.data?.id,w=gunById(id),empty=Game.player.gunSlots.indexOf(null),slot=empty>=0?empty:(Game.player.isMelee?0:Game.player.activeSlot);b.textContent=(w?w.name:'WEAPON')+' · '+(pk.rarity||SZRarity[id]||'common').toUpperCase()+' · '+(empty>=0?'SLOT '+(empty+1):'THAY SLOT '+(slot+1))}else b.textContent=pk.kind==='chest'?'SUPPLY CRATE':({med:'MEDKIT',medbig:'MEDKIT XL',armor:'ARMOR',armorbig:'ARMOR XL',ammo:'AMMO'}[pk.kind]||pk.kind.toUpperCase());el.append(b);el.classList.add('show')}
/* Integrated systems complete */
const szTouchInteract=document.createElement('div');szTouchInteract.className='tbtn touch-only';szTouchInteract.id='tb-interact';szTouchInteract.setAttribute('role','button');szTouchInteract.setAttribute('aria-label','Nhặt vật phẩm hoặc mở hòm');szTouchInteract.tabIndex=0;szTouchInteract.textContent='E NHẶT';Object.assign(szTouchInteract.style,{position:'absolute',right:'calc(18% + 76px)',bottom:'25%',minWidth:'76px'});document.getElementById('touch-ui').append(szTouchInteract);szTouchInteract.addEventListener('pointerdown',e=>{e.preventDefault();if(!Game.pickupNearby())Game.player?.swapGun()});
// dựng demo nền menu + thumbnails
Game.reset();
Game.state = 'menu';
HUD.init();
drawMapThumbs();

requestAnimationFrame(frame);
