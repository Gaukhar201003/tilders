import { ALPHABET, videoFor, normalizeText, isVerified } from './data.js?v=type7';
import { Stage } from './stage.js?v=type7';

export function homeView(root) {
  root.innerHTML=`<section class="welcome">
    <div class="welcome-copy"><p class="eyebrow">ТІЛДЕС · ҚАЗАҚ ДАКТИЛЬ ӘЛІПБИІ</p><h1>Машиналық оқыту негізіндегі сурдоаудармашы жүйесі</h1><p class="welcome-lead">«Тілдес» — машиналық оқыту негізіндегі сурдоаудармашы жүйесі. Мұнда «АНА» сөзі А → Н → А ретімен дактильмен көрсетіледі; бұл толық ым тіліндегі сөз аудармасы емес.</p><div class="welcome-actions"><a href="#/alphabet" class="btn primary">Үйренуді бастау <span aria-hidden="true">→</span></a><a href="#/text" class="btn ghost">Мәтінді көрсету</a></div><p class="welcome-footnote"><a href="#/about">Жоба туралы толығырақ ↗</a></p></div>
    <div class="welcome-demo"><div class="welcome-demo-title">Қалыпты: <span>әріп-әріппен</span></div><div id="welcome-hand"></div></div>
  </section><section class="welcome-sections" aria-label="Бөлімдер"><a href="#/practice"><span>01</span><div><b>Практика</b><small>Камерамен бірге қайталау</small></div><i>↗</i></a><a href="#/words"><span>02</span><div><b>Сөздер</b><small>Тақырыптар бойынша үйрену</small></div><i>↗</i></a><a href="#/games"><span>03</span><div><b>Ойындар</b><small>Қимылды танып, сөз құрастыру</small></div><i>↗</i></a></section>`;
  const stage=new Stage(root.querySelector('#welcome-hand'));
  stage.setLetters([...'СӘЛЕМ']);stage.play();
  return()=>stage.destroy();
}

export function alphabetView(root) {
  root.innerHTML = `
    <h2 class="sec-title">Әліпби</h2>
    <p class="sec-sub">Әріпті таңдаңыз — үлгі видео ашылады.</p>
    <div class="alpha-grid" role="list">${ALPHABET.map((c) => `<button type="button" class="alpha-btn" role="listitem" data-c="${c}" aria-label="${c} әрпі">${c}</button>`).join('')}</div>
    <div class="alpha-detail card-surface" hidden>
      <div class="ad-video"><video playsinline muted preload="none"></video></div>
      <div class="ad-info">
        <div class="big-letter" aria-live="polite"></div>
        <p class="muted">Әріптің көрсетілуін бақылап, бірге қайталаңыз.</p>
        <a class="btn primary" id="practice-link" href="#/practice/А">Осы әріпті жаттықтыру</a><div class="ctl-row">
          <button type="button" class="btn ghost" data-a="prev">‹ Алдыңғы</button>
          <button type="button" class="btn primary" data-a="replay">Қайталау</button>
          <button type="button" class="btn ghost" data-a="slow">Баяулату: өшірулі</button>
          <button type="button" class="btn ghost" data-a="next">Келесі ›</button>
        </div>
      </div>
    </div>`;
  const det = root.querySelector('.alpha-detail'), vid = det.querySelector('video'), big = det.querySelector('.big-letter');
  let cur = null, slow = false;
  const open = (c) => {
    cur = c; root.querySelector('#practice-link').href = '#/practice/' + encodeURIComponent(c); const v = videoFor(c); det.hidden = false; big.textContent = c;
    vid.poster = v.poster; vid.src = v.video; vid.playbackRate = slow ? 0.5 : 1; vid.play().catch(() => {});
    root.querySelectorAll('.alpha-btn').forEach((b) => b.classList.toggle('on', b.dataset.c === c));
    if (window.innerWidth < 900) det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.c) return open(b.dataset.c);
    const i = ALPHABET.indexOf(cur);
    if (b.dataset.a === 'replay') { vid.currentTime = 0; vid.play().catch(() => {}); }
    else if (b.dataset.a === 'slow') { slow = !slow; vid.playbackRate = slow ? 0.5 : 1; b.textContent = 'Баяулату: ' + (slow ? 'қосулы' : 'өшірулі'); }
    else if (b.dataset.a === 'prev') open(ALPHABET[(i + 41) % 42]);
    else if (b.dataset.a === 'next') open(ALPHABET[(i + 1) % 42]);
  };
  return () => { vid.pause(); vid.removeAttribute('src'); vid.load(); };
}

function embeddedCamera(root, mode) {
  const practice = mode === 'practice';
  const requested = decodeURIComponent(location.hash.split('/')[2] || 'А');
  const letter = ALPHABET.includes(requested) ? requested : 'А';
  root.innerHTML = `<div class="page-heading"><div><h2 class="sec-title">${practice ? 'Практика' : 'Камерадан мәтінге'}</h2><p class="sec-sub">${practice ? 'Әріпті таңдаңыз. Үлгіге қарап қайталаңыз.' : 'Қимылды көрсетіңіз. Сенімді танылған әріп мәтінге қосылады.'}</p></div><a class="external-camera" target="_blank" rel="noopener" href="${location.origin}/#/${mode}" aria-label="Камера бетін бөлек қойындыда ашу">Бөлек ашу ↗</a></div>`;
  const host = document.createElement('div'); host.className='camera-host'; root.append(host);
  const shadow = host.attachShadow({mode:'open'});
  let disposed = false, cleanup = null;
  shadow.innerHTML = '<p style="color:#C7D9EB">Камера бөлімі жүктелуде…</p>';
  (async () => {
    try {
      const path = practice ? '/practice' : '/camera';
      const response = await fetch(path + '/index.html');
      if (!response.ok) throw new Error('Камера беті табылмады');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const main = doc.querySelector('main');
      const module = practice ? await import('/practice/app.js?v=type7') : await import('/camera/live.js?v=type7');
      if (disposed) return;
      shadow.replaceChildren();
      const link = document.createElement('link'); link.rel='stylesheet';link.href='/practice/style.css?v=type7';shadow.append(link);
      for (const style of doc.querySelectorAll('style')) shadow.append(style.cloneNode(true));
      const layout = document.createElement('div');layout.className='embedded';layout.append(main);shadow.append(layout);
      cleanup = practice ? module.mountPractice(layout,letter) : module.mountCamera(layout);
    } catch (error) {
      if (!disposed) {shadow.replaceChildren();const message=document.createElement('p');message.textContent='Камера бөлімін ашу қатесі: '+error.message;shadow.append(message);}
    }
  })();
  return () => {disposed=true;cleanup?.();host.remove();};
}
export const practiceView = root => embeddedCamera(root, 'practice');
export const cameraView = root => embeddedCamera(root, 'camera');

export function textView(root) {
  root.innerHTML = `
    <h2 class="sec-title">Мәтіннен қимылға</h2>
    <p class="sec-sub">Қазақша мәтін жазыңыз — 3D қол оны әріптеп көрсетеді.</p>
    <div class="text-layout"><div class="text-in card-surface"><p class="input-eyebrow">ҚАЗАҚША МӘТІН</p>
      <label for="txt">Мәтін</label>
      <textarea id="txt" rows="2" maxlength="120" placeholder="Мысалы: СӘЛЕМ" autocomplete="off" spellcheck="false"></textarea>
      <div class="ctl-row"><button type="button" class="btn primary" id="go">Көрсету</button><span class="msg" id="msg" role="status"></span></div>
    </div>
    <div id="stage-host"></div></div>`;
  let stage = new Stage(root.querySelector('#stage-host')); stage.setLetters([...'СӘЛЕМ']);
  const msg = root.querySelector('#msg'), txt = root.querySelector('#txt');
  const run = () => {
    const { letters, bad, latin } = normalizeText(txt.value);
    const m = [];
    if (latin.length) m.push(`Латын әріптері қолдау көрсетілмейді: ${latin.join(' ')}. Кирилл пернетақтасын қолданыңыз.`);
    if (bad.length) m.push(`Өткізілген таңбалар: ${bad.join(' ')}.`);
    if (!letters.filter((c) => c !== ' ').length) { msg.textContent = m.join(' ') || 'Қазақ әріптерімен мәтін жазыңыз.'; return; }
    msg.textContent = m.join(' ');
    if (!stage) stage = new Stage(root.querySelector('#stage-host'));
    stage.setLetters(letters); stage.play();

  };
  root.querySelector('#go').onclick = run;
  txt.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } };
  return () => stage && stage.destroy();
}
