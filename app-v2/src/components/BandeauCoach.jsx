// Bandeau discret en haut de chaque page (26/09, maquette validee) :
// rappelle au client qui a paye de remplir son questionnaire. Une
// ligne, un appui ouvre le questionnaire. Disparait des l'envoi.
import { useEffect } from 'preact/hooks';
import { chargerProgramme, programme, programmeCharge, dossierCoach } from './BelfitPlus.jsx';
import { etatCoach, demandeQuestionnaire } from '../store/coach.js';
import { ongletActif } from './BottomNav.jsx';

export function BandeauCoach() {
  useEffect(() => { if (!programmeCharge.value) chargerProgramme(); }, []);
  const e = etatCoach(dossierCoach.value, programme.value);
  if (!e.aRemplir || demandeQuestionnaire.value) return null;
  const texte = e.tardif
    ? 'Ta demande a rejoint la file · Remplir'
    : `Remplis ton questionnaire · ${e.restants} jour${e.restants > 1 ? 's' : ''} restant${e.restants > 1 ? 's' : ''}`;
  return (
    <button class="bandeau-coach" onClick={() => { demandeQuestionnaire.value = e.type; ongletActif.value = 'premium'; }}>
      <span class="bandeau-coach-point" aria-hidden="true" />
      <span class="bandeau-coach-txt">{texte}</span>
      <span class="bandeau-coach-fleche" aria-hidden="true">›</span>
    </button>
  );
}
