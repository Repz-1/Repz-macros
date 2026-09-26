// Questionnaire du plan coach (26/09, organigramme et contenu valides).
// Premier plan : 7 etapes. Mise a jour : 2 etapes. Puis recapitulatif,
// et la page Coach enchaine sur le paiement. Le brouillon est garde
// sur l'appareil : quitter en route ne perd rien.
import { useState, useEffect, useRef } from 'preact/hooks';
import { getApps } from 'firebase/app';
import { utilisateur } from '../services/firebase.js';
import { dossierCoach } from './BelfitPlus.jsx';
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
  // Deux copies : l'appareil et Firestore. On garde la plus recente,
  // pour reprendre sur un autre telephone ou sur l'ordinateur.
  let local = null;
  try { const b = JSON.parse(localStorage.getItem(cleBrouillon(type))); if (b && b.rep) local = b; }
  catch (e) { /* brouillon illisible : on repart de zero */ }
  const d = dossierCoach.value.brouillon;
  const distant = d && d.type === type && d.rep ? d : null;
  if (local && distant) return (distant.majLe || '') > (local.majLe || '') ? distant : local;
  return local || distant;
}

// Sauvegarde du brouillon dans la fiche du client (users/{uid}).
function sauverDistant(type, b) {
  const u = utilisateur.value;
  if (!u || !getApps().length) return Promise.resolve(false);
  return import('firebase/firestore').then(({ getFirestore, doc, setDoc }) =>
    setDoc(doc(getFirestore(getApps()[0]), 'users', u.uid), { brouillonCoach: { type, ...b } }, { merge: true }))
    .then(() => true);
}
// Hors reseau, Firestore garde l'ecriture et l'envoie plus tard, mais
// la promesse attend le serveur : sans limite, « Enregistrement… »
// resterait affiche. Au bout de 5 s, on dit la verite : garde ici.
function sauverAvecDelai(type, b) {
  return Promise.race([sauverDistant(type, b), new Promise(r => setTimeout(() => r(false), 5000))]);
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
  // 'ok' | 'envoi' | 'local' : rassure le client sur la sauvegarde.
  const [etatSauve, setEtatSauve] = useState('ok');
  const minuteur = useRef(null);
  const premier = useRef(true);
  const premierEtape = useRef(true);
  useRetour(true, onFermer);

  useEffect(() => {
    if (premier.current) { premier.current = false; return; }  // rien de neuf a l'ouverture
    const b = { rep, i, consentSante, majLe: new Date().toISOString() };
    try { localStorage.setItem(cleBrouillon(type), JSON.stringify(b)); }
    catch (e) { /* stockage plein : Firestore prend le relais */ }
    setEtatSauve('envoi');
    clearTimeout(minuteur.current);
    // Changement d'etape : tout de suite. Saisie : on attend une pause.
    minuteur.current = setTimeout(() => {
      sauverAvecDelai(type, b)
        .then(ok => setEtatSauve(ok ? 'ok' : 'local'))
        .catch(() => setEtatSauve('local'));
    }, 1200);
    return () => clearTimeout(minuteur.current);
  }, [rep, consentSante]);
  useEffect(() => {
    if (premierEtape.current) { premierEtape.current = false; return; }
    const b = { rep, i, consentSante, majLe: new Date().toISOString() };
    try { localStorage.setItem(cleBrouillon(type), JSON.stringify(b)); } catch (e) { /* rien */ }
    clearTimeout(minuteur.current);
    setEtatSauve('envoi');
    sauverAvecDelai(type, b).then(ok => setEtatSauve(ok ? 'ok' : 'local')).catch(() => setEtatSauve('local'));
  }, [i]);
  useEffect(() => { window.scrollTo && window.scrollTo(0, 0); }, [i]);

  const recap = i >= etapes.length;
  const et = etapes[Math.min(i, etapes.length - 1)];
  const visibles = e => e.questions.filter(q => !q.si || q.si(rep));
  const touche = useRef(false);   // le client a-t-il deja repondu ici ?
  const maj = id => v => { touche.current = true; setRep(r => ({ ...r, [id]: v })); setErreurs(x => ({ ...x, [id]: false })); };

  // Le brouillon Firestore peut arriver APRES l'ouverture (autre appareil,
  // reseau lent). S'il est plus recent et que rien n'a ete touche ici,
  // on le reprend.
  const distant = dossierCoach.value.brouillon;
  const ouvertLe = useRef(null);
  if (ouvertLe.current === null) ouvertLe.current = (b && b.majLe) || '';
  useEffect(() => {
    if (touche.current || !distant || distant.type !== type || !distant.rep) return;
    if ((distant.majLe || '') <= ouvertLe.current) return;
    ouvertLe.current = distant.majLe;
    setRep(distant.rep); setI(Math.min(distant.i || 0, etapes.length)); setConsentSante(!!distant.consentSante);
  }, [distant]);

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
      <div class="qc-haut"><span>Étape {i + 1} sur {etapes.length}</span>
        <span class={'qc-sauve qc-sauve--' + etatSauve}>{etatSauve === 'envoi' ? 'Enregistrement…' : etatSauve === 'local' ? 'Gardé sur ce téléphone' : '✓ Enregistré'}</span></div>
      <div class="qc-barre"><i style={{ width: Math.round((i + 1) / etapes.length * 100) + '%' }} /></div>
      <h1 class="cp-titre">{et.titre}</h1>
      <p class="cp-sous">{et.sous}</p>
      {visibles(et).map(q => <Question key={q.id} q={q} rep={rep[q.id]} maj={maj(q.id)} erreur={erreurs[q.id]} />)}
      {et.sante && alerteSante(rep) && (
        <p class="qc-alerte">Parle d'abord à ton médecin ou à un diététicien agréé. Ton coach verra ta réponse et adaptera ton plan avec prudence.</p>
      )}
      {et.sante && (
        <label class={'cp-consent' + (erreurs.__consent ? ' qc-q--err' : '')}>
          <input type="checkbox" checked={consentSante} onChange={e => { touche.current = true; setConsentSante(e.currentTarget.checked); setErreurs(x => ({ ...x, __consent: false })); }} />
          <span>J'accepte que mon coach utilise ces informations de santé pour construire mon plan.</span>
        </label>
      )}
      {erreurs.__consent && <p class="qc-err">Coche la case pour continuer.</p>}
      <button class="cp-bt cp-bt--or" onClick={suivant}>{i === etapes.length - 1 ? 'Voir le récapitulatif' : 'Suivant'}</button>
    </div>
  );
}
