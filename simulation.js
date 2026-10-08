export const WIDTH = 1000, HEIGHT = 650;
export const LIFESPAN = 180;
// Aging affects movement, not the base speed inherited by offspring.
export const movementSpeed = c => c.speed * (1 - .75 * Math.max(0, Math.min(1, c.age / LIFESPAN)));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class Ecosystem {
  constructor(random = Math.random) { this.random = random; this.creatures = []; this.food = []; this.time = 0; this.nextId = 1; }
  point() { return { x: this.random() * WIDTH, y: this.random() * HEIGHT }; }
  add(type, traits, point = this.point(), generation = 1) {
    if (this.creatures.length >= 250) return null;
    const c = { id: this.nextId++, type, ...point, speed: clamp(traits.speed,.6,3), sense: clamp(traits.sense,40,220), size: clamp(traits.size,4,12), generation, energy: 65, age: 0, cooldown: 12, angle: this.random()*Math.PI*2 };
    this.creatures.push(c); return c;
  }
  grow() { if(this.food.length < 300) this.food.push({...this.point(), energy: 24}); }
  reset() {
    this.creatures = []; this.food = []; this.time = 0;
    for(let i=0;i<180;i++) this.grow();
    for(let i=0;i<35;i++) this.add('herbivore',{speed:1.5,sense:100,size:6});
    for(let i=0;i<6;i++) this.add('carnivore',{speed:1.8,sense:140,size:8});
  }
  target(c) {
    if(c.type === 'herbivore') return this.food.filter(p=>distance(c,p)<c.sense).sort((a,b)=>distance(c,a)-distance(c,b))[0];
    const eligible = this.creatures.filter(p=>p.id!==c.id && p.energy>0 && p.size<c.size && distance(c,p)<c.sense);
    const herbs = eligible.filter(p=>p.type==='herbivore');
    return (herbs.length ? herbs : eligible).sort((a,b)=>distance(c,a)-distance(c,b))[0];
  }
  step(dt) {
    this.time += dt;
    if(this.random()<dt*10) this.grow();
    const newborns=[];
    for(const c of this.creatures) {
      if(c.energy<=0) continue;
      c.age+=dt; c.cooldown-=dt;
      if(c.age>=LIFESPAN) { c.energy=0; continue; }
      const currentSpeed=movementSpeed(c);
      c.energy-=dt*(.65+c.speed*c.speed*.13+c.size*.06+c.sense*.0015);
      const target=this.target(c);
      let dx=0,dy=0;
      if(target) {dx=target.x-c.x;dy=target.y-c.y;}
      if(c.type==='herbivore') {
        const threats=this.creatures.filter(p=>p.type==='carnivore' && p.energy>0 && p.size>c.size && distance(c,p)<c.sense);
        if(threats.length) {for(const p of threats){const d=Math.max(1,distance(c,p));dx+=(c.x-p.x)*c.sense*3/d;dy+=(c.y-p.y)*c.sense*3/d;}}
        else {
          const neighbors=this.creatures.filter(p=>p.type===c.type && p.id!==c.id && p.energy>0 && distance(c,p)<70);
          for(const p of neighbors) {const d=distance(c,p); const force=d<18?-2:.12; dx+=(p.x-c.x)*force;dy+=(p.y-c.y)*force;}
        }
      }
      if(dx||dy) c.angle=Math.atan2(dy,dx); else c.angle+=(this.random()-.5)*dt*2;
      c.x=clamp(c.x+Math.cos(c.angle)*currentSpeed*18*dt,c.size,WIDTH-c.size);
      c.y=clamp(c.y+Math.sin(c.angle)*currentSpeed*18*dt,c.size,HEIGHT-c.size);
      if(c.x===c.size||c.x===WIDTH-c.size||c.y===c.size||c.y===HEIGHT-c.size) c.angle+=Math.PI*.7;
      if(target && distance(c,target)<c.size+4) {
        if(c.type==='herbivore') {const i=this.food.indexOf(target);if(i>=0){this.food.splice(i,1);c.energy=Math.min(160,c.energy+target.energy);}}
        else if(target.energy>0){c.energy=Math.min(160,c.energy+45+target.energy*.4);target.energy=0;}
      }
      if(c.energy>110 && c.cooldown<=0 && this.creatures.length+newborns.length<250) {
        c.energy-=50;c.cooldown=15;
        const mutate=(value,amount)=>value+(this.random()-.5)*amount;
        newborns.push({type:c.type,traits:{speed:mutate(c.speed,.3),sense:mutate(c.sense,20),size:mutate(c.size,1)},point:{x:clamp(c.x+10,12,WIDTH-12),y:clamp(c.y+10,12,HEIGHT-12)},generation:c.generation+1});
      }
    }
    this.creatures=this.creatures.filter(c=>c.energy>0 && c.age<LIFESPAN);
    for(const b of newborns) this.add(b.type,b.traits,b.point,b.generation);
  }
}
