// 42 source-derived 3D letter poses and measured motion tracks.
import { framePose, restPose, blendPose, ease, poseData } from './pose.js?v=type7';
const PRE=.22,TRANS=.4,HOLD=.8,SPACE=.6;
export const SPEEDS={slow:.55,normal:1,fast:1.6};
export function sampleMotion(item,time){const frames=item.frames,times=item.times;if(frames.length===1)return frames[0];if(time<=times[0])return frames[0];if(time>=times.at(-1))return frames.at(-1);let right=1;while(right<times.length&&times[right]<time)right++;const left=right-1,gap=times[right]-times[left];if(gap>item.maxGap)return frames[left];return blendPose(frames[left],frames[right],gap?Math.max(0,Math.min(1,(time-times[left])/gap)):0);}
export class SpellPlayer{
 constructor(opts){this.o=opts;this.items=[];this.idx=0;this.u=0;this.playing=false;this.speed=1;this.cur=restPose();this.from=this.cur;this.mid=null;this.ended=false;}
 load(letters){this.letters=letters;this.items=letters.map((ch,i)=>{if(ch===' ')return{ch,kind:'space',dur:SPACE};const repeat=i>0&&letters[i-1]===ch,L=poseData().letters[ch];const video=this.o.preferVideo?.()===true;
 if(L?.frames?.length&&!video){const frames=L.frames.map(framePose),times=L.times||frames.map((_,j)=>j/(poseData().fps||30));const duration=frames.length>1?Math.max(.1,times.at(-1)):0;return{ch,kind:'pose',repeat,target:frames[0],frames,times,motion:frames.length>1,motionDuration:duration,maxGap:L.maxInterpolationGap??.12,dur:(repeat?PRE:0)+TRANS+duration+HOLD};}
 return{ch,kind:'video',dur:Math.max(1.2,this.o.videoDuration(ch)||2)};});this.seek(0,false);const first=this.items[0];if(first?.kind==='pose'){this.cur=first.target;this.from=first.target;}}
 _enter(i){this.idx=i;this.u=0;this.ended=false;this.from=this.cur;const it=this.items[i];this.mid=it?.kind==='pose'&&it.repeat?blendPose(this.from,restPose(),.55):null;this.o.onIndex?.(i,it);}
 seek(i,play=true){i=Math.max(0,Math.min(this.items.length-1,i));this._enter(i);this.playing=play;}
 play(){if(this.ended||this.idx>=this.items.length)this.seek(0,true);else this.playing=true;this.ended=false;}
 pause(){this.playing=false;}resume(){this.playing=true;}restart(){this.cur=restPose();this.seek(0,true);}
 next(){if(this.idx<this.items.length-1)this.seek(this.idx+1,true);}prev(){if(this.idx>0)this.seek(this.idx-1,true);}setSpeed(f){this.speed=f;}
 tick(dt){if(!this.items.length)return{pose:this.cur,item:null};if(this.playing)this.u+=dt*this.speed;let it=this.items[this.idx];while(this.playing&&this.u>=it.dur){if(this.idx===this.items.length-1){this.u=it.dur;this.playing=false;this.ended=true;this.o.onEnd?.();break;}const keep=this.u-it.dur;this._enter(this.idx+1);this.u=keep;it=this.items[this.idx];}
 if(it.kind==='pose'){let u=this.u,start=this.from;if(it.repeat){if(u<PRE){this.cur=blendPose(this.from,this.mid,ease(u/PRE));return{pose:this.cur,item:it};}u-=PRE;start=this.mid;}
 this.cur=u<TRANS?blendPose(start,it.target,ease(u/TRANS)):it.motion?sampleMotion(it,Math.min(it.motionDuration,u-TRANS)):it.target;}
 return{pose:this.cur,item:it};}
}
