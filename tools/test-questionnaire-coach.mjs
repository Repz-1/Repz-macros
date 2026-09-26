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
  let p = await ouvrir(() => localStorage.clear());
  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(400);
  ok(await p.locator('.pg-qc').count() === 1, 'questionnaire ouvert depuis « Demander mon plan »');
  ok(/Étape 1 sur 7/.test(await p.locator('.qc-haut').innerText()), '7 etapes');
  await suivant(p); await p.waitForTimeout(200);
  ok(await p.locator('.qc-err').count() > 0 && /Étape 1/.test(await p.locator('.qc-haut').innerText()), 'bloque sans reponse');
  // Autre + precision obligatoire
  await p.locator('.qc-q').first().locator('.qc-chip', { hasText: 'Autre' }).tap();
  ok(await p.locator('.qc-q').first().locator('.qc-champ').count() === 1, '« Autre » ouvre un champ a preciser');
  await p.locator('.qc-q').first().locator('.qc-champ').fill('Préparer un marathon');
  await remplir(p); await suivant(p); await p.waitForTimeout(200);
  ok(/Étape 2/.test(await p.locator('.qc-haut').innerText()), 'etape 1 validee');
  // Sante : traitement Oui -> champ « Lequel ? » + alerte ; consentement requis
  await remplir(p);
  await p.locator('.qc-q', { hasText: 'traitement' }).locator('.qc-chip', { hasText: 'Oui' }).tap();
  ok(await p.locator('.qc-q', { hasText: 'Lequel' }).count() === 1, 'traitement « Oui » demande lequel');
  await p.locator('.qc-q', { hasText: 'Lequel' }).locator('.qc-champ').fill('Levothyrox');
  ok(await p.locator('.qc-alerte').count() === 1, 'alerte sante affichee');
  await suivant(p); await p.waitForTimeout(200);
  ok(/Étape 2/.test(await p.locator('.qc-haut').innerText()), 'consentement sante obligatoire');
  await p.locator('.cp-consent input').check(); await suivant(p); await p.waitForTimeout(200);
  // Aucun exclusif (etape alimentation plus loin) : on avance
  for (let e = 3; e <= 7; e++) {
    ok(/Étape \d/.test(await p.locator('.qc-haut').innerText()), 'etape ' + e);
    if (e === 6) {
      const q = p.locator('.qc-q', { hasText: 'refuses' });
      await q.locator('.qc-chip', { hasText: 'Poisson' }).tap();
      await q.locator('.qc-chip', { hasText: 'Aucun' }).tap();
      ok(await q.locator('.qc-chip.on').count() === 1, '« Aucun » est exclusif');
    }
    await remplir(p); await suivant(p); await p.waitForTimeout(250);
  }
  ok(await p.locator('h1', { hasText: 'Récapitulatif' }).count() === 1, 'recapitulatif');
  const rec = await p.locator('.pg-qc').innerText();
  ok(/Préparer un marathon/.test(rec) && /Levothyrox/.test(rec), 'recap reprend « Autre » et le traitement');
  // Brouillon garde apres rechargement
  await p.reload(); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(500);
  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(400);
  ok(await p.locator('h1', { hasText: 'Récapitulatif' }).count() === 1, 'brouillon garde apres rechargement');
  await p.locator('.qc-modif').first().tap(); await p.waitForTimeout(200);
  ok(/Étape 1/.test(await p.locator('.qc-haut').innerText()), '« Modifier » ramene a l\'etape');
  for (let e = 1; e <= 7; e++) { if (e === 2) await p.locator('.cp-consent input').check().catch(() => {}); await suivant(p); await p.waitForTimeout(200); }
  await p.locator('.pg-qc > .cp-bt--or', { hasText: '80 €' }).tap(); await p.waitForTimeout(500);
  ok(await p.locator('.cp-modale').count() === 1, 'paiement ouvert apres le recapitulatif');
  const envoye = await p.evaluate(() => JSON.parse(localStorage.getItem('belfit_qc_dernier') || 'null'));
  ok(envoye && envoye.type === 'plan' && envoye.alerteSante === true && envoye.reponses.objectif.texte === 'Préparer un marathon', 'reponses enregistrees avec alerte sante');
  await p.context().close();

  // Paye, plan pas encore livre
  p = await ouvrir(() => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ questionnaire: null, commande: { type: 'plan', payeLe: new Date().toISOString() } })); });
  ok(/Plan en préparation/.test(await p.locator('.pg-coach').innerText()) && !(/80 €/.test(await p.locator('.pg-coach').innerText())), 'paye : « Plan en preparation »');
  await p.context().close();

  // Mise a jour : 2 etapes
  const vieux = new Date(Date.now() - 34 * 86400000).toISOString();
  p = await ouvrir(v => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify({ kcal: 2400, prot: 180, carbs: 250, lip: 70, livreLe: v, repas: [] })); }, vieux);
  await p.locator('.cp-bt', { hasText: 'Mettre à jour' }).tap(); await p.waitForTimeout(400);
  ok(/Étape 1 sur 2/.test(await p.locator('.qc-haut').innerText()), 'mise a jour : 2 etapes');
  await remplir(p); await suivant(p); await p.waitForTimeout(200); await remplir(p); await suivant(p); await p.waitForTimeout(200);
  await p.locator('.pg-qc > .cp-bt--or', { hasText: '60 €' }).tap(); await p.waitForTimeout(400);
  ok(/Mise à jour · 60 €/.test(await p.locator('.cp-modale').innerText()), 'paiement 60 €');
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
