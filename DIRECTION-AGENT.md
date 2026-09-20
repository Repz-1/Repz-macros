# BelFit — direction : du tracker vers le coach-agent

**Complément de `ETAT-DU-PROJET.md`.** L'état décrit ce qui tourne.
Ce fichier décrit où on va. En cas de contradiction sur le présent,
`ETAT-DU-PROJET.md` gagne. En cas de contradiction sur la cible,
ce fichier gagne.

Dernière mise à jour : 20 septembre 2026.

---

## La thèse en une phrase

BelFit ne doit plus être une appli où l'utilisateur remplit des
écrans. BelFit doit être un coach qui **fait** le travail dans les
outils qu'on a déjà : journal, séance, courses, objectifs.

Le chat n'est pas le produit. Les mains le sont.

---

## Ce que BelFit est aujourd'hui

Un tracker nutrition + entraînement, en production sur belfit.be.

- Journal, macros, hydratation, pesée
- Entraînements, questionnaire → programme, séance guidée, chrono
- Stats, idées de repas, liste de courses
- Scan code-barres, ajout vocal, photo d'assiette
- Comptes Firebase, Premium Lemon Squeezy, PWA

L'IA actuelle n'est pas un agent. Deux Cloud Functions
(`transcrireVocal`, `analyserPhoto`) envoient un média à Gemini et
reçoivent un JSON `{aliment, quantite, unite}`. Une passe. Zéro
mémoire. Zéro action ensuite. L'utilisateur valide encore à la main.

C'est un parseur. Utile. Insuffisant.

---

## Ce que BelFit doit devenir

Un coach qui a le contexte de **cet** utilisateur, et qui écrit dans
Firestore via des outils serveur — pas un chatbot qui conseille
par-dessus l'app.

### Exemples qui comptent (l'utilisateur parle, BelFit agit)

| Il dit | BelFit fait |
|---|---|
| « J'ai mangé un durum frites » | Ajoute les lignes au journal, montre l'écart macros, propose **un** dîner qui rattrape, demande confirmation avant de l'écrire |
| « Photo de l'assiette » | Identifie, préremplit, attend la correction, commit |
| « J'ai mal au genou ce soir » | Remplace les fentes de la séance du jour, ne réécrit pas tout le programme |
| « Fais-moi les courses de la semaine » | Remplit `Courses` à partir du plan réel, pas d'une liste générique |
| Rien à 21 h, journal vide | Une relance courte. Pas un sermon. |

Si ça n'écrit rien dans les données, ce n'est pas un agent. C'est un
article de blog dans une bulle.

---

## Hors-scope (ne pas faire)

- Reconstruire la V2 from scratch.
- Coller un chat générique à côté des 4 onglets.
- Laisser la clé Gemini dans le navigateur.
- Ouvrir l'agent tant que `PREMIUM_OUVERT` vaut `true`.
- Faire de l'agent un nutritionniste clinique (pathologies, régimes
  médicaux). BelFit reste un coach sportif / macros, pas un dispositif
  de santé.
- Attendre l'agent parfait avant de déployer le vocal, la photo,
  Google et les pseudos. Sans entrée fiable, l'agent n'a rien à se
  mettre sous la dent.

---

## Architecture cible

```
utilisateur (voix, photo, texte)
        ↓
fonction serveur  coachAgent
        ↓
contexte lu dans Firestore
  objectifs, journal du jour, séance prévue,
  Premium, langue FR/NL, historique court
        ↓
outils (serveur uniquement)
  ajouterAliment
  ajusterObjectif
  proposerRepas
  demarrerSeance
  adapterSeance
  majCourses
        ↓
réponse courte + action déjà faite
        ↓
l'UI actuelle affiche le résultat
  Journal, Séance, Courses restent le tableau de bord
```

Règles :

1. Toute écriture passe par une function Firebase authentifiée.
2. L'IA propose. L'utilisateur confirme les écritures non triviales
   (comme la photo aujourd'hui : prérempli, pas imposé).
3. Les ajouts évidents du journal (vocal/photo déjà validés par le
   flux actuel) restent à un tap.
4. Pas de deuxième source de vérité. L'agent lit et écrit les mêmes
   documents que la V2 (`users/{uid}.v2Data`, `users/{uid}.premium`).
5. FR et NL dès le premier prompt système. Pas un agent français
   recouvert d'i18n après coup.

---

## Trois couches, dans cet ordre

Rien de la couche 3 ne commence tant que la couche 1 n'est pas
fermée. La couche 2 peut avancer en parallèle des premiers outils.

### Couche 1 — trou opérationnel

Sans ça, on vend une démo.

- [ ] Déployer `transcrireVocal` et `analyserPhoto`
- [ ] Activer Google Sign-In (domaine `belfit.be`)
- [ ] Déployer les functions pseudo + règles Firestore
- [ ] Décider Lemon test vs live (`RESTE50`, webhook, formules)
- [ ] Remettre `PREMIUM_OUVERT` à `false` avant tout trafic réel
- [ ] Vérifier EmailJS / aide

Commandes : `A-FAIRE-SUR-PC.md`. Ce fichier ne les répète pas.

### Couche 2 — une seule session

Tant que Réglages / Profil / Aide / légal vivent en V1, un agent qui
« connaît l'utilisateur » mentira une fois sur deux.

- [ ] Migrer Réglages, Profil, Aide, Confidentialité dans la V2
- [ ] Couper le pont `localStorage.repz_premium` seulement quand le
      webhook écrit `users/{uid}.premium` pour 100 % des payeurs
- [ ] `manifest.json` + SW de bascule : voir `PHASE-4.md`
- [ ] Ne pas supprimer la V1 avant une semaine d'observation

### Couche 3 — le coach

- [x] Function `coachAgent` (squelette auth + Premium + contexte + `ajouterAliment`)
- [x] Coach local hors-ligne (alias, eau, durum = pain + kebab)
- [x] Deuxieme outil local : `proposerRepas` calé sur le reste de macros du jour
- [ ] Premier outil serveur : `ajouterAliment` (redeployer `coachAgent`)
- [ ] Troisieme : `adapterSeance` (contrainte du jour, pas rewrite du programme)
- [ ] Quatrieme : `majCourses`
- [x] Entrée unique dans l'UI : champ texte collé au Journal — pas un cinquième onglet « IA »
- [ ] Relance du soir (Cloud Scheduler), désactivable dans Réglages

Premier usage qui justifie tout le reste :

> « J'ai mangé un durum frites »
> → lignes au journal + écart macros + une proposition de dîner,
> confirmable en un tap.

Pas un essai de quarante messages.

---

## Critères — c'est un agent / ce n'est plus un tracker

C'est un agent quand les trois sont vrais :

1. L'utilisateur peut arriver un résultat (aliment loggé, séance
   adaptée, courses à jour) **sans ouvrir le bon écran**.
2. L'écriture est tracée dans Firestore, pas seulement affichée.
3. L'action suivante proposée dépend du jour réel de **cet**
   utilisateur, pas d'un prompt générique.

Ce n'est plus seulement un tracker quand le chemin principal n'est
plus « choisir l'onglet → trouver le bouton → remplir le champ ».

Les 4 onglets restent. Ils deviennent le revers de l'agent, pas la
porte.

---

## Garde-fous produit

- Données de santé : journal et poids ne sortent pas du projet
  Firebase. Pas de log des prompts complets en clair au-delà d'un
  diagnostic court.
- Coût : un tour d'agent = un appel modèle borné. Pas de boucle
  d'outils sans plafond (max 4 appels outils par requête).
- Quota Premium : l'agent consomme le même droit que le vocal et la
  photo. Le gratuit garde le journal manuel.
- Identité : le coach parle comme BelFit (direct, belge, sans jargon
  de startup). Il ne se fait pas passer pour un médecin.

---

## Prochaine action concrète

Le coach local tient le premier usage : « durum frites » → lignes +
écart macros + un dîner confirmable. Prochaine main : `adapterSeance`
(« j'ai mal au genou ») sans réécrire le programme.

Le squelette `functions/coachAgent` attend toujours un `firebase deploy`
(couche 1) pour parler Gemini. Tant que le vocal n'est pas redéployé,
le navigateur tombe sur le coach local — c'est voulu, et c'est testable
sans Firebase.
