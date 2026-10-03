'use strict';

/* SECTOR ZERO — ESP / LINE / BOX / HEALTH
   Chỉ là hệ thống debug/cheat nội bộ của game, không tác động mạng. */
window.SZESP = window.SZESP || { enabled:false, line:true, box:true, health:true, name:true };

function szEspColor(e){
  if(e.isBoss) return '#ff4d4d';
  if(e.elite) return '#ffb454';
  return '#a8ed89';
}
function szEspDrawEnemy(e){
  if(!SZESP.enabled || !e || e.dead || !Game.player || Game.state!=='playing') return;
  const c=ctx;
  const color=szEspColor(e);
  const r=Math.max(10,e.r||12), pad=7;
  const x=e.x-r-pad, y=e.y-r-pad, w=(r+pad)*2, h=(r+pad)*2;
  c.save();
  c.globalAlpha=.78;
  if(SZESP.line){
    c.strokeStyle=color;c.lineWidth=e.isBoss?2.2:1.1;c.setLineDash(e.isBoss?[8,5]:[5,5]);
    c.beginPath();c.moveTo(Game.player.x,Game.player.y);c.lineTo(e.x,e.y);c.stroke();c.setLineDash([]);
  }
  if(SZESP.box){
    c.strokeStyle=color;c.lineWidth=e.isBoss?2.5:1.5;
    const q=Math.min(10,w*.22), z=Math.min(10,h*.22);
    c.beginPath();
    c.moveTo(x,y+z);c.lineTo(x,y);c.lineTo(x+q,y);
    c.moveTo(x+w-q,y);c.lineTo(x+w,y);c.lineTo(x+w,y+z);
    c.moveTo(x,y+h-z);c.lineTo(x,y+h);c.lineTo(x+q,y+h);
    c.moveTo(x+w-q,y+h);c.lineTo(x+w,y+h);c.lineTo(x+w,y+h-z);c.stroke();
  }
  if(SZESP.health){
    const hp=clamp((e.hp||0)/(e.hpMax||1),0,1), bw=Math.max(44,w+12), bh=5, bx=e.x-bw/2, by=y-10;
    c.fillStyle='rgba(0,0,0,.75)';c.fillRect(bx,by,bw,bh);
    c.fillStyle=hp>.6?'#8fe388':hp>.3?'#ffb454':'#ff5555';c.fillRect(bx+1,by+1,(bw-2)*hp,bh-2);
    c.strokeStyle='rgba(255,255,255,.45)';c.strokeRect(bx+.5,by+.5,bw-1,bh-1);
  }
  if(SZESP.name){
    const label=e.isBoss?'WARDEN':(e.def?.label||e.type||'ENEMY');
    const d=Math.round(dist(Game.player.x,Game.player.y,e.x,e.y));
    c.font='700 9px "JetBrains Mono",monospace';c.textAlign='center';c.fillStyle=color;c.fillText(label+'  '+d+'m',e.x,y-17);c.textAlign='left';
  }
  c.restore();
}

const szEspOriginalDraw=Enemy.prototype.draw;
Enemy.prototype.draw=function(c){szEspOriginalDraw.call(this,c);szEspDrawEnemy(this)};

function szEspAddToggle(){
  const term=document.getElementById('sz-terminal');
  if(!term||term.querySelector('[data-hack="esp"]')) return;
  const body=term.querySelector('.term-body'); if(!body) return;
  const row=document.createElement('label');row.className='sz-hack-toggle';
  row.innerHTML='<input type="checkbox" data-hack="esp"><span>ESP // LINE + BOX + HP</span><span class="sz-hack-state">OFF</span>';
  body.insertBefore(row,body.children[1]||null);
  const input=row.querySelector('input');
  input.checked=SZESP.enabled;
  input.addEventListener('change',()=>{SZESP.enabled=input.checked;row.querySelector('.sz-hack-state').textContent=SZESP.enabled?'ON':'OFF';row.querySelector('.sz-hack-state').classList.toggle('on',SZESP.enabled);Sound.pickup()});
}

const szEspOldHackUi=window.szUpdateHackUi;
window.szUpdateHackUi=function(){if(typeof szEspOldHackUi==='function')szEspOldHackUi();szEspAddToggle()};
window.addEventListener('keydown',e=>{if(e.code==='F3'&&!e.repeat){SZESP.enabled=!SZESP.enabled;szEspAddToggle();const i=document.querySelector('[data-hack="esp"]');if(i)i.checked=SZESP.enabled;Toast.show('ESP: '+(SZESP.enabled?'ON':'OFF'));}});
setTimeout(szEspAddToggle,0);
