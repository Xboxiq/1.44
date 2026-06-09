// Sequential JSX boot — same global scope as archive static Babel tags.
(function () {
  'use strict';

  var FILES = [
    'shell.jsx',
    'info_drawer.jsx',
    'cmdk.jsx',
    'dashboard.jsx',
    'services_hub.jsx',
    'service_detail.jsx',
    'form_shell.jsx',
    'form_pro.jsx',
    'form_orig.jsx',
    'form_page.jsx',
    'cases.jsx',
    'app.jsx',
  ];

  function showError(msg) {
    var root = document.getElementById('root');
    if (!root) return;
    root.innerHTML =
      '<div style="padding:2rem;font-family:Cairo,Tajawal,sans-serif;direction:rtl;max-width:640px;margin:0 auto">' +
      '<h2 style="margin:0 0 12px">تعذّر تشغيل الواجهة</h2>' +
      '<p style="color:#64748b;line-height:1.7">شغّل الموقع عبر خادم محلي:<br><code>python3 -m http.server 8000</code></p>' +
      '<pre style="background:#fef2f2;color:#b91c1c;padding:12px;border-radius:8px;white-space:pre-wrap">' +
      String(msg) +
      '</pre></div>';
  }

  function installHookGlobals() {
    window.useState = React.useState;
    window.useEffect = React.useEffect;
    window.useMemo = React.useMemo;
    window.useRef = React.useRef;
    window.useCallback = React.useCallback;
  }

  function runJsx(path, source) {
    var code = Babel.transform(source, { presets: ['react'], filename: path }).code;
    (0, eval)(code);
  }

  function boot() {
    if (!window.__DATA_LOADED__ || !window.SERVICES || !window.SERVICES.length) {
      throw new Error('البيانات لم تُحمَّل — تأكد من تشغيل python3 -m http.server 8000');
    }
    if (!window.React || !window.ReactDOM || !window.Babel) {
      throw new Error('تعذّر تحميل React أو Babel');
    }

    installHookGlobals();

    for (var i = 0; i < FILES.length; i++) {
      var path = FILES[i];
      var xhr = new XMLHttpRequest();
      xhr.open('GET', path, false);
      xhr.send(null);
      if (xhr.status < 200 || xhr.status >= 300) {
        throw new Error('ملف مفقود: ' + path + ' (' + xhr.status + ')');
      }
      try {
        runJsx(path, xhr.responseText);
      } catch (err) {
        throw new Error(path + ': ' + (err && err.message ? err.message : err));
      }
    }

  }

  try {
    boot();
  } catch (err) {
    console.error(err);
    showError(err && err.message ? err.message : err);
  }
})();
