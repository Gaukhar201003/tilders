// Ортақ 3D қол: WebGL фрагмент-шейдердегі SDF (жұмсақ, тұтас бет; саусақтар бір-біріне қосылмайды).
const VS = `attribute vec2 a; varying vec2 v; void main(){ v=a; gl_Position=vec4(a,0.,1.); }`;
const FS = `
precision highp float;
varying vec2 v;
uniform vec3 u_l[21];
uniform mat3 u_R;
uniform vec3 u_W;
uniform vec3 u_ro, u_right, u_up, u_fwd;
uniform vec2 u_res;
uniform float u_tan;
uniform float u_diag;
uniform vec3 u_bg;

float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.0)/k; return min(a,b)-h*h*k*0.25; }
float sdRC(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba=b-a; float l2=dot(ba,ba); float rr=r1-r2; float a2=l2-rr*rr; float il2=1.0/l2;
  vec3 pa=p-a; float y=dot(pa,ba); float z=y-l2; vec3 xv=pa*l2-ba*y; float x2=dot(xv,xv);
  float y2=y*y*l2; float z2=z*z*l2; float k=sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2>k) return sqrt(x2+z2)*il2-r2;
  if(sign(y)*a2*y2<k) return sqrt(x2+y2)*il2-r1;
  return (sqrt(x2*a2*il2)+y*rr)*il2-r1;
}
float sdEll(vec3 q, vec3 r){ float k0=length(q/r); float k1=length(q/(r*r)); return k0*(k0-1.0)/k1; }

float finger(vec3 p,vec3 a,vec3 c,vec3 d,vec3 e,float r0,float r1,float r2,float r3){
  float s1=sdRC(p,a,c,r0,r1);
  float s2=sdRC(p,c,d,r1,r2);
  float s3=sdRC(p,d,e,r2,r3);
  return smin(smin(s1,s2,0.035),s3,0.035);
}
// qual: x = қашықтық, y = материал (0 тері, 1 жең)
vec2 map(vec3 p){
  float idx=finger(p,u_l[5],u_l[6],u_l[7],u_l[8],0.118,0.104,0.094,0.082);
  float mid=finger(p,u_l[9],u_l[10],u_l[11],u_l[12],0.122,0.107,0.096,0.083);
  float rng=finger(p,u_l[13],u_l[14],u_l[15],u_l[16],0.112,0.098,0.088,0.077);
  float pnk=finger(p,u_l[17],u_l[18],u_l[19],u_l[20],0.098,0.084,0.075,0.066);
  float fing=min(min(idx,mid),min(rng,pnk));
  // бас бармақ
  float th=smin(smin(sdRC(p,u_l[1],u_l[2],0.17,0.128),sdRC(p,u_l[2],u_l[3],0.128,0.108),0.04),sdRC(p,u_l[3],u_l[4],0.108,0.09),0.04);
  // алақан
  float palm=sdEll(p-vec3(0.0,0.56,0.0),vec3(0.395,0.58,0.155));
  float kn=sdRC(p,u_l[17]+vec3(0.0,-0.04,0.0),u_l[5]+vec3(0.0,-0.04,0.0),0.115,0.125);
  float thenar=sdRC(p,vec3(0.06,0.06,0.04),u_l[2],0.2,0.16);
  float wr=sdRC(p,vec3(0.0,-0.5,0.0),vec3(0.0,0.1,0.0),0.27,0.30);
  float body=smin(smin(palm,kn,0.08),smin(thenar,wr,0.1),0.1);
  float skin=smin(smin(body,fing,0.07),th,0.1);
  skin=min(skin,fing); // саусақтар өзара қосылмайды
  float sleeveRadius=mix(0.315,0.365,clamp((-p.y-0.38)/0.76,0.0,1.0));
  float sl=max(length(p.xz)-sleeveRadius,max(p.y+0.38,-1.14-p.y))-0.018;
  return sl<skin ? vec2(sl,1.0) : vec2(skin,0.0);
}
vec3 nrm(vec3 p){
  vec2 e=vec2(0.0015,-0.0015);
  return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x);
}
// WebGL 1 requires constant indexing for uniform landmark arrays.
float flexLine(vec3 p,vec3 before,vec3 joint,vec3 after){
  vec3 axis=normalize(after-before);
  float line=exp(-pow(dot(p-joint,axis)/0.012,2.0));
  float zone=1.0-smoothstep(0.09,0.14,length(p-joint));
  return line*zone;
}
void main(){
  vec2 uv=v*vec2(u_res.x/u_res.y,1.0)*u_tan;
  vec3 rdw=normalize(u_fwd+u_right*uv.x+u_up*uv.y);
  vec3 ro=(u_ro-u_W)*u_R; vec3 rd=rdw*u_R;
  // шектеуші сфера (жергілікті координатта)
  vec3 c=vec3(0.0,0.35,0.0); float R=3.1;
  vec3 oc=ro-c; float b=dot(oc,rd); float cc=dot(oc,oc)-R*R; float h=b*b-cc;
  if(h<0.0){ gl_FragColor=vec4(0.0); return; }
  float t=max(-b-sqrt(h),0.0); float tmax=-b+sqrt(h);
  float pix=2.0*u_tan/u_res.y;
  float minD=1e4, tMin=t; bool hit=false; vec2 m=vec2(0.0);
  for(int i=0;i<90;i++){
    vec3 p=ro+rd*t; vec2 r=map(p);
    if(r.x<minD){ minD=r.x; tMin=t; }
    if(r.x<0.0012*t){ hit=true; m=r; break; }
    t+=r.x*0.9; if(t>tmax) break;
  }
  float alpha;
  if(hit) alpha=1.0; else { float px=pix*tMin; alpha=1.0-smoothstep(0.0,px*1.2,minD); if(alpha<=0.001){ gl_FragColor=vec4(0.0); return; } t=tMin; }
  vec3 p=ro+rd*t; vec3 n=nrm(p);
  // жарық (әлем бағыты -> жергілікті)
  vec3 Lk=normalize(vec3(-0.45,0.75,0.75))*u_R;
  vec3 Lf=normalize(vec3(0.8,0.1,0.5))*u_R;
  vec3 Lr=normalize(vec3(0.1,0.3,-1.0))*u_R;
  float dk=dot(n,Lk); float wrap=clamp((dk+0.45)/1.45,0.0,1.0);
  float df=clamp(dot(n,Lf)*0.5+0.5,0.0,1.0);
  // AO
  float ao=0.0; float sc=1.0;
  for(int i=1;i<=5;i++){ float hh=0.035*float(i); ao+=(hh-map(p+n*hh).x)*sc; sc*=0.72; }
  ao=clamp(1.0-2.2*ao,0.0,1.0);
  vec3 skin=vec3(0.78,0.66,0.49); vec3 deep=vec3(0.36,0.285,0.20);
  float grain=sin(p.x*123.0+p.y*79.0)*sin(p.z*137.0-p.y*91.0)*0.0008;
  skin+=grain;
  // Soft flexion lines follow the measured finger joints, without changing pose.
  float creases=max(max(flexLine(p,u_l[5],u_l[6],u_l[7]),flexLine(p,u_l[9],u_l[10],u_l[11])),max(flexLine(p,u_l[13],u_l[14],u_l[15]),flexLine(p,u_l[17],u_l[18],u_l[19])));
  skin*=1.0-creases*0.045;
  float palmLines=exp(-pow((p.y-0.65+0.2*p.x)/0.012,2.0))*smoothstep(0.07,0.13,p.z)*(1.0-smoothstep(0.24,0.36,abs(p.x)));
  skin*=1.0-palmLines*0.025;
  vec3 sleeve=vec3(0.235,0.052,0.085);
  float cuff=1.0-smoothstep(0.01,0.028,abs(p.y+0.40));
  sleeve=mix(sleeve,vec3(0.36,0.12,0.15),cuff*0.30);
  vec3 base=m.y>0.5?sleeve:skin;
  vec3 shade=mix(m.y>0.5?base*0.45:deep,base,smoothstep(0.0,0.75,wrap));
  vec3 col=shade*(0.62+0.5*wrap)*(0.5+0.5*ao);
  col+=vec3(0.21,0.18,0.16)*df*0.3*ao;
  vec3 hv=normalize(Lk-rd); float sp=pow(max(dot(n,hv),0.0),38.0)*(m.y>0.5?0.018:0.025);
  col+=sp;
  float rim=pow(1.0-max(dot(n,-rd),0.0),3.0)*max(dot(n,Lr)*0.5+0.5,0.0);
  col+=vec3(0.95,0.8,0.65)*rim*0.22;
  if(m.y>0.5) col=sleeve*(0.38+0.65*wrap)*(0.65+0.35*ao)+vec3(0.025,0.04,0.06)*rim;
  col=pow(clamp(col,0.0,1.0),vec3(1.0/2.2));
  gl_FragColor=vec4(col*alpha,alpha);
}`;

export class HandRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    const contextOptions={premultipliedAlpha:true,alpha:true,antialias:false,preserveDrawingBuffer:true};
    const gl = this.canvas.getContext('webgl',contextOptions) || this.canvas.getContext('experimental-webgl',contextOptions);
    if (!gl) throw new Error('WebGL қолжетімсіз');
    this.gl = gl;
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision ? FS : FS.replace('precision highp float;','precision mediump float;')));
    gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr); this.pr = pr;
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {}; for (const n of ['u_l', 'u_R', 'u_W', 'u_ro', 'u_right', 'u_up', 'u_fwd', 'u_res', 'u_tan']) this.u[n] = gl.getUniformLocation(pr, n);
  }
  // pose: evalPose(...) нәтижесі; cam: {yaw,pitch,dist}
  draw(target, pose, cam, w, h) {
    const gl = this.gl, c = this.canvas;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const cy = Math.cos(cam.pitch), sy = Math.sin(cam.pitch);
    const tgt = [cam.targetX ?? 0, cam.targetY ?? 1.0, cam.targetZ ?? 0];
    const ro = [tgt[0] + cam.dist * Math.sin(cam.yaw) * cy, tgt[1] + cam.dist * sy, tgt[2] + cam.dist * Math.cos(cam.yaw) * cy];
    const f = norm(sub(tgt, ro)); const right = norm(cross(f, [0, 1, 0])); const up = cross(right, f);
    const u = this.u;
    gl.uniform3fv(u.u_l, pose.local); gl.uniformMatrix3fv(u.u_R, false, pose.R); gl.uniform3fv(u.u_W, pose.W);
    gl.uniform3fv(u.u_ro, ro); gl.uniform3fv(u.u_right, right); gl.uniform3fv(u.u_up, up); gl.uniform3fv(u.u_fwd, f);
    gl.uniform2f(u.u_res, w, h); gl.uniform1f(u.u_tan, Math.tan((cam.fov ?? 28) * Math.PI / 360));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (target) { if (target.width !== w || target.height !== h) { target.width = w; target.height = h; }
      const ctx = target.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.drawImage(c, 0, 0); }
  }
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
export const defaultCam = () => ({ yaw: 0, pitch: 0.05, dist: 8.5, fov: 28, targetY: 1.05 });
