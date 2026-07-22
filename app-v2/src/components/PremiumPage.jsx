import { signal, effect } from '@preact/signals';
import { utilisateur } from '../services/firebase.js';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { t } from '../i18n/index.js';
import { ongletActif } from './BottomNav.jsx';

// Statut Premium lu depuis Firestore (ecrit par le webhook LemonSqueezy)
export const estPremium = signal(false);

// Permet de simuler l'etat Premium pour inspecter l'interface dans un
// navigateur de test. Sans cela, seule la version gratuite est visible
// et tout le contenu Premium se code a l'aveugle.
// N'a aucun effet en production : le drapeau n'est jamais pose par l'app,
// et le serveur reste seul juge des acces reels.
let apercuPremium = false;
try {
  apercuPremium = localStorage.getItem('belfit_v2_apercu_premium') === '1';
  if (apercuPremium) estPremium.value = true;
} catch (e) { /* stockage indisponible */ }

// Cache partage avec la v1 (app.html) : elle ecrit repz_premium apres
// avoir verifie Firestore. Meme origine, donc meme valeur — on demarre
// dessus pour ne pas afficher un utilisateur payant comme gratuit le
// temps de la lecture reseau (ou s'il n'est connecte que cote v1).
const CLE_PREM_V1 = 'repz_premium';
try {
  if (!apercuPremium && localStorage.getItem(CLE_PREM_V1) === '1') estPremium.value = true;
} catch (e) {}

effect(() => {
  if (apercuPremium) return;          // l'apercu garde la main
  const u = utilisateur.value;
  // Sans compte v2 : on garde ce que dit le cache v1, sans le contredire.
  if (!u) return;
  const db = getFirestore(getApps()[0]);
  getDoc(doc(db, 'users', u.uid))
    .then(s => {
      const prem = s.exists() && s.data().premium === true;
      estPremium.value = prem;
      // On tient le cache v1 a jour, exactement comme le fait app.html.
      try {
        if (prem) localStorage.setItem(CLE_PREM_V1, '1');
        else localStorage.removeItem(CLE_PREM_V1);
      } catch (e) {}
    })
    .catch(() => {});   // hors ligne : le cache fait foi
});

import { useState } from 'preact/hooks';
import '../legacy/premium.scoped.css';

// Formules — liens LemonSqueezy repris tels quels du v1 (plans.html)
const FORMULES = {
  mensuel:     { lien: 'https://belfit.lemonsqueezy.com/checkout/buy/390c6785-f085-4452-b43a-6206fbc3c106' },
  trimestriel: { lien: 'https://belfit.lemonsqueezy.com/checkout/buy/62c379de-5b7e-4a8d-868f-87595f4d7733' },
  annuel:      { lien: 'https://belfit.lemonsqueezy.com/checkout/buy/b66fe18e-6b2a-4953-ab29-d5b4ab99e04a' },
};

export function PremiumPage() {
  const u = utilisateur.value;
  const [formule, setFormule] = useState('trimestriel');   // sélection par défaut = v1
  const [payOuvert, setPayOuvert] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentErr, setConsentErr] = useState(false);

  const construireUrl = (lien) => {
    let url = lien + '?checkout[billing_address][country]=BE';
    if (u) {
      url += '&checkout[custom][uid]=' + encodeURIComponent(u.uid);
      if (u.email) url += '&checkout[email]=' + encodeURIComponent(u.email);
    }
    return url;
  };

  const payer = () => setPayOuvert(true);
  const allerAuPaiement = () => {
    if (!consent) { setConsentErr(true); return; }
    window.location.href = construireUrl(FORMULES[formule].lien);
  };

  const dejaPremium = estPremium.value;

  return (
    <div class="pg-premium">
      <div class="hero-card">
        <span class="hero-badge">✦ PREMIUM</span>
        <h1>Ton coach nutrition,<br />dans ta poche.</h1>
        <p>Calories, macros et plan sur mesure — comme un diététicien, sans y penser.</p>
        <div class="hero-social">
          <span class="hs-avatars"><i /><i /><i /></span>
          <span class="hs-txt">Rejoins les membres BELFIT</span>
        </div>
        <div class="hero-foot">
          <div class="hero-price"><span class="hp-from">dès</span> <b>3,99€</b><span class="hp-mo">/mois</span></div>
        </div>
      </div>

      <h2 class="section-title">Ton quotidien avec Premium</h2>

      <div class="daydream">
        <div class="dd-item"><span class="dd-emo"><svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M3 10h18" /></svg></span><div class="dd-txt"><b>Chaque matin</b><span>Ton objectif est déjà calculé.</span></div></div>
        <div class="dd-item"><span class="dd-emo"><svg viewBox="0 0 24 24"><path d="M3 2v7a3 3 0 006 0V2M6 2v20M16 2c-1.5 0-3 1.5-3 5s1.5 5 3 5 3-1.5 3-5-1.5-5-3-5zM16 12v10" /></svg></span><div class="dd-txt"><b>Chaque repas</b><span>BelFit sait quoi te proposer.</span></div></div>
        <div class="dd-item"><span class="dd-emo"><svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" /></svg></span><div class="dd-txt"><b>Chaque entraînement</b><span>Ton programme est prêt.</span></div></div>
        <div class="dd-item"><span class="dd-emo"><svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6" /></svg></span><div class="dd-txt"><b>Chaque semaine</b><span>Ta liste de courses est générée automatiquement.</span></div></div>
      </div>

      <h2 class="section-title">Standard ou Premium ?</h2>

      <div class="plans">
        <div class="plan premium">
          <div class="plan-name">Premium</div>
          <div class="plan-desc">Ton plan nutrition personnalisé + tous les programmes d'entraînement</div>

          {dejaPremium && (
            <div class="deja-prem" style="display:block">
              <div class="dp-title">Membre Premium</div>
              <div class="dp-sub">Tout est débloqué — merci de faire grandir BELFIT</div>
            </div>
          )}

          <div class="compare">
            <div class="stats-strip">
              <div class="ss-box"><div class="ss-n">900+</div><div class="ss-l">Aliments</div></div>
              <div class="ss-box"><div class="ss-n">80+</div><div class="ss-l">Exercices</div></div>
              <div class="ss-box"><div class="ss-n">40</div><div class="ss-l">Recettes</div></div>
            </div>
            <div class="cmp-head">
              <span class="cmp-feat"></span>
              <span class="cmp-h free">STANDARD</span>
              <span class="cmp-h prem">PREMIUM</span>
            </div>
            <div class="cmp-row star"><span class="cmp-feat"><b>Programme alimentaire sur mesure</b></span><span class="cmp-col free"><span class="ck-no">—</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Journal calories & macros</span><span class="cmp-col free"><span class="ck-lite">✓</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Composer ses séances librement</span><span class="cmp-col free"><span class="ck-lite">✓</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Historique poids & stats</span><span class="cmp-col free"><span class="ck-txt">7 jours</span></span><span class="cmp-col prem"><span class="ck-txt prem-txt">Illimité</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Programmes d'entraînement prêts</span><span class="cmp-col free"><span class="ck-no">—</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Test « par où commencer ? »</span><span class="cmp-col free"><span class="ck-no">—</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Calculateur de calories</span><span class="cmp-col free"><span class="ck-lite">✓</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Calculateur de calories avancé</span><span class="cmp-col free"><span class="ck-no">—</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Suggestions « Idées recettes »</span><span class="cmp-col free"><span class="ck-no">—</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Liste de courses automatique</span><span class="cmp-col free"><span class="ck-no">—</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Scan code-barres (ajout auto)</span><span class="cmp-col free"><span class="ck-no">—</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
            <div class="cmp-row"><span class="cmp-feat">Ajout vocal intelligent (IA)</span><span class="cmp-col free"><span class="ck-no">—</span></span><span class="cmp-col prem"><span class="ck">✓</span></span></div>
          </div>

          <h3 id="formules" style="font-size:18px;font-weight:800;letter-spacing:-.01em;margin:26px 0 4px;scroll-margin-top:16px">Choisis ta formule</h3>
          <p style="font-size:13px;color:var(--text-dim);font-weight:500;margin-bottom:16px">Le tarif au mois baisse avec la durée. Sans engagement.</p>

          <div class="price-cards">
            <div class={'pc' + (formule === 'mensuel' ? ' selected' : '')} onClick={() => setFormule('mensuel')}>
              <div class="pc-dur">1<small>mois</small></div>
              <div class="pc-price">7,99 €</div>
              <div class="pc-permo">7,99 € <span>/ mois</span></div>
              <div class="pc-note">Sans engagement</div>
            </div>
            <div class={'pc' + (formule === 'trimestriel' ? ' selected' : '')} onClick={() => setFormule('trimestriel')}>
              <span class="pc-badge">POPULAIRE</span>
              <div class="pc-dur">3<small>mois</small></div>
              <div class="pc-price">19,99 €</div>
              <div class="pc-permo">6,66 € <span>/ mois</span></div>
              <div class="pc-note">Facturé par trimestre</div>
            </div>
            <div class={'pc' + (formule === 'annuel' ? ' selected' : '')} onClick={() => setFormule('annuel')}>
              <span class="pc-badge gold">−50%</span>
              <div class="pc-dur">12<small>mois</small></div>
              <div class="pc-price">47,88 €</div>
              <div class="pc-permo">3,99 € <span>/ mois</span></div>
              <div class="pc-note">Meilleur prix</div>
            </div>
          </div>
          <div class="badge-be-mini">🇧🇪 <span>App belge indépendante</span></div>
          <div class="cafe-line">À partir de 0,92 € par semaine — moins cher qu'un café.</div>

          <div class="reassure">
            <span><svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg><span>Paiement sécurisé</span></span>
            <span><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg><span>Résiliable à tout moment</span></span>
            <span><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg><span>Sans engagement</span></span>
          </div>
          {!dejaPremium && <button class="plan-btn premium" onClick={payer}>Débloquer Premium</button>}
        </div>

        {!dejaPremium && (
          <div class="plan free-plan">
            <div class="plan-name">Standard</div>
            <div class="plan-desc">L'appli complète en autonomie, sans carte bancaire</div>
            <button class="plan-btn free" onClick={() => { ongletActif.value = 'journal'; }}>Continuer en standard</button>
          </div>
        )}
      </div>

      <div class="faq">
        <div class="ask-card">
          <div class="ask-ic">
            <svg viewBox="0 0 24 24"><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="9.5" /></svg>
          </div>
          <h3>Une question avant de te lancer ?</h3>
          <p>Retrouve toutes les réponses dans notre aide, ou écris directement à l'équipe BELFIT.</p>
          <a class="ask-btn" href="https://www.belfit.be/aide.html" target="_blank" rel="noopener">Voir les questions fréquentes</a>
        </div>
      </div>

      {payOuvert && (
        <div class="pay-overlay show" onClick={(e) => { if (e.target.classList.contains('pay-overlay')) setPayOuvert(false); }}>
          <div class="pay-modal">
            <button class="pay-close" onClick={() => setPayOuvert(false)} aria-label="Fermer">✕</button>
            <div class="pay-title">Finaliser ton abonnement</div>
            <div class="pay-sub">Tu vas être redirigé vers le paiement sécurisé.</div>
            <label class={'pay-consent' + (consentErr ? ' err' : '')}>
              <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setConsentErr(false); }} />
              <span>J'accepte les <a href="https://www.belfit.be/confidentialite.html" target="_blank" rel="noopener">conditions d'utilisation</a> et je confirme avoir lu l'<a href="https://www.belfit.be/confidentialite.html#sante" target="_blank" rel="noopener">avertissement santé</a> (BELFIT n'est pas un service médical).</span>
            </label>
            <button class="pay-btn" disabled={!consent} onClick={allerAuPaiement}>Continuer vers le paiement</button>
          </div>
        </div>
      )}
    </div>
  );
}
