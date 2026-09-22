import { useEffect, useRef, useState } from 'preact/hooks';
import { parserLocal, proposerRepas } from '../services/coach-local.js';
import { demanderCoach } from '../services/coach.js';
import { repas, objectifs, totauxJourAff, ajouterIngredient, ajouterEau } from '../store/journal.js';
import { seanceRefs, selectionExos, abandonnerSeance, portraitSeanceDuJour, ETAT, demandeVueEntrainer, poserBrouillon } from '../store/seance-active.js';
import { ongletActif } from './BottomNav.jsx';
import { courses } from './Courses.jsx';
import { DB, macrosOf } from '../data/aliments.js';
import { t } from '../i18n/index.js';
import '../styles/coach-bar.css';

function repasCible(cle) {
  const liste = repas.value;
  return liste.find((r) => r.cle === cle) ||
    liste.find((r) => r.ings.length === 0) ||
    liste[liste.length - 1];
}

function nomRepas(cle) {
  const r = repas.value.find((x) => x.cle === cle);
  return r ? r.nom : '';
}

function kcalDe(l) {
  return Math.round(macrosOf({ name: l.cle, portion: l.portion }).kcal || 0);
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
  const ouvert = etat === 'proposition' || etat === 'diner' || etat === 'seance' || etat === 'seancePosee';

  useEffect(() => {
    if (!ouvert) return;
    const el = ajoutRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }, [ouvert, lignes.length, diner, seance]);

  const appliquer = (out) => {
    // « Fais-moi les courses de la semaine » (v539, branche le 22/09).
    // La liste se fabrique deja depuis le journal dans Courses.jsx : le
    // coach n'a qu'a en regler la duree et le nombre de personnes, puis
    // l'ouvrir. C'est ce qui en fait un agent plutot qu'une reponse —
    // il ecrit dans l'outil au lieu de decrire une liste dans une bulle.
    if (out.action === 'majCourses') {
      const proche = (v, choix) => choix.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
      courses.value = {
        ...courses.value,
        jours: proche(out.jours || 7, [3, 5, 7]),
        pers: Math.min(4, Math.max(1, out.pers || 1)),
        genere: true,
      };
      setMsg(out.texte || '');
      setLignes([]);
      setEtat('pret');
      setTexte('');
      if ((out.noms || []).length) ongletActif.value = 'courses';
      return;
    }

    if (out.action === 'abandonnerSeance') {
      abandonnerSeance();
      setSeance(null);
      setLignes([]);
      setEauLitres(0);
      setDiner(null);
      setMsg(out.texte || t('coach_jetee'));
      setEtat('pret');
      setTexte('');
      return;
    }
    if (out.action === 'demarrerSeance') {
      const p = portraitSeanceDuJour();
      setMsg(out.texte || t('coach_on_y_va'));
      setEtat('pret');
      setTexte('');
      if (p.etat === ETAT.PREVUE && p.seanceId) {
        ongletActif.value = 'entrainer';
        demandeVueEntrainer.value = { nom: 'seanceDetail', params: { seanceId: p.seanceId, titre: p.titre, depuis: 'journal' } };
      } else if (p.etat === ETAT.BROUILLON || p.etat === ETAT.EN_COURS) {
        ongletActif.value = 'entrainer';
        demandeVueEntrainer.value = {
          nom: p.origine === 'programme' ? 'seanceDetail' : 'maseance',
          params: p.seanceId ? { seanceId: p.seanceId, titre: p.titre } : null,
        };
      } else {
        ongletActif.value = 'entrainer';
        demandeVueEntrainer.value = { nom: 'selection', params: null };
      }
      return;
    }
    if (out.action === 'composerSeance') {
      setSeance({
        composer: true,
        titre: out.titre,
        refs: out.refs,
        noms: out.noms || [],
        texte: out.texte,
      });
      setLignes(versLignes(out.aliments));
      setEauLitres(Number(out.eauLitres) || 0);
      setDiner(null);
      setMsg(out.texte);
      setEtat('seance');
      setTexte('');
      return;
    }
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
    setMsg(out.texte || t('coach_verifie'));
    setLignes(trouves);
    setEtat((trouves.length || eau) ? 'proposition' : 'pret');
    if (trouves.length || eau) setTexte('');
  };

  /**
   * Deux cerveaux, dans cet ordre (22/09).
   *
   * Le coach LOCAL repond d'abord : instantane, gratuit, hors ligne. Il
   * connait les aliments de la base, l'eau, les seances, les courses.
   * Le coach SERVEUR (coachAgent, Gemini) n'est appele que quand le
   * local n'a rien compris — c'est lui qui sait lire « un bol de pates
   * carbo chez ma mere ». Chaque appel Gemini est facture : le serveur
   * est un filet, pas le premier recours.
   *
   * Si le serveur n'est pas deploye, pas connecte ou injoignable, on
   * garde la reponse locale : la barre ne casse jamais.
   */
  const envoyer = async () => {
    const dit = texte.trim();
    if (!dit) return;
    const contexte = {
      objectifs: objectifs.value,
      totaux: totauxJourAff.value,
      seanceRefs: seanceRefs.value,
      repas: repas.value,
    };
    const local = parserLocal(dit, contexte);
    const compris = local.action || (local.aliments || []).length || local.eauLitres;
    if (compris) { appliquer(local); return; }

    setMsg('…');
    try {
      const distant = await demanderCoach(dit, {
        objectifs: contexte.objectifs,
        totaux: contexte.totaux,
      });
      if ((distant.aliments || []).length || distant.eauLitres) appliquer(distant);
      else appliquer(local);
    } catch (e) {
      appliquer(local);
    }
  };

  const ecrireAliments = () => {
    lignes.forEach((l) => {
      if (l.portion <= 0) return;
      const cible = repasCible(l.repasCle);
      if (cible) ajouterIngredient(cible.id, l.cle, l.portion);
    });
    if (eauLitres > 0) ajouterEau(eauLitres);
    return lignes.length || eauLitres;
  };

  const confirmer = () => {
    const n = ecrireAliments();
    setLignes([]);
    setEauLitres(0);
    if (!n) { setMsg(''); setEtat('pret'); return; }
    const prop = proposerRepas(objectifs.value, totauxJourAff.value);
    if (prop && prop.ings && prop.ings.length) {
      setDiner(prop);
      setMsg(t('coach_dans_prochain'));
      setEtat('diner');
    } else {
      setMsg(t('coach_dans_journal'));
      setEtat('pret');
    }
  };

  const allerMaSeance = () => {
    ongletActif.value = 'entrainer';
    demandeVueEntrainer.value = { nom: 'maseance', params: null };
  };

  const confirmerSeance = () => {
    if (!seance) return;
    ecrireAliments();
    setLignes([]);
    setEauLitres(0);
    if (seance.composer && seance.refs && seance.refs.length) {
      const sel = {};
      seance.refs.forEach((r) => {
        if (!sel[r.mKey]) sel[r.mKey] = new Set();
        sel[r.mKey].add(r.i);
      });
      selectionExos.value = sel;
      poserBrouillon({
        titre: seance.titre,
        refs: seance.refs.map((r) => ({ mKey: r.mKey, i: r.i })),
        origine: 'libre',
      });
      setSeance(null);
      setMsg(t('coach_seance_posee'));
      setEtat('seancePosee');
      return;
    }
    if (seance.swaps && seance.swaps.length) {
      const next = seanceRefs.value.slice();
      seance.swaps.forEach((s) => {
        if (s.source === 'libre' && s.vers && typeof s.idx === 'number') {
          next[s.idx] = { mKey: s.vers.mKey, i: s.vers.i };
        }
      });
      seanceRefs.value = next;
    }
    setSeance(null);
    setMsg(seance.swaps && seance.swaps.length
      ? t('coach_seance_ok')
      : t('coach_seance_rien'));
    setEtat('pret');
  };

  const aConfirmer = lignes.length > 0 || eauLitres > 0;
  const kcalProp = lignes.reduce((s, l) => s + kcalDe(l), 0);
  const reste = (objectifs.value.kcal || 0) - (totauxJourAff.value.kcal || 0) - kcalProp;

  return (
    <div class={'coach-bar' + (ouvert ? ' coach-bar--ouvert' : '')}>
      <div class="coach-kicker">{t('coach_kicker')}</div>
      <div class="coach-bar-ligne">
        <input
          class="coach-bar-champ"
          type="text"
          maxlength="240"
          placeholder={t('coach_placeholder')}
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
              <span>
                {l.cle} — {l.portion} g
                {nomRepas(l.repasCle) ? ' · ' + nomRepas(l.repasCle) : ''}
                {kcalDe(l) ? ' · ' + kcalDe(l) + ' kcal' : ''}
              </span>
              <button type="button" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>x</button>
            </div>
          ))}
          {eauLitres > 0 && (
            <div class="coach-bar-ligne-alim">
              <span>{String(eauLitres).replace('.', ',')} L · {t('coach_eau')}</span>
            </div>
          )}
          {kcalProp > 0 && (
            <p class="coach-bar-ecart">
              {t('coach_kcal').replace('{n}', String(kcalProp))}
              {objectifs.value.kcal
                ? ' · ' + (reste > 0
                  ? t('coach_reste').replace('{n}', String(Math.round(reste)))
                  : t('coach_depasse').replace('{n}', String(Math.round(-reste))))
                : ''}
            </p>
          )}
          <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={confirmer}>
            {t('coach_ajouter')}
          </button>
        </>
      )}
      {etat === 'diner' && diner && (
        <div class="coach-bar-diner">
          <p class="coach-bar-diner-nom">{diner.nom}</p>
          <p class="coach-bar-diner-macros">{diner.kcal} kcal · P {diner.prot} · G {diner.carbs} · L {diner.lip}</p>
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
            setDiner(null); setMsg(t('coach_dans_journal')); setEtat('pret');
          }}>{t('coach_ajouter_diner')}</button>
          <button class="coach-bar-passe" type="button" onClick={() => { setDiner(null); setEtat('pret'); setMsg(''); }}>{t('coach_pas_maintenant')}</button>
        </div>
      )}
      {etat === 'seance' && seance && (
        <div class="coach-bar-diner">
          <p class="coach-bar-diner-nom">{seance.titre}</p>
          {(seance.noms || []).map((nom, i) => (
            <div class="coach-bar-ligne-alim" key={'n' + i}>
              <span>{nom}</span>
            </div>
          ))}
          {(seance.swaps || []).map((s, i) => (
            <div class="coach-bar-ligne-alim" key={'s' + i}>
              <span>{s.deNom} → {s.versNom}</span>
            </div>
          ))}
          {lignes.map((l, i) => (
            <div class="coach-bar-ligne-alim" key={'a' + i}>
              <span>
                {l.cle} — {l.portion} g
                {kcalDe(l) ? ' · ' + kcalDe(l) + ' kcal' : ''}
              </span>
              <button type="button" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>x</button>
            </div>
          ))}
          {seance.composer && seance.refs && seance.refs.length > 0 && (
            <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={confirmerSeance}>
              {t('coach_poser_seance')}
            </button>
          )}
          {seance.swaps && seance.swaps.length > 0 && (
            <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={confirmerSeance}>
              {t('coach_appliquer_seance')}
            </button>
          )}
          <button class="coach-bar-passe" type="button" onClick={() => { setSeance(null); setLignes([]); setEtat('pret'); setMsg(''); }}>{t('coach_pas_maintenant')}</button>
        </div>
      )}
      {etat === 'seancePosee' && (
        <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={allerMaSeance}>
          {t('coach_commencer')}
        </button>
      )}
    </div>
  );
}
