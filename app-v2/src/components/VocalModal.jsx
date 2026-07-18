import { useState, useRef } from 'preact/hooks';
import { auth } from '../services/firebase.js';
import { DB, NOMS_ALIMENTS } from '../data/aliments.js';
import { repas, ajouterIngredient } from '../store/journal.js';
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
  const ab = await ctx.decodeAudioData(await blob.arrayBuffer());
  const cible = 16000, canal = ab.getChannelData(0), ratio = ab.sampleRate / cible;
  const n = Math.floor(canal.length / ratio), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = canal[Math.floor(i * ratio)];
  try { ctx.close(); } catch (e) {}
  return encoderWav(out, cible);
}

// Trouve l'aliment de la base le plus proche du nom dicte
function trouverAliment(nom) {
  const n = (nom || '').toLowerCase().trim();
  if (!n) return null;
  if (DB[nom]) return nom;
  const exact = NOMS_ALIMENTS.find(a => a.toLowerCase() === n);
  if (exact) return exact;
  const contient = NOMS_ALIMENTS.find(a => a.toLowerCase().includes(n) || n.includes(a.toLowerCase()));
  return contient || null;
}

export function VocalModal({ fermer }) {
  const [etat, setEtat] = useState('pret'); // pret | ecoute | analyse | resultat
  const [props, setProps] = useState([]);
  const [msg, setMsg] = useState('');
  const rec = useRef(null), flux = useRef(null), morceaux = useRef([]);

  const demarrer = async () => {
    try {
      flux.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { setMsg('Micro refusé'); return; }
    morceaux.current = [];
    let mime = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mime)) mime = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    rec.current = mime ? new MediaRecorder(flux.current, { mimeType: mime }) : new MediaRecorder(flux.current);
    rec.current.ondataavailable = e => { if (e.data.size) morceaux.current.push(e.data); };
    rec.current.onstop = envoyer;
    rec.current.start();
    setEtat('ecoute'); setMsg("Je t'écoute…");
  };

  const arreter = () => {
    try { rec.current?.state !== 'inactive' && rec.current.stop(); } catch (e) {}
    flux.current?.getTracks().forEach(t => t.stop());
    setEtat('analyse'); setMsg('Analyse en cours…');
  };

  const envoyer = async () => {
    if (!morceaux.current.length) { setEtat('pret'); setMsg(''); return; }
    let blob = new Blob(morceaux.current, { type: rec.current?.mimeType || 'audio/webm' });
    let type = 'audio/wav';
    try { blob = await versWav(blob); } catch (e) { type = (rec.current?.mimeType || 'audio/webm').split(';')[0]; }
    const b64 = await new Promise(r => { const f = new FileReader(); f.onloadend = () => r(String(f.result).split(',')[1] || ''); f.readAsDataURL(blob); });
    let token = '';
    try { token = await auth.currentUser.getIdToken(); } catch (e) {}
    try {
      const rep = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ audioBase64: b64, mimeType: type }),
      });
      if (rep.status === 403) { setMsg('Fonction Premium'); setEtat('pret'); return; }
      if (!rep.ok) { setMsg('Erreur, réessaie'); setEtat('pret'); return; }
      const { aliments } = await rep.json();
      const trouves = (aliments || []).map(a => {
        const cle = trouverAliment(a.aliment);
        if (!cle) return null;
        const d = DB[cle];
        const portion = a.unite === 'piece' && d.unit ? a.quantite * d.unit : a.quantite;
        return { cle, portion: Math.round(portion * 10) / 10, dit: a.aliment };
      }).filter(Boolean);
      if (!trouves.length) { setMsg("Aucun aliment reconnu, reformule"); setEtat('pret'); return; }
      setProps(trouves); setEtat('resultat'); setMsg('');
    } catch (e) { setMsg('Erreur, réessaie'); setEtat('pret'); }
  };

  const ajouterTout = () => {
    const cible = repas.value[repas.value.length - 1];
    if (!cible) return;
    props.forEach(p => ajouterIngredient(cible.id, p.cle, p.portion));
    fermer();
  };

  return (
    <>
      <div class="voile montre" onClick={fermer} />
      <div class="modale montre">
        <h3>🎤 Ajout vocal</h3>
        <p class="idees-intro">Dis ce que tu as mangé, naturellement.</p>

        {etat !== 'resultat' && (
          <div class="vocal-zone">
            <button
              class={`vocal-mic ${etat === 'ecoute' ? 'actif' : ''}`}
              disabled={etat === 'analyse'}
              onClick={etat === 'ecoute' ? arreter : demarrer}
            >🎤</button>
            <div class="vocal-msg">{msg || 'Tape pour parler'}</div>
          </div>
        )}

        {etat === 'resultat' && (
          <>
            {props.map((p, i) => (
              <div class="idee" key={i}>
                <div class="idee-info">
                  <div class="idee-nom">{p.cle}</div>
                  <div class="idee-mac">{p.portion} g · reconnu : « {p.dit} »</div>
                </div>
                <button onClick={() => setProps(props.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button class="calc-appliquer" onClick={ajouterTout}>Ajouter au repas</button>
          </>
        )}
      </div>
    </>
  );
}

// Bouton d'ouverture (gate Premium)
export function VocalBouton() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        class="vocal-lien"
        onClick={() => { if (estPremium.value) setOuvert(true); else ongletActif.value = 'premium'; }}
      >🎤 Ajout vocal {!estPremium.value && <i class="pro-inline">✦ PRO</i>}</button>
      {ouvert && <VocalModal fermer={() => setOuvert(false)} />}
    </>
  );
}
