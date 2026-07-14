/* ===== BELFIT i18n — moteur de traduction partagé (FR / EN / NL) ===== */
(function (global) {
  var LANGS = ['fr', 'en', 'nl'];
  var LANG_LABELS = { fr: 'Français', en: 'English', nl: 'Nederlands' };

  // Détecte la langue : choix mémorisé > langue du téléphone > français par défaut
  function detectLang() {
    try {
      var saved = localStorage.getItem('repz_lang');
      if (saved && LANGS.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    var nav = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
    if (nav.indexOf('nl') === 0) return 'nl';
    if (nav.indexOf('en') === 0) return 'en';
    return 'fr';
  }

  var current = detectLang();

  function setLang(l) {
    if (LANGS.indexOf(l) === -1) return;
    current = l;
    try { localStorage.setItem('repz_lang', l); } catch (e) {}
    document.documentElement.setAttribute('lang', l);
    applyDom();
    try { window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: l } })); } catch (e) {}
  }

  function getLang() { return current; }
  function langChoisie() { try { return !!localStorage.getItem('repz_lang'); } catch (e) { return false; } }

  // Récupère une traduction : t('cle') — repli FR puis clé brute
  function t(key, vars) {
    var dict = (global.BELFIT_STRINGS && global.BELFIT_STRINGS[current]) || {};
    var fr = (global.BELFIT_STRINGS && global.BELFIT_STRINGS.fr) || {};
    var s = (key in dict) ? dict[key] : (key in fr ? fr[key] : key);
    if (vars) { for (var k in vars) { s = s.replace(new RegExp('{' + k + '}', 'g'), vars[k]); } }
    return s;
  }

  // Applique les traductions aux éléments balisés data-i18n / data-i18n-ph / data-i18n-html
  function applyDom(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute('lang', current);
    applyDom();
  });

  // Sync inter-pages / iframes : si la langue change ailleurs, on suit
  try {
    window.addEventListener('storage', function (e) {
      if (e.key === 'repz_lang' && e.newValue && LANGS.indexOf(e.newValue) !== -1 && e.newValue !== current) {
        current = e.newValue;
        document.documentElement.setAttribute('lang', current);
        applyDom();
        try { window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } })); } catch (err) {}
      }
    });
  } catch (e) {}

  global.BELFIT_I18N = {
    t: t, setLang: setLang, getLang: getLang, langChoisie: langChoisie,
    applyDom: applyDom, LANGS: LANGS, LANG_LABELS: LANG_LABELS, detectLang: detectLang
  };
  // Traduction d'un nom d'aliment de la base (FR = clé canonique, repli FR)
  function trFood(name) {
    if (current === 'fr') return name;
    var db = global.BELFIT_FOODS || {};
    var e = db[name];
    return (e && e[current]) ? e[current] : name;
  }
  global.trFood = trFood;
  global.BELFIT_I18N.trFood = trFood;

  global.t = t; // raccourci
})(window);
