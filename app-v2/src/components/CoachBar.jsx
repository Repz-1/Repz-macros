import { useState } from 'preact/hooks';
import { demanderCoach } from '../services/coach.js';
import { parserLocal } from '../services/coach-local.js';
import { repas, objectifs, totauxJourAff, ajouterIngredient } from '../store/journal.js';
import { DB, NOMS_ALIMENTS } from '../data/aliments.js';
import { langue } from '../i18n/index.js';
import '../styles/coach-bar.css';

function trouverAliment(nom) {
  const n = (nom || '').toLowerCase().trim();
  if (!n) return null;
  if (DB[nom]) return nom;
  const exact = NOMS_ALIMENTS.find((a) => a.toLowerCase() === n);
  if (exact) return exact;
  return NOMS_ALIMENTS.find((a) => a.toLowerCase().includes(n) || n.includes(a.toLowerCase())) || null;
}

function repasCible(cle) {
  const liste = repas.value;
  return liste.find((r) => r.cle === cle) ||
    liste.find((r) => r.ings.length === 0) ||
    liste[liste.length - 1];
}

function versLignes(aliments) {
  return (aliments || []).map((a) => {
    const cle = trouverAliment(a.aliment);
    if (!cle) return null;
    const d = DB[cle];
    const portion = a.unite === 'piece' && d && d.unit ? a.quantite * d.unit : a.quantite;
    return {
      cle,
      portion: Math.round(portion),
      dit: a.aliment,
      repasCle: a.repasCle,
    };
  }).filter(Boolean);
}

export function CoachBar() {
  const [texte, setTexte] = useState('');
  const [etat, setEtat] = useState('pret');
  const [msg, setMsg] = useState('');
  const [lignes, setLignes] = useState([]);

  const appliquer = (out) => {
    const trouves = versLignes(out.aliments);
    setMsg(out.texte || (trouves.length ? 'Vérifie et ajoute.' : 'Rien à mettre au journal.'));
    setLignes(trouves);
    setEtat(trouves.length ? 'proposition' : 'pret');
    if (trouves.length) setTexte('');
  };

  const envoyer = async () => {
    const dit = texte.trim();
    if (!dit || etat === 'attente') return;
    setEtat('attente');
    setMsg('Un instant\u2026');
    setLignes([]);
    try {
      const ctx = {
        langue: langue.value || 'fr',
        objectifs: objectifs.value,
        totaux: totauxJourAff.value,
        repas: repas.value.map((r) => ({
          id: r.id, nom: r.nom, cle: r.cle, nbAliments: (r.ings || []).length,
        })),
      };
      const out = await demanderCoach(dit, ctx);
      appliquer(out);
    } catch (err) {
      appliquer(parserLocal(dit));
    }
  };

  const retirer = (i) => setLignes(lignes.filter((_, j) => j !== i));

  const confirmer = () => {
    lignes.forEach((l) => {
      if (l.portion <= 0) return;
      const cible = repasCible(l.repasCle);
      if (cible) ajouterIngredient(cible.id, l.cle, l.portion);
    });
    setLignes([]);
    setMsg(lignes.length ? 'C\u2019est dans le journal.' : '');
    setEtat('pret');
  };

  return (
    <div class="coach-bar">
      <div class="coach-bar-ligne">
        <input
          class="coach-bar-champ"
          type="text"
          maxlength="240"
          placeholder="Dis ce que tu as mangé\u2026"
          value={texte}
          disabled={etat === 'attente'}
          onInput={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') envoyer(); }}
        />
        <button
          class="coach-bar-go"
          type="button"
          disabled={etat === 'attente' || !texte.trim()}
          onClick={envoyer}
        >{etat === 'attente' ? '\u2026' : 'OK'}</button>
      </div>
      {msg && <p class="coach-bar-msg">{msg}</p>}
      {etat === 'proposition' && lignes.length > 0 && (
        <>
          {lignes.map((l, i) => (
            <div class="coach-bar-ligne-alim" key={i}>
              <span>{l.cle} \u00b7 {l.portion} g</span>
              <button type="button" onClick={() => retirer(i)} aria-label="Retirer">\u2715</button>
            </div>
          ))}
          <button class="coach-bar-ajout" type="button" onClick={confirmer}>
            Ajouter au journal
          </button>
        </>
      )}
    </div>
  );
}
