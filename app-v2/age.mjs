import { chromium } from 'playwright';
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const ctx = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, hasTouch:true, isMobile:true, locale:'fr-FR' });
const p = await ctx.newPage();
p.on('pageerror', e=>console.log('PAGEERROR:', e.message.slice(0,150)));
await p.goto('http://localhost:8099/quiz.html', { waitUntil:'domcontentloaded' });
await p.waitForTimeout(3000);
const suiv = async () => { await p.evaluate(()=>{const b=document.querySelector('.qz-opt'); b&&b.click();}); await p.waitForTimeout(200); await (await p.$('.qz-btn')).tap(); await p.waitForTimeout(550); };
const lire = () => p.evaluate(()=>({
  titre: document.querySelector('.qz-titre')?.textContent,
  val: document.querySelector('.rg-val')?.textContent.replace('Touche le chiffre pour le taper',''),
  ordre: [...document.querySelectorAll('.rg-rep')].map(e=>({t:+e.textContent,y:e.getBoundingClientRect().top}))
    .filter(o=>o.y>0&&o.y<844).sort((a,b)=>a.y-b.y).map(o=>o.t).slice(0,5),
}));
await suiv(); await suiv();
for (const n of ['TAILLE','POIDS','AGE']) {
  console.log(n.padEnd(7), JSON.stringify(await lire()));
  if (n === 'AGE') {
    await p.evaluate(()=>{const el=document.querySelector('.rg-piste'); el.scrollTop -= 200;});
    await p.waitForTimeout(400);
    console.log('        glisse vers le haut ->', (await lire()).val);
    await (await p.$('.rg-val')).tap(); await p.waitForTimeout(300);
    const inp = await p.$('.rg-val--champ input');
    await inp.fill('42'); await p.evaluate(e=>e.blur(), inp); await p.waitForTimeout(500);
    console.log('        saisie 42 ->', await p.evaluate(()=>{
      const a=document.querySelector('.rg-aiguille').getBoundingClientRect(); const c=a.top+a.height/2;
      return [...document.querySelectorAll('.rg-rep')].map(e=>({t:+e.textContent,d:Math.round(Math.abs(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2-c))})).sort((x,y)=>x.d-y.d)[0];
    }));
    await p.screenshot({ path:'/tmp/rg-age.png' });
    break;
  }
  await (await p.$('.qz-btn')).tap(); await p.waitForTimeout(600);
}
await nav.close();
