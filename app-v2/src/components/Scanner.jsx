import { useState, useEffect, useRef } from 'preact/hooks';
import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { ajouterIngredient } from '../store/journal.js';
import { createPortal } from 'preact/compat';

// ============================================================
// SCAN CODE-BARRES v2 (Premium) — camera -> Open Food Facts ->
// creation auto de l'aliment + memorisation dans customFoods.
// ============================================================

export const customFoods = signal({});
let uidC = null, pretC = false;

effect(() => {
  const u = identite.value;
  if (!u) { uidC = null; pretC = false; return; }
  if (u === uidC) return;
  uidC = u; pretC = false;
  chargerDonnees(u).then(d => {
    if (uidC !== u) return;
    customFoods.value = (d && d.customFoods) || {};
    window.__customFoods = customFoods.value;
    pretC = true;
  });
});

effect(() => {
  const c = customFoods.value;
  window.__customFoods = c;
  const u = identite.value;
  if (!u || !pretC) return;
  sauvegarder(u, { customFoods: c });
});

async function chercherProduit(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product, n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
  if (kcal == null) return null;
  const nom = [p.product_name_fr || p.product_name, p.brands ? p.brands.split(',')[0].trim() : '']
    .filter(Boolean).join(' — ') || `Produit ${code}`;
  return {
    nom,
    kcal: Math.round(kcal),
    prot: Math.round((n.proteins_100g || 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
    lip: Math.round((n.fat_100g || 0) * 10) / 10,
  };
}

export function Scanner({ repasId, fermer }) {
  const [statut, setStatut] = useState('Vise le code-barres…');
  const [manuel, setManuel] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    let qr;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        qr = new Html5Qrcode('scan-zone');
        scannerRef.current = qr;
        await qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 150 } },
          (code) => { qr.stop().catch(() => {}); traiter(code); },
          () => {});
      } catch (e) {
        setStatut("Caméra indisponible — saisis le code à la main");
      }
    })();
    return () => { try { scannerRef.current?.stop(); } catch {} };
  }, []);

  const traiter = async (code) => {
    setStatut('Recherche du produit…');
    const prod = await chercherProduit(code.trim());
    if (!prod) { setStatut('Produit non trouvé — essaie un autre code'); return; }
    customFoods.value = { ...customFoods.value, [prod.nom]: {
      kcal: prod.kcal, prot: prod.prot, carbs: prod.carbs, lip: prod.lip,
    }};
    ajouterIngredient(repasId, prod.nom, 100);
    setStatut(`✓ ${prod.nom} ajouté`);
    setTimeout(fermer, 900);
  };

  return createPortal(
    <>
      <div class="voile montre" onClick={fermer} />
      <div class="modale montre" style="position:relative">
        <button class="scan-x" onClick={fermer} aria-label="Fermer">✕</button>
        <h3>Scanner un produit</h3>
        <div id="scan-zone" class="scan-zone" />
        <div class="scan-statut">{statut}</div>
        <form onSubmit={e => { e.preventDefault(); if (manuel) traiter(manuel); }} class="scan-manuel">
          <input placeholder="Ou saisis le code-barres" value={manuel} onInput={e => setManuel(e.currentTarget.value)} />
          <button type="submit">OK</button>
        </form>
      </div>
    </>
  , document.body);
}
