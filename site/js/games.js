// «Ойындар»: үшеуі де ортақ 3D қолды пайдаланады. Сұрақтар тек тексерілген (көзбен салыстырылған) статикалық қалыптардан құралады.
import { Stage, renderer, pixelSize, cameraForPose } from './stage.js?v=type7';
import { verifiedLetters, similarTo, videoFor, store } from './data.js?v=type7';
import { framePose, evalPose, poseData } from './pose.js?v=type7';
import { defaultCam } from './hand3d.js?v=type7';
import { GAME_WORDS } from './words_data.js?v=type7';

const ROUND = 10;
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const GAMES = [
  { id: 'g1', name: 'Әріпті тап', desc: 'Қол белгісін көріп, төрт әріптің ішінен дұрысын таңдаңыз.' },
  { id: 'g2', name: 'Қимылды тап', desc: 'Әріп беріледі — төрт қол көрсетілімінің ішінен дұрысын таңдаңыз.' },
  { id: 'g3', name: 'Сөзді құрастыр', desc: '3D қол қысқа сөзді әріптейді — әріптерден сол сөзді жинаңыз.' },
];
const stats = () => store.get('gameStats', {});
function saveResult(id, score, correct, total) {
  const s = stats(); const o = s[id] || { best: 0, played: 0 }; o.best = Math.max(o.best, score); o.played++; o.last = { score, correct, total, at: new Date().toISOString().slice(0, 10) }; s[id] = o; store.set('gameStats', s);
}
// «Ұқсас» әріптерді нұсқа ретінде бермеу: distractor қайтарады
function pickDistractors(correct, n, avoid = []) {
  const pool = verifiedLetters(); const bad = new Set([correct, ...similarTo(correct), ...avoid.flatMap((c) => [c, ...similarTo(c)])]);
  const out = [];
  for (const c of shuffle(pool)) { if (bad.has(c)) continue; if (out.some((o) => similarTo(o).includes(c))) continue; out.push(c); if (out.length === n) break; }
  return out;
}

export function gamesView(root) {
  let cleanup = () => {};
  const menu = () => {
    cleanup(); cleanup = () => {}; const st = stats();
    root.innerHTML = `<h2 class="sec-title">Ойындар</h2><p class="sec-sub">Көріңіз, таңдаңыз, есте сақтаңыз. Әр ойында ${ROUND} сұрақ.</p>
      <div class="game-menu">${GAMES.map((g,k)=>`<button type="button" class="game-card" data-g="${g.id}" aria-label="${g.name} ойынын бастау"><div class="game-preview"><div class="menu-hand" id="menu-hand-${k}"></div>${k===1?'<span class="game-preview-letter">Ә</span>':''}<div class="game-option-preview">${(k===2?[...'ОТБАСЫ']:k===0?[...'АБВГ']:['1','2','3','4']).map((v,i)=>`<span class="${i===2?'on':''}">${v}</span>`).join('')}</div></div><div class="game-copy"><h3>${g.name}</h3><p>${g.desc}</p><div class="game-start"><span>Ойынды бастау</span><span>↗</span></div></div></button>`).join('')}</div>`;
    const previews=GAMES.map((_,k)=>{const stage=new Stage(root.querySelector(`#menu-hand-${k}`),{controls:false});stage.setLetters([['В','Ә','О'][k]]);return stage;});
    cleanup=()=>previews.forEach(stage=>stage.destroy());
    root.querySelector('.game-menu').onclick = (e) => { const b = e.target.closest('[data-g]'); if (b) start(b.dataset.g); };
  };
  const start = (id) => {
    cleanup(); root.innerHTML = `<div class="game-head"><button type="button" class="btn ghost" id="back">‹ Ойындар</button><h2 class="sec-title">${GAMES.find((g) => g.id === id).name}</h2>
      <div class="scorebar" aria-live="polite"><span>Сұрақ <b id="qn">1</b>/${ROUND}</span><span>Ұпай <b id="sc">0</b></span><span>Дұрыс <b id="ok">0</b></span></div></div><div id="gbody"></div>`;
    root.querySelector('#back').onclick = menu;
    const ctx = { body: root.querySelector('#gbody'), qn: root.querySelector('#qn'), sc: root.querySelector('#sc'), okEl: root.querySelector('#ok'), score: 0, correct: 0, i: 0, id, menu, restart: () => start(id) };
    cleanup = ({ g1, g2, g3 })[id](ctx) || (() => {});
  };
  menu();
  return () => cleanup();
}

function frame(ctx, total) { ctx.qn.textContent = Math.min(ctx.i + 1, total); ctx.sc.textContent = ctx.score; ctx.okEl.textContent = ctx.correct; }
function finish(ctx, total) {
  saveResult(ctx.id, ctx.score, ctx.correct, total);
  ctx.body.innerHTML = `<div class="result card-surface"><h3>Нәтиже</h3><p class="big-num">${ctx.score} ұпай</p><p>${total} сұрақтың ${ctx.correct}-і дұрыс.</p>
    <div class="ctl-row"><button type="button" class="btn primary" id="again">Қайтадан ойнау</button><button type="button" class="btn ghost" id="menu">Ойындар тізімі</button></div></div>`;
  ctx.body.querySelector('#again').onclick = ctx.restart; ctx.body.querySelector('#menu').onclick = ctx.menu;
}
function explain(el,ok,ch,picked){
 el.hidden=false;el.innerHTML=`<p class="${ok?'good':'bad'}">${ok?'Дұрыс!':'Бұл жолы сәйкес келмеді.'} Дұрыс жауап: «${ch}».</p>${!ok&&picked?`<p class="muted">Сіз таңдаған әріп: «${picked}». Қол қалпын қайта қарап көріңіз.</p>`:''}`;
}

// ---------- 1. Әріпті тап ----------
function g1(ctx) {
  const order = shuffle(verifiedLetters()).slice(0, ROUND); let stage, timer, answered;
  const q = () => {
    clearTimeout(timer); answered = false; frame(ctx, ROUND);
    if (ctx.i >= ROUND) { if (stage) stage.destroy(); return finish(ctx, ROUND); }
    const ch = order[ctx.i]; const opts = shuffle([ch, ...pickDistractors(ch, 3)]);
    ctx.body.innerHTML = `<div class="game-grid"><div><div id="sh" class="nolabels"></div><div class="ctl-row center"><button type="button" class="btn ghost" id="rep">Қайта көрсету</button></div></div>
      <div><p class="prompt">Қол қай әріпті көрсетіп тұр?</p><div class="opts">${opts.map((o) => `<button type="button" class="opt" data-o="${o}">${o}</button>`).join('')}</div>
      <div class="explain card-surface" hidden></div><div class="ctl-row"><button type="button" class="btn primary" id="next" hidden>${ctx.i === ROUND - 1 ? 'Нәтижені көру' : 'Келесі'}</button></div></div></div>`;
    if (stage) stage.destroy();
    stage = new Stage(ctx.body.querySelector('#sh'), { controls: false, onEnd: () => { if (!answered) timer = setTimeout(() => { stage.player.restart(); }, 1500); } });
    stage.setLetters([ch]); stage.play();
    ctx.body.querySelector('#rep').onclick = () => stage.player.restart();
    ctx.body.querySelector('.opts').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return; answered = true; clearTimeout(timer);
      const ok = b.dataset.o === ch; if (ok) { ctx.score += 10; ctx.correct++; }
      ctx.body.querySelectorAll('.opt').forEach((x) => { x.disabled = true; if (x.dataset.o === ch) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      explain(ctx.body.querySelector('.explain'), ok, ch, ok ? null : b.dataset.o); frame(ctx, ROUND); ctx.body.querySelector('#next').hidden = false;
    };
    ctx.body.querySelector('#next').onclick = () => { ctx.i++; q(); };
  };
  q(); return () => { clearTimeout(timer); stage && stage.destroy(); };
}

// ---------- 2. Қимылды тап ----------
function g2(ctx) {
  const order = shuffle(verifiedLetters()).slice(0, ROUND); let answered, tiles = [];
  const draw = () => tiles.forEach((t) => { if(!t.canvas.isConnected)return; const box=t.canvas.getBoundingClientRect();const w=pixelSize(box.width||220),h=pixelSize(box.height||260);renderer().draw(t.canvas,t.pose,cameraForPose(t.pose,box.width/box.height||1),w,h); });
  const q = () => {
    answered = false; frame(ctx, ROUND);
    if (ctx.i >= ROUND) return finish(ctx, ROUND);
    const ch = order[ctx.i]; const opts = shuffle([ch, ...pickDistractors(ch, 3)]);
    ctx.body.innerHTML = `<p class="prompt g2-prompt">Қай қол «<b class="ask">${ch}</b>» әрпін көрсетіп тұр?</p>
      <div class="tiles">${opts.map((o, k) => `<button type="button" class="tile" data-o="${o}" aria-label="${k + 1}-нұсқа"><canvas></canvas><span class="tile-choice-number">${k+1}</span></button>`).join('')}</div>
      <div class="explain card-surface" hidden></div><div class="ctl-row"><button type="button" class="btn primary" id="next" hidden>${ctx.i === ROUND - 1 ? 'Нәтижені көру' : 'Келесі'}</button></div>`;
    tiles = [...ctx.body.querySelectorAll('.tile')].map((el) => ({ el, canvas: el.querySelector('canvas'), pose: evalPose(framePose(poseData().letters[el.dataset.o].frames[0])) }));
    requestAnimationFrame(draw);
    ctx.body.querySelector('.tiles').onclick = (e) => {
      const b = e.target.closest('.tile'); if (!b || answered) return; answered = true;
      const ok = b.dataset.o === ch; if (ok) { ctx.score += 10; ctx.correct++; }
      tiles.forEach((t) => { t.el.disabled = true; if (t.el.dataset.o === ch) t.el.classList.add('right'); else if (t.el === b) t.el.classList.add('wrong'); });
      explain(ctx.body.querySelector('.explain'), ok, ch, ok ? null : b.dataset.o); frame(ctx, ROUND); ctx.body.querySelector('#next').hidden = false;
    };
    ctx.body.querySelector('#next').onclick = () => { ctx.i++; q(); };
  };
  const onResize = () => draw(); window.addEventListener('resize', onResize); q();
  return () => window.removeEventListener('resize', onResize);
}

// ---------- 3. Сөзді құрастыр ----------
function g3(ctx) {
  const ver = new Set(verifiedLetters());
  const words = shuffle(GAME_WORDS.filter((w) => [...w].every((c) => ver.has(c)))).slice(0, ROUND); const total = words.length;
  let stage, answered, timer;
  const q = () => {
    clearTimeout(timer); answered = false; frame(ctx, total);
    if (ctx.i >= total) { stage && stage.destroy(); return finish(ctx, total); }
    const w = words[ctx.i]; const L = [...w];
    const extra = []; for (const c of shuffle([...ver])) { if (L.includes(c)) continue; if (L.some((x) => similarTo(x).includes(c))) continue; extra.push(c); if (extra.length === 2) break; }
    const tilesL = shuffle([...L, ...extra].map((c, k) => ({ c, k })));
    let filled = [];
    ctx.body.innerHTML = `<div class="game-grid"><div><div id="sh" class="nolabels"></div><div class="ctl-row center"><button type="button" class="btn ghost" id="rep">Қайта көрсету</button></div></div>
      <div><p class="prompt">Қол әріптеп көрсеткен сөзді жинаңыз (${L.length} әріп)</p>
      <div class="slots" id="slots"></div><div class="opts letters" id="pool"></div>
      <div class="ctl-row"><button type="button" class="btn ghost" id="del">Соңғы әріпті өшіру</button><button type="button" class="btn ghost" id="clr">Тазарту</button><button type="button" class="btn primary" id="chk" disabled>Тексеру</button></div>
      <div class="explain card-surface" hidden></div><div class="ctl-row"><button type="button" class="btn primary" id="next" hidden>${ctx.i === total - 1 ? 'Нәтижені көру' : 'Келесі'}</button></div></div></div>`;
    const slots = ctx.body.querySelector('#slots'), pool = ctx.body.querySelector('#pool'), chk = ctx.body.querySelector('#chk');
    const render = () => {
      slots.innerHTML = L.map((_, i) => `<span class="slot${filled[i] ? ' f' : ''}">${filled[i] ? filled[i].c : ''}</span>`).join('');
      pool.innerHTML = tilesL.map((t) => `<button type="button" class="opt" data-k="${t.k}" ${filled.some((f) => f.k === t.k) || answered ? 'disabled' : ''}>${t.c}</button>`).join('');
      chk.disabled = answered || filled.length !== L.length;
    };
    render();
    if (stage) stage.destroy();
    stage = new Stage(ctx.body.querySelector('#sh'), { controls: false, onEnd: () => { if (!answered) timer = setTimeout(() => stage.player.restart(), 1800); } });
    stage.setLetters(L); stage.play();
    ctx.body.querySelector('#rep').onclick = () => stage.player.restart();
    pool.onclick = (e) => { const b = e.target.closest('.opt'); if (!b || answered || filled.length >= L.length) return; const k = +b.dataset.k; filled.push(tilesL.find((t) => t.k === k)); render(); };
    ctx.body.querySelector('#del').onclick = () => { if (!answered) { filled.pop(); render(); } };
    ctx.body.querySelector('#clr').onclick = () => { if (!answered) { filled = []; render(); } };
    chk.onclick = () => {
      answered = true; clearTimeout(timer); const got = filled.map((f) => f.c).join(''); const ok = got === w;
      if (ok) { ctx.score += 10; ctx.correct++; }
      render(); slots.classList.add(ok ? 'right' : 'wrong'); frame(ctx, total);
      const ex = ctx.body.querySelector('.explain'); ex.hidden = false;
      ex.innerHTML = `<p class="${ok ? 'good' : 'bad'}">${ok ? 'Дұрыс!' : 'Қате.'} Дұрыс сөз — «${w}»: ${L.join(' → ')}.${ok ? '' : ` Сіз жинаған: «${got}».`}</p>`;
      ctx.body.querySelector('#next').hidden = false;
    };
    ctx.body.querySelector('#next').onclick = () => { ctx.i++; q(); };
  };
  q(); return () => { clearTimeout(timer); stage && stage.destroy(); };
}
