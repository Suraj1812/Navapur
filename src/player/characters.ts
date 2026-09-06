import * as T from 'three';
import type {Resident,Weather} from '../core/types';
const dummy=new T.Object3D();
export class Crowd {
 readonly group=new T.Group(); readonly max=72; private pieces:T.InstancedMesh[]=[];activeCount=0;
 constructor(){
 const shapes=[new T.CapsuleGeometry(.23,.43,3,8),new T.SphereGeometry(.17,10,8),new T.SphereGeometry(.178,10,8),new T.CapsuleGeometry(.073,.41,3,6),new T.CapsuleGeometry(.073,.41,3,6),new T.CapsuleGeometry(.08,.48,3,6),new T.CapsuleGeometry(.08,.48,3,6),new T.BoxGeometry(.15,.09,.25),new T.BoxGeometry(.15,.09,.25),new T.SphereGeometry(.8,12,6,0,Math.PI*2,0,Math.PI/2)];
 shapes.forEach((g,i)=>{const m=new T.InstancedMesh(g,new T.MeshStandardMaterial({roughness:.87,side:i===9?T.DoubleSide:T.FrontSide}),this.max);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.castShadow=true;m.frustumCulled=false;this.pieces.push(m);this.group.add(m);});
 }
 update(residents:Resident[],player:{x:number,z:number},elapsed:number,weather:Weather){
 const selected=residents.filter(r=>Math.hypot(r.x-player.x,r.z-player.z)<105&&r.activity!=='Sleeping').sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z)).slice(0,this.max);this.activeCount=selected.length;
 for(let j=0;j<selected.length;j++){const r=selected[j],walk=r.moving?Math.sin(elapsed*7+j)*.45:0;const skin=new T.Color(['#9e6b4b','#ae7954','#865735','#c38c67'][j%4]);const shirt=new T.Color(r.color);const pant=new T.Color(j%3===0?'#c6b999':'#34454c');
 const spec=[[0,1.14,0,0],[0,1.68,0,0],[0,1.75,-.028,0],[-.31,1.1,0,walk],[.31,1.1,0,-walk],[-.125,.48,0,-walk],[.125,.48,0,walk],[-.125,.105,Math.sin(-walk)*.38+.06,0],[.125,.105,Math.sin(walk)*.38+.06,0],[.12,2.02,0,0]];
 for(let i=0;i<this.pieces.length;i++){const [x,y,z,rx]=spec[i];const scale=r.age==='Child'?.73:1;dummy.position.set(r.x+(x*Math.cos(r.heading)+z*Math.sin(r.heading))*scale,y*scale,r.z+(-x*Math.sin(r.heading)+z*Math.cos(r.heading))*scale);dummy.rotation.set(0,r.heading,0);dummy.rotateX(rx);dummy.scale.setScalar(scale);if(i===2)dummy.scale.y*=.6;if(i===9&&weather!=='rain')dummy.scale.setScalar(0);dummy.updateMatrix();this.pieces[i].setMatrixAt(j,dummy.matrix);this.pieces[i].setColorAt(j,i===1?skin:i===2||i===7||i===8?new T.Color('#252525'):i===5||i===6?pant:shirt);}
 }
 this.pieces.forEach(m=>{m.count=selected.length;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;});
 }
}
export function createPlayer(){const g=new T.Group();const skin=new T.MeshStandardMaterial({color:'#aa7754',roughness:.8}),shirt=new T.MeshStandardMaterial({color:'#d8c8ae',roughness:.96}),pants=new T.MeshStandardMaterial({color:'#334342',roughness:.88}),hair=new T.MeshStandardMaterial({color:'#201d1b'});const part=(geo:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};part(new T.CapsuleGeometry(.24,.44,4,8),shirt,0,1.12,0);part(new T.SphereGeometry(.17,12,10),skin,0,1.68,0);const h=part(new T.SphereGeometry(.18,12,8),hair,0,1.76,-.025);h.scale.y=.65;
 const limbs=[part(new T.CapsuleGeometry(.075,.47,3,8),shirt,-.31,1.08,0),part(new T.CapsuleGeometry(.075,.47,3,8),shirt,.31,1.08,0),part(new T.CapsuleGeometry(.09,.53,3,8),pants,-.13,.48,0),part(new T.CapsuleGeometry(.09,.53,3,8),pants,.13,.48,0)];part(new T.BoxGeometry(.16,.12,.28),hair,-.13,.08,.06);part(new T.BoxGeometry(.16,.12,.28),hair,.13,.08,.06);part(new T.BoxGeometry(.38,.42,.19),new T.MeshStandardMaterial({color:'#816341',roughness:.93}),0,1.17,-.24);return {group:g,animate:(t:number,moving:boolean)=>limbs.forEach((m,i)=>m.rotation.x=moving?Math.sin(t*8+(i%2)*Math.PI)*(i<2?.5:.45):0)};}
