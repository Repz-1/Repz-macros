import { useEffect, useRef, useState } from 'preact/hooks';
import { parserLocal, proposerRepas } from '../services/coach-local.js';
import { repas, objectifs, totauxJourAff, ajouterIngredient, ajouterEau } from '../store/journal.js';
import { enregistrerAdaptations } from '../store/adaptations.js';
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
  const [diner, setDiner] = useState(null);
  const [seance, setSeance] = useState(null);
  const ajoutRef = useRef(null);

  const ouvert = etat === 'proposition' || etat === 'diner' || etat === 'seance';

  useEffect(() => {
    if (!ouvert) return;
    const el = ajoutRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }, [ouvert, lignes.length, diner, seance]);

  const appliquer = (out) => {
    if (out.seance) {
      setSeance(out.seance);
      setLignes([]);
      setEauLitres(0);
      setDiner(null);
      setMsg(out.seance.texte);
      setEtat('seance');
      setTexte('');
      return;
    }
    const trouves = versLignes(out.aliments);
    const eau = Number(out.eauLitres) || 0;
    setSeance(null);
    setEauLitres(eau);
    setDiner(null);
    setMsg(out.texte || (trouves.length || eau ? 'Verifie puis ajoute.' : 'Rien a mettre.'));
    setLignes(trouves);
    setEtat((trouves.length || eau) ? 'proposition' : 'pret');
    if (trouves.length || eau) setTexte('');
  };

  const envoyer = () => {
    const dit = texte.trim();
    if (!dit) return;
    appliquer(parserLocal(dit, { objectifs: objectifs.value, totaux: totauxJourAff.value }));
  };

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
      const prop = proposerRepas(objectifs.value, totauxJourAff.value);
      if (prop && prop.ings && prop.ings.length) {
        setDiner(prop);
        setMsg('C\u2019est dans le journal. Prochain repas possible :');
        setEtat('diner');
      } else {
        setMsg('C\u2019est dans le journal.');
        setEtat('pret');
      }
    } else {
      setMsg('');
      setEtat('pret');
    }
  };

  const confirmerSeance = () => {
    if (!seance) return;
    enregistrerAdaptations(seance.swaps || [], seance.motif);
    setSeance(null);
    setMsg(seance.swaps && seance.swaps.length
      ? 'C\u2019est note pour aujourd\u2019hui seulement. Le programme ne change pas.'
      : 'Rien a changer.');
    setEtat('pret');
  };

  const aConfirmer = lignes.length > 0 || eauLitres > 0;

  return (
    <div class={'coach-bar' + (ouvert ? ' coach-bar--ouvert' : '')}>
      <div class="coach-bar-ligne">
        <input
          class="coach-bar-champ"
          type="text"
          maxlength="240"
          placeholder="Ex. une pomme, j'ai mal au genou"
          value={texte}
          onInput={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') envoyer(); }}
        />
        <button class="coach-bar-go" type="button" disabled={!texte.trim()} onClick={envoyer}>OK</button>
      </div>
      {msg && <p class="coach-bar-msg">{msg}</p>}
      {etat === 'proposition' && aConfirmer && (
        <>
          {lignes.map((l, i) => (
            <div class="coach-bar-ligne-alim" key={i}>
              <span>{l.cle} — {l.portion} g</span>
              <button type="button" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>x</button>
            </div>
          ))}
          <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={confirmer}>Ajouter au journal</button>
        </>
      )}
      {etat === 'diner' && diner && (
        <div class="coach-bar-diner">
          <p class="coach-bar-diner-nom">{diner.nom}</p>
          <p class="coach-bar-diner-macros">{diner.kcal} kcal · P {diner.prot} · G {diner.carbs} · L {diner.lip}</p>
          <p class="coach-bar-diner-macros">Pour le preparer :</p>
          {diner.ings.map((a, i) => (
            <div class="coach-bar-ligne-alim" key={i}>
              <span>{a.aliment} — {a.quantite} {a.unite === 'piece' ? 'p' : 'g'}</span>
            </div>
          ))}
          <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={() => {
            diner.ings.forEach((a) => {
              const cible = repasCible('diner');
              if (!cible) return;
              const d = DB[a.aliment];
              const portion = a.unite === 'piece' && d && d.unit ? a.quantite * d.unit : a.quantite;
              ajouterIngredient(cible.id, a.aliment, Math.round(portion));
            });
            setDiner(null); setMsg('Liste ajoutee.'); setEtat('pret');
          }}>Ajouter cette liste au journal</button>
          <button class="coach-bar-passe" type="button" onClick={() => { setDiner(null); setEtat('pret'); setMsg(''); }}>Pas maintenant</button>
        </div>
      )}
      {etat === 'seance' && seance && (
        <div class="coach-bar-diner">
          <p class="coach-bar-diner-nom">{seance.titre}</p>
          {(seance.swaps || []).map((s, i) => (
            <div class="coach-bar-ligne-alim" key={i}>
              <span>{s.deNom} → {s.versNom}</span>
            </div>
          ))}
          {seance.swaps && seance.swaps.length > 0 && (
            <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={confirmerSeance}>
              Appliquer aujourd'hui seulement
            </button>
          )}
          <button class="coach-bar-passe" type="button" onClick={() => { setSeance(null); setEtat('pret'); setMsg(''); }}>Pas maintenant</button>
        </div>
      )}
    </div>
  );
}
