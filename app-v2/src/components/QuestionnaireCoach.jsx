// Questionnaire du plan coach — v2 (26/09, maquettes validees par Raci).
// Suit sa banque de questions, section par section : accueil avec la
// liste des sections, une section par ecran, recapitulatif avec les
// consentements, puis envoi. Brouillon garde sur l'appareil ET dans
// Firestore : le client reprend la ou il s'est arrete, sur n'importe
// quel appareil.
import { useState, useEffect, useRef } from 'preact/hooks';
import { getApps } from 'firebase/app';
import { utilisateur } from '../services/firebase.js';
import { dossierCoach } from './BelfitPlus.jsx';
import { Entete } from './Entete.jsx';
import { Icone } from './IconesCoach.jsx';
import { useRetour } from '../services/retour.js';
import { profilBesoins, poidsCalcul } from '../store/journal.js';
import { PREMIER_PLAN, MISE_A_JOUR, CONSENTEMENTS, repondue, lisible, alerteSante, allergieGrave, optionsDe } from '../data/questionnaire-coach.js';

const cleBrouillon = type => 'belfit_qc_brouillon_' + type;

function prerempli(type) {
  const p = profilBesoins.value || {};
  const u = utilisateur.value || {};
  const r = {};
  const poids = p.poids || poidsCalcul.value;
  if (poids) r.poids = { valeur: String(poids) };
  if (type === 'plan') {
    if (u.displayName) r.prenom = { valeur: String(u.displayName).split(' ')[0] };
    if (u.email) r.email = { valeur: u.email };
    if (p.taille) r.taille = { valeur: String(p.taille) };
    if (p.age) r.age = { valeur: String(p.age) };
    if (p.sexe) r.sexe = { valeur: p.sexe === 'f' ? 'Femme' : 'Homme' };
  }
  return r;
}

function lireBrouillon(type) {
  // Deux copies : l'appareil et Firestore. On garde la plus recente.
  let local = null;
  try { const b = JSON.parse(localStorage.getItem(cleBrouillon(type))); if (b && b.rep) local = b; }
  catch (e) { /* brouillon illisible : on repart de zero */ }
  const d = dossierCoach.value.brouillon;
  const distant = d && d.type === type && d.rep ? d : null;
  if (local && distant) return (distant.majLe || '') > (local.majLe || '') ? distant : local;
  return local || distant;
}

function sauverDistant(type, b) {
  const u = utilisateur.value;
  if (!u || !getApps().length) return Promise.resolve(false);
  return import('firebase/firestore').then(({ getFirestore, doc, setDoc }) =>
    setDoc(doc(getFirestore(getApps()[0]), 'users', u.uid), { brouillonCoach: { type, ...b } }, { merge: true }))
    .then(() => true);
}
// Hors reseau, la promesse Firestore attend le serveur : au bout de
// 5 s, on dit la verite, « garde sur ce telephone ».
function sauverAvecDelai(type, b) {
  return Promise.race([sauverDistant(type, b), new Promise(r => setTimeout(() => r(false), 5000))]);
}

export function effacerBrouillon(type) {
  try { localStorage.removeItem(cleBrouillon(type)); } catch (e) { /* rien */ }
}

// ---------- Champs ----------

// Saisie directe d'un nombre (poids, taille…) : clavier numerique.
function Saisie({ q, r, maj }) {
  return (
    <div class="qc-saisie">
      <input inputMode="decimal" value={r.valeur ?? ''} placeholder="—"
        onInput={e => maj({ ...r, valeur: e.currentTarget.value.replace(/[^0-9.,]/g, '') })} />
      {q.unite && <small>{q.unite}</small>}
    </div>
  );
}

// Roulette horizontale (Raci, 26/09) : on fait defiler, le chiffre au
// centre est choisi. Un appui sur un chiffre le choisit aussi.
function Roulette({ q, r, maj }) {
  const ref = useRef(null);
  const minuteur = useRef(null);
  const nombres = [];
  for (let n = q.min; n <= q.max; n++) nombres.push(n);
  const choisi = r.valeur === undefined || r.valeur === '' ? null : +r.valeur;
  const centrer = (n, doux) => {
    const el = ref.current && ref.current.querySelector('[data-n="' + n + '"]');
    if (el) ref.current.scrollTo({ left: el.offsetLeft - ref.current.clientWidth / 2 + el.clientWidth / 2, behavior: doux ? 'smooth' : 'auto' });
  };
  useEffect(() => { if (choisi !== null) centrer(choisi, false); }, []);
  const auDefilement = () => {
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      const box = ref.current; if (!box) return;
      const milieu = box.scrollLeft + box.clientWidth / 2;
      let meilleur = null, ecart = Infinity;
      box.querySelectorAll('[data-n]').forEach(el => {
        const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - milieu);
        if (d < ecart) { ecart = d; meilleur = +el.dataset.n; }
      });
      if (meilleur !== null && meilleur !== choisi) maj({ ...r, valeur: String(meilleur) });
    }, 120);
  };
  return (
    <div class="qc-roulette">
      <div class="qc-roulette-piste" ref={ref} onScroll={auDefilement}>
        {nombres.map(n => (
          <button type="button" data-n={n} class={n === choisi ? 'on' : ''} aria-pressed={n === choisi}
            onClick={() => { maj({ ...r, valeur: String(n) }); centrer(n, true); }}>{n}</button>
        ))}
      </div>
      <span class="qc-roulette-repere" aria-hidden="true" />
    </div>
  );
}

function Compteur({ q, r, maj }) {
  const pas = q.pas || 1;
  const n = parseFloat(String(r.valeur ?? '').replace(',', '.'));
  const vide = isNaN(n);
  const borne = x => Math.min(q.max ?? 999, Math.max(q.min ?? 0, x));
  const bouge = d => maj({ ...r, valeur: String(+(borne((vide ? (q.defaut ?? 0) : n) + d)).toFixed(pas < 1 ? 1 : 0)).replace(/\.0$/, '') });
  return (
    <div class="qc-num">
      <button type="button" aria-label="Moins" onClick={() => bouge(-pas)}>−</button>
      <span class="qc-num-val">
        <input inputMode="decimal" value={r.valeur ?? ''} placeholder={String(q.defaut ?? '')}
          onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />
        {q.unite && <small>{q.unite}</small>}
      </span>
      <button type="button" aria-label="Plus" onClick={() => bouge(pas)}>+</button>
    </div>
  );
}

function Question({ q, rep, toutes, maj, erreur }) {
  const r = rep || {};
  const opts = optionsDe(q, toutes);
  const icones = Object.fromEntries((q.options || []).filter(Array.isArray));
  const [info, setInfo] = useState(false);
  const exclusifs = q.exclusifs || (q.aucun ? [q.aucun] : []);
  const actif = o => q.type === 'plusieurs' ? (r.valeurs || []).includes(o) : r.valeur === o;
  const choisir = o => {
    if (q.type !== 'plusieurs') return maj({ ...r, valeur: o });
    let vs = r.valeurs || [];
    if (vs.includes(o)) vs = vs.filter(x => x !== o);
    else if (exclusifs.includes(o)) vs = [o];
    else vs = [...vs.filter(x => !exclusifs.includes(x)), o];
    maj({ ...r, valeurs: vs });
  };
  const autreOuvert = q.type === 'plusieurs' ? (r.valeurs || []).includes('Autre') : r.valeur === 'Autre';
  return (
    <div class={'qc-carte' + (erreur ? ' qc-carte--err' : '')}>
      <p class="qc-label">{q.label}{q.facultatif && <span class="qc-fac">facultatif</span>}
        {q.info && (
          <button type="button" class={'qc-info' + (info ? ' on' : '')} aria-label="Explication" aria-expanded={info} onClick={() => setInfo(!info)}>
            <Icone nom="info" taille={16} />
          </button>
        )}
      </p>
      {q.info && info && <p class="qc-info-txt">{q.info}</p>}
      {q.type === 'tuiles' && (
        <div class="qc-tuiles">
          {opts.map(o => (
            <button type="button" class={'qc-tuile' + (actif(o) ? ' on' : '')} aria-pressed={actif(o)} onClick={() => choisir(o)}>
              {icones[o] && <Icone nom={icones[o]} />}<span>{o}</span>
            </button>
          ))}
        </div>
      )}
      {(q.type === 'un' || q.type === 'plusieurs') && (
        <div class="qc-puces">
          {opts.map(o => (
            <button type="button" class={'qc-puce' + (actif(o) ? ' on' : '')} aria-pressed={actif(o)} onClick={() => choisir(o)}>{o}</button>
          ))}
        </div>
      )}
      {q.type === 'plusieurs' && <p class="qc-aide">Plusieurs choix possibles</p>}
      {autreOuvert && (
        <input class="qc-champ" placeholder="Précise…" value={r.autre || ''} onInput={e => maj({ ...r, autre: e.currentTarget.value })} />
      )}
      {q.type === 'nombre' && (q.saisie ? <Saisie q={q} r={r} maj={maj} /> : <Compteur q={q} r={r} maj={maj} />)}
      {q.type === 'roulette' && <Roulette q={q} r={r} maj={maj} />}
      {q.type === 'echelle' && (
        <>
          <div class="qc-echelle">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button type="button" class={+r.valeur === n ? 'on' : ''} aria-pressed={+r.valeur === n} onClick={() => maj({ ...r, valeur: n })}>{n}</button>
            ))}
          </div>
          <div class="qc-echelle-leg"><span>{q.bas}</span><span>{q.haut}</span></div>
        </>
      )}
      {q.type === 'date' && <input class="qc-champ" type="date" value={r.valeur || ''} onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />}
      {q.type === 'texte' && (
        <input class="qc-champ" type={q.clavier === 'email' ? 'email' : q.clavier === 'tel' ? 'tel' : 'text'}
          placeholder={q.exemple || ''} value={r.valeur || ''} onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />
      )}
      {q.type === 'long' && (
        <textarea class="qc-champ" rows={3} placeholder={q.exemple || ''} value={r.valeur || ''} onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />
      )}
      {q.id === 'reaction' && allergieGrave(toutes) && (
        <div class="qc-alerte-rouge"><Icone nom="shield-check" taille={16} /><span>Gonflement ou malaise : cet aliment sera exclu à 100 % de ton plan, sans substitut risqué.</span></div>
      )}
      {erreur && <p class="qc-err">Réponds à cette question pour continuer.</p>}
    </div>
  );
}

// ---------- Questionnaire ----------

export function QuestionnaireCoach({ type, onFermer, onTermine }) {
  const sections = type === 'maj' ? MISE_A_JOUR : PREMIER_PLAN;
  const b = lireBrouillon(type);
  const [rep, setRep] = useState(() => (b && b.rep) || prerempli(type));
  const [i, setI] = useState(() => (b && Math.min(b.i || 0, sections.length)) || 0);
  const [vue, setVue] = useState('accueil');            // accueil | section | recap
  const [consent, setConsent] = useState(() => (b && b.consent) || {});
  const [erreurs, setErreurs] = useState({});
  const [etatSauve, setEtatSauve] = useState('ok');     // ok | envoi | local
  const minuteur = useRef(null);
  const premier = useRef(true);
  const touche = useRef(false);
  useRetour(true, () => { if (vue === 'accueil') onFermer(); else setVue('accueil'); });

  // Sauvegarde : appareil tout de suite, Firestore apres une pause.
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    const bb = { rep, i, consent, majLe: new Date().toISOString() };
    try { localStorage.setItem(cleBrouillon(type), JSON.stringify(bb)); } catch (e) { /* Firestore prend le relais */ }
    setEtatSauve('envoi');
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      sauverAvecDelai(type, bb).then(ok => setEtatSauve(ok ? 'ok' : 'local')).catch(() => setEtatSauve('local'));
    }, 1000);
    return () => clearTimeout(minuteur.current);
  }, [rep, i, consent]);

  // Brouillon Firestore arrive apres l'ouverture (2e appareil).
  const distant = dossierCoach.value.brouillon;
  const ouvertLe = useRef((b && b.majLe) || '');
  useEffect(() => {
    if (touche.current || !distant || distant.type !== type || !distant.rep) return;
    if ((distant.majLe || '') <= ouvertLe.current) return;
    ouvertLe.current = distant.majLe;
    setRep(distant.rep); setI(Math.min(distant.i || 0, sections.length)); setConsent(distant.consent || {});
  }, [distant]);

  useEffect(() => { try { document.querySelector('.pg-qc') && document.querySelector('.pg-qc').scrollIntoView(); } catch (e) { /* rien */ } }, [i, vue]);

  const maj = id => v => { touche.current = true; setRep(r => ({ ...r, [id]: v })); setErreurs(x => ({ ...x, [id]: false })); };
  const visibles = s => s.questions.filter(q => !q.si || q.si(rep));
  const complete = s => visibles(s).every(q => repondue(q, rep[q.id]));
  const suivant = () => {
    const s = sections[i];
    const manque = {};
    visibles(s).forEach(q => { if (!repondue(q, rep[q.id])) manque[q.id] = true; });
    if (Object.keys(manque).length) { setErreurs(manque); return; }
    setErreurs({});
    if (i + 1 >= sections.length) { setI(sections.length); setVue('recap'); } else setI(i + 1);
  };
  const nettoyer = () => {
    const out = {};
    sections.forEach(s => visibles(s).forEach(q => { if (rep[q.id]) out[q.id] = { ...rep[q.id], texte: lisible(q, rep[q.id]), section: s.nom, question: q.label }; }));
    return out;
  };
  const Sauve = () => (
    <span class={'qc-sauve qc-sauve--' + etatSauve}>
      {etatSauve === 'ok' && <Icone nom="cloud-check" taille={15} />}
      {etatSauve === 'envoi' ? 'Enregistrement…' : etatSauve === 'local' ? 'Gardé sur ce téléphone' : 'Enregistré'}
    </span>
  );
  const Segments = ({ jusque }) => (
    <div class="qc-seg">{sections.map((s, k) => <i class={k < jusque ? 'f' : k === jusque ? 'c' : ''} />)}</div>
  );

  // ----- Accueil : les sections et ou on en est -----
  if (vue === 'accueil') {
    const courante = Math.min(i, sections.length - 1);
    const fini = i >= sections.length;
    return (
      <div class="pg-coach pg-qc">
        <Entete sansBandeau retour={onFermer} />
        <div class="qc-haut"><span>Questionnaire</span><Sauve /></div>
        <p class="qc-sur">{type === 'maj' ? 'MISE À JOUR' : 'PAIEMENT REÇU'}</p>
        <h1 class="qc-titre">{type === 'maj' ? 'Ton bilan du mois' : 'Ton programme commence ici'}</h1>
        <p class="qc-sous">{sections.filter(x => !x.facultative).length} petites sections{sections.some(x => x.facultative) ? ' et un bonus' : ''}. Tu peux t'arrêter quand tu veux, tout est gardé.</p>
        <div class="qc-carte qc-liste">
          {sections.map((s, k) => {
            const ok = k < i && complete(s);
            const accessible = k <= i;
            return (
              <button type="button" class="qc-ligne" disabled={!accessible} onClick={() => { setI(k); setVue('section'); }}>
                <span class="qc-ic"><Icone nom={s.icone} taille={17} /></span>
                <span class="qc-ligne-nom">{s.nom}{s.facultative && <em> · facultatif</em>}</span>
                {ok ? <span class="qc-ok"><Icone nom="circle-check" taille={18} /></span>
                  : k === courante && !fini ? <span class="qc-encours">{i === 0 && !touche.current && !b ? '' : 'En cours'}</span> : null}
              </button>
            );
          })}
        </div>
        <button class="qc-cta" onClick={() => setVue(fini ? 'recap' : 'section')}>
          {fini ? 'Voir le récapitulatif' : (i === 0 && !b ? 'Commencer' : 'Reprendre · ' + sections[courante].nom)}
        </button>
      </div>
    );
  }

  // ----- Recapitulatif + consentements K -----
  if (vue === 'recap') {
    const manqueK = CONSENTEMENTS.filter(c => c.requis && !consent[c.id]);
    return (
      <div class="pg-coach pg-qc">
        <Entete sansBandeau retour={() => { setI(sections.length - 1); setVue('section'); }} />
        <div class="qc-haut"><span>Récapitulatif</span><Sauve /></div>
        <Segments jusque={sections.length} />
        <p class="qc-sur">DERNIÈRE ÉTAPE</p>
        <h1 class="qc-titre">Tout est bon ?</h1>
        <p class="qc-sous">Vérifie, puis envoie à ton coach.</p>
        {sections.map((s, k) => {
          const lignes = visibles(s).filter(q => rep[q.id] && lisible(q, rep[q.id]) !== '—');
          if (!lignes.length) return null;
          return (
            <div class="qc-carte qc-recap">
              <div class="qc-recap-tete">
                <span class="qc-ic"><Icone nom={s.icone} taille={17} /></span>
                <span class="qc-ligne-nom">{s.nom}</span>
                <button class="qc-modif" onClick={() => { setI(k); setVue('section'); }}>Modifier</button>
              </div>
              {lignes.map(q => <p class="qc-rl"><span>{q.label}</span><b>{lisible(q, rep[q.id])}</b></p>)}
            </div>
          );
        })}
        {alerteSante(rep) && <p class="qc-alerte">Tu as signalé un point de santé. Montre ton plan à ton médecin avant de le commencer.</p>}
        <div class="qc-carte">
          {CONSENTEMENTS.map(c => (
            <label class={'qc-consent' + (erreurs['k_' + c.id] ? ' qc-carte--err' : '')}>
              <input type="checkbox" checked={!!consent[c.id]} onChange={e => { touche.current = true; setConsent(x => ({ ...x, [c.id]: e.currentTarget.checked })); setErreurs(x => ({ ...x, ['k_' + c.id]: false })); }} />
              <span>{c.texte}{!c.requis && <em> (facultatif)</em>}</span>
            </label>
          ))}
        </div>
        {manqueK.some(c => erreurs['k_' + c.id]) && <p class="qc-err">Coche les cases obligatoires pour envoyer.</p>}
        <button class="qc-cta" onClick={() => {
          if (manqueK.length) { setErreurs(Object.fromEntries(manqueK.map(c => ['k_' + c.id, true]))); return; }
          onTermine(nettoyer(), alerteSante(rep), { allergieGrave: allergieGrave(rep), consentements: consent });
        }}>Envoyer à mon coach</button>
        <p class="qc-note">Tu recevras ton plan dans l'app et par e-mail.</p>
      </div>
    );
  }

  // ----- Une section -----
  const s = sections[i];
  return (
    <div class="pg-coach pg-qc">
      <Entete sansBandeau retour={() => { setErreurs({}); if (i === 0) setVue('accueil'); else setI(i - 1); }} />
      <div class="qc-haut"><span>{s.facultative ? 'Bonus' : `Section ${i + 1} sur ${sections.filter(x => !x.facultative).length}`}</span><Sauve /></div>
      <Segments jusque={i} />
      <p class="qc-sur">{s.nom.toUpperCase()}</p>
      <h1 class="qc-titre">{s.titre}</h1>
      <p class="qc-sous">{s.sous}</p>
      {visibles(s).map(q => <Question key={q.id} q={q} rep={rep[q.id]} toutes={rep} maj={maj(q.id)} erreur={erreurs[q.id]} />)}
      {Object.values(erreurs).some(Boolean) && <p class="qc-err qc-err--bas">Il manque une réponse plus haut.</p>}
      <button class="qc-cta" onClick={suivant}>{i === sections.length - 1 ? 'Voir le récapitulatif' : 'Continuer'}</button>
      {s.facultative && <button class="qc-passer" onClick={() => { setErreurs({}); setI(sections.length); setVue('recap'); }}>Passer cette section</button>}
      <button class="qc-pause" onClick={() => setVue('accueil')}>Finir plus tard</button>
    </div>
  );
}
