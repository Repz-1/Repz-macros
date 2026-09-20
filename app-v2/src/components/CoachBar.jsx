import { useState } from 'preact/hooks';
import { parserLocal } from '../services/coach-local.js';
import { repas, objectifs, totauxJourAff, ajouterIngredient, ajouterEau } from '../store/journal.js';
import { DB } from '../data/aliments.js';
import '../styles/coach-bar.css';

function repasCible(cle) {
  const liste = repas.value;
  return liste.find((r) => r.cle === cle) ||
    liste.find((r) => r.ings.length === 0) ||
    liste[liste.length - 1];
}

function versLignes(aliments) {
  return (aliments || []).map((a) => {
    const cle = DB[a.aliment] ? a.aliment : null;
    if (!cle) return null;
    const d = DB[cle];
    const portion = a.unite === 'piece' && d && d.unit ? a.quantite * d.unit : a.quantite;
    return { cle, portion: Math.round(portion), repasCle: a.repasCle };
  }).filter(Boolean);
}

export function CoachBar() {
  const [texte, setTexte] = useState('');
  const [etat, setEtat] = useState('pret');
  const [msg, setMsg] = useState('');
  const [lignes, setLignes] = useState([]);
  const [eauLitres, setEauLitres] = useState(0);

  const appliquer = (out) => {
    const trouves = versLignes(out.aliments);
    const eau = Number(out.eauLitres) || 0;
    setEauLitres(eau);
    setMsg(out.texte || (trouves.length || eau ? 'Verifie les lignes puis ajoute.' : 'Rien a mettre.'));
    setLignes(trouves);
    setEtat((trouves.length || eau) ? 'proposition' : 'pret');
    if (trouves.length || eau) setTexte('');
  };

  const envoyer = () => {
    const dit = texte.trim();
    if (!dit) return;
    appliquer(parserLocal(dit, {
      objectifs: objectifs.value,
      totaux: totauxJourAff.value,
    }));
  };

  const retirer = (i) => setLignes(lignes.filter((_, j) => j !== i));

  const confirmer = () => {
    const n = lignes.length;
    const eau = eauLitres;
    lignes.forEach((l) => {
      if (l.portion <= 0) return;
      const cible = repasCible(l.repasCle);
      if (cible) ajouterIngredient(cible.id, l.cle, l.portion);
    });
    if (eau > 0) ajouterEau(eau);
    setLignes([]);
    setEauLitres(0);
    setMsg(n || eau ? 'C\u2019est dans le journal.' : '');
    setEtat('pret');
  };

  const aConfirmer = lignes.length > 0 || eauLitres > 0;

  return (
    <div class="coach-bar">
      <div class="coach-bar-ligne">
        <input
          class="coach-bar-champ"
          type="text"
          maxlength="240"
          placeholder="Ex. durum frites, j'ai bu 50 cl"
          value={texte}
          onInput={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') envoyer(); }}
        />
        <button class="coach-bar-go" type="button" disabled={!texte.trim()} onClick={envoyer}>OK</button>
      </div>
      {msg && <p class="coach-bar-msg">{msg}</p>}
      {etat === 'proposition' && aConfirmer && (
        <>
          {eauLitres > 0 && (
            <div class="coach-bar-ligne-alim">
              <span>Eau — {String(eauLitres).replace('.', ',')} L</span>
              <button type="button" onClick={() => setEauLitres(0)} aria-label="Retirer">x</button>
            </div>
          )}
          {lignes.map((l, i) => (
            <div class="coach-bar-ligne-alim" key={i}>
              <span>{l.cle} — {l.portion} g</span>
              <button type="button" onClick={() => retirer(i)} aria-label="Retirer">x</button>
            </div>
          ))}
          <button class="coach-bar-ajout" type="button" onClick={confirmer}>Ajouter au journal</button>
        </>
      )}
    </div>
  );
}
