'use strict';

/* New weapon pool integration: new guns can actually appear in combat. */
const szDropBase=Game.tryDrop;
const SZNewGunIds=['burst','machinepistol','handcannon','carbine','marksman','minigun','scattercannon','cryo','arc','voidcannon','grenadelauncher'];
Game.tryDrop=function(e){
  szDropBase.call(this,e);
  if(e.isBoss)return;
  const p=this.player;
  const available=SZNewGunIds.filter(id=>gunById(id)&&!p.hasGun(id));
  if(!available.length)return;
  const chance=e.elite?.10:.028;
  if(Math.random()<chance){
    const id=pick(available);
    const pk=new Pickup('gun',e.x+rand(-12,12),e.y+rand(-12,12),id);
    pk.rarity=id==='voidcannon'?'legendary':(id==='cryo'||id==='arc'||id==='marksman'?'epic':'rare');
    this.pickups.push(pk);
  }
};

/* Make the weapon library visible in the profile rarity table. */
if(typeof SZRarity==='object'){
  Object.assign(SZRarity,{burst:'rare',machinepistol:'common',handcannon:'rare',carbine:'rare',marksman:'epic',minigun:'epic',scattercannon:'rare',cryo:'epic',arc:'epic',voidcannon:'legendary',grenadelauncher:'epic'});
}
