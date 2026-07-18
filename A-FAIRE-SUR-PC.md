# BELFIT — À faire depuis le PC

Dernière mise à jour : 18 juillet 2026

Commence par récupérer le code :

```bash
git pull origin main
```

---

## 1. Firebase — activer la connexion Google

**Sans ça, le bouton « Continuer avec Google » renvoie une erreur.**

Console Firebase (projet `repz-baf60`) :

1. **Authentication → Sign-in method → Google → Activer**
2. E-mail d'assistance : `contact@belfit.be`
3. Enregistrer
4. **Authentication → Settings → Domaines autorisés** : vérifier que
   `belfit.be` et `www.belfit.be` sont présents

Aucune commande, tout se fait dans la console.

---

## 2. Firebase — nom d'utilisateur (Cloud Functions)

**Sans ça, l'inscription avec pseudo échoue.**

Il faut d'abord la clé Web de l'API : Console Firebase →
Paramètres du projet → Général → section « Vos applications » →
application Web → champ `apiKey`.

```bash
firebase functions:secrets:set FIREBASE_WEB_API_KEY
# colle la clé quand c'est demandé

firebase deploy --only functions:pseudoDisponible,functions:reserverPseudo,functions:connexionParPseudo
```

Puis les règles de sécurité (elles ferment la table des pseudos au client) :

```bash
firebase deploy --only firestore:rules
```

**Test après déploiement :** crée un compte sur `belfit.be` avec un pseudo,
déconnecte-toi, reconnecte-toi avec le pseudo au lieu de l'e-mail.

---

## 3. Lemon Squeezy — code de rétention

**Sans ça, l'offre « -50 % pendant 2 mois » du parcours de résiliation
mène à un code invalide.**

Dashboard Lemon Squeezy → Discounts → New discount :

- Code : `RESTE50`
- Réduction : 50 %
- Durée : 2 mois (repeating, 2 billing cycles)
- Limite : 1 utilisation par client

---

## 4. Lemon Squeezy — passage en mode LIVE

**À faire le jour du lancement, pas avant.**

1. Créer les produits en mode **live** (les produits de test ne migrent pas)
2. Récupérer le nouveau secret de signature du webhook
3. Le stocker côté Firebase :

```bash
firebase functions:secrets:set LEMON_WEBHOOK_SECRET
firebase deploy --only functions:lemonWebhook
```

4. Remplacer les URL de paiement dans `plans.html`
5. **Faire un vrai achat avec ta carte**, vérifier que `premium: true`
   s'écrit bien dans `users/{uid}` sur Firestore, puis se rembourser

---

## 4 bis. Quota d ajustements selon la formule

**Reporte a plus tard.** Le code est ecrit mais inactif tant que le
webhook n est pas redeploye : le quota reste a 2 par mois pour tous.

Quand tu voudras l activer :

1. Verifier que les produits Lemon Squeezy contiennent bien
   « mensuel » ou « annuel » dans leur nom (sinon la detection echoue)
2. Redeployer :

```bash
firebase deploy --only functions:lemonWebhook
```

Effet : 2 ajustements par mois et par type en mensuel, 4 en annuel.

---

## 5. EmailJS — réparer l'envoi

**Sans ça, les questions posées depuis l'aide n'arrivent jamais.**

Dashboard EmailJS (service `service_kpiz7rc`) : vérifier que le service
est connecté et que le template `template_ah0jhvr` existe.

**Test :** sur `belfit.be/aide.html`, bouton « Poser ma question », envoyer
un message. S'il ouvre ton application mail au lieu d'envoyer en silence,
c'est qu'EmailJS est toujours cassé.

---

## 6. Google Play — compte développeur

**Le plus long : commence par le D-U-N-S.**

1. **Numéro D-U-N-S** — gratuit, délai variable, parfois plusieurs semaines.
   Prépare le numéro BCE, la dénomination exacte et l'adresse du siège.
2. **Compte Google** `contact@belfit.be` — créé ✅
3. **Play Console** : https://play.google.com/console/signup
   - type **Organisation** (c'est ce qui évite les 12 testeurs / 14 jours)
   - le nom déclaré doit correspondre **exactement** à celui de la BCE
   - 25 $, une seule fois
4. **Compte marchand Google Payments** — IBAN de l'entreprise + numéro de TVA

---

## 7. Android — construire l'application

À faire une fois le compte Play validé. Procédure détaillée dans
`android/README.md`. Résumé :

```bash
npm install -g @bubblewrap/cli

cd android
keytool -genkeypair -alias belfit -keystore android-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000
```

**⚠️ Sauvegarde le fichier `android-keystore.jks` et ses deux mots de passe
à trois endroits différents. Perdue, cette clé rend toute mise à jour
impossible — définitivement.**

```bash
keytool -list -v -keystore android-keystore.jks -alias belfit | grep SHA256
```

Copier l'empreinte dans `.well-known/assetlinks.json` (remplacer
`A_REMPLACER_PAR_EMPREINTE_CLE_UPLOAD`), pousser, puis vérifier que
https://belfit.be/.well-known/assetlinks.json est accessible.

```bash
bubblewrap init --manifest https://belfit.be/manifest.json
bubblewrap build
```

Envoyer `app-release-bundle.aab` sur le canal de test interne.

---

## 8. Avant d'ouvrir les paiements

- [ ] Conditions générales de vente (droit de rétractation 14 jours,
      procédure de résiliation) — page à créer
- [ ] Vérifier dans Lemon Squeezy la case de renonciation au droit de
      rétractation pour accès immédiat au contenu numérique
- [ ] Parcours complet testé sur un téléphone neuf : inscription →
      paiement → Premium débloqué → déconnexion → reconnexion → Premium tient

---

## Rappels de session

```bash
git config user.email "coach@belfit.be"
git config user.name "BelFit Coach"
```

Avant chaque push, le contrôle automatique tourne aussi en local :

```bash
node tools/verif-js.js
```
