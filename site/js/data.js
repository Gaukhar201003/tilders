// Әліпби мен видео сәйкестігінің жалғыз орталық көзі: /media/manifest.json (+ poses.json, games_data.json).
import { loadPoses } from './pose.js?v=type7';
export const ALPHABET = 'А Ә Б В Г Ғ Д Е Ё Ж З И Й К Қ Л М Н Ң О Ө П Р С Т У Ұ Ү Ф Х Һ Ц Ч Ш Щ Ъ Ы І Ь Э Ю Я'.split(' ');
let MANIFEST = null, GAMES = null, VERIFIED = new Set(), BY = {};
export async function loadAll() {
  const [m, g] = await Promise.all([fetch('/media/manifest.json').then((r) => r.json()), fetch('/data/games_data.json').then((r) => r.json()), loadPoses()]);
  MANIFEST = m; GAMES = g; VERIFIED = new Set(g.verified); BY = Object.fromEntries(m.letters.map((x) => [x.letter, x]));
  for (const ch of ALPHABET) if (!BY[ch]) throw new Error('Манифестте әріп жоқ: ' + ch);
}
export const videoFor = (ch) => BY[ch];
export const isVerified = (ch) => VERIFIED.has(ch);
export const verifiedLetters = () => [...VERIFIED];
export const similarTo = (ch) => GAMES.similar[ch] || [];
export const gamesInfo = () => GAMES;

// Қазақша мәтінді әліпке келтіру: NFC, бас әріп; қолдау көрсетілмейтін таңбалар бөлек қайтарылады.
export function normalizeText(raw) {
  const s = raw.normalize('NFC').toLocaleUpperCase('kk');
  const letters = [], bad = new Set(), latin = new Set(); let lastSpace = true;
  for (const c of s) {
    if (ALPHABET.includes(c)) { letters.push(c); lastSpace = false; }
    else if (/\s/.test(c) || c === '-') { if (!lastSpace) letters.push(' '); lastSpace = true; }
    else if (/[A-Z]/.test(c)) latin.add(c);
    else if (/[.,;:!?"«»()…–—'’0-9]/.test(c)) { /* тыныс белгілері мен сандар өткізіледі */ if (/[0-9]/.test(c)) bad.add(c); }
    else bad.add(c);
  }
  while (letters[letters.length - 1] === ' ') letters.pop();
  return { letters, bad: [...bad], latin: [...latin] };
}
const KEY = 'tildes:v1';
export const store = {
  get(k, d) { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return k in o ? o[k] : d; } catch { return d; } },
  set(k, v) { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); o[k] = v; localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* жеке режим */ } },
};
