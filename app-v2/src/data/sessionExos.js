// ============================================================
// EXERCICES DE CHAQUE SEANCE DE PROGRAMME
//
// Les references sont des NOMS, « groupe:Nom exact », et non plus des
// positions « groupe:3 ».
//
// Pourquoi : le 10/08 Raci signale que les seances sont melangees —
// « dans dos il y a du triceps, jambes, tout est mixe ». Verifie :
// ce fichier pointait par POSITION dans les tableaux de
// data/exercices.js. Quand il a ete ecrit, dos[0..3] valaient
// Tractions, Rowing barre, Tirage vertical, Rowing haltere. La base
// a ensuite ete remplacee par 369 exercices tries alphabetiquement,
// et dos[0..3] sont devenus « Extension Dos », « Extension Triceps
// Incline », « Flexion Buste Avant »… Les 86 seances servaient donc
// des exercices arbitraires, sans qu'aucune erreur ne se produise.
//
// Un nom ne se decale pas quand la liste est retriee. C'est la seule
// raison de ce changement de format.
//
// Les intentions d'origine ont ete recuperees dans l'ancienne base
// (commit 607cef8) puis rattachees a la nouvelle par une table de
// correspondance ecrite a la main, 56 entrees, toutes verifiees comme
// existant reellement. Certains exercices au poids du corps n'ont pas
// d'equivalent dans la base actuelle (pont fessier, dips entre bancs,
// squat au poids du corps) : le plus proche disponible a ete retenu.
// ============================================================

export const SESSION_EXOS = {
  "masse-3j-0": [
    "pecs:Développé Couché (Barre)",
    "pecs:Développé Couché Incliné (Haltère)",
    "pecs:Écarté (Pec Deck) (Machine)",
    "triceps:Barre au Front (Barre EZ)",
    "triceps:Extension Triceps (Poulie)",
    "triceps:Dips"
  ],
  "masse-3j-1": [
    "dos:Rowing (Barre)",
    "dos:Tractions",
    "dos:Tirage Poitrine (Poulie)",
    "dos:Rowing Un Bras (Haltère)",
    "biceps:Curl Biceps (Barre)",
    "biceps:Curl Marteau (Haltère)"
  ],
  "masse-3j-2": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Mollets Debout (Machine)",
    "epaules:Développé Militaire Debout (Barre)",
    "epaules:Élévation Latérale (Haltère)"
  ],
  "masse-4j-0": [
    "pecs:Développé Couché (Barre)",
    "pecs:Développé Couché Incliné (Haltère)",
    "pecs:Développé Couché (Haltère)",
    "pecs:Écarté (Pec Deck) (Machine)",
    "pecs:Développé Couché Décliné (Barre)"
  ],
  "masse-4j-1": [
    "dos:Tractions",
    "dos:Rowing (Barre)",
    "dos:Tirage Poitrine (Poulie)",
    "dos:Rowing Un Bras (Haltère)",
    "dos:Rowing Assis (Poulie)"
  ],
  "masse-4j-2": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Fentes (Haltère)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Jambes (Machine)"
  ],
  "masse-4j-3": [
    "epaules:Développé Militaire Debout (Barre)",
    "epaules:Élévation Latérale (Haltère)",
    "epaules:Oiseau Penché Arrière (Haltère)",
    "biceps:Curl Biceps (Barre)",
    "triceps:Barre au Front (Barre EZ)",
    "triceps:Extension Triceps (Poulie)"
  ],
  "masse-5j-0": [
    "pecs:Développé Couché (Barre)",
    "pecs:Développé Couché Incliné (Haltère)",
    "pecs:Développé Couché (Haltère)",
    "pecs:Écarté (Pec Deck) (Machine)",
    "pecs:Développé Couché Décliné (Barre)"
  ],
  "masse-5j-1": [
    "dos:Tractions",
    "dos:Rowing (Barre)",
    "dos:Tirage Poitrine (Poulie)",
    "dos:Rowing Un Bras (Haltère)",
    "dos:Rowing Debout (Haltère)"
  ],
  "masse-5j-2": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Fentes (Haltère)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Jambes (Machine)",
    "jambes:Extension Mollets Debout (Machine)"
  ],
  "masse-5j-3": [
    "epaules:Développé Militaire Debout (Barre)",
    "epaules:Élévation Latérale (Haltère)",
    "epaules:Élévation Frontale Latérales Avant (Haltère)",
    "epaules:Oiseau Penché Arrière (Haltère)",
    "epaules:Oiseau Arrière (Poulie)"
  ],
  "masse-5j-4": [
    "biceps:Curl Biceps (Barre)",
    "biceps:Curl Biceps (Haltère)",
    "biceps:Curl Marteau (Haltère)",
    "triceps:Barre au Front (Barre EZ)",
    "triceps:Extension Triceps (Poulie)",
    "triceps:Extension Triceps Un Bras (Haltère)"
  ],
  "deb-full-3j-0": [
    "pecs:Développé Couché (Barre)",
    "dos:Rowing (Barre)",
    "jambes:Squat (Barre)",
    "epaules:Développé Militaire Debout (Barre)",
    "abdos:Planche"
  ],
  "deb-full-3j-1": [
    "pecs:Pompes",
    "dos:Tirage Poitrine (Poulie)",
    "jambes:Presse à Cuisses (Machine)",
    "biceps:Curl Biceps (Barre)",
    "abdos:Crunch"
  ],
  "deb-full-3j-2": [
    "pecs:Développé Couché Incliné (Haltère)",
    "dos:Tractions",
    "jambes:Fentes (Haltère)",
    "triceps:Extension Triceps (Poulie)",
    "abdos:Rotation Russe"
  ],
  "deb-2j-0": [
    "pecs:Développé Couché (Barre)",
    "dos:Tirage Poitrine (Poulie)",
    "epaules:Élévation Latérale (Haltère)",
    "biceps:Curl Biceps (Barre)",
    "triceps:Extension Triceps (Poulie)"
  ],
  "deb-2j-1": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Leg Curl Allongé (Machine)",
    "abdos:Planche",
    "abdos:Crunch"
  ],
  "seche-full-3j-0": [
    "jambes:Squat (Barre)",
    "pecs:Pompes",
    "dos:Tirage Poitrine (Poulie)",
    "epaules:Élévation Latérale (Haltère)",
    "abdos:Relevé de Jambes Suspendu",
    "jambes:Fentes (Haltère)",
    "abdos:Planche"
  ],
  "seche-full-3j-1": [
    "jambes:Presse à Cuisses (Machine)",
    "pecs:Développé Couché (Barre)",
    "dos:Rowing (Barre)",
    "triceps:Extension Triceps (Poulie)",
    "abdos:Rotation Russe",
    "jambes:Extension Mollets Debout (Machine)",
    "abdos:Crunch"
  ],
  "seche-full-3j-2": [
    "jambes:Fentes (Haltère)",
    "pecs:Développé Couché Incliné (Haltère)",
    "dos:Tractions",
    "biceps:Curl Biceps (Barre)",
    "abdos:Rotation Russe",
    "jambes:Leg Curl Allongé (Machine)",
    "abdos:Relevé de Jambes Suspendu"
  ],
  "seche-circuit-4j-0": [
    "pecs:Développé Couché (Barre)",
    "dos:Tirage Poitrine (Poulie)",
    "epaules:Élévation Latérale (Haltère)",
    "biceps:Curl Biceps (Barre)",
    "triceps:Extension Triceps (Poulie)",
    "pecs:Pompes"
  ],
  "seche-circuit-4j-1": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Fentes (Haltère)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Mollets Debout (Machine)",
    "abdos:Planche"
  ],
  "seche-circuit-4j-2": [
    "pecs:Pompes",
    "dos:Tractions",
    "jambes:Squat (Barre)",
    "epaules:Développé Militaire Debout (Barre)",
    "biceps:Curl Marteau (Haltère)",
    "abdos:Crunch"
  ],
  "seche-circuit-4j-3": [
    "abdos:Crunch",
    "abdos:Planche",
    "abdos:Rotation Russe"
  ],
  "maison-halteres-3j-0": [
    "pecs:Développé Couché (Haltère)",
    "epaules:Presse Épaules (Haltère)",
    "biceps:Curl Biceps (Haltère)",
    "triceps:Extension Triceps Un Bras (Haltère)",
    "abdos:Planche"
  ],
  "maison-halteres-3j-1": [
    "jambes:Fentes (Haltère)",
    "jambes:Squat (Barre)",
    "jambes:Extension Mollets Debout (Machine)",
    "abdos:Rotation Russe",
    "abdos:Crunch"
  ],
  "maison-halteres-3j-2": [
    "pecs:Développé Couché (Haltère)",
    "dos:Rowing Un Bras (Haltère)",
    "epaules:Presse Épaules (Haltère)",
    "biceps:Curl Biceps (Haltère)",
    "jambes:Fentes (Haltère)",
    "abdos:Planche"
  ],
  "salle-ppl-3j-0": [
    "pecs:Développé Couché (Barre)",
    "pecs:Développé Couché Incliné (Haltère)",
    "epaules:Développé Militaire Debout (Barre)",
    "epaules:Élévation Latérale (Haltère)",
    "triceps:Extension Triceps (Poulie)",
    "triceps:Barre au Front (Barre EZ)"
  ],
  "salle-ppl-3j-1": [
    "dos:Tractions",
    "dos:Rowing (Barre)",
    "dos:Tirage Poitrine (Poulie)",
    "dos:Rowing Un Bras (Haltère)",
    "biceps:Curl Biceps (Barre)",
    "biceps:Curl Marteau (Haltère)"
  ],
  "salle-ppl-3j-2": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Fentes (Haltère)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Jambes (Machine)",
    "jambes:Extension Mollets Debout (Machine)"
  ],
  "salle-half-4j-0": [
    "pecs:Développé Couché (Barre)",
    "dos:Rowing (Barre)",
    "epaules:Développé Militaire Debout (Barre)",
    "biceps:Curl Biceps (Barre)",
    "triceps:Barre au Front (Barre EZ)",
    "abdos:Planche"
  ],
  "salle-half-4j-1": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Jambes (Machine)",
    "jambes:Extension Mollets Debout (Machine)",
    "abdos:Crunch"
  ],
  "salle-half-4j-2": [
    "pecs:Développé Couché Incliné (Haltère)",
    "dos:Tractions",
    "epaules:Élévation Latérale (Haltère)",
    "biceps:Curl Marteau (Haltère)",
    "triceps:Extension Triceps (Poulie)",
    "abdos:Rotation Russe"
  ],
  "salle-half-4j-3": [
    "jambes:Fentes (Haltère)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Soulevé de Terre Jambes Tendues (Barre)",
    "jambes:Extension Jambes (Machine)",
    "jambes:Extension Mollets Debout (Machine)",
    "abdos:Relevé de Jambes Suspendu"
  ],
  "salle-ppl-6j-0": [
    "pecs:Développé Couché (Barre)",
    "pecs:Développé Couché Incliné (Haltère)",
    "epaules:Développé Militaire Debout (Barre)",
    "epaules:Élévation Latérale (Haltère)",
    "triceps:Barre au Front (Barre EZ)",
    "triceps:Extension Triceps (Poulie)"
  ],
  "salle-ppl-6j-1": [
    "dos:Tractions",
    "dos:Rowing (Barre)",
    "dos:Tirage Poitrine (Poulie)",
    "dos:Rowing Un Bras (Haltère)",
    "biceps:Curl Biceps (Barre)",
    "biceps:Curl Marteau (Haltère)"
  ],
  "salle-ppl-6j-2": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Fentes (Haltère)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Jambes (Machine)",
    "jambes:Extension Mollets Debout (Machine)"
  ],
  "salle-ppl-6j-3": [
    "pecs:Développé Couché (Haltère)",
    "pecs:Écarté (Pec Deck) (Machine)",
    "epaules:Presse Épaules (Haltère)",
    "epaules:Élévation Frontale Latérales Avant (Haltère)",
    "triceps:Extension Triceps Un Bras (Haltère)",
    "triceps:Kickback Triceps (Haltère)"
  ],
  "salle-ppl-6j-4": [
    "dos:Rowing Debout (Haltère)",
    "dos:Rowing Assis (Poulie)",
    "dos:Tractions",
    "dos:Rowing Un Bras (Haltère)",
    "biceps:Curl Biceps (Haltère)",
    "biceps:Curl Pupitre (Barre)"
  ],
  "salle-ppl-6j-5": [
    "jambes:Squat (Barre)",
    "jambes:Soulevé de Terre Jambes Tendues (Barre)",
    "jambes:Fentes (Haltère)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Jambes (Machine)",
    "jambes:Extension Mollets Debout (Machine)"
  ],
  "maison-pdc-2j-0": [
    "pecs:Pompes",
    "dos:Tractions Supination",
    "epaules:Presse Épaules (Élastique)",
    "triceps:Dips",
    "abdos:Planche"
  ],
  "maison-pdc-2j-1": [
    "jambes:Goblet Squat (Kettlebell)",
    "jambes:Fentes (Haltère)",
    "jambes:Soulevé de Terre Roumain (Barre)",
    "jambes:Fentes Arrière (Haltère)",
    "abdos:Crunch Bicyclette"
  ],
  "maison-pdc-3j-0": [
    "pecs:Pompes",
    "pecs:Pompes Inclinées",
    "dos:Tractions",
    "triceps:Dips",
    "epaules:Presse Épaules (Élastique)"
  ],
  "maison-pdc-3j-1": [
    "jambes:Goblet Squat (Kettlebell)",
    "jambes:Fentes (Haltère)",
    "jambes:Soulevé de Terre Roumain (Barre)",
    "jambes:Fentes Arrière (Haltère)",
    "jambes:Extension Mollets Debout (Machine)"
  ],
  "maison-pdc-3j-2": [
    "pecs:Pompes",
    "dos:Tractions Supination",
    "jambes:Box Jump Assis Sauté (Haltère)",
    "abdos:Planche",
    "abdos:Rotation Russe"
  ],
  "maison-pdc-4j-0": [
    "pecs:Pompes",
    "pecs:Pompes Inclinées",
    "triceps:Pompes Prise Serrée",
    "triceps:Dips"
  ],
  "maison-pdc-4j-1": [
    "jambes:Goblet Squat (Kettlebell)",
    "jambes:Fentes (Haltère)",
    "jambes:Soulevé de Terre Roumain (Barre)",
    "jambes:Fentes Arrière (Haltère)",
    "jambes:Box Jump Assis Sauté (Haltère)"
  ],
  "maison-pdc-4j-2": [
    "dos:Tractions",
    "dos:Tractions Supination",
    "dos:Tractions Prise Large Arrière",
    "epaules:Presse Épaules (Élastique)",
    "abdos:Planche"
  ],
  "maison-pdc-4j-3": [
    "abdos:Crunch",
    "abdos:Crunch Bicyclette",
    "abdos:Relevé de Bassin Genoux Fléchis",
    "abdos:Dead Bug",
    "abdos:Ciseaux de Jambes"
  ],
  "maison-pdc-5j-0": [
    "pecs:Pompes",
    "pecs:Pompes Inclinées",
    "triceps:Pompes Prise Serrée",
    "triceps:Dips"
  ],
  "maison-pdc-5j-1": [
    "dos:Tractions",
    "dos:Tractions Supination",
    "dos:Tractions Prise Large Arrière",
    "epaules:Presse Épaules (Élastique)"
  ],
  "maison-pdc-5j-2": [
    "jambes:Goblet Squat (Kettlebell)",
    "jambes:Fentes (Haltère)",
    "jambes:Soulevé de Terre Roumain (Barre)",
    "jambes:Fentes Arrière (Haltère)",
    "jambes:Box Jump Assis Sauté (Haltère)"
  ],
  "maison-pdc-5j-3": [
    "abdos:Crunch",
    "abdos:Crunch Bicyclette",
    "abdos:Rotation Russe",
    "abdos:Dead Bug",
    "abdos:Ciseaux de Jambes"
  ],
  "maison-pdc-5j-4": [
    "pecs:Pompes",
    "jambes:Goblet Squat (Kettlebell)",
    "dos:Tractions",
    "abdos:Planche"
  ],
  "maison-pdc-6j-0": [
    "pecs:Pompes",
    "pecs:Pompes Inclinées",
    "triceps:Pompes Prise Serrée",
    "triceps:Dips"
  ],
  "maison-pdc-6j-1": [
    "dos:Tractions",
    "dos:Tractions Supination",
    "dos:Tractions Prise Large Arrière",
    "abdos:Planche"
  ],
  "maison-pdc-6j-2": [
    "jambes:Goblet Squat (Kettlebell)",
    "jambes:Fentes (Haltère)",
    "jambes:Soulevé de Terre Roumain (Barre)",
    "jambes:Fentes Arrière (Haltère)",
    "jambes:Extension Mollets Debout (Machine)"
  ],
  "maison-pdc-6j-3": [
    "epaules:Presse Épaules (Élastique)",
    "abdos:Crunch Bicyclette",
    "abdos:Rotation Russe",
    "abdos:Relevé de Bassin Genoux Fléchis"
  ],
  "maison-pdc-6j-4": [
    "triceps:Pompes Prise Serrée",
    "triceps:Dips",
    "dos:Tractions Supination"
  ],
  "maison-pdc-6j-5": [
    "jambes:Box Jump Assis Sauté (Haltère)",
    "pecs:Pompes Un Bras",
    "abdos:Planche"
  ],
  "masse-2j-0": [
    "pecs:Développé Couché (Barre)",
    "pecs:Développé Couché Incliné (Haltère)",
    "dos:Tractions",
    "dos:Rowing (Barre)",
    "epaules:Développé Militaire Debout (Barre)",
    "biceps:Curl Biceps (Barre)",
    "triceps:Barre au Front (Barre EZ)"
  ],
  "masse-2j-1": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Fentes (Haltère)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Mollets Debout (Machine)",
    "abdos:Planche"
  ],
  "seche-2j-0": [
    "jambes:Squat (Barre)",
    "pecs:Pompes",
    "dos:Tirage Poitrine (Poulie)",
    "epaules:Élévation Latérale (Haltère)",
    "abdos:Relevé de Bassin Genoux Fléchis",
    "abdos:Planche"
  ],
  "seche-2j-1": [
    "jambes:Presse à Cuisses (Machine)",
    "pecs:Développé Couché (Barre)",
    "dos:Rowing (Barre)",
    "triceps:Extension Triceps (Poulie)",
    "abdos:Rotation Russe",
    "abdos:Crunch"
  ],
  "seche-5j-0": [
    "pecs:Développé Couché (Barre)",
    "dos:Tirage Poitrine (Poulie)",
    "epaules:Élévation Latérale (Haltère)",
    "biceps:Curl Biceps (Barre)",
    "triceps:Extension Triceps (Poulie)"
  ],
  "seche-5j-1": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Fentes (Haltère)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Mollets Debout (Machine)"
  ],
  "seche-5j-2": [
    "pecs:Pompes",
    "dos:Tractions",
    "jambes:Squat (Barre)",
    "epaules:Développé Militaire Debout (Barre)",
    "biceps:Curl Marteau (Haltère)",
    "abdos:Crunch"
  ],
  "seche-5j-3": [
    "abdos:Planche",
    "abdos:Crunch",
    "abdos:Rotation Russe"
  ],
  "seche-5j-4": [
    "jambes:Box Jump Assis Sauté (Haltère)",
    "abdos:Planche",
    "abdos:Dead Bug"
  ],
  "seche-6j-0": [
    "pecs:Développé Couché (Barre)",
    "dos:Tirage Poitrine (Poulie)",
    "epaules:Élévation Latérale (Haltère)",
    "biceps:Curl Biceps (Barre)",
    "triceps:Extension Triceps (Poulie)"
  ],
  "seche-6j-1": [
    "jambes:Squat (Barre)",
    "jambes:Presse à Cuisses (Machine)",
    "jambes:Fentes (Haltère)",
    "jambes:Leg Curl Allongé (Machine)",
    "jambes:Extension Mollets Debout (Machine)"
  ],
  "seche-6j-2": [
    "pecs:Pompes",
    "dos:Tractions",
    "jambes:Squat (Barre)",
    "epaules:Développé Militaire Debout (Barre)",
    "biceps:Curl Marteau (Haltère)",
    "abdos:Crunch"
  ],
  "seche-6j-3": [
    "abdos:Crunch",
    "abdos:Planche",
    "abdos:Rotation Russe"
  ],
  "seche-6j-4": [
    "jambes:Box Jump Assis Sauté (Haltère)",
    "pecs:Pompes Un Bras",
    "abdos:Ciseaux de Jambes"
  ],
  "seche-6j-5": [
    "abdos:Planche",
    "abdos:Dead Bug"
  ],
  "maison-halteres-2j-0": [
    "pecs:Développé Couché (Haltère)",
    "epaules:Presse Épaules (Haltère)",
    "biceps:Curl Biceps (Haltère)",
    "triceps:Extension Triceps Un Bras (Haltère)",
    "abdos:Planche"
  ],
  "maison-halteres-2j-1": [
    "jambes:Fentes (Haltère)",
    "jambes:Squat (Barre)",
    "jambes:Extension Mollets Debout (Machine)",
    "abdos:Rotation Russe",
    "abdos:Crunch"
  ],
  "maison-halteres-4j-0": [
    "pecs:Développé Couché (Haltère)",
    "epaules:Presse Épaules (Haltère)",
    "triceps:Extension Triceps Un Bras (Haltère)",
    "abdos:Planche"
  ],
  "maison-halteres-4j-1": [
    "jambes:Fentes (Haltère)",
    "jambes:Squat (Barre)",
    "jambes:Extension Mollets Debout (Machine)",
    "abdos:Crunch"
  ],
  "maison-halteres-4j-2": [
    "dos:Rowing Un Bras (Haltère)",
    "biceps:Curl Biceps (Haltère)",
    "epaules:Presse Épaules (Haltère)",
    "abdos:Rotation Russe"
  ],
  "maison-halteres-4j-3": [
    "jambes:Squat (Barre)",
    "jambes:Fentes (Haltère)",
    "jambes:Extension Mollets Debout (Machine)",
    "abdos:Relevé de Jambes Suspendu"
  ],
  "maison-halteres-5j-0": [
    "pecs:Développé Couché (Haltère)",
    "triceps:Extension Triceps Un Bras (Haltère)",
    "abdos:Planche"
  ],
  "maison-halteres-5j-1": [
    "dos:Rowing Un Bras (Haltère)",
    "biceps:Curl Biceps (Haltère)",
    "abdos:Crunch"
  ],
  "maison-halteres-5j-2": [
    "jambes:Fentes (Haltère)",
    "jambes:Squat (Barre)",
    "jambes:Extension Mollets Debout (Machine)"
  ],
  "maison-halteres-5j-3": [
    "epaules:Presse Épaules (Haltère)",
    "epaules:Élévation Frontale Latérales Avant (Haltère)",
    "abdos:Rotation Russe",
    "abdos:Relevé de Jambes Suspendu"
  ],
  "maison-halteres-5j-4": [
    "pecs:Développé Couché (Haltère)",
    "dos:Rowing Un Bras (Haltère)",
    "jambes:Squat (Barre)",
    "abdos:Planche"
  ]
};
