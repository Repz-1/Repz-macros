import { useEffect, useRef, useState } from 'preact/hooks';
import { objectifs, totauxJour, kcalRestantes, nouvelleJournee, donneesPretes } from '../store/journal.js';
import { t } from '../i18n/index.js';

// ============================================================
// CARTE CALORIES
// Point focal de la page. Toute la hierarchie converge ici :
// c'est le premier element que l'oeil doit atteindre apres le logo.
// ============================================================

/** Nombre qui rejoint sa valeur cible au lieu de sauter dessus. */
function useNombreAnime(cible, duree = 650) {
  const [valeur, setValeur] = useState(cible);
  const depart = useRef(cible);
  const debut = useRef(0);
  const image = useRef(0);

  useEffect(() => {
    if (valeur === cible) return;
    // Respecter le reglage systeme : pas d'animation si l'utilisateur
    // a demande a les reduire.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValeur(cible);
      return;
    }
    depart.current = valeur;
    debut.current = performance.now();

    const avancer = (maintenant) => {
      const p = Math.min(1, (maintenant - debut.current) / duree);
      // Sortie douce : rapide au debut, ralentit a l'arrivee.
      const e = 1 - Math.pow(1 - p, 3);
      setValeur(Math.round(depart.current + (cible - depart.current) * e));
      if (p < 1) image.current = requestAnimationFrame(avancer);
    };
    image.current = requestAnimationFrame(avancer);
    return () => cancelAnimationFrame(image.current);
  }, [cible]);

  return valeur;
}

/** Anneau de progression : trace fin, remplissage fluide. */
function Anneau({ ratio, depasse, enfant }) {
  const TAILLE = 188;
  const EPAISSEUR = 9;          // fin : un anneau epais alourdit la carte
  const r = (TAILLE - EPAISSEUR) / 2;
  const circonference = 2 * Math.PI * r;
  const rempli = Math.min(1, Math.max(0, ratio));

  return (
    <div class="cal-anneau" style={{ width: TAILLE, height: TAILLE }}>
      <svg viewBox={`0 0 ${TAILLE} ${TAILLE}`} class="cal-anneau-svg">
        <circle
          cx={TAILLE / 2} cy={TAILLE / 2} r={r}
          fill="none" stroke="#EFEDE6" stroke-width={EPAISSEUR}
        />
        <circle
          cx={TAILLE / 2} cy={TAILLE / 2} r={r}
          fill="none"
          stroke={depasse ? 'var(--alerte)' : 'var(--anneau)'}
          stroke-width={EPAISSEUR}
          stroke-linecap="round"
          stroke-dasharray={circonference}
          stroke-dashoffset={circonference * (1 - rempli)}
          class="cal-anneau-trace"
        />
      </svg>
      <div class="cal-anneau-centre">{enfant}</div>
    </div>
  );
}

/** Une colonne de macro : titre, valeur, objectif, barre. */
function Macro({ nom, valeur, cible, teinte }) {
  const affiche = useNombreAnime(Math.round(valeur));
  const ratio = cible > 0 ? Math.min(1, valeur / cible) : 0;
  const depasse = cible > 0 && valeur > cible;

  return (
    <div class="cal-macro">
      <div class="cal-macro-nom">{nom}</div>
      <div class="cal-macro-val">
        <b style={depasse ? { color: 'var(--alerte)' } : null}>{affiche}</b>
        <span> / {Math.round(cible)} g</span>
      </div>
      <div class="cal-macro-piste">
        <div
          class="cal-macro-jauge"
          style={{ width: (ratio * 100) + '%', background: depasse ? 'var(--alerte)' : teinte }}
        />
      </div>
    </div>
  );
}

export function DayDashboard() {
  const obj = objectifs.value;
  const tot = totauxJour.value;
  const restant = kcalRestantes.value;
  const pret = donneesPretes.value;

  const depasse = restant < 0;
  const atteint = !depasse && restant <= 50 && tot.kcal > 0;
  const vide = tot.kcal === 0;

  const chiffre = useNombreAnime(Math.abs(Math.round(restant)));
  const consommees = useNombreAnime(Math.round(tot.kcal));
  const ratio = obj.kcal > 0 ? tot.kcal / obj.kcal : 0;

  // Date du jour, en majuscules et abregee : elle situe sans s'imposer.
  const d = new Date();
  const jours = t('days_long').split('|');
  const moisCourt = t('months_min').split('|');
  const dateTexte = `${t('today')}, ${d.getDate()} ${moisCourt[d.getMonth()] || ''}.`;

  return (
    <section class={'carte carte--relief cal' + (pret ? '' : ' cal--chargement')}>

      {/* Ligne date */}
      <div class="cal-date">
        <svg viewBox="0 0 24 24" class="cal-date-ic" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="17" rx="3" />
          <path d="M3 10h18M8 2.5v4M16 2.5v4" />
        </svg>
        <span>{dateTexte}</span>
      </div>

      {/* Compteur : consommees | anneau | objectif */}
      <div class="cal-corps">
        <div class="cal-cote">
          <div class="cal-cote-lb">{t('consumed')}</div>
          <div class="cal-cote-val">{consommees}</div>
        </div>

        <Anneau ratio={ratio} depasse={depasse} enfant={
          <>
            <div class={'cal-num' + (depasse ? ' cal-num--depasse' : '')}>{chiffre}</div>
            <div class="cal-num-lb">
              {vide ? t('kcal_left') : depasse ? t('kcal_over') : atteint ? t('kcal_reached') : t('kcal_left')}
            </div>
          </>
        } />

        <div class="cal-cote">
          <div class="cal-cote-lb">{t('goal')}</div>
          <div class="cal-cote-val">{Math.round(obj.kcal)}</div>
        </div>
      </div>

      <div class="cal-trait" />

      {/* Macros : trois colonnes strictement identiques */}
      <div class="cal-macros">
        <Macro nom={t('proteins')} valeur={tot.prot}  cible={obj.prot}  teinte="var(--mac-prot)" />
        <Macro nom={t('carbs')}    valeur={tot.carbs} cible={obj.carbs} teinte="var(--mac-carbs)" />
        <Macro nom={t('fats')}     valeur={tot.lip}   cible={obj.lip}   teinte="var(--mac-lip)" />
      </div>

      {/* Action secondaire : presente mais jamais concurrente */}
      <button class="cal-reset" onClick={() => {
        if (confirm(t('confirm_new_day'))) nouvelleJournee();
      }}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 0115.5-6.2M21 12a9 9 0 01-15.5 6.2" />
          <path d="M18.5 3v3h-3M5.5 21v-3h3" />
        </svg>
        <span>{t('new_day')}</span>
      </button>
    </section>
  );
}
