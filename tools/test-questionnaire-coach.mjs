// Test du questionnaire coach (26/09). Depuis la racine :
//   node tools/test-questionnaire-coach.mjs
// Prerequis : apercu construit (npx vite build --config apercu.config.js).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8095;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function ouvrir(prepa, arg) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await p.goto(`http://localhost:${PORT}/app.html`);
  if (prepa) await p.evaluate(prepa, arg);
  await p.reload(); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(800);
  return p;
}
// Remplit l'etape affichee : premier choix de chaque question, nombres plausibles.
async function remplir(p) {
  const qs = p.locator('.qc-q');
  for (let k = 0; k < await qs.count(); k++) {
    const q = qs.nth(k);
    const lab = await q.locator('.qc-label').innerText();
    if (/facultatif/.test(lab)) continue;
    if (await q.locator('.qc-chip.on').count()) continue;
    if (await q.locator('.qc-chip').count()) { await q.locator('.qc-chip').first().tap(); continue; }
    const champ = q.locator('.qc-champ');
    if (await champ.count() && !(await champ.inputValue())) {
      const t = await champ.getAttribute('type');
      await champ.fill(t === 'date' ? '2026-12-31' : /Poids|kg/.test(lab) ? '78' : /Taille/.test(lab) ? '178' : /Âge/.test(lab) ? '32' : 'texte');
    }
  }
}
const suivant = p => p.locator('.pg-qc > .cp-bt--or').tap();

try {
  // 1) Avant paiement : questions eliminatoires + deux cases
  let p = await ouvrir(() => localStorage.clear());
  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(300);
  const m = p.locator('.cp-modale');
  ok(await m.locator('.cp-q').count() === 2, 'deux questions eliminatoires');
  ok(await m.locator('.cp-consent').count() === 0, 'pas de paiement avant d\'y repondre');
  await m.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Non' }).tap();
  ok(/réservé aux 18 ans/.test(await m.innerText()) && await m.locator('.cp-consent').count() === 0, 'moins de 18 ans : achat bloque');
  await m.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Oui' }).tap();
  await m.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Oui' }).tap();
  ok(/professionnel qui te suit/.test(await m.innerText()) && await m.locator('.cp-consent').count() === 0, 'trouble alimentaire suivi : achat bloque');
  await m.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Non' }).tap();
  ok(await m.locator('.cp-consent').count() === 2, 'eligible : deux cases');
  const go = m.locator('.cp-bt--or', { hasText: 'paiement' });
  await m.locator('.cp-consent input').nth(0).check();
  ok(await go.isDisabled(), 'une seule case ne suffit pas');
  await m.locator('.cp-consent input').nth(1).check();
  ok(!(await go.isDisabled()), 'deux cases : paiement possible');
  ok(/dès réception de mon questionnaire/.test(await m.innerText()) && /7 jours/.test(await m.innerText()) && /conditions générales/.test(await m.innerText()), 'texte retractation + regle des 7 jours');
  await p.context().close();

  // 2) Retour de paiement : le questionnaire s'ouvre tout seul
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await p.goto(`http://localhost:${PORT}/app.html`); await p.evaluate(() => localStorage.clear());
  await p.goto(`http://localhost:${PORT}/app.html?onglet=premium&coach=questionnaire&type=plan`); await p.waitForTimeout(1800);
  ok(await p.locator('.pg-qc').count() === 1, 'retour de paiement : questionnaire ouvert directement');
  ok(!/coach=/.test(p.url()), 'URL nettoyee');
  ok(/Étape 1 sur 7/.test(await p.locator('.qc-haut').innerText()), '7 etapes');
  await suivant(p); await p.waitForTimeout(200);
  ok(await p.locator('.qc-err').count() > 0, 'bloque sans reponse');
  await p.locator('.qc-q').first().locator('.qc-chip', { hasText: 'Autre' }).tap();
  await p.locator('.qc-q').first().locator('.qc-champ').fill('Préparer un marathon');
  await remplir(p); await suivant(p); await p.waitForTimeout(200);
  // Homme : pas de question grossesse ; Femme : elle apparait
  await p.locator('.qc-q', { hasText: 'Tu es' }).locator('.qc-chip', { hasText: 'Femme' }).tap();
  ok(await p.locator('.qc-q', { hasText: 'Enceinte' }).count() === 1, 'femme : question grossesse');
  await p.locator('.qc-q', { hasText: 'Enceinte' }).locator('.qc-chip', { hasText: 'Oui' }).tap();
  await p.locator('.qc-q', { hasText: 'Tu es' }).locator('.qc-chip', { hasText: 'Homme' }).tap();
  ok(await p.locator('.qc-q', { hasText: 'Enceinte' }).count() === 0, 'homme : pas de question grossesse');
  ok(await p.locator('.qc-alerte').count() === 0, 'grossesse effacee en passant a homme : pas d\'alerte');
  await remplir(p);
  await p.locator('.qc-q', { hasText: 'traitement' }).locator('.qc-chip', { hasText: 'Oui' }).tap();
  await p.locator('.qc-q', { hasText: 'Lequel' }).locator('.qc-champ').fill('Levothyrox');
  ok(await p.locator('.qc-alerte').count() === 1, 'alerte sante');
  await suivant(p); await p.waitForTimeout(200);
  ok(/Étape 2/.test(await p.locator('.qc-haut').innerText()), 'consentement sante obligatoire');
  await p.locator('.cp-consent input').check(); await suivant(p); await p.waitForTimeout(200);
  for (let e = 3; e <= 7; e++) { await remplir(p); await suivant(p); await p.waitForTimeout(250); }
  ok(await p.locator('h1', { hasText: 'Récapitulatif' }).count() === 1, 'recapitulatif');
  // Sortie en route : la page Coach demande de finir
  await p.reload(); await p.waitForTimeout(1800); await p.locator('.bn-item').last().tap(); await p.waitForTimeout(500);
  ok(/Paiement reçu/.test(await p.locator('.pg-coach').innerText()), 'paye sans questionnaire : carte « Paiement recu »');
  await p.locator('.cp-bt', { hasText: 'Remplir mon questionnaire' }).tap(); await p.waitForTimeout(400);
  ok(await p.locator('.pg-qc').count() === 1, 'brouillon repris');
  for (let k = 0; k < 8 && !(await p.locator('h1', { hasText: 'Récapitulatif' }).count()); k++) { await remplir(p); if (await p.locator('.cp-consent input').count()) await p.locator('.cp-consent input').check(); await suivant(p); await p.waitForTimeout(200); }
  await p.locator('.pg-qc > .cp-bt--or', { hasText: 'Envoyer' }).tap(); await p.waitForTimeout(500);
  ok(/Plan en préparation/.test(await p.locator('.pg-coach').innerText()), 'envoye : « Plan en preparation »');
  const envoye = await p.evaluate(() => JSON.parse(localStorage.getItem('belfit_qc_dernier') || 'null'));
  ok(envoye && envoye.alerteSante === true && envoye.reponses.objectif.texte === 'Préparer un marathon', 'reponses enregistrees');
  await ctx.close();

  // 3) Paye il y a 10 jours, rien rempli : delai tardif
  p = await ouvrir(v => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ questionnaire: null, commande: { type: 'plan', payeLe: v } })); }, new Date(Date.now() - 10 * 86400000).toISOString());
  ok(/rejoint la file\./.test(await p.locator('.pg-coach').innerText()) && !/2 semaines/.test(await p.locator('.pg-coach').innerText()), 'plus de 7 jours : file, sans delai affiche');
  await p.context().close();

  // 3b) Bandeau en haut de chaque page
  {
    const c2 = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
    const b = await c2.newPage(); b.setDefaultTimeout(8000);
    b.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
    await b.goto(`http://localhost:${PORT}/app.html`);
    await b.evaluate(v => { localStorage.clear(); localStorage.setItem('belfit_qc_paye', JSON.stringify({ type: 'plan', le: v })); }, new Date(Date.now() - 2 * 86400000).toISOString());
    await b.reload(); await b.waitForTimeout(1800);
    const actif = () => b.locator('.bn-item--actif').innerText();
    ok(/Aujourd/.test(await actif()), 'depart sur le Journal');
    const band = b.locator('.bandeau-coach:visible');
    ok(/5 jours restants/.test(await band.first().innerText()), 'bandeau sur le Journal : 5 jours restants');
    await b.locator('.bn-item').nth(2).tap(); await b.waitForTimeout(600);
    ok(await b.locator('.bandeau-coach:visible').count() >= 1, 'bandeau aussi sur Stats');
    // Le rail garde les 4 onglets montes : on vise le bandeau a l'ecran.
    await b.evaluate(() => [...document.querySelectorAll('.bandeau-coach')].find(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.left < 390 && r.width > 0; }).click());
    await b.waitForTimeout(800);
    ok(await b.locator('.pg-qc').count() === 1 && /Coach/.test(await actif()), 'appui : questionnaire ouvert dans l\'onglet Coach');
    ok(await b.locator('.pg-qc .bandeau-coach').count() === 0, 'pas de bandeau dans le questionnaire');
    await b.evaluate(v => localStorage.setItem('belfit_qc_paye', JSON.stringify({ type: 'plan', le: v })), new Date(Date.now() - 10 * 86400000).toISOString());
    await b.reload(); await b.waitForTimeout(1800);
    ok(/rejoint la file/.test(await b.locator('.bandeau-coach:visible').first().innerText()), 'apres 7 jours : bandeau « file »');
    await b.evaluate(() => localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ commande: null, questionnaire: { envoyeLe: new Date().toISOString() } })));
    await b.reload(); await b.waitForTimeout(1800);
    ok(await b.locator('.bandeau-coach').count() === 0, 'questionnaire envoye : plus de bandeau');
    await c2.close();
  }

  // 3c) Reprise sur un autre appareil : le brouillon Firestore, plus
  //     recent, l'emporte sur l'absence de brouillon local.
  {
    const c3 = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
    const b = await c3.newPage(); b.setDefaultTimeout(8000);
    b.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
    await b.goto(`http://localhost:${PORT}/app.html`);
    await b.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('belfit_qc_paye', JSON.stringify({ type: 'plan', le: new Date().toISOString() }));
      localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ commande: null, questionnaire: null,
        brouillon: { type: 'plan', i: 3, consentSante: true, majLe: new Date().toISOString(),
          rep: { objectif: { valeur: 'Autre', autre: 'Repris ailleurs' }, poidsVise: { valeur: '75' } } } }));
    });
    await b.reload(); await b.waitForTimeout(1800);
    await b.evaluate(() => [...document.querySelectorAll('.bandeau-coach')].find(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.left < 390 && r.width > 0; }).click());
    await b.waitForTimeout(800);
    ok(/Étape 4 sur 7/.test(await b.locator('.qc-haut').innerText()), 'autre appareil : reprise a l\'etape 4');
    await b.locator('.qc-chip').first().tap(); await b.waitForTimeout(300);
    ok(await b.locator('.qc-sauve').count() === 1, 'indicateur de sauvegarde affiche');
    await b.waitForTimeout(6500);
    ok(/✓ Enregistré|Gardé sur ce téléphone/.test(await b.locator('.qc-sauve').innerText()), 'sauvegarde conclue : ' + await b.locator('.qc-sauve').innerText());
    await c3.close();
  }

  // 3d) Retour de paiement sur un 2e appareil : le questionnaire s'ouvre
  //     avant le chargement du dossier ; le brouillon distant, arrive
  //     juste apres, doit etre repris.
  {
    const c4 = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
    const b = await c4.newPage(); b.setDefaultTimeout(8000);
    b.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
    await b.goto(`http://localhost:${PORT}/app.html`);
    await b.evaluate(() => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ commande: null, questionnaire: null,
      brouillon: { type: 'plan', i: 2, consentSante: true, majLe: new Date().toISOString(), rep: { poidsVise: { valeur: '70' } } } })); });
    await b.goto(`http://localhost:${PORT}/app.html?onglet=premium&coach=questionnaire&type=plan`); await b.waitForTimeout(2000);
    ok(/Étape 3 sur 7/.test(await b.locator('.qc-haut').innerText()), 'brouillon distant arrive apres l\'ouverture : repris (etape 3)');
    await c4.close();
  }

  // 4) Mise a jour : 2 etapes
  const vieux = new Date(Date.now() - 34 * 86400000).toISOString();
  p = await ouvrir(v => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify({ kcal: 2400, prot: 180, carbs: 250, lip: 70, livreLe: v, repas: [] })); }, vieux);
  await p.locator('.cp-bt', { hasText: 'Mettre à jour' }).tap(); await p.waitForTimeout(300);
  ok(await p.locator('.cp-modale .cp-q').count() === 0 && await p.locator('.cp-modale .cp-consent').count() === 2, 'mise a jour : pas de question eliminatoire');
  await p.context().close();
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
