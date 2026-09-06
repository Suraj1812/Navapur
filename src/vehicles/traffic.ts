import * as T from 'three';
import {vehicleModel,type VehicleKind} from './models';
import {clamp,distance} from '../core/geometry';
import type {Vec2,PlayerState,Weather} from '../core/types';
export interface Vehicle extends Vec2 {id:string;kind:VehicleKind;group:T.Group;heading:number;speed:number;fuel:number;damage:number;route:Vec2[];target:number;parked:boolean;length:number;headlights:boolean;}
export class Traffic {
 group=new T.Group();vehicles:Vehicle[]=[];controlled:Vehicle|null=null;signalPhase=0;
 constructor(){const roads=[-144,-72,0,72,144];const kinds:VehicleKind[]=['auto','car','motorcycle','scooter','car','bus','auto','van','truck','ambulance'];for(let i=0;i<35;i++){const ax=i%4,az=Math.floor(i/4)%4;const x=roads[ax],z=roads[az],x1=roads[Math.min(4,ax+1+(i%3===0?1:0))],z1=roads[Math.min(4,az+1)];const route=[{x:x-2.8,z:z-2.8},{x:x1+2.8,z:z-2.8},{x:x1+2.8,z:z1+2.8},{x:x-2.8,z:z1+2.8}];const seg=i%4;const p=route[seg],q=route[(seg+1)%4];const frac=.15+(i%5)*.15;this.add(kinds[i%kinds.length],{x:p.x+(q.x-p.x)*frac,z:p.z+(q.z-p.z)*frac},route,(seg+1)%4,false,i);}this.add('auto',{x:4.7,z:26},[],0,true,35);this.add('car',{x:-5,z:43},[],0,true,36);this.add('scooter',{x:8.6,z:39},[],0,true,37);}
 private add(kind:VehicleKind,p:Vec2,route:Vec2[],target:number,parked:boolean,i:number){const model=vehicleModel(kind,['#d4cbb8','#a6b4b0','#975b43','#555f60','#d8d9cf'][i%5]);const v:Vehicle={id:'vehicle-'+i,kind,group:model.group,x:p.x,z:p.z,route,target,parked,length:model.length,heading:Math.PI,speed:0,fuel:100,damage:0,headlights:false};v.group.position.set(p.x,0,p.z);this.group.add(v.group);this.vehicles.push(v);}
 nearest(p:Vec2){return this.vehicles.filter(v=>distance(v,p)<4.6&&Math.abs(v.speed)<2).sort((a,b)=>distance(a,p)-distance(b,p))[0];}
 enter(v:Vehicle,p:PlayerState){this.controlled=v;v.parked=true;v.speed=0;p.x=v.x;p.z=v.z;if(!p.ownedVehicles.includes(v.id))p.ownedVehicles.push(v.id);}
 exit(p:PlayerState,blocked:(x:number,z:number,r?:number)=>boolean){if(!this.controlled)return false;const v=this.controlled;for(const side of [1,-1])for(const offset of [2.2,3.5,5]){const x=v.x+Math.cos(v.heading)*offset*side,z=v.z-Math.sin(v.heading)*offset*side;if(!blocked(x,z)){p.x=x;p.z=z;v.speed=0;this.controlled=null;return true;}}return false;}
 update(dt:number,t:number,weather:Weather,player:PlayerState,keys:Set<string>,enabled:boolean,blocked:(x:number,z:number,r?:number)=>boolean,onCollision:(x:number,z:number)=>void){
 this.signalPhase=Math.floor(t/13)%2;
 for(const v of this.vehicles){
 if(v===this.controlled){const acceleration=v.kind==='bus'?4:v.kind==='auto'?6:8;const f=enabled?Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')):0;const turn=enabled?Number(keys.has('KeyA')||keys.has('ArrowLeft'))-Number(keys.has('KeyD')||keys.has('ArrowRight')):0;const max=v.kind==='auto'?16:v.kind==='scooter'?19:27;if(v.fuel>0)v.speed+=f*acceleration*dt;v.speed*=Math.exp(-dt*(f?.13:1.05));if(keys.has('Space'))v.speed*=Math.exp(-dt*5);v.speed=clamp(v.speed,-6,max*(weather==='rain'?.78:1));v.heading+=turn*dt*1.45*clamp(v.speed/5,-1,1);const x=v.x+Math.sin(v.heading)*v.speed*dt,z=v.z+Math.cos(v.heading)*v.speed*dt;
 const obstacle=this.vehicles.some(o=>o!==v&&distance(o,{x,z})<(o.length+v.length)*.32);if(blocked(x,z,.8)||obstacle){if(Math.abs(v.speed)>3){v.damage=clamp(v.damage+Math.abs(v.speed)*.5,0,100);player.health=clamp(player.health-Math.abs(v.speed)*.13,0,100);onCollision(v.x,v.z);}v.speed*=-.22;}else{v.x=x;v.z=z;}v.fuel=Math.max(0,v.fuel-Math.abs(v.speed)*dt*.007);player.x=v.x;player.z=v.z;
 }else if(!v.parked){const q=v.route[v.target];const dist=distance(v,q);if(dist<1.5)v.target=(v.target+1)%v.route.length;const desired=Math.atan2(q.x-v.x,q.z-v.z);let diff=Math.atan2(Math.sin(desired-v.heading),Math.cos(desired-v.heading));v.heading+=clamp(diff,-dt*3.5,dt*3.5);let speed=(v.kind==='bus'?6.5:v.kind==='auto'?7.6:9.8)*(weather==='rain'?.7:1);const horizontal=Math.abs(Math.sin(v.heading))>.7;
 if(dist<12&&dist>4.2&&Number(horizontal)!==this.signalPhase)speed=0;
 for(const o of this.vehicles){if(o===v)continue;const dx=o.x-v.x,dz=o.z-v.z,ahead=dx*Math.sin(v.heading)+dz*Math.cos(v.heading),side=Math.abs(dx*Math.cos(v.heading)-dz*Math.sin(v.heading));if(ahead>0&&ahead<(v.length+o.length)/2+3.6&&side<1.65)speed=0;}
 const pdx=player.x-v.x,pdz=player.z-v.z;if(!this.controlled&&pdx*Math.sin(v.heading)+pdz*Math.cos(v.heading)>0&&distance(v,player)<7&&Math.abs(pdx*Math.cos(v.heading)-pdz*Math.sin(v.heading))<2)speed=0;
 v.speed+=(speed-v.speed)*Math.min(1,dt*(speed===0?7:1.5));v.x+=Math.sin(v.heading)*v.speed*dt;v.z+=Math.cos(v.heading)*v.speed*dt;
 }
 v.group.position.set(v.x,0,v.z);v.group.rotation.y=v.heading;
 }
 }
 serialize(){return this.vehicles.map(({id,x,z,heading,fuel,damage,parked,target})=>({id,x,z,heading,fuel,damage,parked,target}));}
 restore(data:ReturnType<Traffic['serialize']>){for(const saved of data){const v=this.vehicles.find(v=>v.id===saved.id);if(v)Object.assign(v,saved,{speed:0});}this.controlled=null;}
}
