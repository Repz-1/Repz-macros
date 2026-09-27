// Diagnostic des e-mails (27/09) : etat du domaine chez Resend. Lance
// par .github/workflows/diagnostic.yml. N'affiche jamais la cle.
const cle = process.env.RESEND_CLE;
if (!cle) { console.log('Cle Resend introuvable.'); process.exit(0); }
const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: 'Bearer ' + cle } });
console.log('Resend /domains :', r.status);
const d = await r.json().catch(() => ({}));
for (const dom of (d.data || [])) {
  console.log('-', dom.name, '| statut :', dom.status, '| region :', dom.region);
  const det = await fetch('https://api.resend.com/domains/' + dom.id, { headers: { Authorization: 'Bearer ' + cle } }).then((x) => x.json()).catch(() => ({}));
  (det.records || []).forEach((rec) => console.log('   ', rec.record, rec.type, rec.name, '->', rec.status));
}
if (!(d.data || []).length) console.log(JSON.stringify(d).slice(0, 300));
