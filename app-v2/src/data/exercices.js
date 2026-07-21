// Base d'exercices — transposee du v1 (ma-seance.html / seance.body.html).
// 84 exercices, 9 groupes musculaires. Photos : Free Exercise DB (CDN GitHub).

export const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export const MUSCLES = [
  {key:'pecs', label:'Pecs'}, {key:'dos', label:'Dos'}, {key:'epaules', label:'Épaules'},
  {key:'biceps', label:'Biceps'}, {key:'triceps', label:'Triceps'}, {key:'jambes', label:'Jambes'}, {key:'abdos', label:'Abdos'},
  {key:'etirements', label:'Étirements'}, {key:'cardio', label:'Cardio'},
];

export const EXERCISES = {
  pecs: [
    {nom:'Développé couché', meta:'4 séries × 8-10 reps', desc:'Allongé sur le banc, descends la barre vers la poitrine puis pousse.', imgId:'Barbell_Bench_Press_-_Medium_Grip', lvl:1, mat:'barre'},
    {nom:'Développé incliné haltères', meta:'3 séries × 10-12 reps', desc:'Banc incliné à 30°, pousse les haltères vers le haut.', imgId:'Incline_Dumbbell_Press', lvl:1, mat:'halteres'},
    {nom:'Écarté à la poulie', meta:'3 séries × 12-15 reps', desc:'Bras semi-tendus, ramène les poignées devant toi.', imgId:'Cable_Crossover', lvl:1, mat:'machine'},
    {nom:'Pompes', meta:'3 séries × max', desc:'Corps gainé, descends la poitrine au sol puis pousse.', imgId:'Pushups', lvl:1, mat:'rien'},
    {nom:'Dips', meta:'3 séries × 10-12 reps', desc:'Aux barres parallèles, descends puis remonte en poussant.', imgId:'Dips_-_Chest_Version', lvl:2, mat:'machine'},
    {nom:'Développé couché haltères', meta:'4 séries × 10 reps', desc:'Variante haltères pour plus d\'amplitude.', imgId:'Dumbbell_Bench_Press', lvl:1, mat:'halteres'},
    {nom:'Écarté incliné haltères', meta:'3 séries × 12 reps', desc:'Banc incliné, ouvre puis ramène les haltères.', imgId:'Incline_Dumbbell_Flyes', lvl:1, mat:'halteres'},
    {nom:'Pull-over', meta:'3 séries × 12-15 reps', desc:'Un haltère au-dessus de la tête, descends derrière puis remonte.', imgId:'Straight-Arm_Dumbbell_Pullover', lvl:2, mat:'halteres'},
    {nom:'Pompes déclinées', meta:'3 séries × 12 reps', desc:'Pieds surélevés sur un banc, descends la poitrine puis pousse. Cible le haut des pecs.', imgId:'Push-Ups_With_Feet_Elevated', lvl:1, mat:'rien'},
    {nom:'Pompes larges', meta:'3 séries × max', desc:'Mains plus larges que les épaules pour accentuer les pectoraux.', imgId:'Push-Up_Wide', lvl:1, mat:'rien'},
    {nom:'Pompes inclinées', meta:'3 séries × 15 reps', desc:'Mains surélevées sur un support : variante plus accessible.', imgId:'Incline_Push-Up', lvl:1, mat:'rien'},
    {nom:'Pompes sautées', meta:'4 séries × 8 reps', desc:'Pousse explosivement pour décoller les mains du sol. Pliométrie.', imgId:'Plyo_Push-up', lvl:1, mat:'rien'},
  ],
  dos: [
    {nom:'Tractions', meta:'4 séries × max', desc:'Suspendu à la barre, tire-toi jusqu\'au menton.', imgId:'Pullups', lvl:1, mat:'traction'},
    {nom:'Rowing barre', meta:'4 séries × 8-10 reps', desc:'Buste penché, tire la barre vers le nombril.', imgId:'Bent_Over_Barbell_Row', lvl:1, mat:'barre'},
    {nom:'Tirage vertical', meta:'3 séries × 10-12 reps', desc:'À la poulie haute, tire la barre vers la poitrine.', imgId:'Wide-Grip_Lat_Pulldown', lvl:1, mat:'machine'},
    {nom:'Rowing haltère', meta:'3 séries × 10 reps', desc:'Un genou sur le banc, tire l\'haltère vers la hanche.', imgId:'One-Arm_Dumbbell_Row', lvl:1, mat:'halteres'},
    {nom:'Tirage horizontal', meta:'3 séries × 12 reps', desc:'Assis, tire la poignée vers le ventre.', imgId:'Seated_Cable_Rows', lvl:1, mat:'machine'},
    {nom:'Soulevé de terre', meta:'4 séries × 6-8 reps', desc:'Dos droit, soulève la barre du sol en poussant les jambes.', imgId:'Barbell_Deadlift', lvl:2, mat:'barre'},
    {nom:'Rowing T-bar', meta:'3 séries × 10 reps', desc:'Tire la barre en T vers la poitrine, dos gainé.', imgId:'T-Bar_Row_with_Handle', lvl:1, mat:'barre'},
    {nom:'Tirage élastique', meta:'3 séries × 15-20 reps', desc:'Écarte la bande devant toi en serrant les omoplates.', imgId:'Band_Pull_Apart', lvl:1, mat:'halteres'},
    {nom:'Tractions supination', meta:'4 séries × max', desc:'Prise mains vers toi, tire-toi jusqu’au menton. Sollicite aussi les biceps.', imgId:'Chin-Up', lvl:1, mat:'traction'},
    {nom:'Tractions prise large', meta:'3 séries × max', desc:'Prise large, tire les coudes vers le bas pour cibler les grands dorsaux.', imgId:'Wide-Grip_Rear_Pull-Up', lvl:2, mat:'traction'},
  ],
  epaules: [
    {nom:'Développé militaire', meta:'4 séries × 8-10 reps', desc:'Debout, pousse la barre au-dessus de la tête.', imgId:'Standing_Military_Press', lvl:1, mat:'barre'},
    {nom:'Élévations latérales', meta:'4 séries × 12-15 reps', desc:'Monte les haltères sur les côtés jusqu\'à l\'horizontale.', imgId:'Side_Lateral_Raise', lvl:1, mat:'halteres'},
    {nom:'Développé haltères', meta:'3 séries × 10-12 reps', desc:'Assis, pousse les haltères vers le haut.', imgId:'Seated_Dumbbell_Press', lvl:1, mat:'halteres'},
    {nom:'Oiseau (rear delt)', meta:'3 séries × 15 reps', desc:'Buste penché, ouvre les bras vers l\'arrière.', imgId:'Seated_Bent-Over_Rear_Delt_Raise', lvl:2, mat:'halteres'},
    {nom:'Élévations frontales', meta:'3 séries × 12 reps', desc:'Monte l\'haltère devant toi jusqu\'à l\'horizontale.', imgId:'Front_Dumbbell_Raise', lvl:1, mat:'halteres'},
    {nom:'Face pull', meta:'3 séries × 15 reps', desc:'Tire la corde vers le visage, coudes hauts.', imgId:'Face_Pull', lvl:2, mat:'machine'},
    {nom:'Pompes piquées', meta:'3 séries × 8-10 reps', desc:'Pieds surélevés, pousse comme un développé épaules avec ton poids de corps.', imgId:'Handstand_Push-Ups', lvl:3, mat:'rien'},
    {nom:'Élévation latérale élastique', meta:'3 séries × 15 reps', desc:'Debout sur la bande, lève les bras sur les côtés.', imgId:'Lateral_Raise_-_With_Bands', lvl:1, mat:'halteres'},
    {nom:'Développé épaules élastique', meta:'3 séries × 12-15 reps', desc:'Bande sous les pieds, pousse au-dessus de la tête.', imgId:'Shoulder_Press_-_With_Bands', lvl:1, mat:'halteres'},
  ],
  biceps: [
    {nom:'Curl barre', meta:'4 séries × 10 reps', desc:'Debout, fléchis les bras pour monter la barre.', imgId:'Barbell_Curl', lvl:1, mat:'barre'},
    {nom:'Curl haltères', meta:'3 séries × 12 reps', desc:'Alterne la montée de chaque haltère.', imgId:'Dumbbell_Bicep_Curl', lvl:1, mat:'halteres'},
    {nom:'Curl marteau', meta:'3 séries × 12 reps', desc:'Prise neutre, monte les haltères comme un marteau.', imgId:'Hammer_Curls', lvl:1, mat:'halteres'},
    {nom:'Curl pupitre', meta:'3 séries × 10 reps', desc:'Bras calés sur le pupitre, fléchis lentement.', imgId:'Preacher_Curl', lvl:1, mat:'barre'},
    {nom:'Curl concentré', meta:'3 séries × 12 reps', desc:'Assis, coude sur la cuisse, isole le biceps.', imgId:'Concentration_Curls', lvl:1, mat:'halteres'},
    {nom:'Curl élastique', meta:'3 séries × 15 reps', desc:'Debout sur la bande, fléchis les bras pour le curl.', imgId:'Close-Grip_EZ-Bar_Curl_with_Band', lvl:1, mat:'halteres'},
  ],
  triceps: [
    {nom:'Barre au front', meta:'4 séries × 10 reps', desc:'Allongé, descends la barre vers le front puis tends.', imgId:'Lying_Triceps_Press', lvl:2, mat:'barre'},
    {nom:'Extension poulie', meta:'4 séries × 12-15 reps', desc:'Pousse la corde vers le bas en tendant les bras.', imgId:'Triceps_Pushdown', lvl:1, mat:'machine'},
    {nom:'Dips entre bancs', meta:'3 séries × max', desc:'Mains sur le banc, descends puis pousse.', imgId:'Bench_Dips', lvl:1, mat:'rien'},
    {nom:'Extension haltère nuque', meta:'3 séries × 12 reps', desc:'Un haltère derrière la tête, tends les bras.', imgId:'Seated_Triceps_Press', lvl:1, mat:'halteres'},
    {nom:'Kickback', meta:'3 séries × 15 reps', desc:'Buste penché, tends le bras vers l\'arrière.', imgId:'Tricep_Dumbbell_Kickback', lvl:1, mat:'halteres'},
    {nom:'Pompes diamant', meta:'3 séries × 12 reps', desc:'Mains jointes en losange sous la poitrine. Cible les triceps.', imgId:'Push-Ups_-_Close_Triceps_Position', lvl:2, mat:'rien'},
    {nom:'Dips sur banc', meta:'3 séries × 15 reps', desc:'Mains sur un banc derrière toi, descends puis remonte par les triceps.', imgId:'Bench_Dips', lvl:1, mat:'rien'},
  ],
  jambes: [
    {nom:'Squat', meta:'4 séries × 8-10 reps', desc:'Barre sur les épaules, descends en pliant les genoux.', imgId:'Barbell_Squat', lvl:1, mat:'barre'},
    {nom:'Presse à cuisses', meta:'4 séries × 10-12 reps', desc:'Pousse la plateforme avec les jambes.', imgId:'Leg_Press', lvl:1, mat:'machine'},
    {nom:'Fentes', meta:'3 séries × 12 reps/jambe', desc:'Un grand pas en avant, descends le genou arrière.', imgId:'Dumbbell_Lunges', lvl:1, mat:'rien'},
    {nom:'Leg curl', meta:'3 séries × 12 reps', desc:'Allongé, fléchis les jambes pour travailler les ischios.', imgId:'Lying_Leg_Curls', lvl:1, mat:'machine'},
    {nom:'Leg extension', meta:'3 séries × 15 reps', desc:'Assis, tends les jambes contre la résistance.', imgId:'Leg_Extensions', lvl:1, mat:'machine'},
    {nom:'Mollets debout', meta:'4 séries × 15-20 reps', desc:'Monte sur la pointe des pieds avec charge.', imgId:'Standing_Calf_Raises', lvl:1, mat:'machine'},
    {nom:'Soulevé de terre jambes tendues', meta:'3 séries × 10 reps', desc:'Descends la barre jambes quasi tendues, sens les ischios.', imgId:'Stiff-Legged_Barbell_Deadlift', lvl:2, mat:'barre'},
    {nom:'Squat au poids du corps', meta:'4 séries × 20 reps', desc:'Descends en poussant les fesses en arrière, dos droit, puis remonte.', imgId:'Bodyweight_Squat', lvl:1, mat:'rien'},
    {nom:'Squat sauté', meta:'4 séries × 15 reps', desc:'Squat puis saut explosif. Réception amortie.', imgId:'Freehand_Jump_Squat', lvl:2, mat:'rien'},
    {nom:'Pont fessier', meta:'3 séries × 20 reps', desc:'Allongé, pousse les hanches vers le haut en serrant les fessiers.', imgId:'Butt_Lift_Bridge', lvl:1, mat:'rien'},
    {nom:'Pont fessier unilatéral', meta:'3 séries × 12 /jambe', desc:'Une jambe tendue, monte les hanches avec l’autre jambe.', imgId:'Single_Leg_Glute_Bridge', lvl:1, mat:'rien'},
    {nom:'Montées sur banc', meta:'3 séries × 12 /jambe', desc:'Monte sur un banc en poussant sur la jambe avant, genou opposé haut.', imgId:'Step-up_with_Knee_Raise', lvl:1, mat:'rien'},
  ],
  abdos: [
    {nom:'Crunch', meta:'4 séries × 20 reps', desc:'Allongé, décolle les épaules en contractant les abdos.', imgId:'Crunches', lvl:1, mat:'rien'},
    {nom:'Gainage planche', meta:'3 séries × 45 sec', desc:'Corps droit sur les avant-bras, gaine.', imgId:'Plank', lvl:1, mat:'rien'},
    {nom:'Relevé de jambes', meta:'3 séries × 15 reps', desc:'Suspendu ou au sol, monte les jambes tendues.', imgId:'Hanging_Leg_Raise', lvl:3, mat:'rien'},
    {nom:'Russian twist', meta:'3 séries × 20 reps', desc:'Assis, fais pivoter le buste de gauche à droite.', imgId:'Russian_Twist', lvl:2, mat:'rien'},
    {nom:'Crunch vélo', meta:'3 séries × 20 reps', desc:'Pédale dans le vide en amenant coude vers genou opposé.', imgId:'Air_Bike', lvl:1, mat:'rien'},
    {nom:'Crunch croisé', meta:'3 séries × 15 /côté', desc:'Amène le coude vers le genou opposé pour cibler les obliques.', imgId:'Cross-Body_Crunch', lvl:1, mat:'rien'},
    {nom:'Relevé de bassin', meta:'3 séries × 15 reps', desc:'Genoux fléchis, décolle le bassin en contractant les abdos bas.', imgId:'Bent-Knee_Hip_Raise', lvl:1, mat:'rien'},
    {nom:'Dead bug', meta:'3 séries × 12 /côté', desc:'Sur le dos, tends bras et jambe opposés sans creuser le dos.', imgId:'Dead_Bug', lvl:1, mat:'rien'},
    {nom:'Battements de jambes', meta:'3 séries × 30 sec', desc:'Jambes tendues, battements verticaux rapides, bas du dos plaqué.', imgId:'Flutter_Kicks', lvl:1, mat:'rien'},
  ],
  etirements: [
    {nom:'Étirement ischios', meta:'2 × 30 sec', desc:'Assis, une jambe tendue, penche le buste vers le pied sans arrondir le dos.', imgId:'90_90_Hamstring', lvl:1, mat:'rien'},
    {nom:'Étirement quadriceps', meta:'2 × 30 sec /jambe', desc:'Debout, attrape la cheville et ramène le talon vers la fesse.', imgId:'All_Fours_Quad_Stretch', lvl:2, mat:'rien'},
    {nom:'Étirement fessiers', meta:'2 × 30 sec /côté', desc:'Assis, cheville sur le genou opposé, penche-toi doucement en avant.', imgId:'Seated_Glute', lvl:3, mat:'rien'},
    {nom:'Étirement mollets', meta:'2 × 30 sec /jambe', desc:'Mains au mur, jambe arrière tendue, talon au sol.', imgId:'Calf_Stretch_Hands_Against_Wall', lvl:1, mat:'rien'},
    {nom:'Étirement adducteurs', meta:'2 × 30 sec', desc:'Assis, plantes de pieds jointes, laisse les genoux descendre.', imgId:'Adductor', lvl:2, mat:'rien'},
    {nom:'Étirement pectoraux', meta:'2 × 30 sec', desc:'Bras contre un mur, tourne le buste à l’opposé pour ouvrir la poitrine.', imgId:'Chest_And_Front_Of_Shoulder_Stretch', lvl:1, mat:'rien'},
    {nom:'Étirement épaules', meta:'2 × 20 sec /bras', desc:'Bras tendu en travers de la poitrine, tire-le avec l’autre bras.', imgId:'Shoulder_Circles', lvl:1, mat:'rien'},
    {nom:'Étirement dorsaux', meta:'2 × 30 sec', desc:'Bras au-dessus de la tête, attrape le poignet et penche sur le côté.', imgId:'One_Arm_Against_Wall', lvl:1, mat:'rien'},
    {nom:'Posture de l’enfant', meta:'2 × 40 sec', desc:'À genoux, buste au sol, bras tendus devant. Relâche le bas du dos.', imgId:'Childs_Pose', lvl:1, mat:'rien'},
    {nom:'Étirement chat-vache', meta:'2 × 30 sec', desc:'À quatre pattes, alterne dos rond et dos creux au rythme du souffle.', imgId:'Cat_Stretch', lvl:1, mat:'rien'},
    {nom:'Étirement triceps', meta:'2 × 20 sec /bras', desc:'Coude plié derrière la tête, pousse le coude avec l’autre main.', imgId:'Triceps_Stretch', lvl:1, mat:'rien'},
    {nom:'Étirement genou-poitrine', meta:'2 × 30 sec /jambe', desc:'Allongé, ramène un genou vers la poitrine avec les mains.', imgId:'One_Knee_To_Chest', lvl:1, mat:'rien'},
  ],
  cardio: [
    {nom:'Corde à sauter', meta:'10-15 min', desc:'Sauts réguliers, poignets qui tournent, réception sur l’avant du pied.', imgId:'Rope_Jumping', lvl:2, mat:'rien'},
    {nom:'Course à pied', meta:'20-30 min', desc:'Allure modérée à soutenue selon ton objectif.', imgId:'Trail_Running_Walking', lvl:1, mat:'rien'},
    {nom:'Skipping rapide', meta:'5 × 1 min', desc:'Montées de genoux rapides sur place, intense. 1 min effort / 1 min repos.', imgId:'Fast_Skipping', lvl:1, mat:'rien'},
    {nom:'Vélo d’appartement', meta:'20-30 min', desc:'Résistance modérée, cadence régulière.', imgId:'Bicycling_Stationary', lvl:1, mat:'machine'},
    {nom:'Tapis de course', meta:'20-30 min', desc:'Marche rapide ou course selon ton niveau.', imgId:'Running_Treadmill', lvl:1, mat:'machine'},
    {nom:'Elliptique', meta:'20-30 min', desc:'Mouvement fluide, faible impact sur les articulations.', imgId:'Elliptical_Trainer', lvl:2, mat:'machine'},
    {nom:'Rameur', meta:'15-20 min', desc:'Poussée jambes puis tirage bras. Gainage constant.', imgId:'Rowing_Stationary', lvl:2, mat:'machine'},
  ]
};

export const FILTERS = [
  { key: 'tout',     label: 'Tout',            mats: null },
  { key: 'rien',     label: 'Poids du corps',  mats: ['rien', 'traction'] },
  { key: 'halteres', label: 'Haltères',        mats: ['rien', 'traction', 'halteres'] },
  { key: 'salle',    label: 'Salle',           mats: ['rien', 'traction', 'halteres', 'barre', 'machine'] },
];

// Niveau -> libelle + nb d'etoiles pleines (comme le v1)
export const NIVEAUX = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Avancé' };
