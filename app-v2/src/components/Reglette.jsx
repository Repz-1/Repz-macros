import { useState, useRef, useEffect } from 'preact/hooks';

// ============================================================
// REGLETTE GRADUEE — cadran vertical qu'on fait defiler.
//
// Sortie de Questionnaire.jsx le 12/08. Elle y servait aux questions
// taille, poids et age ; ces trois questions ont quitte le
// questionnaire d'entrainement, ramene a quatre questions.
//
// Le composant est CONSERVE, et volontairement : Raci le destine au
// questionnaire de programme alimentaire pour coach, ou taille, poids
// et age comptent vraiment. Le laisser dormir dans Questionnaire.jsx
// en aurait fait du code mort dans un fichier qui ne s'en sert plus —
// exactement ce qui pourrit et finit par etre supprime a tort, comme
// ce meme composant l'a ete le 27/07, laissant le questionnaire
// bloque quinze jours.
//
// Sens : grand vers le haut, petit vers le bas (Raci, 10/08), pour la
// taille, le poids et l'age. Toute la conversion passe par posDe() et
// valDe(), un seul endroit ou le sens puisse se contredire.
//
// Emploi :
//   <Reglette min={120} max={220} pas={1} unite="cm" px={60}
//             inverse valeur={175} onChange={(v) => …} />
//
// Le style vit dans legacy/quiz2.css, classes .rg-*.
// ============================================================

/**
 * Reglette graduee horizontale : on fait glisser sous l'aiguille.
 * Sert pour la taille, le poids et l'age. La valeur est aussi
 * tapable au clavier (appui sur le chiffre).
 *
 * RESTAUREE le 10/08. Le commit b9b6a68 du 27/07, qui refaisait
 * l'ecran de resultat, a supprime cette fonction en laissant la
 * balise <Reglette> a sa place. Depuis, l'etape 3 du questionnaire
 * levait « Reglette is not defined » : le rendu plantait, l'ecran
 * restait fige sur l'etape 2 et l'appui sur Continuer semblait sans
 * effet. Signale par Raci le 10/08, le questionnaire etait bloque
 * depuis deux semaines.
 */
export function Reglette({ min, max, pas, valeur, unite, onChange, px, inverse }) {
  const PX = px || 60;                            // px par unite entiere
  // `inverse` : les grandes valeurs EN HAUT, les petites en bas.
  // Demande de Raci le 10/08 pour la taille — c'est le sens d'une
  // toise, on ne mesure pas quelqu'un a l'envers. Toute la mecanique
  // passe par ce seul convertisseur position <-> valeur, pour qu'il
  // n'existe qu'un endroit ou le sens puisse se contredire.
  const posDe = (v) => (inverse ? max - v : v - min) * PX;
  const valDe = (y) => (inverse ? max - y / PX : min + y / PX);
  const piste = useRef(null);
  const synchro = useRef(false);
  const [manuel, setManuel] = useState(false);
  const [texte, setTexte] = useState('');

  useEffect(() => {
    const el = piste.current;
    if (!el) return;
    synchro.current = true;
    el.scrollTop = posDe(valeur);
    const t = setTimeout(() => { synchro.current = false; }, 80);
    return () => clearTimeout(t);
  }, []);

  const surDefile = () => {
    if (synchro.current || !piste.current) return;
    const brut = valDe(piste.current.scrollTop);
    const v = Math.round(brut / pas) * pas;
    onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)));
  };

  const validerManuel = () => {
    const v = parseFloat(String(texte).replace(',', '.'));
    setManuel(false);
    if (!isNaN(v) && v >= min && v <= max) {
      onChange(v);
      const el = piste.current;
      if (el) { synchro.current = true; el.scrollTop = posDe(v); setTimeout(() => { synchro.current = false; }, 80); }
    }
  };

  // Echelle serree -> un chiffre tous les 5 crans, sinon chaque cran
  const saut = PX >= 44 ? 1 : 5;
  const reperes = [];
  for (let k = Math.ceil(min); k <= max; k++) {
    if (k % saut === 0 || k === min || k === max) reperes.push(k);
  }

  return (
    <div class="rg">
      {manuel ? (
        <div class="rg-val rg-val--champ">
          <input type="number" inputMode="decimal" step={pas} min={min} max={max}
            value={texte} autoFocus
            onInput={(e) => setTexte(e.currentTarget.value)}
            onBlur={validerManuel}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
        </div>
      ) : (
        <button class="rg-val" onClick={() => { setTexte(String(valeur)); setManuel(true); }}>
          {String(valeur).replace('.', ',')}<span>{unite}</span>
          <i class="rg-astuce">Touche le chiffre pour le taper</i>
        </button>
      )}
      <div class="rg-zone">
        <div class="rg-aiguille" />
        <div class="rg-piste" ref={piste} onScroll={surDefile}>
          <div class="rg-ruban" style={{
            height: (max - min) * PX + 'px',
            backgroundImage:
              `repeating-linear-gradient(180deg, #DDD7CA 0 1.5px, transparent 1.5px ${pas < 1 ? PX * pas : PX / 5}px), `
              + `repeating-linear-gradient(180deg, #A9A49C 0 2px, transparent 2px ${PX}px)`,
          }}>
            {reperes.map(k => (
              <span key={k} class="rg-rep" style={{ top: posDe(k) + 'px' }}>{k}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
