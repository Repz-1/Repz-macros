// Questionnaire du plan coach (26/09, organigramme et contenu valides).
// Premier plan : 7 etapes. Mise a jour : 2 etapes. Puis recapitulatif,
// et la page Coach enchaine sur le paiement. Le brouillon est garde
// sur l'appareil : quitter en route ne perd rien.
import { useState, useEffect } from 'preact/hooks';
import { Entete } from './Entete.jsx';
import { useRetour } from '../services/retour.js';
import { profilBesoins, poidsCalcul } from '../store/journal.js';
import { PREMIER_PLAN, MISE_A_JOUR, repondue, lisible, alerteSante } from '../data/questionnaire-coach.js';

const cleBrouillon = type => 'belfit_qc_brouillon_' + type;

function prerempli(type) {
  const p = profilBesoins.value || {};
  const r = {};
  const poids = p.poids || poidsCalcul.value;
  if (poids) r.poids = { valeur: String(poids) };
  if (type === 'plan') {
    if (p.taille) r.taille = { valeur: String(p.taille) };
    if (p.age) r.age = { valeur: String(p.age) };
    if (p.sexe) r.sexe = { valeur: p.sexe === 'f' ? 'Femme' : 'Homme' };
  }
  return r;
}

function lireBrouillon(type) {
  try { const b = JSON.parse(localStorage.getItem(cleBrouillon(type))); if (b && b.rep) return b; }
  catch (e) { /* brouillon illisible : on repart de zero */ }
  return null;
}

export function effacerBrouillon(type) {
  try { localStorage.removeItem(cleBrouillon(type)); } catch (e) { /* rien */ }
}

function Question({ q, rep, maj, erreur }) {
  const r = rep || {};
  const opts = q.autre ? [...(q.options || []), 'Autre'] : (q.options || []);
  const actif = o => q.type === 'plusieurs' ? (r.valeurs || []).includes(o) : r.valeur === o;
  const choisir = o => {
    if (q.type === 'un') return maj({ ...r, valeur: o });
    let vs = r.valeurs || [];
    if (vs.includes(o)) vs = vs.filter(x => x !== o);
    else if (o === q.aucun) vs = [o];                       // « Aucun » est exclusif
    else vs = [...vs.filter(x => x !== q.aucun), o];
    maj({ ...r, valeurs: vs });
  };
  const autreOuvert = q.type === 'plusieurs' ? (r.valeurs || []).includes('Autre') : r.valeur === 'Autre';
  return (
    <div class={'qc-q' + (erreur ? ' qc-q--err' : '')}>
      <p class="qc-label">{q.label}{q.facultatif && <span class="qc-fac"> · facultatif</span>}{q.type === 'plusieurs' && <span class="qc-fac"> · plusieurs choix</span>}</p>
      {(q.type === 'un' || q.type === 'plusieurs') && (
        <div class="qc-chips">
          {opts.map(o => (
            <button type="button" class={'qc-chip' + (actif(o) ? ' on' : '')} aria-pressed={actif(o)} onClick={() => choisir(o)}>{o}</button>
          ))}
        </div>
      )}
      {autreOuvert && (
        <input class="qc-champ" placeholder="Précise…" value={r.autre || ''}
          onInput={e => maj({ ...r, autre: e.currentTarget.value })} />
      )}
      {q.type === 'nombre' && (
        <input class="qc-champ qc-champ--court" inputMode="decimal" value={r.valeur || ''}
          onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />
      )}
      {q.type === 'date' && (
        <input class="qc-champ qc-champ--court" type="date" value={r.valeur || ''}
          onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />
      )}
      {q.type === 'texte' && (
        <textarea class="qc-champ" rows={q.id === 'message' ? 3 : 2} value={r.valeur || ''}
          onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />
      )}
      {erreur && <p class="qc-err">Réponds à cette question pour continuer.</p>}
    </div>
  );
}

export function QuestionnaireCoach({ type, onFermer, onTermine }) {
  const etapes = type === 'maj' ? MISE_A_JOUR : PREMIER_PLAN;
  const b = lireBrouillon(type);
  const [rep, setRep] = useState(() => (b && b.rep) || prerempli(type));
  const [i, setI] = useState(() => (b && Math.min(b.i || 0, etapes.length)) || 0);
  const [consentSante, setConsentSante] = useState(!!(b && b.consentSante));
  const [erreurs, setErreurs] = useState({});
  useRetour(true, onFermer);

  useEffect(() => {
    try { localStorage.setItem(cleBrouillon(type), JSON.stringify({ rep, i, consentSante })); }
    catch (e) { /* stockage plein : le questionnaire marche quand meme */ }
  }, [rep, i, consentSante]);
  useEffect(() => { window.scrollTo && window.scrollTo(0, 0); }, [i]);

  const recap = i >= etapes.length;
  const et = etapes[Math.min(i, etapes.length - 1)];
  const visibles = e => e.questions.filter(q => !q.si || q.si(rep));
  const maj = id => v => { setRep(r => ({ ...r, [id]: v })); setErreurs(x => ({ ...x, [id]: false })); };

  const suivant = () => {
    const manquantes = {};
    visibles(et).forEach(q => { if (!repondue(q, rep[q.id])) manquantes[q.id] = true; });
    if (et.sante && !consentSante) manquantes.__consent = true;
    if (Object.keys(manquantes).length) { setErreurs(manquantes); return; }
    setErreurs({});
    setI(i + 1);
  };

  const nettoyer = () => {
    // On n'envoie que les questions visibles, avec leur libelle lisible.
    const out = {};
    etapes.forEach(e => visibles(e).forEach(q => { if (rep[q.id]) out[q.id] = { ...rep[q.id], texte: lisible(q, rep[q.id]) }; }));
    return out;
  };

  if (recap) {
    return (
      <div class="pg-coach pg-qc">
        <Entete sansBandeau retour={() => setI(etapes.length - 1)} />
        <h1 class="cp-titre">Récapitulatif</h1>
        <p class="cp-sous">Vérifie tes réponses avant de les envoyer à ton coach.</p>
        {etapes.map((e, k) => (
          <div class="cp-carte qc-recap">
            <div class="cp-ligne"><span class="cp-nom">{e.titre}</span>
              <button class="qc-modif" onClick={() => setI(k)}>Modifier</button></div>
            {visibles(e).map(q => (
              <p class="qc-rl"><span>{q.label}</span><b>{lisible(q, rep[q.id])}</b></p>
            ))}
          </div>
        ))}
        {alerteSante(rep) && (
          <p class="qc-alerte">Tu as signalé un point de santé. Montre ton plan à ton médecin avant de le commencer.</p>
        )}
        <button class="cp-bt cp-bt--or" onClick={() => onTermine(nettoyer(), alerteSante(rep))}>
          Envoyer à mon coach
        </button>
      </div>
    );
  }

  return (
    <div class="pg-coach pg-qc">
      <Entete sansBandeau retour={i ? () => { setErreurs({}); setI(i - 1); } : onFermer} />
      <div class="qc-haut"><span>Étape {i + 1} sur {etapes.length}</span><span>{type === 'maj' ? '≈ 3 min' : '≈ 7 min'}</span></div>
      <div class="qc-barre"><i style={{ width: Math.round((i + 1) / etapes.length * 100) + '%' }} /></div>
      <h1 class="cp-titre">{et.titre}</h1>
      <p class="cp-sous">{et.sous}</p>
      {visibles(et).map(q => <Question key={q.id} q={q} rep={rep[q.id]} maj={maj(q.id)} erreur={erreurs[q.id]} />)}
      {et.sante && alerteSante(rep) && (
        <p class="qc-alerte">Parle d'abord à ton médecin ou à un diététicien agréé. Ton coach verra ta réponse et adaptera ton plan avec prudence.</p>
      )}
      {et.sante && (
        <label class={'cp-consent' + (erreurs.__consent ? ' qc-q--err' : '')}>
          <input type="checkbox" checked={consentSante} onChange={e => { setConsentSante(e.currentTarget.checked); setErreurs(x => ({ ...x, __consent: false })); }} />
          <span>J'accepte que mon coach utilise ces informations de santé pour construire mon plan.</span>
        </label>
      )}
      {erreurs.__consent && <p class="qc-err">Coche la case pour continuer.</p>}
      <button class="cp-bt cp-bt--or" onClick={suivant}>{i === etapes.length - 1 ? 'Voir le récapitulatif' : 'Suivant'}</button>
    </div>
  );
}
