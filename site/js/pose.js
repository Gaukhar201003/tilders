// Қол қалыптарының математикасы: poses.json -> FK -> 3D қол үшін жергілікті нүктелер.
export const TS = 0.6; // білезік жылжуын көрсету масштабы (деректегі шамаға көбейткіш)
let DATA = null;
export async function loadPoses(url = '/data/poses.json?v=type7') {
  const r = await fetch(url);
  if (!r.ok) throw new Error('poses.json жүктелмеді: ' + r.status);
  DATA = await r.json();
  return DATA;
}
export const poseData = () => DATA;

function norm3(d, i) {
  const l = Math.hypot(d[i], d[i + 1], d[i + 2]) || 1;
  d[i] /= l; d[i + 1] /= l; d[i + 2] /= l;
}
export function framePose(arr) {
  return { q: arr.slice(0, 4), t: arr.slice(4, 7), d: Float32Array.from(arr.slice(7)) };
}
// Тыныш қалып (ашық алақан)
export function restPose() {
  const d = new Float32Array(45);
  const set = (i, x, y, z) => { d[i * 3] = x; d[i * 3 + 1] = y; d[i * 3 + 2] = z; };
  const th = [[0.55, 0.8, 0.25], [0.5, 0.82, 0.22], [0.45, 0.85, 0.2]];
  th.forEach((v, i) => set(i, ...v));
  const sp = [0.06, 0.0, -0.05, -0.12];
  for (let f = 0; f < 4; f++) for (let b = 0; b < 3; b++) set(3 + f * 3 + b, sp[f], 1, 0);
  for (let i = 0; i < 15; i++) norm3(d, i * 3);
  return { q: [0, 0, 0, 1], t: [0, 0, 0], d };
}
export function slerp(a, b, u) {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb = dot < 0 ? b.map((x) => -x) : b; dot = Math.abs(dot);
  let s0, s1;
  if (dot > 0.9995) { s0 = 1 - u; s1 = u; }
  else { const th = Math.acos(dot), s = Math.sin(th); s0 = Math.sin((1 - u) * th) / s; s1 = Math.sin(u * th) / s; }
  const o = [0, 1, 2, 3].map((i) => a[i] * s0 + bb[i] * s1);
  const l = Math.hypot(...o) || 1; return o.map((x) => x / l);
}
export function blendPose(a, b, u) {
  const d = new Float32Array(45);
  for (let i = 0; i < 45; i++) d[i] = a.d[i] + (b.d[i] - a.d[i]) * u;
  for (let i = 0; i < 15; i++) norm3(d, i * 3);
  return { q: slerp(a.q, b.q, u), t: [0, 1, 2].map((i) => a.t[i] + (b.t[i] - a.t[i]) * u), d };
}
export const ease = (u) => u * u * (3 - 2 * u);

// Көрсетілетін мәліметтер: R (баған-мажорлы 3x3), W (білезік), local (21 нүкте)
export function evalPose(p) {
  const [x, y, z, w] = p.q;
  const R = new Float32Array([
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w),
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y),
  ]);
  const loc = new Float32Array(63);
  const palm = DATA.palm, bl = DATA.boneLen;
  const chains = [[1, 0], [5, 3], [9, 6], [13, 9], [17, 12]];
  for (const [pid, bi] of chains) {
    let px = palm[pid][0], py = palm[pid][1], pz = palm[pid][2];
    const base = pid; loc[base * 3] = px; loc[base * 3 + 1] = py; loc[base * 3 + 2] = pz;
    for (let k = 0; k < 3; k++) {
      px += p.d[(bi + k) * 3] * bl[bi + k]; py += p.d[(bi + k) * 3 + 1] * bl[bi + k]; pz += p.d[(bi + k) * 3 + 2] * bl[bi + k];
      const id = pid + k + 1; loc[id * 3] = px; loc[id * 3 + 1] = py; loc[id * 3 + 2] = pz;
    }
  }
  const W = [p.t[0] * TS, p.t[1] * TS, p.t[2] * TS].map((v) => Math.max(-1.3, Math.min(1.3, v)));
  return { R, W, local: loc };
}
