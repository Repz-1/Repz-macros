
---

## Chantier en pause (juillet 2026)

La migration vers Preact/Vite est **arretee**. Le code reste ici, mais :

- il n'est plus construit a chaque push (retire de `.github/workflows/deploy.yml`)
- le dossier `/v2/` deja construit reste en ligne, sans lien depuis l'app

Etat au moment de l'arret : pages Journal, S'entrainer et Mes stats portees
depuis la v1 (markup + CSS repris a l'identique, scopes dans `src/legacy/`).
Restaient a porter : Premium, Programmes, Ma seance, Courses, Profil,
Parametres, Questionnaire, Aide.

Raison de l'arret : sur ~16 000 lignes de v1, seuls le CSS (17 %) et le HTML
(16 %) se convertissent automatiquement. Les 67 % de JavaScript demandent une
reecriture manuelle, pour un resultat visuellement identique a l'existant.
Le cout ne justifiait pas le benefice.

Pour reprendre : voir l'historique git du workflow de deploiement.


---

## Chantier arrete (19 juillet 2026)

Decision de Raci : la v2 est abandonnee. L'''application reste la v1.

Le code est conserve en l'''etat, sans etre construit ni deploye.
Ecran Journal reproduit a ~95 % au moment de l'''arret.

Outils laisses en place s'''ils resservent un jour :
-  : rend la v2 dans Chromium, capture et detecte les debordements
-  : mesure la position et la taille des elements
-  : verifie que l'''app se peint reellement
