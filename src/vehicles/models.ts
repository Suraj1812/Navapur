import * as T from 'three';
import {ModelBuilder} from '../core/geometry';
export type VehicleKind='auto'|'car'|'bus'|'truck'|'motorcycle'|'scooter'|'van'|'ambulance';
export function vehicleModel(kind:VehicleKind,color='#d7d3c5'){
 const b=new ModelBuilder();let length=3.9,width=1.7;const metal='#788384',black='#232a28',glass='#597778',rubber='#171c1c';
 if(kind==='auto'){
 length=2.7;width=1.45;b.box(1.4,.45,2.55,'#285845',0,.7,0);b.box(1.44,.55,.65,'#d4ae43',0,1,1);b.box(1.48,.17,2.05,'#d7b349',0,1.99,-.2);b.box(1.38,.85,.08,'#254d39',0,1.4,-1.2);b.box(1.25,.45,.08,glass,0,1.62,.86,-.16);for(const x of [-.67,.67]){b.box(.055,.9,.055,black,x,1.5,.82,-.17);b.box(.06,.92,.06,black,x,1.5,-1.13);b.box(.06,.13,1.75,'#c9a64b',x,1.13,-.22);b.box(.55,.11,.15,metal,x,1,.85);}b.box(1.13,.17,.6,black,0,.97,-.6);b.box(1.13,.53,.1,black,0,1.21,-.9);b.box(.6,.15,.5,black,0,1,.48);b.box(.15,.5,.1,black,0,1.26,.62);b.box(.5,.06,.06,metal,0,1.5,.7);for(const x of [-.45,.45])b.box(.19,.15,.07,'#f4ddb0',x,.94,1.34);b.box(.55,.11,.025,'#e8c959',0,.65,1.31);
 }else if(kind==='motorcycle'||kind==='scooter'){
 length=2.05;width=.68;b.box(.28,.3,1.2,color,0,.79,0);b.box(.42,.14,.86,black,0,1.01,-.25);b.box(.19,.8,.18,metal,0,.83,.64, .24);b.box(.65,.065,.07,black,0,1.32,.53);b.box(.43,.3,.15,color,0,1.13,.69);b.box(.23,.15,.04,'#f6e5b3',0,1.16,.78);b.box(.12,.12,.55,metal,.24,.53,-.5);if(kind==='scooter')b.box(.47,.65,.18,color,0,.76,.37,-.1);
 }else {
 const large=kind==='bus'||kind==='truck';length=kind==='bus'?8.6:kind==='truck'?6.3:kind==='van'||kind==='ambulance'?4.8:3.9;width=large?2.3:1.75;
 b.box(width,.5,length,color,0,.7,0);b.box(width+.05,.14,length+.05,black,0,.41,0);b.box(width*.98,.14,length-.05,color,0,1.0,0);
 if(kind==='bus'){
 b.box(width,1.9,length-.25,'#cbbcaf',0,1.9,-.05);b.box(width+.02,.5,length-.22,'#ad563c',0,1.13,-.05);b.box(width,.14,length,'#e2d8c3',0,2.9,0);b.box(width-.2,.9,.035,glass,0,2.2,length/2-.16);b.box(width-.2,.54,.035,black,0,2.65,length/2-.135);
 for(let z=-3.5;z<3.4;z+=1.07)for(const x of [-width/2-.013,width/2+.013]){b.box(.025,.9,.87,glass,x,2.14,z);b.box(.04,.035,.89,metal,x,1.88,z);}for(const x of [-.8,.8])b.box(.32,.22,.04,'#e7dca8',x,.95,length/2+.02);
 }else if(kind==='truck'){
 b.box(width,1.6,1.9,'#b2744f',0,1.75,2.05);b.box(width-.2,.65,.025,glass,0,2.04,3.02);b.box(width-.1,1.8,3.8,'#968c73',0,1.75,-.94);for(let z=-2.6;z<1;z+=.5)for(const x of [-1.16,1.16])b.box(.04,1.6,.075,'#655e52',x,1.76,z);
 }else{
 const van=kind==='van'||kind==='ambulance';b.box(width-.18,van?1.05:.7,van?length-.8:2.1,color,0,van?1.53:1.32,van?-.2:-.25);b.box(width-.32,.49,.035,glass,0,1.48,van?length/2-.6:.82,-.18);b.box(width-.32,.44,.035,glass,0,1.47,van?-length/2+.21:-1.32,.1);for(const x of [-width/2+.065,width/2-.065]){b.box(.04,.44,.84,glass,x,1.48,.24);b.box(.04,.44,.8,glass,x,1.48,-.7);b.box(.16,.12,.26,black,x*1.14,1.28,.67);}if(kind==='ambulance'){b.box(1,.15,.3,'#c2cbd1',0,2.15,.5);b.box(.3,.16,.28,'#4a8fb3',-.38,2.2,.5);b.box(.3,.16,.28,'#cd4e37',.38,2.2,.5);for(const x of [-.885,.885]){b.box(.015,.5,.16,'#c64332',x,1.65,-1.25);b.box(.015,.16,.5,'#c64332',x,1.65,-1.25);}}
 }
 for(const x of [-width*.35,width*.35]){b.box(.33,.15,.035,'#f2dcaa',x,.86,length/2+.014);b.box(.27,.12,.035,'#9d3228',x,.79,-length/2-.02);}b.box(.45,.09,.025,'#cfc6a0',0,.58,length/2+.035);b.box(width*.68,.18,.025,black,0,.68,length/2+.02);
 }
 const wheels: [number,number][] =kind==='auto'?[[-.68,-.8],[.68,-.8],[0,.89]]:kind==='motorcycle'||kind==='scooter'?[[0,-.73],[0,.74]]:[[-width*.49,-length*.31],[width*.49,-length*.31],[-width*.49,length*.31],[width*.49,length*.31]];
 const radius=kind==='bus'||kind==='truck'?.44:.32;wheels.forEach(([x,z])=>{b.cylinder(radius,radius,.2,rubber,x,radius,z,0,0,Math.PI/2);b.cylinder(radius*.48,radius*.48,.215,metal,x,radius,z,0,0,Math.PI/2);});
 const group=new T.Group();group.add(b.build());return {group,length,width};
}
