import {Ecosystem, WIDTH, HEIGHT} from './simulation.js';
const $=id=>document.getElementById(id);
const canvas=$('world'), ctx=canvas.getContext('2d'), sim=new Ecosystem();
let type='herbivore',paused=false,speed=1,last=0,statsAt=0;
const traits=()=>({speed:Number($('speedTrait').value),sense:Number($('senseTrait').value),size:Number($('sizeTrait').value)});
function select(next){type=next;for(const [id,t] of [['herbType','herbivore'],['carnType','carnivore']]){$(id).classList.toggle('active',t===type);$(id).setAttribute('aria-pressed',String(t===type));}$('typeHelp').textContent=type==='herbivore'?'Grazes on green food and stays close to its herd.':'Hunts herbivores, then smaller carnivores when food is scarce.';}
$('herbType').onclick=()=>select('herbivore');$('carnType').onclick=()=>select('carnivore');
for(const trait of ['speed','sense','size']) $(trait+'Trait').oninput=()=>$(trait+'Value').textContent=$(trait+'Trait').value;
$('add').onclick=()=>{for(let i=0;i<5;i++)sim.add(type,traits());update();};
canvas.onclick=e=>{const rect=canvas.getBoundingClientRect();sim.add(type,traits(),{x:(e.clientX-rect.left)*WIDTH/rect.width,y:(e.clientY-rect.top)*HEIGHT/rect.height});update();};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';};
$('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;$('speed').textContent=speed+'× speed';};
$('reset').onclick=()=>{sim.reset();update();};
function update(){
  $('clock').textContent='Day '+Math.floor(sim.time/10);
  $('foodCount').textContent=sim.food.length;
  $('generation').textContent=sim.creatures.length?Math.max(...sim.creatures.map(c=>c.generation)):'—';
  for(const [t,prefix,count] of [['herbivore','h','herbCount'],['carnivore','c','carnCount']]) {
    const group=sim.creatures.filter(c=>c.type===t);$(count).textContent=group.length;
    for(const [trait,suffix] of [['speed','s'],['sense','v'],['size','z']]) $(prefix+suffix).textContent=group.length?(group.reduce((sum,c)=>sum+c[trait],0)/group.length).toFixed(trait==='sense'?0:1):'—';
  }
  $('status').textContent=sim.creatures.length===0?'All creatures have died. Add new creatures or start a new world.':sim.creatures.length>=250?'Population limit reached (250). Creatures can reproduce again when space opens.':'Traits mutate at birth. Only surviving creatures contribute to these averages.';
}
function draw(){
  ctx.fillStyle='#203d32';ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.strokeStyle='#ffffff06';ctx.lineWidth=1;
  for(let x=0;x<WIDTH;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}
  for(let y=0;y<HEIGHT;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}
  for(const p of sim.food){ctx.fillStyle='#789451';ctx.beginPath();ctx.ellipse(p.x,p.y,3,5,-.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a1b976';ctx.fillRect(p.x-1,p.y-3,1,5);}
  for(const c of sim.creatures){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);ctx.shadowBlur=8;ctx.shadowColor=c.type==='herbivore'?'#a6d49655':'#ea9c7655';ctx.fillStyle=c.type==='herbivore'?'#add898':'#e49b77';ctx.beginPath();if(c.type==='herbivore')ctx.ellipse(0,0,c.size+2,c.size,0,0,Math.PI*2);else{ctx.moveTo(c.size+4,0);ctx.lineTo(-c.size,-c.size);ctx.lineTo(-c.size,c.size);ctx.closePath();}ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#203d32';ctx.beginPath();ctx.arc(c.size*.5,-2,1.3,0,Math.PI*2);ctx.fill();ctx.restore();}
}
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;if(!paused)for(let i=0;i<speed;i++)sim.step(dt);draw();if(now-statsAt>250){update();statsAt=now;}requestAnimationFrame(frame);}
sim.reset();update();requestAnimationFrame(now=>{last=now;requestAnimationFrame(frame);});
