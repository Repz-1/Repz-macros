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
  ok(/dès réception de mon questionnaire/.test(await m.innerText()) && /30 jours/.test(await m.innerText()), 'texte retractation + regle des 30 jours');
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

  // 3) Paye il y a 40 jours, rien rempli : delai tardif
  p = await ouvrir(v => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ questionnaire: null, commande: { type: 'plan', payeLe: v } })); }, new Date(Date.now() - 40 * 86400000).toISOString());
  ok(/sous 7 jours/.test(await p.locator('.pg-coach').innerText()), 'plus de 30 jours : livraison sous 7 jours');
  await p.context().close();

  // 4) Mise a jour : 2 etapes
  const vieux = new Date(Date.now() - 34 * 86400000).toISOString();
  p = await ouvrir(v => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify({ kcal: 2400, prot: 180, carbs: 250, lip: 70, livreLe: v, repas: [] })); }, vieux);
  await p.locator('.cp-bt', { hasText: 'Mettre à jour' }).tap(); await p.waitForTimeout(300);
  ok(await p.locator('.cp-modale .cp-q').count() === 0 && await p.locator('.cp-modale .cp-consent').count() === 2, 'mise a jour : pas de question eliminatoire');
  await p.context().close();
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
