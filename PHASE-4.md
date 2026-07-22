# Phase 4 — Retrait de la V1

Bascule de `belfit.be` sur la v2 et suppression des pages V1.
Rien ici n'est urgent : la V1 tourne, la v2 mûrit à côté.

---

## 1. Parité fonctionnelle (préalable absolu)

Tant qu'une case n'est pas cochée, on ne bascule pas.

- [x] Connexion / inscription → `LoginScreen`
- [x] Shell + navigation → rail 4 panneaux (`main.jsx`)
- [x] Journal → `DayDashboard`, `MealCard`
- [x] Entraînements → `Entrainer`
- [x] Stats → `Stats`
- [x] Programmes → `Programmes`
- [x] Ma séance → `SeanceDetail`
- [x] Courses → `Courses`
- [x] Premium → `PremiumPage`
- [x] Questionnaire → `Questionnaire`
- [x] Scan code-barres, ajout vocal, Mes plats, chrono
- [ ] **Réglages** (`parametres.html`)
- [ ] **Profil** (`profil.html`)
- [ ] **Aide / FAQ** (`aide.html`)
- [ ] **Confidentialité & CGU** (`confidentialite.html`)

> Tant que Réglages est en V1, l'engrenage de la v2 ouvre une page V1 :
> deux sessions distinctes cohabitent, d'où les incohérences observées
> (connecté d'un côté, invité de l'autre).

---

## 2. Points d'entrée à modifier

- [ ] `manifest.json` : `start_url` `./main.html` → `/v2/`
      (sinon toutes les icônes déjà installées ouvrent une page morte)
- [ ] Wrapper Android (`android/`) : vérifier l'URL chargée
- [ ] LemonSqueezy : URL de retour après paiement
- [ ] EmailJS : liens dans les modèles d'e-mails
- [ ] Documents légaux : liens internes vers les pages V1
- [ ] `index.html` et `main.html` → pages de redirection vers `/v2/`

---

## 3. Séquence de bascule

Ne jamais supprimer les fichiers d'un coup.

1. **Redirection** — `index.html` et `main.html` renvoient vers `/v2/`.
   Le reste de la V1 reste en place, accessible en secours.
2. **SW de bascule** — déployer `sw-bascule.js` sous le nom `sw.js`.
   Il efface les caches, redirige les PWA installées vers `/v2/`,
   puis se désinscrit. Indispensable : le SW actuel sert le HTML
   en cache d'abord, supprimer les fichiers ne suffirait pas.
3. **Observation** — une semaine (parc utilisateurs réduit).
4. **Suppression** — retirer les fichiers V1 du repo.

---

## 4. Ce qui ne risque rien

- **Données** : la v2 écrit dans `users/{uid}.v2Data`, jamais dans
  `appData` (V1), qui reste intact en lecture seule. La migration
  lit `appData` depuis Firestore, donc un utilisateur qui n'a jamais
  ouvert la v2 récupère tout, même sur un appareil neuf.
- **Premium** : le webhook écrit `users/{uid}.premium`, lu à
  l'identique par les deux versions.
- **Git** : la V1 reste dans l'historique, restaurable à tout moment.

---

## 5. Rollback

Si un problème sérieux apparaît après bascule :

1. Republier l'ancien `sw.js` avec un nom de cache **supérieur**
   (ex. `belfit-v200`) — sans ça, les navigateurs ne le reprendront pas.
2. Rétablir `index.html` et `main.html` depuis Git.
3. Remettre `manifest.json` sur `./main.html`.

Aucune donnée utilisateur n'est en jeu : `appData` n'a jamais été
modifié.
