import { t } from '../i18n/index.js';
import { portraitSeanceDuJour, ETAT, abandonnerSeance, supprimerSeanceFaite, demandeVueEntrainer } from '../store/seance-active.js';
import { ongletActif } from './BottomNav.jsx';
import { useState } from 'preact/hooks';
import '../styles/seance-jour.css';

function allerEntrainer(vue, params) {
  ongletActif.value = 'entrainer';
  demandeVueEntrainer.value = { nom: vue, params: params || null };
}

function ctaPour(etat) {
  if (etat === ETAT.PREVUE) return t('sj_demarrer');
  if (etat === ETAT.EN_COURS) return t('sj_reprendre');
  if (etat === ETAT.BROUILLON) return t('sj_continuer');
  if (etat === ETAT.VIDE) return t('sj_composer');
  return '';
}

function metaPour(p) {
  const bits = [];
  if (p.etat === ETAT.PREVUE) bits.push(t('sj_prevue'));
  else if (p.etat === ETAT.BROUILLON) bits.push(t('sj_brouillon'));
  else if (p.etat === ETAT.EN_COURS) bits.push(t('sj_en_cours'));
  else if (p.etat === ETAT.FAITE) bits.push(t('sj_faite'));
  if (p.nExos) bits.push(p.nExos + ' ' + t('ms_exercises'));
  return bits.join(' · ');
}

export function CarteSeanceJour() {
  const p = portraitSeanceDuJour();
  const [confirme, setConfirme] = useState(false);

  const ouvrir = () => {
    if (p.etat === ETAT.PREVUE && p.seanceId) {
      allerEntrainer('seanceDetail', { seanceId: p.seanceId, titre: p.titre, depuis: 'journal' });
      return;
    }
    if (p.etat === ETAT.BROUILLON || p.etat === ETAT.EN_COURS) {
      allerEntrainer(p.origine === 'programme' ? 'seanceDetail' : 'maseance',
        p.seanceId ? { seanceId: p.seanceId, titre: p.titre } : null);
      return;
    }
    allerEntrainer('selection');
  };

  const jeter = () => {
    if (p.etat === ETAT.FAITE && p.idLog) {
      supprimerSeanceFaite(p.idLog);
    } else {
      abandonnerSeance();
    }
    setConfirme(false);
  };

  const jetable = p.etat === ETAT.BROUILLON || p.etat === ETAT.EN_COURS || p.etat === ETAT.FAITE;
  const live = p.etat === ETAT.BROUILLON || p.etat === ETAT.EN_COURS;
  const cta = ctaPour(p.etat);
  const meta = p.etat === ETAT.VIDE ? '' : metaPour(p);
  const nom = p.etat === ETAT.VIDE ? t('sj_vide_court') : (p.titre || t('seance_jour'));
  const classe = 'sj sj--bande'
    + (p.etat === ETAT.VIDE ? ' sj--vide' : '')
    + (p.etat === ETAT.FAITE ? ' sj--faite' : '')
    + (live ? ' sj--live' : '');

  return (
    <section class={classe}>
      <button class="sj-ligne" type="button" onClick={ouvrir}>
        <svg class="sj-ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
        </svg>
        <span class="sj-texte">
          <span class="sj-nom">{nom}</span>
          {meta ? <span class="sj-meta">{meta}</span> : null}
        </span>
        {cta ? <span class="sj-cta">{cta}</span> : null}
      </button>
      {jetable && (
        <button
          class="sj-x"
          type="button"
          aria-label={p.etat === ETAT.FAITE ? t('sea_supprimer_log') : t('sea_abandonner')}
          onClick={() => setConfirme(true)}
        >×</button>
      )}
      {confirme && jetable && (
        <div class="sj-voile" onClick={() => setConfirme(false)}>
          <div class="sj-voile-carte" onClick={(e) => e.stopPropagation()}>
            <p>{p.etat === ETAT.FAITE ? t('sea_supprimer_log') : t('sea_abandonner_t')}</p>
            <p>{p.etat === ETAT.FAITE ? t('sea_supprimer_log_q') : t('sea_abandonner_q')}</p>
            <button class="sj-go sj-go--danger" type="button" onClick={jeter}>
              {p.etat === ETAT.FAITE ? t('sea_supprimer_log') : t('sea_abandonner_ok')}
            </button>
            <button class="sj-annuler" type="button" onClick={() => setConfirme(false)}>
              {t('sea_abandonner_no')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
