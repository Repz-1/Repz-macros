// Diagnostic (27/09) : appel reel de l'IA de l'espace coach, sans
// donnees client (petite liste d'aliments + demande). Affiche la reponse.
const code = process.env.COACH_CODE;
const r = await fetch('https://europe-west1-repz-baf60.cloudfunctions.net/espaceCoach', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, action: 'proposer',
    aliments: ['Poulet cuit;165;31;0;3.6', 'Riz cuit;130;2.7;28;0.3', 'Oeuf entier M (50g);155;13;1.1;11;pièce=50g', 'Brocoli cuit;35;2.4;7;0.4'],
    planActuel: [{ nom: 'Déjeuner', ings: [{ name: 'Poulet cuit', portion: 150 }, { name: 'Riz cuit', portion: 200 }] }],
    demande: 'Ajoute un petit-dejeuner avec des oeufs et des legumes au dejeuner.' }),
});
console.log('IA coach :', r.status, (await r.text()).slice(0, 800));
