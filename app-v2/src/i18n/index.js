import { signal } from '@preact/signals';

// ============================================================
// I18N v2 — FR (canonique) / EN / NL.
// Langue memorisee localement. t() lit le signal : tout se
// retraduit automatiquement au changement, sans rechargement.
// ============================================================

const CLE = 'belfit_v2_langue';
let init = 'fr';
try {
  const sauve = localStorage.getItem(CLE);
  const nav = (navigator.language || 'fr').slice(0, 2);
  const choix = sauve || nav;
  if (['fr', 'en', 'nl'].includes(choix)) init = choix;
} catch (e) { /* stockage indisponible */ }

export const langue = signal(init);

export function setLangue(l) {
  langue.value = l;
  try { localStorage.setItem(CLE, l); } catch (e) {}
}

const T = {
  fr: {
    nav_journal: 'Journal', nav_entrainer: "S'entraîner", nav_courses: 'Courses',
    nav_stats: 'Stats', nav_premium: 'Premium',
    kcal_restantes: 'kcal restantes', proteines: 'Protéines', glucides: 'Glucides', lipides: 'Lipides',
    modif_objectifs: 'Modifier mes objectifs', calc_besoins: 'Calculer mes besoins',
    nouvelle_journee: 'Commencer une nouvelle journée', ajouter: 'Ajouter',
    quoi_ajouter: "Qu'est-ce que tu ajoutes ?", repas: 'Repas', collation: 'Collation', boisson: 'Boisson',
    ajouter_aliment: 'Ajouter un aliment…', vide: 'Vide', valider: 'Valider',
    idees_repas: 'Idées repas', liste_courses: 'Liste de courses', stats_titre: 'Statistiques',
    poids_actuel: 'Poids actuel', evolution: 'Évolution', seances_mois: 'Séances ce mois',
    evol_poids: 'Évolution du poids', poids_jour: 'Mon poids du jour (kg)', enregistrer: 'Enregistrer',
    programmes: 'Programmes', seance_jour: 'Séance du jour',
    ajouter_exercice: 'Ajouter un exercice…', demarrer: 'Démarrer', arreter: 'Arrêter',
    muscles_travailles: 'Muscles travaillés', deconnexion: 'Déconnexion',
    connexion: 'Se connecter', inscription: 'Créer mon compte',
    email: 'Adresse e-mail', mdp: 'Mot de passe',
    revoir: 'Content de te revoir', creer_compte: 'Crée ton compte',
    pas_compte: "Pas encore de compte ? S'inscrire", deja_compte: 'Déjà un compte ? Se connecter',
    chargement: 'Chargement de ton journal…',
    calc_besoins_court: 'Calculateur', vocal_court: 'Vocal',

    essayer_sans_compte: "Essayer sans compte", invite_note: "Tes données resteront sur cet appareil.",
    invite_bandeau: 'Mode invité — crée un compte pour sauvegarder', mode_invite: 'Mode invité', quitter: 'Quitter',

    jours: 'Jours', personnes: 'Personnes', ajouter_article: 'Ajouter un article…',
    liste_vide: 'Ajoute des aliments à ton journal pour générer ta liste.',
    premium_titre: 'Passe en Premium', premium_sous: 'Ton coaching BelFit complet, avec toutes les fonctionnalités.',
    choisir_formule: 'Choisir cette formule', tu_es_premium: 'Tu es Premium',
    premium_merci: 'Toutes les fonctionnalités sont débloquées. Merci de soutenir BelFit 💪',
  },
  en: {
    nav_journal: 'Journal', nav_entrainer: 'Train', nav_courses: 'Shopping',
    nav_stats: 'Stats', nav_premium: 'Premium',
    kcal_restantes: 'kcal left', proteines: 'Protein', glucides: 'Carbs', lipides: 'Fat',
    modif_objectifs: 'Edit my targets', calc_besoins: 'Calculate my needs',
    nouvelle_journee: 'Start a new day', ajouter: 'Add',
    quoi_ajouter: 'What are you adding?', repas: 'Meal', collation: 'Snack', boisson: 'Drink',
    ajouter_aliment: 'Add a food…', vide: 'Empty', valider: 'Confirm',
    idees_repas: 'Meal ideas', liste_courses: 'Shopping list', stats_titre: 'Statistics',
    poids_actuel: 'Current weight', evolution: 'Change', seances_mois: 'Sessions this month',
    evol_poids: 'Weight trend', poids_jour: "Today's weight (kg)", enregistrer: 'Save',
    programmes: 'Programs', seance_jour: "Today's session",
    ajouter_exercice: 'Add an exercise…', demarrer: 'Start', arreter: 'Stop',
    muscles_travailles: 'Muscles trained', deconnexion: 'Sign out',
    connexion: 'Sign in', inscription: 'Create my account',
    email: 'Email address', mdp: 'Password',
    revoir: 'Welcome back', creer_compte: 'Create your account',
    pas_compte: 'No account yet? Sign up', deja_compte: 'Already registered? Sign in',
    chargement: 'Loading your journal…',
    calc_besoins_court: 'Calculator', vocal_court: 'Voice',

    essayer_sans_compte: 'Try without an account', invite_note: 'Your data stays on this device.',
    invite_bandeau: 'Guest mode — create an account to save', mode_invite: 'Guest mode', quitter: 'Exit',

    jours: 'Days', personnes: 'People', ajouter_article: 'Add an item…',
    liste_vide: 'Add foods to your journal to build your list.',
    premium_titre: 'Go Premium', premium_sous: 'Your full BelFit coaching, with every feature.',
    choisir_formule: 'Choose this plan', tu_es_premium: 'You are Premium',
    premium_merci: 'All features unlocked. Thanks for supporting BelFit 💪',
  },
  nl: {
    nav_journal: 'Dagboek', nav_entrainer: 'Trainen', nav_courses: 'Boodschappen',
    nav_stats: 'Stats', nav_premium: 'Premium',
    kcal_restantes: 'kcal over', proteines: 'Eiwitten', glucides: 'Koolhydraten', lipides: 'Vetten',
    modif_objectifs: 'Mijn doelen aanpassen', calc_besoins: 'Mijn behoefte berekenen',
    nouvelle_journee: 'Nieuwe dag starten', ajouter: 'Toevoegen',
    quoi_ajouter: 'Wat voeg je toe?', repas: 'Maaltijd', collation: 'Snack', boisson: 'Drank',
    ajouter_aliment: 'Voedingsmiddel toevoegen…', vide: 'Leeg', valider: 'Bevestigen',
    idees_repas: 'Maaltijdideeën', liste_courses: 'Boodschappenlijst', stats_titre: 'Statistieken',
    poids_actuel: 'Huidig gewicht', evolution: 'Evolutie', seances_mois: 'Sessies deze maand',
    evol_poids: 'Gewichtsevolutie', poids_jour: 'Mijn gewicht vandaag (kg)', enregistrer: 'Opslaan',
    programmes: "Programma's", seance_jour: 'Sessie van vandaag',
    ajouter_exercice: 'Oefening toevoegen…', demarrer: 'Starten', arreter: 'Stoppen',
    muscles_travailles: 'Getrainde spieren', deconnexion: 'Afmelden',
    connexion: 'Aanmelden', inscription: 'Account aanmaken',
    email: 'E-mailadres', mdp: 'Wachtwoord',
    revoir: 'Welkom terug', creer_compte: 'Maak je account',
    pas_compte: 'Nog geen account? Registreren', deja_compte: 'Al een account? Aanmelden',
    chargement: 'Je dagboek laden…',
    calc_besoins_court: 'Calculator', vocal_court: 'Spraak',

    essayer_sans_compte: 'Proberen zonder account', invite_note: 'Je gegevens blijven op dit toestel.',
    invite_bandeau: 'Gastmodus — maak een account om op te slaan', mode_invite: 'Gastmodus', quitter: 'Sluiten',

    jours: 'Dagen', personnes: 'Personen', ajouter_article: 'Artikel toevoegen…',
    liste_vide: 'Voeg voeding toe aan je dagboek om je lijst te maken.',
    premium_titre: 'Word Premium', premium_sous: 'Je volledige BelFit-coaching, met alle functies.',
    choisir_formule: 'Kies dit plan', tu_es_premium: 'Je bent Premium',
    premium_merci: 'Alle functies zijn ontgrendeld. Bedankt voor je steun 💪',
  },
};

export function t(cle) {
  const l = langue.value;
  return (T[l] && T[l][cle]) || T.fr[cle] || cle;
}

export const LANGUES = [
  { k: 'fr', label: 'FR' },
  { k: 'en', label: 'EN' },
  { k: 'nl', label: 'NL' },
];
