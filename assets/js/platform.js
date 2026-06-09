/* ============================================================
   PLATFORM — طبقة العرض الجديدة (منصة تدفّق الخير)
   ------------------------------------------------------------
   تستبدل تصميم الديوان بالمنصة المتكاملة من الأرشيف الأصلي.
   تستهلك App.data و App.drafts وتستدعي محرّكات app.js دون إعادة كتابتها.
   ============================================================ */
'use strict';

(function (global) {
  const P = {};

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
      style: { fontSize: (size || 20) + 'px' },
      'aria-hidden': 'true',
      text: name,
    });
  }

  function btn(label, opts = {}) {
    const cls = ['rs-btn',
      opts.variant === 'primary' && 'rs-btn--primary',
      opts.variant === 'ghost' && 'rs-btn--ghost',
      opts.size === 'lg' && 'rs-btn--lg',
      opts.size === 'sm' && 'rs-btn--sm',
      opts.class || '',
    ].filter(Boolean).join(' ');
    const b = el('button', { type: opts.type || 'button', class: cls, onclick: opts.onclick }, [
      opts.icon ? el('span', { class: 'rs-btn__ico' }, [icon(opts.icon, 18)]) : null,
      label,
    ]);
    if (opts.href) {
      const a = el('a', { class: cls, href: opts.href }, b.childNodes.length ? Array.from(b.childNodes) : [label]);
      return a;
    }
    return b;
  }

  function fmtIQDInt(n) {
    if (typeof n !== 'number' || !isFinite(n)) return null;
    return new Intl.NumberFormat('ar-IQ').format(n).replace(/,/g, '٬') + ' د.ع';
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function fmtDateAr(d) {
    try {
      return d.toLocaleDateString('ar-IQ-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch (e) {
      return d.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  const SECTION_COLORS = { CS: '#1d4ed8', CT: '#b45309', CB: '#0e7490', CA: '#b91c1c' };
  const SECTION_ICONS = { CS: 'apartment', CT: 'electrical_services', CB: 'receipt_long', CA: 'report' };
  const SECTION_BLURB = {
    CS: 'فتح اشتراكات جديدة، نقل ملكية، تغيير الصنف، إيقاف وتفعيل الاشتراكات.',
    CT: 'فحص المقاييس، تغيير الكابلات والأعمدة، تعديل القوة والجهد، تغيير الموقع.',
    CB: 'دفع القوائم، التقسيط، التسويات المالية، نسخ القوائم وتقارير الاستهلاك.',
    CA: 'إبلاغات التلاعب والأخطار، الشكاوى الإدارية وأضرار الشبكة العامة.',
  };

  function crumbs(trail) {
    const nav = el('nav', { class: 'rs-crumbs', 'aria-label': 'مسار التصفّح' });
    trail.forEach((it, i) => {
      if (i > 0) nav.appendChild(el('span', { class: 'rs-crumbs__sep', text: '›' }));
      if (it.href) nav.appendChild(el('a', { href: it.href, text: it.label }));
      else nav.appendChild(el('span', { class: 'rs-crumbs__current', text: it.label }));
    });
    return nav;
  }

  function secBadge(code) {
    return el('span', { class: 'rs-secbadge rs-secbadge--' + code, text: code });
  }

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

  function syncRail() {
    const h = location.hash || '#/';
    let active = 'home';
    if (h.startsWith('#/services') || h.startsWith('#/service/')) active = 'services';
    else if (h.startsWith('#/cases')) active = 'cases';
    else if (h.startsWith('#/fees')) active = 'fees';
    else if (h.startsWith('#/guide')) active = 'guide';
    $$('#platformRail .rs-rail__link').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.route === active);
    });
  }

  /* ---------- HOME (Dashboard) ---------- */
  P.renderHome = function (appNode, App) {
    const meta = App.data.meta;
    const all = Object.entries(App.data.services).map(([code, s]) => Object.assign({ code }, s));
    const today = new Date();
    const draftsCount = Object.keys(App.drafts || {}).length;
    const view = el('div', { class: 'app-page fade-in' });

    const hero = el('section', { class: 'hero' }, [
      el('div', { class: 'hero__row' }, [
        el('div', {}, [
          el('span', { class: 'hero__eyebrow' }, [
            el('span', { class: 'rs-pulse', style: { background: '#10b981' } }),
            fmtDateAr(today) + ' · مركز الرصافة — الكرادة',
          ]),
          el('h1', { class: 'hero__title', text: 'صباح الخير، مهندس كرار' }),
          el('p', { class: 'hero__sub', html:
            'ابدأ من أحد أقسامك الأربعة — أو اضغط <span class="kbd">⌘K</span> للبحث السريع عن خدمة، حالة، أو مشترك.',
          }),
        ]),
        el('div', { class: 'cluster' }, [
          el('a', { class: 'rs-btn rs-btn--primary rs-btn--lg', href: '#/services' }, [
            el('span', { class: 'rs-btn__ico' }, [icon('bolt', 18)]),
            'ابدأ سريع',
          ]),
          el('a', { class: 'rs-btn rs-btn--lg', href: '#/services' }, [
            el('span', { class: 'rs-btn__ico' }, [icon('add', 18)]),
            'خدمة جديدة',
          ]),
        ]),
      ]),
      el('div', { class: 'hero__stat' }, [
        el('div', { class: 'cell' }, [el('div', { class: 'num', text: String(draftsCount + 12) }), el('div', { class: 'lbl', text: 'حالة جديدة اليوم' })]),
        el('div', { class: 'cell' }, [el('div', { class: 'num', text: String(213) }), el('div', { class: 'lbl', text: 'قيد المعالجة' })]),
        el('div', { class: 'cell' }, [el('div', { class: 'num', html: '148<small style="font-size:0.6rem;opacity:0.7">M</small>' }), el('div', { class: 'lbl', text: 'محصّل اليوم (د.ع)' })]),
        el('div', { class: 'cell' }, [el('div', { class: 'num', text: '94%' }), el('div', { class: 'lbl', text: 'رضا المشتركين' })]),
      ]),
    ]);
    view.appendChild(hero);
    view.appendChild(crumbs([{ label: 'الرئيسية' }]));

    const depts = el('section', { class: 'depts-premium' }, [
      el('header', { class: 'depts-premium__head' }, [
        el('div', {}, [
          el('h3', { class: 'depts-premium__title' }, [
            el('span', { class: 'depts-premium__title-ico' }, [icon('hub', 18)]),
            'الأقسام الأربعة',
          ]),
          el('p', { class: 'depts-premium__sub', text:
            'كل الخدمات الـ ' + all.length + ' موزّعة على أربعة أقسام — اختر القسم لاستعراض خدماته كاملة',
          }),
        ]),
      ]),
    ]);
    const grid = el('div', { class: 'depts-premium__grid' });
    Object.values(meta.sections).forEach((s, i) => {
      const services = all.filter((x) => x.section === s.code);
      const color = SECTION_COLORS[s.code] || '#1d4ed8';
      const blurb = SECTION_BLURB[s.code] || s.desc || '';
      const sample = services.slice(0, 3);
      grid.appendChild(el('a', {
        class: 'dept-prem',
        href: '#/services?sec=' + encodeURIComponent(s.code),
        style: { '--d-color': color, animationDelay: (i * 80) + 'ms' },
      }, [
        el('div', { class: 'dept-prem__bg', 'aria-hidden': 'true' }, [
          el('span', { class: 'dept-prem__mesh' }),
          el('span', { class: 'dept-prem__orb dept-prem__orb--1' }),
          el('span', { class: 'dept-prem__orb dept-prem__orb--2' }),
          el('span', { class: 'dept-prem__grid' }),
        ]),
        el('div', { class: 'dept-prem__strip', 'aria-hidden': 'true' }, [el('span', { class: 'dept-prem__strip-fill' })]),
        el('div', { class: 'dept-prem__head' }, [
          el('span', { class: 'dept-prem__code', text: s.code }),
          el('span', { class: 'dept-prem__count' }, [
            el('span', { class: 'dept-prem__count-n', text: String(services.length) }),
            el('span', { class: 'dept-prem__count-l', text: 'خدمة' }),
          ]),
        ]),
        el('div', { class: 'dept-prem__icon-wrap' }, [
          el('span', { class: 'dept-prem__icon' }, [icon(SECTION_ICONS[s.code] || 'apps', 32)]),
          el('span', { class: 'dept-prem__icon-ring' }),
        ]),
        el('div', { class: 'dept-prem__body' }, [
          el('h4', { class: 'dept-prem__name', text: s.name }),
          el('p', { class: 'dept-prem__blurb', text: blurb }),
        ]),
        el('div', { class: 'dept-prem__samples' }, sample.map((sv) =>
          el('span', { class: 'dept-prem__chip', text: sv.code })
        ).concat(services.length > 3 ? [el('span', { class: 'dept-prem__chip dept-prem__chip--more', text: '+' + (services.length - 3) })] : [])),
        el('span', { class: 'dept-prem__cta' }, [el('span', { text: 'افتح القسم' }), icon('arrow_back', 16)]),
      ]));
    });
    depts.appendChild(grid);
    view.appendChild(depts);

    const rh = el('section', { class: 'rh' }, [
      el('header', { class: 'rh__head' }, [
        el('div', {}, [
          el('h3', { class: 'rh__title' }, [
            el('span', { class: 'rh__title-ico' }, [icon('lightbulb', 18)]),
            'تنبيهات ومعرفة',
          ]),
          el('p', { class: 'rh__sub', text: 'نصائح، أسئلة متكررة، وتحديثات تخص عملك اليومي' }),
        ]),
      ]),
      el('div', { class: 'rh__grid' }, [
        { kind: 'tip', icon: 'lightbulb', color: '#c79111', tag: 'نصيحة', title: 'تجنّب إرجاع طلبات CS0001', body: 'أرفق كتاب تأييد السكن المصدّق قبل تحويل الطلب للدائرة الفنية — أكثر سبب إرجاع هذا الشهر.' },
        { kind: 'faq', icon: 'help', color: '#1d4ed8', tag: 'سؤال متكرر', title: 'كيف يُحسب التقسيط؟', body: 'يحتسب على أساس المتأخرات بحد أقصى 6 أقساط، يحتاج موافقة مدير المركز للقيم فوق 500,000 د.ع.' },
        { kind: 'update', icon: 'campaign', color: '#0e7490', tag: 'تحديث', title: 'تعديل جدول أجور 2026', body: 'بدأ سريان التعديل على أجور خدمات الكشف الميداني — راجع اللائحة قبل إصدار المطالبات.' },
      ].map((it) => el('article', { class: 'rh-card rh-card--' + it.kind, style: { '--rm-color': it.color } }, [
        el('div', { class: 'rh-card__top' }, [
          el('span', { class: 'rh-card__tag' }, [icon(it.icon, 14), ' ' + it.tag]),
        ]),
        el('h4', { class: 'rh-card__title', text: it.title }),
        el('p', { class: 'rh-card__body', text: it.body }),
        el('div', { class: 'rh-card__foot' }, [
          el('span', { class: 'rh-card__by', text: 'من النظام · اليوم' }),
        ]),
      ]))),
    ]);
    view.appendChild(rh);

    const topSvc = all.slice().sort((a, b) => ((b.guide && b.guide.popularity) || 0) - ((a.guide && a.guide.popularity) || 0))[0]
      || all[0];
    if (topSvc) {
      const code = topSvc.code;
      const sec = meta.sections[topSvc.section];
      const spot = el('section', { class: 'spot' }, [
        el('header', { class: 'spot__head' }, [
          el('div', {}, [
            el('h3', { class: 'spot__title' }, [
              el('span', { class: 'spot__title-ico' }, [icon('bolt', 18)]),
              'خدمة مختارة',
            ]),
            el('p', { class: 'spot__sub', text: 'من أكثر الخدمات طلباً في مركز الرصافة' }),
          ]),
          el('a', { class: 'rs-btn rs-btn--ghost rs-btn--sm', href: '#/services' }, [
            el('span', { class: 'rs-btn__ico' }, [icon('apps', 16)]),
            'كل الخدمات',
          ]),
        ]),
        el('a', {
          class: 'spot-card spot-card--aurora',
          href: '#/service/' + code,
          style: { '--svc-color': SECTION_COLORS[topSvc.section] || '#1d4ed8' },
        }, [
          el('div', { class: 'spot-card__bg', 'aria-hidden': 'true' }, [
            el('span', { class: 'spot-card__orb spot-card__orb--1' }),
            el('span', { class: 'spot-card__orb spot-card__orb--2' }),
            el('span', { class: 'spot-card__grid' }),
          ]),
          el('div', { class: 'spot-card__row spot-card__row--top' }, [
            el('span', { class: 'spot-card__rank' }, [el('span', { class: 'spot-card__rank-n', text: '#1' }), 'الأكثر طلباً']),
            el('span', { class: 'spot-card__code', text: code }),
          ]),
          el('div', { class: 'spot-card__body' }, [
            el('div', { class: 'spot-card__copy' }, [
              el('span', { class: 'spot-card__sec' }, [el('span', { class: 'spot-card__sec-dot' }), sec ? sec.name : '']),
              el('h4', { class: 'spot-card__name', text: topSvc.title }),
            ]),
          ]),
          el('span', { class: 'spot-card__cta' }, ['ابدأ التعبئة ', icon('arrow_back', 18)]),
        ]),
      ]);
      view.appendChild(spot);
    }

    const draftKeys = Object.keys(App.drafts || {}).filter((c) => App.data.services[c]).slice(0, 5);
    const upnext = el('div', { class: 'section upnext' }, [
      el('div', { class: 'section__head' }, [
        el('h3', { class: 'section__title' }, [icon('task_alt', 20), ' ما يلزمك إنجازه']),
        el('a', { class: 'rs-btn rs-btn--ghost rs-btn--sm', href: '#/cases' }, [
          el('span', { class: 'rs-btn__ico' }, [icon('arrow_back', 16)]),
          'كل الحالات',
        ]),
      ]),
    ]);
    const tasksHost = el('div');
    if (!draftKeys.length) {
      tasksHost.appendChild(el('p', { class: 'muted', style: { padding: '12px 4px' }, text: 'لا توجد مسوّدات مفتوحة — ابدأ خدمة جديدة من دليل الخدمات.' }));
    } else {
      draftKeys.forEach((code) => {
        const svc = App.data.services[code];
        const d = App.drafts[code] || {};
        const who = (d.subscriberName && String(d.subscriberName).trim()) || 'مسوّدة بدون اسم';
        tasksHost.appendChild(el('a', {
          class: 'taskrow',
          href: '#/service/' + code,
          style: { '--task-color': SECTION_COLORS[svc.section] },
        }, [
          el('span', { class: 'taskrow__ico' }, [icon('description', 22)]),
          el('div', { class: 'taskrow__main' }, [
            el('div', { class: 'taskrow__t', text: who }),
            el('div', { class: 'taskrow__s', text: (d.__caseRef || code) + ' · ' + svc.title }),
          ]),
          el('span', { class: 'sladot', text: 'مسوّدة' }),
          el('span', { class: 'taskrow__cta' }, ['افتح ', icon('arrow_back', 14)]),
        ]));
      });
    }
    upnext.appendChild(tasksHost);
    view.appendChild(upnext);

    appNode.innerHTML = '';
    appNode.appendChild(view);
  };

  /* ---------- SERVICES HUB ---------- */
  P.renderRegistry = function (appNode, App, opts) {
    opts = opts || {};
    const meta = App.data.meta;
    const all = Object.entries(App.data.services).map(([code, s]) => Object.assign({ code }, s));
    const params = parseHashParams(location.hash);
    let q = params.q || '';
    let sec = params.sec || opts.sec || 'all';
    let sort = 'code';

    const view = el('div', { class: 'app-page fade-in' });
    view.appendChild(el('div', { class: 'row-between' }, [
      el('div', {}, [
        crumbs([{ label: 'الرئيسية', href: '#/' }, { label: 'الخدمات' }]),
        el('h1', { class: 'pageheader__title', style: { marginTop: '8px' }, text: 'دليل الخدمات الـ ' + all.length }),
        el('p', { class: 'pageheader__sub', text:
          'جميع الخدمات المقدّمة للمشتركين من خلال مركز خدمات المشتركين — اختر خدمة لبدء التعبئة أو لمراجعة الشرح والأجور.',
        }),
      ]),
    ]));

    const searchInp = el('input', {
      class: 'rs-search__input',
      type: 'search',
      value: q,
      placeholder: 'ابحث باسم الخدمة، رقمها (مثل CS0001)، أو القسم…',
      'aria-label': 'بحث في الخدمات',
    });
    const sortSel = el('select', {
      style: {
        padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)',
        background: 'var(--surface)', fontFamily: 'var(--font-cmd)', fontWeight: '600',
        color: 'var(--text)', fontSize: '0.88rem', cursor: 'pointer',
      },
    }, [
      el('option', { value: 'code', text: 'حسب الرمز' }),
      el('option', { value: 'sla', text: 'الأسرع تنفيذاً' }),
      el('option', { value: 'title', text: 'حسب الاسم' }),
    ]);

    view.appendChild(el('div', { class: 'searchhero' }, [
      el('div', { class: 'rs-search', style: { flex: 1 } }, [
        el('span', { class: 'rs-search__ico' }, [icon('search')]),
        searchInp,
      ]),
      el('div', { class: 'cluster' }, [
        el('span', { class: 'muted', style: { fontSize: '0.82rem' }, text: 'ترتيب:' }),
        sortSel,
      ]),
    ]));

    const catbar = el('div', { class: 'catbar' });
    const mkCat = (key, label, n, color) => {
      const d = el('button', {
        type: 'button',
        class: 'cattab' + (sec === key ? ' is-active' : ''),
        style: { '--cat-color': color || 'var(--brand-navy)' },
        onclick: () => { sec = key; renderGrid(); syncCats(); },
      }, [
        icon(key === 'all' ? 'apps' : (SECTION_ICONS[key] || 'folder'), 18),
        ' ' + label + ' ',
        el('span', { class: 'cattab__count', text: String(n) }),
      ]);
      d.dataset.sec = key;
      return d;
    };
    catbar.appendChild(mkCat('all', 'الكل', all.length));
    Object.values(meta.sections).forEach((s) => {
      catbar.appendChild(mkCat(s.code, s.name, all.filter((x) => x.section === s.code).length, SECTION_COLORS[s.code]));
    });
    view.appendChild(catbar);

    const gridHost = el('div');
    view.appendChild(gridHost);

    function syncCats() {
      catbar.querySelectorAll('.cattab').forEach((c) => c.classList.toggle('is-active', c.dataset.sec === sec));
    }

    function renderGrid() {
      gridHost.innerHTML = '';
      let filtered = all.slice();
      if (sec !== 'all') filtered = filtered.filter((s) => s.section === sec);
      const term = (q || '').trim().toLowerCase();
      if (term) {
        filtered = filtered.filter((s) =>
          (s.title || '').toLowerCase().includes(term) ||
          (s.code || '').toLowerCase().includes(term) ||
          (meta.sections[s.section] && meta.sections[s.section].name.includes(term))
        );
      }
      if (sort === 'sla') filtered.sort((a, b) => (a.sla || (a.guide && a.guide.sla) || 99) - (b.sla || (b.guide && b.guide.sla) || 99));
      else if (sort === 'title') filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ar'));
      else filtered.sort((a, b) => a.code.localeCompare(b.code));

      if (!filtered.length) {
        gridHost.appendChild(el('div', { class: 'section', style: { textAlign: 'center', padding: '50px' } }, [
          icon('search_off', 48),
          el('p', { class: 'muted', style: { marginTop: '12px' }, text: 'لا توجد خدمات مطابقة لبحثك.' }),
        ]));
        return;
      }

      const grid = el('div', { class: 'svc-grid' });
      filtered.forEach((svc) => {
        const color = SECTION_COLORS[svc.section] || '#1d4ed8';
        const draft = (App.drafts && App.drafts[svc.code]) || {};
        let priceMeta = 'حسب الصنف';
        if (typeof global.resolveServicePrice === 'function') {
          const pr = global.resolveServicePrice(svc, draft);
          if (pr && pr.value && pr.value !== '—') priceMeta = pr.value;
        }
        const slaDays = svc.sla || (svc.guide && svc.guide.sla) || 3;
        grid.appendChild(el('a', {
          class: 'svc',
          href: '#/service/' + svc.code,
          style: { '--svc-color': color },
        }, [
          el('div', { class: 'svc__row1' }, [
            el('span', { class: 'svc__code', text: svc.code }),
            icon('description', 22),
          ]),
          el('div', { class: 'svc__title', text: svc.title }),
          el('div', { class: 'svc__meta' }, [
            el('span', {}, [icon('schedule', 14), ' ' + slaDays + ' أيام']),
            el('span', {}, [icon('payments', 14), ' ' + priceMeta]),
            el('span', { class: 'svc__cta' }, ['ابدأ ', icon('arrow_back', 16)]),
          ]),
        ]));
      });
      gridHost.appendChild(grid);
    }

    searchInp.addEventListener('input', () => { q = searchInp.value; renderGrid(); });
    sortSel.addEventListener('change', () => { sort = sortSel.value; renderGrid(); });
    renderGrid();

    appNode.innerHTML = '';
    appNode.appendChild(view);
    setTimeout(() => { try { searchInp.focus({ preventScroll: true }); } catch (e) {} }, 0);
  };

  /* ---------- SERVICE SHELL ---------- */
  P.renderServiceShell = function (appNode, App, code, tab) {
    const svc = App.data.services[code];
    if (!svc) { P.renderHome(appNode, App); return; }
    const meta = App.data.meta;
    const sec = meta.sections[svc.section];
    const draft = (App.drafts && App.drafts[code]) || {};
    const color = SECTION_COLORS[svc.section] || '#1d4ed8';
    const view = el('div', { class: 'app-page fade-in' });

    view.appendChild(crumbs([
      { label: 'الرئيسية', href: '#/' },
      { label: 'الخدمات', href: '#/services' },
      { label: code + ' — ' + svc.title },
    ]));

    const lede = (svc.guide && svc.guide.definition) ? svc.guide.definition :
      'تقدّم هذه الخدمة للمشتركين عبر مركز خدمات المشتركين ضمن إجراءات قسم ' + (sec ? sec.name : '') + '.';

    const hero = el('section', { class: 'hero', style: { padding: '24px' } }, [
      el('div', { class: 'hero__row' }, [
        el('div', {}, [
          el('span', { class: 'hero__eyebrow' }, [
            icon(SECTION_ICONS[svc.section] || 'apps', 16),
            ' ' + (sec ? sec.name : '') + ' · ' + code,
          ]),
          el('h1', { class: 'hero__title', text: svc.title }),
          el('p', { class: 'hero__sub', text: lede }),
          el('div', { class: 'cluster', style: { marginTop: '16px' } }, [
            el('a', { class: 'rs-btn rs-btn--primary rs-btn--lg', href: '#/service/' + code + '/form' }, [
              el('span', { class: 'rs-btn__ico' }, [icon('play_arrow', 18)]),
              'ابدأ تعبئة النموذج',
            ]),
            el('a', { class: 'rs-btn rs-btn--lg', href: '#/service/' + code + '/guide' }, [
              el('span', { class: 'rs-btn__ico' }, [icon('info', 18)]),
              'دليل الخدمة الكامل',
            ]),
          ]),
        ]),
        el('div', { style: { display: 'grid', gap: '10px', minWidth: '260px' } }, [
          el('div', { style: { padding: '14px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.16)' } }, [
            el('div', { style: { fontSize: '0.74rem', opacity: 0.7, marginBottom: '4px' }, text: 'المدة المعتادة' }),
            el('div', { style: { fontWeight: 800, fontSize: '1.25rem' }, text: String(svc.sla || (svc.guide && svc.guide.sla) || 3) + ' أيام عمل' }),
          ]),
          (function () {
            let priceVal = 'تحسب آلياً';
            if (typeof global.resolveServicePrice === 'function' && svc.pricing) {
              const pr = global.resolveServicePrice(svc, draft);
              if (pr && pr.value && pr.value !== '—') priceVal = pr.value;
            }
            return el('div', { style: { padding: '14px 16px', background: 'rgba(244,196,48,0.18)', borderRadius: '14px', border: '1px solid rgba(244,196,48,0.4)' } }, [
              el('div', { style: { fontSize: '0.74rem', opacity: 0.8, marginBottom: '4px' }, text: 'الأجور التقديرية' }),
              el('div', { style: { fontWeight: 800, fontSize: '1.25rem' }, text: priceVal }),
            ]);
          })(),
        ]),
      ]),
    ]);
    view.appendChild(hero);

    const canPreview = !!(global.canPreviewWord && global.canPreviewWord(code) && svc.form && svc.form.blocks);
    if (tab === 'preview' && !canPreview) tab = 'form';
    const tabDefs = [
      { id: 'form', label: 'تعبئة النموذج' },
      canPreview ? { id: 'preview', label: 'المعاينة المطابقة', badge: 'كالأصل' } : null,
      { id: 'guide', label: 'شرح الخدمة' },
    ].filter(Boolean);

    const subtabs = el('nav', { class: 'rs-tabs', role: 'tablist', 'aria-label': 'أقسام الخدمة', style: { marginTop: '8px' } });
    tabDefs.forEach((t) => {
      subtabs.appendChild(el('a', {
        class: 'rs-tabs__item' + (tab === t.id ? ' is-active' : ''),
        href: '#/service/' + code + '/' + t.id,
        role: 'tab',
        'aria-selected': tab === t.id ? 'true' : 'false',
      }, [
        el('span', { text: t.label }),
        t.badge ? el('span', { class: 'rs-tabs__badge', text: t.badge }) : null,
      ]));
    });
    view.appendChild(subtabs);

    const body = el('div', { class: 'platform-svc-body', style: { marginTop: '16px' } });
    if (tab === 'guide') {
      if (typeof global.renderGuide === 'function') body.appendChild(global.renderGuide(svc));
      else body.appendChild(el('div', { class: 'section', text: 'الدليل غير متاح.' }));
    } else if (tab === 'preview') {
      if (typeof global.renderPreview === 'function') body.appendChild(global.renderPreview(code, svc));
      else body.appendChild(el('div', { class: 'section', text: 'المعاينة غير متاحة.' }));
    } else {
      if (typeof global.renderWorkspace === 'function') body.appendChild(global.renderWorkspace(code, svc));
      else body.appendChild(el('div', { class: 'section', text: 'محرّك النموذج غير متاح.' }));
    }
    view.appendChild(body);

    appNode.innerHTML = '';
    appNode.appendChild(view);
  };

  /* ---------- FEES ---------- */
  P.renderFees = function (appNode, App) {
    const view = el('div', { class: 'app-page fade-in' });
    view.appendChild(crumbs([{ label: 'الرئيسية', href: '#/' }, { label: 'الأجور والأسعار' }]));
    view.appendChild(el('div', { class: 'row-between' }, [
      el('div', {}, [
        el('h1', { class: 'pageheader__title', text: 'جدول الأجور الرسمي 2026' }),
        el('p', { class: 'pageheader__sub', text: 'مرجع كامل لجميع أجور خدمات شركة توزيع كهرباء بغداد / الرصافة.' }),
      ]),
      el('button', { type: 'button', class: 'rs-btn rs-btn--ghost no-print', onclick: () => window.print() }, [
        el('span', { class: 'rs-btn__ico' }, [icon('print', 18)]),
        'طباعة الجدول',
      ]),
    ]));

    const host = el('div');
    view.appendChild(host);
    appNode.innerHTML = '';
    appNode.appendChild(view);

    fetch('data/service_prices.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then((pricing) => {
        const catalog = pricing.catalog || [];
        const cats = {};
        catalog.forEach((it) => {
          const c = it.category || 'عام';
          if (!cats[c]) cats[c] = [];
          cats[c].push(it);
        });
        const order = ['عام', 'منزلي', 'تجاري', 'صناعي', 'حكومي', 'زراعي', 'باقي الأصناف'];
        Object.keys(cats).sort((a, b) => {
          const ia = order.indexOf(a); const ib = order.indexOf(b);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        }).forEach((catName) => {
          const items = cats[catName];
          const section = el('div', { class: 'section' }, [
            el('div', { class: 'section__head' }, [
              el('h3', { class: 'section__title' }, [icon('request_quote', 20), ' ' + catName]),
              el('span', { class: 'muted', style: { fontSize: '0.82rem' }, text: items.length + ' بند' }),
            ]),
          ]);
          const grid = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' } });
          items.forEach((it) => {
            const a26 = (typeof it.amount2026 === 'number') ? fmtIQDInt(it.amount2026) : (it.amount2026 || '—');
            grid.appendChild(el('div', { style: {
              padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '10px',
              border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            } }, [
              el('span', { style: { fontSize: '0.88rem', fontWeight: 600 } }, [
                it.service || '—',
                it.notes ? el('small', { style: { display: 'block', color: 'var(--text-soft)', fontSize: '0.72rem', marginTop: '4px' }, text: it.notes }) : null,
              ]),
              el('span', { class: 'mono', style: { fontWeight: 800, color: 'var(--brand-navy)' }, text: a26 || '—' }),
            ]));
          });
          section.appendChild(grid);
          host.appendChild(section);
        });
      })
      .catch((err) => {
        host.appendChild(el('div', { class: 'section', style: { textAlign: 'center', padding: '32px' } }, [
          el('strong', { text: 'تعذّر تحميل لائحة الأجور' }),
          el('p', { class: 'muted', text: (err && err.message) || '' }),
        ]));
      });
  };

  /* ---------- GUIDE ---------- */
  P.renderGuide = function (appNode, App) {
    const meta = App.data.meta;
    const all = Object.entries(App.data.services).map(([c, s]) => Object.assign({ code: c }, s));
    const view = el('div', { class: 'app-page fade-in' });
    view.appendChild(crumbs([{ label: 'الرئيسية', href: '#/' }, { label: 'دليل الإجراءات' }]));
    view.appendChild(el('h1', { class: 'pageheader__title', text: 'دليل إجراءات الموظف' }));
    view.appendChild(el('p', { class: 'pageheader__sub', text:
      'شرح موحّد لكل خدمة: متى تقدّم، شروطها، الوثائق، الأجور — مع روابط مباشرة لفتح صفحات الخدمات.',
    }));

    const aa = meta.agentAssist || {};
    Object.values(meta.sections).forEach((sect) => {
      const aid = aa[sect.code] || {};
      const items = all.filter((s) => s.section === sect.code);
      const card = el('div', { class: 'section', style: { borderInlineStart: '6px solid ' + (SECTION_COLORS[sect.code] || 'var(--brand-navy)') } });
      card.appendChild(el('div', { class: 'section__head' }, [
        el('h3', { class: 'section__title' }, [secBadge(sect.code), ' ', sect.name]),
        el('span', { class: 'muted', text: items.length + ' خدمة' }),
      ]));
      if (aid.intro || sect.desc) card.appendChild(el('p', { class: 'muted', style: { lineHeight: 1.7 }, text: aid.intro || sect.desc }));
      if (aid.protocol && aid.protocol.length) {
        const ul = el('ul', { style: { margin: '12px 0', paddingInlineStart: '20px', lineHeight: 1.8 } });
        aid.protocol.forEach((p) => ul.appendChild(el('li', { text: p })));
        card.appendChild(ul);
      }
      const grid = el('div', { class: 'svc-grid', style: { marginTop: '12px' } });
      items.forEach((svc) => {
        grid.appendChild(el('a', {
          class: 'svc',
          href: '#/service/' + svc.code + '/guide',
          style: { '--svc-color': SECTION_COLORS[svc.section] },
        }, [
          el('div', { class: 'svc__row1' }, [el('span', { class: 'svc__code', text: svc.code }), icon('menu_book', 20)]),
          el('div', { class: 'svc__title', text: svc.title }),
          el('div', { class: 'svc__meta' }, [el('span', { class: 'svc__cta' }, ['قراءة الدليل ', icon('arrow_back', 16)])]),
        ]));
      });
      card.appendChild(grid);
      view.appendChild(card);
    });

    appNode.innerHTML = '';
    appNode.appendChild(view);
  };

  /* ---------- CASES ---------- */
  P.renderCases = function (appNode, App) {
    const drafts = App.drafts || {};
    const draftKeys = Object.keys(drafts).filter((c) => App.data.services[c]);
    const view = el('div', { class: 'app-page fade-in' });
    view.appendChild(crumbs([{ label: 'الرئيسية', href: '#/' }, { label: 'الحالات النشطة' }]));
    view.appendChild(el('div', { class: 'row-between' }, [
      el('div', {}, [
        el('h1', { class: 'pageheader__title', text: 'الحالات النشطة' }),
        el('p', { class: 'pageheader__sub', text: draftKeys.length + ' مسوّدة محفوظة محلياً — تابع التعبئة أو ابدأ خدمة جديدة.' }),
      ]),
      el('a', { class: 'rs-btn rs-btn--primary', href: '#/services' }, [
        el('span', { class: 'rs-btn__ico' }, [icon('add', 18)]),
        'خدمة جديدة',
      ]),
    ]));

    if (!draftKeys.length) {
      view.appendChild(el('div', { class: 'section', style: { textAlign: 'center', padding: '48px 24px' } }, [
        icon('inventory_2', 48),
        el('p', { class: 'muted', style: { marginTop: '12px' }, text: 'لا توجد إضبارات مفتوحة. ابدأ بفتح خدمة من دليل الخدمات.' }),
      ]));
    } else {
      draftKeys.forEach((code, i) => {
        const svc = App.data.services[code];
        const sec = App.data.meta.sections[svc.section];
        const d = drafts[code] || {};
        const who = (d.subscriberName && String(d.subscriberName).trim()) || '— لم يُكتب اسم المشترك —';
        view.appendChild(el('a', {
          class: 'taskrow',
          href: '#/service/' + code,
          style: { '--task-color': SECTION_COLORS[svc.section], marginBottom: '8px' },
        }, [
          el('span', { class: 'taskrow__ico' }, [icon('folder_open', 22)]),
          el('div', { class: 'taskrow__main' }, [
            el('div', { class: 'taskrow__t', text: who }),
            el('div', { class: 'taskrow__s', text: code + ' · ' + svc.title + ' · ' + (d.__caseRef || 'مسوّدة') }),
          ]),
          el('span', { class: 'sladot warn', text: 'مسوّدة' }),
          el('span', { class: 'taskrow__cta' }, ['متابعة ', icon('arrow_back', 14)]),
        ]));
      });
    }

    appNode.innerHTML = '';
    appNode.appendChild(view);
  };

  /* ---------- BOOT ---------- */
  P.boot = function (App) {
    window.addEventListener('hashchange', syncRail);
    syncRail();

    const sos = document.getElementById('platformSos');
    if (sos) sos.addEventListener('click', () => { location.hash = '#/service/CA0002/form'; });

    const cmdkBtn = document.getElementById('platformCmdK');
    if (cmdkBtn && global.CmdK) cmdkBtn.addEventListener('click', () => global.CmdK.open());

    const themeBtn = document.getElementById('platformTheme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const dark = document.body.classList.toggle('dark');
        themeBtn.querySelector('.material-symbols-outlined').textContent = dark ? 'light_mode' : 'dark_mode';
      });
    }

    const printBtn = document.getElementById('platformPrint');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const onForm = (location.hash || '').match(/#\/service\/[A-Z]{2}\d{4}\/form/);
        if (onForm && typeof global.printUnified === 'function') {
          const m = location.hash.match(/#\/service\/([A-Z]{2}\d{4})/);
          if (m && App.data.services[m[1]]) {
            global.printUnified(m[1], App.data.services[m[1]]);
            return;
          }
        }
        window.print();
      });
    }
  };

  P.parseHashParams = parseHashParams;
  P.syncRail = syncRail;

  global.Platform = P;
})(window);
