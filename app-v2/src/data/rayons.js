// Classement des aliments par rayon — copie exacte d'app.html
export function rayonDe(nom){
    const n = nom.toLowerCase();
    const has = (...mots) => mots.some(m => n.includes(m));
    if(has('oeuf','œuf') && !has('boeuf','bœuf')) return 'oeufs'; // 'boeuf' contient 'oeuf' -> exclure
    if(has('poulet','dinde','boeuf','bœuf','steak','haché','hache','porc','veau','agneau','jambon','saucisse','lardon','viande','escalope','magret','canard')) return 'viandes';
    if(has('saumon','thon','poisson','cabillaud','colin','merlu','crevette','sardine','maquereau','truite','crustac','moule','fruits de mer')) return 'poissons';
    if(has('cacahuète','cacahuete','arachide','purée d','puree d') ||
       (has('beurre') && has('pécan','pecan','amande','noisette','cajou','graine','sésame','sesame','noix'))) return 'epicerie';
    if(has('lait','yaourt','yogourt','fromage','skyr','feta','mozzar','cheddar','crème','creme','beurre','ricotta','cottage','babeurre','kéfir')) return 'laitiers';
    if(has('riz','pâtes','pates','pain','avoine','flocon','quinoa','semoule','boulgour','blé','ble','farine','céréale','cereale','wrap','tortilla','gnocchi','couscous','polenta')) return 'feculents';
    if(has('brocoli','tomate','courgette','salade','épinard','epinard','haricot','carotte','poivron','oignon','ail','champignon','banane','pomme','poire','fraise','orange','kiwi','avocat','patate','concombre','chou','poireau','aubergine','maïs','mais','petit pois','pois chiche','lentille','légume','legume','fruit','citron','mangue','ananas','myrtille','framboise','raisin','courge','betterave','navet','céleri','celeri','asperge','radis','endive','fenouil','datte','abricot','pêche','peche','melon','pastèque','pasteque')) return 'legumes';
    if(has('eau','jus','soda','boisson','café','cafe','thé','the','sirop','cola','bière','biere','vin')) return 'boissons';
    if(has('huile','sucre','sel','miel','cacahuète','cacahuete','amande','noix','pécan','pecan','graine','sauce','chocolat','cacao','whey','protéine','proteine','confiture','pâte à tartiner','pate a tartiner','épice','epice','vinaigre','moutarde','ketchup','mayonnaise','bouillon','levure','gâteau','gateau','biscuit','cookie','barre','céréales')) return 'epicerie';
    return 'autres';
}

export const RAYONS = [
  { k: 'viandes',   emo: '🥩', nom: 'Viandes' },
  { k: 'poissons',  emo: '🐟', nom: 'Poissons' },
  { k: 'oeufs',     emo: '🥚', nom: 'Œufs' },
  { k: 'legumes',   emo: '🥦', nom: 'Fruits & légumes' },
  { k: 'feculents', emo: '🍚', nom: 'Féculents' },
  { k: 'laitiers',  emo: '🥛', nom: 'Produits laitiers' },
  { k: 'epicerie',  emo: '🥜', nom: 'Épicerie' },
  { k: 'boissons',  emo: '🥤', nom: 'Boissons' },
  { k: 'autres',    emo: '📦', nom: 'Autres' },
];
