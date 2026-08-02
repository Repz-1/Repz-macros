import { useState } from 'preact/hooks';
import { signal, effect, computed } from '@preact/signals';
import { rayonDe, RAYONS } from '../data/rayons.js';
import { DB } from '../data/aliments.js';
import { repas } from '../store/journal.js';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { t } from '../i18n/index.js';

// ============================================================
// MES COURSES
// La liste se construit depuis les repas du journal, multipliee
// par le nombre de jours et de personnes, puis triee par rayon
// pour suivre le parcours en magasin.
//
// Les cases cochees et les articles ajoutes a la main survivent a
// une nouvelle generation : perdre sa progression au milieu d'un
// magasin serait insupportable.
// ============================================================

const CHOIX_JOURS = [3, 5, 7];
const CHOIX_PERS = [1, 2, 3, 4];
const DEFAUT = { jours: 5, pers: 1, coches: {}, manuels: [], genere: false };

export const courses = signal({ ...DEFAUT });

let uid = null, pret = false;

effect(() => {
  const u = identite.value;
  if (!u) { uid = null; pret = false; return; }
  if (u === uid) return;
  uid = u; pret = false;
  chargerDonnees(u).then(d => {
    if (uid !== u) return;
    courses.value = (d && d.courses) || { ...DEFAUT };
    pret = true;
  });
});

effect(() => {
  const c = courses.value;
  const u = identite.value;
  if (!u || !pret) return;
  sauvegarder(u, { courses: c });
});

/** Nom affiche en magasin : sans mention de cuisson ni precision technique. */
function nomCourse(nom) {
  return nom
    .replace(/\s*\((cuit|cuite|cru|crue)[^)]*\)/gi, '')
    .replace(/\s+(cuit|cuite|cuits|cuites|cru|crue|crus)\b/gi, '')
    .trim();
}

/** Quantites d'une journee type, tous repas confondus. */
const baseJournee = computed(() => {
  const totaux = {};
  repas.value.forEach(r => {
    (r.ings || []).forEach(i => {
      const nom = nomCourse(i.name);
      if (!totaux[nom]) totaux[nom] = { qty: 0, ref: i.name };
      // La portion d'un aliment a l'unite compte des PIECES : on la
      // ramene en grammes avant de cumuler, l'affichage reconvertit.
      const du = DB[i.name];
      totaux[nom].qty += (du && du.unit) ? (i.portion || 0) * du.unit : (i.portion || 0);
    });
  });
  return Object.entries(totaux).map(([nom, v]) => {
    const d = DB[v.ref];
    return {
      nom,
      qty: v.qty,
      parUnite: d && d.unit ? d.unit : null,
      unite: d && d.unitLabel ? d.unitLabel : 'u',
      cat: rayonDe(v.ref),
    };
  });
});

export function Courses() {
  const c = courses.value;
  const [ajout, setAjout] = useState('');
  const [menu, setMenu] = useState(false);
  const base = baseJournee.value;

  const maj = (o) => { courses.value = { ...courses.value, ...o }; };

  const generer = () => maj({ genere: true });

  const cocher = (nom) => {
    const coches = { ...c.coches };
    if (coches[nom]) delete coches[nom]; else coches[nom] = true;
    maj({ coches });
  };

  const retirer = (nom) => {
    maj({
      manuels: c.manuels.filter(m => m !== nom),
      retires: [...(c.retires || []), nom],
    });
  };

  const ajouterManuel = (e) => {
    e.preventDefault();
    const v = ajout.trim();
    if (!v || c.manuels.includes(v)) { setAjout(''); return; }
    maj({ manuels: [...c.manuels, v] });
    setAjout('');
  };

  // Articles issus du journal, multiplies, moins ceux retires.
  const retires = c.retires || [];
  const duJournal = c.genere
    ? base
        .filter(i => !retires.includes(i.nom))
        .map(i => ({ ...i, qty: i.qty * c.jours * c.pers }))
    : [];

  const manuels = c.manuels
    .filter(m => !retires.includes(m))
    .map(m => ({ nom: m, qty: null, parUnite: null, unite: '', cat: rayonDe(m) }));

  const tous = [...duJournal, ...manuels];

  // Articles qu'il reste a prendre : le compteur au-dessus de la liste.
  const restants = tous.filter(i => !c.coches[i.nom]).length;

  const parRayon = RAYONS
    .map(r => ({ ...r, liste: tous.filter(i => i.cat === r.k) }))
    .filter(r => r.liste.length);

  const partager = async () => {
    const lignes = [t('co_share_title'), ''];
    parRayon.forEach(r => {
      const dedans = r.liste.filter(i => !c.coches[i.nom]);
      if (!dedans.length) return;
      lignes.push(r.emo + ' ' + t('ray_' + r.k).toUpperCase());
      dedans.forEach(i => lignes.push('  • ' + i.nom + (i.qty ? ' — ' + quantite(i) : '')));
      lignes.push('');
    });
    const texte = lignes.join('\n');
    try {
      if (navigator.share) await navigator.share({ text: texte });
      else await navigator.clipboard.writeText(texte);
    } catch (err) { /* partage annule */ }
  };

  return (
    <div class="crs">
      {/* En-tete : titre centre entre deux boutons ronds, d'apres la
          maquette mesuree (bouton 36 pt, titre 20 pt). */}
      <div class="crs-barre">
        <button class="crs-rond" onClick={() => { ongletActif.value = 'journal'; }} aria-label="Retour">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h2>{t('co_title')}</h2>
        <button class="crs-rond" onClick={() => setMenu(v => !v)} aria-label="Options">
          <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
        </button>
      </div>

      {/* Carte de preparation : bandeau illustre, puis les deux
          reglages, puis le bouton de generation. */}
      <div class="crs-prep">
        <div class="crs-hero">
          <span class="crs-hero-photo" aria-hidden="true" />
          <span class="crs-hero-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7z" /><path d="M9 8V6a3 3 0 016 0v2" /></svg>
          </span>
          <h3>Tes courses<br />intelligentes</h3>
          <p>Générées automatiquement<br />à partir de tes repas.</p>
          <p class="crs-hero-tag">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.7 5.3H19l-4.3 3.2 1.6 5.2L12 13.4 7.7 16.7l1.6-5.2L5 8.3h5.3z" /></svg>
            100% adaptées à ton plan
          </p>
        </div>

        <div class="crs-reglage">
          <p class="crs-q">{t('co_days_q')}</p>
          <div class="crs-seg crs-seg--jours">
            {CHOIX_JOURS.map(n => (
              <button key={n} class={c.jours === n ? 'on' : ''} onClick={() => maj({ jours: n })}>
                {n} {t('jours_court')}
              </button>
            ))}
          </div>

          <p class="crs-q">{t('co_people_q')}</p>
          <div class="crs-seg crs-seg--pers">
            {CHOIX_PERS.map(n => (
              <button key={n} class={c.pers === n ? 'on' : ''} onClick={() => maj({ pers: n })}>
                {n === 4 ? '4+' : n}
              </button>
            ))}
          </div>

          <button class="crs-generer" disabled={!base.length} onClick={generer}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.7 5.3H19l-4.3 3.2 1.6 5.2L12 13.4 7.7 16.7l1.6-5.2L5 8.3h5.3z" /></svg>
            {t('co_generate')}
          </button>
          {!base.length && <p class="crs-note">{t('co_note_vide')}</p>}
        </div>
      </div>

      {/* Liste par rayon */}
      {tous.length > 0 && (
        <div class="crs-compte">
          {restants > 0
            ? t('co_restants').replace('{n}', restants)
            : t('co_complete')}
        </div>
      )}

      {parRayon.map(r => (
        <div class="crs-rayon" key={r.k}>
          <div class="crs-rayon-tete">
            <span class="crs-emo">{r.emo}</span>
            <span>{t('ray_' + r.k)}</span>
            <i class="crs-nb">{r.liste.filter(i => !c.coches[i.nom]).length}/{r.liste.length}</i>
          </div>
          <div class="crs-carte">
            {r.liste.map(i => {
              const coche = !!c.coches[i.nom];
              return (
                <div class={'crs-item' + (coche ? ' fait' : '')} key={i.nom}>
                  <button class="crs-check" onClick={() => cocher(i.nom)} aria-label="Cocher">
                    {coche ? '✓' : ''}
                  </button>
                  <div class="crs-body" onClick={() => cocher(i.nom)}>
                    <div class="crs-nom">{i.nom}</div>
                    {i.qty != null && <div class="crs-qty">{quantite(i)}</div>}
                  </div>
                  <button class="crs-del" onClick={() => retirer(i.nom)} aria-label="Retirer">✕</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Liste vide : le message monte au centre, sous les reglages,
          au lieu d'attendre une ligne perdue en bas de page. */}
      {!tous.length && (
        <div class="crs-vide">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h16l-1.4 11.2a2 2 0 01-2 1.8H7.4a2 2 0 01-2-1.8z" />
            <path d="M8.5 8V6.2a3.5 3.5 0 017 0V8" />
            <path d="M9.5 12v5M14.5 12v5" />
          </svg>
          <b>Ta liste est vide</b>
          <span>Génère ta liste ou ajoute des produits pour commencer.</span>
        </div>
      )}

      {/* Ajout manuel */}
      <form class="crs-ajout" onSubmit={ajouterManuel}>
        <input
          placeholder={t('co_add_ph')}
          value={ajout}
          onInput={e => setAjout(e.currentTarget.value)}
        />
        <button type="submit">＋</button>
      </form>

      {tous.length > 0 && (
        <div class="crs-actions">
          <button class="crs-partager" onClick={partager}>
            <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
              <path d="M12 3v13" /><path d="M7.5 7.5L12 3l4.5 4.5" />
              <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            {t('co_share_btn')}
          </button>
          <button class="crs-decocher" onClick={() => maj({ coches: {} })}>
            {t('co_uncheck')}
          </button>
        </div>
      )}
    </div>
  );
}

/** Quantite lisible : kilos au-dela de 1000 g, unites si l'aliment se compte. */
function quantite(i) {
  if (i.qty == null) return '';
  if (i.parUnite) {
    const n = Math.ceil(i.qty / i.parUnite);
    return n + ' ' + i.unite + (n > 1 ? 's' : '');
  }
  return i.qty >= 1000
    ? (i.qty / 1000).toFixed(1).replace('.', ',') + ' kg'
    : Math.round(i.qty) + ' g';
}
