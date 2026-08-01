const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// Secret partagé avec LemonSqueezy (défini via: firebase functions:secrets:set LEMON_WEBHOOK_SECRET)
const LEMON_WEBHOOK_SECRET = defineSecret("LEMON_WEBHOOK_SECRET");

/**
 * Reçoit les webhooks LemonSqueezy et met à jour le statut Premium
 * sur le compte Firestore correspondant (users/{uid}.premium).
 * L'uid Firebase est transmis via custom_data au moment du checkout.
 */
exports.lemonWebhook = onRequest(
  {secrets: [LEMON_WEBHOOK_SECRET], region: "europe-west1", cors: false},
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      // 1) Vérifier la signature (HMAC-SHA256 du corps brut)
      const secret = LEMON_WEBHOOK_SECRET.value();
      const signature = (req.get("X-Signature") || "").trim();

      // rawBody = octets bruts exacts recus (indispensable pour le HMAC).
      // Fallback si absent : re-serialiser (moins fiable mais evite un crash).
      const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), "utf8");

      const digest = crypto.createHmac("sha256", secret)
        .update(raw)
        .digest("hex");

      const a = Buffer.from(digest, "utf8");
      const b = Buffer.from(signature, "utf8");
      const valide = a.length === b.length && crypto.timingSafeEqual(a, b);

      if (!valide) {
        // Diagnostic (visible dans les logs Firebase) : compare les empreintes
        // SANS jamais logguer le secret lui-meme.
        console.warn("Signature invalide", JSON.stringify({
          digestCalcule: digest.slice(0, 12) + "...",
          signatureRecue: signature.slice(0, 12) + "...",
          rawBodyPresent: !!req.rawBody,
          rawBodyLen: raw.length,
          secretLen: secret ? secret.length : 0,
        }));
        res.status(401).send("Invalid signature");
        return;
      }

      // 2) Lire l'évènement
      const body = JSON.parse(req.rawBody.toString("utf8"));
      const event = body && body.meta && body.meta.event_name;
      const uid = body && body.meta && body.meta.custom_data && body.meta.custom_data.uid;
      const attr = (body && body.data && body.data.attributes) || {};
      const status = attr.status || null; // active | on_trial | paused | past_due | unpaid | cancelled | expired

      if (!uid) {
        console.warn("Pas d'uid dans custom_data", event);
        res.status(200).send("no uid");
        return;
      }

      // 3) Déterminer si Premium actif
      let premium;
      if (event && event.indexOf("subscription_") === 0) {
        // Un abonnement annulé reste actif jusqu'à la fin de période -> LS garde status "active"/"cancelled"
        premium = (status === "active" || status === "on_trial");
      } else if (event === "order_created") {
        premium = true;
      } else {
        res.status(200).send("ignored");
        return;
      }

      // 4) Identifier la formule : le quota d'ajustements en depend
      //    (2 par mois en mensuel, 4 en annuel).
      const libelle = [
        attr.variant_name, attr.product_name, attr.first_order_item &&
        attr.first_order_item.variant_name,
      ].filter(Boolean).join(" ").toLowerCase();
      let formule = null;
      if (/annuel|annual|yearly|year|jaar/.test(libelle)) formule = "annuel";
      else if (/mensuel|monthly|month|maand/.test(libelle)) formule = "mensuel";

      // 5) Écrire sur le compte
      const maj = {
        premium: premium,
        source: "lemonsqueezy",
        lsStatus: status,
        lsEvent: event,
        updatedAt: Date.now(),
      };
      if (formule) maj.formule = formule;
      await db.collection("users").doc(uid).set(maj, {merge: true});

      console.log("Premium maj:", uid, premium, event, status, formule);
      res.status(200).send("ok");
    } catch (e) {
      console.error("Erreur webhook:", e);
      res.status(500).send("error");
    }
  }
);


// ============================================================
// TRANSCRIPTION VOCALE (Premium) — audio -> JSON aliments via Gemini.
// Le navigateur enregistre l'audio (MediaRecorder), l'envoie ici en base64,
// Gemini transcrit ET structure en une seule etape. Plus fiable et coherent
// que le Web Speech API navigateur.
// Cle API Gemini stockee en secret : firebase functions:secrets:set GEMINI_API_KEY
// ============================================================
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

exports.transcrireVocal = onRequest(
  {secrets: [GEMINI_API_KEY], region: "europe-west1", cors: true, timeoutSeconds: 60},
  async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({error: "method"}); return; }

    try {
      // 1) Verifier que l'utilisateur est connecte ET Premium (gating serveur)
      const authHeader = req.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) { res.status(401).json({error: "no_auth"}); return; }

      let uid;
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch (e) {
        res.status(401).json({error: "bad_token"}); return;
      }

      const userDoc = await db.collection("users").doc(uid).get();
      const estPremium = userDoc.exists && userDoc.data().premium === true;
      if (!estPremium) { res.status(403).json({error: "not_premium"}); return; }

      // 2) Recuperer l'audio (base64) et son type
      const {audioBase64, mimeType} = req.body || {};
      if (!audioBase64) { res.status(400).json({error: "no_audio"}); return; }

      // 3) Appel Gemini : audio -> JSON structure
      const prompt = `Tu analyses un enregistrement audio en francais ou l'utilisateur decrit ce qu'il a mange ou bu.
Transcris puis extrais chaque aliment avec sa quantite. Reponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans backticks.
Format exact : [{"aliment":"nom en francais","quantite":nombre,"unite":"g"|"ml"|"piece"}]
Regles :
- Convertis en grammes/ml quand c'est possible (ex: "une dose de whey"=30g, "un bol de riz"=200g, "un oeuf"=60g, "une banane"=120g).
- Si l'unite est une piece indenombrable, mets "piece" et quantite = nombre de pieces.
- Ignore les mots de liaison. Si rien d'exploitable, renvoie [].
- Noms d'aliments simples et courants (ex: "poulet", "riz", "avoine", "banane").`;

      // Gemini n'accepte pas les parametres de codec ("audio/webm;codecs=opus")
      const typeAudio = String(mimeType || "audio/wav").split(";")[0].trim();
      console.log("transcrireVocal", JSON.stringify({uid, typeAudio, tailleKo: Math.round(audioBase64.length * 0.75 / 1024)}));

      // Google retire regulierement ses modeles (gemini-2.0-flash a ete
      // coupe le 1er juin 2026, ce qui a casse le vocal en silence).
      // On essaie donc une liste ordonnee : si un modele repond 404,
      // on passe au suivant au lieu de tomber en panne.
      const MODELES = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
      const geminiBody = {
        contents: [{
          parts: [
            {text: prompt},
            {inline_data: {mime_type: typeAudio, data: audioBase64}},
          ],
        }],
        generationConfig: {temperature: 0.1, responseMimeType: "application/json"},
      };

      let gRes = null;
      let dernierErr = "";
      for (const modele of MODELES) {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
          modele + ":generateContent?key=" + GEMINI_API_KEY.value();
        gRes = await fetch(url, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(geminiBody),
        });
        if (gRes.ok) { console.log("transcrireVocal modele:", modele); break; }
        dernierErr = (await gRes.text()).slice(0, 300);
        console.error("Gemini", modele, gRes.status, dernierErr);
        if (gRes.status !== 404) break; // autre erreur : inutile d'essayer les suivants
      }

      if (!gRes || !gRes.ok) {
        // Le detail remonte jusqu'a l'ecran du telephone via le diagnostic.
        let detail = "";
        try { detail = (JSON.parse(dernierErr).error || {}).message || ""; } catch (e) { detail = dernierErr; }
        res.status(502).json({error: "gemini_failed", detail: String(detail).slice(0, 160)});
        return;
      }

      const gData = await gRes.json();
      const texte = gData.candidates &&
        gData.candidates[0] &&
        gData.candidates[0].content &&
        gData.candidates[0].content.parts[0].text || "[]";

      let aliments;
      try {
        aliments = JSON.parse(texte);
        if (!Array.isArray(aliments)) aliments = [];
      } catch (e) {
        console.warn("JSON parse fail", texte.slice(0, 200));
        aliments = [];
      }
      if (!aliments.length) {
        console.warn("Aucun aliment extrait. Reponse Gemini:", texte.slice(0, 300));
      }

      res.status(200).json({aliments});
    } catch (err) {
      console.error("transcrireVocal error", err);
      res.status(500).json({error: "server"});
    }
  }
);

// ============================================================
// PHOTO D'ASSIETTE -> ALIMENTS
//
// Meme pipeline que le vocal : media -> Gemini -> JSON structure
// {aliment, quantite, unite} -> journal. Seuls changent le type
// d'entree (image) et le prompt. Premium-gated cote serveur,
// comme le vocal. Les resultats sont PRE-REMPLIS mais modifiables
// cote client avant validation : l'IA estime les portions, elle
// ne les connait pas.
// ============================================================

exports.analyserPhoto = onRequest(
  {secrets: [GEMINI_API_KEY], region: "europe-west1", cors: true, timeoutSeconds: 60},
  async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({error: "method"}); return; }

    try {
      // 1) Connecte ET Premium (gating serveur, comme le vocal)
      const authHeader = req.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) { res.status(401).json({error: "no_auth"}); return; }

      let uid;
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch (e) {
        res.status(401).json({error: "bad_token"}); return;
      }

      const userDoc = await db.collection("users").doc(uid).get();
      const estPremium = userDoc.exists && userDoc.data().premium === true;
      if (!estPremium) { res.status(403).json({error: "not_premium"}); return; }

      // 2) Recuperer l'image (base64) et son type
      const {imageBase64, mimeType} = req.body || {};
      if (!imageBase64) { res.status(400).json({error: "no_image"}); return; }
      // ~6 Mo max une fois decode : au-dela, le client doit recompresser.
      if (imageBase64.length > 8 * 1024 * 1024) {
        res.status(413).json({error: "image_too_big"}); return;
      }

      // 3) Appel Gemini : photo -> JSON structure
      const prompt = `Tu analyses la photo d'un repas ou d'un aliment.
Identifie chaque aliment visible avec une estimation de sa quantite. Reponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans backticks.
Format exact : [{"aliment":"nom en francais","quantite":nombre,"unite":"g"|"ml"|"piece"}]
Regles :
- Estime les portions en grammes/ml d'apres la taille apparente (assiette standard ~26 cm de diametre comme repere).
- Si l'element se compte a la piece (oeuf, banane, tranche de pain), mets "piece" et quantite = nombre de pieces.
- Nomme l'aliment tel qu'il est PREPARE sur la photo (ex: "riz cuit", "poulet grille", "pates cuites").
- Noms d'aliments simples et courants. Decompose les plats en composants visibles (ex: assiette poulet-riz-brocoli = 3 entrees).
- N'invente pas d'ingredients invisibles (sauces ou huiles non discernables). Si rien d'exploitable (photo floue, pas de nourriture), renvoie [].`;

      const typeImage = String(mimeType || "image/jpeg").split(";")[0].trim();
      console.log("analyserPhoto", JSON.stringify({uid, typeImage, tailleKo: Math.round(imageBase64.length * 0.75 / 1024)}));

      // Meme liste de repli que le vocal : un modele retire (404) ne
      // met pas la feature en panne.
      const MODELES = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
      const geminiBody = {
        contents: [{
          parts: [
            {text: prompt},
            {inline_data: {mime_type: typeImage, data: imageBase64}},
          ],
        }],
        generationConfig: {temperature: 0.1, responseMimeType: "application/json"},
      };

      let gRes = null;
      let dernierErr = "";
      for (const modele of MODELES) {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
          modele + ":generateContent?key=" + GEMINI_API_KEY.value();
        gRes = await fetch(url, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(geminiBody),
        });
        if (gRes.ok) { console.log("analyserPhoto modele:", modele); break; }
        dernierErr = (await gRes.text()).slice(0, 300);
        console.error("Gemini", modele, gRes.status, dernierErr);
        if (gRes.status !== 404) break;
      }

      if (!gRes || !gRes.ok) {
        let detail = "";
        try { detail = (JSON.parse(dernierErr).error || {}).message || ""; } catch (e) { detail = dernierErr; }
        res.status(502).json({error: "gemini_failed", detail: String(detail).slice(0, 160)});
        return;
      }

      const gData = await gRes.json();
      const texte = gData.candidates &&
        gData.candidates[0] &&
        gData.candidates[0].content &&
        gData.candidates[0].content.parts[0].text || "[]";

      let aliments;
      try {
        aliments = JSON.parse(texte);
        if (!Array.isArray(aliments)) aliments = [];
      } catch (e) {
        console.warn("JSON parse fail", texte.slice(0, 200));
        aliments = [];
      }
      if (!aliments.length) {
        console.warn("Aucun aliment detecte. Reponse Gemini:", texte.slice(0, 300));
      }

      res.status(200).json({aliments});
    } catch (err) {
      console.error("analyserPhoto error", err);
      res.status(500).json({error: "server"});
    }
  }
);

// ============================================================
// PSEUDONYMES DE CONNEXION
//
// L'utilisateur peut se connecter avec son email OU son pseudo.
// Contrainte : Firebase Auth n'accepte que l'email. Il faut donc
// resoudre pseudo -> compte cote serveur.
//
// Choix de conception : la table des pseudos n'est JAMAIS lisible
// par le client. Sans cela, n'importe qui pourrait aspirer la liste
// des adresses email des utilisateurs (RGPD, donnees de sante).
// La verification du mot de passe se fait ici, et le client ne
// recoit qu'un jeton de connexion — l'email ne sort jamais.
// ============================================================

// Cle Web de l'API Firebase, utilisee pour verifier le mot de passe.
// A definir via : firebase functions:secrets:set FIREBASE_WEB_API_KEY
const FIREBASE_WEB_API_KEY = defineSecret("FIREBASE_WEB_API_KEY");

const PSEUDO_MIN = 3;
const PSEUDO_MAX = 20;
const PSEUDO_MOTIF = /^[a-z0-9_.-]+$/;
// Pseudos interdits : usurpation d'identite de la marque ou du support.
const PSEUDO_RESERVES = new Set([
  "admin", "administrateur", "belfit", "coach", "contact", "support",
  "moderateur", "moderator", "root", "system", "systeme", "info",
  "help", "aide", "staff", "equipe", "team", "officiel", "official",
]);

/** Normalise un pseudo : minuscules, sans espaces superflus. */
function normaliserPseudo(brut) {
  return String(brut || "").trim().toLowerCase();
}

/** Verifie la forme d'un pseudo. Retourne null si valide, sinon un code d'erreur. */
function validerPseudo(pseudo) {
  if (pseudo.length < PSEUDO_MIN) return "trop_court";
  if (pseudo.length > PSEUDO_MAX) return "trop_long";
  if (!PSEUDO_MOTIF.test(pseudo)) return "caracteres";
  if (PSEUDO_RESERVES.has(pseudo)) return "reserve";
  return null;
}

/** Reponse CORS commune : seul le site BELFIT peut appeler ces fonctions. */
function appliquerCors(req, res) {
  const origines = [
    "https://belfit.be",
    "https://www.belfit.be",
    "https://repz-1.github.io",
  ];
  const origine = req.headers.origin;
  if (origines.includes(origine)) {
    res.set("Access-Control-Allow-Origin", origine);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  // reserverPseudo est appelee avec un jeton de session : sans
  // Authorization dans cette liste, le navigateur bloque la requete au
  // prevol et l'inscription echoue juste apres la creation du compte.
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

/**
 * Indique si un pseudo est disponible.
 * Ne revele aucune donnee personnelle : uniquement libre / pris.
 */
exports.pseudoDisponible = onRequest(
  {region: "europe-west1", cors: false},
  async (req, res) => {
    if (appliquerCors(req, res)) return;
    try {
      const pseudo = normaliserPseudo(req.body && req.body.pseudo);
      const probleme = validerPseudo(pseudo);
      if (probleme) {
        res.status(200).json({disponible: false, raison: probleme});
        return;
      }
      const snap = await db.collection("usernames").doc(pseudo).get();
      res.status(200).json({disponible: !snap.exists});
    } catch (err) {
      console.error("pseudoDisponible", err);
      res.status(500).json({error: "server"});
    }
  },
);

/**
 * Reserve un pseudo pour l'utilisateur qui vient de creer son compte.
 * L'ecriture est transactionnelle : deux inscriptions simultanees avec
 * le meme pseudo ne peuvent pas aboutir toutes les deux.
 */
exports.reserverPseudo = onRequest(
  {region: "europe-west1", cors: false},
  async (req, res) => {
    if (appliquerCors(req, res)) return;
    try {
      const jeton = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!jeton) {
        res.status(401).json({error: "non_authentifie"});
        return;
      }
      const decode = await admin.auth().verifyIdToken(jeton);
      const uid = decode.uid;

      const pseudo = normaliserPseudo(req.body && req.body.pseudo);
      const probleme = validerPseudo(pseudo);
      if (probleme) {
        res.status(400).json({error: probleme});
        return;
      }

      const refPseudo = db.collection("usernames").doc(pseudo);
      const refUser = db.collection("users").doc(uid);

      await db.runTransaction(async (tx) => {
        const existant = await tx.get(refPseudo);
        if (existant.exists && existant.data().uid !== uid) {
          throw new Error("pris");
        }
        // Un utilisateur ne peut detenir qu'un seul pseudo :
        // l'ancien est libere si besoin.
        const snapUser = await tx.get(refUser);
        const ancien = snapUser.exists ? snapUser.data().pseudo : null;
        if (ancien && ancien !== pseudo) {
          tx.delete(db.collection("usernames").doc(ancien));
        }
        tx.set(refPseudo, {uid, cree: new Date().toISOString()});
        tx.set(refUser, {pseudo}, {merge: true});
      });

      res.status(200).json({ok: true, pseudo});
    } catch (err) {
      if (err && err.message === "pris") {
        res.status(409).json({error: "pris"});
        return;
      }
      console.error("reserverPseudo", err);
      res.status(500).json({error: "server"});
    }
  },
);

/**
 * Connexion par pseudo.
 * Le mot de passe est verifie ici, cote serveur. En cas de succes,
 * le client recoit un jeton de connexion — jamais l'adresse email.
 */
exports.connexionParPseudo = onRequest(
  {secrets: [FIREBASE_WEB_API_KEY], region: "europe-west1", cors: false},
  async (req, res) => {
    if (appliquerCors(req, res)) return;
    try {
      const pseudo = normaliserPseudo(req.body && req.body.pseudo);
      const motDePasse = String((req.body && req.body.motDePasse) || "");
      if (!pseudo || !motDePasse) {
        res.status(400).json({error: "identifiants"});
        return;
      }

      const snap = await db.collection("usernames").doc(pseudo).get();
      if (!snap.exists) {
        // Meme reponse que pour un mot de passe faux : ne pas reveler
        // quels pseudos existent.
        res.status(401).json({error: "identifiants"});
        return;
      }

      const uid = snap.data().uid;
      const utilisateur = await admin.auth().getUser(uid);

      // Verification du mot de passe via l'API Identity Toolkit.
      const reponse = await fetch(
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" +
          FIREBASE_WEB_API_KEY.value(),
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            email: utilisateur.email,
            password: motDePasse,
            returnSecureToken: false,
          }),
        },
      );

      if (!reponse.ok) {
        res.status(401).json({error: "identifiants"});
        return;
      }

      const jeton = await admin.auth().createCustomToken(uid);
      res.status(200).json({jeton});
    } catch (err) {
      console.error("connexionParPseudo", err);
      res.status(500).json({error: "server"});
    }
  },
);

// ============================================================
// MAIL DE REINITIALISATION AUX COULEURS BELFIT
//
// Firebase envoie par defaut un message en anglais, expedie depuis
// repz-baf60.firebaseapp.com : objet technique, URL brute de trois
// lignes, aucune identite visuelle. Resultat observe : classe en
// courrier indesirable.
//
// Ici : on genere le lien securise avec le SDK Admin, puis on envoie
// NOTRE message depuis belfit.be via Resend.
//
// Secret a poser : firebase functions:secrets:set RESEND_API_KEY
// ============================================================
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

/** Expediteur : doit correspondre au domaine verifie chez Resend. */
const EXPEDITEUR = "BELFIT <noreply@belfit.be>";

/** Ou arrivent les reponses : noreply n'est pas une vraie boite. */
const REPONSE_A = "contact@belfit.be";

/** Notre page de saisie du nouveau mot de passe. */
const PAGE_REINIT = "https://belfit.be/reinitialisation.html";

/** Notre page de confirmation d'adresse. */
const PAGE_VERIF = "https://belfit.be/verification.html";

/** Modele du message, en trois langues. */
const TEXTES = {
  fr: {
    objet: "Réinitialise ton mot de passe BELFIT",
    titre: "Réinitialise ton mot de passe",
    intro: "Tu as demandé à changer le mot de passe de ton compte BELFIT. " +
      "Appuie sur le bouton ci-dessous — le lien reste valable 1 heure.",
    bouton: "Choisir un nouveau mot de passe",
    rassure: "Tu n'es pas à l'origine de cette demande ?<br>" +
      "Ignore ce message, ton mot de passe reste inchangé.",
    slogan: "Ton coach nutrition et entraînement",
    pied: "Nous écrire",
  },
  en: {
    objet: "Reset your BELFIT password",
    titre: "Reset your password",
    intro: "You asked to change the password of your BELFIT account. " +
      "Tap the button below — the link stays valid for 1 hour.",
    bouton: "Choose a new password",
    rassure: "Didn't request this?<br>Just ignore this message, " +
      "your password stays unchanged.",
    slogan: "Your nutrition and training coach",
    pied: "Contact us",
  },
  nl: {
    objet: "Stel je BELFIT-wachtwoord opnieuw in",
    titre: "Stel je wachtwoord opnieuw in",
    intro: "Je vroeg om het wachtwoord van je BELFIT-account te wijzigen. " +
      "Tik op de knop hieronder — de link blijft 1 uur geldig.",
    bouton: "Kies een nieuw wachtwoord",
    rassure: "Heb je dit niet aangevraagd?<br>" +
      "Negeer dit bericht, je wachtwoord blijft ongewijzigd.",
    slogan: "Jouw coach voor voeding en training",
    pied: "Contacteer ons",
  },
};

/** Confirmation d'adresse, en trois langues. */
const TEXTES_VERIF = {
  fr: {
    objet: "Confirme ton adresse — BELFIT",
    titre: "Plus qu'une étape",
    intro: "Bienvenue chez BELFIT. Confirme ton adresse e-mail pour " +
      "débloquer ton programme — le lien reste valable 24 heures.",
    bouton: "Confirmer mon adresse",
    rassure: "Tu n'es pas à l'origine de cette inscription ?<br>" +
      "Ignore ce message, aucun compte ne sera activé.",
    slogan: "Ton coach nutrition et entraînement",
    pied: "Nous écrire",
  },
  en: {
    objet: "Confirm your email — BELFIT",
    titre: "One last step",
    intro: "Welcome to BELFIT. Confirm your email address to unlock " +
      "your programme — the link stays valid for 24 hours.",
    bouton: "Confirm my email",
    rassure: "Didn't sign up?<br>Just ignore this message, " +
      "no account will be activated.",
    slogan: "Your nutrition and training coach",
    pied: "Contact us",
  },
  nl: {
    objet: "Bevestig je e-mailadres — BELFIT",
    titre: "Nog één stap",
    intro: "Welkom bij BELFIT. Bevestig je e-mailadres om je programma " +
      "te ontgrendelen — de link blijft 24 uur geldig.",
    bouton: "Mijn adres bevestigen",
    rassure: "Heb je je niet ingeschreven?<br>" +
      "Negeer dit bericht, er wordt geen account geactiveerd.",
    slogan: "Jouw coach voor voeding en training",
    pied: "Contacteer ons",
  },
};

/** Construit le message HTML. Tables + styles en ligne : seule
 *  mise en forme fiable dans les clients de messagerie. */
function modeleMail(lien, langue, jeu) {
  const J = jeu || TEXTES;
  const T = J[langue] || J.fr;
  return `<!DOCTYPE html>
<html lang="${langue}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F6F8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F6F8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;">
  <tr><td align="center" style="background:#141414;padding:30px 24px 26px;">
    <div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:27px;font-weight:800;letter-spacing:2px;color:#FFFFFF;">BEL<span style="color:#F7B500;">FIT</span></div>
    <div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:12.5px;color:#9C968A;margin-top:7px;">${T.slogan}</div>
  </td></tr>
  <tr><td style="padding:32px 30px 8px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="font-size:20px;font-weight:800;color:#181818;line-height:1.35;margin-bottom:14px;">${T.titre}</div>
    <div style="font-size:14.5px;color:#5C5750;line-height:1.65;">${T.intro}</div>
  </td></tr>
  <tr><td align="center" style="padding:26px 30px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" style="background:#F7B500;border-radius:14px;">
        <a href="${lien}" style="display:block;padding:16px 40px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:800;color:#181818;text-decoration:none;">${T.bouton}</a>
      </td></tr></table>
  </td></tr>
  <tr><td style="padding:22px 30px 30px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="font-size:13px;color:#8A8580;line-height:1.6;text-align:center;">${T.rassure}</div>
  </td></tr>
  <tr><td style="background:#FAF9F5;border-top:1px solid #EFEBE1;padding:20px 30px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="font-size:12px;color:#9C968A;line-height:1.6;text-align:center;">
      BELFIT &middot; Startup belge<br>
      <a href="https://belfit.be" style="color:#8F6200;text-decoration:none;font-weight:600;">belfit.be</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:contact@belfit.be" style="color:#8F6200;text-decoration:none;font-weight:600;">${T.pied}</a>
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ---------------------------------------------------------------
// Confirmation d'adresse a l'inscription.
// Meme chaine que la reinitialisation : Firebase signe le jeton,
// nous envoyons le message et hebergeons la page d'arrivee.
// Ici l'appel exige un jeton de session : sans cela l'adresse
// serait libre, et l'endpoint deviendrait un relais a courriels.
// ---------------------------------------------------------------
exports.mailVerification = onRequest(
  {secrets: [RESEND_API_KEY], region: "europe-west1", cors: true},
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }

    try {
      const entete = req.get("Authorization") || "";
      const jetonSession = entete.startsWith("Bearer ") ? entete.slice(7) : "";
      if (!jetonSession) { res.status(401).json({ok: false}); return; }

      let compte;
      try {
        const decode = await admin.auth().verifyIdToken(jetonSession);
        compte = await admin.auth().getUser(decode.uid);
      } catch (e) {
        res.status(401).json({ok: false}); return;
      }

      // Deja confirme : inutile d'envoyer quoi que ce soit.
      if (compte.emailVerified) { res.json({ok: true, deja: true}); return; }
      if (!compte.email) { res.status(400).json({ok: false}); return; }

      // Garde-fou : un envoi par minute. Sans cela, un clic repete sur
      // « renvoyer » suffirait a inonder une boite et a abimer notre
      // reputation d'expediteur.
      const ref = db.collection("users").doc(compte.uid);
      const snap = await ref.get();
      const dernier = snap.exists && snap.data().dernierMailVerif;
      if (dernier && Date.now() - dernier.toMillis() < 60000) {
        res.status(429).json({ok: false, attendre: true}); return;
      }

      const langue = String((req.body && req.body.langue) || "fr").slice(0, 2);

      let lien = await admin.auth()
        .generateEmailVerificationLink(compte.email);
      try {
        const jeton = new URL(lien).searchParams.get("oobCode");
        if (jeton) {
          lien = `${PAGE_VERIF}?code=${encodeURIComponent(jeton)}` +
            `&lang=${encodeURIComponent(langue)}`;
        }
      } catch (e) {
        console.error("Lien Firebase illisible :", e);
      }

      const T = TEXTES_VERIF[langue] || TEXTES_VERIF.fr;
      const envoi = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EXPEDITEUR,
          reply_to: REPONSE_A,
          to: [compte.email],
          subject: T.objet,
          html: modeleMail(lien, langue, TEXTES_VERIF),
        }),
      });

      if (!envoi.ok) {
        console.error("Resend a refuse l'envoi :", await envoi.text());
        res.status(502).json({ok: false});
        return;
      }
      await ref.set({
        dernierMailVerif: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      res.json({ok: true});
    } catch (e) {
      console.error("mailVerification :", e);
      res.status(500).json({ok: false});
    }
  },
);

exports.mailReinitialisation = onRequest(
  {secrets: [RESEND_API_KEY], region: "europe-west1", cors: true},
  async (req, res) => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }

    try {
      const email = String((req.body && req.body.email) || "").trim();
      const langue = String((req.body && req.body.langue) || "fr").slice(0, 2);
      if (!email || email.indexOf("@") === -1) {
        res.status(400).json({ok: false});
        return;
      }

      // Lien officiel Firebase (jeton signe, expiration geree par Firebase).
      let lien;
      try {
        lien = await admin.auth().generatePasswordResetLink(email);
      } catch (e) {
        // Compte inexistant : on repond OK malgre tout. Repondre
        // differemment revelerait quelles adresses sont inscrites.
        res.json({ok: true});
        return;
      }

      // Firebase pointe vers repz-baf60.firebaseapp.com : une adresse
      // etrangere au site, qui inquiete a juste titre. On ne garde que
      // le jeton et on renvoie vers notre propre page, sur belfit.be.
      // Si le jeton est introuvable, on laisse le lien Firebase :
      // moins beau, mais l'utilisateur peut quand meme se depanner.
      try {
        const jeton = new URL(lien).searchParams.get("oobCode");
        if (jeton) {
          lien = `${PAGE_REINIT}?code=${encodeURIComponent(jeton)}` +
            `&lang=${encodeURIComponent(langue)}`;
        }
      } catch (e) {
        console.error("Lien Firebase illisible :", e);
      }

      const T = TEXTES[langue] || TEXTES.fr;
      const envoi = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EXPEDITEUR,
          reply_to: REPONSE_A,
          to: [email],
          subject: T.objet,
          html: modeleMail(lien, langue),
        }),
      });

      if (!envoi.ok) {
        console.error("Resend a refuse l'envoi :", await envoi.text());
        res.status(502).json({ok: false});
        return;
      }
      res.json({ok: true});
    } catch (e) {
      console.error("mailReinitialisation :", e);
      res.status(500).json({ok: false});
    }
  },
);

// ============================================================
// PROGRAMME DU COACH — depot et notification.
//
// Une seule action cote coach, deux canaux cote client : le plan
// est ecrit dans users/{uid}.programme (l'app le lit et propose de
// l'appliquer au journal) ET envoye par courriel.
//
// La verification « suis-je coach ? » est faite ICI, cote serveur.
// Si elle vivait dans la page, n'importe qui pourrait ecrire un
// programme chez n'importe quel autre compte : la page n'est qu'une
// commodite, la regle est ce fichier.
//
// La liste des coachs vit dans coachs/{uid}. Ce document n'est
// jamais lisible par le client (regle Firestore), et seule la
// console peut l'ecrire — un coach ne peut donc pas s'auto-declarer.
// ============================================================

/** Page de destination annoncee dans le courriel. */
const PAGE_APP = "https://belfit.be/v2/";

/** Modele du courriel « ton programme est pret », en trois langues. */
const TEXTES_PROG = {
  fr: {
    objet: "Ton programme BELFIT est prêt",
    titre: "Ton programme est prêt",
    intro: "Ton coach a terminé ton plan alimentaire. Voici tes " +
      "objectifs quotidiens — ils t'attendent aussi dans l'application, " +
      "où un bouton les applique à ton journal en une fois.",
    bouton: "Ouvrir dans l'application",
    rassure: "Une question sur ton plan ?<br>Réponds simplement à ce message.",
    slogan: "Ton coach nutrition et entraînement",
    pied: "Nous écrire",
    kcal: "calories par jour", prot: "protéines",
    carbs: "glucides", lip: "lipides", note: "Note de ton coach",
  },
  en: {
    objet: "Your BELFIT programme is ready",
    titre: "Your programme is ready",
    intro: "Your coach has finished your nutrition plan. Here are your " +
      "daily targets — they are waiting in the app too, where one button " +
      "applies them to your journal.",
    bouton: "Open in the app",
    rassure: "A question about your plan?<br>Just reply to this message.",
    slogan: "Your nutrition and training coach",
    pied: "Contact us",
    kcal: "calories per day", prot: "protein",
    carbs: "carbs", lip: "fat", note: "Note from your coach",
  },
  nl: {
    objet: "Je BELFIT-programma is klaar",
    titre: "Je programma is klaar",
    intro: "Je coach heeft je voedingsplan afgerond. Dit zijn je " +
      "dagelijkse doelen — ze staan ook in de app, waar één knop ze " +
      "in je dagboek toepast.",
    bouton: "Openen in de app",
    rassure: "Een vraag over je plan?<br>Antwoord gewoon op dit bericht.",
    slogan: "Jouw coach voor voeding en training",
    pied: "Contacteer ons",
    kcal: "calorieën per dag", prot: "eiwitten",
    carbs: "koolhydraten", lip: "vetten", note: "Notitie van je coach",
  },
};

/** Message HTML du programme. Tables + styles en ligne, comme les
 *  autres modeles : seule mise en forme fiable en messagerie. */
function modeleProgramme(prog, langue) {
  const T = TEXTES_PROG[langue] || TEXTES_PROG.fr;
  const e = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const macro = (val, lb) => `
    <td align="center" style="padding:0 4px">
      <div style="font:700 21px/1 Helvetica,Arial,sans-serif;color:#16130F">${e(val)}</div>
      <div style="font:400 11px/1.4 Helvetica,Arial,sans-serif;color:#8A8279;padding-top:4px">${e(lb)}</div>
    </td>`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F4F3F0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3F0;padding:28px 16px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="max-width:520px;background:#FFFFFF;border:1px solid rgba(28,24,18,.06);border-radius:18px">
    <tr><td style="padding:28px 26px 6px">
      <div style="font:700 22px/1.2 Helvetica,Arial,sans-serif;color:#16130F;letter-spacing:-.5px">${e(T.titre)}</div>
      <p style="font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#57514A;margin:12px 0 0">${e(T.intro)}</p>
    </td></tr>
    <tr><td style="padding:20px 20px 4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#1E232D;border-radius:14px">
        <tr><td style="padding:18px 10px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center">
              <div style="font:700 30px/1 Helvetica,Arial,sans-serif;color:#F4F6F8">${e(prog.kcal)}</div>
              <div style="font:400 11px/1.4 Helvetica,Arial,sans-serif;color:#AAB1BC;padding-top:5px">${e(T.kcal)}</div>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:14px 20px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${macro(prog.prot + " g", T.prot)}
        ${macro(prog.carbs + " g", T.carbs)}
        ${macro(prog.lip + " g", T.lip)}
      </tr></table>
    </td></tr>
    ${prog.note ? `<tr><td style="padding:20px 26px 0">
      <div style="font:600 10px/1 Helvetica,Arial,sans-serif;color:#B34700;letter-spacing:1.4px">${e(T.note).toUpperCase()}</div>
      <p style="font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#57514A;margin:8px 0 0">${e(prog.note)}</p>
    </td></tr>` : ""}
    <tr><td align="center" style="padding:24px 26px 6px">
      <a href="${PAGE_APP}" style="display:inline-block;background:#1E232D;color:#F4F6F8;
         font:600 15px/1 Helvetica,Arial,sans-serif;text-decoration:none;
         padding:15px 26px;border-radius:13px">${e(T.bouton)}</a>
    </td></tr>
    <tr><td align="center" style="padding:18px 26px 26px">
      <p style="font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8A8279;margin:0">${T.rassure}</p>
    </td></tr>
  </table>
  <p style="font:400 11px/1.6 Helvetica,Arial,sans-serif;color:#8A8279;margin:16px 0 0">
    BELFIT — ${e(T.slogan)}<br>
    <a href="mailto:${REPONSE_A}" style="color:#B34700">${e(T.pied)}</a>
  </p>
</td></tr></table></body></html>`;
}

/** Nombre fini et positif, borne — un plan a 90 000 kcal est une
 *  faute de frappe, pas un objectif. */
function nombreValide(v, min, max) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
}

exports.deposerProgramme = onRequest(
  {secrets: [RESEND_API_KEY], region: "europe-west1", cors: true},
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }

    try {
      // 1. Qui appelle ?
      const entete = req.get("Authorization") || "";
      const jeton = entete.startsWith("Bearer ") ? entete.slice(7) : "";
      if (!jeton) { res.status(401).json({ok: false}); return; }

      let coach;
      try {
        coach = await admin.auth().verifyIdToken(jeton);
      } catch (e) {
        res.status(401).json({ok: false}); return;
      }

      // 2. Est-il coach ? Seule la console ecrit coachs/{uid}.
      const estCoach = (await db.collection("coachs").doc(coach.uid).get()).exists;
      if (!estCoach) { res.status(403).json({ok: false, motif: "acces"}); return; }

      // 3. Quel client ? Par courriel ou par pseudo, au choix.
      const cible = String((req.body && req.body.client) || "").trim();
      if (!cible) { res.status(400).json({ok: false, motif: "client"}); return; }

      let client = null;
      if (cible.includes("@")) {
        try { client = await admin.auth().getUserByEmail(cible.toLowerCase()); }
        catch (e) { client = null; }
      } else {
        // La table des pseudos n'est pas lisible cote client, mais
        // l'admin SDK la traverse : meme chemin que connexionParPseudo.
        const p = await db.collection("usernames").doc(cible.toLowerCase()).get();
        if (p.exists && p.data().uid) {
          try { client = await admin.auth().getUser(p.data().uid); }
          catch (e) { client = null; }
        }
      }
      if (!client) { res.status(404).json({ok: false, motif: "introuvable"}); return; }

      // 4. Le plan tient-il debout ?
      const b = req.body || {};
      const prog = {
        kcal: nombreValide(b.kcal, 800, 8000),
        prot: nombreValide(b.prot, 20, 600),
        carbs: nombreValide(b.carbs, 20, 1200),
        lip: nombreValide(b.lip, 10, 400),
      };
      if (prog.kcal === null || prog.prot === null ||
          prog.carbs === null || prog.lip === null) {
        res.status(400).json({ok: false, motif: "valeurs"}); return;
      }
      prog.note = String(b.note || "").slice(0, 600);
      prog.livreLe = new Date().toISOString();
      prog.parCoach = coach.uid;

      // 5. Ecriture. C'est le seul chemin : la regle Firestore
      //    interdit au client de toucher ce champ lui-meme.
      await db.collection("users").doc(client.uid).set(
        {programme: prog}, {merge: true},
      );

      // 6. Courriel. Un echec d'envoi ne doit PAS annuler le depot :
      //    le plan est deja dans l'app, c'est le canal qui fait foi.
      let mailEnvoye = false;
      if (client.email) {
        const langue = String(b.langue || "fr").slice(0, 2);
        const T = TEXTES_PROG[langue] || TEXTES_PROG.fr;
        try {
          const envoi = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: EXPEDITEUR,
              reply_to: "coach@belfit.be",
              to: [client.email],
              subject: T.objet,
              html: modeleProgramme(prog, langue),
            }),
          });
          mailEnvoye = envoi.ok;
          if (!envoi.ok) console.error("Resend a refuse :", await envoi.text());
        } catch (e) {
          console.error("Envoi du programme :", e);
        }
      }

      res.json({
        ok: true,
        client: {uid: client.uid, email: client.email || null},
        mailEnvoye,
      });
    } catch (e) {
      console.error("deposerProgramme :", e);
      res.status(500).json({ok: false});
    }
  },
);
