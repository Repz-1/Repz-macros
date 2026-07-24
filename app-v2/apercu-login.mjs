import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
const RACINE='../v2';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const srv=createServer((q,r)=>{let c=decodeURIComponent(q.url.split('?')[0]);if(c.startsWith('/v2/'))c=c.slice(3);if(c==='/'||c.endsWith('/'))c+='index.html';let f=join(RACINE,c);if(!existsSync(f))f=join(RACINE,'..',c);if(!existsSync(f)){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':T[extname(f)]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>srv.listen(4175,r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await nav.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-BE'});
await p.goto('http://localhost:4175/v2/',{waitUntil:'networkidle'});
await p.waitForTimeout(1200);
await p.evaluate(()=>{try{localStorage.setItem('belfit_v2_bienvenue_fait','1')}catch(e){}});
await p.reload({waitUntil:'networkidle'});
await p.waitForTimeout(1200);
await p.fill('.login-form input[type="password"]','MonMotDePasse1!');
mkdirSync('apercu',{recursive:true});
await p.screenshot({path:'apercu/login-oeil-ferme.png'});
await p.click('.pw-eye');
await p.waitForTimeout(250);
await p.screenshot({path:'apercu/login-oeil-ouvert.png'});
console.log('type =', await p.getAttribute('.pw-wrap input','type'));
const m = await p.evaluate(() => {
  const w = document.querySelector('.pw-wrap');
  const i = w.querySelector('input');
  const b = w.querySelector('.pw-eye');
  const ri = i.getBoundingClientRect(), rb = b.getBoundingClientRect();
  return {
    oeilDansLeChamp: rb.right <= ri.right + 1 && rb.left >= ri.left,
    centreVertical: Math.round(Math.abs((rb.top + rb.height / 2) - (ri.top + ri.height / 2))),
    margeDroite: Math.round(ri.right - rb.right),
    hauteurChamp: Math.round(ri.height),
  };
});
console.log('mesures', JSON.stringify(m));
await nav.close(); srv.close();
