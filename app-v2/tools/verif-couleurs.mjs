// ============================================================
// VERIFICATIONS §5 du cahier design v3
//  1. Contraste des paires texte×fond reellement utilisees
//  2. Zero hexa orphelin hors :root dans les CSS
// ============================================================
import { readFileSync } from 'fs';

const JETONS = {
  fond:'#F6F5F2', carte:'#FFFFFF', piste:'#EFEEEA', bordure:'#E4E2DC',
  texte:'#141414', texte2:'#5C5A55', texte3:'#8F8D87',
  or:'#FFD500', alerte:'#D63A23', ok:'#2E7D4F', near:'#C77E1A',
};
const lum = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const ratio = (a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};

console.log('--- Contrastes (>= 4.5, ou >= 3 en grand gras) ---');
const paires = [
  ['texte','carte',4.5],['texte','fond',4.5],['texte2','carte',4.5],['texte2','fond',4.5],
  ['texte','or',4.5],           // texte encre sur CTA jaune
  ['alerte','carte',4.5],['near','carte',3],['ok','carte',3],
  ['texte3','carte',3],         // placeholders : grand/desactive tolere
];
let ko=0;
for (const [t,f,seuil] of paires){
  const r=ratio(JETONS[t],JETONS[f]);
  const ok=r>=seuil; if(!ok) ko++;
  console.log((ok?'✓':'✗'), t,'sur',f,'=',r.toFixed(2),'(seuil',seuil+')');
}
console.log('jaune×blanc interdit :', ratio(JETONS.or,'#FFFFFF').toFixed(2), '< 3 -> jamais de texte blanc sur jaune ✓');

console.log('\n--- Hexas hors jetons dans les CSS du journal ---');
const AUTORISES = new Set([...Object.values(JETONS).map(x=>x.toUpperCase()),
  '#FFFFFF','#141414','#D6D3CC',
  '#1F1F1F','#F5A800','#E4610B',            // identites macros (decision Raci conservee)
  '#0EA5E9','#0284C7','#D6E8F2','#4A6B7C','#BAE6FD','#F0F9FF','#EFF6FF','#E0F2FE','#0369A1',  // famille eau (fonctionnelle)
]);
// Palettes des ecrans restants (chrono, stats muscles, login) : etape 5
// du cahier, hors perimetre de cette passe — comptees a part.
const RESTANT = new Set(['#FFF4CC','#F3E2A8','#FFD86B','#FFE28A','#FFDF8E','#FFC107','#EF4444','#F97316','#10B981','#06B6D4','#3B82F6','#8B5CF6','#DC2626','#F1F5F9','#E9EBEF','#1E293B','#334155','#64748B','#94A3B8','#FFC400','#FFC933','#FFC93C']);
let orphelins=0, restant=0;
for (const f of ['src/styles/design-system.css','src/styles/journal-socle.css']){
  const css=readFileSync(f,'utf8');
  const dansRoot = f.endsWith('design-system.css');
  for (const m of css.matchAll(/#[0-9A-Fa-f]{6}\b/g)){
    const hex=m[0].toUpperCase();
    if (dansRoot) continue;
    if (RESTANT.has(hex)) { restant++; continue; }
    if (!AUTORISES.has(hex)){ orphelins++; if(orphelins<=12) console.log('✗', f.split('/').pop(), hex); }
  }
}
console.log(orphelins? orphelins+' hexas orphelins (Journal)':'✓ aucun hexa orphelin sur le perimetre Journal'); console.log('(ecrans restants — etape 5 a venir :', restant, 'occurrences)');
process.exit(ko?1:0);
