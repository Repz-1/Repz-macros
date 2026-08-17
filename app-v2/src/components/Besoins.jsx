import { useState } from 'preact/hooks';
import { calculerBesoins, NIVEAUX_ACTIVITE, OBJECTIFS } from '../data/tdee.js';
import { setObjectifs, calculBaseFait, poidsCalcul, objectifs } from '../store/journal.js';
import { prenomUtilisateur } from './Entete.jsx';
import '../styles/besoins.css';
import { sexe } from '../store/perso.js';

// ============================================================
// BESOINS — etape 2 de l'inscription.
//
// Sans cet ecran, un compte neuf arrivait sur le Journal avec les
// valeurs par defaut du store (4300 kcal / 217 P / 538 C / 96 L) :
// les chiffres d'un homme de 97 kg en prise de masse, servis a tout
// le monde. Le calculateur existait, mais il fallait aller le
// chercher dans le volet profil.
//
// La formule n'est pas redecrite ici : calculerBesoins() est celle
// du calculateur, donc de la v1. Un seul endroit a corriger si elle
// bouge un jour.
//
// Pas de bouton « passer » : qui passe retombe sur un defaut faux,
// et on n'a rien repare. Le prix a payer, c'est que l'ecran doit
// rester court — six reponses, toutes pre-remplies, rien
// d'obligatoire a taper.
//
// La masse grasse n'est pas demandee : elle affinerait le calcul
// (Katch-McArdle), mais peu de gens la connaissent et un champ vide
// a l'inscription fait douter. Elle reste dans le calculateur.
// ============================================================

const JOURS = [0, 2, 4, 6];

export function Besoins() {
  // Le sexe deja repondu sur ce compte fait foi : on ne redemande pas
  // ce qu'on sait, et le defaut masculin ne s'impose plus a une
  // utilisatrice qui a deja repondu ailleurs.
  const [f, setF] = useState({
    sexe: sexe.value || 'h', age: 30, poids: 75, taille: 175,
    activiteBase: 1.3, joursEntrainement: 4, ajustement: 300,
  });
  const [envoi, setEnvoi] = useState(false);
  const maj = (cle, val) => {
    // Le sexe remonte au profil : il sert au calcul ci-dessous, mais
    // aussi a la silhouette de Stats. Repondre ici suffit donc, sans
    // avoir a le redire ailleurs.
    if (cle === 'sexe') sexe.value = val;
    setF(o => ({ ...o, [cle]: val }));
  };
  const num = (cle, val) => maj(cle, val === '' ? '' : parseFloat(val));

  const r = calculerBesoins({
    ...f,
    age: +f.age || 30, poids: +f.poids || 75, taille: +f.taille || 175,
    masseGrasse: NaN,
    intensiteEntrainement: 0.03,
    joursEntrainement: Math.max(0, +f.joursEntrainement || 0),
  });

  const valider = () => {
    setEnvoi(true);
    setObjectifs({ kcal: r.kcal, prot: r.prot, carbs: r.carbs, lip: r.lip });
    poidsCalcul.value = +f.poids || null;
    // Consomme le calcul offert : le recalcul devient Premium, et il
    // vient alors avec un programme sur mesure.
    calculBaseFait.value = true;
  };

  const prenom = prenomUtilisateur();
  const nb = (n) => Math.round(n).toLocaleString('fr-BE');

  return (
    <div class="pg-besoins">
      <div class="bs-etapes"><i class="on" /><i class="on" /></div>

      <h1 class="bs-titre">{prenom ? `Tes besoins, ${prenom}` : 'Tes besoins'}</h1>
      <p class="bs-chapo">
        Le calcul se met à jour à chaque réponse.<br />Tout reste modifiable ensuite.
      </p>

      <div class="bs-form">
        <div class="bs-seg" role="group" aria-label="Sexe">
          <button class={f.sexe === 'h' ? 'on' : ''} onClick={() => maj('sexe', 'h')}>Homme</button>
          <button class={f.sexe === 'f' ? 'on' : ''} onClick={() => maj('sexe', 'f')}>Femme</button>
        </div>

        <div class="bs-trio">
          <div class="bs-champ">
            <input type="number" inputMode="numeric" aria-label="Âge"
              value={f.age} onInput={e => num('age', e.currentTarget.value)} />
            <span>ans</span>
          </div>
          <div class="bs-champ">
            <input type="number" inputMode="decimal" aria-label="Poids"
              value={f.poids} onInput={e => num('poids', e.currentTarget.value)} />
            <span>kg</span>
          </div>
          <div class="bs-champ">
            <input type="number" inputMode="numeric" aria-label="Taille"
              value={f.taille} onInput={e => num('taille', e.currentTarget.value)} />
            <span>cm</span>
          </div>
        </div>

        <p class="bs-mini">Au quotidien, hors sport</p>
        <select value={f.activiteBase} onChange={e => num('activiteBase', e.currentTarget.value)}>
          {NIVEAUX_ACTIVITE.map(n => <option value={n.val}>{n.label}</option>)}
        </select>

        <p class="bs-mini">Entraînements par semaine</p>
        <div class="bs-seg" role="group" aria-label="Entraînements par semaine">
          {JOURS.map(j => (
            <button key={j} class={+f.joursEntrainement === j ? 'on' : ''}
              onClick={() => maj('joursEntrainement', j)}>{j}</button>
          ))}
        </div>

        <p class="bs-mini">Ton objectif</p>
        <select value={f.ajustement} onChange={e => num('ajustement', e.currentTarget.value)}>
          {OBJECTIFS.map(o => <option value={o.val}>{o.label}</option>)}
        </select>
      </div>

      <div class="bs-res">
        <p class="bs-res-lb">Ton objectif quotidien</p>
        <p class="bs-res-gros">{nb(r.kcal)}<em>kcal</em></p>
        <p class="bs-res-phrase">
          Métabolisme de base {nb(r.bmr)} kcal, dépense totale {nb(r.tdee)} kcal.
        </p>
        <div class="bs-res-grille">
          <div><b>{r.prot}</b><span>PROTÉINES</span></div>
          <div><b>{r.carbs}</b><span>GLUCIDES</span></div>
          <div><b>{r.lip}</b><span>LIPIDES</span></div>
        </div>
      </div>

      <button class="bs-valider" onClick={valider} disabled={envoi}>
        {envoi ? '…' : "C'est parti"}
      </button>
      <p class="bs-note">Tu pourras ajuster ces chiffres plus tard.</p>
    </div>
  );
}

// Un compte doit passer par cet ecran tant qu'il n'a jamais pose ses
// objectifs. Le test ne se contente pas de calculBaseFait : le mode
// Manuel du calculateur (Premium) ecrit des objectifs sans lever ce
// drapeau. On verifie donc aussi que les objectifs sont encore ceux
// du store par defaut — sinon un abonne qui a saisi ses valeurs a la
// main se verrait redemander l'etape 2.
const DEFAUT_KCAL = 4300;
export function besoinsRequis() {
  if (calculBaseFait.value) return false;
  const o = objectifs.value || {};
  return o.kcal === DEFAUT_KCAL && o.prot === 217 && o.carbs === 538 && o.lip === 96;
}
