# BelFit — état réel du projet

**Source de vérité unique.** Tout autre document du dépôt est de
l'historique. En cas de contradiction, ce fichier gagne.

Dernière mise à jour : 26 août 2026.

---

## Ce qui est en production

- **Le site** : https://belfit.be — GitHub Pages, publié par
  `.github/workflows/` à chaque push sur `main`.
- **La V2 (Preact + Vite) est ACTIVE et se construit à chaque push.**
  Elle est servie sous `/v2/`. La migration n'est pas arrêtée : elle
  est en cours. Le `app-v2/README.md` qui annonce le contraire date de
  juillet et n'est plus vrai.
- **La V1 (HTML/CSS/JS)** reste en ligne à la racine. Elle sert encore
  les pages non migrées et l'achat Premium.

## Où est le code vivant

| Zone | Chemin |
|---|---|
| Application V2 | `app-v2/src/` |
| Pages V1 encore servies | racine (`app.html`, `plans.html`, …) |
| Fonctions serveur | `functions/` |
| Outils de contrôle | `tools/` |
| Bancs d'essai | `app-v2/apercu/` → `apercu/*.html` |

`app-v2/src/legacy/*.body.html` : références de migration, **jamais
chargées** à l'exécution. À supprimer quand la V1 s'éteint.

## Comment on publie

```
node tools/verif-js.js      # syntaxe et exécution de base
node tools/audit.mjs        # non-régression (R1..R59)
node tools/sync-version.mjs # monte les 3 versions ensemble
cd app-v2 && npx vite build
```

Les deux premiers tournent aussi dans la CI **avant** le build : un
écart arrête le déploiement.

## Le dernier pont avec la V1

`PremiumPage.jsx` lit la clé localStorage `repz_premium`, écrite par la
V1 après un achat. C'est un pont de **données**. Le couper avant
l'extinction de la V1 ferait retomber en gratuit tout utilisateur ayant
payé côté V1. Aucun pont visuel ne subsiste.

## Règles à respecter

1. La V2 doit être une copie exacte de la V1 tant que la page n'a pas
   été redessinée volontairement. Toute divergence non demandée est une
   régression.
2. Chaque bug corrigé devient une règle dans `tools/audit.mjs`.
3. Aucun retrait ni déplacement d'élément sans dire ce que ça casse
   ailleurs, et sans validation.
4. Jamais de suppression par expression régulière multi-lignes sur du
   HTML. Remplacement de chaîne exacte, avec assertion de compte.
5. Les tests Playwright tournent en mode tactile
   (`hasTouch: true, isMobile: true`).

## Zones abandonnées

- `app-v2/README.md` — ARCHIVE, ne pas utiliser comme source de vérité.
- Tout document parlant d'une migration « arrêtée » ou « en pause ».
