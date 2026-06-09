/* Form page — formshell, preflight, stepnav, fees (from archive design) */
'use strict';

(function (global) {
  const C = global.PlatformCore;
  if (!C) return;

  const REF_STEPS = {
    centerSubscriber: ['subscriber', 'بيانات المشترك', 'person'],
    address: ['address', 'عنوان العقار', 'location_on'],
    docsMatrix: ['docs', 'الوثائق المرفقة', 'folder'],
    routingMatrix: ['route', 'مسار الإحالة', 'route'],
    routing: ['route', 'مسار الإحالة', 'route'],
    signatures: ['sign', 'التوقيع والإقرار', 'draw'],
    feesTable: ['fees', 'المطالبة المالية', 'payments'],
    feeReceipt: ['fees', 'المطالبة المالية', 'payments'],
  };

  const TYPE_ICONS = {
    fieldGrid: 'grid_view',
    matrix: 'table',
    checklist: 'checklist',
    textarea: 'notes',
    note: 'info',
  };

  function stepsFromService(svc) {
    const blocks = (svc.form && svc.form.blocks) || [];
    const steps = [];
    const seen = new Set();
    blocks.forEach((raw, i) => {
      let key, label, ico;
      if (raw.$ref && REF_STEPS[raw.$ref]) {
        [key, label, ico] = REF_STEPS[raw.$ref];
      } else if (raw.title) {
        key = 'sec-' + i;
        label = raw.title;
        ico = TYPE_ICONS[raw.type] || 'article';
      } else if (raw.type) {
        key = 'sec-' + i;
        label = raw.type;
        ico = TYPE_ICONS[raw.type] || 'article';
      } else return;
      if (seen.has(key)) return;
      seen.add(key);
      steps.push({ key, label, ico, anchor: 'sec-' + key });
    });
    if (!steps.length) {
      steps.push({ key: 'form', label: 'النموذج', ico: 'description', anchor: 'formSheet' });
    }
    return steps;
  }

  function preflightKey(code) { return 'platform_pf_' + code; }
  function needsPreflight(code) {
    try { return !localStorage.getItem(preflightKey(code)); } catch (e) { return true; }
  }
  function markPreflight(code) {
    try { localStorage.setItem(preflightKey(code), '1'); } catch (e) {}
  }

  function renderPreflight(svc, code, onConfirm, onCancel) {
    const sec = global.App.data.meta.sections[svc.section];
    const ack = [false, false, false];
    const root = C.el('div', { class: 'platform-preflight' });
    root.appendChild(C.el('div', { class: 'scrim' }));

    const panel = C.el('div', {
      style: {
        position: 'fixed', inset: '0', zIndex: '102', display: 'grid', placeItems: 'center', padding: '24px', pointerEvents: 'none',
      },
    });
    const card = C.el('div', {
      style: {
        background: 'var(--surface)', borderRadius: '20px', boxShadow: '0 30px 80px rgba(11,37,69,0.35)',
        width: 'min(620px, 100%)', maxHeight: '90vh', overflow: 'auto', pointerEvents: 'auto', border: '1px solid var(--border)',
      },
    });

    card.appendChild(C.el('div', { style: { background: 'var(--brand-grad)', padding: '22px 26px', color: '#fff' } }, [
      C.el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } }, [
        C.icon('task_alt', 26),
        C.el('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '0.72rem', opacity: '0.8' }, text: svc.formNumber + ' · ' + sec.name }),
      ]),
      C.el('h2', { style: { margin: '0', fontSize: '1.3rem', fontWeight: '800' }, text: 'قبل البدء بتعبئة النموذج' }),
      C.el('p', { style: { margin: '6px 0 0', fontSize: '0.92rem', opacity: '0.88' }, html: 'يرجى التأكد من توفر الشروط الأساسية لخدمة <strong>' + svc.title + '</strong>.' }),
    ]));

    const body = C.el('div', { style: { padding: '22px 26px' } });
    const items = [
      { t: 'استلمت من المشترك جميع الوثائق الأصلية والمصدّقة', s: 'الهوية، بطاقة السكن، كتاب التأييد، الطابو/الإجازة' },
      { t: 'تم التحقق من عدم وجود طلب قائم أو دين سابق على العقار', s: 'راجع نظام الجباية + قاعدة بيانات الاشتراكات' },
      { t: 'سدد المشترك رسوم طلب الخدمة في الصندوق', s: 'يجب إدراج رقم وصل القبض ضمن النموذج' },
    ];
    const confirmBtn = C.btn('متابعة وبدء التعبئة', { variant: 'primary', icon: 'arrow_back', disabled: true, onclick: () => { markPreflight(code); onConfirm(); } });

    items.forEach((it, i) => {
      const row = C.el('label', {
        style: {
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start',
          padding: '12px 14px', marginBottom: '8px', background: 'var(--surface-2)',
          border: '1.5px solid var(--border)', borderRadius: '12px', cursor: 'pointer',
        },
      });
      const cb = C.el('input', { type: 'checkbox', style: { width: '22px', height: '22px', marginTop: '2px' } });
      cb.addEventListener('change', () => {
        ack[i] = cb.checked;
        row.style.background = ack[i] ? 'color-mix(in srgb, var(--ok) 8%, transparent)' : 'var(--surface-2)';
        row.style.borderColor = ack[i] ? 'color-mix(in srgb, var(--ok) 40%, var(--border))' : 'var(--border)';
        confirmBtn.disabled = !ack.every(Boolean);
      });
      row.appendChild(cb);
      row.appendChild(C.el('div', {}, [
        C.el('div', { style: { fontWeight: '700', fontSize: '0.95rem' }, text: it.t }),
        C.el('div', { style: { fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: '3px' }, text: it.s }),
      ]));
      body.appendChild(row);
    });
    card.appendChild(body);
    card.appendChild(C.el('div', { style: { padding: '16px 26px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '8px' } }, [
      C.btn('إلغاء', { variant: 'ghost', onclick: onCancel }),
      confirmBtn,
    ]));
    panel.appendChild(card);
    root.appendChild(panel);
    return root;
  }

  function feeRows(svc, draft) {
    const rows = [];
    if (typeof global.resolveServicePrice === 'function') {
      const pr = global.resolveServicePrice(svc, draft);
      if (pr && pr.value && pr.value !== '—') rows.push({ name: pr.label || 'رسوم الخدمة', amount: pr.value, note: pr.hint });
    }
    const p = svc.pricing;
    if (p && p.parts) {
      p.parts.forEach((part) => {
        if (part.amount) rows.push({ name: part.service || part.label, amount: C.fmtIQDInt(part.amount) || part.amountText });
      });
    }
    if (!rows.length && svc.pricing && svc.pricing.display) {
      rows.push({ name: 'تقديري', amount: svc.pricing.display });
    }
    return rows;
  }

  function saveBadge(saved) {
    const map = saved
      ? { ico: 'cloud_done', txt: 'محفوظ تلقائياً', cls: 'is-saved' }
      : { ico: 'cloud_sync', txt: 'جاري الحفظ…', cls: 'is-saving' };
    return C.el('span', { class: 'rs-savebadge ' + map.cls, id: 'platformSaveBadge' }, [C.icon(map.ico, 16), ' ' + map.txt]);
  }

  function renderFormPage(appNode, App, code) {
    const svc = App.data.services[code];
    if (!svc) return;
    const sec = App.data.meta.sections[svc.section];
    const draft = App.drafts[code] || {};
    const steps = stepsFromService(svc);
    let activeStep = steps[0] ? steps[0].key : 'form';

    function mountForm() {
      const view = C.el('div', { class: 'app-page fade-in platform-form-page' });
      view.appendChild(C.crumbs([
        { label: 'الرئيسية', href: '#/' },
        { label: 'الخدمات', href: '#/services' },
        { label: svc.title, href: '#/service/' + code },
        { label: 'النموذج' },
      ]));

      view.appendChild(C.el('div', { class: 'row-between no-print' }, [
        C.el('div', {}, [
          C.el('h1', { class: 'pageheader__title', text: svc.title }),
          C.el('p', { class: 'pageheader__sub' }, [
            C.secBadge(svc.section), ' \u00a0 ', svc.formNumber, ' · مركز الرصافة — الكرادة',
          ]),
        ]),
        C.el('div', { class: 'cluster' }, [
          saveBadge(true),
          C.btn('دليل الخدمة', { size: 'sm', variant: 'ghost', icon: 'info', onclick: () => global.PlatformInfo && global.PlatformInfo.open(svc) }),
          C.btn('طباعة', { size: 'sm', variant: 'ghost', icon: 'print', onclick: () => global.printUnified && global.printUnified(code, svc) }),
          C.btn('إفراغ', { size: 'sm', variant: 'ghost', icon: 'delete', onclick: () => {
            if (confirm('هل تريد إفراغ النموذج؟')) {
              delete App.drafts[code];
              if (typeof global.saveDrafts === 'function') global.saveDrafts();
              else { try { localStorage.setItem('cs_drafts_v1', JSON.stringify(App.drafts)); } catch (e) {} }
              location.reload();
            }
          } }),
        ]),
      ]));

      const shell = C.el('div', { class: 'formshell' });
      const side = C.el('div', { class: 'formside no-print' });

      const stepList = C.el('ul', { class: 'stepnav__list' });
      steps.forEach((s, i) => {
        stepList.appendChild(C.el('li', {
          class: 'stepnav__item' + (activeStep === s.key ? ' is-active' : ''),
          onclick: () => {
            activeStep = s.key;
            stepList.querySelectorAll('.stepnav__item').forEach((n, j) => n.classList.toggle('is-active', j === i));
            const target = document.getElementById(s.anchor) || document.getElementById('formSheet');
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
        }, [
          C.el('span', { class: 'stepnav__dot', text: String(i + 1) }),
          C.el('span', { style: { flex: 1 }, text: s.label }),
          C.icon(s.ico, 18),
        ]));
      });

      side.appendChild(C.el('div', { class: 'stepnav' }, [
        C.el('div', { class: 'stepnav__head' }, [
          C.el('span', { text: 'أقسام النموذج' }),
          C.el('span', { class: 'stepnav__progress', id: 'platformFormProgress', text: '0%' }),
        ]),
        C.el('div', { class: 'stepnav__bar' }, [C.el('div', { class: 'stepnav__fill', id: 'platformFormProgressBar', style: { width: '0%' } })]),
        stepList,
      ]));

      const fees = feeRows(svc, draft);
      const feePanel = C.el('div', { class: 'feepanel' }, [
        C.el('div', { class: 'feepanel__head' }, [C.icon('payments', 20), C.el('span', { class: 'feepanel__title', text: 'المطالبة المالية' })]),
      ]);
      if (fees.length) {
        fees.forEach((r) => {
          feePanel.appendChild(C.el('div', { class: 'feerow' }, [
            C.el('span', { class: 'feerow__name', text: r.name }),
            C.el('span', { class: 'feerow__amt', text: r.amount || '—' }),
          ]));
        });
      } else {
        feePanel.appendChild(C.el('p', { class: 'muted', style: { fontSize: '0.82rem', lineHeight: 1.6 }, text: 'تُحدّث الأجور آلياً عند تعبئة صنف الاشتراك ونوع الربط في النموذج.' }));
      }
      side.appendChild(feePanel);

      const body = C.el('div', { class: 'formbody' });
      const mode = (typeof global.getFormMode === 'function') ? global.getFormMode(code) : 'original';
      body.appendChild(C.el('div', { class: 'formhead no-print' }, [
        C.el('div', {}, [
          C.el('h2', { class: 'formhead__title', text: 'نموذج طلب — ' + svc.formNumber }),
          C.el('p', { class: 'formhead__sub', text: mode === 'smart' ? 'الواجهة الاحترافية — مرتّبة بأقسام ومحسّنة للإدخال السريع' : 'الواجهة الأصلية — طبق الأصل من النموذج الورقي الرسمي' }),
        ]),
        C.el('div', { class: 'formhead__tools' }, [
          C.el('nav', { class: 'rs-tabs', style: { borderBottom: 0 }, role: 'tablist' }, [
            C.el('button', {
              type: 'button', class: 'rs-tabs__item' + (mode === 'smart' ? ' is-active' : ''),
              onclick: () => { if (typeof global.setFormMode === 'function') global.setFormMode(code, 'smart'); },
            }, [C.icon('auto_awesome', 18), ' واجهة احترافية']),
            C.el('button', {
              type: 'button', class: 'rs-tabs__item' + (mode !== 'smart' ? ' is-active' : ''),
              onclick: () => { if (typeof global.setFormMode === 'function') global.setFormMode(code, 'original'); },
            }, [C.icon('description', 18), ' الفورمة الأصلية ', C.el('span', { class: 'rs-tabs__badge', text: 'طبق الأصل' })]),
          ]),
        ]),
      ]));

      const engineHost = C.el('div', { class: 'platform-form-engine', id: 'platformFormEngine' });
      if (typeof global.renderWorkspace === 'function') {
        engineHost.appendChild(global.renderWorkspace(code, svc));
      }
      body.appendChild(engineHost);

      body.appendChild(C.el('div', {
        class: 'no-print',
        style: { marginTop: '28px', padding: '18px 0 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
      }, [
        C.el('div', { class: 'cluster' }, [
          C.tag('جاهز للطباعة', 'info'),
        ]),
        C.el('div', { class: 'cluster' }, [
          C.btn('طباعة النموذج', { icon: 'print', onclick: () => global.printUnified && global.printUnified(code, svc) }),
          C.btn('تقديم وتحويل', { variant: 'primary', icon: 'send', href: '#/cases' }),
        ]),
      ]));

      shell.appendChild(side);
      shell.appendChild(body);
      view.appendChild(shell);

      appNode.innerHTML = '';
      appNode.appendChild(view);
      document.body.classList.add('platform-form-active');

      if (typeof global.setSavedBadge === 'function') global.setSavedBadge(true);
      if (typeof global.updateFieldMeter === 'function') global.updateFieldMeter();
      if (typeof global.centerSheetScroll === 'function') global.centerSheetScroll();
      syncProgress();
    }

    function syncProgress() {
      const meter = C.$('#fieldMeter');
      let pct = 0;
      if (meter) {
        const m = (meter.textContent || '').match(/(\d+)/);
        if (m) pct = parseInt(m[1], 10);
      }
      const n = C.$('#platformFormProgress');
      const bar = C.$('#platformFormProgressBar');
      if (n) n.textContent = pct + '%';
      if (bar) bar.style.width = pct + '%';
    }

    if (needsPreflight(code)) {
      appNode.innerHTML = '';
      appNode.appendChild(C.el('div', { class: 'app-page fade-in' }, [
        C.crumbs([
          { label: 'الرئيسية', href: '#/' },
          { label: 'الخدمات', href: '#/services' },
          { label: svc.title, href: '#/service/' + code },
          { label: 'النموذج' },
        ]),
        renderPreflight(svc, code, mountForm, () => { location.hash = '#/service/' + code; }),
      ]));
    } else {
      mountForm();
    }

    const obs = new MutationObserver(syncProgress);
    setTimeout(() => {
      const host = C.$('#platformFormEngine');
      if (host) obs.observe(host, { childList: true, subtree: true, characterData: true });
    }, 100);
  }

  global.PlatformForm = { render: renderFormPage, stepsFromService };
})(window);
