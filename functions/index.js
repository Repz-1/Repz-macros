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
