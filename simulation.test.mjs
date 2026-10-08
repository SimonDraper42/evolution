import test from 'node:test';
import assert from 'node:assert/strict';
import {Ecosystem} from './simulation.js';
const traits={speed:1.5,sense:150,size:8};
test('herbivores eat green food and gain energy',()=>{const s=new Ecosystem(()=>.5);const c=s.add('herbivore',traits,{x:100,y:100});s.food.push({x:100,y:100,energy:24});s.step(.01);assert.equal(s.food.length,0);assert.ok(c.energy>65);});
test('hunters prefer herbivores, and hunt smaller carnivores without them',()=>{const s=new Ecosystem(()=>.5);const hunter=s.add('carnivore',traits,{x:100,y:100});const other=s.add('carnivore',{...traits,size:6},{x:105,y:100});const herb=s.add('herbivore',{...traits,size:6},{x:120,y:100});assert.equal(s.target(hunter),herb);herb.energy=0;assert.equal(s.target(hunter),other);other.size=9;assert.equal(s.target(hunter),undefined);});
test('predation removes prey and feeds hunter',()=>{const s=new Ecosystem(()=>.5);const hunter=s.add('carnivore',traits,{x:100,y:100});const prey=s.add('herbivore',{...traits,size:5},{x:101,y:100});s.step(.01);assert.ok(hunter.energy>65);assert.ok(!s.creatures.includes(prey));});
test('reproduction inherits bounded mutated traits and next generation',()=>{const s=new Ecosystem(()=>.6);const parent=s.add('herbivore',traits,{x:100,y:100});parent.energy=120;parent.cooldown=0;s.step(.01);assert.equal(s.creatures.length,2);const child=s.creatures[1];assert.equal(child.generation,2);assert.notEqual(child.speed,parent.speed);assert.ok(child.speed>=.6&&child.speed<=3);assert.ok(parent.energy<120);});
test('starvation and old age remove creatures',()=>{const s=new Ecosystem(()=>.5);const c=s.add('herbivore',traits);c.energy=.001;s.step(1);assert.equal(s.creatures.length,0);const old=s.add('herbivore',traits);old.age=180;s.step(.01);assert.equal(s.creatures.length,0);});
test('herbivores move away from a nearby larger predator',()=>{const s=new Ecosystem(()=>.5);const herb=s.add('herbivore',{...traits,size:5},{x:100,y:100});s.add('carnivore',traits,{x:150,y:100});s.step(.1);assert.ok(herb.x<100);});
test('nearby herbivores herd together when safe',()=>{const s=new Ecosystem(()=>.5);const a=s.add('herbivore',traits,{x:100,y:100});s.add('herbivore',traits,{x:140,y:100});s.step(.1);assert.ok(a.x>100);});
test('seeded world stays bounded during a multi-generation run',()=>{let seed=123;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const s=new Ecosystem(random);s.reset();let highest=1;for(let i=0;i<6000;i++){s.step(.05);for(const c of s.creatures){highest=Math.max(highest,c.generation);assert.ok(Number.isFinite(c.energy));assert.ok(c.x>=0&&c.x<=1000&&c.y>=0&&c.y<=650);}assert.ok(s.creatures.length<=250);assert.ok(s.food.length<=300);}assert.ok(highest>1);});
test('older creatures travel less while retaining inherited base speed',()=>{
  const travel=age=>{const s=new Ecosystem(()=>.5);const c=s.add('herbivore',traits,{x:100,y:100});c.age=age;c.angle=0;s.step(.1);assert.equal(c.speed,traits.speed);return c.x-100;};
  const young=travel(0),middle=travel(90),old=travel(170);
  assert.ok(young>middle && middle>old && old>0);
  assert.ok(Math.abs(middle/young-.625)<.001);
});
test('offspring inherit base speed rather than an aged parent movement speed',()=>{
  const s=new Ecosystem(()=>.5);const parent=s.add('herbivore',traits,{x:100,y:100});parent.age=150;parent.energy=120;parent.cooldown=0;s.step(.01);
  const child=s.creatures.find(c=>c.id!==parent.id);assert.ok(child);assert.equal(child.speed,parent.speed);assert.equal(child.age,0);
});
test('creatures at the lifespan limit die before eating or reproducing',()=>{
  const s=new Ecosystem(()=>.5);const c=s.add('herbivore',traits,{x:100,y:100});c.age=179.99;c.energy=120;c.cooldown=0;s.food.push({x:100,y:100,energy:24});s.step(.02);
  assert.equal(s.creatures.length,0);assert.equal(s.food.length,1);
});
test('new worlds contain small and large creatures of both types',()=>{
 const s=new Ecosystem(()=>.5);s.reset();
 for(const type of ['herbivore','carnivore']){const sizes=s.creatures.filter(c=>c.type===type).map(c=>c.size);assert.ok(Math.max(...sizes)-Math.min(...sizes)>=6);assert.ok(sizes.every(size=>size>=4&&size<=12));}
});
test('added groups vary in size even at slider limits and respect population cap',()=>{
 for(const type of ['herbivore','carnivore'])for(const size of [4,8,12]){const s=new Ecosystem(()=>.5);const group=s.addGroup(type,{...traits,size});assert.equal(group.length,5);assert.ok(new Set(group.map(c=>c.size)).size===5);assert.ok(group.every(c=>c.size>=4&&c.size<=12&&c.type===type));assert.equal(s.add(type,{...traits,size}).size,size);}
 const s=new Ecosystem(()=>.5);for(let i=0;i<249;i++)s.add('herbivore',traits);assert.equal(s.addGroup('carnivore',traits).length,1);assert.equal(s.creatures.length,250);
});
test('hungry hunters are more likely to chase aggressively, at an energy cost',()=>{
 const run=energy=>{const s=new Ecosystem(()=>.01);const hunter=s.add('carnivore',traits,{x:100,y:100});hunter.energy=energy;s.add('herbivore',{...traits,size:5},{x:200,y:100});s.step(.1);return hunter;};
 const hungry=run(10),fed=run(65);
 assert.ok(hungry.aggression>0);assert.equal(fed.aggression,0);assert.ok(hungry.x>fed.x);assert.ok(10-hungry.energy>65-fed.energy);
});
test('hungry herbivores can miss predator cues, while fed herbivores flee',()=>{
 const run=energy=>{const s=new Ecosystem(()=>.01);const herb=s.add('herbivore',{...traits,size:5},{x:100,y:100});herb.energy=energy;s.food.push({x:200,y:100,energy:24});s.add('carnivore',traits,{x:150,y:100});s.step(.1);return herb;};
 const hungry=run(10),fed=run(65);assert.ok(hungry.mistake>0);assert.equal(fed.mistake,0);assert.ok(hungry.x>100);assert.ok(fed.x<100);
});
test('feeding reduces hunger and temporary mistakes expire',async()=>{
 const {hungerLevel}=await import('./simulation.js');const s=new Ecosystem(()=>.5);const c=s.add('herbivore',traits,{x:100,y:100});c.energy=10;const before=hungerLevel(c);s.food.push({x:100,y:100,energy:24});s.step(.01);assert.ok(hungerLevel(c)<before);c.mistake=.1;c.energy=65;s.step(.2);assert.equal(c.mistake,0);assert.equal(hungerLevel({energy:100}),0);assert.equal(hungerLevel({energy:0}),1);
});
test('larger rivals discourage attacks, while hunger increases willingness',async()=>{
 const {rivalAttackChance}=await import('./simulation.js');const hunter={size:6,energy:10};assert.ok(rivalAttackChance(hunter,{size:7})>rivalAttackChance(hunter,{size:12}));assert.ok(rivalAttackChance(hunter,{size:8})>rivalAttackChance({...hunter,energy:65},{size:8}));
 const s=new Ecosystem(()=>.5);const c=s.add('carnivore',{...traits,size:6},{x:100,y:100});const rival=s.add('carnivore',{...traits,size:9},{x:120,y:100});c.energy=10;c.aggression=2;c.riskTolerance=1;assert.equal(s.target(c),undefined);c.riskTolerance=0;assert.equal(s.target(c),rival);c.aggression=0;assert.equal(s.target(c),undefined);
});
test('risking a larger rival can defeat the attacker',()=>{
 const s=new Ecosystem(()=>.99);const c=s.add('carnivore',{...traits,size:5});const rival=s.add('carnivore',{...traits,size:10});s.attack(c,rival);assert.equal(c.energy,0);assert.ok(rival.energy>65);
});
test('surviving an encounter teaches skill once, bounded at 100 percent',()=>{
 const s=new Ecosystem(()=>.5);const herb=s.add('herbivore',{...traits,size:5},{x:100,y:100});const predator=s.add('carnivore',traits,{x:230,y:100});for(let i=0;i<20;i++)s.step(.05);assert.equal(herb.survival,0);predator.x=900;s.step(.05);assert.equal(herb.survival,.08);s.step(.05);assert.equal(herb.survival,.08);herb.survival=.99;herb.exposure=1;s.step(.05);assert.equal(herb.survival,1);
});
test('offspring receive part of parental survival knowledge',()=>{
 const s=new Ecosystem(()=>.5);const parent=s.add('herbivore',{...traits,survival:.8});parent.energy=120;parent.cooldown=0;s.step(.01);const child=s.creatures.find(c=>c.id!==parent.id);assert.ok(Math.abs(child.survival-.6)<1e-10);assert.equal(child.exposure,0);
});
test('survival knowledge reduces hunger errors and detects threats sooner',()=>{
 const run=(survival,energy,random,predatorX)=>{const s=new Ecosystem(()=>random);const herb=s.add('herbivore',{...traits,size:5,survival},{x:100,y:100});herb.energy=energy;herb.angle=0;if(predatorX)s.add('carnivore',traits,{x:predatorX,y:100});s.step(.1);return herb;};
 assert.ok(run(0,10,.05).mistake>0);assert.equal(run(1,10,.05).mistake,0);assert.ok(run(1,65,.5,270).x<100);assert.ok(run(0,65,.5,270).x>100);
});
