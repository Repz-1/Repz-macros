// Questionnaire du plan coach (26/09, contenu valide par Raci).
// Regle : tout est a choix, avec « Autre » a preciser ; seules les
// reponses qui ne se choisissent pas (poids, dates, traitement,
// message) sont en saisie libre.
// Types : un (choix unique), plusieurs (choix multiples), nombre,
// texte, date. `aucun` : option exclusive dans un choix multiple.
// `si` : la question n'apparait que si la condition est vraie.

const oui = r => (r || {}).valeur === 'Oui';

export const PREMIER_PLAN = [
  { id: 'objectif', titre: 'Ton objectif', sous: 'Ce que tu veux obtenir avec ce plan.', questions: [
    { id: 'objectif', label: 'Ton objectif', type: 'un', autre: true,
      options: ['Perdre du gras', 'Prendre du muscle', 'Recomposition', 'Énergie et santé'] },
    { id: 'poidsVise', label: 'Ton poids visé (kg)', type: 'nombre', min: 30, max: 250 },
    { id: 'echeance', label: 'Une échéance ?', type: 'un',
      options: ['Pas de date', 'Dans 3 mois', 'Dans 6 mois', 'Date précise'] },
    { id: 'echeanceDate', label: 'Quelle date ?', type: 'date', si: r => (r.echeance || {}).valeur === 'Date précise' },
  ]},
  { id: 'sante', titre: 'Ta santé', sous: 'Pour un plan sûr. Tes réponses restent entre toi et ton coach.', sante: true, questions: [
    { id: 'grossesse', label: 'Enceinte ou allaitante ?', type: 'un', options: ['Non', 'Oui', 'Non concernée'] },
    { id: 'maladie', label: 'Une maladie suivie ?', type: 'plusieurs', autre: true, aucun: 'Aucune',
      options: ['Aucune', 'Diabète', 'Hypertension', 'Cholestérol', 'Problème cardiaque', 'Problème rénal', 'Thyroïde', 'Troubles digestifs'] },
    { id: 'troubleAlim', label: 'Un trouble alimentaire, passé ou actuel ?', type: 'un',
      options: ['Non', 'Oui, passé', 'Oui, actuel', 'Je préfère ne pas répondre'] },
    { id: 'traitement', label: 'Un traitement régulier (médicament) ?', type: 'un', options: ['Non', 'Oui'] },
    { id: 'traitementNom', label: 'Lequel ?', type: 'texte', si: r => oui(r.traitement) },
    { id: 'allergies', label: 'Allergies ou intolérances', type: 'plusieurs', autre: true, aucun: 'Aucune',
      options: ['Aucune', 'Lactose', 'Gluten', 'Arachides', 'Fruits à coque', 'Œufs', 'Poisson', 'Crustacés', 'Soja'] },
  ]},
  { id: 'mesures', titre: 'Tes mesures', sous: 'Reprises de ton calcul de besoins. Corrige si ça a changé.', questions: [
    { id: 'poids', label: 'Poids (kg)', type: 'nombre', min: 30, max: 250 },
    { id: 'taille', label: 'Taille (cm)', type: 'nombre', min: 120, max: 230 },
    { id: 'age', label: 'Âge', type: 'nombre', min: 16, max: 99 },
    { id: 'sexe', label: 'Sexe', type: 'un', options: ['Homme', 'Femme'] },
    { id: 'activite', label: 'Ta journée, hors sport', type: 'un',
      options: ['Assis la plupart du temps', 'Debout ou je marche', 'Travail physique'] },
  ]},
  { id: 'rythme', titre: 'Ton rythme', sous: 'Pour caler les repas sur ta journée.', questions: [
    { id: 'repas', label: 'Repas par jour', type: 'un', options: ['3', '4', '5', '6'] },
    { id: 'horaires', label: 'Tes horaires', type: 'un', autre: true, options: ['Journée', 'Nuit', 'Variables'] },
    { id: 'midi', label: 'Le midi, tu manges…', type: 'un', autre: true,
      options: ['À la maison', 'Boîte à lunch', 'Cantine', 'Restaurant ou sandwicherie'] },
    { id: 'cuisine', label: 'Temps pour cuisiner', type: 'un', options: ['Très peu', 'Un peu', "J'aime cuisiner"] },
    { id: 'budget', label: 'Budget courses', type: 'un', options: ['Serré', 'Moyen', 'Pas de limite'] },
    { id: 'sommeil', label: 'Sommeil par nuit', type: 'un', options: ['Moins de 6 h', '6 à 8 h', 'Plus de 8 h'] },
  ]},
  { id: 'entrainement', titre: 'Ton entraînement', sous: 'Ton plan suit ta dépense.', questions: [
    { id: 'seances', label: 'Séances par semaine', type: 'un', options: ['0', '1–2', '3–4', '5 et plus'] },
    { id: 'sport', label: 'Type', type: 'plusieurs', autre: true, si: r => (r.seances || {}).valeur !== '0',
      options: ['Musculation', 'Cardio', 'Sport collectif', 'Sport de combat'] },
  ]},
  { id: 'alimentation', titre: 'Ce que tu manges', sous: 'Pour un plan que tu suivras vraiment.', questions: [
    { id: 'regime', label: 'Régime', type: 'un', autre: true,
      options: ['Tout', 'Sans porc', 'Halal', 'Végétarien', 'Végan'] },
    { id: 'refuses', label: 'Aliments que tu refuses', type: 'plusieurs', autre: true, aucun: 'Aucun',
      options: ['Aucun', 'Poisson', 'Fruits de mer', 'Champignons', 'Abats', 'Produits laitiers', 'Œufs', 'Légumes verts'] },
    { id: 'aimes', label: 'Ce que tu aimes', type: 'plusieurs', autre: true,
      options: ['Viande rouge', 'Poulet', 'Poisson', 'Œufs', 'Pâtes', 'Riz', 'Pommes de terre', 'Légumes', 'Fruits', 'Produits laitiers'] },
    { id: 'complements', label: 'Compléments déjà pris', type: 'plusieurs', autre: true, aucun: 'Aucun',
      options: ['Aucun', 'Whey', 'Créatine', 'Multivitamines', 'Oméga-3', 'Vitamine D', 'Pré-workout ou brûleur'] },
  ]},
  { id: 'fin', titre: 'Le mot de la fin', sous: 'Tout ce qui aide ton coach.', questions: [
    { id: 'difficultes', label: 'Tes difficultés', type: 'plusieurs', autre: true, aucun: 'Aucune',
      options: ['Aucune', 'Grignotage', 'Sucre', 'Faim le soir', 'Restaurants', 'Alcool', 'Manque de temps'] },
    { id: 'regimes', label: 'Régimes déjà essayés', type: 'plusieurs', autre: true, aucun: 'Aucun',
      options: ['Aucun', 'Comptage de calories', 'Jeûne intermittent', 'Keto', 'Sans sucre', 'Programme payant'] },
    { id: 'echec', label: "Pourquoi ça n'a pas tenu ?", type: 'plusieurs', autre: true,
      si: r => (r.regimes || {}).valeurs && r.regimes.valeurs.length && !r.regimes.valeurs.includes('Aucun'),
      options: ['Trop de faim', 'Trop contraignant', 'Pas de résultats', 'Vie sociale'] },
    { id: 'message', label: 'Un message pour ton coach', type: 'texte', facultatif: true },
  ]},
];

export const MISE_A_JOUR = [
  { id: 'bilan', titre: 'Ton bilan du mois', sous: 'Trois minutes pour ajuster ton plan.', questions: [
    { id: 'poids', label: "Ton poids aujourd'hui (kg)", type: 'nombre', min: 30, max: 250 },
    { id: 'tour', label: 'Tour de taille (cm)', type: 'nombre', min: 40, max: 200, facultatif: true },
    { id: 'respect', label: 'Tu as suivi ton plan…', type: 'un', options: ['Moins de 50 %', 'Environ 75 %', 'Presque tout'] },
    { id: 'faim', label: 'Ta faim', type: 'un', options: ['Trop faim', 'Bien', 'Trop mangé'] },
    { id: 'energie', label: 'Ton énergie', type: 'un', options: ['Faible', 'Correcte', 'Bonne'] },
  ]},
  { id: 'suite', titre: 'La suite', sous: 'Ce qui marche, ce qui change.', questions: [
    { id: 'reussi', label: 'Ce qui a bien marché', type: 'plusieurs', autre: true, aucun: 'Rien',
      options: ['Rien', 'Les repas', 'Les horaires', 'Les quantités', "L'entraînement"] },
    { id: 'changer', label: 'Ce que tu veux changer', type: 'plusieurs', autre: true, aucun: 'Rien',
      options: ['Rien', 'Plus de variété', 'Moins de faim', 'Nouvel objectif', 'Horaires différents'] },
    { id: 'traitementNouveau', label: 'Un nouveau traitement ou problème de santé ?', type: 'un', options: ['Non', 'Oui'] },
    { id: 'traitementNom', label: 'Lequel ?', type: 'texte', si: r => oui(r.traitementNouveau) },
    { id: 'message', label: 'Un message pour ton coach', type: 'texte', facultatif: true },
  ]},
];

/** Vrai si une reponse demande l'avis d'un medecin avant le plan. */
export function alerteSante(r) {
  const v = id => (r[id] || {}).valeur;
  const vs = id => ((r[id] || {}).valeurs || []);
  return v('grossesse') === 'Oui'
    || vs('maladie').some(x => x !== 'Aucune')
    || /^Oui/.test(v('troubleAlim') || '')
    || v('traitement') === 'Oui' || v('traitementNouveau') === 'Oui';
}

/** Une question est-elle correctement remplie ? */
export function repondue(q, rep) {
  if (q.facultatif) return true;
  const r = rep || {};
  if (q.type === 'nombre') {
    const n = parseFloat(String(r.valeur || '').replace(',', '.'));
    return !isNaN(n) && n >= (q.min ?? -Infinity) && n <= (q.max ?? Infinity);
  }
  if (q.type === 'texte' || q.type === 'date') return !!String(r.valeur || '').trim();
  if (q.type === 'un') return !!r.valeur && (r.valeur !== 'Autre' || !!String(r.autre || '').trim());
  if (q.type === 'plusieurs') {
    const vs = r.valeurs || [];
    return vs.length > 0 && (!vs.includes('Autre') || !!String(r.autre || '').trim());
  }
  return true;
}

/** Texte lisible d'une reponse (recapitulatif, fiche coach). */
export function lisible(q, rep) {
  const r = rep || {};
  if (q.type === 'plusieurs') {
    return (r.valeurs || []).map(x => x === 'Autre' ? (r.autre || 'Autre') : x).join(', ') || '—';
  }
  if (r.valeur === 'Autre') return r.autre || 'Autre';
  return String(r.valeur ?? '').trim() || '—';
}
