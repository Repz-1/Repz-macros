import { ingredients, totaux, setPortion } from '../store/journal.js';

// ============================================================
// MealCard — version demo.
// Remarque LE point crucial : ce composant ne "met a jour" rien.
// Il DECRIT l'ecran a partir des signaux. Quand un signal change,
// Preact redessine tout seul les zones concernees.
// updatePortion & ses 4 mises a jour manuelles n'existent plus.
// ============================================================

const S = {
  card:  { background:'#fff', borderRadius:'24px', padding:'20px', maxWidth:'420px', margin:'24px auto', boxShadow:'0 2px 12px rgba(0,0,0,.06)' },
  titre: { fontWeight:800, fontSize:'22px', margin:'0 0 4px' },
  kcal:  { color:'#8a8a8a', fontWeight:600, margin:'0 0 16px' },
  ligne: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f0f0f0' },
  input: { width:'64px', padding:'8px', borderRadius:'10px', border:'1px solid #e5e5e5', fontFamily:'inherit', fontWeight:600, textAlign:'center' },
  total: { marginTop:'14px', padding:'10px 14px', background:'#FFF7E0', borderRadius:'12px', color:'#9a7b00', fontWeight:600, fontSize:'14px' }
};

export function MealCard() {
  const t = totaux.value;
  return (
    <div style={S.card}>
      <h2 style={S.titre}>Boisson 1</h2>
      <p style={S.kcal}>{t.kcal.toFixed(0)} kcal</p>

      {ingredients.value.map(ing => {
        const f = ing.portion / 100;
        return (
          <div style={S.ligne} key={ing.id}>
            <div>
              <div style={{fontWeight:600}}>{ing.nom}</div>
              <div style={{fontSize:'12px',color:'#aaa'}}>100g = {ing.kcal100} kcal</div>
            </div>
            <input
              style={S.input}
              type="number"
              value={ing.portion}
              onInput={e => setPortion(ing.id, e.currentTarget.value)}
            />
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:800}}>{(ing.kcal100*f).toFixed(0)} kcal</div>
              <div style={{fontSize:'12px',color:'#aaa'}}>
                {(ing.prot100*f).toFixed(0)}P · {(ing.carbs100*f).toFixed(0)}C · {(ing.lip100*f).toFixed(0)}L
              </div>
            </div>
          </div>
        );
      })}

      <div style={S.total}>
        {t.kcal.toFixed(0)} kcal | {t.prot.toFixed(1)}P | {t.carbs.toFixed(1)}C | {t.lip.toFixed(1)}L
      </div>
    </div>
  );
}
