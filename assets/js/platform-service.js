/* Service detail landing page (from archive design) */
'use strict';

(function (global) {
  const C = global.PlatformCore;
  if (!C) return;

  function feeRows(svc, draft) {
    const rows = [];
    if (typeof global.resolveServicePrice === 'function') {
      const pr = global.resolveServicePrice(svc, draft);
      if (pr && pr.value && pr.value !== '—') rows.push({ name: pr.label || 'الأجور التقديرية', amount: pr.value, note: pr.hint });
    }
    if (svc.pricing && svc.pricing.parts) {
      svc.pricing.parts.forEach((part) => {
        if (typeof part.amount === 'number') rows.push({ name: part.service, amount: C.fmtIQDInt(part.amount) });
      });
    }
    return rows;
  }

  function guideLists(svc) {
    const g = svc.guide || {};
    return {
      when: (g.when || g.conditions || g.eligibility || [
        'استكمال الوثائق المطلوبة من المشترك.',
        'دفع الرسوم في الصندوق قبل تحويل الطلب.',
        'عدم وجود حالات معلقة على نفس الاشتراك.',
      ]),
      docs: (g.documents || g.docs || g.requiredDocs || [
        'هوية الأحوال المدنية وبطاقة السكن.',
        'مستند ملكية أو وكالة قانونية عند اللزوم.',
      ]),
      pitfalls: (g.pitfalls || g.commonErrors || g.warnings || [
        'تأكد من اكتمال البيانات قبل التحويل.',
        'دقّق التوقيع وختم المركز قبل التسليم.',
      ]),
      legal: g.legal || g.legalBasis || 'تخضع لأنظمة شركة توزيع كهرباء بغداد / قطاع الرصافة.',
      purpose: g.definition || g.purpose || ('تقدّم خدمة «' + svc.title + '» عبر مركز خدمات المشتركين.'),
    };
  }

  function renderDetail(appNode, App, code) {
    const svc = App.data.services[code];
    if (!svc) return;
    const sec = App.data.meta.sections[svc.section];
    const draft = App.drafts[code] || {};
    const guide = guideLists(svc);
    const fees = feeRows(svc, draft);
    const color = C.SECTION_COLORS[svc.section] || '#1d4ed8';
    const sla = svc.sla || (svc.guide && svc.guide.sla) || 3;

    const view = C.el('div', { class: 'app-page fade-in' });
    view.appendChild(C.crumbs([
      { label: 'الرئيسية', href: '#/' },
      { label: 'الخدمات', href: '#/services' },
      { label: svc.formNumber + ' — ' + svc.title },
    ]));

    view.appendChild(C.el('section', { class: 'hero', style: { padding: '24px' } }, [
      C.el('div', { class: 'hero__row' }, [
        C.el('div', {}, [
          C.el('span', { class: 'hero__eyebrow' }, [C.icon(C.SECTION_ICONS[svc.section] || 'apps', 16), ' ' + sec.name + ' · ' + svc.formNumber]),
          C.el('h1', { class: 'hero__title', text: svc.title }),
          C.el('p', { class: 'hero__sub', text: guide.purpose }),
          C.el('div', { class: 'cluster', style: { marginTop: '16px' } }, [
            C.btn('ابدأ تعبئة النموذج', { variant: 'primary', size: 'lg', icon: 'play_arrow', href: '#/service/' + code + '/form' }),
            C.btn('دليل الخدمة الكامل', { size: 'lg', icon: 'info', onclick: () => global.PlatformInfo && global.PlatformInfo.open(svc, { onStart: true }) }),
            (global.canPreviewWord && global.canPreviewWord(code))
              ? C.btn('معاينة للطباعة', { size: 'lg', variant: 'ghost', icon: 'print', href: '#/service/' + code + '/preview' })
              : null,
          ]),
        ]),
        C.el('div', { style: { display: 'grid', gap: '10px', minWidth: '260px' } }, [
          C.el('div', { style: { padding: '14px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.16)' } }, [
            C.el('div', { style: { fontSize: '0.74rem', opacity: 0.7, marginBottom: '4px' }, text: 'المدة المعتادة' }),
            C.el('div', { style: { fontWeight: 800, fontSize: '1.25rem' }, text: sla + ' أيام عمل' }),
          ]),
          C.el('div', { style: { padding: '14px 16px', background: 'rgba(244,196,48,0.18)', borderRadius: '14px', border: '1px solid rgba(244,196,48,0.4)' } }, [
            C.el('div', { style: { fontSize: '0.74rem', opacity: 0.8, marginBottom: '4px' }, text: 'الأجور التقديرية' }),
            C.el('div', { style: { fontWeight: 800, fontSize: '1.25rem' }, text: fees.length ? fees[0].amount : 'تحسب آلياً' }),
          ]),
        ]),
      ]),
    ]));

    const grid = C.el('div', { class: 'grid-2' });
    const left = C.el('div', { class: 'stack' });

    left.appendChild(C.el('div', { class: 'section' }, [
      C.el('div', { class: 'section__head' }, [
        C.el('h3', { class: 'section__title' }, [C.icon('check_circle', 20), ' متى تقدّم هذه الخدمة؟']),
        C.tag('شروط أساسية', 'info'),
      ]),
      C.el('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' } },
        guide.when.map((w) => C.el('li', {
          style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)' },
        }, [
          C.el('span', { style: { width: 28, height: 28, borderRadius: 8, background: 'color-mix(in srgb, var(--ok) 18%, transparent)', color: 'var(--ok)', display: 'grid', placeItems: 'center' } }, [C.icon('done', 18)]),
          C.el('span', { style: { fontSize: '0.92rem', lineHeight: 1.7 }, text: w }),
        ])),
      ),
    ]));

    left.appendChild(C.el('div', { class: 'section' }, [
      C.el('div', { class: 'section__head' }, [
        C.el('h3', { class: 'section__title' }, [C.icon('folder', 20), ' الوثائق المطلوبة']),
      ]),
      C.el('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' } },
        guide.docs.map((d, i) => C.el('li', {
          style: { display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '12px 14px', background: 'var(--surface)', borderRadius: '10px', border: '1px dashed var(--border-strong)' },
        }, [
          C.el('span', { style: { width: 26, height: 26, borderRadius: 7, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.75rem' }, text: String(i + 1) }),
          C.el('span', { style: { fontSize: '0.9rem' }, text: typeof d === 'string' ? d : (d.name || d.title || String(d)) }),
          C.icon('description', 18),
        ])),
      ),
    ]));

    left.appendChild(C.el('div', {
      class: 'section',
      style: { background: 'color-mix(in srgb, var(--warn) 6%, var(--surface))', borderColor: 'color-mix(in srgb, var(--warn) 28%, var(--border))' },
    }, [
      C.el('div', { class: 'section__head' }, [
        C.el('h3', { class: 'section__title' }, [C.icon('warning', 20), ' أخطاء شائعة يجب الانتباه لها']),
      ]),
      C.el('ul', { style: { margin: 0, paddingInlineStart: '20px', lineHeight: 1.85, fontSize: '0.92rem' } },
        guide.pitfalls.map((p) => C.el('li', { text: p })),
      ),
    ]));

    const right = C.el('div', { class: 'stack' });
    const feePanel = C.el('div', { class: 'feepanel' }, [
      C.el('div', { class: 'feepanel__head' }, [C.icon('payments', 20), C.el('span', { class: 'feepanel__title', text: 'جدول الأجور التقديرية' })]),
    ]);
    if (fees.length) {
      fees.forEach((r) => feePanel.appendChild(C.el('div', { class: 'feerow' }, [
        C.el('span', { class: 'feerow__name', text: r.name }),
        C.el('span', { class: 'feerow__amt', text: r.amount || '—' }),
      ])));
    } else {
      feePanel.appendChild(C.el('p', { class: 'muted', style: { margin: 0, fontSize: '0.88rem', lineHeight: 1.7 }, text: 'لا توجد أجور ثابتة — تُحسب داخل النموذج.' }));
    }
    right.appendChild(feePanel);

    right.appendChild(C.el('div', { class: 'section' }, [
      C.el('div', { class: 'section__head' }, [
        C.el('h3', { class: 'section__title' }, [C.icon('route', 20), ' مسار الطلب']),
      ]),
      C.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, [
        ['edit_document', 'استلام وتعبئة النموذج', 'موظف خدمات المشتركين', 'فوري'],
        ['currency_exchange', 'دفع رسوم طلب الخدمة', 'الصندوق', '15 دقيقة'],
        ['location_searching', 'كشف ميداني للموقع', 'الدائرة الفنية', '٣ أيام'],
        ['price_change', 'تقدير الأجور والمطالبة', 'الدائرة المالية', 'يوم'],
        ['payments', 'دفع المطالبة وإصدار الموافقة', 'الصندوق + المدير', 'يوم'],
        ['electrical_services', 'تنفيذ التوصيل وإصدار الاشتراك', 'الدائرة الفنية', 'يومان'],
      ].map((row, i) => C.el('div', {
        style: { display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: '12px', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: i === 0 ? 'color-mix(in srgb, var(--brand-navy) 6%, transparent)' : 'var(--surface-2)', border: '1px solid var(--border)' },
      }, [
        C.el('span', { style: { width: 36, height: 36, borderRadius: 9, background: i === 0 ? 'var(--brand-navy)' : 'var(--surface)', color: i === 0 ? '#fff' : 'var(--brand-navy)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center' } }, [C.icon(row[0], 20)]),
        C.el('div', {}, [
          C.el('div', { style: { fontWeight: 700, fontSize: '0.92rem' }, text: row[1] }),
          C.el('div', { style: { fontSize: '0.76rem', color: 'var(--text-soft)' }, text: row[2] }),
        ]),
        C.el('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '0.74rem', padding: '4px 9px', borderRadius: '999px', background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: 700 }, text: row[3] }),
      ]))),
    ]));

    right.appendChild(C.el('div', { class: 'section' }, [
      C.el('div', { class: 'section__head' }, [C.el('h3', { class: 'section__title' }, [C.icon('gavel', 20), ' الأساس القانوني'])]),
      C.el('p', { style: { margin: 0, lineHeight: 1.8, fontSize: '0.92rem', color: 'var(--text-soft)' }, text: guide.legal }),
    ]));

    grid.appendChild(left);
    grid.appendChild(right);
    view.appendChild(grid);

    appNode.innerHTML = '';
    appNode.appendChild(view);
  }

  function renderGuideTab(appNode, App, code) {
    const svc = App.data.services[code];
    if (!svc || typeof global.renderGuide !== 'function') return;
    const view = C.el('div', { class: 'app-page fade-in' });
    view.appendChild(C.crumbs([
      { label: 'الرئيسية', href: '#/' },
      { label: 'الخدمات', href: '#/services' },
      { label: svc.title, href: '#/service/' + code },
      { label: 'شرح الخدمة' },
    ]));
    view.appendChild(global.renderGuide(svc));
    appNode.innerHTML = '';
    appNode.appendChild(view);
  }

  function renderPreviewTab(appNode, App, code) {
    const svc = App.data.services[code];
    if (!svc || typeof global.renderPreview !== 'function') return;
    const view = C.el('div', { class: 'app-page fade-in' });
    view.appendChild(C.crumbs([
      { label: 'الرئيسية', href: '#/' },
      { label: 'الخدمات', href: '#/services' },
      { label: svc.title, href: '#/service/' + code },
      { label: 'معاينة للطباعة' },
    ]));
    view.appendChild(global.renderPreview(code, svc));
    appNode.innerHTML = '';
    appNode.appendChild(view);
  }

  global.PlatformService = { renderDetail, renderGuideTab, renderPreviewTab };
})(window);
