# Photos d'aliments

Une image par aliment de la base (`app-v2/src/data/aliments.js`),
nommee d'apres le slug du nom : `Blanc de poulet cru` -> `blanc-de-poulet-cru.webp`.

Generation (depuis le PC, l'API Google n'etant pas joignable ailleurs) :

    set GEMINI_API_KEY=xxxx
    node tools/generer-images-aliments.mjs --lot 20     # test sur 20
    node tools/generer-images-aliments.mjs              # les 1048

Puis conversion en WebP 96x96 avant de commiter :

    npm i sharp
    node tools/convertir-images-aliments.mjs

L'app affiche une pastille neutre pour tout aliment sans image :
il n'est pas necessaire d'avoir les 1048 pour deployer.
