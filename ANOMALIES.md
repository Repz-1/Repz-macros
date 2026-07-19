# BELFIT — Anomalies observées pendant la reproduction

Registre tenu pendant la phase 1 (reproduction fidèle des écrans).
**Rien n'est corrigé ici** : ces points seront traités en phase 2,
après validation au cas par cas.

Statut : `observé` = relevé, non soumis · `soumis` = proposé à Raci ·
`validé` = correction acceptée · `conservé` = choix de design confirmé

---

## Écran Journal

| # | Élément | Observation | Statut |
|---|---|---|---|
| J1 | Cartes repas | Crayon et chevron désalignés (crayon sur la ligne du titre, chevron centré verticalement) | **validé** — corrigé, regroupés en zone d'actions |
| J2 | Cartes repas | « Snacks » en anglais parmi des libellés français | **validé** — devient « Collations » (FR) et « Tussendoortjes » (NL) |
| J3 | Bouton hydratation | Opacité 0,72, plus pâle que le bouton Ajouter | **conservé** — hiérarchie voulue : Ajouter est l'action principale |
| J4 | Carte Calories | Liseré vert pâle absent du document mais visible sur la capture | **conservé** — la capture fait foi |
| J5 | Navigation | Étoile Premium en rouge quand active, les autres onglets en noir | **conservé** — règle explicite dans le CSS de référence |
| J6 | Colonne | Largeur plafonnée à 640 px en v2 contre 900 px en v1 : sur tablette, 900 px donne des lignes trop longues | **observé** |
| J7 | Idées recettes | En v2, la pilule était remplacée par une carte verrouillée pour les comptes gratuits ; la capture montre la pilule normale | **validé** — pilule toujours visible, gating au dépliage |

| J8 | Carte Calories | « Consommées » recouvert par le chiffre central sur écran étroit (anneau à largeur fixe) | **corrigé** — anneau flexible, chiffre adaptatif |
| J9 | Calculateur | Champs « Âge » et « Taille » coupés à droite (pas de largeur imposée dans la grille) | **corrigé** — largeur 100 % et box-sizing global |
| J10 | Boutons flottants | Recouvrent les actions rapides et le bas des modales | **observé** — audit final |
| J11 | Haut de page | Espace vide important avant le logo | **observé** — audit final |
| J12 | Barres de macros | Remplissage très petit aux faibles valeurs : la jauge se lit mal | **observé** |
| J13 | Carte Calories | Chiffre central débordant de l'anneau sur écran étroit | **corrigé** — taille adaptative resserrée |
| J14 | Lignes d'aliments | Nom et équivalence cassés sur deux lignes (colonnes fixes trop larges) | **corrigé** — colonnes resserrées, texte tronqué proprement |
| J15 | Bas de page | Espace réservé excessif : on défile dans du vide sur un écran entier | **corrigé** — 120 px ramenés à 76 px |
| J16 | Ligne date | « 19 JUIL.. » — double point, le mois abrégé en contient déjà un | **corrigé** |
| J20 | En-tête | Deux en-têtes superposés en v2 (celui du shell + celui du Journal) : tout le contenu était poussé de 100 px vers le bas | **corrigé** — en-tête global retiré, choix de langue déplacé dans le volet profil |
| J21 | Anneau | Diamètre 132 px contre ~178 px sur la référence | **corrigé** — plafond porté à 58 % de la largeur |
| J17 | Calculateur | Le bas de la carte (macros et bouton Appliquer) passe sous les flottants | **observé** — audit final |
| J18 | Lignes d'''aliments | Le champ de quantité fait exploser sa colonne (min-width auto en grille) | **corrigé** — min-width 0, règle globale sur input/select/textarea |
| J19 | Lignes d'''aliments | Effacer le champ met la valeur à 0 immédiatement : impossible de vider pour retaper | **corrigé** — champ vide toléré pendant la frappe |

---

## À vérifier sur les écrans suivants

- Cohérence des rayons de carte : 18 px (repas), 20 px (raccourcis),
  22 px (calories) coexistent. Volontaire ou dérive ?
- Deux gris de texte secondaire très proches : `#8A8580` et `#8A8375`
- Deux beiges de bordure très proches : `#E7E2D9` et `#ECE8DF`

Ces micro-écarts ne se voient pas isolément, mais ils empêchent
d'avoir un jeu de jetons unique. À arbitrer en phase 2.

---

## Hors reproduction — dette technique connue

| Sujet | État |
|---|---|
| Vocal en panne (modèle Gemini retiré par Google) | corrigé dans le code, **attend `firebase deploy`** |
| Connexion par pseudo | codée, **attend déploiement des Cloud Functions** |
| Connexion Google | codée, **attend activation dans la console Firebase** |
| Code promo `RESTE50` | **attend création chez Lemon Squeezy** |
| EmailJS | **à tester, réparer si nécessaire** |

Détail des commandes : voir `A-FAIRE-SUR-PC.md`.
