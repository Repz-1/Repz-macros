import { signal } from '@preact/signals';
import { useState, useEffect } from 'preact/hooks';
import { t, langue as langueApp, setLangue } from '../i18n/index.js';
import { utilisateur, auth, app } from '../services/firebase.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { Entete } from './Entete.jsx';
import { VERSION_APP } from '../version.js';
import '../styles/reglages.css';

// ============================================================
// REGLAGES — portage v2 de parametres.html.
//
// La roue dentee de l'en-tete sortait de la v2 vers la v1 : c'etait
// la derniere page que l'application devait quitter pour fonctionner.
// Tout est repris : compte, abonnement, resiliation avec ses motifs,
// langue, notifications, parrainage, contact, documents, version,
// deconnexion et suppression.
//
// Les sous-ecrans (compte, resiliation) sont des VUES et non des
// panneaux glissants : la v2 a deja sa pile de navigation, et un
// panneau en position fixe se serait cale sur le rail transforme.
// ============================================================

export const vueReglages = signal(null);   // null | 'compte' | 'resilier'

export function ouvrirReglages() { vueReglages.value = 'menu'; }
export function fermerReglages() { vueReglages.value = null; }

/** Motifs de resiliation. Le bouton de confirmation reste toujours
 *  accessible : resilier ne doit pas etre plus difficile que
 *  souscrire. */
const MOTIFS = [
  { k: 'prix', cle: 'rs_m_prix' },
  { k: 'temps', cle: 'rs_m_temps' },
  { k: 'fonction', cle: 'rs_m_fonction' },
  { k: 'usage', cle: 'rs_m_usage' },
  { k: 'autre', cle: 'rs_m_autre' },
];

const Chevron = () => (
  <svg class="rg-chev" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

function Rangee({ titre, sous, onClick, href, fin, danger }) {
  const dedans = (
    <>
      <span class="rg-txt">
        <span class={'rg-nom' + (danger ? ' rg-nom--danger' : '')}>{titre}</span>
        {sous && <span class="rg-sous">{sous}</span>}
      </span>
      {fin || <Chevron />}
    </>
  );
  if (href) {
    return <a class="rg-rangee" href={href} target="_blank" rel="noopener">{dedans}</a>;
  }
  return <button class="rg-rangee" onClick={onClick}>{dedans}</button>;
}

// ---------- Sous-ecran : compte ----------
function EcranCompte({ retour }) {
  const u = utilisateur.value;
  const [prenom, setPrenom] = useState('');
  const [garde, setGarde] = useState(false);
  const [mdpEnvoye, setMdpEnvoye] = useState(false);
  const [confirmeSuppr, setConfirmeSuppr] = useState(false);

  useEffect(() => {
    try {
      setPrenom(localStorage.getItem('repz_firstName')
        || (JSON.parse(localStorage.getItem('repz_profile') || '{}').prenom) || '');
    } catch (e) { /* stockage indisponible */ }
  }, []);

  const sauver = () => {
    const v = prenom.trim();
    if (!v) return;
    try {
      localStorage.setItem('repz_firstName', v);
      const p = JSON.parse(localStorage.getItem('repz_profile') || '{}');
      p.prenom = v;
      localStorage.setItem('repz_profile', JSON.stringify(p));
    } catch (e) { /* non bloquant */ }
    // Le compte porte aussi le prenom : l'en-tete le lit en premier.
    // Le SDK modulaire n'expose PAS updateProfile sur l'utilisateur :
    // c'est une fonction a part (firebase.js l'importe deja ainsi).
    // La condition etait donc toujours fausse et le prenom n'arrivait
    // jamais jusqu'au compte — il ne vivait que dans le stockage local.
    if (u) {
      import('firebase/auth')
        .then(({ updateProfile }) => updateProfile(u, { displayName: v }))
        .catch(() => {});
    }
    setGarde(true);
    setTimeout(() => setGarde(false), 1200);
  };

  const changerMdp = () => {
    if (!u || !u.email) return;
    import('firebase/auth').then(({ sendPasswordResetEmail }) => {
      sendPasswordResetEmail(auth, u.email).catch(() => {});
      setMdpEnvoye(true);
    });
  };

  return (
    <div class="pg-reglages">
      <Entete retour={retour} />
      <div class="rg-corps">
        <button class="rg-retour" onClick={retour}>← {t('set_title')}</button>
        <h1 class="rg-titre">{t('set_account')}</h1>

        <div class="rg-carte">
          <div class="rg-champ">
            <span class="rg-lbl">{t('acc_email')}</span>
            <span class="rg-val">{(u && u.email) || '—'}</span>
          </div>
          <div class="rg-champ">
            <span class="rg-lbl">{t('acc_firstname')}</span>
            <input type="text" value={prenom} onInput={(e) => setPrenom(e.target.value)} />
          </div>
          <div class="rg-champ">
            <span class="rg-lbl">{t('acc_password')}</span>
            <span class="rg-val">••••••••</span>
          </div>
          <div class="rg-champ">
            <span class="rg-lbl">{t('acc_units')}</span>
            <span class="rg-val">{t('acc_units_v')}</span>
          </div>
        </div>

        <button class="rg-principal" onClick={sauver}>
          {garde ? t('saved') : t('save')}
        </button>

        <div class="rg-carte rg-carte--actions">
          <button class="rg-action" onClick={changerMdp}>{t('acc_change_pwd')}</button>
          <button class="rg-action rg-action--danger" onClick={() => setConfirmeSuppr(true)}>
            {t('acc_delete')}
          </button>
        </div>
        {mdpEnvoye && <p class="rg-note">{t('acc_pwd_sent')}</p>}

        {confirmeSuppr && (
          <div class="rg-modale" onClick={(e) => { if (e.target === e.currentTarget) setConfirmeSuppr(false); }}>
            <div class="rg-modale-boite">
              <h3>{t('del_title')}</h3>
              <p>{t('del_body')}</p>
              <button class="rg-principal rg-principal--danger" onClick={() => {
                const c = auth.currentUser;
                if (!c) return;
                c.delete()
                  .then(() => { window.location.href = '/v2/?logout=1'; })
                  .catch(() => { setConfirmeSuppr(false); });
              }}>{t('del_confirm')}</button>
              <button class="rg-lien" onClick={() => setConfirmeSuppr(false)}>{t('cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Sous-ecran : resiliation ----------
function EcranResilier({ retour }) {
  const [motif, setMotif] = useState(null);
  const [texte, setTexte] = useState('');

  /** Le motif est la donnee la plus utile de tout ce parcours : on
   *  l'enregistre avant de rediriger, et un echec ne bloque jamais
   *  la resiliation. */
  const noter = async (suite) => {
    try {
      const u = utilisateur.value;
      if (u) {
        const { getFirestore, doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(getFirestore(app), 'users', u.uid), {
          resiliation: {
            motif: motif || 'non_precise',
            precision: texte.trim().slice(0, 500),
            suite, date: new Date().toISOString(),
          },
        }, { merge: true });
      }
    } catch (e) { /* ne doit jamais bloquer */ }
  };

  const confirmer = async () => {
    await noter('resilie');
    window.open('https://app.lemonsqueezy.com/my-orders', '_blank', 'noopener');
  };

  return (
    <div class="pg-reglages">
      <Entete retour={retour} />
      <div class="rg-corps">
        <button class="rg-retour" onClick={retour}>← {t('set_title')}</button>
        <h1 class="rg-titre">{t('rs_title')}</h1>
        <p class="rg-intro">{t('rs_intro')}</p>

        <div class="rg-motifs">
          {MOTIFS.map((m) => (
            <button
              key={m.k}
              class={'rg-motif' + (motif === m.k ? ' on' : '')}
              onClick={() => setMotif(m.k)}
            >{t(m.cle)}</button>
          ))}
        </div>

        {motif === 'prix' && (
          <div class="rg-offre">
            <h4>{t('rs_o_prix_t')}</h4>
            <p>{t('rs_o_prix_p')}</p>
            <button class="rg-accepte" onClick={() => { noter('offre_prix'); retour(); }}>
              {t('rs_o_prix_b')}
            </button>
          </div>
        )}
        {motif === 'usage' && (
          <div class="rg-offre">
            <h4>{t('rs_o_usage_t')}</h4>
            <p>{t('rs_o_usage_p')}</p>
            <button class="rg-accepte" onClick={() => { noter('offre_usage'); retour(); }}>
              {t('rs_o_usage_b')}
            </button>
          </div>
        )}
        {(motif === 'fonction' || motif === 'autre') && (
          <textarea
            class="rg-texte" rows="3" value={texte}
            placeholder={t('rs_precise_ph')}
            onInput={(e) => setTexte(e.target.value)}
          />
        )}

        <button class="rg-principal rg-principal--danger" onClick={confirmer}>
          {t('rs_confirm')}
        </button>
        <p class="rg-note">{t('rs_note')}</p>
      </div>
    </div>
  );
}

// ---------- Garde-fou d'affichage ----------
// Quand un rendu Preact echoue, le DOM precedent RESTE en place : on
// croit que l'appui n'a rien declenche, alors que l'ecran a plante.
// Ce garde-fou transforme un ecran muet en message lisible, et
// permet de revenir en arriere au lieu d'etre coince.
function Garde({ enfant, retour }) {
  const [erreur, setErreur] = useState(null);
  if (erreur) {
    return (
      <div class="pg-reglages">
        <Entete retour={retour} />
        <div class="rg-corps">
          <button class="rg-retour" onClick={retour}>← {t('set_title')}</button>
          <p class="rg-note">{erreur}</p>
        </div>
      </div>
    );
  }
  try { return enfant(); }
  catch (e) { setErreur(String((e && e.message) || e)); return null; }
}

// ---------- Menu principal ----------
export function Reglages() {
  const vue = vueReglages.value;
  // Changer d'ecran remonte en haut. Les reglages remplacent toute
  // la page : en passant d'une liste longue a un ecran court, le
  // defilement du document restait ou il etait et l'ecran d'arrivee
  // s'affichait hors champ — on avait l'impression que l'appui
  // n'avait rien fait.
  useEffect(() => {
    try { window.scrollTo(0, 0); } catch (e) {}
    const c = document.querySelector('.pg-reglages');
    if (c && c.parentElement) c.parentElement.scrollTop = 0;
  }, [vue]);
  const u = utilisateur.value;
  const prem = estPremium.value;
  const [lg, setLg] = useState(langueApp.value);
  const [pesee, setPesee] = useState(true);
  const [coach, setCoach] = useState(true);
  const [code, setCode] = useState('');
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    try {
      const n = JSON.parse(localStorage.getItem('belfit_notifs') || '{}');
      setPesee(n.pesee !== false);
      setCoach(n.coach !== false);
    } catch (e) { /* valeurs par defaut */ }
    if (!u) return;
    import('firebase/firestore').then(async ({ getFirestore, doc, getDoc }) => {
      try {
        const s = await getDoc(doc(getFirestore(app), 'users', u.uid));
        const d = s.exists() ? s.data() : null;
        if (d && d.mon_code_parrainage) setCode(d.mon_code_parrainage);
      } catch (e) { /* silencieux */ }
    });
  }, [u]);

  const sauverNotifs = (p, c) => {
    try { localStorage.setItem('belfit_notifs', JSON.stringify({ pesee: p, coach: c })); }
    catch (e) { /* non bloquant */ }
  };

  const auMenu = () => { vueReglages.value = 'menu'; };
  if (vue === 'compte') return <Garde retour={auMenu} enfant={() => <EcranCompte retour={auMenu} />} />;
  if (vue === 'resilier') return <Garde retour={auMenu} enfant={() => <EcranResilier retour={auMenu} />} />;

  return (
    <div class="pg-reglages">
      <Entete retour={fermerReglages} />
      <div class="rg-corps">
        <h1 class="rg-titre">{t('set_title')}</h1>

        <p class="rg-section">{t('set_sec_account')}</p>
        <div class="rg-carte">
          <Rangee titre={t('set_account')} sous={t('set_account_sub')}
                  onClick={() => { vueReglages.value = 'compte'; }} />
          <Rangee titre={t('set_sub')} sous={t('set_sub_sub')}
                  onClick={() => { fermerReglages(); ongletActif.value = 'premium'; }} />
          {prem && (
            <Rangee titre={t('set_cancel')} sous={t('set_cancel_sub')}
                    onClick={() => { vueReglages.value = 'resilier'; }} />
          )}
        </div>

        <p class="rg-section">{t('settings_language')}</p>
        <div class="rg-carte">
          <div class="rg-rangee rg-rangee--inerte">
            <span class="rg-txt">
              <span class="rg-nom">{t('set_lang')}</span>
              <span class="rg-sous">{t('set_lang_sub')}</span>
            </span>
            <span class="rg-seg">
              {['fr', 'en', 'nl'].map((l) => (
                <button key={l} class={lg === l ? 'on' : ''}
                        onClick={() => { setLangue(l); setLg(l); }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </span>
          </div>
        </div>

        <p class="rg-section">{t('set_sec_notif')}</p>
        <div class="rg-carte">
          <div class="rg-rangee rg-rangee--inerte">
            <span class="rg-txt">
              <span class="rg-nom">{t('set_notif_weigh')}</span>
              <span class="rg-sous">{t('set_notif_weigh_sub')}</span>
            </span>
            <label class="rg-bascule">
              <input type="checkbox" checked={pesee}
                     onChange={(e) => { setPesee(e.target.checked); sauverNotifs(e.target.checked, coach); }} />
              <span />
            </label>
          </div>
          <div class="rg-rangee rg-rangee--inerte">
            <span class="rg-txt">
              <span class="rg-nom">{t('set_notif_coach')}</span>
              <span class="rg-sous">{t('set_notif_coach_sub')}</span>
            </span>
            <label class="rg-bascule">
              <input type="checkbox" checked={coach}
                     onChange={(e) => { setCoach(e.target.checked); sauverNotifs(pesee, e.target.checked); }} />
              <span />
            </label>
          </div>
        </div>
        <p class="rg-note">{t('set_notif_note')}</p>

        <p class="rg-section">{t('set_sec_social')}</p>
        <div class="rg-carte">
          <Rangee titre={t('set_invite')} sous={t('set_invite_sub')} onClick={() => {
            const txt = t('invite_text') + (code ? ' ' + code : '');
            if (navigator.share) navigator.share({ text: txt, url: 'https://belfit.be' }).catch(() => {});
            else { navigator.clipboard.writeText(txt + ' https://belfit.be').catch(() => {}); }
          }} />
          {code && (
            <div class="rg-rangee rg-rangee--inerte">
              <span class="rg-txt"><span class="rg-nom">{t('set_ref_code')}</span></span>
              <span class="rg-code">{code}</span>
              <button class="rg-copier" onClick={() => {
                navigator.clipboard.writeText(code).then(() => {
                  setCopie(true); setTimeout(() => setCopie(false), 1200);
                }).catch(() => {});
              }}>{copie ? t('saved') : t('copy')}</button>
            </div>
          )}
        </div>

        <p class="rg-section">{t('set_sec_contact')}</p>
        <div class="rg-carte">
          <Rangee titre={t('set_write')} sous={t('set_write_sub')}
                  href="mailto:contact@belfit.be" />
          <Rangee titre={t('set_suggest')} sous={t('set_suggest_sub')}
                  href="mailto:contact@belfit.be?subject=Suggestion" />
        </div>

        <p class="rg-section">{t('set_sec_docs')}</p>
        <div class="rg-carte">
          <Rangee titre={t('set_privacy')} href="https://www.belfit.be/confidentialite.html" />
        </div>

        <p class="rg-version">{t('set_ver')} {VERSION_APP}</p>

        <button class="rg-deconnexion" onClick={() => {
          try {
            ['repz_firstName', 'repz_profile', 'belfit_v2_journal'].forEach(k => localStorage.removeItem(k));
          } catch (e) { /* non bloquant */ }
          auth.signOut().finally(() => { window.location.href = '/v2/?logout=1'; });
        }}>{t('set_logout')}</button>
      </div>
    </div>
  );
}
