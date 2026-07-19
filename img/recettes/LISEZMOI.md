# Photos des recettes

Placer ici les photos des idées recettes.

## Format attendu

- **WebP** de préférence (30 % plus léger que le JPG), sinon JPG
- **1200 × 800 px** — ratio 3:2, celui de la bannière
- **moins de 150 Ko** par image
- nom du fichier : le nom de la recette en minuscules, sans accent,
  espaces remplacés par des tirets, extension `.webp`

## Exemples de nommage

| Recette | Fichier |
|---|---|
| Blanc de poulet + riz + légumes | `blanc-de-poulet-riz-legumes.webp` |
| Saumon + patate douce | `saumon-patate-douce.webp` |
| Bowl thon + quinoa | `bowl-thon-quinoa.webp` |

## Sans photo

Une recette sans photo affiche un dégradé doré avec l'emblème BELFIT.
La mise en page reste identique : aucune image cassée, aucun trou.
Les photos peuvent donc être ajoutées au fil du temps.

## Droits

Ne pas utiliser d'images trouvées via un moteur de recherche.
Sources sûres : photos personnelles, Unsplash, Pexels, ou une banque
payante (Adobe Stock). BELFIT étant une application payante, une image
sans licence expose à une réclamation.

## Ratio des images sources

Générer les images en **1536 × 1024** (ratio 3:2). C'est le format
paysage natif de ChatGPT et il correspond exactement à la bannière :
aucune retouche, aucune perte.

Si une image arrive dans un autre ratio (carré, 4:3…), l'outil
`tools/photo-recette.py` **étend le fond** au lieu de couper : l'assiette
reste entière. Le décor étant uni, l'ajout ne se voit pas. Mais une
source déjà au bon ratio donne toujours un meilleur résultat.
