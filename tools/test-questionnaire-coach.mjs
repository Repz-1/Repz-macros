// Test du parcours coach complet (26/09, questionnaire v2 d'apres la
// banque de Raci). Depuis la racine : node tools/test-questionnaire-coach.mjs
// Prerequis : apercu construit avec COMMANDES_OUVERTES = true.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8095;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const RETOUR = `http://localhost:${PORT}/app.html?onglet=premium&coach=questionnaire&type=`;
async function page(prepa, arg) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await p.goto(`http://localhost:${PORT}/app.html`);
  await p.evaluate(prepa || (() => localStorage.clear()), arg);
  return p;
}
const clicEcran = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].find(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.left < 390 && r.width > 0; }).click(), sel);
// Remplit la section affichee : premier choix, compteurs, echelles, textes.
async function remplir(p) {
  const cartes = p.locator('.pg-qc .qc-carte:has(.qc-label)');
  for (let k = 0; k < await cartes.count(); k++) {
    const c = cartes.nth(k);
    if (await c.locator('.qc-fac').count()) continue;
    if (await c.locator('.qc-tuile, .qc-puce').count()) { if (!(await c.locator('.qc-tuile.on, .qc-puce.on').count())) await c.locator('.qc-tuile, .qc-puce').first().tap(); continue; }
    if (await c.locator('.qc-roulette').count()) { if (!(await c.locator('.qc-roulette .on').count())) await c.locator('.qc-roulette button').nth(3).tap(); continue; }
    if (await c.locator('.qc-saisie').count()) {
      const lab = await c.locator('.qc-label').innerText();
      if (!(await c.locator('.qc-saisie input').inputValue())) await c.locator('.qc-saisie input').fill(/Taille/.test(lab) ? '175' : /Âge/.test(lab) ? '30' : '75');
      continue;
    }
    if (await c.locator('.qc-num').count()) { if (!(await c.locator('.qc-num input').inputValue())) await c.locator('.qc-num button').last().tap(); continue; }
    if (await c.locator('.qc-echelle').count()) { if (!(await c.locator('.qc-echelle .on').count())) await c.locator('.qc-echelle button').nth(6).tap(); continue; }
    const champ = c.locator('.qc-champ');
    if (await champ.count() && !(await champ.first().inputValue())) {
      await champ.first().fill((await champ.first().getAttribute('type')) === 'date' ? '2026-12-31' : 'texte');
    }
  }
}
const continuer = async p => { await p.locator('.pg-qc .qc-cta').tap(); await p.waitForTimeout(250); };
const haut = p => p.locator('.qc-haut span').first().innerText();

try {
  // 1) Avant paiement
  let p = await page();
  await p.reload(); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(600);
  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(300);
  const m = p.locator('.cp-modale');
  ok(await m.locator('.cp-q').count() === 2, 'deux questions eliminatoires');
  await m.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Non' }).tap();
  ok(/réservé aux 18 ans/.test(await m.innerText()), 'moins de 18 ans : bloque');
  await m.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Oui' }).tap();
  await m.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Oui' }).tap();
  ok(/professionnel qui te suit/.test(await m.innerText()), 'trouble alimentaire suivi : bloque');
  await m.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Non' }).tap();
  const go = m.locator('.cp-bt--or', { hasText: 'paiement' });
  await m.locator('.cp-consent input').nth(0).check();
  ok(await go.isDisabled(), 'une case ne suffit pas');
  await m.locator('.cp-consent input').nth(1).check();
  ok(!(await go.isDisabled()), 'deux cases : paiement possible');
  await p.context().close();

  // 2) Retour de paiement -> accueil du questionnaire
  p = await page();
  await p.goto(RETOUR + 'plan'); await p.waitForTimeout(1800);
  ok(/Ton programme commence ici/.test(await p.locator('.pg-qc').innerText()), 'retour de paiement : accueil du questionnaire');
  ok(await p.locator('.qc-ligne').count() === 11, '10 sections + bonus listees');
  await p.locator('.qc-cta', { hasText: 'Commencer' }).tap(); await p.waitForTimeout(300);
  ok(/Section 1 sur 10/.test(await haut(p)), 'section 1 sur 10');
  ok((await p.locator('.qc-carte:has-text("E-mail") .qc-champ').inputValue()).includes('@'), 'e-mail prerempli depuis le compte');
  await continuer(p);
  ok(await p.locator('.qc-carte--err').count() > 0 && /Section 1/.test(await haut(p)), 'bloque tant que manque une reponse');
  ok(await p.locator('.qc-carte:has-text("Sexe") .qc-tuile').count() === 2, 'sexe : homme ou femme seulement');
  ok(await p.locator('.qc-carte:has-text("tutoie")').count() === 0, 'plus de question tutoiement');
  await p.locator('.qc-carte:has-text("Sexe") .qc-tuile', { hasText: 'Homme' }).tap();
  await p.locator('.qc-carte:has-text("connus") .qc-puce', { hasText: 'Autre' }).tap();
  ok(await p.locator('.qc-carte:has-text("connus") .qc-champ').count() === 1, '« Autre » ouvre un champ');
  await p.locator('.qc-carte:has-text("connus") .qc-champ').fill('Salle de sport');
  await remplir(p); await continuer(p);
  ok(/Section 2 sur 10/.test(await haut(p)), 'section 1 validee');
  // Objectif : energie -> question « point le plus urgent »
  await p.locator('.qc-tuile', { hasText: 'Énergie et santé' }).tap();
  ok(await p.locator('.qc-carte:has-text("plus urgent")').count() === 1, 'energie et sante : point le plus urgent');
  await p.locator('.qc-tuile', { hasText: 'Perdre du gras' }).tap();
  ok(await p.locator('.qc-carte:has-text("plus urgent")').count() === 0, 'perdre du gras : question masquee');
  ok(await p.locator('.qc-carte:has-text("Pourquoi maintenant")').count() === 0, 'plus de « pourquoi maintenant »');
  ok(await p.locator('.qc-label', { hasText: /^Poids que tu vises/ }).count() === 1 && !(/sens pour toi/.test(await p.locator('.pg-qc').innerText())), 'poids vise sans parenthese');
  await p.locator('.qc-carte:has-text("Motivation") .qc-echelle button').nth(7).tap();
  ok(await p.locator('.qc-carte:has-text("Motivation") .qc-echelle .on').innerText() === '8', 'echelle 1 a 10');
  await remplir(p); await continuer(p);
  // Mesures : compteur
  const poids = p.locator('.qc-carte:has-text("Poids actuel")');
  ok(await poids.locator('.qc-saisie input').count() === 1 && await poids.locator('.qc-num').count() === 0, 'poids : saisie directe, sans + / -');
  await poids.locator('.qc-saisie input').fill('75.5');
  ok(!(/plus bas|plus haut|sentais bien/.test(await p.locator('.pg-qc').innerText())), 'poids passes retires');
  await remplir(p); await continuer(p);
  // Rythme : roulette, info batch, materiel
  const rv = p.locator('.qc-carte:has-text("hors collations")');
  ok(await rv.locator('.qc-roulette button').count() === 10, 'repas voulus : roulette 1 a 10');
  await rv.locator('.qc-roulette button', { hasText: /^6$/ }).tap(); await p.waitForTimeout(500);
  ok(await rv.locator('.qc-roulette .on').innerText() === '6', 'roulette : appui = choix');
  await p.locator('.qc-carte:has-text("batch") .qc-info').tap();
  ok(/cuisiner en une fois plusieurs repas/.test(await p.locator('.qc-info-txt').innerText()), 'batch : explication au clic');
  const mat = p.locator('.qc-carte:has-text("Matériel dispo")');
  await mat.locator('.qc-puce', { hasText: 'Four' }).tap();
  await mat.locator('.qc-puce', { hasText: 'Cuisine complète' }).tap();
  ok(await mat.locator('.qc-puce.on').count() === 1, 'cuisine complete : choix exclusif');
  await remplir(p); await continuer(p);
  // Entrainement : 0 seance masque les details
  const se = p.locator('.qc-carte:has-text("Séances par semaine")');
  ok(await se.locator('.qc-roulette button').count() === 15, 'seances : roulette 0 a 14');
  await se.locator('.qc-roulette button', { hasText: /^0$/ }).tap(); await p.waitForTimeout(500);
  ok(await p.locator('.qc-carte:has-text("Durée typique")').count() === 0, '0 seance : details masques');
  await se.locator('.qc-roulette button', { hasText: /^4$/ }).tap(); await p.waitForTimeout(500);
  ok(await p.locator('.qc-carte:has-text("Durée typique")').count() === 1, '4 seances : details affiches');
  ok(!(/changer les jours|Blessure/.test(await p.locator('.pg-qc').innerText())), 'jours d\'entrainement et blessure retires');
  await remplir(p); await continuer(p);
  // Alimentation : allergie -> lesquelles + reaction grave
  await p.locator('.qc-tuile', { hasText: 'Oui' }).tap();
  ok(await p.locator('.qc-carte:has-text("Lesquelles")').count() === 1, 'allergie oui : lesquelles');
  await p.locator('.qc-carte:has-text("Lesquelles") .qc-puce', { hasText: 'Fruits à coque' }).tap();
  await p.locator('.qc-carte:has-text("que se passe") .qc-puce', { hasText: 'Gonflement' }).tap();
  ok(await p.locator('.qc-alerte-rouge').count() === 1, 'reaction grave : alerte rouge');
  await remplir(p); await continuer(p);
  // Boissons : sodas sucres -> combien ; alcool 0
  await p.locator('.qc-carte:has-text("des sodas") .qc-puce', { hasText: 'Oui' }).tap();
  await p.locator('.qc-carte:has-text("light ou") .qc-puce', { hasText: 'Sucrés' }).tap();
  ok(await p.locator('.qc-carte:has-text("Combien de sodas")').count() === 1, 'sodas sucres : combien');
  await p.locator('.qc-carte:has-text("Alcool par semaine") .qc-puce', { hasText: /^0$/ }).tap();
  await remplir(p); await continuer(p);
  ok(await p.locator('.qc-carte:has-text("difficultés") .qc-puce', { hasText: /^Alcool$/ }).count() === 0, 'pas d\'alcool : pas repropose dans les difficultes');
  ok(!(/Tu es plutôt|Pesée/.test(await p.locator('.pg-qc').innerText())), 'style et pesee retires');
  // Difficultes : regime non -> pourquoi
  await p.locator('.qc-carte:has-text("essayé un régime") .qc-puce', { hasText: 'Oui' }).tap();
  await p.locator('.qc-carte:has-text("fonctionné ?") .qc-puce', { hasText: /^Oui/ }).first().tap();
  const reg = await p.locator('.qc-carte:has-text("Quel(s) régime")').innerText();
  ok(/Coach/.test(reg) && !/GLP-1|Coach déjà/.test(reg), 'regimes : « Coach », sans GLP-1');
  await p.locator('.qc-carte:has-text("fonctionné ?") .qc-puce', { hasText: /^Non/ }).first().tap();
  ok(await p.locator('.qc-carte:has-text("Pourquoi ça n")').count() === 1, 'regime rate : pourquoi');
  await remplir(p); await continuer(p);
  // Sante : homme -> pas de grossesse ; suivi -> traitements
  ok(await p.locator('.qc-puce', { hasText: 'Grossesse' }).count() === 0, 'homme : pas de grossesse proposee');
  await p.locator('.qc-carte:has-text("médecin") .qc-puce', { hasText: 'Thyroïde' }).tap();
  ok(await p.locator('.qc-carte:has-text("Traitements prescrits")').count() === 1, 'suivi medical : traitements demandes');
  await p.locator('.qc-carte:has-text("Traitements prescrits") .qc-champ').fill('Levothyrox 50');
  await p.locator('.qc-carte:has-text("Trouble alimentaire") .qc-puce', { hasText: 'Antérieur' }).tap();
  ok(await p.locator('.qc-carte:has-text("Lequel")').count() === 1, 'trouble alimentaire : lequel ?');
  await remplir(p); await continuer(p);
  await remplir(p); await continuer(p);  // sommeil
  ok(/Bonus/.test(await haut(p)), 'bonus facultatif');
  await p.locator('.qc-passer').tap(); await p.waitForTimeout(300);
  ok(/Tout est bon/.test(await p.locator('.pg-qc').innerText()), 'recapitulatif');
  const rec = await p.locator('.pg-qc').innerText();
  ok(/Salle de sport/.test(rec) && /Levothyrox/.test(rec) && /75.5 kg/.test(rec), 'recap reprend les reponses');
  ok(await p.locator('.qc-alerte').count() === 1, 'alerte sante au recap');
  await p.locator('.qc-cta', { hasText: 'Envoyer' }).tap(); await p.waitForTimeout(300);
  ok(/Tout est bon/.test(await p.locator('.pg-qc').innerText()) && /obligatoires/.test(await p.locator('.pg-qc').innerText()), 'consentements K obligatoires');
  // Brouillon : quitter et revenir
  await p.reload(); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(500);
  ok(/Paiement reçu/.test(await p.locator('.pg-coach').innerText()), 'paye sans envoi : carte « Paiement recu »');
  await p.locator('.cp-bt', { hasText: 'Remplir mon questionnaire' }).tap(); await p.waitForTimeout(400);
  ok(await p.locator('.qc-ok').count() >= 9, 'accueil : sections faites cochees');
  await p.locator('.qc-cta', { hasText: 'récapitulatif' }).tap(); await p.waitForTimeout(300);
  await p.locator('.qc-consent input').nth(0).check(); await p.locator('.qc-consent input').nth(1).check();
  await p.locator('.qc-cta', { hasText: 'Envoyer' }).tap(); await p.waitForTimeout(500);
  ok(/Plan en préparation/.test(await p.locator('.pg-coach').innerText()), 'envoye : « Plan en preparation »');
  const env = await p.evaluate(() => JSON.parse(localStorage.getItem('belfit_qc_dernier') || 'null'));
  ok(env && env.alerteSante && env.allergieGrave && env.consentements.k1 && env.reponses.source.texte === 'Salle de sport', 'envoi : reponses, alertes et consentements');
  await p.context().close();

  // 3) Bandeau + 7 jours
  p = await page(v => { localStorage.clear(); localStorage.setItem('belfit_qc_paye', JSON.stringify({ type: 'plan', le: v })); }, new Date(Date.now() - 2 * 86400000).toISOString());
  await p.reload(); await p.waitForTimeout(1800);
  ok(/5 jours restants/.test(await p.locator('.bandeau-coach:visible').first().innerText()), 'bandeau : 5 jours restants');
  await clicEcran(p, '.bandeau-coach'); await p.waitForTimeout(700);
  ok(await p.locator('.pg-qc').count() === 1, 'bandeau : ouvre le questionnaire');
  await p.evaluate(v => localStorage.setItem('belfit_qc_paye', JSON.stringify({ type: 'plan', le: v })), new Date(Date.now() - 10 * 86400000).toISOString());
  await p.reload(); await p.waitForTimeout(1800);
  ok(/rejoint la file/.test(await p.locator('.bandeau-coach:visible').first().innerText()), 'apres 7 jours : file');
  await p.context().close();

  // 4) Autre appareil : brouillon Firestore arrive apres l'ouverture
  p = await page(() => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ commande: null, questionnaire: null,
    brouillon: { type: 'plan', i: 3, consent: {}, majLe: new Date().toISOString(), rep: { prenom: { valeur: 'Repris' } } } })); });
  await p.goto(RETOUR + 'plan'); await p.waitForTimeout(2000);
  ok(/Reprendre · Ton rythme/.test(await p.locator('.qc-cta').innerText()), 'autre appareil : reprise a la section 4');
  await p.context().close();

  // 5) Mise a jour
  p = await page();
  await p.goto(RETOUR + 'maj'); await p.waitForTimeout(1800);
  ok(await p.locator('.qc-ligne').count() === 2, 'mise a jour : 2 sections');
  await p.context().close();
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
