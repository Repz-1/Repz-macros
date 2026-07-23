// ============================================================
// NOM D'UTILISATEUR — logique recopiee de la v1 (index.html).
// La table des pseudos n'est jamais lisible par le client : tout
// passe par des Cloud Functions, pour ne jamais exposer les
// adresses e-mail (RGPD, donnees de sante).
// ============================================================

const API_BELFIT = 'https://europe-west1-repz-baf60.cloudfunctions.net';

export function normPseudo(v) {
  return String(v || '').trim().toLowerCase();
}

/** Forme du pseudo, verifiee localement avant tout appel reseau. */
export function formePseudo(pseudo) {
  if (pseudo.length === 0) return 'vide';
  if (pseudo.length < 3) return 'trop_court';
  if (pseudo.length > 20) return 'trop_long';
  if (!/^[a-z0-9_.-]+$/.test(pseudo)) return 'caracteres';
  return null;
}

/**
 * Disponibilite d'un pseudo. Ne revele rien d'autre que libre / pris.
 * Reseau indisponible : on laisse passer, le serveur tranchera a
 * l'inscription (meme choix qu'en v1).
 */
export async function pseudoDisponible(pseudo) {
  try {
    const r = await fetch(API_BELFIT + '/pseudoDisponible', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo }),
    });
    return await r.json();
  } catch (e) {
    return { disponible: true, horsLigne: true };
  }
}

/** Reserve le pseudo une fois le compte cree (unicite garantie par transaction). */
export async function reserverPseudo(user, pseudo) {
  const jeton = await user.getIdToken();
  const r = await fetch(API_BELFIT + '/reserverPseudo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jeton },
    body: JSON.stringify({ pseudo }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'pseudo');
  }
}

/** Connexion par pseudo : le mot de passe est verifie cote serveur. */
export async function jetonParPseudo(pseudo, motDePasse) {
  const r = await fetch(API_BELFIT + '/connexionParPseudo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pseudo, motDePasse }),
  });
  if (!r.ok) throw { code: 'auth/invalid-credential' };
  const d = await r.json();
  return d.jeton;
}
