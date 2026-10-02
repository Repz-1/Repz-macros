// Invitation par lien (02/10) : belfit.be/?invitation=CODE.
// Le code est garde de cote (il survit a la creation du compte et au
// retour de Google), puis consomme des que la personne est connectee :
// le serveur ecrit sa commande coaching, le questionnaire s'ouvre.
import { effect } from '@preact/signals';
import { utilisateur, auth } from './firebase.js';
import { ongletActif } from '../components/BottomNav.jsx';
import { chargerProgramme } from '../components/BelfitPlus.jsx';

const CLE = 'belfit_invitation';
const URL_FN = 'https://europe-west1-repz-baf60.cloudfunctions.net/utiliserInvitation';

try {
  const p = new URLSearchParams(location.search);
  const code = (p.get('invitation') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code) {
    localStorage.setItem(CLE, code);
    p.delete('invitation');
    const reste = p.toString();
    history.replaceState(null, '', location.pathname + (reste ? '?' + reste : '') + location.hash);
  }
} catch (e) { /* stockage indisponible */ }

let enCours = false;
effect(() => {
  const u = utilisateur.value;
  if (!u || u.isAnonymous || enCours) return;
  let code = null;
  try { code = localStorage.getItem(CLE); } catch (e) {}
  if (!code) return;
  enCours = true;
  (async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const r = await fetch(URL_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ code }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        try { localStorage.removeItem(CLE); } catch (e) {}
        chargerProgramme();
        ongletActif.value = 'premium';
      } else if (d.motif === 'utilisee' || d.motif === 'inconnue') {
        try { localStorage.removeItem(CLE); } catch (e) {}
        alert(d.motif === 'utilisee'
          ? 'Ce lien d\'invitation a déjà été utilisé par un autre compte. Demande un nouveau lien à ton coach.'
          : 'Ce lien d\'invitation n\'est pas valide. Demande un nouveau lien à ton coach.');
      }
      // Autre erreur (reseau, serveur) : le code reste, nouvel essai au prochain lancement.
    } catch (e) { /* reseau : nouvel essai plus tard */ }
    enCours = false;
  })();
});
