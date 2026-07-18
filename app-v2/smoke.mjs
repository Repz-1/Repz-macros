import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('../v2/index.html', 'utf8');
const dom = new JSDOM(html, { url: 'https://belfit.be/v2/', pretendToBeVisual: true, runScripts: 'dangerously', resources: undefined });
const w = dom.window;
globalThis.window = w; globalThis.document = w.document; 
globalThis.localStorage = w.localStorage; globalThis.HTMLElement = w.HTMLElement;
globalThis.customElements = w.customElements; globalThis.location = w.location;
globalThis.self = w;
globalThis.MutationObserver = w.MutationObserver;
globalThis.IntersectionObserver = w.IntersectionObserver || class { observe(){} disconnect(){} };
globalThis.matchMedia = w.matchMedia;
globalThis.fetch = async () => ({ ok:false, json: async()=>({}) });
globalThis.indexedDB = undefined; globalThis.requestAnimationFrame = w.requestAnimationFrame;
const errs = [];
w.addEventListener('error', e => errs.push('ERR ' + e.message));
const f = fs.readdirSync('../v2/assets').find(x => x.startsWith('index-') && x.endsWith('.js'));
try {
  await import('../v2/assets/' + f);
  console.log('module charge sans exception');
} catch (e) {
  console.log('EXCEPTION AU CHARGEMENT:', e.message);
  console.log(e.stack.split('\n').slice(0, 6).join('\n'));
}
setTimeout(() => {
  const app = w.document.getElementById('app');
  console.log('contenu #app:', app ? app.innerHTML.length + ' caracteres' : 'ABSENT');
  console.log('erreurs:', errs.length ? errs : 'aucune');
}, 800);
