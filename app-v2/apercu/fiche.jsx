// Banc d'essai de la fiche d'un jour (ModaleMuscles), avec deux
// scenarios : jour ou une seance Jambes a ete enregistree, et jour
// passe ou la seance prevue n'a jamais eu lieu.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/journal-socle.css';
import '../src/styles/entrainer-carte.css';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { muscleLog } from '../src/store/entrainement.js';
import { seances } from '../src/store/seances.js';
import { planifs, programmeActif } from '../src/store/programme.js';
import { langue } from '../src/i18n/index.js';
import { Entrainer } from '../src/components/Entrainer.jsx';

langue.value = 'fr';
utilisateur.value = { uid: 'test', email: 'coach@belfit.be', displayName: 'Raci', metadata: { creationTime: new Date().toISOString() } };
authPrete.value = true;

const hier = new Date(); hier.setDate(hier.getDate() - 1);
const iso = hier.toISOString().slice(0, 10);

muscleLog.value = {};
seances.value = [{
  id: 's1', iso, ts: Date.now(), titre: 'Jour 3 — Jambes', duree: 3600,
  muscles: ['jambes'],
  exos: [
    { nom: 'Squat Barre (Barre)', mKey: 'jambes', series: [{ kg: 100, reps: 8 }, { kg: 100, reps: 8 }] },
    { nom: 'Presse à cuisses (Machine)', mKey: 'jambes', series: [{ kg: 180, reps: 10 }] },
    { nom: 'Fentes Marchées (Haltères)', mKey: 'jambes', series: [{ kg: 20, reps: 12 }] },
  ],
  nbSeries: 4, tonnage: 3000, records: [],
}];

// Scenario 2 (?cas=prevu) : jour passe, seance au programme jamais
// enregistree. Elle ne doit plus se lire comme une seance faite.
if (new URLSearchParams(location.search).get('cas') === 'prevu') {
  seances.value = [];
  planifs.value = { [iso]: { seanceId: 'p-2', titre: 'Jour 3 — Jambes', sub: '5 exercices · ~60 min' } };
}

// Programme actif : masse-3j, lundi/mercredi/vendredi, depuis 8 jours.
const depuis = new Date(); depuis.setDate(depuis.getDate() - 8);
const isoD = depuis.toISOString().slice(0, 10);
programmeActif.value = { id: 'masse-3j', jours: { 1: 0, 3: 1, 5: 2 }, depuis: isoD };

// ?cas=posees : AUCUN programme, mais deux seances posees a la main
// sur le calendrier. Elles doivent apparaitre dans la carte.
if (new URLSearchParams(location.search).get('cas') === 'posees') {
  programmeActif.value = null;
  const l = new Date(); l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  const jour = (k) => { const d = new Date(l); d.setDate(l.getDate() + k);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  planifs.value = {
    [jour(2)]: { seanceId: 'x1', titre: 'Dos / Biceps', sub: '5 exercices · ~50 min' },
    [jour(4)]: { seanceId: 'x2', titre: 'Jambes', sub: '6 exercices · ~60 min' },
  };
}

// ?cas=fait : la seance de lundi a bien ete enregistree, elle doit
// porter le badge FAIT et compter dans « seances faites cette semaine ».
if (new URLSearchParams(location.search).get('cas') === 'fait') {
  const lundi = new Date(); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  const isoL = lundi.getFullYear() + '-' + String(lundi.getMonth() + 1).padStart(2, '0') + '-' + String(lundi.getDate()).padStart(2, '0');
  seances.value = [...seances.value, {
    id: 's2', iso: isoL, ts: Date.now(), titre: 'Jour 1 — Pecs / Triceps', duree: 3500,
    muscles: ['pecs', 'triceps'], exos: [], nbSeries: 18, tonnage: 4200, records: [],
  }];
}

setInterval(() => { authPrete.value = true; langue.value = 'fr'; }, 100);
render(<Entrainer />, document.getElementById('app'));
window.__iso = iso;
