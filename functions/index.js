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

      // 4) Écrire sur le compte
      await db.collection("users").doc(uid).set({
        premium: premium,
        source: "lemonsqueezy",
        lsStatus: status,
        lsEvent: event,
        updatedAt: Date.now(),
      }, {merge: true});

      console.log("Premium maj:", uid, premium, event, status);
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

      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY.value();
      const geminiBody = {
        contents: [{
          parts: [
            {text: prompt},
            {inline_data: {mime_type: mimeType || "audio/webm", data: audioBase64}},
          ],
        }],
        generationConfig: {temperature: 0.1, responseMimeType: "application/json"},
      };

      const gRes = await fetch(geminiUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(geminiBody),
      });

      if (!gRes.ok) {
        const errTxt = await gRes.text();
        console.error("Gemini error", gRes.status, errTxt.slice(0, 300));
        res.status(502).json({error: "gemini_failed"}); return;
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

      res.status(200).json({aliments});
    } catch (err) {
      console.error("transcrireVocal error", err);
      res.status(500).json({error: "server"});
    }
  }
);
