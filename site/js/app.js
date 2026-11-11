import { loadAll } from './data.js?v=type7';
import { homeView, alphabetView, practiceView, cameraView, textView } from './views_basic.js?v=type7';
import { wordsView } from './views_words.js?v=type7';
import { aboutView } from './views_about.js?v=type7';
import { gamesView } from './games.js?v=type7';

const ROUTES = { '': ['Тілдес', homeView], alphabet: ['Әліпби', alphabetView], practice: ['Практика', practiceView], camera: ['Камерадан мәтінге', cameraView],
  about: ['Жоба туралы', aboutView], text: ['Мәтіннен қимылға', textView], words: ['Сөздер', wordsView], games: ['Ойындар', gamesView] };
const iconPaths={alphabet:'M4 20 12 4l8 16M7 14h10',practice:'M3 9 12 4l9 5-9 5-9-5Zm4 3v6c3 3 7 3 10 0v-6',camera:'M4 7h4l2-3h4l2 3h4v13H4ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',text:'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4',words:'M12 5C7 2 3 4 3 4v15s4-2 9 1c5-3 9-1 9-1V4s-4-2-9 1Zm0 0v15',games:'M7 8h10c3 0 5 8 4 10s-4 0-5-2H8c-1 2-4 4-5 2s1-10 4-10Zm0 3v5m-2-2h4m6-2h.1m3 3h.1'};
for(const a of document.querySelectorAll('#nav a')){const label=a.textContent;a.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[a.dataset.r] || 'M4 4h16v16H4ZM12 8v1m0 3v5'}"/></svg><span>${label}</span>`;}
const view = document.getElementById('view'); let cleanup = null, ready = false;

function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl')); } catch { return false; } }
async function show() {
  const r = (location.hash.replace(/^#\/?/, '') || '').split('/')[0]; const [title, fn] = ROUTES[r] || ROUTES[''];
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));
  document.title = (r ? title + ' — ' : '') + 'Тілдес';
  if (!ready) return;
  view.onclick=null; view.onkeydown=null; view.className=r?`route-${r}`:'route-home'; view.innerHTML = '';
  const needs3d = ['games'].includes(r);
  if (needs3d && !webglOk()) { view.innerHTML = '<div class="status-card card-surface"><span class="pill warn">WebGL қолжетімсіз</span><p>3D қолды көрсету үшін браузерде WebGL қосылған болуы керек. Басқа браузерді немесе құрылғыны байқап көріңіз.</p></div>'; return; }
  try { cleanup = fn(view) || null; } catch (e) { console.error(e); view.innerHTML = '<div class="status-card card-surface"><span class="pill warn">Қате</span><p>Бөлімді ашу мүмкін болмады. Бетті жаңартып көріңіз.</p></div>'; }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', show);
loadAll().then(() => { ready = true; show(); }).catch((e) => {
  console.error(e); view.innerHTML = '<div class="status-card card-surface"><span class="pill warn">Деректер жүктелмеді</span><p>Қосымша файлдарын жүктеу мүмкін болмады. Интернет байланысын тексеріп, бетті жаңартыңыз.</p></div>';
});
