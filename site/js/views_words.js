import { TOPICS } from './words_data.js?v=type7';
import { Stage } from './stage.js?v=type7';

export function wordsView(root) {
  let topic = 'all', q = '', cur = 'ОТБАСЫ';
  root.innerHTML = `
    <h2 class="sec-title">Сөздер</h2>
    <p class="sec-sub">Сөзді таңдаңыз — 3D қол оны әріп-әріппен көрсетеді.</p>
    <div class="words-layout">
      <div class="words-stage"><div id="stage-host"></div><p class="word-title" id="wt"></p></div>
      <div class="words-side">
        <input type="search" id="q" placeholder="Сөзді іздеу" aria-label="Сөзді іздеу" autocomplete="off">
        <div class="chips" id="chips"></div>
        <div class="word-list" id="list" role="list"></div>
      </div>
    </div>`;
  const stage = new Stage(root.querySelector('#stage-host'));
  const open = (w, play = true) => { cur = w; root.querySelector('#wt').textContent = w; stage.setLetters([...w]); if (play) stage.play(); draw(); };
  const chips = root.querySelector('#chips');
  const chipDefs = [{ id: 'all', name: 'Барлығы' }, ...TOPICS.map((t) => ({ id: t.id, name: t.name }))];
  chips.innerHTML = chipDefs.map((c) => `<button type="button" class="chip" data-t="${c.id}">${c.name}</button>`).join('');
  function draw() {
    chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.t === topic));
    let ws = TOPICS.flatMap((t) => t.words.map((w) => ({ w, t })));
    if (topic !== 'all') ws = ws.filter((x) => x.t.id === topic);
    if (q) ws = ws.filter((x) => x.w.includes(q.toLocaleUpperCase('kk')));
    const list = root.querySelector('#list');
    list.innerHTML = ws.length ? ws.map((x) => `<div class="word-row${x.w === cur ? ' on' : ''}" role="listitem">
      <button type="button" class="word-btn" data-w="${x.w}">${x.w}<small>${x.t.name}</small></button>
</div>`).join('')
      : `<p class="muted">Сөз табылмады.</p>`;
  }
  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) { topic = b.dataset.t; draw(); }
    else if (b.dataset.w) open(b.dataset.w);

  };
  root.querySelector('#q').oninput = (e) => { q = e.target.value.normalize('NFC'); draw(); };
  open(cur, true);
  return () => stage.destroy();
}
