import { useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { createPortal } from 'preact/compat';
import { utilisateur } from '../services/firebase.js';
import { programmeCharge, chargerProgramme } from './BelfitPlus.jsx';

// ============================================================
// « J'AI UN CODE » (28/09, maquette validee) : debloque l'acces PRO
// avec un code cree par Raci dans son espace coach. Le code part vers
// utiliserCode (serveur), qui verifie et ecrit l'acces ; ici on ne sait
// rien des codes existants.
// ============================================================

export const codeOuvert = signal(false);

const MESSAGES = {
  inconnu: "Ce code n'existe pas.",
  deja_utilise: 'Ce code a déjà servi.',
  epuise: "Ce code n'a plus d'utilisation disponible.",
  expire: 'Ce code a expiré.',
  erreur: 'Impossible de vérifier le code. Réessaie.',
};

export function CodeAcces() {
  const [code, setCode] = useState('');
  const [etat, setEtat] = useState(null);      // null | 'envoi' | 'ok' | raison
  const [jusqu, setJusqu] = useState(null);
  if (!codeOuvert.value) return null;

  const fermer = () => { codeOuvert.value = false; setCode(''); setEtat(null); };
  const envoyer = async () => {
    const u = utilisateur.value;
    if (!u || !code.trim()) return;
    setEtat('envoi');
    try {
      const jeton = await u.getIdToken();
      const r = await fetch('https://europe-west1-repz-baf60.cloudfunctions.net/utiliserCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (d.ok) {
        setJusqu(d.jusqu || null);
        setEtat('ok');
        // Recharge le dossier : le badge PRO apparait tout de suite.
        programmeCharge.value = false;
        chargerProgramme();
      } else setEtat(d.raison || 'erreur');
    } catch (e) {
      setEtat('erreur');
    }
  };

  return createPortal((
    <>
      <div class="ca-voile" onClick={fermer} />
      <div class="ca-cadre" role="dialog" aria-label="J'ai un code">
        <div class="ca-lueur" aria-hidden="true" />
        {etat === 'ok' ? (
          <>
            <p class="ca-titre">Accès PRO activé</p>
            <p class="ca-sous">{jusqu
              ? 'Jusqu\'au ' + new Date(jusqu).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' }) + '.'
              : 'Sans limite de durée.'}</p>
            <button class="ca-bt" onClick={fermer}>Super</button>
          </>
        ) : (
          <>
            <p class="ca-titre">J'ai un code</p>
            <p class="ca-sous">Entre le code reçu de ton coach pour débloquer l'accès PRO.</p>
            <input class="ca-champ" type="text" autoCapitalize="characters" autoComplete="off" spellcheck={false}
              placeholder="TON CODE" value={code} maxLength={32}
              onInput={(e) => { setCode(e.currentTarget.value.toUpperCase()); if (etat && etat !== 'envoi') setEtat(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') envoyer(); }} />
            {etat && etat !== 'envoi' && <p class="ca-err">{MESSAGES[etat] || MESSAGES.erreur}</p>}
            <button class="ca-bt" onClick={envoyer} disabled={etat === 'envoi' || !code.trim()}>
              {etat === 'envoi' ? 'Vérification…' : 'Débloquer'}
            </button>
            <button class="ca-annuler" onClick={fermer}>Annuler</button>
          </>
        )}
      </div>
    </>
  ), document.body);
}
