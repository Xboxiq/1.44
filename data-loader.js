// =============================================================
// Data bridge — old repo JSON → globals expected by React UI
// (replaces archive data.js; JSX/CSS stay unchanged)
// =============================================================

(function () {
  'use strict';

  // Section skin from new design (unchanged)
  const SECTION_SKIN = {
    CS: { name_en: 'Subscriptions', color: '#1d4ed8', icon: 'apartment', blurb: 'فتح اشتراكات جديدة، نقل ملكية، تغيير الصنف، إيقاف/تفعيل.' },
    CT: { name_en: 'Technical', color: '#b45309', icon: 'electrical_services', blurb: 'فحص المقاييس، تغيير الكابلات، تعديل القوة والجهد، تغيير الموقع.' },
    CB: { name_en: 'Billing', color: '#0e7490', icon: 'receipt_long', blurb: 'دفع القوائم، التقسيط، التسويات المالية، نسخ القوائم.' },
    CA: { name_en: 'Reports', color: '#b91c1c', icon: 'report', blurb: 'إبلاغات التلاعب، الأخطار، الشكاوى الإدارية، أضرار الشبكة.' },
  };

  // Per-service UI metadata from new design (icons, SLA, popularity)
  const SVC_META = {
    CS0001: { sla: 7, popularity: 98, hasPrice: true, priceNote: 'حسب الصنف والقوة', icon: 'add_home' },
    CS0002: { sla: 2, popularity: 62, icon: 'person_add' },
    CS0003: { sla: 3, popularity: 54, icon: 'sync_alt' },
    CS0004: { sla: 1, popularity: 71, icon: 'power_off' },
    CS0005: { sla: 1, popularity: 65, icon: 'restart_alt' },
    CS0006: { sla: 5, popularity: 33, icon: 'cancel' },
    CS0007: { sla: 3, popularity: 74, icon: 'gavel' },
    CS0008: { sla: 2, popularity: 48, icon: 'edit_location' },
    CS0009: { sla: 1, popularity: 38, fixedPrice: 25000, icon: 'speed' },
    CS0010: { sla: 5, popularity: 42, icon: 'construction' },
    CS0011: { sla: 7, popularity: 69, icon: 'swap_horiz' },
    CT0001: { sla: 14, popularity: 46, fixedPrice: 1000000, icon: 'bolt' },
    CT0002: { sla: 21, popularity: 34, fixedPrice: 2500000, icon: 'transform' },
    CT0003: { sla: 5, popularity: 58, icon: 'cable' },
    CT0004: { sla: 14, popularity: 39, icon: 'call_split' },
    CT0005: { sla: 10, popularity: 36, icon: 'merge' },
    CT0006: { sla: 14, popularity: 28, icon: 'tune' },
    CT0007: { sla: 7, popularity: 64, icon: 'memory' },
    CT0008: { sla: 5, popularity: 51, fixedPrice: 35000, icon: 'move_to_inbox' },
    CT0009: { sla: 3, popularity: 88, priceNote: 'يبدأ من 12,500 د.ع', icon: 'fact_check' },
    CT0010: { sla: 5, popularity: 40, icon: 'location_on' },
    CB0001: { sla: 1, popularity: 99, icon: 'payments' },
    CB0002: { sla: 2, popularity: 55, icon: 'analytics' },
    CB0003: { sla: 3, popularity: 67, icon: 'edit_document' },
    CB0004: { sla: 1, popularity: 44, icon: 'description' },
    CB0005: { sla: 3, popularity: 52, icon: 'history' },
    CB0006: { sla: 5, popularity: 81, icon: 'request_quote' },
    CA0001: { sla: 1, popularity: 71, icon: 'gpp_bad' },
    CA0002: { sla: 1, popularity: 79, urgent: true, icon: 'warning' },
    CA0003: { sla: 3, popularity: 48, icon: 'build' },
    CA0004: { sla: 5, popularity: 36, icon: 'support_agent' },
  };

  window.fmt = (n) => new Intl.NumberFormat('ar-IQ').format(n);
  window.fmtIQD = (n) => window.fmt(n) + ' د.ع';

  function pickName(svc) {
    return (svc.form && svc.form.formTitle) || svc.title || svc.formNumber || '';
  }

  function buildSections(meta) {
    const sections = meta && meta.sections ? meta.sections : {};
    const order = ['CS', 'CT', 'CB', 'CA'];
    return order
      .filter((code) => sections[code])
      .map((code) => {
        const s = sections[code];
        const skin = SECTION_SKIN[code] || {};
        return {
          code,
          name: s.name || code,
          name_en: skin.name_en || code,
          color: skin.color || '#334155',
          icon: skin.icon || (s.icon === 'plug' ? 'apartment' : s.icon === 'bolt' ? 'electrical_services' : s.icon === 'wallet' ? 'receipt_long' : 'report'),
          blurb: skin.blurb || s.desc || '',
        };
      });
  }

  function buildServices(servicesObj) {
    return Object.entries(servicesObj || {})
      .map(([code, svc]) => {
        const meta = SVC_META[code] || { sla: 3, popularity: 40, icon: 'description' };
        const row = {
          code,
          section: svc.section,
          name: pickName(svc),
          sla: meta.sla,
          popularity: meta.popularity,
          icon: meta.icon,
        };
        if (meta.hasPrice) row.hasPrice = true;
        if (meta.priceNote) row.priceNote = meta.priceNote;
        if (meta.fixedPrice != null) row.fixedPrice = meta.fixedPrice;
        if (meta.urgent) row.urgent = true;
        if (!row.name) row.name = code;
        return row;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  function amountFromCatalog(catalog, id) {
    const item = catalog.find((x) => x.id === id);
    if (!item) return null;
    const v = item.amount2026;
    return typeof v === 'number' ? v : null;
  }

  function buildPricing(catalog) {
    const byId = Object.fromEntries(catalog.map((x) => [x.id, x]));
    const amt = (id) => {
      const v = byId[id] && byId[id].amount2026;
      return typeof v === 'number' ? v : 0;
    };
    return {
      inspection: {
        label: 'أجور الكشف',
        items: [
          { key: 'res', name: 'منزلي', amount: amt(3) },
          { key: 'com', name: 'تجاري', amount: amt(4) },
          { key: 'agr', name: 'زراعي', amount: amt(5) },
          { key: 'ind', name: 'صناعي', amount: amt(6) },
          { key: 'gov', name: 'حكومي', amount: amt(7) },
        ],
      },
      install: {
        label: 'تجهيز ونصب',
        items: [
          { key: 'illegal_meter', name: 'مقياس المستهلك غير النظامي', amount: amt(1) },
          { key: 'meter_cover', name: 'الغطاء السفلي للمقياس', amount: amt(2) },
        ],
      },
      reconnect: {
        label: 'قطع وإعادة التيار — بسبب الديون',
        items: [
          { key: 'res1', name: 'منزلي طور واحد', amount: amt(14) },
          { key: 'res3', name: 'منزلي 3 أطوار', amount: amt(15) },
          { key: 'com1', name: 'تجاري طور واحد', amount: amt(22) },
          { key: 'com3', name: 'تجاري 3 أطوار', amount: amt(23) },
          { key: 'ind1', name: 'صناعي طور واحد', amount: amt(18) },
          { key: 'ind3', name: 'صناعي 3 أطوار', amount: amt(19) },
          { key: 'agr1', name: 'زراعي طور واحد', amount: amt(20) },
          { key: 'agr3', name: 'زراعي 3 أطوار', amount: amt(21) },
          { key: 'gov1', name: 'حكومي طور واحد', amount: amt(16) },
          { key: 'gov3', name: 'حكومي 3 أطوار', amount: amt(17) },
          { key: 'mv11', name: 'جهد 11 ك.ف.', amount: amt(24) },
        ],
      },
    };
  }

  function relAge(ts) {
    if (!ts) return '—';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return 'منذ ' + mins + ' دقيقة';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return 'منذ ' + hrs + ' ساعة';
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'أمس';
    return 'منذ ' + days + ' أيام';
  }

  function buildRecentCases() {
    const rows = [];
    try {
      const raw = localStorage.getItem('cs_drafts_v1');
      if (!raw) return rows;
      const drafts = JSON.parse(raw);
      Object.entries(drafts).forEach(([key, d]) => {
        const code = d.code || (key.match(/^([A-Z]{2}\d{4})/) || [])[1] || key;
        const data = d.data || d.fields || {};
        const subscriber = data.subscriberName || data.subscriber || data.name || 'مسودة بدون اسم';
        const updated = d.updatedAt || d.savedAt || d.ts || Date.now();
        rows.push({
          id: d.ref || d.reference || key,
          svc: code,
          subscriber,
          status: d.status || 'مسودة محفوظة',
          fee: typeof d.fee === 'number' ? d.fee : 0,
          age: relAge(typeof updated === 'number' ? updated : Date.parse(updated)),
          officer: d.officer || '—',
          priority: d.priority || (code === 'CA0002' ? 'urgent' : 'standard'),
          _ts: typeof updated === 'number' ? updated : Date.parse(updated) || 0,
        });
      });
      rows.sort((a, b) => b._ts - a._ts);
      rows.forEach((r) => delete r._ts);
    } catch (e) {
      console.warn('drafts parse', e);
    }
    return rows;
  }

  function buildKpis(cases) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const t0 = today.getTime();
    const todayCases = cases.filter((c) => {
      try {
        const raw = localStorage.getItem('cs_drafts_v1');
        const drafts = JSON.parse(raw || '{}');
        const d = drafts[c.id] || Object.values(drafts).find((x) => (x.ref || x.reference) === c.id);
        const ts = d && (d.updatedAt || d.savedAt || d.ts);
        return ts && (typeof ts === 'number' ? ts : Date.parse(ts)) >= t0;
      } catch { return false; }
    }).length;
    return {
      todayCases: todayCases || cases.length,
      todayDelta: Math.min(12, todayCases),
      pending: cases.length,
      collected: cases.reduce((s, c) => s + (c.fee || 0), 0),
      satisfaction: 94,
    };
  }

  function applyGlobals(servicesJson, pricesJson) {
    const meta = servicesJson.meta || {};
    const servicesObj = servicesJson.services || {};
    window.SECTIONS = buildSections(meta);
    window.SERVICES = buildServices(servicesObj);
    window.SECTION_MAP = Object.fromEntries(window.SECTIONS.map((s) => [s.code, s]));
    window.SERVICE_MAP = Object.fromEntries(window.SERVICES.map((s) => [s.code, s]));
    window.PRICING = buildPricing((pricesJson && pricesJson.catalog) || []);
    window.RECENT_CASES = buildRecentCases();
    window.KPIS = buildKpis(window.RECENT_CASES);
    window.__DATA_LOADED__ = true;
    window.dispatchEvent(new Event('tq-data-ready'));
  }

  function showLoadError(err) {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = '<div style="padding:2rem;font-family:Cairo,sans-serif;direction:rtl">'
        + '<h2>تعذّر تحميل البيانات</h2>'
        + '<p>شغّل الموقع عبر خادم محلي: <code>python3 -m http.server 8000</code></p>'
        + '<p style="color:#b91c1c">' + String(err.message || err) + '</p></div>';
    }
  }

  function syncJson(url) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    if (xhr.status < 200 || xhr.status >= 300) {
      throw new Error(url + ' (' + xhr.status + ')');
    }
    return JSON.parse(xhr.responseText);
  }

  try {
    const servicesJson = syncJson('data/services.json');
    const pricesJson = syncJson('data/service_prices.json');
    applyGlobals(servicesJson, pricesJson);
  } catch (err) {
    console.error(err);
    showLoadError(err);
  }

  window.__DATA_READY__ = window.__DATA_LOADED__
    ? Promise.resolve(true)
    : Promise.reject(new Error('data not loaded'));
})();
