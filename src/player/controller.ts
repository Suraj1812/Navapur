import * as T from 'three';
import {clamp} from '../core/geometry';
import type {Collider,PlayerState} from '../core/types';
import {createPlayer} from './characters';
export class PlayerController {
 readonly avatar=createPlayer();keys=new Set<string>();yaw=Math.PI;pitch=.16;moving=false;inVehicle=false;firstPerson=false;private verticalSpeed=0;private height=0;private dragging=false;private desired=new T.Vector3(); private target=new T.Vector3();
 constructor(private camera:T.PerspectiveCamera,canvas:HTMLCanvasElement,private colliders:Collider[],private bounds:number){
 window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select,textarea'))return;this.keys.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.keys.clear());canvas.addEventListener('pointerdown',e=>{this.dragging=true;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',()=>this.dragging=false);canvas.addEventListener('pointermove',e=>{if(!this.dragging&&document.pointerLockElement!==canvas)return;this.yaw-=e.movementX*.004;this.pitch=clamp(this.pitch+e.movementY*.003,-.25,1.03);});canvas.addEventListener('dblclick',()=>{canvas.requestPointerLock?.()?.catch(()=>{});});
 }
 blocked(x:number,z:number,r=.36){return Math.abs(x)>this.bounds||Math.abs(z)>this.bounds||this.colliders.some(c=>x+r>c.minX&&x-r<c.maxX&&z+r>c.minZ&&z-r<c.maxZ);}
 update(dt:number,p:PlayerState,elapsed:number,enabled:boolean){
 let f=0,s=0;if(enabled&&!this.inVehicle){f=Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'));s=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'));}
 this.moving=!!(f||s);const sprint=this.keys.has('ShiftLeft')&&p.stamina>1&&this.moving;const crouch=this.keys.has('ControlLeft');const speed=crouch?1.6:sprint?7:3.6;if(sprint)p.stamina=Math.max(0,p.stamina-dt*6);else p.stamina=Math.min(100,p.stamina+dt*4);
 if(this.moving){const norm=Math.hypot(f,s);let dx=(Math.sin(this.yaw)*f-Math.cos(this.yaw)*s)/norm*speed*dt,dz=(Math.cos(this.yaw)*f+Math.sin(this.yaw)*s)/norm*speed*dt;if(!this.blocked(p.x+dx,p.z))p.x+=dx;if(!this.blocked(p.x,p.z+dz))p.z+=dz;this.avatar.group.rotation.y=Math.atan2(dx,dz);}
 if(enabled&&!this.inVehicle&&this.keys.has('Space')&&this.height===0){this.verticalSpeed=5;this.height=.001;}this.verticalSpeed-=dt*13;this.height=Math.max(0,this.height+this.verticalSpeed*dt);if(this.height===0)this.verticalSpeed=0;
 this.avatar.group.position.set(p.x,this.height,p.z);this.avatar.group.scale.y=crouch?.72:1;this.avatar.group.visible=!this.inVehicle&&!this.firstPerson;this.avatar.animate(elapsed,this.moving);
 const range=this.firstPerson?.02:this.inVehicle?8:5.8;const elevation=this.firstPerson?1.68:2.55+Math.sin(this.pitch)*range;this.target.set(p.x,this.inVehicle?1.4:1.25,p.z);this.desired.set(p.x-Math.sin(this.yaw)*range*Math.cos(this.pitch),elevation+this.height,p.z-Math.cos(this.yaw)*range*Math.cos(this.pitch));
 if(!this.firstPerson&&!this.inVehicle){for(let k=1;k>=.1;k-=.1){const x=p.x+(this.desired.x-p.x)*k,z=p.z+(this.desired.z-p.z)*k;if(!this.blocked(x,z,.12)){this.desired.x=x;this.desired.z=z;break;}}}
 this.camera.position.lerp(this.desired,1-Math.exp(-dt*9));if(this.firstPerson)this.target.set(p.x+Math.sin(this.yaw)*10,1.68-Math.sin(this.pitch)*10,p.z+Math.cos(this.yaw)*10);this.camera.lookAt(this.target);
 }
 reset(p:PlayerState){this.camera.position.set(p.x+1,3.7,p.z+6);this.yaw=Math.PI;this.pitch=.16;}
}
