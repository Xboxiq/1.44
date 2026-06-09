/* Cases — list + timeline detail (from archive design) */
'use strict';

(function (global) {
  const C = global.PlatformCore;
  if (!C) return;

  const CASE_STAGES = [
    { k: 'received', ico: 'inbox', name: 'استلام الطلب', who: 'موظف خدمات المشتركين', dur: 'فوري' },
    { k: 'feeInit', ico: 'currency_exchange', name: 'دفع رسوم طلب الخدمة', who: 'الصندوق', dur: '15 دقيقة' },
    { k: 'siteCheck', ico: 'location_searching', name: 'الكشف الميداني', who: 'الدائرة الفنية', dur: '3 أيام' },
    { k: 'estimate', ico: 'price_change', name: 'تقدير الأجور', who: 'الدائرة المالية', dur: 'يوم' },
    { k: 'approval', ico: 'verified', name: 'موافقة المدير', who: 'مدير المركز', dur: 'يوم' },
    { k: 'feeFinal', ico: 'payments', name: 'دفع المطالبة المالية', who: 'الصندوق', dur: 'فوري' },
    { k: 'execute', ico: 'electrical_services', name: 'تنفيذ التوصيل', who: 'الدائرة الفنية', dur: 'يومان' },
    { k: 'closed', ico: 'check_circle', name: 'إصدار رقم الاشتراك', who: 'النظام', dur: 'فوري' },
  ];

  const MOCK_CASES = [
    { id: 'TQ-2026-08-1417', code: 'CS0001', subscriber: 'علي عبدالله حسين الجبوري', status: 'كشف ميداني', officer: 'م. كرار البياتي', priority: 'standard', age: 'منذ ساعتين', fee: 93000, stage: 2 },
    { id: 'TQ-2026-08-1413', code: 'CT0009', subscriber: 'هدى محمود إبراهيم', status: 'بانتظار الدفع', officer: 'م. زينب', priority: 'standard', age: 'منذ ٤ ساعات', fee: 60000, stage: 1 },
    { id: 'TQ-2026-08-1407', code: 'CA0002', subscriber: 'سرى ناجي كاظم', status: 'فريق طوارئ', officer: 'م. مصطفى', priority: 'urgent', age: 'أمس', fee: null, stage: 2 },
    { id: 'TQ-2026-08-1402', code: 'CS0011', subscriber: 'أحمد علي الجبوري', status: 'تحقق قانوني', officer: 'م. كرار', priority: 'standard', age: 'منذ يومين', fee: 45000, stage: 1 },
  ];

  function buildCases(App) {
    const out = [];
    const drafts = App.drafts || {};
    Object.keys(drafts).forEach((code) => {
      const svc = App.data.services[code];
      if (!svc) return;
      const d = drafts[code] || {};
      out.push({
        id: d.__caseRef || ('DRAFT-' + code),
        code,
        subscriber: (d.subscriberName && String(d.subscriberName).trim()) || 'مسوّدة بدون اسم',
        status: 'مسوّدة مفتوحة',
        officer: 'أنت',
        priority: d.__sla === 'urgent' ? 'urgent' : d.__sla === 'vip' ? 'vip' : 'standard',
        age: 'محفوظة محلياً',
        fee: null,
        stage: 0,
        isDraft: true,
      });
    });
    MOCK_CASES.forEach((m) => {
      if (!out.some((x) => x.id === m.id)) out.push(Object.assign({ isDraft: false }, m));
    });
    return out;
  }

  function findCase(App, ref) {
    return buildCases(App).find((c) => c.id === ref || c.code === ref);
  }

  function renderList(appNode, App) {
    let q = '';
    let status = 'all';
    const view = C.el('div', { class: 'app-page fade-in' });

    function draw() {
      const host = C.$('#casesListHost', view);
      if (!host) return;
      host.innerHTML = '';
      const all = buildCases(App);
      const filtered = all.filter((c) => {
        if (status === 'urgent' && c.priority !== 'urgent') return false;
        if (status === 'vip' && c.priority !== 'vip') return false;
        if (status === 'draft' && !c.isDraft) return false;
        if (q.trim() && !(c.id.includes(q) || c.subscriber.includes(q) || c.code.toLowerCase().includes(q.toLowerCase()))) return false;
        return true;
      });

      if (!filtered.length) {
        host.appendChild(C.el('div', { class: 'section', style: { textAlign: 'center', padding: '48px' } }, [
          C.icon('inventory_2', 48),
          C.el('p', { class: 'muted', style: { marginTop: '12px' }, text: 'لا توجد حالات مطابقة.' }),
        ]));
        return;
      }

      filtered.forEach((c) => {
        const svc = App.data.services[c.code];
        const sec = App.data.meta.sections[svc.section];
        const color = C.SECTION_COLORS[svc.section];
        host.appendChild(C.el('a', {
          class: 'section',
          href: c.isDraft ? '#/service/' + c.code + '/form' : '#/case/' + encodeURIComponent(c.id),
          style: { display: 'block', padding: '18px', textDecoration: 'none', color: 'inherit', cursor: 'pointer' },
        }, [
          C.el('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '18px', alignItems: 'center' } }, [
            C.el('div', { style: { width: 52, height: 52, borderRadius: 12, background: color, color: '#fff', display: 'grid', placeItems: 'center' } }, [C.icon('description', 26)]),
            C.el('div', {}, [
              C.el('div', { class: 'cluster', style: { marginBottom: '4px' } }, [
                C.secBadge(svc.section),
                C.el('span', { style: { fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.86rem' }, text: c.id }),
                c.priority === 'urgent' ? C.tag('عاجل', 'err') : null,
                c.priority === 'vip' ? C.tag('VIP', 'gold') : null,
                c.isDraft ? C.tag('مسوّدة', 'info') : null,
              ]),
              C.el('div', { style: { fontWeight: 700, fontSize: '0.98rem' }, text: svc.title }),
              C.el('div', { style: { color: 'var(--text-soft)', fontSize: '0.82rem', marginTop: '3px' }, text: c.subscriber + ' · ' + c.officer }),
            ]),
            C.el('div', { style: { minWidth: '120px' } }, [
              C.el('div', { style: { fontSize: '0.74rem', color: 'var(--text-soft)', marginBottom: '4px' }, text: 'المرحلة' }),
              C.tag(c.status, 'info'),
            ]),
            C.el('div', { style: { textAlign: 'end', minWidth: '90px' } }, [
              C.el('div', { style: { fontSize: '0.74rem', color: 'var(--text-soft)', marginBottom: '4px' }, text: 'منذ' }),
              C.el('div', { style: { fontWeight: 700, fontSize: '0.84rem' }, text: c.age }),
            ]),
            C.icon('chevron_left', 22),
          ]),
        ]));
      });
    }

    view.appendChild(C.crumbs([{ label: 'الرئيسية', href: '#/' }, { label: 'الحالات النشطة' }]));
    view.appendChild(C.el('div', { class: 'row-between' }, [
      C.el('div', {}, [
        C.el('h1', { class: 'pageheader__title', text: 'الحالات المُسلَّمة لك' }),
        C.el('p', { class: 'pageheader__sub', text: 'مسوّداتك المحفوظة والحالات قيد المعالجة في مركزك.' }),
      ]),
      C.btn('فتح حالة جديدة', { variant: 'primary', icon: 'add', href: '#/services' }),
    ]));

    const searchInp = C.el('input', { class: 'rs-search__input', type: 'search', placeholder: 'ابحث برقم الحالة أو اسم المشترك…' });
    searchInp.addEventListener('input', () => { q = searchInp.value; draw(); });

    const tabbar = C.el('div', { class: 'tabbar' });
    function mkTab(k, l) {
      const n = buildCases(App).filter((c) => k === 'all' || (k === 'urgent' && c.priority === 'urgent') || (k === 'vip' && c.priority === 'vip') || (k === 'draft' && c.isDraft)).length;
      return C.el('button', {
        type: 'button', class: 'tabbtn' + (status === k ? ' is-on' : ''),
        onclick: () => { status = k; tabbar.querySelectorAll('.tabbtn').forEach((b) => b.classList.toggle('is-on', b.dataset.k === k)); draw(); },
        'data-k': k,
      }, [l + ' ', C.el('span', { class: 'tabbtn__n', text: String(n) })]);
    }
    tabbar.appendChild(mkTab('all', 'الكل'));
    tabbar.appendChild(mkTab('draft', 'مسوّداتي'));
    tabbar.appendChild(mkTab('urgent', 'عاجل'));
    tabbar.appendChild(mkTab('vip', 'VIP'));

    view.appendChild(C.el('div', { class: 'searchhero' }, [
      C.el('div', { class: 'rs-search', style: { flex: 1 } }, [C.el('span', { class: 'rs-search__ico' }, [C.icon('search')]), searchInp]),
      tabbar,
    ]));
    view.appendChild(C.el('div', { id: 'casesListHost', class: 'stack', style: { gap: '12px' } }));

    appNode.innerHTML = '';
    appNode.appendChild(view);
    draw();
  }

  function renderDetail(appNode, App, ref) {
    const c = findCase(App, decodeURIComponent(ref));
    if (!c) { renderList(appNode, App); return; }
    const svc = App.data.services[c.code];
    const sec = App.data.meta.sections[svc.section];
    const stage = c.stage || 0;

    const view = C.el('div', { class: 'app-page fade-in' });
    view.appendChild(C.crumbs([{ label: 'الحالات', href: '#/cases' }, { label: c.id }]));

    view.appendChild(C.el('section', { class: 'hero', style: { padding: '22px' } }, [
      C.el('div', { class: 'hero__row' }, [
        C.el('div', {}, [
          C.el('span', { class: 'hero__eyebrow' }, [C.icon('inventory_2', 14), ' رقم الحالة ', C.el('span', { class: 'mono', text: c.id })]),
          C.el('h1', { class: 'hero__title', style: { fontSize: 'clamp(1.4rem, 2.4vw, 1.9rem)' }, text: svc.title }),
          C.el('p', { class: 'hero__sub', html: 'المشترك: <strong>' + c.subscriber + '</strong> · المسؤول: ' + c.officer }),
        ]),
        C.el('div', { class: 'cluster' }, [
          C.btn('متابعة النموذج', { size: 'sm', icon: 'edit', href: '#/service/' + c.code + '/form' }),
          C.btn('طباعة', { size: 'sm', icon: 'print', onclick: () => global.printUnified && global.printUnified(c.code, svc) }),
        ]),
      ]),
    ]));

    const grid = C.el('div', { class: 'grid-2' });
    const timeline = C.el('div', { class: 'section' }, [
      C.el('div', { class: 'section__head' }, [
        C.el('h3', { class: 'section__title' }, [C.icon('timeline', 20), ' مسار الحالة']),
        C.tag('المرحلة ' + (stage + 1) + ' من ' + CASE_STAGES.length, 'info'),
      ]),
      C.el('div', { class: 'timeline' }),
    ]);
    const tl = timeline.querySelector('.timeline');
    CASE_STAGES.forEach((stg, i) => {
      const st = i < stage ? 'done' : i === stage ? 'active' : 'pending';
      tl.appendChild(C.el('div', { class: 'tlrow' + (st === 'done' ? ' is-done' : '') + (st === 'active' ? ' is-active' : '') }, [
        C.el('div', { class: 'tlrow__node' }, [C.icon(st === 'done' ? 'check' : stg.ico, 22)]),
        C.el('div', { class: 'tlrow__body' }, [
          C.el('div', { class: 'tlrow__title' }, [
            C.el('span', { text: stg.name }),
            C.el('span', { class: 'tlrow__time', text: stg.dur }),
          ]),
          C.el('p', { class: 'tlrow__desc', text: 'تنفيذ بواسطة ' + stg.who }),
        ]),
      ]));
    });
    grid.appendChild(timeline);

    const side = C.el('div', { class: 'stack' });
    side.appendChild(C.el('div', { class: 'section' }, [
      C.el('div', { class: 'section__head' }, [C.el('h3', { class: 'section__title' }, [C.icon('sticky_note_2', 20), ' ملاحظات داخلية'])]),
      C.el('textarea', { class: 'rs-textarea', placeholder: 'اكتب ملاحظة لباقي الفريق…', rows: 4 }),
    ]));
    grid.appendChild(side);
    view.appendChild(grid);

    appNode.innerHTML = '';
    appNode.appendChild(view);
  }

  global.PlatformCases = { renderList, renderDetail, buildCases, CASE_STAGES };
})(window);
