// Ортақ «3D қол сахнасы»: үлкен қол, ағымдағы әріп дөңгелегі, әріп карточкалары, басқару батырмалары.
import { HandRenderer, defaultCam } from './hand3d.js?v=type7';
import { evalPose, poseData, framePose } from './pose.js?v=type7';
import { SpellPlayer, SPEEDS } from './player.js?v=type7';
import { isVerified, videoFor } from './data.js?v=type7';

let RENDERER = null;
export const renderer = () => (RENDERER ||= new HandRenderer());

export function pixelSize(css) { const dpr = Math.min(window.devicePixelRatio || 1, 1.5); return Math.max(160, Math.round(css * dpr * quality)); }
export let quality = window.innerWidth < 700 ? 0.8 : 1;

// Shared framing for choice tiles: include the full hand and the short cuff.
export function cameraForPose(p,aspect=1){
 const world=v=>[0,1,2].map(i=>p.W[i]+p.R[i]*v[0]+p.R[3+i]*v[1]+p.R[6+i]*v[2]);
 const pts=Array.from({length:21},(_,i)=>world(Array.from(p.local.slice(i*3,i*3+3))));pts.push(world([0,-1.18,0]));
 const lo=[0,1,2].map(k=>Math.min(...pts.map(v=>v[k]))),hi=[0,1,2].map(k=>Math.max(...pts.map(v=>v[k]))),c=lo.map((v,k)=>(v+hi[k])/2);
 const radius=Math.max(...pts.map(v=>Math.hypot(...v.map((x,k)=>x-c[k]))))+.12;
 return {...defaultCam(),targetX:c[0],targetY:c[1],targetZ:c[2],dist:Math.max(6.5,radius/Math.tan(28*Math.PI/360)*1.13/Math.min(1,aspect))};
}

export class Stage {
  // cfg: {controls:true, onIndex(i,item,letters), onEnd()}
  constructor(root, cfg = {}) {
    this.root = root; this.cfg = cfg; this.cam = defaultCam(); this.dirty = true; this.alive = true; this.last = performance.now(); this.slow = 0; this.preferVideo = false; this.renderError = null;
    root.innerHTML = `
      <div class="stage">
        <div class="stage-view">
          <canvas class="hand-canvas" aria-label="3D қол"></canvas>
          <video class="stage-video" muted playsinline preload="none" hidden></video>
          <div class="cur-letter" aria-live="polite">·</div>
          <div class="stage-note" aria-live="polite"></div>
          <button class="reset-view" type="button" title="Қолды бастапқы көріністе қайтару">Бастапқы көрініс</button>
        </div>
        <div class="cards" role="list"></div>
        <div class="controls"></div>
      </div>`;
    this.canvas = root.querySelector('.hand-canvas'); this.video = root.querySelector('.stage-video');
    this.curEl = root.querySelector('.cur-letter'); this.noteEl = root.querySelector('.stage-note'); this.cardsEl = root.querySelector('.cards');
    this.player = new SpellPlayer({
      preferVideo: () => this.preferVideo, videoDuration: (ch) => videoFor(ch)?.durationSec,
      onIndex: (i, it) => this._onIndex(i, it), onEnd: () => { this._sync(); cfg.onEnd && cfg.onEnd(); },
    });
    if (cfg.controls !== false) this._controls(root.querySelector('.controls'));
    this.video.oncanplay = () => {
      if (!this.alive || this.player.items[this.player.idx]?.kind !== 'video') return;
      this.noteEl.textContent = 'Үлгі видео. Әріп толық көрсетілгеннен кейін келесісіне өтеді.';
      if (this.player.playing) this.video.play().catch(() => { this.noteEl.textContent = 'Видеоны бастау үшін Көрсету батырмасын басыңыз.'; });
    };
    this.video.onended = () => {
      if (!this.alive || !this.player.playing || this.player.items[this.player.idx]?.kind !== 'video') return;
      this.player.u = this.player.items[this.player.idx].dur;
      this.player.tick(0); this._sync();
    };
    this.video.onerror = () => {
      this.player.pause(); this._sync();
      this.noteEl.textContent = 'Видео ашылмады. Қайталап көріңіз немесе келесі әріпті таңдаңыз.';
    };
    this._orbit(); root.querySelector('.reset-view').onclick = () => { this.renderError = null; this.noteEl.textContent = ''; this.noteEl.classList.remove('render-error'); this._fitItem(this.player.items[this.player.idx]); this.dirty = true; };
    this._ro = new ResizeObserver(() => { this.dirty = true; }); this._ro.observe(root.querySelector('.stage-view'));
    this._raf = (t) => this._loop(t); requestAnimationFrame(this._raf);
  }
  destroy() { this.alive = false; this._ro.disconnect(); this.video.pause(); this.video.removeAttribute('src'); this.video.load(); }
  setLetters(letters) {
    this.renderError = null; this.noteEl.classList.remove('render-error'); this.letters = letters; this.cardsEl.innerHTML = '';
    letters.forEach((ch, i) => {
      if (ch === ' ') { const s = document.createElement('span'); s.className = 'card-gap'; this.cardsEl.appendChild(s); return; }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'card'; b.textContent = ch; b.setAttribute('role', 'listitem');
      b.setAttribute('aria-label', `${ch} әрпінен бастап көрсету`); b.onclick = () => { this.player.seek(i, true); this._sync(); };
      b.dataset.i = i; this.cardsEl.appendChild(b);
    });
    this.player.load(letters); this._onIndex(0, this.player.items[0]); this._sync(); this.dirty = true;
  }
  _onIndex(i, it) {
    this.dirty = true;
    this.cardsEl.querySelectorAll('.card').forEach((c) => c.classList.toggle('on', +c.dataset.i === i));
    const on = this.cardsEl.querySelector(`.card[data-i="${i}"]`);
    if (on && on.scrollIntoView) { const p = this.cardsEl; const off = on.offsetLeft - p.clientWidth / 2 + on.clientWidth / 2; if (p.scrollWidth > p.clientWidth) p.scrollTo({ left: off, behavior: 'smooth' }); }
    if (!it) return;
    this.curEl.textContent = it.kind === 'space' ? '␣' : it.ch;
    if (it.kind === 'pose') this._fitItem(it);
    if (it.kind === 'video') {
      const v = videoFor(it.ch); this.video.hidden = false; this.canvas.hidden = true;
      this.video.poster = v.poster; this.video.src = v.video; this.video.loop = false; this.video.controls = false; this.video.playbackRate = this.player.speed;
      this.noteEl.textContent = 'Үлгі видео жүктелуде…';
      if (this.player.playing) this.video.play().catch(() => {});
    } else {
      this.video.hidden = true; this.video.pause(); this.canvas.hidden = false;
      this.noteEl.textContent = '';
    }
  }
  _controls(el) {
    el.innerHTML = `
      <div class="ctl-row">
        <button type="button" class="btn ghost" data-a="prev">‹ Алдыңғы әріп</button>
        <button type="button" class="btn primary" data-a="play">Көрсету</button>
        <button type="button" class="btn ghost" data-a="next">Келесі әріп ›</button>
        <button type="button" class="btn ghost" data-a="restart">Қайта бастау</button><button type="button" class="btn ghost" data-a="media">Видео үлгісіне ауысу</button>
      </div>
      <div class="seg" role="group" aria-label="Жылдамдық">
        <button type="button" data-s="slow">Баяу</button><button type="button" data-s="normal" class="on">Қалыпты</button><button type="button" data-s="fast">Жылдам</button>
      </div>`;
    this.playBtn = el.querySelector('[data-a=play]');
    el.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return; const p = this.player;
      if (b.dataset.a === 'play') { if (p.playing) p.pause(); else if (p.ended) p.restart(); else p.resume(); }
      else if (b.dataset.a === 'prev') p.prev(); else if (b.dataset.a === 'next') p.next();
      else if (b.dataset.a === 'restart') p.restart();
      else if (b.dataset.a === 'media') { this._mediaMode(!this.preferVideo); b.textContent = this.preferVideo ? '3D көрінісіне ауысу' : 'Видео үлгісіне ауысу'; }
      else if (b.dataset.s) { p.setSpeed(SPEEDS[b.dataset.s]); this.video.playbackRate = SPEEDS[b.dataset.s]; el.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); }
      this._sync();
    };
  }
  _fitItem(item) {
    if (!item || item.kind !== 'pose') {this.cam=defaultCam();return;}
    const all=[];
    for (const frame of item.frames || [item.target]) {
      const p=evalPose(frame);
      const world=v=>[0,1,2].map(i=>p.W[i]+p.R[i]*v[0]+p.R[3+i]*v[1]+p.R[6+i]*v[2]);
      for(let i=0;i<21;i++)all.push(world(Array.from(p.local.slice(i*3,i*3+3))));
      all.push(world([0,-1.18,0]));
    }
    const lo=[0,1,2].map(k=>Math.min(...all.map(v=>v[k]))),hi=[0,1,2].map(k=>Math.max(...all.map(v=>v[k])));
    const c=lo.map((v,k)=>(v+hi[k])/2),radius=Math.max(...all.map(v=>Math.hypot(...v.map((x,k)=>x-c[k]))));
    this.cam={...defaultCam(),targetX:c[0],targetY:c[1],targetZ:c[2],dist:Math.max(6.5,radius/Math.tan(28*Math.PI/360)*1.2)};
  }
  _mediaMode(video) {
    this.preferVideo = video;
    if (!this.letters?.length) return;
    const index = this.player.idx, playing = this.player.playing;
    this.player.load(this.letters); this.player.seek(index, playing); this._sync();
  }
  _sync() {
    if (this.playBtn) this.playBtn.textContent = this.player.playing ? 'Тоқтата тұру' : (this.player.idx > 0 && !this.player.ended) ? 'Жалғастыру' : this.player.ended ? 'Қайта көрсету' : 'Көрсету';
    const it = this.player.items[this.player.idx];
    if (it && it.kind === 'video') { if (this.player.playing) this.video.play().catch(() => {}); else this.video.pause(); }
    this.dirty = true;
  }
  play() { this.player.restart(); this._sync(); }
  _orbit() {
    let drag = null; const c = this.canvas;
    c.style.touchAction = 'none';
    c.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, yaw: this.cam.yaw, pitch: this.cam.pitch }; c.setPointerCapture(e.pointerId); };
    c.onpointermove = (e) => { if (!drag) return; this.cam.yaw = Math.max(-1.2, Math.min(1.2, drag.yaw - (e.clientX - drag.x) * 0.008)); this.cam.pitch = Math.max(-0.8, Math.min(0.8, drag.pitch + (e.clientY - drag.y) * 0.008)); this.dirty = true; };
    c.onpointerup = c.onpointercancel = () => { drag = null; };
    c.ondblclick = () => { this.cam = defaultCam(); this.dirty = true; };
  }
  _loop(t) {
    if (!this.alive) return; requestAnimationFrame(this._raf);
    const dt = Math.min(0.1, (t - this.last) / 1000); this.last = t;
    const wasPlaying = this.player.playing; const current = this.player.items[this.player.idx];
    const r = this.player.tick(current?.kind === 'video' ? 0 : dt);
    if (this.playBtn && wasPlaying !== this.player.playing) this._sync();
    if (this.renderError || !(wasPlaying || this.dirty) || this.canvas.hidden) { return; }
    this.dirty = false;
    const box = this.root.querySelector('.stage-view').getBoundingClientRect();
    const css = box.width || 400; const px = pixelSize(css), ph = pixelSize(box.height || css);
    this.canvas.style.height = '100%';
    const t0 = performance.now();
    try { renderer().draw(this.canvas, evalPose(r.pose), this.cam, px, ph); }
    catch (error) {
      console.warn('3D көрсету қатесі:', error);
      this.renderError = error; this.player.pause(); this._sync();
      this.noteEl.textContent = '3D қол ашылмады. Браузерді жаңартып, «Бастапқы көрініс» батырмасын басыңыз.';
      this.noteEl.classList.add('render-error');
    }
    this.lastDraw = performance.now() - t0;
  }
}
