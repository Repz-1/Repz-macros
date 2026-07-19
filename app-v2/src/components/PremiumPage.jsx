import { signal, effect } from '@preact/signals';
import { utilisateur } from '../services/firebase.js';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { t } from '../i18n/index.js';

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

effect(() => {
  if (apercuPremium) return;          // l'apercu garde la main
  const u = utilisateur.value;
  if (!u) { estPremium.value = false; return; }
  const db = getFirestore(getApps()[0]);
  getDoc(doc(db, 'users', u.uid))
    .then(s => { estPremium.value = s.exists() && s.data().premium === true; })
    .catch(() => {});
});

const FORMULES = [
  { id: 'mensuel', nom: 'Mensuel', prix: '7,90 €', sub: 'par mois · sans engagement',
    lien: 'https://belfit.lemonsqueezy.com/checkout/buy/390c6785-f085-4452-b43a-6206fbc3c106' },
  { id: 'trimestriel', nom: 'Trimestriel', prix: '19,90 €', sub: 'tous les 3 mois · 6,63 €/mois', tag: 'Le bon équilibre',
    lien: 'https://belfit.lemonsqueezy.com/checkout/buy/62c379de-5b7e-4a8d-868f-87595f4d7733' },
  { id: 'annuel', nom: 'Annuel', prix: '49,90 €', sub: 'par an · 4,16 €/mois', tag: 'Meilleur prix',
    lien: 'https://belfit.lemonsqueezy.com/checkout/buy/b66fe18e-6b2a-4953-ab29-d5b4ab99e04a' },
];

const AVANTAGES = [
  'Programme alimentaire sur mesure',
  'Suivi coach personnalisé',
  'Scan code-barres (ajout auto)',
  'Ajout vocal intelligent (IA)',
  'Liste de courses automatique',
  'Idées recettes illimitées',
];

export function PremiumPage() {
  const u = utilisateur.value;

  const ouvrir = (lien) => {
    let url = lien + '?checkout[billing_address][country]=BE';
    if (u) {
      url += '&checkout[custom][uid]=' + encodeURIComponent(u.uid);
      if (u.email) url += '&checkout[email]=' + encodeURIComponent(u.email);
    }
    window.location.href = url;
  };

  if (estPremium.value) {
    return (
      <div class="carte prem-actif">
        <div class="prem-badge-grand">✦ PRO</div>
        <h3>{t('tu_es_premium')}</h3>
        <p>{t('premium_merci')}</p>
      </div>
    );
  }

  return (
    <div>
      <div class="carte">
        <h3 style={{ margin: '0 0 6px', fontSize: '21px', fontWeight: 800 }}>Passe en <span style={{color:'#B98A00'}}>Premium</span></h3>
        <p style={{ margin: '0 0 14px', color: '#6a6558', fontSize: '14px', lineHeight: 1.5 }}>
          Ton coaching BelFit complet, avec toutes les fonctionnalités.
        </p>
        <ul class="prem-liste">
          {AVANTAGES.map(a => <li key={a}><span>✓</span>{a}</li>)}
        </ul>
      </div>

      {FORMULES.map(f => (
        <div class="carte prem-formule" key={f.id}>
          {f.tag && <span class="prem-tag">{f.tag}</span>}
          <div class="prem-nom">{f.nom}</div>
          <div class="prem-prix">{f.prix}</div>
          <div class="prem-sub">{f.sub}</div>
          <button class="prem-btn" onClick={() => ouvrir(f.lien)}>{t('choisir_formule')}</button>
        </div>
      ))}
    </div>
  );
}
