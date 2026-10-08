export const WIDTH = 1000, HEIGHT = 650;
export const LIFESPAN = 180;
// Aging affects movement, not the base speed inherited by offspring.
export const movementSpeed = c => c.speed * (1 - .75 * Math.max(0, Math.min(1, c.age / LIFESPAN)));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const hungerLevel = c => clamp(1 - c.energy / 65, 0, 1);
export const rivalAttackChance = (hunter, rival) => rival.size < hunter.size ? 1 :
  .08 * Math.pow(hunter.size / rival.size, 3) * (.25 + .75 * hungerLevel(hunter));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class Ecosystem {
  constructor(random = Math.random) { this.random = random; this.creatures = []; this.food = []; this.time = 0; this.nextId = 1; }
  point() { return { x: this.random() * WIDTH, y: this.random() * HEIGHT }; }
  add(type, traits, point = this.point(), generation = 1) {
    if (this.creatures.length >= 250) return null;
    const c = { id: this.nextId++, type, ...point, speed: clamp(traits.speed,.6,3), sense: clamp(traits.sense,40,220), size: clamp(traits.size,4,12), generation, survival: type==='herbivore' ? clamp(traits.survival ?? 0,0,1) : 0, exposure: 0, decisionTimer: 0, riskTolerance: 1, energy: 65, age: 0, cooldown: 12, aggression: 0, mistake: 0, mistakeTurn: 0, angle: this.random()*Math.PI*2 };
    this.creatures.push(c); return c;
  }
  addGroup(type, traits, count = 5) {
    // Spread each group across a size range, including at slider limits.
    const low = clamp(traits.size - 3, 4, 9);
    const high = clamp(traits.size + 3, 7, 12);
    const added = [];
    for(let i=0;i<count;i++) {
      const size = count === 1 ? traits.size : low + (high-low)*i/(count-1);
      const creature = this.add(type, {...traits, size});
      if(creature) added.push(creature);
    }
    return added;
  }
  grow() { if(this.food.length < 300) this.food.push({...this.point(), energy: 24}); }
  reset() {
    this.creatures = []; this.food = []; this.time = 0;
    for(let i=0;i<180;i++) this.grow();
    this.addGroup('herbivore',{speed:1.5,sense:100,size:7},35);
    this.addGroup('carnivore',{speed:1.8,sense:140,size:8},6);
  }
  target(c) {
    if(c.type === 'herbivore') return this.food.filter(p=>distance(c,p)<c.sense).sort((a,b)=>distance(c,a)-distance(c,b))[0];
    const eligible = this.creatures.filter(p=>p.id!==c.id && p.energy>0 && distance(c,p)<c.sense);
    const herbs = eligible.filter(p=>p.type==='herbivore' && p.size<c.size);
    const rivals = eligible.filter(p=>p.type==='carnivore');
    const smaller = rivals.filter(p=>p.size<c.size);
    const risky = c.aggression>0 ? rivals.filter(p=>p.size>=c.size && c.riskTolerance<rivalAttackChance(c,p)) : [];
    return (herbs.length ? herbs : smaller.length ? smaller : risky).sort((a,b)=>distance(c,a)-distance(c,b))[0];
  }
  attack(hunter, prey) {
    if(prey.energy<=0) return;
    // A larger rival can defeat the attacker; herbivores remain size-limited prey.
    const wins = prey.type==='herbivore' || prey.size<hunter.size ||
      this.random()<.5*Math.pow(hunter.size/prey.size,2);
    const winner=wins?hunter:prey, loser=wins?prey:hunter;
    winner.energy=Math.min(160,winner.energy+45+loser.energy*.4);
    loser.energy=0;
  }
  step(dt) {
    this.time += dt;
    if(this.random()<dt*10) this.grow();
    const newborns=[];
    for(const c of this.creatures) {
      if(c.energy<=0) continue;
      c.age+=dt; c.cooldown-=dt;
      if(c.age>=LIFESPAN) { c.energy=0; continue; }
      c.decisionTimer-=dt;
      if(c.type==='carnivore' && c.decisionTimer<=0) { c.riskTolerance=this.random(); c.decisionTimer=1; }
      c.aggression=Math.max(0,c.aggression-dt);
      c.mistake=Math.max(0,c.mistake-dt);
      const hunger=hungerLevel(c);
      // Time-based event rates keep decisions independent of frame rate.
      if(c.type==='carnivore' && c.aggression===0 && this.random()<1-Math.exp(-hunger*1.2*dt)) c.aggression=2;
      if(c.type==='herbivore' && c.mistake===0 && this.random()<1-Math.exp(-hunger*1.2*(1-.8*c.survival)*dt)) {
        c.mistake=1.5;
        c.mistakeTurn=(this.random()<.5?-1:1)*Math.PI/3;
      }
      const chaseBoost=c.aggression>0 ? 1+.4*hunger : 1;
      const currentSpeed=movementSpeed(c)*chaseBoost;
      c.energy-=dt*(.65+c.speed*c.speed*.13*chaseBoost*chaseBoost+c.size*.06+c.sense*.0015);
      const target=this.target(c);
      let dx=0,dy=0;
      if(target) {dx=target.x-c.x;dy=target.y-c.y;}
      if(c.type==='herbivore') {
        const threats=this.creatures.filter(p=>p.type==='carnivore' && p.energy>0 && p.size>c.size && distance(c,p)<c.sense*(1+.3*c.survival));
        if(threats.length) c.exposure+=dt;
        else { if(c.exposure>=1) c.survival=clamp(c.survival+.08,0,1); c.exposure=0; }
        if(c.mistake===0) {
        if(threats.length) {for(const p of threats){const d=Math.max(1,distance(c,p));dx+=(c.x-p.x)*c.sense*3/d;dy+=(c.y-p.y)*c.sense*3/d;}}
        else {
          const neighbors=this.creatures.filter(p=>p.type===c.type && p.id!==c.id && p.energy>0 && distance(c,p)<70);
          for(const p of neighbors) {const d=distance(c,p); const force=d<18?-2:.12*(1+c.survival); dx+=(p.x-c.x)*force;dy+=(p.y-c.y)*force;}
        }
      }
      }
      if(dx||dy) c.angle=Math.atan2(dy,dx)+(c.mistake>0?c.mistakeTurn:0); else c.angle+=(this.random()-.5)*dt*2;
      c.x=clamp(c.x+Math.cos(c.angle)*currentSpeed*18*dt,c.size,WIDTH-c.size);
      c.y=clamp(c.y+Math.sin(c.angle)*currentSpeed*18*dt,c.size,HEIGHT-c.size);
      if(c.x===c.size||c.x===WIDTH-c.size||c.y===c.size||c.y===HEIGHT-c.size) c.angle+=Math.PI*.7;
      if(target && distance(c,target)<c.size+4) {
        if(c.type==='herbivore') {const i=this.food.indexOf(target);if(i>=0){this.food.splice(i,1);c.energy=Math.min(160,c.energy+target.energy);}}
        else this.attack(c,target);
      }
      if(c.energy<=0) continue;
      if(c.energy>110 && c.cooldown<=0 && this.creatures.length+newborns.length<250) {
        c.energy-=50;c.cooldown=15;
        const mutate=(value,amount)=>value+(this.random()-.5)*amount;
        newborns.push({type:c.type,traits:{speed:mutate(c.speed,.3),sense:mutate(c.sense,20),size:mutate(c.size,1),survival:c.survival*.75},point:{x:clamp(c.x+10,12,WIDTH-12),y:clamp(c.y+10,12,HEIGHT-12)},generation:c.generation+1});
      }
    }
    this.creatures=this.creatures.filter(c=>c.energy>0 && c.age<LIFESPAN);
    for(const b of newborns) this.add(b.type,b.traits,b.point,b.generation);
  }
}
