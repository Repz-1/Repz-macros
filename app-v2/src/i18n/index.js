import { STRINGS_V1 } from '../legacy/strings.js';
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
    mp_gerer: 'Gérer mes plats',
    compte_gratuit: 'Compte gratuit',
    ou: 'ou',
    mc_plat_btn: 'Enregistrer comme plat', mc_plat_nom: 'Nomme ton plat…', mc_plat_ok: 'Plat enregistré — retrouve-le dans « Mes plats »',
    eat_title: 'Repas intelligent', eat_etat: 'adapté à tes macros',
    recalc_hint: 'Ton objectif date de {avant} kg — tu en es à {maintenant}. Recalcule tes besoins.',
    eat_over: 'Tu finirais à +{n} g de {m}', eat_reste: 'Te laisserait ≈ {n} kcal pour plus tard', eat_surplus: 'Dépasse ton reste d\u2019environ {n} kcal', eat_more: 'Afficher {n} autres idées', eat_done: 'Objectif atteint — belle journée. On se retrouve demain.', macro_prot: 'protéines', macro_carbs: 'glucides', macro_lip: 'lipides',
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
    chrono_titre: 'Chronomètre', chrono_pause: 'Pause', chrono_reprendre: 'Reprendre', chrono_reset: 'Reset', chrono_fermer: 'Fermer', chrono_min: 'min', chrono_sec: 'sec',
    muscles_travailles: 'Muscles travaillés', deconnexion: 'Déconnexion',
    connexion: 'Se connecter', inscription: 'Créer mon compte',
    email: 'Adresse e-mail', mdp: 'Mot de passe',
    revoir: 'Content de te revoir', creer_compte: 'Crée ton compte',
    pas_compte: "Pas encore de compte ? S'inscrire", deja_compte: 'Déjà un compte ? Se connecter',
    mdp_oublie: 'Mot de passe oublié ?',
    recup_titre: 'Mot de passe oublié',
    recup_envoyer: 'Envoyer un lien de réinitialisation',
    recup_envoi: 'Envoi du lien...',
    recup_ok: 'Lien de réinitialisation envoyé à ton email ! Vérifie ta boîte de réception.',
    recup_erreur: "Email non trouvé ou erreur lors de l'envoi",
    recup_retour: 'Retour à la connexion',
    conf_titre: 'Plus qu\'une étape',
    conf_bandeau: 'Confirme ton adresse e-mail pour sécuriser ton compte.',
    conf_intro: 'On vient d\'envoyer un e-mail à {email}. Confirme ton adresse pour débloquer ton programme.',
    conf_fait: 'J\'ai confirmé',
    conf_verif: 'Vérification…',
    conf_renvoyer: 'Renvoyer l\'e-mail',
    conf_renvoye: 'E-mail renvoyé.',
    conf_trop_tot: 'Patiente une minute avant un nouvel envoi.',
    conf_erreur: 'Envoi impossible pour le moment.',
    conf_pas_encore: 'Pas encore confirmé. Vérifie aussi tes indésirables.',
    conf_autre: 'Ce n\'est pas la bonne adresse ?',
    conf_spam: 'Le message peut mettre une minute à arriver.',
    chargement: 'Chargement de ton journal…',
    aujourdhui: "Aujourd'hui", consommees: 'Consommées', objectif: 'Objectif',
    today_prefix: "Aujourd'hui,", total_jour: 'Total du jour', rl_vide: 'Rien encodé',
    qa_courses: 'Liste de courses', qa_calc: 'Calculer mes besoins',

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
    mp_gerer: 'Manage my dishes',
    compte_gratuit: 'Free account',
    ou: 'or',
    mc_plat_btn: 'Save as a dish', mc_plat_nom: 'Name your dish…', mc_plat_ok: 'Dish saved — find it in "My dishes"',
    eat_title: 'Smart meal', eat_etat: 'fits your macros',
    recalc_hint: 'Your target was set at {avant} kg — you are now at {maintenant}. Recalculate your needs.',
    eat_over: 'You\u2019d finish at +{n} g {m}', eat_reste: 'Would leave you ≈ {n} kcal for later', eat_surplus: 'About {n} kcal over what\u2019s left', eat_more: 'Show {n} more ideas', eat_done: 'Target reached — great day. See you tomorrow.', macro_prot: 'protein', macro_carbs: 'carbs', macro_lip: 'fat',
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
    chrono_titre: 'Timer', chrono_pause: 'Pause', chrono_reprendre: 'Resume', chrono_reset: 'Reset', chrono_fermer: 'Close', chrono_min: 'min', chrono_sec: 'sec',
    muscles_travailles: 'Muscles trained', deconnexion: 'Sign out',
    connexion: 'Sign in', inscription: 'Create my account',
    email: 'Email address', mdp: 'Password',
    revoir: 'Welcome back', creer_compte: 'Create your account',
    pas_compte: 'No account yet? Sign up', deja_compte: 'Already registered? Sign in',
    mdp_oublie: 'Forgot password?',
    recup_titre: 'Forgot password',
    recup_envoyer: 'Send a reset link',
    recup_envoi: 'Sending the link...',
    recup_ok: 'Reset link sent to your email! Check your inbox.',
    recup_erreur: 'Email not found, or the message could not be sent',
    recup_retour: 'Back to sign in',
    conf_titre: 'One last step',
    conf_bandeau: 'Confirm your email address to secure your account.',
    conf_intro: 'We just sent an email to {email}. Confirm your address to unlock your programme.',
    conf_fait: 'I have confirmed',
    conf_verif: 'Checking…',
    conf_renvoyer: 'Resend the email',
    conf_renvoye: 'Email sent again.',
    conf_trop_tot: 'Please wait a minute before sending again.',
    conf_erreur: 'Could not send right now.',
    conf_pas_encore: 'Not confirmed yet. Check your spam folder too.',
    conf_autre: 'Wrong address?',
    conf_spam: 'The message can take a minute to arrive.',
    chargement: 'Loading your journal…',
    aujourdhui: 'Today', consommees: 'Consumed', objectif: 'Target',
    today_prefix: 'Today,', total_jour: 'Day total', rl_vide: 'Nothing logged',
    qa_courses: 'Grocery list', qa_calc: 'Calculate my needs',

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
    mp_gerer: 'Mijn gerechten beheren',
    compte_gratuit: 'Gratis account',
    ou: 'of',
    mc_plat_btn: 'Opslaan als gerecht', mc_plat_nom: 'Geef je gerecht een naam…', mc_plat_ok: 'Gerecht opgeslagen — te vinden bij ‘Mijn gerechten’',
    eat_title: 'Slimme maaltijd', eat_etat: 'past bij je macro\u2019s',
    recalc_hint: 'Je doel is berekend op {avant} kg — je zit nu op {maintenant}. Herbereken je behoeften.',
    eat_over: 'Je zou eindigen op +{n} g {m}', eat_reste: 'Laat je ≈ {n} kcal over voor later', eat_surplus: 'Ongeveer {n} kcal boven je rest', eat_more: 'Toon {n} andere idee\u00ebn', eat_done: 'Doel bereikt — mooie dag. Tot morgen.', macro_prot: 'eiwitten', macro_carbs: 'koolhydraten', macro_lip: 'vetten',
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
    chrono_titre: 'Timer', chrono_pause: 'Pauze', chrono_reprendre: 'Hervatten', chrono_reset: 'Reset', chrono_fermer: 'Sluiten', chrono_min: 'min', chrono_sec: 'sec',
    muscles_travailles: 'Getrainde spieren', deconnexion: 'Afmelden',
    connexion: 'Aanmelden', inscription: 'Account aanmaken',
    email: 'E-mailadres', mdp: 'Wachtwoord',
    revoir: 'Welkom terug', creer_compte: 'Maak je account',
    pas_compte: 'Nog geen account? Registreren', deja_compte: 'Al een account? Aanmelden',
    mdp_oublie: 'Wachtwoord vergeten?',
    recup_titre: 'Wachtwoord vergeten',
    recup_envoyer: 'Stuur een herstellink',
    recup_envoi: 'Link versturen...',
    recup_ok: 'Herstellink naar je e-mail gestuurd! Controleer je inbox.',
    recup_erreur: 'E-mail niet gevonden of verzenden mislukt',
    recup_retour: 'Terug naar aanmelden',
    conf_titre: 'Nog één stap',
    conf_bandeau: 'Bevestig je e-mailadres om je account te beveiligen.',
    conf_intro: 'We stuurden net een e-mail naar {email}. Bevestig je adres om je programma te ontgrendelen.',
    conf_fait: 'Ik heb bevestigd',
    conf_verif: 'Controleren…',
    conf_renvoyer: 'E-mail opnieuw sturen',
    conf_renvoye: 'E-mail opnieuw verstuurd.',
    conf_trop_tot: 'Wacht een minuut voor een nieuwe verzending.',
    conf_erreur: 'Verzenden lukt nu niet.',
    conf_pas_encore: 'Nog niet bevestigd. Kijk ook in je ongewenste post.',
    conf_autre: 'Verkeerd adres?',
    conf_spam: 'Het bericht kan een minuut onderweg zijn.',
    chargement: 'Je dagboek laden…',
    aujourdhui: 'Vandaag', consommees: 'Verbruikt', objectif: 'Doel',
    today_prefix: 'Vandaag,', total_jour: 'Dagtotaal', rl_vide: 'Niets gelogd',
    qa_courses: 'Boodschappenlijst', qa_calc: 'Bereken mijn behoeften',

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

export function t(cle, vars) {
  const l = langue.value;
  // Les chaines v2 priment ; on retombe sur le dictionnaire complet de la v1.
  let s = (T[l] && T[l][cle]) || (STRINGS_V1[l] && STRINGS_V1[l][cle])
      || T.fr[cle] || (STRINGS_V1.fr && STRINGS_V1.fr[cle]) || cle;
  // Substitution {k} — meme mecanique que la v1 (i18n.js)
  if (vars) { for (const k in vars) { s = s.replace(new RegExp('{' + k + '}', 'g'), vars[k]); } }
  return s;
}

export const LANGUES = [
  { k: 'fr', label: 'FR' },
  { k: 'en', label: 'EN' },
  { k: 'nl', label: 'NL' },
];
