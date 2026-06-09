/* ============================================================
   DIWAN — طبقة العرض الجديدة (Skin & Views)
   ------------------------------------------------------------
   تُضيف هذه الطبقة عرضاً تحريرياً جديداً (الديوان) فوق المحرّك
   القائم data-driven. تستهلك نفس App.data و App.drafts ولا تعيد
   كتابة أي وظيفة جوهرية: تستدعي renderForm / renderPreview /
   renderGuide / renderWorkspace / pricing / drafts الموجودة في
   app.js كما هي.

   الواجهة العامة (تُكشف على window):
     • Diwan.boot()            — يُهيّئ الترويسة والشريط الحيّ والتبويبات
     • Diwan.renderHome(app)   — صفحة الديوان (mast + depts + docket)
     • Diwan.renderRegistry(app, opts) — قائمة الخدمات الفهرسية
     • Diwan.renderServiceShell(app, code, tab) — رأس الخدمة + الجسم
     • Diwan.renderFees(app)   — لائحة الأجور 2026
     • Diwan.renderGuide(app)  — دليل الإجراءات
     • Diwan.renderCases(app)  — الإضبارات المفتوحة (مسوّداتك الحاليّة)
   ============================================================ */
'use strict';

(function (global) {
  const D = {};

  // ====== Small helpers ======
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v == null) continue;
        if (k === 'class') n.className = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v);
      }
    }
    (Array.isArray(children) ? children : (children ? [children] : [])).forEach((c) => {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function icon(name, size) {
    return el('span', {
      class: 'material-symbols-outlined',
      style: { fontSize: (size || 18) + 'px' },
      'aria-hidden': 'true',
      text: name,
    });
  }

  function fmtIQDInt(n) {
    if (typeof n !== 'number' || !isFinite(n)) return null;
    return new Intl.NumberFormat('ar-IQ').format(n).replace(/,/g, '٬') + ' د.ع';
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function fmtDateAr(d) {
    try {
      return d.toLocaleDateString('ar-IQ-u-ca-gregory', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return d.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  // Section colour map (matches diwan.css tokens)
  const SECTION_COLORS = {
    CS: '#1d4ed8',
    CT: '#b45309',
    CB: '#0e7490',
    CA: '#b20213',
  };
  const SECTION_BLURB = {
    CS: 'فتح اشتراكات جديدة، نقل ملكية، تغيير الصنف، إيقاف وتفعيل الاشتراكات.',
    CT: 'فحص المقاييس، تغيير الكابلات والأعمدة، تعديل القوة والجهد، تغيير الموقع.',
    CB: 'دفع القوائم، التقسيط، التسويات المالية، نسخ القوائم وتقارير الاستهلاك.',
    CA: 'إبلاغات التلاعب والأخطار، الشكاوى الإدارية وأضرار الشبكة العامة.',
  };

  // ====== Wire ticker (الشريط الحيّ) ======
  function buildWireTicker(meta, services) {
    const host = $('#wireTicker');
    if (!host) return;
    // الإفتراضي: مزيج من البيانات الحقيقية + خبر إعلانيّ
    const sample = [
      { id: 'TQ-2026-08-1417', who: 'علي عبدالله',     act: 'فُتح كشف ميداني',     svc: 'CS0001' },
      { id: 'TQ-2026-08-1413', who: 'هدى محمود',       act: 'مطالبة مالية صدرت',  svc: 'CT0009' },
      { id: 'TQ-2026-08-1409', who: 'حسن جاسم',        act: 'تقسيط موافق عليه',    svc: 'CB0006' },
      { id: 'TQ-2026-08-1407', who: 'سرى ناجي',        act: 'تنبيه خطر — تنفيذ',   svc: 'CA0002' },
      { id: 'TQ-2026-08-1402', who: 'أحمد علي',        act: 'نقل ملكية',           svc: 'CS0011' },
      { id: 'TQ-2026-08-1395', who: 'مريم رياض',       act: 'تغيير موقع مقياس',    svc: 'CT0008' },
      { id: 'TQ-2026-08-1389', who: 'وداد جاسم',       act: 'دفع قائمة 84٬500 د.ع', svc: 'CB0001' },
      { id: 'TQ-2026-08-1382', who: 'كهرباء الكرادة',  act: 'إصدار نموذج جديد',    svc: 'CS0010' },
    ];

    host.innerHTML = '';
    host.appendChild(el('span', { class: 'wire__lbl', text: 'LIVE · على الهواء' }));
    const track = el('div', { class: 'wire__track' });
    const strip = el('div', { class: 'wire__strip' });
    const items = sample.concat(sample); // مرّتان لانسياب مستمر
    items.forEach((it) => {
      strip.appendChild(el('span', { class: 'wire__item' }, [
        el('span', { class: 'wire__pulse', 'aria-hidden': 'true' }),
        el('span', { class: 'wire__id', text: it.id }),
        el('span', { text: '·' }),
        el('span', { style: { opacity: 0.9 }, text: it.who }),
        el('span', { style: { opacity: 0.7 }, text: it.act }),
        el('span', { style: { opacity: 0.55 }, text: '[' + it.svc + ']' }),
      ]));
    });
    track.appendChild(strip);
    host.appendChild(track);
  }

  function startClock() {
    const node = $('#diwanClock');
    if (!node) return;
    function tick() {
      const d = new Date();
      const date = fmtDateAr(d);
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      node.textContent = date + ' · ' + time;
    }
    tick();
    setInterval(tick, 30000);
  }

  function syncMainTabs() {
    const tabs = $$('#diwanTabs .dtab');
    if (!tabs.length) return;
    const h = location.hash || '#/';
    let active = 'home';
    if (h.startsWith('#/services')) active = 'services';
    else if (h.startsWith('#/service/')) active = 'services';
    else if (h.startsWith('#/cases')) active = 'cases';
    else if (h.startsWith('#/fees')) active = 'fees';
    else if (h.startsWith('#/guide')) active = 'guide';
    tabs.forEach((a) => a.classList.toggle('is-on', a.dataset.route === active));
    const rails = $$('.minirail .minirail__btn');
    rails.forEach((a) => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('is-on',
        (active === 'home' && href === '#/') ||
        (active === 'services' && href === '#/services') ||
        (active === 'cases' && href === '#/cases') ||
        (active === 'fees' && href === '#/fees') ||
        (active === 'guide' && href === '#/guide'));
    });
  }

  // ====== Crumb helper ======
  function crumb(trail) {
    const wrap = el('nav', { class: 'crumb', 'aria-label': 'مسار التصفّح' });
    trail.forEach((it, i) => {
      if (i > 0) wrap.appendChild(el('span', { class: 'sep', 'aria-hidden': 'true' }));
      if (it.href) wrap.appendChild(el('a', { href: it.href, text: it.label }));
      else wrap.appendChild(el('span', { class: 'now', text: it.label }));
    });
    return wrap;
  }

  // ====== HOME (الديوان) ======
  D.renderHome = function (appNode, App) {
    const meta = App.data.meta;
    const all = Object.values(App.data.services);
    const today = new Date();

    const view = el('div', { class: 'home fade-in' });

    // ---- MASTHEAD ----
    const total = all.length;
    const secCount = Object.keys(meta.sections).length;
    const draftsCount = Object.keys(App.drafts || {}).length;
    const mast = el('section', { class: 'mast' });

    mast.appendChild(el('div', { class: 'mast__left' }, [
      el('div', { class: 'mast__date' }, [
        el('span', {}, [el('span', { class: 'vol', text: 'VOL. XIV' }), ' · العدد ٢٤٧']),
        el('span', { text: fmtDateAr(today) }),
        el('span', { text: 'RS-014 · الكرادة' }),
      ]),
      el('div', {}, [
        el('h1', { class: 'mast__hd', html:
          'السجل الرسمي<br/>لـ<em>خدمات المشتركين</em>' +
          '<span class="sm">— ' + total + ' خدمة · ' + secCount + ' أقسام · نظام موحّد —</span>',
        }),
        el('p', { class: 'mast__lede', html:
          'منصة موظفي خدمات المشتركين في مركز توزيع كهرباء الرصافة — ' +
          '<strong>تعبئة، متابعة، استرجاع، وإصدار رسمي</strong>. ' +
          'نموذجان لكل خدمة: <strong>الأصلي طبق الأصل</strong> و<strong>الذكي المُعاد ترتيبه</strong>، بنفس البيانات وذات المنهجية.',
        }),
      ]),
      el('div', { class: 'mast__cta' }, [
        el('a', { class: 'dbtn dbtn--crimson dbtn--lg', href: '#/services' }, [icon('add', 18), el('span', { text: 'افتح طلب جديد' })]),
        el('a', { class: 'dbtn dbtn--lg', href: '#/cases' }, [icon('folder_open', 18), el('span', { text: 'إضباراتي النشطة' })]),
        el('a', { class: 'dbtn dbtn--ghost dbtn--lg', href: '#/guide' }, [icon('menu_book', 18), el('span', { text: 'دليل الإجراءات' })]),
      ]),
    ]));

    // ---- MAST RIGHT (now panel) ----
    const todayCount = draftsCount + 84;
    mast.appendChild(el('div', { class: 'mast__right' }, [
      el('div', { class: 'now__row' }, [
        el('span', { class: 'now__lbl', text: 'في هذه اللحظة' }),
        el('span', { class: 'stamp stamp--ok', text: 'على الهواء' }),
      ]),
      el('div', { class: 'now__row' }, [
        el('div', {}, [
          el('div', { class: 'now__big' }, [String(todayCount), el('sup', { text: 'طلب اليوم' })]),
          el('div', { class: 'now__sub', text: 'أُدخلت في النظام منذ بداية الدوام' }),
        ]),
      ]),
      el('div', { class: 'now__grid' }, [
        el('div', { class: 'now__cell' }, [
          el('div', { class: 'v', text: String(213) }),
          el('div', { class: 'l', text: 'قيد المعالجة' }),
        ]),
        el('div', { class: 'now__cell' }, [
          el('div', { class: 'v', text: pad2(draftsCount) }),
          el('div', { class: 'l', text: 'مسوداتك المفتوحة' }),
        ]),
        el('div', { class: 'now__cell' }, [
          el('div', { class: 'v', html: '94<small style="font-size:.55em;font-weight:700">٪</small>' }),
          el('div', { class: 'l', text: 'نسبة الرضا' }),
        ]),
      ]),
    ]));

    view.appendChild(mast);

    // ---- SPARK ----
    view.appendChild(el('div', { class: 'spark', 'aria-hidden': 'true' }));

    // ---- DEPARTMENTS ----
    const deptsSection = el('section', {}, [
      el('div', { class: 'rule' }, [
        el('span', { class: 'rule__num', text: 'II — الأقسام الأربعة' }),
        el('h2', { class: 'rule__title', text: 'قطاعات الخدمة' }),
        el('span', { class: 'rule__meta', text: total + ' خدمة موزّعة وفق دليل ٢٠٢٦' }),
      ]),
    ]);
    const deptGrid = el('div', { class: 'depts' });
    Object.values(meta.sections).forEach((s) => {
      const count = all.filter((x) => x.section === s.code).length;
      const color = SECTION_COLORS[s.code] || '#0c1422';
      const blurb = SECTION_BLURB[s.code] || s.desc || '';
      deptGrid.appendChild(el('a', {
        class: 'dept',
        style: { '--dept-c': color },
        href: '#/services?sec=' + encodeURIComponent(s.code),
        'aria-label': s.name,
      }, [
        el('span', { class: 'dept__bg', 'aria-hidden': 'true', text: s.code }),
        el('div', { class: 'dept__top' }, [
          el('span', { class: 'dept__code', text: s.code }),
          el('span', { class: 'dept__count' }, [String(count), el('small', { text: 'خدمة' })]),
        ]),
        el('h3', { class: 'dept__name', text: s.name }),
        el('p', { class: 'dept__sub', text: blurb }),
        el('span', { class: 'dept__arrow' }, [el('span', { text: 'افتح القسم' }), icon('arrow_back_ios_new', 16)]),
      ]));
    });
    deptsSection.appendChild(deptGrid);
    view.appendChild(deptsSection);

    // ---- DOCKET ----
    const dockSection = el('section', {}, [
      el('div', { class: 'rule' }, [
        el('span', { class: 'rule__num', text: 'III — جدول اليوم' }),
        el('h2', { class: 'rule__title', text: 'قائمة الطلبات والمُسوّدات المفتوحة' }),
        el('span', { class: 'rule__meta', text: 'آخر تحديث: قبل دقيقة' }),
      ]),
    ]);

    // build docket list from user's actual drafts (if any) else from mock
    const drafts = App.drafts || {};
    const draftEntries = Object.keys(drafts)
      .filter((c) => App.data.services[c])
      .slice(0, 6);
    const mockDocket = [
      { code: 'CS0001', who: 'علي عبدالله حسين',  status: 'فحص ميداني',     officer: 'م. كرار',  priority: 'standard', age: 'منذ ساعتين' },
      { code: 'CT0009', who: 'هدى محمود إبراهيم', status: 'بانتظار الدفع',  officer: 'م. زينب',  priority: 'standard', age: 'منذ ٤ ساعات' },
      { code: 'CB0006', who: 'حسن جاسم العبيدي',  status: 'موافقة مدير',    officer: 'م. أحمد',  priority: 'vip',      age: 'أمس' },
      { code: 'CA0002', who: 'سرى ناجي كاظم',     status: 'فريق طوارئ',     officer: 'م. مصطفى', priority: 'urgent',   age: 'أمس' },
      { code: 'CS0011', who: 'أحمد علي الجبوري',  status: 'تحقق قانوني',    officer: 'م. كرار',  priority: 'standard', age: 'منذ يومين' },
      { code: 'CT0008', who: 'مريم رياض الزبيدي', status: 'قيد التنفيذ',    officer: 'م. زينب',  priority: 'standard', age: 'منذ ٣ أيام' },
    ];

    const docketItems = (draftEntries.length ? draftEntries.map((code, i) => {
      const d = drafts[code] || {};
      return {
        code,
        who: (d.subscriberName && String(d.subscriberName).trim()) || 'بدون اسم — مسوّدة',
        status: 'مسوّدة مفتوحة',
        officer: 'أنت',
        priority: 'standard',
        age: 'محفوظة محلياً',
        ref: d.__caseRef || null,
      };
    }) : mockDocket).slice(0, 6);

    const dockGrid = el('div', { class: 'dock' });
    const dockList = el('div', { class: 'dock__list' });
    docketItems.forEach((c, i) => {
      const svc = App.data.services[c.code];
      if (!svc) return;
      const stamp = c.priority === 'urgent' ? el('span', { class: 'stamp stamp--urgent', text: 'عاجل' })
                  : c.priority === 'vip' ? el('span', { class: 'stamp stamp--vip', text: 'VIP' })
                  : null;
      dockList.appendChild(el('a', {
        class: 'docket',
        href: '#/service/' + c.code,
      }, [
        el('span', { class: 'docket__num', style: { color: SECTION_COLORS[svc.section] }, text: pad2(i + 1) }),
        el('div', { class: 'docket__main' }, [
          el('span', { class: 'docket__svc', text: c.code + ' · ' + svc.title }),
          el('span', { class: 'docket__name', text: c.who }),
          el('span', { class: 'docket__who', text: c.officer + ' · ' + c.status }),
        ]),
        stamp,
        el('span', { class: 'docket__time', text: c.age }),
      ]));
    });
    dockGrid.appendChild(dockList);

    // running log (right side)
    const log = el('aside', { class: 'log' }, [
      el('div', { class: 'log__title' }, [
        el('span', { class: 'dot', 'aria-hidden': 'true' }),
        el('span', { text: 'سجل الحركة الحيّ' }),
      ]),
    ]);
    const logList = el('div', { class: 'log__list' });
    [
      ['٠٩:٤٢', 'الصندوق وَصَل قبض رقم <span class="id">38291</span> بمبلغ <strong>15,000 د.ع</strong> — رسوم طلب CS0001.'],
      ['٠٩:٣٥', 'الفريق الفني خرج للكشف على عنوان <strong>محلة ٣١٨ — زقاق ٤٤</strong> · ساعة ميدانية متوقعة.'],
      ['٠٩:٢٢', 'صدرت مطالبة مالية على ملف <span class="id">TQ-2026-08-1413</span> · <strong>60,000 د.ع</strong>.'],
      ['٠٩:١٠', 'تم إغلاق <span class="id">TQ-2026-08-1406</span> — صنف منزلي، أحادي الطور. <strong>اشتراك ٠١٠٣٤٤٢٩٩٤٢</strong>.'],
      ['٠٨:٥٤', 'المدير وقّع على تقسيط لـ <strong>دار النور التجارية</strong> — ٦ أقساط على ٦ أشهر.'],
      ['٠٨:٤٠', 'افتتاح نوبة الصباح في مركز <strong>الكرادة — RS-014</strong> · ٣ موظفين، ٢ كاشير.'],
    ].forEach((r) => {
      logList.appendChild(el('div', { class: 'log__row' }, [
        el('span', { class: 't', text: r[0] }),
        el('span', { html: r[1] }),
      ]));
    });
    log.appendChild(logList);
    log.appendChild(el('div', {
      style: { paddingTop: '12px', borderTop: '1.5px dashed var(--d-paper-line)', fontFamily: 'var(--d-mono)', fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--d-ink-soft)', display: 'flex', justifyContent: 'space-between' },
    }, [
      el('span', { text: 'BUFFER · 6 · 256' }),
      el('a', { href: '#/cases', style: { color: 'var(--d-crimson)', fontWeight: '800', textDecoration: 'none' }, text: 'عرض السجل الكامل ←' }),
    ]));
    dockGrid.appendChild(log);

    dockSection.appendChild(dockGrid);
    view.appendChild(dockSection);

    appNode.innerHTML = '';
    appNode.appendChild(view);
  };

  // ====== REGISTRY (سجلّ الخدمات) ======
  D.renderRegistry = function (appNode, App, opts) {
    opts = opts || {};
    const meta = App.data.meta;
    const all = Object.entries(App.data.services).map(([code, s]) => Object.assign({ code }, s));
    const params = parseHashParams(location.hash);
    let q = params.q || '';
    let sec = params.sec || opts.sec || 'all';

    const view = el('div', { class: 'reg fade-in' });

    view.appendChild(crumb([
      { label: 'الديوان', href: '#/' },
      { label: 'سجلّ الخدمات' },
    ]));

    view.appendChild(el('header', { class: 'reg__intro' }, [
      el('h1', { class: 'big', html: 'سجلّ الخدمات<br/><em>' + all.length + ' خدمة</em>' }),
      el('p', { class: 'lede', text:
        'فهرس رسمي بجميع الخدمات المقدّمة للمواطنين والمشتركين عبر مركز خدمات الرصافة. ' +
        'كل خدمة لها رقم تعريفي ثابت، شروط محدّدة، أجور رسمية، ومدّة معتادة. ' +
        'اختر خدمة لفتح صفحتها التفصيلية أو ابدأ النموذج مباشرةً.',
      }),
      el('div', { class: 'meta', html: 'REF: SVC-CAT/2026<br/>REV. 03 · 14.NOV.26' }),
    ]));

    // search + chips
    const searchInp = el('input', {
      id: 'regSearch', type: 'search', value: q,
      placeholder: 'ابحث: اسم الخدمة، الرقم (مثل CS0001)، أو اسم القسم…',
      'aria-label': 'بحث في سجلّ الخدمات',
    });
    const chipsWrap = el('div', { class: 'reg__chips' });
    const mkChip = (key, label, n) => {
      const b = el('button', {
        class: 'reg__chip' + (sec === key ? ' is-on' : ''), type: 'button',
        onclick: () => { sec = key; renderGroups(); chipsWrap.querySelectorAll('.reg__chip').forEach((c) => c.classList.toggle('is-on', c.dataset.k === key)); },
        'data-k': key,
      }, [el('span', { text: label }), el('span', { class: 'n', text: String(n) })]);
      return b;
    };
    chipsWrap.appendChild(mkChip('all', 'الكل', all.length));
    Object.values(meta.sections).forEach((s) => {
      const n = all.filter((x) => x.section === s.code).length;
      chipsWrap.appendChild(mkChip(s.code, s.code + ' · ' + s.name, n));
    });

    view.appendChild(el('div', { class: 'reg__strip' }, [
      el('div', { class: 'reg__search' }, [icon('search', 20), searchInp]),
      chipsWrap,
      el('span', { class: 'mono', style: { fontSize: '0.74rem', color: 'var(--d-ink-soft)', letterSpacing: '0.06em' }, text: 'ZOOM · DENSE' }),
    ]));

    // groups host
    const groupsHost = el('div', {});
    view.appendChild(groupsHost);

    function renderGroups() {
      groupsHost.innerHTML = '';
      let filtered = all.slice();
      if (sec !== 'all') filtered = filtered.filter((s) => s.section === sec);
      const term = (q || '').trim().toLowerCase();
      if (term) {
        filtered = filtered.filter((s) =>
          (s.title || '').toLowerCase().includes(term) ||
          (s.code || '').toLowerCase().includes(term) ||
          (s.formNumber || '').toLowerCase().includes(term) ||
          (meta.sections[s.section] && meta.sections[s.section].name.includes(term))
        );
      }
      if (!filtered.length) {
        groupsHost.appendChild(el('div', { class: 'dempty' }, [
          el('strong', { text: 'لا توجد خدمات مطابقة' }),
          'جرّب كلمة أخرى أو غيّر القسم.',
        ]));
        return;
      }
      Object.values(meta.sections).forEach((sect) => {
        const items = filtered.filter((x) => x.section === sect.code);
        if (!items.length) return;
        const color = SECTION_COLORS[sect.code] || '#0c1422';
        const section = el('section', { class: 'reg__section' }, [
          el('div', { class: 'reg__index', style: { '--ix-c': color } }, [
            el('span', { class: 'l', text: sect.code }),
            el('span', { class: 'n', text: pad2(items.length) + ' · SERVICES' }),
            el('span', { class: 'nm', text: sect.name }),
          ]),
        ]);
        const list = el('div', { class: 'reg__items' });
        items.forEach((svc) => {
          // price / meta
          const draft = (App.drafts && App.drafts[svc.code]) || {};
          let priceMeta = '—';
          if (typeof window.resolveServicePrice === 'function') {
            const pr = window.resolveServicePrice(svc, draft);
            if (pr && pr.value && pr.value !== '—') priceMeta = pr.value;
          }
          const slaDays = svc.sla || (svc.guide && svc.guide.sla) || 3;
          list.appendChild(el('a', {
            class: 'svcrow',
            href: '#/service/' + svc.code,
            style: { '--svc-c': color },
          }, [
            el('div', { class: 'svcrow__num' }, [
              svc.code.slice(2),
              el('small', { text: svc.code.slice(0, 2) }),
            ]),
            el('div', {}, [
              el('h3', { class: 'svcrow__title', text: svc.title }),
              el('div', { class: 'svcrow__meta' }, [
                el('span', { text: priceMeta }),
                el('span', { text: ' · رقم النموذج ' + (svc.formNumber || svc.code) }),
                svc.urgent ? el('span', { class: 'urgent', text: ' · عاجل' }) : null,
              ]),
            ]),
            el('div', { class: 'svcrow__sla' }, [
              String(slaDays),
              el('small', { text: 'أيام عمل' }),
            ]),
            el('span', { class: 'svcrow__arrow' }, [el('span', { text: 'افتح' }), icon('arrow_back_ios_new', 14)]),
          ]));
        });
        section.appendChild(list);
        groupsHost.appendChild(section);
      });
    }

    searchInp.addEventListener('input', () => { q = searchInp.value; renderGroups(); });
    renderGroups();

    appNode.innerHTML = '';
    appNode.appendChild(view);
    setTimeout(() => { try { searchInp.focus({ preventScroll: true }); } catch (e) {} }, 0);
  };

  // ====== SERVICE SHELL (header + tabs + body) ======
  // tab in: form | preview | guide
  D.renderServiceShell = function (appNode, App, code, tab) {
    const svc = App.data.services[code];
    if (!svc) { D.renderHome(appNode, App); return; }
    const meta = App.data.meta;
    const sec = meta.sections[svc.section];
    const draft = (App.drafts && App.drafts[code]) || {};
    const color = SECTION_COLORS[svc.section] || '#0c1422';
    const view = el('div', { class: 'svcd fade-in', style: { '--svc-c': color } });

    view.appendChild(crumb([
      { label: 'الديوان', href: '#/' },
      { label: 'سجلّ الخدمات', href: '#/services' },
      { label: sec ? sec.name : '', href: '#/services?sec=' + svc.section },
      { label: code + ' · ' + svc.title },
    ]));

    // ---- HEAD ----
    const head = el('header', { class: 'svcd__head' });
    head.appendChild(el('div', { class: 'svcd__code' }, [
      code.slice(2),
      el('small', { text: code.slice(0, 2) + ' · ' + (sec ? sec.name : '') }),
    ]));

    const lede = svc.guide && svc.guide.definition ? svc.guide.definition :
      'تقدّم هذه الخدمة للمشتركين عبر مركز خدمات المشتركين ضمن إجراءات قسم ' + (sec ? sec.name : '') + ' وفق ضوابط الشركة.';

    const actions = el('div', { class: 'svcd__actions' }, [
      el('a', { class: 'dbtn dbtn--crimson dbtn--lg', href: '#/service/' + code + '/form' }, [icon('edit_document', 18), el('span', { text: 'ابدأ تعبئة النموذج' })]),
      el('a', { class: 'dbtn dbtn--ghost dbtn--lg', href: '#/service/' + code + '/guide' }, [icon('menu_book', 18), el('span', { text: 'دليل الخدمة' })]),
    ]);
    if (window.canPreviewWord && window.canPreviewWord(code)) {
      actions.appendChild(el('a', { class: 'dbtn dbtn--ghost dbtn--lg', href: '#/service/' + code + '/preview' }, [icon('print', 18), el('span', { text: 'معاينة للطباعة' })]));
    }

    head.appendChild(el('div', {}, [
      el('h1', { class: 'svcd__title', text: svc.title }),
      el('p', { class: 'svcd__lede', text: lede }),
      actions,
    ]));

    // SLA + price stamp
    const slaDays = svc.sla || (svc.guide && svc.guide.sla) || 3;
    let priceVal = '—', priceLbl = '';
    if (typeof window.resolveServicePrice === 'function' && svc.pricing) {
      const pr = window.resolveServicePrice(svc, draft);
      if (pr) { priceVal = pr.value || '—'; priceLbl = pr.label || 'تقديري'; }
    }
    head.appendChild(el('div', { class: 'svcd__stamp' }, [
      el('span', { class: 'stamp ' + (svc.urgent ? 'stamp--urgent' : 'stamp--ok'), text: svc.urgent ? 'عاجل' : 'فعّال' }),
      el('div', { class: 'svcd__sla' }, [String(slaDays), el('small', { text: 'أيام عمل' })]),
      priceVal && priceVal !== '—' ? el('div', { class: 'svcd__sla', style: { fontSize: '1.3rem' } }, [
        el('span', { text: priceVal }),
        el('small', { text: priceLbl || 'تقديري' }),
      ]) : null,
    ]));

    view.appendChild(head);

    // ---- SUB TABS ----
    const canPreview = !!(window.canPreviewWord && window.canPreviewWord(code) && svc.form && svc.form.blocks);
    if (tab === 'preview' && !canPreview) tab = 'form';
    const tabDefs = [
      { id: 'form',    label: 'تعبئة النموذج' },
      canPreview ? { id: 'preview', label: 'المعاينة المطابقة', badge: 'كالأصل' } : null,
      { id: 'guide',   label: 'شرح الخدمة' },
    ].filter(Boolean);
    const subtabs = el('nav', { class: 'sdtabs', role: 'tablist', 'aria-label': 'أقسام الخدمة' });
    tabDefs.forEach((t) => {
      subtabs.appendChild(el('a', {
        class: 'sdtab' + (tab === t.id ? ' is-on' : ''),
        href: '#/service/' + code + '/' + t.id,
        role: 'tab',
        'aria-selected': tab === t.id ? 'true' : 'false',
      }, [
        el('span', { text: t.label }),
        t.badge ? el('span', { class: 'sdtab__badge', text: t.badge }) : null,
      ]));
    });
    view.appendChild(subtabs);

    // ---- BODY ----
    const body = el('div', { class: 'svcd__body-host', style: { paddingTop: '14px' } });

    if (tab === 'guide') {
      // use existing renderGuide
      if (typeof window.renderGuide === 'function') body.appendChild(window.renderGuide(svc));
      else body.appendChild(el('div', { class: 'dempty', text: 'الدليل غير متاح.' }));
    } else if (tab === 'preview') {
      if (typeof window.renderPreview === 'function') body.appendChild(window.renderPreview(code, svc));
      else body.appendChild(el('div', { class: 'dempty', text: 'المعاينة غير متاحة.' }));
    } else {
      // form tab — use existing renderWorkspace (command bar + form + agent assist + notes)
      if (typeof window.renderWorkspace === 'function') {
        body.appendChild(window.renderWorkspace(code, svc));
      } else {
        body.appendChild(el('div', { class: 'dempty', text: 'محرّك النموذج غير متاح.' }));
      }
    }

    view.appendChild(body);

    appNode.innerHTML = '';
    appNode.appendChild(view);
  };

  // ====== FEES (لائحة الأجور) ======
  D.renderFees = function (appNode, App) {
    const view = el('div', { class: 'reg fade-in' });

    view.appendChild(crumb([
      { label: 'الديوان', href: '#/' },
      { label: 'لائحة الأجور الرسمية' },
    ]));

    view.appendChild(el('header', { class: 'reg__intro' }, [
      el('h1', { class: 'big', html: 'لائحة الأجور<br/><em>٢٠٢٦</em>' }),
      el('p', { class: 'lede', text:
        'المرجع الرسمي لكافة أجور الخدمات المقدّمة من قبل شركة توزيع كهرباء بغداد — قطاع الرصافة. ' +
        'تُحتسب الأجور تلقائياً داخل نماذج الخدمات بناءً على هذه اللائحة، مع مقارنة بأسعار ٢٠٢٣ للمرجعية.',
      }),
      el('div', { class: 'meta', html: 'REF: FEE/2026/03<br/>14.NOV.26' }),
    ]));

    // load service_prices.json — async
    const host = el('div', {});
    view.appendChild(host);
    appNode.innerHTML = '';
    appNode.appendChild(view);

    fetch('data/service_prices.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then((pricing) => {
        const catalog = pricing.catalog || [];
        // group by category
        const cats = {};
        catalog.forEach((it) => {
          const c = it.category || 'عام';
          if (!cats[c]) cats[c] = [];
          cats[c].push(it);
        });
        const order = ['عام', 'منزلي', 'تجاري', 'صناعي', 'حكومي', 'زراعي', 'باقي الأصناف'];
        const keys = Object.keys(cats).sort((a, b) => order.indexOf(a) - order.indexOf(b));
        keys.forEach((catName) => {
          const items = cats[catName];
          const section = el('section', { class: 'reg__section', style: { marginBottom: '18px' } });
          section.appendChild(el('div', { class: 'reg__index' }, [
            el('span', { class: 'l', style: { fontSize: '2.6rem' }, text: catName.slice(0, 3) }),
            el('span', { class: 'n', text: pad2(items.length) + ' · BANDS' }),
            el('span', { class: 'nm', text: catName }),
          ]));
          const list = el('div', { class: 'fees__cat' });
          items.forEach((it) => {
            const a26 = (typeof it.amount2026 === 'number') ? fmtIQDInt(it.amount2026) : (it.amount2026 || '—');
            const a23 = (typeof it.amount2023 === 'number') ? fmtIQDInt(it.amount2023) : (typeof it.amount2023 === 'string' && it.amount2023.length < 60 ? it.amount2023 : '—');
            const nameNode = el('div', { class: 'name' }, [
              el('span', { text: it.service || '—' }),
              it.notes ? el('small', { text: it.notes }) : null,
            ]);
            list.appendChild(el('div', { class: 'fees__row' }, [
              nameNode,
              el('div', { class: 'y26' }, [el('span', { text: a26 || '—' }), el('small', { text: 'سعر ٢٠٢٦' })]),
              el('div', { class: 'y23' }, [el('span', { text: a23 || '—' }), el('small', { text: 'سعر ٢٠٢٣' })]),
            ]));
          });
          section.appendChild(list);
          host.appendChild(section);
        });
      })
      .catch((err) => {
        host.appendChild(el('div', { class: 'dempty' }, [
          el('strong', { text: 'تعذّر تحميل لائحة الأجور' }),
          'تحقّق من تشغيل الخادم المحلي. ' + (err && err.message ? err.message : ''),
        ]));
      });
  };

  // ====== GUIDE (دليل الإجراءات) ======
  D.renderGuide = function (appNode, App) {
    const meta = App.data.meta;
    const all = Object.entries(App.data.services).map(([c, s]) => Object.assign({ code: c }, s));
    const view = el('div', { class: 'reg fade-in' });

    view.appendChild(crumb([
      { label: 'الديوان', href: '#/' },
      { label: 'دليل الإجراءات' },
    ]));

    view.appendChild(el('header', { class: 'reg__intro' }, [
      el('h1', { class: 'big', html: 'دليل<br/><em>الإجراءات</em>' }),
      el('p', { class: 'lede', text:
        'شرح موحّد للموظفين: لكل خدمة من خدمات الديوان — متى تقدَّم، شروطها، وثائقها، وأخطاؤها الشائعة. ' +
        'يُستخدم الدليل كمرجع سريع أثناء التعبئة، مع روابط مباشرة لفتح صفحات الخدمات.',
      }),
      el('div', { class: 'meta', html: 'REF: GUIDE/2026<br/>14.NOV.26' }),
    ]));

    // Agent assist block (from meta.agentAssist) — per-section
    const aa = meta.agentAssist || {};
    const wrap = el('div', { class: 'guidepg' });
    Object.values(meta.sections).forEach((sect) => {
      const aid = aa[sect.code] || {};
      const items = all.filter((s) => s.section === sect.code);
      const card = el('section', { class: 'guidepg__card', style: { borderInlineStart: '6px solid ' + (SECTION_COLORS[sect.code] || 'var(--d-ink)') } });
      card.appendChild(el('h2', { html: sect.name + ' <small>' + sect.code + ' · ' + items.length + ' خدمة</small>' }));
      if (aid.intro || sect.desc) card.appendChild(el('p', { class: 'guidepg__intro', text: aid.intro || sect.desc }));
      if (aid.protocol && aid.protocol.length) {
        card.appendChild(el('h3', { style: { margin: '6px 0 0', font: 'inherit', fontFamily: 'var(--d-display)', fontWeight: '900', color: 'var(--d-ink)', fontSize: '0.92rem' }, text: 'بروتوكول العمل:' }));
        const ul = el('ul', { class: 'guidepg__list' });
        aid.protocol.forEach((p) => ul.appendChild(el('li', { text: p })));
        card.appendChild(ul);
      }
      if (aid.escalation && aid.escalation.length) {
        card.appendChild(el('h3', { style: { margin: '6px 0 0', fontFamily: 'var(--d-display)', fontWeight: '900', color: 'var(--d-crimson)', fontSize: '0.92rem' }, text: 'قواعد التصعيد:' }));
        const ul = el('ul', { class: 'guidepg__list' });
        aid.escalation.forEach((p) => ul.appendChild(el('li', { text: p })));
        card.appendChild(ul);
      }
      // services in this section (linked)
      const links = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' } });
      items.forEach((svc) => {
        links.appendChild(el('a', {
          class: 'reg__chip',
          href: '#/service/' + svc.code + '/guide',
          style: { fontSize: '0.78rem' },
          text: svc.code + ' · ' + svc.title,
        }));
      });
      card.appendChild(links);
      wrap.appendChild(card);
    });
    view.appendChild(wrap);

    appNode.innerHTML = '';
    appNode.appendChild(view);
  };

  // ====== CASES (الإضبارات) ======
  D.renderCases = function (appNode, App) {
    const drafts = App.drafts || {};
    const view = el('div', { class: 'reg fade-in' });

    view.appendChild(crumb([
      { label: 'الديوان', href: '#/' },
      { label: 'الإضبارات النشطة' },
    ]));

    const draftKeys = Object.keys(drafts).filter((c) => App.data.services[c]);

    view.appendChild(el('header', { class: 'reg__intro' }, [
      el('h1', { class: 'big', html: 'الإضبارات<br/><em>' + draftKeys.length + ' ملفّ</em>' }),
      el('p', { class: 'lede', text:
        'مسوّداتك المفتوحة محلياً — جلسات تعبئة محفوظة تلقائياً للمتابعة لاحقاً. ' +
        'افتح أي ملف للمتابعة في النموذج، أو ابدأ إضبارة جديدة من سجلّ الخدمات.',
      }),
      el('div', { class: 'meta', html: 'RS-014 · LOCAL<br/>نوبة الصباح' }),
    ]));

    if (!draftKeys.length) {
      view.appendChild(el('div', { class: 'dempty' }, [
        el('strong', { text: 'لا توجد إضبارات مفتوحة' }),
        'ابدأ بفتح خدمة جديدة من سجلّ الخدمات، وستُحفظ مسوّدتك تلقائياً هنا.',
      ]));
      const cta = el('div', { style: { textAlign: 'center', marginTop: '20px' } });
      cta.appendChild(el('a', { class: 'dbtn dbtn--crimson dbtn--lg', href: '#/services' }, [icon('add', 18), el('span', { text: 'فتح خدمة جديدة' })]));
      view.appendChild(cta);
    } else {
      const list = el('div', { class: 'stack', style: { gap: '0' } });
      draftKeys.forEach((code, i) => {
        const svc = App.data.services[code];
        const sec = App.data.meta.sections[svc.section];
        const d = drafts[code] || {};
        const ref = d.__caseRef || '—';
        const who = (d.subscriberName && String(d.subscriberName).trim()) || '— لم يُكتب اسم المشترك —';
        const color = SECTION_COLORS[svc.section] || '#0c1422';
        list.appendChild(el('a', {
          class: 'docket',
          style: { '--svc-c': color, padding: '18px 14px', borderInlineStart: '4px solid ' + color, marginBottom: '6px', background: 'var(--d-paper-2)', border: '1.5px solid var(--d-paper-line)' },
          href: '#/service/' + code,
        }, [
          el('span', { class: 'docket__num', style: { color }, text: pad2(i + 1) }),
          el('div', { class: 'docket__main' }, [
            el('span', { class: 'docket__svc', text: code + ' · ' + svc.title }),
            el('span', { class: 'docket__name', text: who }),
            el('span', { class: 'docket__who', text: (sec ? sec.name : '') + ' · ' + ref }),
          ]),
          el('span', { class: 'stamp stamp--pending', text: 'مسوّدة' }),
          el('span', { class: 'docket__time', text: 'محفوظة محلياً' }),
        ]));
      });
      view.appendChild(list);
    }

    appNode.innerHTML = '';
    appNode.appendChild(view);
  };

  // ====== Boot — wire ticker, clock, nav sync ======
  D.boot = function (App) {
    buildWireTicker(App.data.meta, App.data.services);
    startClock();
    // year stamp in footer
    const y = document.getElementById('dfootYear');
    if (y) y.textContent = new Date().getFullYear();
    // sync main tabs on hash change
    window.addEventListener('hashchange', syncMainTabs);
    syncMainTabs();
    // wire emergency button to CA0002
    const sos = document.getElementById('diwanSos');
    if (sos) sos.addEventListener('click', () => { location.hash = '#/service/CA0002/form'; });
    const search = document.getElementById('diwanSearch');
    if (search) search.addEventListener('click', () => {
      if (location.hash.startsWith('#/services')) {
        const i = document.getElementById('regSearch');
        if (i) i.focus();
      } else location.hash = '#/services';
    });
    const printBtn = document.getElementById('diwanPrint');
    if (printBtn) printBtn.addEventListener('click', () => { window.print(); });
  };

  // ====== utility: parse #/services?sec=CS&q=foo ======
  function parseHashParams(hash) {
    const out = {};
    const m = (hash || '').match(/\?(.+)$/);
    if (!m) return out;
    m[1].split('&').forEach((kv) => {
      const [k, v] = kv.split('=');
      if (k) out[decodeURIComponent(k)] = v == null ? '' : decodeURIComponent(v);
    });
    return out;
  }
  D.parseHashParams = parseHashParams;

  // expose
  global.Diwan = D;
})(window);
