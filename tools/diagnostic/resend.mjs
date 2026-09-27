// Diagnostic des e-mails (27/09) : envoi d'un courriel de test par la
// meme cle et le meme expediteur que l'app. N'affiche jamais la cle.
const cle = process.env.RESEND_CLE;
if (!cle) { console.log('Cle Resend introuvable.'); process.exit(0); }
const r = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: 'BELFIT <noreply@belfit.be>',
    to: ['coach@belfit.be'],
    subject: 'Test d\'envoi BELFIT',
    html: '<p>Test d\'envoi depuis le serveur BELFIT (diagnostic du 27/09). Si tu lis ceci, les e-mails de l\'app partent bien.</p>',
  }),
});
console.log('Resend envoi test :', r.status, (await r.text()).slice(0, 300));
