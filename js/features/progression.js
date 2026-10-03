'use strict';

/* RUN LEVEL 2.0
   XP chỉ dùng để tăng LEVEL. Không mở card khi lên level.
   Card nâng cấp chỉ xuất hiện sau khi hoàn thành một wave. */

const szLevelXp=(level)=>Math.round(100+Math.max(0,level-1)*45);

Player.prototype.giveXp=function(amount){
  this.xp=Math.max(0,this.xp+Math.round(amount||0));
  let leveled=0;
  while(this.xp>=this.xpNext){
    this.xp-=this.xpNext;
    this.level++;
    this.xpNext=szLevelXp(this.level);
    leveled++;
  }
  if(leveled){
    Sound.levelup();
    Toast.show('LEVEL '+this.level+' — XP tiếp theo: '+this.xpNext);
    Particles.ring(this.x,this.y,12,90,.45,'#ffb454');
  }
  if(typeof szUpdateRunHud==='function')szUpdateRunHud();
};

/* Không cho hệ thống cũ mở card vì level-up. */
Game.offerUpgradeLevelOnlyDisabled=true;
const szOldOfferUpgrade=Game.offerUpgrade;
Game.offerUpgrade=function(reason,after){
  if(reason==='level'){
    if(typeof after==='function')after();
    return;
  }
  return szOldOfferUpgrade.call(this,reason,after);
};

/* Card vẫn được giữ nguyên ở wave completion của hệ thống hiện tại. */
const szOldBeginWave=Game.beginWave;
Game.beginWave=function(){
  if(this.player){this.player.xpNext=szLevelXp(this.player.level||1);}
  return szOldBeginWave.call(this);
};

window.SZWaveCards={
  rule:'ONLY_AFTER_WAVE',
  cardsPerWave:3,
  levelUpDoesNotOpenCards:true
};
