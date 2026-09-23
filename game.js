const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
let W,H,dpr,state='menu',player,enemies=[],bullets=[],drops=[],particles=[],keys={},mouse={x:0,y:0},elapsed=0,spawn=0,last=0,boss=null,joystick={active:false,id:null,x:0,y:0},lastShot=0;
const WEAPONS={
  magic:{name:'魔法弹',desc:'自动追踪最近敌人',level:1,damage:18,rate:.45,count:1,speed:600,life:1.2,pierce:0,color:'#ffe08a'},
  knife:{name:'飞刀',desc:'高速穿透敌人',level:0,damage:12,rate:.7,count:1,speed:720,life:1.3,pierce:1,color:'#b8e1ff'},
  fire:{name:'火球',desc:'命中后爆炸',level:0,damage:30,rate:1.25,count:1,speed:420,life:1.6,pierce:0,color:'#ff9b5e'}
};
const EVOLUTIONS={
  magic:{name:'奥术核心',desc:'魔法弹进化：伤害、数量与攻击速度大幅提升',apply:w=>{w.evolved=true;w.name='奥术核心';w.damage*=2;w.count=Math.min(6,(w.count||1)+2);w.rate*=.65;w.pierce=(w.pierce||0)+1}},
  knife:{name:'刀锋风暴',desc:'飞刀进化：同时投射更多飞刀并获得穿透',apply:w=>{w.evolved=true;w.name='刀锋风暴';w.damage*=1.8;w.count=Math.min(8,(w.count||1)+4);w.rate*=.7;w.pierce=(w.pierce||0)+2}},
  fire:{name:'陨星',desc:'火球进化：爆炸范围与伤害大幅提升',apply:w=>{w.evolved=true;w.name='陨星';w.damage*=2.2;w.rate*=.78;w.life*=1.15}}
};
const PASSIVES=[
 ['锋利武器','所有武器伤害 +20%',p=>p.damageMul*=1.2],
 ['迅捷','移动速度 +15%',p=>p.speed*=1.15],
 ['生命强化','最大生命 +30，并回复 30',p=>{p.maxHp+=30;p.hp=Math.min(p.maxHp,p.hp+30)}],
 ['攻击速度','所有武器冷却 -12%',p=>p.rateMul*=.88],
 ['磁力','拾取范围 +40%',p=>p.magnet*=1.4],
 ['经验增幅','经验获取 +20%',p=>p.xpMul*=1.2],
 ['暴击','10% 概率造成 2 倍伤害',p=>p.crit+=.1],
 ['护盾','每局首次受到致命伤害时保留 1 点生命',p=>p.shield=true]
];
function resize(){dpr=devicePixelRatio||1;W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
const joystickEl=$('joystick'),stickEl=$('stick');
function setJoystick(e){const r=joystickEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.38,dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy)||1,m=Math.min(1,l/max);joystick.x=dx/l*m;joystick.y=dy/l*m;stickEl.style.transform='translate('+joystick.x*max+'px,'+joystick.y*max+'px)'}
joystickEl.addEventListener('pointerdown',e=>{e.preventDefault();joystick.active=true;joystick.id=e.pointerId;joystickEl.setPointerCapture(e.pointerId);setJoystick(e)});
joystickEl.addEventListener('pointermove',e=>{if(joystick.active&&e.pointerId===joystick.id)setJoystick(e)});
function releaseJoystick(e){if(e.pointerId!==joystick.id)return;joystick.active=false;joystick.id=null;joystick.x=joystick.y=0;stickEl.style.transform='translate(0,0)'}
joystickEl.addEventListener('pointerup',releaseJoystick);joystickEl.addEventListener('pointercancel',releaseJoystick);
canvas.addEventListener('pointermove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});canvas.addEventListener('pointerdown',e=>{mouse.x=e.clientX;mouse.y=e.clientY});

function fresh(){return{x:W/2,y:H/2,r:15,hp:100,maxHp:100,speed:230,damageMul:1,rateMul:1,magnet:80,level:1,xp:0,next:10,gold:0,kills:0,xpMul:1,crit:0,shield:false,weapons:{magic:{...WEAPONS.magic}},passives:[],fire:{},startedAt:Date.now()}}
function start(data){canvas.style.pointerEvents='auto';elapsed=0;spawn=0;enemies=[];bullets=[];drops=[];particles=[];boss=null;player=fresh();if(data){Object.assign(player,data);player.weapons=Object.assign({},fresh().weapons,data.weapons||{});player.passives=data.passives||[]}state='playing';hide('menu');hide('result');hide('levelup');hide('victory');last=performance.now();requestAnimationFrame(loop)}
function hide(id){$(id).classList.add('hidden')}function show(id){$(id).classList.remove('hidden')}
function loop(t){if(state!=='playing')return;const dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}
function update(dt){elapsed+=dt;spawn-=dt;
 let dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.s?1:0)-(keys.w?1:0);if(joystick.active){dx+=joystick.x;dy+=joystick.y}let l=Math.hypot(dx,dy)||1;if(dx||dy){player.x=Math.max(20,Math.min(W-20,player.x+dx/l*player.speed*dt));player.y=Math.max(20,Math.min(H-20,player.y+dy/l*player.speed*dt))}
 if(elapsed>=300&&!boss){spawnBoss();}if(!boss&&spawn<=0){spawn=Math.max(.18,1-elapsed/360);spawnEnemy()}if(elapsed<300)autoShoot();
 for(const e of enemies){let a=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;if(dist(e,player)<e.r+player.r){player.hp-=e.dmg*dt;if(player.hp<=0){if(player.shield){player.shield=false;player.hp=1;toast('护盾抵挡了致命伤害')}else{end();return}}}}
 for(const b of bullets){b.x+=Math.cos(b.a)*b.speed*dt;b.y+=Math.sin(b.a)*b.speed*dt;b.life-=dt;if(b.enemy&&dist(b,player)<b.r+player.r){player.hp-=b.damage;if(player.hp<=0){if(player.shield){player.shield=false;player.hp=1}else{end();return}}b.life=0;continue}if(!b.enemy&&boss&&!boss.dead&&dist(b,boss)<b.r+boss.r){boss.hp-=b.damage;if(b.weapon==='fire'){for(let i=0;i<8;i++)particles.push({x:boss.x,y:boss.y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,life:.3})}if(boss.hp<=0){boss.dead=true;victory();return}if(b.pierce<=0)b.life=0;continue}for(const e of enemies){if(e.dead||b.hit?.includes(e.id)||dist(b,e)>=b.r+e.r)continue;hitEnemy(e,b);b.hit=b.hit||[];b.hit.push(e.id);if(b.pierce<=0)b.life=0;else b.pierce--}}
 bullets=bullets.filter(b=>b.life>0&&b.x>-60&&b.x<W+60&&b.y>-60&&b.y<H+60);enemies=enemies.filter(e=>!e.dead);
 if(boss)updateBoss(dt);
 for(const d of drops){let dd=dist(d,player);if(dd<player.magnet){let a=Math.atan2(player.y-d.y,player.x-d.x);d.x+=Math.cos(a)*220*dt;d.y+=Math.sin(a)*220*dt}if(dist(d,player)<player.r+d.r){if(d.type==='xp')gainXp(d.v);else player.gold+=d.v;d.dead=true}}drops=drops.filter(d=>!d.dead);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);ui()}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function spawnEnemy(){let s=Math.floor(Math.random()*4),x=s<2?(s?W+30:-30):Math.random()*W,y=s<2?Math.random()*H:(s===2?-30:H+30),elite=Math.random()<Math.min(.2,elapsed/420),hp=elite?90+elapsed*.55:30+elapsed*.22;enemies.push({id:crypto.randomUUID(),x,y,r:elite?20:13,hp,maxHp:hp,speed:elite?55:78+Math.min(55,elapsed*.06),dmg:elite?24:12,elite,dead:false})}
function nearest(){return enemies.reduce((a,e)=>dist(e,player)<dist(a,player)?e:a,enemies[0])}
function autoShoot(){for(const [id,w] of Object.entries(player.weapons)){if(!w||w.level<=0)continue;w.cd=(w.cd||0)-.016;if(w.cd<=0){shootWeapon(id,w);w.cd=w.rate*player.rateMul}}}
function shootWeapon(id,w){let t=nearest();if(!t)return;let base=Math.atan2(t.y-player.y,t.x-player.x),count=w.count||1;for(let i=0;i<count;i++){let spread=(i-(count-1)/2)*.14;bullets.push({x:player.x,y:player.y,a:base+spread,speed:w.speed,r:id==='fire'?8:5,damage:w.damage*player.damageMul*(Math.random()<player.crit?2:1),life:w.life,pierce:w.pierce||0,weapon:id,hit:[]})}}
function hitEnemy(e,b){
  e.hp-=b.damage;
  if(b.weapon==='fire'){
    const w=player.weapons.fire;
    const radius=w?.evolved?90:55;
    const splash=w?.evolved?b.damage*.8:b.damage*.5;
    for(const other of enemies)if(!other.dead&&other!==e&&dist(e,other)<radius)other.hp-=splash;
  }
  if(e.hp<=0)kill(e);
  for(const other of enemies)if(other!==e&&!other.dead&&other.hp<=0)kill(other);
}
function kill(e){e.dead=true;player.kills++;drops.push({x:e.x,y:e.y,r:6,type:'xp',v:e.elite?5:2});if(Math.random()<.14)drops.push({x:e.x+5,y:e.y+5,r:5,type:'gold',v:e.elite?5:1});for(let i=0;i<7;i++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*150,vy:(Math.random()-.5)*150,life:.35})}
function gainXp(v){player.xp+=v*player.xpMul;while(player.xp>=player.next){player.xp-=player.next;player.level++;player.next=Math.floor(player.next*1.32);openLevelUp()}}
function openLevelUp(){state='levelup';$('choices').innerHTML='';const opts=options();opts.forEach(o=>{const el=document.createElement('div');el.className='choice';el.innerHTML='<strong>'+o.title+'</strong><span>'+o.desc+'</span>';el.onclick=()=>{o.apply();hide('levelup');state='playing';last=performance.now();requestAnimationFrame(loop)};$('choices').appendChild(el)});show('levelup')}
function options(){
  let arr=[];
  const ws=Object.entries(WEAPONS).filter(([id])=>!player.weapons[id]||player.weapons[id].level<5);
  for(const [id,w] of ws){
    if(!player.weapons[id]){
      arr.push({title:'获得 '+w.name,desc:w.desc+' · 伤害 '+w.damage,apply:()=>player.weapons[id]={...w,level:1}});
    }else{
      const x=player.weapons[id];
      arr.push({title:w.name+' 升级 Lv.'+(x.level+1),desc:'伤害 +25%，攻击频率提升',apply:()=>{x.level++;x.damage*=1.25;x.rate*=.88;x.count=Math.min(5,x.count+(id==='magic'&&x.level%3===0?1:0));x.pierce=(x.pierce||0)+(id==='knife'&&x.level%2===0?1:0)}});
    }
  }
  for(const [id,evo] of Object.entries(EVOLUTIONS)){
    const x=player.weapons[id];
    if(x&&x.level>=5&&!x.evolved)arr.push({title:'进化 · '+evo.name,desc:evo.desc,apply:()=>EVOLUTIONS[id].apply(x)});
  }
  for(const p of PASSIVES)if(!player.passives.includes(p[0]))arr.push({title:p[0],desc:p[1],apply:()=>{player.passives.push(p[0]);p[2](player)}});
  return arr.sort(()=>Math.random()-.5).slice(0,3)
}
function spawnBoss(){boss={x:W/2,y:-80,r:42,maxHp:1800+elapsed*4,hp:1800+elapsed*4,speed:55,dmg:30,phase:1,shot:1};toast('BOSS 出现！坚持到击败它');}
function updateBoss(dt){if(boss.dead)return;let a=Math.atan2(player.y-boss.y,player.x-boss.x);boss.x+=Math.cos(a)*boss.speed*dt;boss.y+=Math.sin(a)*boss.speed*dt;if(dist(boss,player)<boss.r+player.r){player.hp-=boss.dmg*dt;if(player.hp<=0){if(player.shield){player.shield=false;player.hp=1}else{end();return}}}boss.shot-=dt;if(boss.shot<=0){boss.shot=boss.phase===1?1.3:.75;for(let i=0;i<(boss.phase===1?8:12);i++){let a=i*Math.PI*2/(boss.phase===1?8:12);bullets.push({x:boss.x,y:boss.y,a,speed:180,r:7,damage:12,life:2,pierce:0,enemy:true})}}if(boss.hp<boss.maxHp*.5)boss.phase=2}
function end(){state='result';$('resultTitle').textContent='你倒下了';$('resultText').textContent='等级 '+player.level+' · 击杀 '+player.kills+' · 金币 '+player.gold+' · 生存 '+fmt(elapsed);show('result');saveCloud(false)}
function victory(){state='victory';player.gold+=100;saveCloud(false);$('victoryText').textContent='击败最终 Boss · 获得 100 金币 · 等级 '+player.level;show('victory')}
function fmt(s){return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}
function ui(){$('hp').textContent=Math.ceil(player.hp)+'/'+player.maxHp;$('level').textContent=player.level;$('gold').textContent=player.gold;$('time').textContent=fmt(elapsed);$('hpbar').style.width=Math.max(0,player.hp/player.maxHp*100)+'%';$('xpbar').style.width=Math.min(100,player.xp/player.next*100)+'%';$('weapon').textContent=Object.values(player.weapons).filter(Boolean).map(w=>w.name+' Lv.'+w.level).join(' · ');if(boss){$('bossbar').classList.remove('hidden');$('bossfill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%'}else $('bossbar').classList.add('hidden')}
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#0b0e14';
  ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#161c26';
  for(let x=0;x<W;x+=40){
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
  }
  for(let y=0;y<H;y+=40){
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
  }
  for(const d of drops){
    ctx.fillStyle=d.type==='xp'?'#63a4ff':'#ffd45c';
    ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,7);ctx.fill();
  }
  for(const b of bullets){
    ctx.fillStyle=b.enemy?'#ff5577':(WEAPONS[b.weapon]?.color||'#ffe08a');
    ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();
  }
  for(const e of enemies){
    ctx.fillStyle=e.elite?'#c66cff':'#e85d75';
    ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();
  }
  if(boss){
    ctx.fillStyle='#ff315c';
    ctx.beginPath();ctx.arc(boss.x,boss.y,boss.r,0,7);ctx.fill();
  }
  ctx.fillStyle='#70a1ff';
  ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,7);ctx.fill();
  const a=Math.atan2(mouse.y-player.y,mouse.x-player.x);
  ctx.strokeStyle='#dbe7ff';
  ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(player.x+Math.cos(a)*25,player.y+Math.sin(a)*25);ctx.stroke();
  for(const p of particles){
    ctx.globalAlpha=Math.max(0,p.life/.35);
    ctx.fillStyle='#fff';
    ctx.fillRect(p.x,p.y,3,3);
  }
  ctx.globalAlpha=1;
}
async function saveCloud(manual){try{let r=await fetch('/api/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({player,elapsed})});if(!r.ok)throw Error();if(manual)toast('云存档已保存')}catch(e){if(manual)toast('云存档不可用')}}
async function loadCloud(){try{let r=await fetch('/api/save');if(!r.ok)throw Error();let d=await r.json();if(d.save){start(d.save.player);toast('已读取云存档')}else toast('暂无云存档')}catch(e){toast('暂无可用云存档')}}
function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;setTimeout(()=>$('toast').style.opacity=0,1600)}

window.start=start;window.loadCloud=loadCloud;window.saveCloud=saveCloud;window.__RG_READY__=true;

(function(){
  document.addEventListener('pointerdown',function(e){
    const b=e.target.closest && e.target.closest('button');
    if(!b)return;
    e.preventDefault();
    e.stopPropagation();
    const id=b.id;
    if(id==='start'||id==='again'||id==='victoryAgain') window.start();
    else if(id==='continue') window.loadCloud();
    else if(id==='save') window.saveCloud(true);
  },true);
})();
