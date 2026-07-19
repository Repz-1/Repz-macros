import c from '@sparticuz/chromium';
try {
  const p = await c.executablePath();
  console.log('binaire :', p);
} catch (e) { console.log('erreur :', e.message); }
