import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export class ModelBuilder {
 private parts:T.BufferGeometry[]=[];
 add(g:T.BufferGeometry, color:T.ColorRepresentation, x:number,y:number,z:number, rx=0,ry=0,rz=0) {g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);const c=new T.Color(color),a=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}g.setAttribute('color',new T.BufferAttribute(a,3));this.parts.push(g.toNonIndexed());g.dispose();}
 box(w:number,h:number,d:number,c:T.ColorRepresentation,x:number,y:number,z:number,rx=0,ry=0,rz=0){this.add(new T.BoxGeometry(w,h,d),c,x,y,z,rx,ry,rz);}
 cylinder(rt:number,rb:number,h:number,c:T.ColorRepresentation,x:number,y:number,z:number,rx=0,ry=0,rz=0){this.add(new T.CylinderGeometry(rt,rb,h,12),c,x,y,z,rx,ry,rz);}
 sphere(r:number,c:T.ColorRepresentation,x:number,y:number,z:number,sx=1,sy=1,sz=1){const g=new T.SphereGeometry(r,12,8);g.scale(sx,sy,sz);this.add(g,c,x,y,z);}
 build(){const g=mergeGeometries(this.parts);this.parts.forEach(p=>p.dispose());const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:.14}));m.castShadow=true;m.receiveShadow=true;return m;}
}
export const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export const distance=(a:{x:number,z:number},b:{x:number,z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
