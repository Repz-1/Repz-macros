import { useState, useRef } from 'preact/hooks';
import { auth } from '../services/firebase.js';
import { DB, NOMS_ALIMENTS } from '../data/aliments.js';
import { ajouterIngredient, repas } from '../store/journal.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';

const API = 'https://europe-west1-repz-baf60.cloudfunctions.net/transcrireVocal';

// --- Conversion WAV 16 kHz mono (Gemini n'accepte pas le WebM) ---
function encoderWav(samples, sr) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); txt(8, 'WAVE');
  txt(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  txt(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

async function versWav(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  const cible = 16000, canal = audio.getChannelData(0);
  const ratio = audio.sampleRate / cible, n = Math.floor(canal.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = canal[Math.floor(i * ratio)];
  try { ctx.close(); } catch {}
  return encoderWav(out, cible);
}

// Trouve l'aliment de la base le plus proche du nom dicte
function trouverAliment(nom) {
  const n = nom.toLowerCase().trim();
  const exact = NOMS_ALIMENTS.find(x => x.toLowerCase() === n);
  if (exact) return exact;
  const contient = NOMS_ALIMENTS.find(x => x.toLowerCase().includes(n) || n.includes(x.toLowerCase()));
  return contient || null;
}

export function VocalModal({ fermer }) {
  const [etat, setEtat] = useState('pret'); // pret | ecoute | analyse | resultat
  const [props, setProps] = useState([]);
  const [msg, setMsg] = useState('');
  const rec = useRef(null), chunks = useRef([]), flux = useRef(null);

  const demarrer = async () => {
    try {
      flux.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMsg('Micro refusé'); return;
    }
    chunks.current = [];
    const mr = new MediaRecorder(flux.current);
    rec.current = mr;
    mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
    mr.onstop = envoyer;
    mr.start();
    setEtat('ecoute'); setMsg('Je t\'écoute…');
  };

  const arreter = () => {
    try { rec.current?.stop(); } catch {}
    flux.current?.getTracks().forEach(t => t.stop());
    setEtat('analyse'); setMsg('Analyse en cours…');
  };

  const envoyer = async () => {
    if (!chunks.current.length) { setEtat('pret'); setMsg(''); return; }
    let blob = new Blob(chunks.current, { type: rec.current?.mimeType || 'audio/webm' });
    let type = 'audio/wav';
    try { blob = await versWav(blob); } catch { type = 'audio/webm'; }
    const b64 = await new Promise(r => {
      const fr = new FileReader();
      fr.onloadend = () => r(String(fr.result).split(',')[1] || '');
      fr.readAsDataURL(blob);
    });
    let token = '';
    try { token = await auth.currentUser.getIdToken(); } catch {}
    try {
      const rep = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ audioBase64: b64, mimeType: type }),
      });
      if (rep.status === 403) { setMsg('Fonction Premium'); setEtat('pret'); return; }
      if (!rep.ok) { setMsg('Erreur, réessaie'); setEtat('pret'); return; }
      const data = await rep.json();
      const list = (data.aliments || []).map(a => {
        const trouve = trouverAliment(a.aliment);
        const d = trouve ? DB[trouve] : null;
        const q = a.unite === 'piece' && d?.unit ? a.quantite * d.unit : a.quantite;
        return { dit: a.aliment, nom: trouve, portion: Math.round(q) };
      });
      if (!list.length) { setMsg('Rien compris, réessaie'); setEtat('pret'); return; }
      setProps(list); setEtat('resultat'); setMsg('');
    } catch {
      setMsg('Erreur, réessaie'); setEtat('pret');
    }
  };

  const ajouterTout = () => {
    const cible = repas.value[repas.value.length - 1];
    if (!cible) return;
    props.filter(p => p.nom).forEach(p => ajouterIngredient(cible.id, p.nom, p.portion));
    fermer();
  };

  if (!estPremium.value) {
    return (
      <>
        <div class="voile montre" onClick={fermer} />
        <div class="modale montre">
          <h3>🎤 Ajout vocal <i class="pro-inline">✦ PRO</i></h3>
          <p style={{ color: '#6a6558', fontSize: '14px', textAlign: 'center', margin: '0 0 16px' }}>
            Dis simplement ce que tu as mangé, l'IA s'occupe du reste.
          </p>
          <button class="calc-appliquer" onClick={() => { ongletActif.value = 'premium'; fermer(); }}>
            Découvrir Premium
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div class="voile montre" onClick={fermer} />
      <div class="modale montre">
        <h3>🎤 Ajout vocal</h3>

        {etat !== 'resultat' && (
          <>
            <p class="vocal-aide">Ex. « 250 grammes de poulet et 150 grammes de riz »</p>
            <button
              class={`vocal-micro ${etat === 'ecoute' ? 'actif' : ''}`}
              onClick={etat === 'ecoute' ? arreter : demarrer}
              disabled={etat === 'analyse'}
            >🎤</button>
            <div class="vocal-msg">{msg}</div>
          </>
        )}

        {etat === 'resultat' && (
          <>
            {props.map((p, i) => (
              <div class="vocal-prop" key={i}>
                <span class={p.nom ? '' : 'inconnu'}>{p.nom || p.dit}</span>
                <span>{p.nom ? `${p.portion} g` : 'non trouvé'}</span>
              </div>
            ))}
            <button class="calc-appliquer" onClick={ajouterTout}>Ajouter au repas</button>
          </>
        )}
      </div>
    </>
  );
}
