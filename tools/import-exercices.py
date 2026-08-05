#!/usr/bin/env python3
# ============================================================
# IMPORT DU CATALOGUE D'EXERCICES
#
# Source : Free Exercise DB (yuhonas/free-exercise-db, Unlicense
# = domaine public). 873 exercices avec materiel, muscle principal,
# niveau et instructions. Rien n'est repris d'une app concurrente :
# seuls les NOMS FRANCAIS suivent la convention relevee dans les
# captures de Raci, et un nom d'exercice est un terme technique.
#
# Convention de nommage (56 captures, 5 aout) :
#     « Mouvement [Qualificatifs] (Materiel) »
# Le materiel est omis au poids du corps : « Pompes Declinees ».
#
#     python3 tools/import-exercices.py > /tmp/catalogue.txt
# ============================================================
import json, re, sys, urllib.request, collections

SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

# ---- Materiel ------------------------------------------------
MAT = {
    'barbell': 'Barre', 'dumbbell': 'Haltère', 'cable': 'Poulie',
    'machine': 'Machine', 'kettlebells': 'Kettlebell', 'bands': 'Élastique',
    'e-z curl bar': 'Barre EZ', 'body only': None,
}
# Materiel qu'on n'importe pas : hors salle ou trop marginal
EXCLU = {'exercise ball', 'foam roll', 'medicine ball', 'other', None}

# ---- Groupes musculaires BELFIT (les 9 existants) ------------
GROUPE = {
    'chest': 'pecs',
    'lats': 'dos', 'middle back': 'dos', 'lower back': 'dos', 'traps': 'dos',
    'shoulders': 'epaules',
    'biceps': 'biceps', 'forearms': 'biceps',
    'triceps': 'triceps',
    'quadriceps': 'jambes', 'hamstrings': 'jambes', 'glutes': 'jambes',
    'calves': 'jambes', 'adductors': 'jambes', 'abductors': 'jambes',
    'abdominals': 'abdos',
    'neck': 'dos',
}

# ---- Noms exacts (fournis par Raci, 5 aout) ------------------
# Ces exercices n'ont pas de mouvement generique : chaque nom anglais
# recoit directement son nom francais. Le materiel s'ajoute ensuite
# entre parentheses comme partout ailleurs (jamais au poids du corps).
NOMS_EXACTS = {
    # Abdos — partie 1
    'Advanced Kettlebell Windmill': 'Windmill Avancé',
    'Air Bike': 'Crunch Bicyclette',
    'Alternate Heel Touchers': 'Touches de Talons Alternées',
    'Barbell Ab Rollout': 'Rollout',
    'Barbell Ab Rollout - On Knees': 'Rollout à Genoux',
    'Barbell Rollout from Bench': 'Rollout depuis un Banc',
    'Bent Press': 'Bent Press',
    'Bent-Knee Hip Raise': 'Relevé de Bassin Genoux Fléchis',
    'Bottoms Up': 'Crunch Inversé avec Relevé de Bassin',
    'Butt-Ups': 'Planche Dauphin',
    'Cable Judo Flip': 'Judo Flip',
    'Cocoons': 'Cocon',
    'Double Kettlebell Windmill': 'Double Windmill',
    'Elbow to Knee': 'Crunch Coude-Genou',
    'Flat Bench Leg Pull-In': 'Ramené de Genoux sur Banc Plat',
    'Hanging Pike': 'Relevé de Jambes Tendues Suspendu',
    'Kettlebell Figure 8': 'Figure 8',
    'Kettlebell Pass Between The Legs': 'Passage entre les Jambes',
    'Kettlebell Windmill': 'Windmill',
    "Landmine 180's": 'Landmine 180°',
    'Leg Pull-In': 'Ramené de Genoux',
    'Pallof Press': 'Pallof Press',
    'Pallof Press With Rotation': 'Pallof Press avec Rotation',
    'Scissor Kick': 'Ciseaux de Jambes',
    'Seated Barbell Twist': 'Rotations du Buste Assis',
    'Seated Flat Bench Leg Pull-In': 'Ramené de Genoux Assis sur Banc Plat',
    'Seated Leg Tucks': 'Ramené de Genoux Assis',
    'Side Bridge': 'Gainage Latéral',
    'Side Jackknife': 'V-Up Latéral',
    'Smith Machine Hip Raise': 'Relevé de Bassin Guidé',
    'Spell Caster': 'Spell Caster',
    'Spider Crawl': 'Spider Crawl',
    'Standing Cable Lift': 'Woodchop Ascendant',
    'Standing Cable Wood Chop': 'Woodchop Descendant',
    'Stomach Vacuum': 'Vacuum Abdominal',
    'Wind Sprints': 'Sprints Courts',

    # Biceps / avant-bras — partie 2
    'Dumbbell Lying Pronation': "Pronation de l'Avant-Bras Allongé",
    'Dumbbell Lying Supination': "Supination de l'Avant-Bras Allongé",
    'Seated Biceps': 'Étirement des Biceps Assis',
    'Wrist Circles': 'Cercles de Poignets',
    'Wrist Rotations with Straight Bar': 'Rotations des Poignets, Barre Droite',
    # Cou
    'Isometric Neck Exercise - Front And Back': 'Flexion-Extension Isométrique du Cou',
    'Isometric Neck Exercise - Sides': 'Inclinaisons Latérales Isométriques du Cou',
    # Dos
    'Incline Bench Pull': 'Rowing sur Banc Incliné',
    'Kettlebell Sumo High Pull': 'High Pull Sumo',
    'V-Bar Pullup': 'Tractions Prise Neutre Serrée',
    # Jambes
    '90/90 Hamstring': 'Étirement des Ischio-Jambiers en 90/90',
    'All Fours Quad Stretch': 'Étirement du Quadriceps à Quatre Pattes',
    'Bench Jump': 'Saut sur Banc',
    'Bicycling, Stationary': 'Vélo Stationnaire',
    'Butt Lift (Bridge)': 'Pont Fessier',
    'Double Leg Butt Kick': 'Saut Talons-Fesses à Deux Jambes',
    'Elliptical Trainer': 'Vélo Elliptique',
    'Fast Skipping': 'Skipping Rapide',
    'Flutter Kicks': 'Battements de Jambes Alternés',
    'Groiners': 'Groiners',
}

# Reaffectation de groupe pour certains noms exacts : la v2 a des
# onglets Étirements et Cardio herites de la v1, restes vides depuis
# l'import — les etirements et le cardio machines s'y rangent au lieu
# de gonfler les groupes musculaires. Le cou n'a pas d'onglet : les
# deux isometriques vont sous Dos en attendant l'arbitrage de Raci.
GROUPE_EXACT = {
    'Seated Biceps': 'etirements',
    '90/90 Hamstring': 'etirements',
    'All Fours Quad Stretch': 'etirements',
    'Bicycling, Stationary': 'cardio',
    'Elliptical Trainer': 'cardio',
    'Fast Skipping': 'cardio',
    'Isometric Neck Exercise - Front And Back': 'dos',
    'Isometric Neck Exercise - Sides': 'dos',
}

# ---- Mouvements de base -------------------------------------
# Le motif le PLUS LONG qui correspond gagne : « Bench Press »
# doit primer sur « Press », sinon tout devient « Développé ».
MOUVEMENTS = {
    # Pecs
    'Bench Press': 'Développé Couché', 'Chest Press': 'Chest Press',
    'Cable Crossover': 'Écartés Poulie', 'Chest Fly': 'Écarté',
    'Flyes': 'Écarté', 'Flye': 'Écarté', 'Fly': 'Écarté',
    'Pullover': 'Pull-Over', 'Push-Up': 'Pompes', 'Pushups': 'Pompes',
    'Push Up': 'Pompes', 'Pushup': 'Pompes', 'Chest Dip': 'Dips Torse',
    'Butterfly': 'Écarté (Pec Deck)',
    # Dos
    'Pulldown': 'Tirage Poitrine', 'Pull Down': 'Tirage Poitrine',
    'Pullups': 'Tractions', 'Pull-Up': 'Tractions', 'Pull Up': 'Tractions',
    'Chin-Up': 'Tractions Supination', 'Chin Up': 'Tractions Supination',
    'Row': 'Rowing', 'Deadlift': 'Soulevé de Terre', 'Shrug': 'Shrug',
    'Hyperextension': 'Extension Dos', 'Back Extension': 'Extension Dos',
    'Good Morning': 'Flexion Buste Avant', 'Face Pull': 'Tirage vers Visage',
    'Rack Pull': 'Rack Pull', 'Superman': 'Superman',
    # Épaules
    'Lateral Raise': 'Élévation Latérale', 'Side Raise': 'Élévation Latérale',
    'Front Raise': 'Élévation Frontale', 'Rear Delt': 'Oiseau',
    'Reverse Fly': 'Oiseau', 'Military Press': 'Développé Militaire',
    'Shoulder Press': 'Presse Épaules', 'Arnold Press': 'Développé Arnold',
    'Upright Row': 'Rowing Debout', 'Push Press': 'Push Press',
    'Overhead Press': 'Développé Militaire',
    # Biceps / avant-bras
    'Hammer Curl': 'Curl Marteau', 'Preacher Curl': 'Curl Pupitre',
    'Concentration Curl': 'Curl Concentré', 'Spider Curl': 'Curl Araignée',
    'Drag Curl': 'Drag Curl', 'Wrist Curl': 'Curl Poignet',
    'Curl': 'Curl Biceps',
    # Triceps
    'Pushdown': 'Extension Triceps', 'Push-Down': 'Extension Triceps',
    'Kickback': 'Kickback Triceps', 'Skullcrusher': 'Barre au Front',
    'Triceps Extension': 'Extension Triceps', 'Triceps Press': 'Barre au Front',
    'Dip': 'Dips', 'JM Press': 'Développé JM',
    # Jambes
    'Front Squat': 'Squat Avant', 'Hack Squat': 'Hack Squat',
    'Split Squat': 'Split Squat', 'Box Squat': 'Box Squat',
    'Goblet Squat': 'Goblet Squat', 'Sumo Deadlift': 'Soulevé de Terre Sumo',
    'Squat': 'Squat', 'Leg Press': 'Presse à Cuisses',
    'Leg Extension': 'Extension Jambes', 'Leg Curl': 'Leg Curl',
    'Calf Raise': 'Extension Mollets', 'Calf Press': 'Presse Mollets',
    'Lunge': 'Fentes', 'Step-Up': 'Step Up', 'Step Up': 'Step Up',
    'Hip Thrust': 'Hip Thrust', 'Glute Bridge': 'Relevé de Bassin',
    'Hip Abduction': 'Abduction Hanche', 'Hip Adduction': 'Adduction Hanche',
    'Glute Ham Raise': 'Glute Ham Raise', 'Nordic': 'Curl Nordique',
    # Abdos
    'Crunch': 'Crunch', 'Sit-Up': 'Sit Up', 'Sit Up': 'Sit Up',
    'Leg Raise': 'Relevé de Jambes', 'Knee Raise': 'Relevé de Genoux',
    'Plank': 'Planche', 'Russian Twist': 'Rotation Russe',
    'Ab Roller': 'Roue Abdominale', 'Wheel Rollout': 'Roue Abdominale',
    'Toe Touch': 'Toucher Orteils', 'Windshield Wiper': 'Essuie-Glace',
    'Hollow': 'Hollow Rock', 'Dead Bug': 'Dead Bug', 'Bird Dog': 'Chien-Oiseau',
    'Side Bend': 'Flexion Latérale', 'V-Up': 'V Up',
    # Halterophilie / corps entier
    'Power Clean': 'Épaulé en Puissance', 'Hang Clean': 'Épaulé en Suspension',
    'Clean and Jerk': 'Épaulé-Jeté', 'Clean': 'Épaulé', 'Jerk': 'Jeté',
    'Snatch': 'Arraché', 'Thruster': 'Thruster', 'Swing': 'Swing',
    'Turkish Get-Up': 'Relevé Turc', 'Burpee': 'Burpee',
    'Muscle Up': 'Muscle Up', 'Farmer': 'Marche du Fermier',
    'Sled Push': 'Sled Push', 'Sled Pull': 'Sled Pull',
    'Box Jump': 'Box Jump', 'Jumping Jack': 'Jumping Jack',
    'Mountain Climber': 'Grimpeur', 'Bear Crawl': 'Bear Crawl',
    # Cou
    'Neck Flexion': 'Flexion du Cou', 'Neck Extension': 'Extension du Cou',
}

# ---- Qualificatifs (ordre = ordre d'apparition dans le nom) ---
QUALIFS = [
    ('Smith Machine', None),          # traite comme un materiel, voir plus bas
    ('Close-Grip', 'Prise Serrée'), ('Close Grip', 'Prise Serrée'),
    ('Wide-Grip', 'Prise Large'), ('Wide Grip', 'Prise Large'),
    ('Reverse Grip', 'Prise Inversée'), ('Reverse', 'Inversé'),
    ('Incline', 'Incliné'), ('Decline', 'Décliné'),
    ('Seated', 'Assis'), ('Standing', 'Debout'), ('Lying', 'Allongé'),
    ('Kneeling', 'à Genoux'), ('Bent Over', 'Penché'), ('Bent-Over', 'Penché'),
    ('One-Arm', 'Un Bras'), ('One Arm', 'Un Bras'), ('Single-Arm', 'Un Bras'),
    ('Single Leg', 'Une Jambe'), ('Single-Leg', 'Une Jambe'),
    ('One Leg', 'Une Jambe'), ('Alternating', 'Alterné'), ('Alternate', 'Alterné'),
    ('Weighted', 'Lesté'), ('Assisted', 'Assisté'), ('Suspended', 'Suspendu'),
    ('Hanging', 'Suspendu'), ('Romanian', 'Roumain'), ('Stiff-Leg', 'Jambes Tendues'),
    ('Stiff Leg', 'Jambes Tendues'), ('Sumo', 'Sumo'), ('Bulgarian', 'Bulgare'),
    ('Overhead', 'au-dessus de la Tête'), ('Behind The Neck', 'Nuque'),
    ('Rope', 'Corde'), ('Side', 'Latéral'), ('Rear', 'Arrière'),
    ('Front', 'Avant'), ('Jump', 'Sauté'), ('Diamond', 'Diamant'),
]

# Le feminin pluriel : « Pompes Inclinees », pas « Pompes Incline ».
FEMININ_PLURIEL = {'Pompes', 'Fentes', 'Tractions', 'Élévation Latérale',
                   'Élévation Frontale', 'Extension Jambes', 'Extension Mollets'}
ACCORD = {'Incliné': 'Inclinées', 'Décliné': 'Déclinées', 'Inversé': 'Inversées',
          'Assis': 'Assises', 'Debout': 'Debout', 'Allongé': 'Allongées',
          'Lesté': 'Lestées', 'Assisté': 'Assistées', 'Suspendu': 'Suspendues',
          'Alterné': 'Alternées', 'Sauté': 'Sautées', 'Latéral': 'Latérales',
          'Arrière': 'Arrière', 'Avant': 'Avant'}


def convertir(e):
    if e.get('equipment') in EXCLU:
        return None
    muscles = e.get('primaryMuscles') or []
    groupe = GROUPE.get(muscles[0]) if muscles else None
    if not groupe:
        return None
    brut = e['name']
    bas = brut.lower()

    # Un nom exact fourni par Raci prime sur tout : il est repris tel
    # quel, sans assemblage mouvement + qualificatifs.
    exact = NOMS_EXACTS.get(brut)

    base = None
    if not exact:
        for en in sorted(MOUVEMENTS, key=len, reverse=True):
            if en.lower() in bas:
                base = MOUVEMENTS[en]
                break
        if not base:
            return None

    # Materiel. La machine Smith est annoncee dans le NOM, pas dans le
    # champ equipment (qui dit « barbell ») : sans ce test, un exercice
    # a la Smith devenait « (Barre) » et se confondait avec la version
    # barre libre — deux exercices differents sous un seul nom.
    mat = MAT.get(e['equipment'])
    if 'smith machine' in bas:
        mat = 'Machine Smith'
    # Le poids du corps ne porte jamais de mention de materiel, meme si
    # la base a range l'exercice sous « barbell » pour un detail.
    if 'bodyweight' in bas:
        mat = None

    if exact:
        mat_fx = MAT.get(e['equipment'])
        if 'smith machine' in bas:
            mat_fx = 'Machine Smith'
        nom = exact + (f' ({mat_fx})' if mat_fx else '')
        groupe = GROUPE_EXACT.get(brut, groupe)
        return {'groupe': groupe, 'nom': nom, 'source': brut,
                'mat': e['equipment'], 'niveau': e.get('level'),
                'muscle': muscles[0], 'id': e.get('id') or brut.replace(' ', '_')}

    quals = []
    for en, fr in QUALIFS:
        if fr and en.lower() in bas and fr not in quals:
            quals.append(fr)
    # Le qualificatif deja porte par le nom de base ne se repete pas :
    # « Squat Avant » ne devient pas « Squat Avant Avant ».
    quals = [q for q in quals if q.lower() not in base.lower()]

    if base in FEMININ_PLURIEL:
        quals = [ACCORD.get(q, q) for q in quals]

    nom = ' '.join([base] + quals)
    if mat:
        nom += f' ({mat})'
    return {'groupe': groupe, 'nom': nom, 'source': brut,
            'mat': e['equipment'], 'niveau': e.get('level'),
            'muscle': muscles[0], 'id': e.get('id') or brut.replace(' ', '_')}


def main():
    with urllib.request.urlopen(SOURCE, timeout=90) as r:
        base = json.load(r)
    convertis = [c for c in (convertir(e) for e in base) if c]

    # Doublons de nom : on garde le premier et on signale les autres,
    # ce sont les endroits ou le dictionnaire manque de finesse.
    vus, uniques, collisions = {}, [], []
    for c in convertis:
        cle = (c['groupe'], c['nom'])
        if cle in vus:
            collisions.append((c['nom'], vus[cle], c['source']))
            continue
        vus[cle] = c['source']
        uniques.append(c)

    total = sum(1 for e in base if e.get('equipment') not in EXCLU
                and GROUPE.get((e.get('primaryMuscles') or [''])[0]))
    print(f"# Catalogue : {len(uniques)} exercices uniques "
          f"({len(convertis)} convertis sur {total} candidats, "
          f"{len(collisions)} collisions)\n")
    par = collections.Counter(c['groupe'] for c in uniques)
    print('# Par groupe : ' + ', '.join(f'{g} {n}' for g, n in par.most_common()) + '\n')

    for g in ['pecs', 'dos', 'epaules', 'biceps', 'triceps', 'jambes', 'abdos', 'cou']:
        lot = [c for c in uniques if c['groupe'] == g]
        if not lot:
            continue
        print(f"\n## {g.upper()} ({len(lot)})")
        for c in sorted(lot, key=lambda x: x['nom']):
            print(f"  {c['nom']:52} <- {c['source']}")

    if collisions:
        print(f"\n\n## COLLISIONS A ARBITRER ({len(collisions)})")
        for nom, gagnant, perdant in collisions[:60]:
            print(f"  {nom:44} {gagnant}  ~~  {perdant}")

    manquants = [e['name'] for e in base
                 if e.get('equipment') not in EXCLU
                 and GROUPE.get((e.get('primaryMuscles') or [''])[0])
                 and not convertir(e)]
    print(f"\n\n## NON RECONNUS — mouvement absent du dictionnaire ({len(manquants)})")
    for n in sorted(manquants):
        print('  ' + n)


if __name__ == '__main__':
    main()
