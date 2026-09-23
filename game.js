const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
let W,H,dpr,state='menu',gameSpeed=1,bossRewards=[],relics=[],meta={gold:0,upgrades:{hp:0,damage:0,speed:0}},player,enemies=[],bullets=[],drops=[],particles=[],chests=[],events=[],keys={},elapsed=0,spawn=0,last=0,boss=null,joystick={active:false,id:null,x:0,y:0},lastShot=0,nextChest=90,nextEvent=60;
const WEAPONS={
  magic:{name:'魔法弹',desc:'自动追踪最近敌人',level:1,damage:18,rate:.45,count:1,speed:600,life:1.2,pierce:0,color:'#ffe08a'},
  knife:{name:'飞刀',desc:'高速穿透敌人',level:0,damage:12,rate:.7,count:1,speed:720,life:1.3,pierce:1,color:'#b8e1ff'},
  fire:{name:'火球',desc:'命中后爆炸',level:0,damage:30,rate:1.25,count:1,speed:420,life:1.6,pierce:0,color:'#ff9b5e'},
  lightning:{name:'闪电链',desc:'瞬间攻击附近多个敌人',level:0,damage:24,rate:1.4,count:3,speed:0,life:.1,pierce:0,color:'#8fd8ff'},
  boomerang:{name:'回旋刃',desc:'飞出后持续返回并造成伤害',level:0,damage:20,rate:1.15,count:1,speed:360,life:2.4,pierce:2,color:'#d6b3ff'},
  ice:{name:'冰霜弹',desc:'命中敌人后降低其移动速度',level:0,damage:16,rate:.8,count:1,speed:520,life:1.5,pierce:0,color:'#8cecff'},
  holy:{name:'圣光',desc:'以玩家为中心周期性造成范围伤害',level:0,damage:26,rate:1.8,count:1,speed:0,life:.1,pierce:0,color:'#fff2a8'}
};
const EVOLUTIONS={
  magic:{name:'奥术核心',desc:'魔法弹进化：伤害、数量与攻击速度大幅提升',apply:w=>{w.evolved=true;w.name='奥术核心';w.damage*=2;w.count=Math.min(6,(w.count||1)+2);w.rate*=.65;w.pierce=(w.pierce||0)+1}},
  knife:{name:'刀锋风暴',desc:'飞刀进化：同时投射更多飞刀并获得穿透',apply:w=>{w.evolved=true;w.name='刀锋风暴';w.damage*=1.8;w.count=Math.min(8,(w.count||1)+4);w.rate*=.7;w.pierce=(w.pierce||0)+2}},
  fire:{name:'陨星',desc:'火球进化：爆炸范围与伤害大幅提升',apply:w=>{w.evolved=true;w.name='陨星';w.damage*=2.2;w.rate*=.78;w.life*=1.15}},
  lightning:{name:'雷神之怒',desc:'闪电链进化：攻击更多目标并提高伤害',apply:w=>{w.evolved=true;w.name='雷神之怒';w.damage*=2;w.count=Math.min(8,(w.count||3)+3);w.rate*=.7}},
  boomerang:{name:'无限回刃',desc:'回旋刃进化：更快、更强并获得更多穿透',apply:w=>{w.evolved=true;w.name='无限回刃';w.damage*=1.9;w.speed*=1.25;w.life*=1.25;w.pierce+=3}},
  ice:{name:'绝对零度',desc:'冰霜弹进化：伤害与减速效果大幅提升',apply:w=>{w.evolved=true;w.name='绝对零度';w.damage*=1.9;w.rate*=.72;w.count=Math.min(5,w.count+1)}},
  holy:{name:'神圣领域',desc:'圣光进化：范围和伤害大幅提升',apply:w=>{w.evolved=true;w.name='神圣领域';w.damage*=2;w.rate*=.72;w.count=1}}
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

function fresh(){return{x:W/2,y:H/2,r:15,hp:100+meta.upgrades.hp*10,maxHp:100+meta.upgrades.hp*10,speed:230*(1+meta.upgrades.speed*.05),damageMul:1+meta.upgrades.damage*.05,rateMul:1,magnet:80,level:1,xp:0,next:10,gold:0,kills:0,xpMul:1,crit:0,shield:false,relics:[],weapons:{magic:{...WEAPONS.magic}},passives:[],fire:{},startedAt:Date.now()}}
function start(data){canvas.style.pointerEvents='none';if(matchMedia('(pointer: coarse)').matches)show('joystick');gameSpeed=1;updateSpeedButton();elapsed=0;spawn=0;enemies=[];bullets=[];drops=[];particles=[];chests=[];events=[];boss=null;nextChest=90;nextEvent=60;player=fresh();if(data){Object.assign(player,data);player.weapons=Object.assign({},fresh().weapons,data.weapons||{});player.passives=data.passives||[];player.relics=data.relics||[];player.gold=0}state='playing';hide('menu');hide('result');hide('levelup');hide('victory');last=performance.now();requestAnimationFrame(loop)}
function hide(id){const el=$(id);if(el)el.classList.add('hidden')}function show(id){const el=$(id);if(el)el.classList.remove('hidden')}
function goHome(){state='menu';gameSpeed=1;updateSpeedButton();hide('result');hide('victory');hide('levelup');hide('metaPanel');hide('joystick');show('menu');canvas.style.pointerEvents='none';renderMeta()}
function loop(t){if(state!=='playing')return;const dt=Math.min(.033,(t-last)/1000)*gameSpeed;last=t;update(dt);draw();requestAnimationFrame(loop)}
function update(dt){elapsed+=dt;spawn-=dt;
 let dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.s?1:0)-(keys.w?1:0);if(joystick.active){dx+=joystick.x;dy+=joystick.y}let l=Math.hypot(dx,dy)||1;if(dx||dy){player.x=Math.max(20,Math.min(W-20,player.x+dx/l*player.speed*dt));player.y=Math.max(20,Math.min(H-20,player.y+dy/l*player.speed*dt))}
 if(elapsed>=300&&!boss){spawnBoss();}
 if(elapsed>=nextChest&&!boss){spawnChest();nextChest+=90}
 if(elapsed>=nextEvent&&!boss){spawnEvent();nextEvent+=120}
 if(!boss&&spawn<=0){spawn=Math.max(.18,1-elapsed/360);spawnEnemy()}autoShoot(dt);
 for(const e of enemies){
  let a=Math.atan2(player.y-e.y,player.x-e.x),slow=e.slowTimer>0?(e.slow||.55):1;if(e.boostTimer>0){slow*=e.boost||1.6;e.boostTimer-=dt}if(e.shieldTimer>0)e.shieldTimer-=dt;
  if(e.elite){e.skill=(e.skill||5)-dt;if(e.skill<=0){e.skill=5+Math.random()*2;eliteSkill(e)}}
  if(e.type==='ranged'){
    const d=dist(e,player);
    if(d>260){e.x+=Math.cos(a)*e.speed*slow*dt;e.y+=Math.sin(a)*e.speed*slow*dt}
    else if(d<190){e.x-=Math.cos(a)*e.speed*slow*dt;e.y-=Math.sin(a)*e.speed*slow*dt}
    e.shot-=dt;
    if(e.shot<=0){e.shot=2.2;bullets.push({x:e.x,y:e.y,a,speed:150,r:6,damage:12,life:2.5,pierce:0,enemy:true})}
  }else{
    e.x+=Math.cos(a)*e.speed*slow*dt;e.y+=Math.sin(a)*e.speed*slow*dt;
  }
  if(e.slowTimer>0)e.slowTimer-=dt;
  if(dist(e,player)<e.r+player.r){
    if(e.type==='bomber'){
      e.dead=true;
      for(const o of enemies)if(o!==e&&!o.dead&&dist(o,e)<75)o.hp-=28;
      player.hp-=e.dmg*(player.relics?.includes('guard')?.88:1);
    }else{
      player.hp-=e.dmg*dt*(player.relics?.includes('guard')?.88:1);
    }
if(player.hp<=0){if(player.shield){player.shield=false;player.hp=1;toast('护盾抵挡了致命伤害')}else{end();return}}}}
 for(const b of bullets){b.age=(b.age||0)+dt;if(b.weapon)weaponFx(b);if(b.boomerang){b.age=(b.age||0)+dt;if(b.age>b.maxLife*.5){b.a=Math.atan2(player.y-b.y,player.x-b.x);b.speed=520}}b.x+=Math.cos(b.a)*b.speed*dt;b.y+=Math.sin(b.a)*b.speed*dt;b.life-=dt;if(b.enemy&&dist(b,player)<b.r+player.r){player.hp-=b.damage*(player.relics?.includes('guard')?.88:1);if(player.hp<=0){if(player.shield){player.shield=false;player.hp=1}else{end();return}}b.life=0;continue}if(!b.enemy&&boss&&!boss.dead&&dist(b,boss)<b.r+boss.r){boss.hp-=b.damage*relicDamageMul(boss);if(b.weapon==='fire'){for(let i=0;i<8;i++)particles.push({x:boss.x,y:boss.y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,life:.3})}if(boss.spawned&&boss.hp<=0&&!boss.defeated){boss.defeated=true;boss.dead=true;victory();return}if(b.pierce<=0)b.life=0;continue}for(const e of enemies){if(e.dead||b.hit?.includes(e.id)||dist(b,e)>=b.r+e.r)continue;hitEnemy(e,b);b.hit=b.hit||[];b.hit.push(e.id);if(b.pierce<=0)b.life=0;else b.pierce--}}
 bullets=bullets.filter(b=>b.life>0&&b.x>-60&&b.x<W+60&&b.y>-60&&b.y<H+60);enemies=enemies.filter(e=>!e.dead);
 if(boss&&!boss.dead)updateBoss(dt);if(boss&&!boss.defeated&&boss.hp<=0){finishBoss();return;}
 for(const c of chests){c.life-=dt;if(!c.dead&&dist(c,player)<player.r+c.r+14)openChest(c)}chests=chests.filter(c=>!c.dead&&c.life>0);events=events.filter(e=>{e.life-=dt;return e.life>0});
 for(const d of drops){let dd=dist(d,player);if(dd<player.magnet){let a=Math.atan2(player.y-d.y,player.x-d.x);d.x+=Math.cos(a)*220*dt;d.y+=Math.sin(a)*220*dt}if(dist(d,player)<player.r+d.r){if(d.type==='xp')gainXp(d.v);else if(d.type==='power'){const choices=['damage','rate','heal'];const type=choices[Math.floor(Math.random()*choices.length)];if(type==='damage')player.damageMul*=1.12;else if(type==='rate')player.rateMul*=.9;else player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.25);toast(type==='damage'?'强化核心：伤害 +12%':type==='rate'?'强化核心：攻击速度 +10%':'强化核心：恢复 25% 生命')}else if(d.type==='bomb'){for(const e of enemies){if(!e.dead&&dist(d,e)<110){e.hp-=d.v;if(e.hp<=0)kill(e)}}for(let i=0;i<24;i++)particles.push({x:d.x,y:d.y,vx:(Math.random()-.5)*300,vy:(Math.random()-.5)*300,life:.5});toast('爆裂核心：范围伤害')}else player.gold+=Math.ceil(d.v*(player.relics?.includes('greed')?1.25:1));d.dead=true}}drops=drops.filter(d=>!d.dead);
 for(const ev of events){if(ev.type==='meteor'&&ev.life<=1.5&&ev.points){for(const pt of ev.points)if(!pt.done){pt.done=true;for(const e of enemies)if(!e.dead&&dist(e,pt)<80){e.hp-=70;if(e.hp<=0)kill(e)}if(dist(player,pt)<80){player.hp-=35;if(player.hp<=0){if(player.shield){player.shield=false;player.hp=1}else{end();return}}}}}if(ev.type==='shrine'&&!ev.used&&dist(player,ev)<35){ev.used=true;player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.35);player.xp+=player.next*.35;toast('祭坛：恢复生命并获得经验！')}}
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);ui()}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function eliteSkill(e){
  const type=e.type||'normal';
  if(type==='swift'){
    e.boost=1.6;e.boostTimer=2;
    toast('精英疾行者发动冲刺！');
  }else if(type==='ranged'){
    for(let i=0;i<8;i++){const a=i*Math.PI/4;bullets.push({x:e.x,y:e.y,a,speed:190,r:5,damage:15,life:1.8,pierce:0,enemy:true})}
    toast('精英远程怪释放弹幕！');
  }else if(type==='tank'){
    e.shieldTimer=2;e.shield=0.45;
    toast('精英重甲怪进入防御！');
  }else if(type==='bomber'){
    e.speed*=1.35;e.dmg*=1.25;
    toast('精英爆破怪狂暴！');
  }else{
    for(let i=0;i<3;i++){const a=Math.random()*Math.PI*2;particles.push({x:e.x,y:e.y,vx:Math.cos(a)*140,vy:Math.sin(a)*140,life:.5})}
    e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.12);
  }
}
function spawnEvent(){
  const types=['frenzy','gold','regen','meteor','shrine'];
  const type=types[Math.floor(Math.random()*types.length)];
  events.push({type,life:type==='meteor'?4:type==='shrine'?18:12});
  if(type==='frenzy'){
    for(let i=0;i<Math.min(8,3+Math.floor(elapsed/60));i++)spawnEnemy();
    toast('事件：敌群来袭！');
  }else if(type==='gold'){
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=100+Math.random()*100;drops.push({x:player.x+Math.cos(a)*r,y:player.y+Math.sin(a)*r,r:6,type:'gold',v:2});}
    toast('事件：金币雨！');
  }else if(type==='meteor'){
    const ev=events[events.length-1];ev.points=[];for(let i=0;i<5;i++){const x=50+Math.random()*(W-100),y=70+Math.random()*(H-140);ev.points.push({x,y,done:false});particles.push({x,y,vx:0,vy:0,life:2.5,meteor:true,radius:35+Math.random()*25})}
    toast('事件：陨石即将坠落！');
  }else if(type==='shrine'){
    const ev=events[events.length-1];ev.x=W*.5+(Math.random()-.5)*260;ev.y=H*.5+(Math.random()-.5)*180;ev.used=false;
    toast('事件：神秘祭坛出现！');
  }else{
    player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.25);
    toast('事件：生命恢复！');
  }
}
function spawnChest(){
  const margin=70;
  const chest={x:margin+Math.random()*(W-margin*2),y:margin+Math.random()*(H-margin*2),r:18,dead:false,life:30};
  chests.push(chest);
  toast('发现宝箱！靠近它即可开启');
}
function openChest(c){
  if(c.dead)return;
  c.dead=true;
  const gold=12+Math.floor(Math.random()*14);
  const heal=Math.floor(player.maxHp*.18);
  player.gold+=gold;
  player.hp=Math.min(player.maxHp,player.hp+heal);
  for(let i=0;i<18;i++)particles.push({x:c.x,y:c.y,vx:(Math.random()-.5)*220,vy:(Math.random()-.5)*220,life:.6});
  toast('宝箱开启：+'+gold+' 金币 · 回复 '+heal+' HP');
}
function spawnEnemy(){
  let s=Math.floor(Math.random()*4),x=s<2?(s?W+30:-30):Math.random()*W,y=s<2?Math.random()*H:(s===2?-30:H+30);
  const elite=Math.random()<Math.min(.2,elapsed/420);
  const roll=Math.random();
  let type='normal';
  if(!elite&&elapsed>45&&roll<.12)type='swift';
  else if(!elite&&elapsed>75&&roll<.22)type='tank';
  else if(!elite&&elapsed>105&&roll<.30)type='ranged';
  else if(!elite&&elapsed>150&&roll<.38)type='splitter';
  else if(!elite&&elapsed>210&&roll<.46)type='bomber';
  let hp=elite?90+elapsed*.55:30+elapsed*.22,speed=78+Math.min(55,elapsed*.06),dmg=12,r=13;
  if(type==='swift'){hp*=.65;speed*=1.8;dmg=10;r=11}
  if(type==='tank'){hp*=3.8;speed*=.42;dmg=20;r=20}
  if(type==='ranged'){hp*=1.15;speed*=.55;dmg=0;r=15}
  if(type==='splitter'){hp*=1.7;speed*=.8;dmg=16;r=17}
  if(type==='bomber'){hp*=1.1;speed*=1.15;dmg=35;r=14}
  enemies.push({id:crypto.randomUUID(),x,y,r,hp,maxHp:hp,speed,dmg,elite,type,dead:false,shot:type==='ranged'?1:0,split:type==='splitter'?1:0});
}
function nearest(){return enemies.length?enemies.reduce((a,e)=>dist(e,player)<dist(a,player)?e:a,enemies[0]):null}
function autoShoot(dt){
  for(const [id,w] of Object.entries(player.weapons)){
    if(!w||w.level<=0)continue;
    w.cd=(w.cd||0)-dt;
    if(w.cd<=0){shootWeapon(id,w);w.cd=w.rate*player.rateMul}
  }
}
function shootWeapon(id,w){
  const damage=w.damage*player.damageMul*relicDamageMul(null)*(Math.random()<player.crit?2:1);
  if(id==='lightning'){
    const targets=enemies.filter(e=>!e.dead).sort((a,b)=>dist(a,player)-dist(b,player)).slice(0,w.count||3);
    if(boss&&!boss.dead&&targets.length<(w.count||3))targets.push(boss);
    for(const t of targets){t.hp-=damage;particles.push({x:t.x,y:t.y,vx:0,vy:0,life:.45,lightning:true});if(t!==boss&&t.hp<=0)kill(t)}
    if(boss&&!boss.dead&&boss.hp<=0&&!boss.defeated){boss.defeated=true;boss.dead=true;victory();return}
    return;
  }
  if(id==='holy'){
    const radius=w.evolved?180:115;
    for(const e of enemies)if(!e.dead&&dist(e,player)<radius){e.hp-=damage;if(e.hp<=0)kill(e)}
    if(boss&&!boss.dead&&dist(boss,player)<radius){boss.hp-=damage*relicDamageMul(boss);if(boss.hp<=0&&!boss.defeated){boss.defeated=true;boss.dead=true;victory();return}}
    for(let i=0;i<12;i++)particles.push({x:player.x+(Math.random()-.5)*radius*2,y:player.y+(Math.random()-.5)*radius*2,vx:0,vy:0,life:.35,holy:true});
    return;
  }
  let t=boss&&!boss.dead?boss:nearest();if(!t)return;
  let base=Math.atan2(t.y-player.y,t.x-player.x),count=w.count||1;
  for(let i=0;i<count;i++){
    let spread=count===1?0:(i-(count-1)/2)*.09;
    bullets.push({x:player.x,y:player.y,a:base+spread,speed:w.speed,r:id==='fire'?8:5,damage,life:w.life,pierce:w.pierce||0,weapon:id,hit:[],boomerang:id==='boomerang',age:0,maxLife:w.life,startX:player.x,startY:player.y})
  }
}
function hitEnemy(e,b){
  e.hp-=b.damage*relicDamageMul(e)*(e.shieldTimer>0?(1-(e.shield||.45)):1);hitFx(e.x,e.y,b.weapon==='fire'?'#ff7a45':'#fff');
  if(b.weapon==='ice'){e.slow=.45;e.slowTimer=2.5;}if(e.type==='splitter'&&e.hp<=e.maxHp*.5&&!e.splitTriggered){e.splitTriggered=true;for(let i=0;i<2;i++){const a=i*Math.PI+Math.random()*.5;enemies.push({id:crypto.randomUUID(),x:e.x+Math.cos(a)*18,y:e.y+Math.sin(a)*18,r:8,hp:e.maxHp*.22,maxHp:e.maxHp*.22,speed:e.speed*1.4,dmg:7,elite:false,type:'normal',dead:false,shot:0,split:0})}}
  if(b.weapon==='fire'){
    const w=player.weapons.fire;
    const radius=w?.evolved?90:55;
    const splash=w?.evolved?b.damage*.8:b.damage*.5;
    for(const other of enemies)if(!other.dead&&other!==e&&dist(e,other)<radius)other.hp-=splash;
  }
  if(e.hp<=0)kill(e);
  for(const other of enemies)if(other!==e&&!other.dead&&other.hp<=0)kill(other);
}
function kill(e){
  if(e.dead)return;
  e.dead=true;player.kills++;
  if(e.type==='splitter'&&e.split>0){
    for(let i=0;i<2;i++){const a=i*Math.PI+Math.random()*.6;enemies.push({id:crypto.randomUUID(),x:e.x,y:e.y,r:9,hp:e.maxHp*.3,maxHp:e.maxHp*.3,speed:e.speed*1.35,dmg:8,elite:false,type:'normal',dead:false,shot:0,split:0})}
  }
  drops.push({x:e.x,y:e.y,r:6,type:'xp',v:e.elite?5:(e.type==='tank'?4:2)});if(Math.random()<.14)drops.push({x:e.x+5,y:e.y+5,r:5,type:'gold',v:e.elite?5:1});if(e.elite&&Math.random()<.28)drops.push({x:e.x-6,y:e.y-6,r:7,type:'power',v:1});if(e.elite&&Math.random()<.12)drops.push({x:e.x+8,y:e.y-8,r:8,type:'bomb',v:45});for(let i=0;i<7;i++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*150,vy:(Math.random()-.5)*150,life:.35})}
function gainXp(v){player.xp+=v*player.xpMul;while(player.xp>=player.next){player.xp-=player.next;player.level++;player.next=Math.floor(player.next*1.32);openLevelUp()}}
function openLevelUp(){state='levelup';$('choices').innerHTML='';const opts=options();opts.forEach(o=>{const el=document.createElement('div');el.className='choice';el.innerHTML='<strong>'+o.title+'</strong><span>'+o.desc+'</span>';el.onclick=()=>{o.apply();hide('levelup');state='playing';last=performance.now();requestAnimationFrame(loop)};$('choices').appendChild(el)});show('levelup')}
const WEAPON_SYNERGIES={
 magic:{name:'奥术强化',desc:'魔法弹升级同时：所有伤害 +5%',apply:p=>p.damageMul*=1.05},
 knife:{name:'疾风刀术',desc:'飞刀升级同时：移动速度 +4%',apply:p=>p.speed*=1.04},
 fire:{name:'烈焰暴击',desc:'火球升级同时：暴击率 +3%',apply:p=>p.crit=Math.min(.6,p.crit+.03)},
 lightning:{name:'雷霆迅捷',desc:'闪电链升级同时：攻击速度 +5%',apply:p=>p.rateMul*=.95},
 boomerang:{name:'回刃磁场',desc:'回旋刃升级同时：拾取范围 +10%',apply:p=>p.magnet*=1.1},
 ice:{name:'寒霜汲取',desc:'冰霜弹升级同时：经验获取 +5%',apply:p=>p.xpMul*=1.05},
 holy:{name:'圣光生命',desc:'圣光升级同时：最大生命 +10，并回复 10 HP',apply:p=>{p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+10)}},
};
function options(){
  let arr=[];
  const ws=Object.entries(WEAPONS).filter(([id])=>!player.weapons[id]||player.weapons[id].level<5);
  for(const [id,w] of ws){
    if(!player.weapons[id]){
      arr.push({title:'获得 '+w.name,desc:w.desc+' · Lv.1 → Lv.5 自动进化为 '+(EVOLUTIONS[id]?.name||'最高形态')+' · '+(WEAPON_SYNERGIES[id]?.desc||''),apply:()=>{player.weapons[id]={...w,level:1};WEAPON_SYNERGIES[id]?.apply(player)}});
    }else{
      const x=player.weapons[id],next=x.level+1,willEvolve=next>=5&&EVOLUTIONS[id]&&!x.evolved;
      arr.push({title:w.name+' 升级 Lv.'+next+(willEvolve?' · 即将进化':''),desc:(willEvolve?EVOLUTIONS[id].desc:'伤害 +25%，攻击频率提升')+' · '+(WEAPON_SYNERGIES[id]?.desc||''),apply:()=>{x.level++;x.damage*=1.25;x.rate*=.88;x.count=Math.min(5,x.count+(id==='magic'&&x.level%3===0?1:0));x.pierce=(x.pierce||0)+(id==='knife'&&x.level%2===0?1:0);WEAPON_SYNERGIES[id]?.apply(player);if(x.level>=5&&!x.evolved&&EVOLUTIONS[id])EVOLUTIONS[id].apply(x)}});
    }
  }
  return arr.sort(()=>Math.random()-.5).slice(0,3)
}
function spawnBoss(){
  const hp=15000+elapsed*12;
  boss={x:W/2,y:-90,r:42,maxHp:hp,hp,speed:42,dmg:30,phase:1,shot:1,spawned:false,defeated:false,intro:2.5,skill:4,flash:0,summon:8,teleport:14};
  toast('BOSS 即将出现！');
}
function updateBoss(dt){
  if(boss.dead)return;
  if(!boss.spawned){
    boss.intro-=dt;
    boss.y=Math.min(H*.28,boss.y+150*dt);
    if(boss.intro<=0){boss.spawned=true;boss.shot=1;toast('BOSS 出现！坚持到击败它')}
    return;
  }
  let a=Math.atan2(player.y-boss.y,player.x-boss.x);boss.x+=Math.cos(a)*boss.speed*dt;boss.y+=Math.sin(a)*boss.speed*dt;if(dist(boss,player)<boss.r+player.r){player.hp-=boss.dmg*dt;if(player.hp<=0){if(player.shield){player.shield=false;player.hp=1}else{end();return}}}boss.shot-=dt;
  boss.skill-=dt;boss.summon-=dt;boss.teleport-=dt;
  if(boss.summon<=0){boss.summon=boss.phase===1?11:7;const n=boss.phase===1?3:6;for(let i=0;i<n;i++){spawnEnemy();const e=enemies[enemies.length-1];e.x=boss.x+(Math.random()-.5)*180;e.y=boss.y+(Math.random()-.5)*180;e.elite=boss.phase===2&&Math.random()<.25}toast(boss.phase===1?'BOSS 召唤援军！':'BOSS 召唤精英援军！')}
  if(boss.teleport<=0){boss.teleport=boss.phase===1?16:10;const a=Math.random()*Math.PI*2;boss.x=Math.max(60,Math.min(W-60,player.x+Math.cos(a)*(180+Math.random()*120)));boss.y=Math.max(100,Math.min(H-60,player.y+Math.sin(a)*(180+Math.random()*120)));boss.flash=.5;toast('BOSS 瞬移！')}
  if(boss.skill<=0){
    boss.skill=boss.phase===1?6:4;
    boss.flash=.35;
    const radius=boss.phase===1?120:170;
    for(const e of enemies)if(!e.dead&&dist(e,boss)<radius)e.hp-=boss.phase===1?25:45;
    particles.push({x:boss.x,y:boss.y,vx:0,vy:0,life:.45,bossSkill:true,radius});
    toast(boss.phase===1?'BOSS 释放冲击波！':'BOSS 释放强化冲击波！');
  }
  if(boss.shot<=0){boss.shot=boss.phase===1?1.3:.75;for(let i=0;i<(boss.phase===1?8:12);i++){let a=i*Math.PI*2/(boss.phase===1?8:12);bullets.push({x:boss.x,y:boss.y,a,speed:180,r:7,damage:12,life:2,pierce:0,enemy:true})}}if(boss.hp<=0){boss.hp=0;boss.dead=true;boss.defeated=true;particles.push({x:boss.x,y:boss.y,vx:0,vy:0,life:1.5,bossSkill:true,radius:boss.r*3});toast('BOSS 已击败！');victory();return}if(boss.hp<boss.maxHp*.5&&boss.phase===1){boss.phase=2;boss.speed=62;boss.dmg=42;toast('BOSS 进入第二阶段！')}}
function persistMeta(){try{localStorage.setItem('roguegame_meta',JSON.stringify(meta))}catch(e){}}
function restoreLocalMeta(){try{const x=JSON.parse(localStorage.getItem('roguegame_meta')||'null');if(x&&typeof x==='object'){meta={gold:Number(x.gold||0),upgrades:{hp:Number(x.upgrades?.hp||0),damage:Number(x.upgrades?.damage||0),speed:Number(x.upgrades?.speed||0)}}}}catch(e){}}
function bankRunGold(rate=1){if(player&&player.gold>0){const earned=Math.floor(player.gold*Math.max(0,Math.min(1,rate)));meta.gold+=earned;player.gold=0;persistMeta();return earned}return 0}
async function end(){const runGold=player.gold;const keptGold=bankRunGold(.5);state='result';$('resultTitle').textContent='你倒下了';$('resultText').textContent='等级 '+player.level+' · 击杀 '+player.kills+' · 金币 '+runGold+' · 本局保留 '+keptGold+' · 永久金币 '+meta.gold+' · 生存 '+fmt(elapsed)+' · 正在保存…';show('result');const result=await saveCloud(false);$('resultText').textContent='等级 '+player.level+' · 击杀 '+player.kills+' · 金币 '+runGold+' · 本局保留 '+keptGold+' · 永久金币 '+meta.gold+' · '+(result.ok?'云存档已保存':'云存档保存失败：'+result.error)}
async function showBossRewards(){state='bossreward';hide('victory');hide('levelup');const box=$('bossRewards');if(!box)return;box.innerHTML='';const pool=[['gold','宝藏','永久金币 +60',()=>{meta.gold+=60;persistMeta()}],['damage','毁灭之力','本局所有伤害 +20%',()=>player.damageMul*=1.2],['health','生命核心','最大生命 +40，并恢复 40 HP',()=>{player.maxHp+=40;player.hp=Math.min(player.maxHp,player.hp+40)}],['haste','超速核心','本局所有武器冷却 -12%',()=>player.rateMul*=.88],['magnet','磁场核心','拾取范围 +50%',()=>player.magnet*=1.5],['relic','远古遗物','获得一个随机遗物',()=>addRandomRelic()]];pool.sort(()=>Math.random()-.5).slice(0,3).forEach(r=>{const el=document.createElement('div');el.className='choice';el.innerHTML='<strong>'+r[1]+'</strong><span>'+r[2]+'</span>';el.onclick=()=>{r[3]();hide('bossRewardPanel');victory();};box.appendChild(el)});show('bossRewardPanel')}
function addRandomRelic(){const pool=[['狂战符文','生命低于50%时伤害 +25%',p=>p.relics.push('berserk')],['迅捷符文','移动速度 +12%',p=>{p.relics.push('swift');p.speed*=1.12}],['贪婪符文','金币获取 +25%',p=>p.relics.push('greed')],['坚壁符文','受到伤害 -12%',p=>p.relics.push('guard')],['猎手符文','对 Boss 伤害 +20%',p=>p.relics.push('hunter')]];const r=pool[Math.floor(Math.random()*pool.length)];r[2](player);toast('获得遗物：'+r[0]);return r[0]}\nfunction relicDamageMul(target){let m=1;if(player.relics?.includes('berserk')&&player.hp<player.maxHp*.5)m*=1.25;if(target===boss&&player.relics?.includes('hunter'))m*=1.2;return m}\nfunction victory(){if(!player)return;state='victory';hide('bossRewardPanel');hide('levelup');hide('menu');hide('result');show('victory');const earned=player.gold;const kept=bankRunGold(1);$('victoryText').textContent='最终 Boss 已击败！本局获得 '+earned+' 金币 · 等级 '+player.level+' · 永久金币 '+meta.gold+' · 正在保存…';saveCloud(false).then(r=>{$('victoryText').textContent=r.ok?'最终 Boss 已击败！本局获得 '+earned+' 金币 · 等级 '+player.level+' · 永久金币 '+meta.gold+' · 云存档已保存':'最终 Boss 已击败！本局获得 '+earned+' 金币 · 等级 '+player.level+' · 永久金币 '+meta.gold+' · 保存失败：'+r.error})}\nfunction finishBoss(){if(!boss||boss.defeated)return;boss.hp=0;boss.dead=true;boss.defeated=true;bullets=[];enemies=[];hide('levelup');hide('result');hide('menu');hide('victory');for(let i=0;i<60;i++){const a=Math.random()*Math.PI*2,s=80+Math.random()*320;particles.push({x:boss.x,y:boss.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.8+Math.random()*.7,color:'#ffd45c'})}showBossRewards()}
function fmt(s){return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}
function ui(){$('hp').textContent=Math.ceil(player.hp)+'/'+player.maxHp;$('level').textContent=player.level;$('gold').textContent=player.gold;$('time').textContent=fmt(elapsed);$('hpbar').style.width=Math.max(0,player.hp/player.maxHp*100)+'%';$('xpbar').style.width=Math.min(100,player.xp/player.next*100)+'%';$('weapon').textContent=Object.values(player.weapons).filter(Boolean).map(w=>w.name+' Lv.'+w.level).join(' · ')+(player.relics?.length?' · 遗物 '+player.relics.length:'');if(boss){$('bossbar').classList.remove('hidden');$('bossfill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%'}else $('bossbar').classList.add('hidden')}
function weaponFx(b){
  const x=b.x,y=b.y,c=b.weapon==='magic'?'#ffe08a':b.weapon==='knife'?'#b8e1ff':b.weapon==='fire'?'#ff7a45':b.weapon==='lightning'?'#8fd8ff':b.weapon==='boomerang'?'#d6b3ff':b.weapon==='ice'?'#8cecff':'#fff2a8';
  ctx.save();ctx.globalAlpha=.85;
  if(b.weapon==='fire'){ctx.beginPath();ctx.arc(x,y,15+Math.sin(b.age*18)*3,0,Math.PI*2);ctx.fillStyle=c;ctx.shadowBlur=22;ctx.shadowColor=c;ctx.fill()}
  else if(b.weapon==='lightning'){ctx.strokeStyle=c;ctx.lineWidth=3;ctx.shadowBlur=14;ctx.shadowColor=c;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(b.a)*34,y-Math.sin(b.a)*34);ctx.stroke()}
  else {ctx.fillStyle=c;ctx.shadowBlur=12;ctx.shadowColor=c;ctx.beginPath();ctx.arc(x,y,b.weapon==='holy'?9:6,0,Math.PI*2);ctx.fill()}
  ctx.restore();
}
function hitFx(x,y,color){
  for(let i=0;i<7;i++){const a=Math.random()*Math.PI*2,s=70+Math.random()*130;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25,color})}
}
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
  for(const c of chests){
    const pulse=1+Math.sin(performance.now()/180)*.08;
    ctx.save();ctx.translate(c.x,c.y);ctx.scale(pulse,pulse);
    ctx.fillStyle='#d8a84e';ctx.fillRect(-18,-11,36,24);
    ctx.fillStyle='#f6d978';ctx.fillRect(-18,-11,36,6);ctx.fillRect(-3,-11,6,24);
    ctx.strokeStyle='#fff0a0';ctx.lineWidth=2;ctx.strokeRect(-18,-11,36,24);ctx.restore();
  }
  for(const d of drops){
    ctx.fillStyle=d.type==='xp'?'#63a4ff':d.type==='power'?'#d56cff':d.type==='bomb'?'#ff6b6b':'#ffd45c';
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
  for(const ev of events)if(ev.type==='shrine'&&!ev.used){ctx.save();ctx.translate(ev.x,ev.y);ctx.strokeStyle='#8fd8ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,24+Math.sin(performance.now()/150)*3,0,7);ctx.stroke();ctx.fillStyle='#63a4ff';ctx.fillRect(-7,-7,14,14);ctx.restore()}
  if(boss){
    ctx.save();ctx.globalAlpha=boss.flash>0?.65:1;ctx.fillStyle=boss.phase===2?'#ff7b35':'#ff315c';
    ctx.beginPath();ctx.arc(boss.x,boss.y,boss.r,0,7);ctx.fill();ctx.restore();
  }
  ctx.fillStyle='#70a1ff';
  ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,7);ctx.fill();
  for(const p of particles){
    if(p.meteor){ctx.globalAlpha=Math.max(0,p.life/2.5);ctx.strokeStyle='#ff8b4d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.radius*(1-p.life/2.5),0,7);ctx.stroke();continue}if(p.bossSkill){
      ctx.globalAlpha=Math.max(0,p.life/.45);
      ctx.strokeStyle='#ff5577';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,p.radius*(1-p.life/.45),0,7);ctx.stroke();continue;
    }
    ctx.globalAlpha=Math.max(0,p.life/.35);
    ctx.fillStyle='#fff';
    ctx.fillRect(p.x,p.y,3,3);
  }
  ctx.globalAlpha=1;
}
async function saveCloud(manual){
  let lastError='保存失败';
  for(let attempt=0;attempt<3;attempt++){
    try{
      const savePlayer=player||fresh();
      const saveMeta={gold:Number(meta?.gold||0),upgrades:{hp:Number(meta?.upgrades?.hp||0),damage:Number(meta?.upgrades?.damage||0),speed:Number(meta?.upgrades?.speed||0)}};
      const r=await fetch('/api/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({player:savePlayer,elapsed,meta:saveMeta,gold:saveMeta.gold})});
      if(!r.ok){
        let detail='';
        try{const d=await r.json();detail=d.error||''}catch{}
        throw Error(detail||'HTTP '+r.status);
      }
      if(manual)toast('云存档已保存 · 永久金币 '+saveMeta.gold);
      return {ok:true,error:''};
    }catch(e){
      lastError=e.message||'保存失败';
      if(attempt<2)await new Promise(r=>setTimeout(r,500*(attempt+1)));
    }
  }
  if(manual)toast('云存档不可用：'+lastError);
  return {ok:false,error:lastError};
}
async function loadCloud(){try{let r=await fetch('/api/save');if(!r.ok)throw Error();let d=await r.json();if(d.save){const savedMeta=d.save.meta||{};meta={gold:Number(savedMeta.gold??d.save.gold??0),upgrades:{hp:Number(savedMeta.upgrades?.hp||0),damage:Number(savedMeta.upgrades?.damage||0),speed:Number(savedMeta.upgrades?.speed||0)}};persistMeta();toast('已读取云存档 · 永久金币 '+meta.gold)}else toast('暂无云存档')}catch(e){toast('暂无可用云存档')}}
function openMeta(){state='meta';hide('menu');hide('result');hide('victory');hide('levelup');renderMeta();show('metaPanel')}
function closeMeta(){state='menu';hide('metaPanel');show('menu')}
function renderMeta(){persistMeta();const box=$('metaChoices');if(!box)return;box.innerHTML='';$('metaGold').textContent=meta.gold;const items=[['hp','生命上限 +10',20],['damage','所有伤害 +5%',30],['speed','移动速度 +5%',25]];for(const [id,label,cost] of items){const lv=meta.upgrades[id];const el=document.createElement('button');el.className='choice';el.innerHTML='<strong>'+label+' · Lv.'+lv+'</strong><span>升级费用 '+cost+' 金币</span>';el.disabled=meta.gold<cost;el.onclick=()=>{if(meta.gold<cost)return;meta.gold-=cost;meta.upgrades[id]++;persistMeta();renderMeta();saveCloud(false);toast('永久强化已升级')};box.appendChild(el)}}
function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;setTimeout(()=>$('toast').style.opacity=0,1600)}
function toggleSpeed(){
  gameSpeed=gameSpeed===1?2:1;
  updateSpeedButton();
  toast(gameSpeed===2?'游戏速度 ×2':'游戏速度 ×1');
}
function updateSpeedButton(){
  const b=$('speed');
  if(b)b.textContent=gameSpeed===2?'速度 ×2':'速度 ×1';
}
window.toggleSpeed=toggleSpeed;window.openMeta=openMeta;window.closeMeta=closeMeta;window.goHome=goHome;
restoreLocalMeta();

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
    else if(id==='meta'||id==='metaPanel') window.openMeta();
    else if(id==='home'||id==='victoryHome'||id==='resultHome') window.goHome();
    else if(id==='metaClose') window.closeMeta();
    else if(id==='speed') window.toggleSpeed();
  },true);
})();
