/* Info drawer — دليل الخدمة المنزلق */
'use strict';

(function (global) {
  const C = global.PlatformCore;
  if (!C) return;

  function guideFor(svc, sec) {
    const g = svc.guide || {};
    return {
      purpose: g.definition || g.purpose || ('تقدّم خدمة «' + svc.title + '» عبر مركز خدمات المشتركين — قسم ' + (sec ? sec.name : '') + '.'),
      when: (g.when || g.conditions || g.eligibility || []).length
        ? (g.when || g.conditions || g.eligibility)
        : ['استكمال الوثائق المطلوبة من المشترك.', 'دفع الرسوم في الصندوق قبل تحويل الطلب.', 'عدم وجود حالات معلقة على نفس الاشتراك.'],
      docs: (g.documents || g.docs || g.requiredDocs || []).length
        ? (g.documents || g.docs || g.requiredDocs)
        : ['هوية الأحوال المدنية وبطاقة السكن.', 'مستند ملكية أو وكالة قانونية عند اللزوم.'],
      fees: g.fees || g.pricingNote || (typeof global.resolveServicePrice === 'function'
        ? (global.resolveServicePrice(svc, {}) || {}).value
        : null) || 'تُحسب داخل النموذج حسب الصنف ونوع الربط.',
      legal: g.legal || g.legalBasis || 'تخضع لأنظمة شركة توزيع كهرباء بغداد / قطاع الرصافة.',
      pitfalls: (g.pitfalls || g.commonErrors || g.warnings || []).length
        ? (g.pitfalls || g.commonErrors || g.warnings)
        : ['تأكد من اكتمال البيانات قبل التحويل.', 'دقّق التوقيع وختم المركز قبل تسليم النسخة للمشترك.'],
    };
  }

  function open(svc, opts) {
    opts = opts || {};
    const sec = (global.App && global.App.data.meta.sections[svc.section]) || { name: svc.section };
    const guide = guideFor(svc, sec);
    const existing = document.getElementById('platformInfoDrawer');
    if (existing) existing.remove();

    const root = C.el('div', { id: 'platformInfoDrawer' });
    const scrim = C.el('div', { class: 'scrim', onclick: close });
    const drawer = C.el('aside', { class: 'drawer', role: 'dialog', 'aria-label': 'دليل الخدمة' });

    drawer.appendChild(C.el('div', { class: 'drawer__head' }, [
      C.el('button', { class: 'drawer__close', type: 'button', 'aria-label': 'إغلاق', onclick: close }, [C.icon('close', 20)]),
      C.el('div', { class: 'drawer__eyebrow', text: svc.formNumber + ' · ' + sec.name }),
      C.el('h2', { class: 'drawer__title', text: svc.title }),
      C.el('div', { style: { marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' } }, [
        C.el('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: '0.78rem', fontWeight: '700' } }, [
          C.icon('schedule', 16), ' مدّة معتادة ' + (svc.sla || (svc.guide && svc.guide.sla) || 3) + ' أيام',
        ]),
      ]),
    ]));

    const body = C.el('div', { class: 'drawer__body' });
    function drawerSec(title, ico, content) {
      return C.el('section', { class: 'drawer__sec' }, [
        C.el('h4', {}, [C.icon(ico, 20), ' ' + title]),
        content,
      ]);
    }
    body.appendChild(drawerSec('الغرض من الخدمة', 'info', C.el('p', { text: guide.purpose })));
    body.appendChild(drawerSec('متى يقدّمها الموظف؟', 'check_circle', C.el('ul', {}, guide.when.map((w) => C.el('li', { text: w })))));
    body.appendChild(drawerSec('الوثائق المطلوبة', 'folder', C.el('ul', {}, guide.docs.map((d) => C.el('li', { text: typeof d === 'string' ? d : (d.name || d.title || String(d)) })))));
    body.appendChild(drawerSec('الأجور', 'payments', C.el('p', { text: String(guide.fees) })));
    body.appendChild(C.el('section', {
      class: 'drawer__sec',
      style: { padding: '14px', background: 'color-mix(in srgb, var(--warn) 7%, var(--surface))', border: '1px solid color-mix(in srgb, var(--warn) 30%, var(--border))', borderRadius: '12px' },
    }, [
      C.el('h4', { style: { color: 'var(--warn)' } }, [C.icon('warning', 20), ' أخطاء شائعة']),
      C.el('ul', {}, guide.pitfalls.map((p) => C.el('li', { text: p }))),
    ]));
    body.appendChild(drawerSec('الأساس القانوني', 'gavel', C.el('p', { text: guide.legal })));
    drawer.appendChild(body);

    drawer.appendChild(C.el('div', { class: 'drawer__foot' }, [
      C.btn('إغلاق', { variant: 'ghost', onclick: close }),
      opts.onStart
        ? C.btn('ابدأ التعبئة', { variant: 'primary', icon: 'play_arrow', href: '#/service/' + (svc.code || svc.formNumber) + '/form', onclick: close })
        : null,
    ]));

    root.appendChild(scrim);
    root.appendChild(drawer);
    document.body.appendChild(root);
    document.body.classList.add('drawer-open');
  }

  function close() {
    const n = document.getElementById('platformInfoDrawer');
    if (n) n.remove();
    document.body.classList.remove('drawer-open');
  }

  global.PlatformInfo = { open, close, guideFor };
})(window);
