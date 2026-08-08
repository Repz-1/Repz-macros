import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';

// Demande d'ouverture du calculateur emise par la carte (rappel de
// recalcul) ; consommee par main.jsx qui possede l'etat de la modale.
export const ouvrirCalcDemande = signal(false);
import { objectifs, totauxJourAff, kcalRestantes, donneesPretes, poidsCalcul, rappelIgnoreA, nouvelleJournee, dateJour } from '../store/journal.js';
import { weightLog } from '../store/stats.js';
import { ongletActif } from './BottomNav.jsx';
import { enregistrerJour } from '../store/stats.js';
import { IdeesRepas } from './IdeesRepas.jsx';
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

/** Jauge ouverte, reprise a l'identique de la reference :
    arc de 371 unites sur une circonference de 515.2, rayon 82,
    trait de 13, pivote de 140 degres pour ouvrir vers le bas. */
// Palier de depassement : null, 'jaune' (<=150), 'orange' (<=300),
// 'rouge' (au-dela). Sert a la fois a l'arc et au chiffre central.
export function palierDepassement(surplus) {
  if (surplus <= 0) return null;
  if (surplus <= 150) return 'jaune';
  if (surplus <= 300) return 'orange';
  return 'rouge';
}
const DEGRADE = { jaune: 'url(#calJaugeJaune)', orange: 'url(#calJaugeOrange)', rouge: 'url(#calJaugeAlerte)' };

function Anneau({ ratio, palier, enfant }) {
  const ARC = 371;
  const CIRC = 515.2;
  const rempli = Math.min(1, Math.max(0, ratio));

  // Remplissage anime au premier affichage : l'arc part de zero puis
  // rejoint sa valeur (transition CSS). Respecte prefers-reduced-motion.
  const [pret, setPret] = useState(false);
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPret(true); return;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPret(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const trace = pret ? rempli : 0;

  return (
    <div class="cal-anneau">
      <svg width="184" height="184" viewBox="0 0 190 190" class="cal-anneau-svg">
        <defs>
          {/* Nuances du meme vert / meme rouge : richesse sans changer la teinte */}
          <linearGradient id="calJauge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#34D399" />
            <stop offset="100%" stop-color="#0DA271" />
          </linearGradient>
          {/* Trois paliers de depassement : jaune jusqu'a 150 kcal,
              orange jusqu'a 300, rouge au-dela. */}
          <linearGradient id="calJaugeJaune" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FCD34D" />
            <stop offset="100%" stop-color="#EAB308" />
          </linearGradient>
          <linearGradient id="calJaugeOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FDBA74" />
            <stop offset="100%" stop-color="#EA7C1B" />
          </linearGradient>
          <linearGradient id="calJaugeAlerte" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FCA5A5" />
            <stop offset="100%" stop-color="#EF5350" />
          </linearGradient>
        </defs>
        <circle
          cx="95" cy="95" r="82" fill="none" stroke="#DCECDF" stroke-width="13"
          stroke-linecap="round" stroke-dasharray={`${ARC} 144.2`}
          transform="rotate(140 95 95)"
          class="cal-anneau-piste"
        />
        <circle
          cx="95" cy="95" r="82" fill="none"
          stroke={palier ? DEGRADE[palier] : 'url(#calJauge)'} stroke-width="13"
          stroke-linecap="round"
          stroke-dasharray={`${(trace * ARC).toFixed(1)} ${CIRC}`}
          transform="rotate(140 95 95)"
          class="cal-anneau-lueur"
          aria-hidden="true"
        />
        <circle
          cx="95" cy="95" r="82" fill="none"
          stroke={palier ? DEGRADE[palier] : 'url(#calJauge)'} stroke-width="13"
          stroke-linecap="round"
          stroke-dasharray={`${(trace * ARC).toFixed(1)} ${CIRC}`}
          transform="rotate(140 95 95)"
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
        <b style={{ color: depasse ? 'var(--alerte)' : teinte }}>{affiche}g</b>
        <span> / {Math.round(cible)}g</span>
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
  const tot = totauxJourAff.value;
  const restant = kcalRestantes.value;
  const pret = donneesPretes.value;

  const surplus = Math.max(0, -restant);
  const palier = palierDepassement(surplus);
  const depasse = palier !== null;
  const atteint = !depasse && restant <= 50 && tot.kcal > 0;
  const vide = tot.kcal === 0;

  const chiffre = useNombreAnime(Math.abs(Math.round(restant)));
  const consommees = useNombreAnime(Math.round(tot.kcal));
  const ratio = obj.kcal > 0 ? tot.kcal / obj.kcal : 0;

  // Date du jour, en majuscules et abregee : elle situe sans s'imposer.
  const d = new Date();
  const jours = t('days_long').split('|');
  const moisCourt = t('months_min').split('|');
  const dateTexte = `${t('today')}, ${d.getDate()} ${moisCourt[d.getMonth()] || ''}`;

  // Journee ouverte differente d'aujourd'hui : elle n'a pas ete cloturee.
  // On se contente de le signaler ; rien d'autre ne change dans la carte.
  const isoAuj = new Date().toISOString().slice(0, 10);
  const retard = !!dateJour.value && dateJour.value !== isoAuj;
  const dOuvert = retard ? new Date(dateJour.value + 'T00:00') : null;
  const jourOuvert = dOuvert ? (jours[dOuvert.getDay()] || '').toLowerCase() : '';

  return (
    <section class={'carte carte--relief cal' + (pret ? '' : ' cal--chargement')}
             data-palier={palier || 'ok'}>
      {/* Reponse de la matiere a la lumiere du cadran. Deux couches
          decoratives, aucune information : elles modulent la surface
          de la carte au lieu d'ajouter un halo dans l'air. */}
      <span class="cal-capte" aria-hidden="true" />
      <span class="cal-eclats" aria-hidden="true" />

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

        <Anneau ratio={ratio} palier={palier} enfant={
          <>
            <div class={'cal-num' + (palier ? ' cal-num--' + palier : '')}>{chiffre}</div>
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

      {/* Action principale du jour : « Repas intelligent » (Raci). */}
      <RappelRecalcul />

      <div class="cal-action">
        <IdeesRepas pilulSeule />
      </div>

      {/* Journee laissee ouverte : on le DIT, on ne fait rien d'autre.
          C'est la seule chose ajoutee — pas de couleur, pas de pastille. */}
      {retard && (
        <div class="cal-retard">{t('jour_non_cloture').replace('{j}', jourOuvert)}</div>
      )}

      {/* « Commencer une nouvelle journee » : retire le 27/07 (6967258)
          pour loger « Repas intelligent », et remplace par un archivage
          AUTOMATIQUE au changement de date. Raci n'a jamais demande ce
          retrait, et l'automatisme a efface une journee non terminee le
          8/08. Le bouton revient a l'identique : meme classe, meme SVG,
          memes cles i18n, meme CSS (jamais supprime). */}
      <button class="cal-reset" onClick={() => {
        if (!confirm(t('confirm_new_day'))) return;
        // On archive le total AFFICHE (somme des cartes que l'utilisateur
        // a sous les yeux), pas un second calcul : c'est ce qui creait
        // quelques kcal d'ecart entre l'anneau et l'archive.
        enregistrerJour(totauxJourAff.value, dateJour.value);
        nouvelleJournee();
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

// ============================================================
// RAPPEL DE RECALCUL
// L'objectif a ete calcule pour un certain poids ; quand la derniere
// pesee s'en eloigne d'au moins 3 kg, l'objectif est perime et on le
// dit — au bon moment, dans la carte que l'utilisateur regarde deja.
// Premium : ouvre le calculateur. Gratuit : c'est LE moment de vente,
// le besoin est reel et demontre par ses propres donnees.
// ============================================================
const SEUIL_RECALCUL_KG = 3;

function RappelRecalcul() {
  const base = poidsCalcul.value;
  const log = weightLog.value;
  if (!base || !log.length) return null;
  // Deux formes coexistent : { iso, weight } (v1 importee) et { iso, kg }
  // (fixtures et certains chemins v2). Ne lire que .weight donnait NaN,
  // et le rappel annoncait « tu es a NaN kg ». Stats.jsx et
  // StatsAvancees.jsx toleraient deja les deux ; pas celui-ci.
  const actuel = parseFloat(log[log.length - 1].weight ?? log[log.length - 1].kg);
  if (!isFinite(actuel)) return null;
  if (Math.abs(actuel - base) < SEUIL_RECALCUL_KG) return null;
  // Ferme une fois, le rappel se tait jusqu'a ce que le poids s'eloigne
  // d'un nouveau seuil. On informe, on n'insiste pas : le journal reste
  // parfaitement utilisable avec des objectifs qui datent.
  const ignore = rappelIgnoreA.value;
  if (ignore != null && Math.abs(actuel - ignore) < SEUIL_RECALCUL_KG) return null;

  const aller = () => { ouvrirCalcDemande.value = true; };
  return (
    <div class="cal-rappel">
      <button class="cal-rappel-corps" onClick={aller}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 0115.5-6.2M21 12a9 9 0 01-15.5 6.2" />
          <path d="M18.5 3v3h-3M5.5 21v-3h3" />
        </svg>
        <span>
          {t('recalc_hint')
            .replace('{avant}', Math.round(base))
            .replace('{maintenant}', Math.round(actuel))}
        </span>
      </button>
      <button
        class="cal-rappel-fermer"
        aria-label={t('chrono_fermer')}
        onClick={() => { rappelIgnoreA.value = actuel; }}
      >✕</button>
    </div>
  );
}
