import { useState } from 'preact/hooks';
import { demanderCoach } from '../services/coach.js';
import { parserLocal, proposerRepas } from '../services/coach-local.js';
import { repas, objectifs, totauxJourAff, ajouterIngredient, ajouterEau } from '../store/journal.js';
import { DB } from '../data/aliments.js';
import { resoudreAliment } from '../data/alias-aliments.js';
import { langue } from '../i18n/index.js';
import '../styles/coach-bar.css';

function repasCible(cle) {
  const liste = repas.value;
  return liste.find((r) => r.cle === cle) ||
    liste.find((r) => r.ings.length === 0) ||
    liste[liste.length - 1];
}

function versLignes(aliments) {
  return (aliments || []).map((a) => {
    const cle = resoudreAliment(a.aliment) || (DB[a.aliment] ? a.aliment : null);
    if (!cle) return null;
    const d = DB[cle];
    const portion = a.unite === 'piece' && d && d.unit ? a.quantite * d.unit : a.quantite;
    return { cle, portion: Math.round(portion), dit: a.aliment, repasCle: a.repasCle, unite: a.unite };
  }).filter(Boolean);
}

export function CoachBar() {
  const [texte, setTexte] = useState('');
  const [etat, setEtat] = useState('pret');
  const [msg, setMsg] = useState('');
  const [lignes, setLignes] = useState([]);
  const [eauLitres, setEauLitres] = useState(0);
  const [diner, setDiner] = useState(null);

  const appliquer = (out) => {
    const trouves = versLignes(out.aliments);
    const eau = Number(out.eauLitres) || 0;
    setEauLitres(eau);
    setMsg(out.texte || (trouves.length || eau ? 'Verifie et ajoute.' : 'Rien a mettre.'));
    setLignes(trouves);
    setDiner(null);
    setEtat((trouves.length || eau) ? 'proposition' : 'pret');
    if (trouves.length || eau) setTexte('');
  };

  const envoyer = async () => {
    const dit = texte.trim();
    if (!dit || etat === 'attente') return;
    setEtat('attente');
    setMsg('Un instant...');
    setLignes([]);
    setEauLitres(0);
    setDiner(null);
    const ctx = {
      langue: langue.value || 'fr',
      objectifs: objectifs.value,
      totaux: totauxJourAff.value,
      repas: repas.value.map((r) => ({
        id: r.id, nom: r.nom, cle: r.cle, nbAliments: (r.ings || []).length,
      })),
    };
    try {
      appliquer(await demanderCoach(dit, ctx));
    } catch (err) {
      appliquer(parserLocal(dit, ctx));
    }
  };

  const retirer = (i) => setLignes(lignes.filter((_, j) => j !== i));

  const proposerDiner = () => {
    const prop = proposerRepas(objectifs.value, totauxJourAff.value);
    if (!prop) return;
    setDiner(prop);
    setMsg('Il te reste ' + Math.round(kcalRestantes()) + ' kcal. Ce soir : ' + prop.nom + ' (' + prop.kcal + ' kcal).');
    setEtat('diner');
  };

  const kcalRestantes = () =>
    (objectifs.value.kcal || 0) - (totauxJourAff.value.kcal || 0);

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
    if (n || eau) {
      setMsg('C\u2019est dans le journal.');
      proposerDiner();
    } else {
      setMsg('');
      setEtat('pret');
    }
  };

  const confirmerDiner = () => {
    if (!diner) return;
    diner.ings.forEach((a) => {
      const cible = repasCible('diner');
      if (!cible) return;
      const d = DB[a.aliment];
      const portion = a.unite === 'piece' && d && d.unit ? a.quantite * d.unit : a.quantite;
      ajouterIngredient(cible.id, a.aliment, Math.round(portion));
    });
    setDiner(null);
    setMsg('Diner ajoute.');
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
          disabled={etat === 'attente'}
          onInput={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') envoyer(); }}
        />
        <button class="coach-bar-go" type="button" disabled={etat === 'attente' || !texte.trim()} onClick={envoyer}>
          {etat === 'attente' ? '...' : 'OK'}
        </button>
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
      {etat === 'diner' && diner && (
        <div class="coach-bar-diner">
          <p class="coach-bar-diner-nom">{diner.nom}</p>
          <p class="coach-bar-diner-macros">{diner.kcal} kcal · P {diner.prot} · G {diner.carbs} · L {diner.lip}</p>
          <ul class="coach-bar-diner-ings">
            {diner.ings.map((a, i) => (
              <li key={i}>{a.aliment} — {a.quantite} {a.unite === 'piece' ? 'p' : 'g'}</li>
            ))}
          </ul>
          <button class="coach-bar-ajout" type="button" onClick={confirmerDiner}>Ajouter ce dîner</button>
          <button class="coach-bar-passe" type="button" onClick={() => { setDiner(null); setEtat('pret'); setMsg(''); }}>
            Pas maintenant
          </button>
        </div>
      )}
    </div>
  );
}
