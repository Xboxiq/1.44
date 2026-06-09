/* ============================================================
   نظام أتمتة نماذج خدمات المشتركين — محرّك العرض والمنطق
   الشركة العامة لتوزيع كهرباء بغداد — قطاع الرصافة
   Data-Driven Form Renderer (vanilla JS, no deps)
   ============================================================ */
'use strict';

const App = {
  data: null,
  drafts: {},
  current: null,
};
// كشف App على window حتى يتمكّن docxgen.js من فحصه (hasWordTemplate)
// بدون هذا السطر يبقى window.App غير معرّف (const لا يُعلَّق على window) فتختفي أزرار Word.
window.App = App;

/* ============================================================
   إعدادات الحقول الإلزامية والذكية (طبقة فوق services.json)
   - COMMON_REQUIRED: أسماء حقول إلزامية افتراضياً عبر كل النماذج
     (يمكن تجاوزها بـ required:false في الـschema)
   - AUTOCOMPLETE_MAP: قيم autocomplete الذكية لتسريع تعبئة الموظف
   - INPUTMODE_MAP: لوحة المفاتيح الصحيحة على الأجهزة اللوحية
   ============================================================ */
const COMMON_REQUIRED = new Set([
  'subscriberName',  // اسم المشترك
  'nationalId',      // الرقم الوطني (البطاقة الموحّدة)
  'requestDate',     // تاريخ الطلب
  'phone',           // الهاتف (عند وجوده)
  'accountNo',       // رقم الحساب
]);

const AUTOCOMPLETE_MAP = {
  subscriberName: 'name',
  phone: 'tel-national',
  nationalId: 'off',           // حساس — لا نسمح بالحفظ
  accountNo: 'off',
  address: 'street-address',
  district: 'address-level2',
  mahalla: 'address-level3',
  zuqaq: 'address-line2',
  dar: 'address-line1',
  apartment: 'address-line3',
  landmark: 'address-line2',
  email: 'email',
  requestDate: 'off',
};

// inputmode لإظهار لوحة المفاتيح الرقمية على الموبايل/التابلت
const NUMERIC_FIELD_HINTS = [
  /No$/, /Number$/, /^doc_.*_no$/i, /^mtx_/, /Fee/, /Amount/, /Bill/,
  /^accountNo$/, /^nationalId$/, /^housingCardNo$/, /Parcel/, /Floor/,
];
function inputModeFor(name) {
  if (!name) return null;
  return NUMERIC_FIELD_HINTS.some((re) => re.test(name)) ? 'numeric' : null;
}

// عدّاد لمعرّفات فريدة لكل دورة عرض — يُربط عبره الـ<label> بالـ<input>
let __fieldIdSeq = 0;
let __labelIdSeq = 0;
function nextFieldId(name) {
  __fieldIdSeq += 1;
  const safe = String(name || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return `fld-${__fieldIdSeq}${safe ? '-' + safe : ''}`;
}
function nextLabelId() { __labelIdSeq += 1; return `lbl-${__labelIdSeq}`; }
function resetFieldIds() { __fieldIdSeq = 0; __labelIdSeq = 0; }

function isRequiredSpec(spec) {
  if (!spec || !spec.name) return false;
  if (spec.readonly) return false;
  if (spec.required === true) return true;
  if (spec.required === false) return false;
  return COMMON_REQUIRED.has(spec.name);
}

/* ---------- أدوات DOM مختصرة ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

/* ---------- التخزين المحلي (المسودات) ---------- */
const LS_KEY = 'cs_drafts_v1';
const SEQ_KEY = 'cs_refseq_v1';
function loadDrafts() {
  try { App.drafts = JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { App.drafts = {}; }
}
function saveDrafts() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(App.drafts));
    return true;
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      toast('تعذّر الحفظ — مساحة التخزين المحلي ممتلئة', 'error');
    }
    return false;
  }
}
function draftOf(code) { return (App.drafts[code] = App.drafts[code] || {}); }

/* ---------- الرقم المرجعي التلقائي ---------- */
function nextSerial() {
  let seq = parseInt(localStorage.getItem(SEQ_KEY) || '0', 10) + 1;
  localStorage.setItem(SEQ_KEY, String(seq));
  return String(seq).padStart(4, '0');
}
function computeRef(code, svc) {
  const d = draftOf(code);
  if (!d.__serial) { d.__serial = nextSerial(); saveDrafts(); }
  const center = (d.centerNo && String(d.centerNo).trim()) ? String(d.centerNo).trim() : '××';
  d.refNo = `${svc.formNumber}-${center}-${d.__serial}`;
  return d.refNo;
}

/* الرقم المرجعي الرسمي للحالة (REQ-YYYY-XXXX) — مستقلّ عن رقم النموذج */
function ensureCaseRef(d) {
  if (!d.__caseRef) {
    if (!d.__serial) { d.__serial = nextSerial(); }
    const year = new Date().getFullYear();
    d.__caseRef = `REQ-${year}-${d.__serial}`;
    saveDrafts();
  }
  return d.__caseRef;
}

/* ---------- التوست (إشعارات) ---------- */
let toastTimer = null;
function toast(msg, type = 'info') {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(t); }
  t.className = `toast toast--${type} is-show`;
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
}

/* ---------- حلّ المراجع المشتركة $ref ---------- */
function resolveBlock(block) {
  if (block && block.$ref) {
    const ref = App.data.common[block.$ref];
    if (!ref) return { type: 'note', text: `(مرجع غير موجود: ${block.$ref})` };
    const resolved = JSON.parse(JSON.stringify(ref));
    // دمج المفاتيح الإضافية على كائن المرجع (مثل title) فوق القالب المشترك
    Object.keys(block).forEach((k) => { if (k !== '$ref') resolved[k] = block[k]; });
    return resolved;
  }
  return block;
}

/* ============================================================
   محرّك عرض النموذج — نسختان:
   • original: مطابقة تخطيطية لنموذج Word الأصلي (جداول A4)
   • smart:    نفس ترتيب الحقول بتجميع ذكي ومحاذاة محسّنة
   ============================================================ */
const FORM_MODES = {
  original: { id: 'original', label: 'النموذج الأصلي', hint: 'مطابقة لنموذج Word — للطباعة الرسمية' },
  smart: { id: 'smart', label: 'النموذج الذكي', hint: 'نفس البيانات بترتيب مبسّط وعرض أوضح' },
};

function getFormMode(code) {
  const m = draftOf(code).__formMode;
  return m === 'smart' ? 'smart' : 'original';
}

function setFormMode(code, mode) {
  draftOf(code).__formMode = mode === 'smart' ? 'smart' : 'original';
  saveDrafts();
  const svc = App.data.services[code];
  if (!svc) return;
  refreshFormSheet(code, svc);
  $$('.form-mode-btn').forEach((b) => {
    const on = b.dataset.mode === getFormMode(code);
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  toast(mode === 'smart' ? 'تم التبديل إلى النموذج الذكي' : 'تم التبديل إلى النموذج الأصلي', 'info');
}

function refreshFormSheet(code, svc) {
  const scroll = $('.sheet-scroll');
  if (!scroll) return;
  const next = renderForm(code, svc);
  const old = $('#formSheet');
  if (old) scroll.replaceChild(next, old);
  else scroll.appendChild(next);
  centerSheetScroll();
  updateFieldMeter();
  if (typeof refreshPricingDisplay === 'function') refreshPricingDisplay();
}

function renderForm(code, svc) {
  resetFieldIds();
  return getFormMode(code) === 'smart'
    ? renderFormSmart(code, svc)
    : renderFormOriginal(code, svc);
}

function renderFormOriginal(code, svc) {
  const form = svc.form;
  const sheet = el('div', {
    class: 'sheet sheet--original',
    id: 'formSheet',
    dir: 'rtl',
    'data-form-mode': 'original',
    'data-form-code': code,
    'data-form-no': svc.formNumber || code,
  });
  sheet.appendChild(renderHeader(code, svc, form, 'original'));
  (form.blocks || []).forEach((raw) => {
    const block = resolveBlock(raw);
    const fn = BLOCKS[block.type];
    if (fn) sheet.appendChild(fn(block, code, svc));
  });
  bindInputs(sheet, code, svc);
  return sheet;
}

function renderFormSmart(code, svc) {
  const form = svc.form;
  const sheet = el('div', {
    class: 'sheet sheet--smart',
    id: 'formSheet',
    dir: 'rtl',
    'data-form-mode': 'smart',
    'data-form-code': code,
    'data-form-no': svc.formNumber || code,
  });
  sheet.appendChild(renderHeader(code, svc, form, 'smart'));
  (form.blocks || []).forEach((raw) => {
    const block = resolveBlock(raw);
    const fn = SMART_BLOCKS[block.type] || BLOCKS[block.type];
    if (fn) sheet.appendChild(fn(block, code, svc));
  });
  bindInputs(sheet, code, svc);
  return sheet;
}

function renderFormModeBar(code, svc) {
  const mode = getFormMode(code);
  const wrap = el('div', { class: 'form-mode-bar app-chrome', role: 'tablist', 'aria-label': 'اختيار نسخة النموذج' });
  Object.values(FORM_MODES).forEach((m) => {
    const active = mode === m.id;
    wrap.appendChild(el('button', {
      class: 'form-mode-btn' + (active ? ' is-active' : ''),
      type: 'button',
      role: 'tab',
      'data-mode': m.id,
      'aria-selected': active ? 'true' : 'false',
      title: m.hint,
      onclick: () => { if (getFormMode(code) !== m.id) setFormMode(code, m.id); },
    }, [
      el('span', { class: 'form-mode-btn__lbl', text: m.label }),
      el('span', { class: 'form-mode-btn__hint', text: m.hint }),
    ]));
  });
  return wrap;
}

function renderLetterhead(svc) {
  const m = App.data.meta;
  const lhText = [];
  if (m.letterheadProject) lhText.push(el('div', { class: 'lh-project', text: m.letterheadProject }));
  if (m.letterheadOrg) lhText.push(el('div', { class: 'lh-org', text: m.letterheadOrg }));
  const attrs = { class: 'sheet-letterhead' };
  if (svc && (svc.formNumber || svc.code)) attrs['data-form-no'] = svc.formNumber || svc.code;
  return el('div', attrs, [
    m.logo
      ? el('img', { class: 'sheet-logo', src: m.logo, alt: 'شعار ' + (m.letterheadOrg || m.company) })
      : null,
    el('div', { class: 'sheet-letterhead__text' }, lhText),
  ].filter(Boolean));
}

function appendFeeChip(code, svc, parent, compact) {
  const chip = pricingChip(svc, draftOf(code), compact);
  if (chip) parent.appendChild(chip);
}

function smartFieldWrap(code, svc, cell) {
  const wrap = el('div', { class: 'smart-field__control' });
  const isFee = FEE_RECEIPT_FIELDS.has(cell.name) || /رسوم/.test(String(cell.note || ''));
  if (isFee) appendFeeChip(code, svc, wrap, true);
  if (cell.note) wrap.appendChild(el('span', { class: 'fld-note' + (isFee ? '' : ' fld-note--guide'), text: cell.note }));
  wrap.appendChild(field(cell));
  return wrap;
}

function renderHeader(code, svc, form, variant) {
  const smart = variant === 'smart';
  const wrap = el('div', { class: 'sheet-head' + (smart ? ' sheet-head--smart' : '') });
  wrap.appendChild(renderLetterhead(svc));

  if (smart) {
    wrap.appendChild(el('div', { class: 'smart-titlebar' }, [
      el('h2', { class: 'smart-titlebar__title', text: form.formTitle || svc.title }),
      el('span', { class: 'smart-titlebar__no', text: form.formNo || `نموذج رقم (${svc.formNumber})` }),
    ]));
    if (form.receipt) {
      const receiptInp = field({ name: 'receiptNo', kind: 'text' });
      const row = el('div', { class: 'smart-pair smart-pair--receipt' }, [
        el('label', { class: 'smart-pair__lbl', for: receiptInp.id, text: form.receipt }),
        el('div', { class: 'smart-pair__fld' }, []),
      ]);
      appendFeeChip(code, svc, row.querySelector('.smart-pair__fld'), false);
      row.querySelector('.smart-pair__fld').appendChild(receiptInp);
      wrap.appendChild(row);
    }
    return wrap;
  }

  const tbl = el('table', { class: 'tbl tbl--head' });
  const tb = el('tbody');
  tb.appendChild(el('tr', {}, [
    el('td', { class: 'cell-title', text: form.formTitle || svc.title }),
    el('td', { class: 'cell-formno', text: form.formNo || `نموذج رقم (${svc.formNumber})` }),
  ]));
  if (form.receipt) {
    const feeFld = el('td', { class: 'fld fld--fee' }, [field({ name: 'receiptNo', kind: 'text' })]);
    appendFeeChip(code, svc, feeFld, false);
    tb.appendChild(el('tr', {}, [
      el('td', { class: 'lbl', text: form.receipt }),
      feeFld,
    ]));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  return wrap;
}

/* ---------- عنصر حقل إدخال ---------- */
function field(spec) {
  const kind = spec.kind || 'text';
  const id = spec.id || nextFieldId(spec.name);
  const required = isRequiredSpec(spec);
  const ac = AUTOCOMPLETE_MAP[spec.name] || (kind === 'tel' ? 'tel-national' : 'off');
  const maxLen = spec.maxLength || (kind === 'date' ? 10 : (kind === 'tel' ? 20 : (kind === 'ref' ? 24 : 250)));

  const attrs = {
    id,
    class: 'inp' + (spec.readonly ? ' inp--ro' : '') + (required ? ' inp--required' : ''),
    'data-name': spec.name,
    dir: 'auto',
    autocomplete: ac,
    maxlength: String(maxLen),
    enterkeyhint: 'next',
  };
  if (spec.readonly) attrs.readonly = 'readonly';
  if (required) {
    attrs.required = 'required';
    attrs['aria-required'] = 'true';
    attrs['data-required'] = '1';
  }

  if (kind === 'date') {
    attrs.type = 'text';
    attrs.placeholder = 'يوم/شهر/سنة';
    attrs.inputmode = 'numeric';
    attrs.class += ' inp--date';
    attrs['data-validate'] = 'date';
  } else if (kind === 'tel') {
    attrs.type = 'tel';
    attrs.inputmode = 'tel';
    attrs['data-validate'] = 'phone';
    attrs.placeholder = '07XX XXX XXXX';
  } else if (kind === 'ref') {
    attrs.class += ' inp--ref';
    attrs.readonly = 'readonly';
    attrs['aria-readonly'] = 'true';
  } else {
    attrs.type = 'text';
    const im = inputModeFor(spec.name);
    if (im) attrs.inputmode = im;
  }
  return el('input', attrs);
}

/* ============================================================
   شبكة النموذج — تثبيت الأعمدة والتوسيط (مطابقة للأصل)
   ============================================================ */
function gridColCount(block) {
  const n = parseInt(block && block.cols, 10);
  return Number.isFinite(n) && n > 0 ? n : 6;
}

function gridRowSpan(cells) {
  return (cells || []).reduce((sum, cell) => sum + (cell.span || 1), 0);
}

function appendGridColgroup(tbl, cols) {
  const cg = document.createElement('colgroup');
  for (let i = 0; i < cols; i++) {
    const col = document.createElement('col');
    if (cols === 1) col.className = 'col-full';
    else col.className = (i % 2 === 0) ? 'col-lbl' : 'col-fld';
    cg.appendChild(col);
  }
  tbl.appendChild(cg);
}

function gridCellClass(cell) {
  if (cell.t === 'head') return 'lbl lbl--head';
  if (cell.t === 'label' || cell.t === 'static') return 'lbl';
  if (cell.t === 'field') return 'fld';
  if (cell.t === 'checks') return 'fld fld--checks';
  return '';
}

/* ============================================================
   مُصيّرو البلوكات (Block Renderers)
   ============================================================ */
const BLOCKS = {
  grid(block, code, svc) {
    const wrap = block.title ? el('div', { class: 'block' }) : null;
    if (wrap) wrap.appendChild(el('div', { class: 'block-title', text: block.title }));
    const cols = gridColCount(block);
    const tbl = el('table', { class: 'tbl tbl--grid', 'data-cols': String(cols) });
    appendGridColgroup(tbl, cols);
    const tb = el('tbody');
    (block.rows || []).forEach((row) => {
      const tr = el('tr');
      let used = 0;
      const cellsArr = row.cells || [];
      cellsArr.forEach((cell, idx) => {
        const spanN = cell.span || 1;
        used += spanN;
        const span = spanN > 1 ? { colspan: spanN } : {};
        const cls = gridCellClass(cell);
        const nextCell = cellsArr[idx + 1];
        if (cell.t === 'label' || cell.t === 'static') {
          // إذا الخلية التالية حقل، علّم التسمية بـlbl--required إن كان الحقل إلزامياً
          // وامنحها id لاستخدامها مع aria-labelledby على الـinput
          let lblClass = cls;
          const attrs = Object.assign({ class: lblClass }, span);
          if (cell.t === 'label' && nextCell && nextCell.t === 'field') {
            attrs.id = nextLabelId();
            if (isRequiredSpec(nextCell)) attrs.class += ' lbl--required';
          } else if (cell.t === 'label' && nextCell && nextCell.t === 'checks') {
            attrs.id = nextLabelId();
          }
          tr.appendChild(el('td', attrs, cell.text || ''));
        } else if (cell.t === 'head') {
          tr.appendChild(el('td', Object.assign({ class: cls }, span), cell.text));
        } else if (cell.t === 'field') {
          const isFee = FEE_RECEIPT_FIELDS.has(cell.name) || /رسوم/.test(String(cell.note || ''));
          const td = el('td', Object.assign({ class: cls + (isFee ? ' fld--fee' : '') }, span));
          if (isFee) {
            const chip = pricingChip(svc, draftOf(code), true);
            if (chip) td.appendChild(chip);
          }
          if (cell.note) td.appendChild(el('span', { class: 'fld-note' + (isFee ? '' : ' fld-note--guide'), text: cell.note }));
          const inp = field(cell);
          // اربط الحقل بالتسمية السابقة (إن وُجدت) لقارئات الشاشة
          const prevTd = tr.lastElementChild;
          if (prevTd && prevTd.id && prevTd.classList.contains('lbl')) {
            inp.setAttribute('aria-labelledby', prevTd.id);
          }
          td.appendChild(inp);
          tr.appendChild(td);
        } else if (cell.t === 'checks') {
          const td = el('td', Object.assign({ class: cls }, span));
          const grp = checks(cell);
          const prevTd = tr.lastElementChild;
          if (prevTd && prevTd.id && prevTd.classList.contains('lbl')) {
            grp.setAttribute('aria-labelledby', prevTd.id);
          }
          td.appendChild(grp);
          tr.appendChild(td);
        } else {
          tr.appendChild(el('td', Object.assign({ class: cls }, span), cell.text || ''));
        }
      });
      if (used < cols) {
        tr.appendChild(el('td', { class: 'fld fld--pad', colspan: cols - used, 'aria-hidden': 'true' }));
      }
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    if (wrap) { wrap.appendChild(tbl); return wrap; }
    return tbl;
  },

  docsMatrix(block) {
    const wrap = el('div', { class: 'block' });
    if (block.title) wrap.appendChild(el('div', { class: 'block-title', text: block.title }));
    const tbl = el('table', { class: 'tbl tbl--matrix' });
    const thead = el('thead');
    const htr = el('tr');
    if (!block.noStatus) htr.appendChild(el('th', { class: 'mtx-status', text: block.statusHeader || 'الحالة' }));
    htr.appendChild(el('th', { class: 'mtx-num', text: block.numHeader || '#' }));
    htr.appendChild(el('th', { class: 'mtx-doc', text: block.docHeader || 'الصنف' }));
    (block.columns || []).forEach((c) => htr.appendChild(el('th', { class: 'mtx-col' }, vertical(c))));
    thead.appendChild(htr);
    tbl.appendChild(thead);
    const tb = el('tbody');
    (block.rows || []).forEach((row) => {
      const tr = el('tr', row.shaded ? { class: 'is-shaded' } : {});
      if (!block.noStatus) tr.appendChild(el('td', { class: 'mtx-status' }, row.shaded ? [] : [box(`mtx_${row.n}_status`)]));
      tr.appendChild(el('td', { class: 'mtx-num', text: String(row.n) }));
      tr.appendChild(el('td', { class: 'mtx-doc', text: row.doc }));
      (row.cells || []).forEach((on, i) => {
        const td = el('td', { class: 'mtx-cell' });
        if (row.shaded) { tr.appendChild(td); return; }
        if (on) td.appendChild(box(`mtx_${row.n}_${i}`));
        else td.classList.add('mtx-cell--off');
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    wrap.appendChild(tbl);
    return wrap;
  },

  docTable(block) {
    const wrap = el('div', { class: 'block' });
    if (block.title) wrap.appendChild(el('div', { class: 'block-title', text: block.title }));
    const tbl = el('table', { class: 'tbl tbl--doctable' });
    const thead = el('thead');
    const htr = el('tr');
    (block.columns || []).forEach((c, i) => htr.appendChild(el('th', { class: i === 0 ? 'dt-label' : '' , text: c })));
    thead.appendChild(htr);
    tbl.appendChild(thead);
    const tb = el('tbody');
    (block.rows || []).forEach((row, rIdx) => {
      const tr = el('tr', row.shaded ? { class: 'is-shaded' } : {});
      const labelId = nextLabelId();
      const anyRequired = (row.fields || []).some((f) => isRequiredSpec(f));
      tr.appendChild(el('td', {
        class: 'dt-label' + (anyRequired ? ' lbl--required' : ''),
        id: labelId,
        text: row.label,
      }));
      (row.fields || []).forEach((f) => {
        const inp = field(f);
        inp.setAttribute('aria-labelledby', labelId);
        tr.appendChild(el('td', { class: 'fld' }, [inp]));
      });
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    wrap.appendChild(tbl);
    return wrap;
  },

  checklist(block) {
    const wrap = el('div', { class: 'block' });
    if (block.title) wrap.appendChild(el('div', { class: 'block-title', text: block.title }));
    const showCheck = block.check !== false;
    const showNotes = !!block.notes;
    const detailsInput = !!block.detailsInput;
    const base = block.name || 'cl';
    const tbl = el('table', { class: 'tbl tbl--checklist' });
    const thead = el('thead');
    const htr = el('tr');
    htr.appendChild(el('th', { class: 'cl-num', text: block.numHeader || 'رقم' }));
    htr.appendChild(el('th', { class: 'cl-desc', text: block.descHeader || 'الوصف' }));
    if (showCheck) htr.appendChild(el('th', { class: 'cl-check', text: block.checkHeader || '' }));
    if (showNotes) htr.appendChild(el('th', { class: 'cl-notes', text: block.notesHeader || 'ملاحظات' }));
    thead.appendChild(htr);
    tbl.appendChild(thead);
    const tb = el('tbody');
    (block.rows || []).forEach((row) => {
      const tr = el('tr');
      tr.appendChild(el('td', { class: 'cl-num', text: String(row.n) }));
      if (detailsInput) {
        const td = el('td', { class: 'cl-desc fld' });
        td.appendChild(field({ name: `${base}_${row.n}`, kind: 'text' }));
        tr.appendChild(td);
      } else {
        tr.appendChild(el('td', { class: 'cl-desc', text: row.desc }));
      }
      if (showCheck) tr.appendChild(el('td', { class: 'cl-check' }, [box(`${base}_${row.n}`)]));
      if (showNotes) {
        const td = el('td', { class: 'cl-notes fld' });
        td.appendChild(field({ name: `${base}_${row.n}_note`, kind: 'text' }));
        tr.appendChild(td);
      }
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    wrap.appendChild(tbl);
    return wrap;
  },

  routing(block) {
    const tbl = el('table', { class: 'tbl tbl--routing' });
    const tr = el('tr');
    const labelId = nextLabelId();
    tr.appendChild(el('td', { class: 'lbl', id: labelId, text: block.label }));
    const td = el('td', { class: 'fld fld--checks' });
    const grp = checks({ name: block.name, mode: block.mode || 'multi', options: block.options });
    grp.setAttribute('aria-labelledby', labelId);
    td.appendChild(grp);
    tr.appendChild(td);
    tbl.appendChild(el('tbody', {}, [tr]));
    return tbl;
  },

  signatures(block) {
    const tbl = el('table', { class: 'tbl tbl--sign' });
    const tr = el('tr');
    (block.cells || []).forEach((c) => tr.appendChild(el('td', { class: 'sign-cell', text: c })));
    tbl.appendChild(el('tbody', {}, [tr]));
    return tbl;
  },

  legal(block) {
    const wrap = el('div', { class: 'block block--legal' });
    if (block.title) wrap.appendChild(el('div', { class: 'block-title block-title--legal', text: block.title }));
    (block.paragraphs || []).forEach((p) => wrap.appendChild(el('p', { class: 'legal-p', text: p })));
    if (block.footer) wrap.appendChild(el('div', { class: 'legal-footer', text: block.footer }));
    return wrap;
  },

  note(block) {
    const wrap = el('div', { class: 'block block--note' });
    if (block.title) wrap.appendChild(el('div', { class: 'block-title', text: block.title }));
    if (block.text) wrap.appendChild(el('p', { class: 'note-text', text: block.text }));
    return wrap;
  },

  sectionTitle(block) {
    return el('div', { class: 'block-title block-title--section', text: block.text || '' });
  },
};

/* ============================================================
   النموذج الذكي — نفس ترتيب البلوكات والحقول، عرض مبسّط
   ============================================================ */
function smartSection(title) {
  const sec = el('section', { class: 'smart-section' });
  if (title) sec.appendChild(el('h3', { class: 'smart-section__title', text: title }));
  sec.appendChild(el('div', { class: 'smart-section__body' }));
  return sec;
}

function smartSectionBody(sec) {
  return sec.querySelector('.smart-section__body') || sec;
}

function parseSmartGridRows(block) {
  const items = [];
  (block.rows || []).forEach((row) => {
    const cells = row.cells || [];
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c.t === 'head') {
        items.push({ kind: 'head', text: c.text });
        continue;
      }
      if (c.t === 'label') {
        const next = cells[i + 1];
        if (next && next.t === 'field') {
          items.push({ kind: 'pair', label: c.text, field: next });
          i++;
          continue;
        }
        if (next && next.t === 'checks') {
          items.push({ kind: 'checks', label: c.text, spec: next });
          i++;
          continue;
        }
        items.push({ kind: 'label', text: c.text });
        continue;
      }
      if (c.t === 'field') items.push({ kind: 'field', field: c });
      else if (c.t === 'checks') items.push({ kind: 'checks', spec: c });
      else if (c.t === 'static') items.push({ kind: 'static', text: c.text });
    }
  });
  return items;
}

const SMART_BLOCKS = {
  grid(block, code, svc) {
    const sec = smartSection(block.title);
    const body = smartSectionBody(sec);
    const flow = el('div', { class: 'smart-flow' });
    parseSmartGridRows(block).forEach((item) => {
      if (item.kind === 'head') {
        flow.appendChild(el('div', { class: 'smart-subhead', text: item.text }));
        return;
      }
      if (item.kind === 'pair') {
        const wrap = smartFieldWrap(code, svc, item.field);
        const inp = wrap.querySelector('input');
        const required = isRequiredSpec(item.field);
        const lblAttrs = { class: 'smart-pair__lbl' + (required ? ' smart-pair__lbl--required' : '') };
        if (inp && inp.id) lblAttrs.for = inp.id;
        flow.appendChild(el('div', { class: 'smart-pair' }, [
          el('label', Object.assign(lblAttrs, { text: item.label })),
          el('div', { class: 'smart-pair__fld' }, [wrap]),
        ]));
        return;
      }
      if (item.kind === 'checks') {
        const grp = checks(item.spec);
        const grpLabelId = item.label ? nextLabelId() : null;
        if (grpLabelId) grp.setAttribute('aria-labelledby', grpLabelId);
        const row = el('div', { class: 'smart-pair smart-pair--checks' }, [
          item.label ? el('label', { class: 'smart-pair__lbl', id: grpLabelId, text: item.label }) : null,
          el('div', { class: 'smart-pair__fld fld--checks' }, [grp]),
        ].filter(Boolean));
        flow.appendChild(row);
        return;
      }
      if (item.kind === 'field') {
        flow.appendChild(el('div', { class: 'smart-pair smart-pair--solo' }, [
          el('div', { class: 'smart-pair__fld smart-pair__fld--full' }, [smartFieldWrap(code, svc, item.field)]),
        ]));
        return;
      }
      if (item.kind === 'static' || item.kind === 'label') {
        flow.appendChild(el('p', { class: 'smart-static', text: item.text }));
      }
    });
    body.appendChild(flow);
    return sec;
  },

  docsMatrix(block) {
    const sec = smartSection(block.title);
    const inner = BLOCKS.docsMatrix(block);
    inner.classList.add('smart-table-block');
    const tbl = inner.querySelector('table');
    if (tbl) tbl.classList.add('tbl--smart');
    smartSectionBody(sec).appendChild(inner);
    return sec;
  },

  docTable(block) {
    const sec = smartSection(block.title);
    const inner = BLOCKS.docTable(block);
    inner.classList.add('smart-table-block');
    const tbl = inner.querySelector('table');
    if (tbl) tbl.classList.add('tbl--smart');
    smartSectionBody(sec).appendChild(inner);
    return sec;
  },

  checklist(block) {
    const sec = smartSection(block.title);
    const inner = BLOCKS.checklist(block);
    inner.classList.add('smart-table-block');
    const tbl = inner.querySelector('table');
    if (tbl) tbl.classList.add('tbl--smart');
    smartSectionBody(sec).appendChild(inner);
    return sec;
  },

  routing(block) {
    const sec = smartSection(null);
    const body = smartSectionBody(sec);
    body.appendChild(el('div', { class: 'smart-pair smart-pair--routing' }, [
      el('label', { class: 'smart-pair__lbl', text: block.label }),
      el('div', { class: 'smart-pair__fld fld--checks' }, [checks({ name: block.name, mode: block.mode || 'multi', options: block.options })]),
    ]));
    return sec;
  },

  signatures(block) {
    const sec = smartSection(null);
    const inner = BLOCKS.signatures(block);
    inner.classList.add('smart-sign-block');
    smartSectionBody(sec).appendChild(inner);
    return sec;
  },

  legal(block) {
    const sec = smartSection(block.title);
    const inner = BLOCKS.legal(block);
    inner.classList.add('smart-legal-block');
    smartSectionBody(sec).appendChild(inner);
    return sec;
  },

  note(block) {
    const sec = smartSection(block.title);
    const inner = BLOCKS.note(block);
    inner.classList.add('smart-note-block');
    smartSectionBody(sec).appendChild(inner);
    return sec;
  },

  sectionTitle(block) {
    return el('h3', { class: 'smart-section__title smart-section__title--solo', text: block.text || '' });
  },
};

/* وضع نص عمودي للأعمدة الضيقة في المصفوفة */
function vertical(text) { return el('span', { class: 'vtxt', text }); }

/* مجموعة اختيارات (راديو منطقي عبر checkbox مع mode) */
function checks(spec) {
  const wrap = el('div', { class: 'checks', 'data-group': spec.name, 'data-mode': spec.mode || 'multi' });
  (spec.options || []).forEach((opt, i) => {
    const id = `${spec.name}_${i}`;
    const cb = el('input', { type: 'checkbox', class: 'chk', id, 'data-name': spec.name, 'data-value': opt });
    const lb = el('label', { class: 'chk-label', for: id }, [el('span', { class: 'chk-box' }), el('span', { class: 'chk-text', text: opt })]);
    wrap.appendChild(el('span', { class: 'chk-item' }, [cb, lb]));
  });
  return wrap;
}

/* مربع اختيار مفرد (لخلايا المصفوفة والحالة) */
function box(name) {
  const id = `box_${name}`;
  return el('span', { class: 'chk-item chk-item--box' }, [
    el('input', { type: 'checkbox', class: 'chk', id, 'data-name': name }),
    el('label', { class: 'chk-label chk-label--box', for: id }, [el('span', { class: 'chk-box' })]),
  ]);
}

/* ============================================================
   ربط الإدخال: حفظ تلقائي + استرجاع + الرقم المرجعي
   ============================================================ */
function bindInputs(root, code, svc) {
  const d = draftOf(code);

  // استرجاع القيم المحفوظة
  $$('.inp', root).forEach((inp) => {
    const name = inp.dataset.name;
    if (name && d[name] != null && d[name] !== '') inp.value = d[name];
  });
  $$('.chk', root).forEach((cb) => {
    const name = cb.dataset.name;
    const val = cb.dataset.value;
    const stored = d[name];
    if (val != null) { if (Array.isArray(stored) ? stored.includes(val) : stored === val) cb.checked = true; }
    else if (stored === true || stored === 'on') cb.checked = true;
  });

  // الرقم المرجعي
  const refInp = root.querySelector('.inp--ref');
  if (refInp) { computeRef(code, svc); refInp.value = d.refNo || ''; }

  // الأحداث
  root.addEventListener('input', (e) => {
    const inp = e.target.closest('.inp');
    if (!inp || !inp.dataset.name) return;
    if (inp.classList.contains('inp--date')) maskDate(inp);
    if (inp.dataset.validate === 'phone') maskPhone(inp);
    d[inp.dataset.name] = inp.value;
    if (inp.dataset.name === 'centerNo' && refInp) { refInp.value = computeRef(code, svc); }
    clearError(inp);
    refreshCommandBar(inp.dataset.name, inp.value);
    if (PRICING_DRAFT_KEYS.has(inp.dataset.name)) refreshPricingDisplay();
    scheduleSave();
    scheduleLivePreview();
    updateFieldMeter();
  });
  root.addEventListener('change', (e) => {
    const cb = e.target.closest('.chk');
    if (!cb || !cb.dataset.name) return;
    const name = cb.dataset.name;
    const val = cb.dataset.value;
    const group = cb.closest('.checks');
    if (group && group.dataset.mode === 'single' && cb.checked) {
      $$('.chk', group).forEach((o) => { if (o !== cb) o.checked = false; });
    }
    if (val != null) {
      if (group && group.dataset.mode === 'single') d[name] = cb.checked ? val : '';
      else {
        const arr = Array.isArray(d[name]) ? d[name] : [];
        const set = new Set(arr);
        cb.checked ? set.add(val) : set.delete(val);
        d[name] = Array.from(set);
      }
    } else { d[name] = cb.checked; }
    if (PRICING_DRAFT_KEYS.has(name)) refreshPricingDisplay();
    scheduleSave();
    scheduleLivePreview();
    updateFieldMeter();
  });
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  setSavedBadge('saving');
  saveTimer = setTimeout(() => {
    const ok = saveDrafts();
    setSavedBadge(ok ? 'saved' : 'error');
  }, 400);
}
function setSavedBadge(state) {
  const b = $('#saveBadge'); if (!b) return;
  // الحالات: 'saved' | 'saving' | 'error' | 'unsaved' | true(لتوافق قديم)
  if (state === true) state = 'saved';
  if (state === false || state == null) state = 'unsaved';
  const map = {
    saved:   { text: 'تم الحفظ تلقائياً', cls: 'is-saved' },
    saving:  { text: 'جارٍ الحفظ…',       cls: 'is-saving' },
    unsaved: { text: 'تغييرات غير محفوظة', cls: '' },
    error:   { text: 'تعذّر الحفظ — تحقّق من المساحة', cls: 'is-error' },
  };
  const m = map[state] || map.unsaved;
  b.textContent = m.text;
  b.className = 'save-badge ' + m.cls;
}

/* ============================================================
   حارس الأزرار غير المتزامنة — يمنع النقر المضاعف
   ويُظهر دوّارة تحميل أثناء توليد Word/الطباعة
   ============================================================ */
async function withBusy(btn, work) {
  if (btn && btn.dataset.busy === '1') return; // مكرر — تجاهَل
  if (btn) {
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('is-busy');
  }
  try {
    return await work();
  } finally {
    if (btn) {
      btn.dataset.busy = '';
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.classList.remove('is-busy');
    }
  }
}

/* قناع تاريخ بسيط dd/mm/yyyy */
function maskDate(inp) {
  let v = inp.value.replace(/[^\d]/g, '').slice(0, 8);
  if (v.length >= 5) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
  else if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
  inp.value = v;
}

/* قناع هاتف عراقي حيّ — يدعم 07XX XXX XXXX و +964 XXX XXX XXXX */
function maskPhone(inp) {
  // الحفاظ على موضع المؤشّر بشكل تقريبي
  const before = inp.value;
  const caretRaw = inp.selectionStart || before.length;
  const digitsBeforeCaret = (before.slice(0, caretRaw).match(/\d/g) || []).length;

  let raw = before.replace(/[^\d+]/g, '');
  let intl = false;
  if (raw.startsWith('00964')) { raw = '+964' + raw.slice(5); }
  if (raw.startsWith('+964')) { intl = true; raw = raw.slice(4).replace(/^0+/, ''); }
  raw = raw.replace(/\D/g, '');

  let formatted = '';
  if (intl) {
    raw = raw.slice(0, 10);
    formatted = '+964';
    if (raw.length) formatted += ' ' + raw.slice(0, 3);
    if (raw.length > 3) formatted += ' ' + raw.slice(3, 6);
    if (raw.length > 6) formatted += ' ' + raw.slice(6, 10);
  } else {
    raw = raw.slice(0, 11);
    if (raw.length <= 4) formatted = raw;
    else if (raw.length <= 7) formatted = raw.slice(0, 4) + ' ' + raw.slice(4);
    else formatted = raw.slice(0, 4) + ' ' + raw.slice(4, 7) + ' ' + raw.slice(7, 11);
  }

  inp.value = formatted;

  // إعادة وضع المؤشّر بناءً على عدد الأرقام قبله
  let pos = 0, seen = 0;
  while (pos < formatted.length && seen < digitsBeforeCaret) {
    if (/\d/.test(formatted[pos])) seen++;
    pos++;
  }
  try { inp.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
}

/* ============================================================
   التحقق من الإدخال
   ============================================================ */

// رقم الهاتف العراقي: محلي 11 رقماً يبدأ 07، أو دولي +964 / 00964 ثم 7XXXXXXXXX
function isValidIraqiPhone(value) {
  const v = String(value || '').replace(/[\s\-()]/g, '');
  if (!v) return true;  // فارغ يُعالَج بـrequired منفصلاً
  // محلي
  if (/^07\d{9}$/.test(v)) return true;
  // دولي
  if (/^\+9647\d{9}$/.test(v)) return true;
  if (/^009647\d{9}$/.test(v)) return true;
  return false;
}

// تحقق صحة التاريخ بصيغة dd/mm/yyyy — يرفض 30/02، 99/99، السنوات خارج 1900..2100
function isValidDate(value) {
  const v = String(value || '').trim();
  if (!v) return true;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return false;
  const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
  if (y < 1900 || y > 2100) return false;
  if (mo < 1 || mo > 12) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

function validateForm(root) {
  if (!root) return true;
  let ok = true; let first = null;

  // 1) الحقول النصية الإلزامية
  $$('.inp[data-required]', root).forEach((inp) => {
    if (!inp.value.trim()) {
      markError(inp, 'هذا الحقل إلزامي');
      ok = false; first = first || inp;
    }
  });

  // 2) صحة رقم الهاتف
  $$('.inp[data-validate="phone"]', root).forEach((inp) => {
    const v = inp.value.trim();
    if (!v) return; // فراغه يُمسَك بـrequired
    if (!isValidIraqiPhone(v)) {
      markError(inp, 'رقم هاتف عراقي غير صحيح — مثال: 07XX XXX XXXX');
      ok = false; first = first || inp;
    }
  });

  // 3) صحة التاريخ
  $$('.inp[data-validate="date"]', root).forEach((inp) => {
    const v = inp.value.trim();
    if (!v) return;
    if (!isValidDate(v)) {
      markError(inp, 'تاريخ غير صحيح — الصيغة: يوم/شهر/سنة');
      ok = false; first = first || inp;
    }
  });

  if (first) {
    first.focus({ preventScroll: false });
    // مرّر للخطأ كي يراه المستخدم حتى لو كان أسفل الشاشة
    try {
      const msg = first.parentNode && first.parentNode.querySelector('.err-msg');
      const target = msg || first;
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    } catch (e) { /* ignore */ }
    if (typeof spatialShakeField === 'function') spatialShakeField(first);
  }
  return ok;
}
function markError(inp, msg) {
  inp.classList.add('inp--err');
  inp.setAttribute('aria-invalid', 'true');
  let m = inp.parentNode.querySelector('.err-msg');
  if (!m) {
    m = el('span', {
      class: 'err-msg',
      id: `err-${inp.dataset.name || 'field'}-${inp.id || ''}`,
      role: 'alert',
      'aria-live': 'polite',
    });
    inp.parentNode.appendChild(m);
  }
  m.textContent = msg;
  if (!inp.getAttribute('aria-describedby')) inp.setAttribute('aria-describedby', m.id);
}
function clearError(inp) {
  inp.classList.remove('inp--err');
  inp.removeAttribute('aria-invalid');
  inp.removeAttribute('aria-describedby');
  const m = inp.parentNode.querySelector('.err-msg'); if (m) m.remove();
}

/* ============================================================
   لوحة شرح الخدمة (Guide)
   ============================================================ */
function renderGuide(svc) {
  const g = svc.guide;
  const wrap = el('div', { class: 'guide' });
  if (!g) { wrap.appendChild(el('div', { class: 'empty', text: 'سيتوفّر الشرح التفصيلي لهذه الخدمة في مرحلة لاحقة.' })); return wrap; }

  const card = (title, body) => el('section', { class: 'guide-card' }, [el('h3', { class: 'guide-card__title', text: title }), body]);

  if (g.definition) wrap.appendChild(card('تعريف الخدمة', el('p', { class: 'guide-text', text: g.definition })));
  if (g.when && g.when.length) wrap.appendChild(card('متى تُقدّم؟', el('ul', { class: 'guide-list' }, g.when.map((x) => el('li', { text: x })))));
  if (g.procedure && g.procedure.length) wrap.appendChild(card('كيف تُقدّم؟ (آلية التنفيذ)', el('ol', { class: 'guide-steps' }, g.procedure.map((x) => el('li', { text: x })))));
  if (g.departments && g.departments.length) {
    wrap.appendChild(card('الدوائر المعنية ومسار التحويل', el('div', { class: 'chips' }, g.departments.map((x) => el('span', { class: 'chip', text: x })))));
  }
  if (g.flowchart) {
    const charts = Array.isArray(g.flowchart) ? g.flowchart : [g.flowchart];
    const body = el('div', { class: 'flow-wrap' }, charts.map((c) => {
      const src = typeof c === 'string' ? c : c.src;
      const cap = typeof c === 'string' ? null : c.label;
      const fig = el('figure', { class: 'flow-fig' }, [
        el('img', { class: 'flow-img', src, alt: cap || `المخطط الانسيابي للخدمة ${svc.formNumber}`, loading: 'lazy' }),
      ]);
      if (cap) fig.appendChild(el('figcaption', { class: 'flow-cap', text: cap }));
      return fig;
    }));
    wrap.appendChild(card('المخطط الانسيابي (Flowchart)', body));
  }
  return wrap;
}

/* ============================================================
   المعاينة المطابقة (Live preview of the original Word form)
   تعرض «نسخة النموذج الورقي الأصلي» مملوءة بقيم المستخدم تماماً
   كما ستُطبع — مأخوذة من قالب الجهة الرسمي (data/templates/<CODE>.docx).
   ============================================================ */
function renderPreview(code, svc) {
  App.previewZoom = null; // الوضع الافتراضي: ملاءمة تلقائية للعرض
  const wrap = el('div', { class: 'preview' });

  // شريط أدوات المعاينة
  const tools = el('div', { class: 'preview-bar app-chrome' }, [
    el('div', { class: 'preview-hint' }, [
      el('span', { class: 'preview-hint__ico', html: svgIcon('shield') }),
      el('span', { text: 'هذه معاينة حيّة مطابقة للنموذج الورقي الأصلي — تتحدّث تلقائياً كلما عدّلت البيانات في تبويب «تعبئة النموذج».' }),
    ]),
    el('div', { class: 'preview-toolrow' }, [
      // مجموعة التحكّم بالتكبير
      el('div', { class: 'zoom-ctrl', role: 'group', 'aria-label': 'التحكّم بحجم المعاينة' }, [
        el('button', { class: 'zoom-btn', type: 'button', title: 'تصغير', 'aria-label': 'تصغير', onclick: () => nudgeZoom(-0.1) }, [el('span', { class: 'zoom-ico', html: svgIcon('minus') })]),
        el('button', { id: 'zoomLabel', class: 'zoom-val', type: 'button', title: 'ملاءمة للعرض', 'aria-label': 'ملاءمة للعرض', onclick: () => resetZoom(), text: '100%' }),
        el('button', { class: 'zoom-btn', type: 'button', title: 'تكبير', 'aria-label': 'تكبير', onclick: () => nudgeZoom(0.1) }, [el('span', { class: 'zoom-ico', html: svgIcon('plus') })]),
      ]),
      el('div', { class: 'preview-actions' }, [
        btn('تحديث المعاينة', 'save', () => refreshPreview(code, svc, true)),
        btn('طباعة النموذج', 'wordprint', (e) => printWordCopy(code, svc, e), 'primary'),
        btn('تنزيل Word', 'word', (e) => downloadWord(code, svc, e)),
        btn('تصدير PDF', 'pdf', (e) => { toast('في نافذة الطباعة اختر «حفظ كـ PDF»', 'info'); setTimeout(() => printWordCopy(code, svc, e), 500); }),
      ]),
    ]),
  ]);
  wrap.appendChild(tools);

  // سطح المعاينة (ورق A4 بظل خفيف)
  const surface = el('div', { class: 'preview-surface', id: 'previewSurface' }, [
    el('div', { class: 'preview-loading' }, [
      el('span', { class: 'preview-spinner', 'aria-hidden': 'true' }),
      el('span', { text: 'جارٍ تجهيز المعاينة المطابقة للأصل…' }),
    ]),
  ]);
  wrap.appendChild(surface);

  // ارسم بعد إدراج العناصر في DOM
  setTimeout(() => refreshPreview(code, svc, false), 0);
  return wrap;
}

let _previewTimer = null;
async function refreshPreview(code, svc, manual) {
  const surface = $('#previewSurface');
  if (!surface) return;
  if (manual) {
    surface.innerHTML = '';
    surface.appendChild(el('div', { class: 'preview-loading' }, [
      el('span', { class: 'preview-spinner', 'aria-hidden': 'true' }),
      el('span', { text: 'جارٍ تحديث المعاينة…' }),
    ]));
  }
  try {
    const values = App.drafts[code] || {};
    await window.previewWord(code, values, surface, { fileName: svc.formNumber || code });
    fitPreview();
    if (manual) toast('تم تحديث المعاينة المطابقة', 'success');
  } catch (e) {
    console.error(e);
    surface.innerHTML = '';
    surface.appendChild(el('div', { class: 'preview-error' }, [
      el('p', { text: 'تعذّر عرض المعاينة المطابقة.' }),
      el('p', { class: 'empty-sub', text: (e && e.message) ? e.message : '' }),
      el('p', { class: 'empty-sub', text: 'يمكنك بدلاً من ذلك طباعة النموذج أو تنزيله بصيغة Word من الأزرار أعلاه.' }),
    ]));
  }
}

/* ملاءمة «الورقة» لعرض الحاوية بثبات في المنتصف ودون تشويه التخطيط:
   نُبقي عرض الصفحة الحقيقي (816px) ونُصغّر بصرياً عبر zoom عند الحاجة فقط. */
function fitWidthZoom(surface, sec) {
  // قِس العرض الطبيعي للصفحة بإلغاء أي تكبير سابق
  surface.style.setProperty('--pv-zoom', '1');
  const pageW = sec.getBoundingClientRect().width;
  if (!pageW) return 1;
  const cs = getComputedStyle(surface);
  const padInline = parseFloat(cs.paddingInlineStart || cs.paddingLeft || '0')
                  + parseFloat(cs.paddingInlineEnd || cs.paddingRight || '0');
  const avail = surface.clientWidth - padInline;
  return Math.min(1, Math.max(0.35, avail / pageW));
}

function applyZoomLabel(zoom, auto) {
  const lbl = $('#zoomLabel');
  if (lbl) lbl.textContent = (auto ? '' : '') + Math.round(zoom * 100) + '%';
}

function fitPreview() {
  const surface = $('#previewSurface');
  if (!surface) return;
  const sec = surface.querySelector('section.docx');
  if (!sec) return;

  const auto = (App.previewZoom == null);
  const zoom = auto ? fitWidthZoom(surface, sec) : App.previewZoom;
  surface.style.setProperty('--pv-zoom', String(zoom));
  applyZoomLabel(zoom, auto);
}

function nudgeZoom(delta) {
  const surface = $('#previewSurface');
  const sec = surface && surface.querySelector('section.docx');
  if (!sec) return;
  // ابدأ من القيمة الحالية (تلقائية أو يدوية)
  const current = (App.previewZoom == null) ? fitWidthZoom(surface, sec) : App.previewZoom;
  App.previewZoom = Math.min(2, Math.max(0.35, Math.round((current + delta) * 100) / 100));
  fitPreview();
}

function resetZoom() {
  App.previewZoom = null; // عودة للملاءمة التلقائية
  fitPreview();
  toast('ملاءمة المعاينة لعرض الشاشة', 'info');
}

// إعادة الملاءمة عند تغيير حجم النافذة (إن كان تبويب المعاينة مفتوحاً)
let _fitTimer = null;
window.addEventListener('resize', () => {
  if (!$('#previewSurface')) return;
  clearTimeout(_fitTimer);
  _fitTimer = setTimeout(fitPreview, 150);
}, { passive: true });

/* تحديث حيّ للمعاينة عند تعديل الحقول (debounced) إن كان التبويب مفتوحاً */
function scheduleLivePreview() {
  const surface = $('#previewSurface');
  if (!surface || !App.current) return;
  clearTimeout(_previewTimer);
  _previewTimer = setTimeout(() => {
    const svc = App.data.services[App.current];
    if (svc) refreshPreview(App.current, svc, false);
  }, 700);
}

/* ============================================================
   التوجيه (Router) والعرض
   ============================================================ */
function go(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
function route() {
  const render = () => {
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/service\/([A-Z]{2}\d{4})(?:\/(form|guide|preview))?/);
    if (m) renderServiceView(m[1], m[2] || 'form');
    else if (hash.startsWith('#/services')) renderServicesRegistry();
    else if (hash.startsWith('#/fees'))     renderFeesView();
    else if (hash.startsWith('#/guide'))    renderGuideView();
    else if (hash.startsWith('#/cases'))    renderCasesView();
    else renderHome();
  };
  // انتقال سلس بين الصفحات (View Transitions API) مع احترام تقليل الحركة
  if (typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
    const root = document.documentElement;
    root.dataset.vt = 'route';
    const tr = document.startViewTransition(render);
    tr.finished.finally(() => { if (root.dataset.vt === 'route') delete root.dataset.vt; });
  } else {
    render();
  }
}

const app = () => $('#app');

/* ============================================================
   DIWAN ROUTES — تفويض العرض للطبقة الجديدة (Skin & Views)
   ------------------------------------------------------------
   نُحافظ على renderHomeLegacy (التصميم القديم) كاحتياط، لكن
   كل المسارات الجديدة تستخدم Diwan.* لتنسجم مع شكل الديوان.
   ============================================================ */
function renderHome() {
  App.current = null;
  const a = app();
  if (!a) return;
  if (window.Diwan && typeof window.Diwan.renderHome === 'function') {
    window.Diwan.renderHome(a, App);
    setActiveNav('#/');
    enhanceView();
    return;
  }
  renderHomeLegacy();
}

function renderServicesRegistry() {
  App.current = null;
  const a = app();
  if (!a) return;
  if (window.Diwan && typeof window.Diwan.renderRegistry === 'function') {
    window.Diwan.renderRegistry(a, App, {});
    setActiveNav('#/');
    enhanceView();
  } else {
    renderHomeLegacy();
  }
}

function renderFeesView() {
  App.current = null;
  const a = app();
  if (!a) return;
  if (window.Diwan && typeof window.Diwan.renderFees === 'function') {
    window.Diwan.renderFees(a, App);
    enhanceView();
  } else renderHomeLegacy();
}

function renderGuideView() {
  App.current = null;
  const a = app();
  if (!a) return;
  if (window.Diwan && typeof window.Diwan.renderGuide === 'function') {
    window.Diwan.renderGuide(a, App);
    enhanceView();
  } else renderHomeLegacy();
}

function renderCasesView() {
  App.current = null;
  const a = app();
  if (!a) return;
  if (window.Diwan && typeof window.Diwan.renderCases === 'function') {
    window.Diwan.renderCases(a, App);
    enhanceView();
  } else renderHomeLegacy();
}

function renderHomeLegacy() {
  App.current = null;
  const meta = App.data.meta;
  const view = el('main', { class: 'view view--home' });

  // Hero + بحث
  const hero = el('section', { class: 'hero' }, [
    el('div', { class: 'hero-brand' }, [
      meta.logo ? el('img', { class: 'hero-logo', src: meta.logo, alt: `شعار ${meta.letterheadOrg || meta.company}` }) : null,
      el('div', { class: 'hero-brand__text' }, [
        el('span', { class: 'hero-company', text: meta.company }),
        el('span', { class: 'hero-sector', text: meta.sector }),
        meta.letterheadProject ? el('span', { class: 'hero-project', text: meta.letterheadProject }) : null,
        meta.letterheadOrg ? el('span', { class: 'hero-org' }, [
          el('span', { class: 'hero-org__spark', html: svgIcon('bolt') }),
          el('span', { text: meta.letterheadOrg }),
        ]) : null,
      ]),
    ]),
    el('div', { class: 'hero-inner' }, [
      el('h1', { class: 'hero-title', text: meta.appTitle }),
      el('p', { class: 'hero-sub', text: meta.appSubtitle }),
      el('div', { class: 'search search--hero' }, [
        el('span', { class: 'search-ico', html: svgIcon('search') }),
        el('input', { id: 'search', class: 'search-inp', type: 'search', placeholder: 'ابحث باسم الخدمة أو الكود (مثل: اشتراك، CS0001)…', 'aria-label': 'بحث عن خدمة', oninput: onSearch }),
      ]),
      el('div', { class: 'quick-search', 'aria-label': 'بحث سريع' }, [
        el('span', { class: 'quick-search__lbl', text: 'الأكثر طلباً:' }),
        ...['اشتراك', 'جباية', 'مقياس', 'شكوى', 'نقل'].map((term) =>
          el('button', { class: 'quick-chip', type: 'button', onclick: () => runQuickSearch(term) }, term)),
      ]),
    ]),
  ]);
  view.appendChild(hero);

  // شريط الثقة المؤسسي (Trust strip) — بديل أرقى لِلوحة الإحصائيات
  const all = Object.values(App.data.services);
  const total = all.length;
  const secCount = Object.keys(meta.sections).length;
  const trust = (icon, title, desc) => el('div', { class: 'trust-card' }, [
    el('span', { class: 'trust-card__ico', html: svgIcon(icon) }),
    el('div', { class: 'trust-card__body' }, [
      el('span', { class: 'trust-card__title' }, [title]), // يقبل نصاً أو عنصراً
      el('span', { class: 'trust-card__desc', text: desc }),
    ]),
  ]);
  // عدّاد متصاعد لإجمالي الخدمات (يبدأ من 0 عند الظهور)
  const totalNode = el('span', {}, [
    el('strong', { class: 'count-up', 'data-count-to': String(total) }, '0'),
    ` خدمة إلكترونية`,
  ]);
  view.appendChild(el('section', { class: 'trust', 'aria-label': 'معلومات النظام' }, [
    trust('shield', 'جهة رسمية موثوقة', `${meta.company} — ${meta.sector}`),
    trust('grid', totalNode, `موزّعة على ${secCount} أقسام رئيسية`),
    trust('print', 'طباعة مطابقة للأصل', 'نماذج A4 مطابقة للمستند الورقي الرسمي'),
  ]));

  // بطاقات الأقسام — شبكة Bento (أول قسم بارز/أكبر)
  const secWrap = el('div', { class: 'sections sections--bento' });
  Object.values(meta.sections).forEach((s, i) => {
    const done = Object.values(App.data.services).filter((x) => x.section === s.code && x.status === 'done').length;
    secWrap.appendChild(el('button', { class: `sec-card sec-card--${s.code}` + (i === 0 ? ' sec-card--feature' : ''), type: 'button', onclick: () => filterSection(s.code) }, [
      el('span', { class: 'sec-card__ico', html: svgIcon(s.icon) }),
      el('span', { class: 'sec-card__body' }, [
        el('span', { class: 'sec-card__name', text: `${s.name} (${s.code})` }),
        el('span', { class: 'sec-card__desc', text: s.desc }),
      ]),
      el('span', { class: 'sec-card__count', text: `${done}/${s.count}` }),
    ]));
  });
  view.appendChild(el('section', { class: 'sections-wrap' }, [
    el('div', { class: 'sections-head' }, [
      el('h2', { class: 'section-h', text: 'تصفّح حسب القسم' }),
      el('p', { class: 'section-sub', text: 'اختر القسم لعرض خدماته، أو ابحث مباشرةً في الأعلى.' }),
    ]),
    secWrap,
  ]));

  // شبكة الخدمات
  view.appendChild(el('section', { class: 'services-wrap' }, [
    el('div', { class: 'services-bar' }, [
      el('h2', { class: 'section-h', text: 'كل الخدمات' }),
      el('div', { class: 'filters', id: 'filters' }, ['الكل', 'CS', 'CB', 'CT', 'CA'].map((f) =>
        el('button', { class: 'filter' + (f === 'الكل' ? ' is-active' : ''), type: 'button', 'data-filter': f === 'الكل' ? '' : f, onclick: (e) => setFilter(e.target) }, f === 'الكل' ? 'الكل' : `${App.data.meta.sections[f].name}`))),
    ]),
    el('div', { id: 'grid', class: 'grid' }),
  ]));

  app().innerHTML = '';
  app().appendChild(view);
  renderGrid('');
  setActiveNav('#/');
  enhanceView();
}

function renderGrid(filter, query) {
  const grid = $('#grid'); if (!grid) return;
  grid.innerHTML = '';
  const q = (query || '').trim();
  let list = Object.entries(App.data.services).map(([code, svc]) => ({ code, ...svc }));
  if (filter) list = list.filter((s) => s.section === filter);
  if (q) list = list.filter((s) => (s.title + ' ' + s.code + ' ' + s.formNumber).toLowerCase().includes(q.toLowerCase()));
  if (!list.length) { grid.appendChild(el('div', { class: 'empty', text: 'لا توجد خدمات مطابقة للبحث.' })); return; }
  list.forEach((s) => {
    const sec = App.data.meta.sections[s.section];
    const card = el('a', { class: 'svc-card', href: `#/service/${s.code}` }, [
      el('div', { class: 'svc-card__top' }, [
        el('span', { class: `svc-badge svc-badge--${s.section}`, text: s.formNumber }),
        el('span', { class: 'svc-status svc-status--' + (s.status === 'done' ? 'done' : 'pending'), text: s.status === 'done' ? 'جاهزة' : 'قيد الإعداد' }),
      ]),
      el('h3', { class: 'svc-card__title', text: s.title }),
      el('div', { class: 'svc-card__foot' }, [
        el('span', { class: 'svc-card__sec', text: sec.name }),
        el('span', { class: 'svc-card__go', html: svgIcon('arrow') }),
      ]),
    ]);
    grid.appendChild(card);
  });
}

function onSearch(e) {
  const q = e.target.value;
  const active = $('#filters .filter.is-active');
  renderGrid(active ? active.dataset.filter : '', q);
}
function runQuickSearch(term) {
  const input = $('#search');
  if (input) { input.value = term; input.focus(); }
  const active = $('#filters .filter.is-active');
  renderGrid(active ? active.dataset.filter : '', term);
  const grid = $('#grid');
  if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function setFilter(btn) {
  $$('#filters .filter').forEach((b) => b.classList.remove('is-active'));
  btn.classList.add('is-active');
  renderGrid(btn.dataset.filter, $('#search') ? $('#search').value : '');
  if (typeof syncSpatialSectionFocus === 'function') syncSpatialSectionFocus(btn.dataset.filter || '');
}
function filterSection(code) {
  const btn = $(`#filters .filter[data-filter="${code}"]`);
  if (btn) { setFilter(btn); btn.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function renderServiceView(code, tab) {
  const svc = App.data.services[code];
  if (!svc) { renderHome(); return; }
  App.current = code;

  // —— Diwan path: editorial header + sub-tabs + reuse existing engines ——
  if (window.Diwan && typeof window.Diwan.renderServiceShell === 'function') {
    window.Diwan.renderServiceShell(app(), App, code, tab || 'form');
    // post-mount initialisations (same as legacy path)
    if ((tab || 'form') === 'form') {
      setSavedBadge(true);
      updateFieldMeter();
      centerSheetScroll();
      const sla = (draftOf(code).__sla) || 'standard';
      if (typeof applySLAContext === 'function') applySLAContext(sla);
    }
    setActiveNav('#/');
    window.scrollTo(0, 0);
    enhanceView();
    return;
  }

  // Legacy path (fallback if Diwan layer is unavailable)
  const sec = App.data.meta.sections[svc.section];
  const view = el('main', { class: 'view view--service' });

  // Breadcrumb
  view.appendChild(el('nav', { class: 'crumbs app-chrome', 'aria-label': 'مسار التصفّح' }, [
    el('a', { href: '#/', text: 'الرئيسية' }),
    el('span', { class: 'crumb-sep', text: '‹' }),
    el('span', { text: sec.name }),
    el('span', { class: 'crumb-sep', text: '‹' }),
    el('span', { class: 'crumb-current', text: svc.formNumber }),
  ]));

  // رأس الخدمة + الأدوات
  const head = el('header', { class: 'svc-head app-chrome' }, [
    el('div', { class: 'svc-head__info' }, [
      el('span', { class: `svc-badge svc-badge--${svc.section}`, text: svc.formNumber }),
      el('h1', { class: 'svc-head__title', text: svc.title }),
    ]),
    el('div', { class: 'svc-head__tools' }, toolbar(code, svc)),
  ]);
  view.appendChild(head);

  // التبويبات
  const canPreview = !!(window.canPreviewWord && window.canPreviewWord(code) && svc.form && svc.form.blocks);
  if (tab === 'preview' && !canPreview) tab = 'form';
  const panelId = `svc-panel-${code}-${tab}`;
  const tabDefs = [
    { id: 'form', label: 'تعبئة النموذج' },
    ...(canPreview ? [{ id: 'preview', label: 'المعاينة المطابقة', badge: 'كالأصل', extraClass: 'tab--preview' }] : []),
    { id: 'guide', label: 'شرح الخدمة' },
  ];
  const tabs = el('div', { class: 'tabs app-chrome', role: 'tablist', 'aria-label': 'أقسام الخدمة' }, tabDefs.map((t) => {
    const isActive = tab === t.id;
    const attrs = {
      class: 'tab' + (t.extraClass ? ` ${t.extraClass}` : '') + (isActive ? ' is-active' : ''),
      role: 'tab',
      id: `svc-tab-${code}-${t.id}`,
      href: `#/service/${code}/${t.id}`,
      'aria-selected': isActive ? 'true' : 'false',
      'aria-controls': `svc-panel-${code}-${t.id}`,
    };
    if (t.badge) {
      return el('a', attrs, [
        el('span', { text: t.label }),
        el('span', { class: 'tab-badge', text: t.badge }),
      ]);
    }
    return el('a', Object.assign(attrs, { text: t.label }));
  }));
  view.appendChild(tabs);

  const body = el('div', {
    class: 'svc-body',
    id: panelId,
    role: 'tabpanel',
    'aria-labelledby': `svc-tab-${code}-${tab}`,
  });
  if (tab === 'guide') body.appendChild(renderGuide(svc));
  else if (tab === 'preview') body.appendChild(renderPreview(code, svc));
  else {
    body.appendChild(renderWorkspace(code, svc));
  }
  view.appendChild(body);

  app().innerHTML = '';
  app().appendChild(view);
  if (tab === 'form') {
    setSavedBadge(true);
    updateFieldMeter();
    centerSheetScroll();
    const sla = (draftOf(code).__sla) || 'standard';
    if (typeof applySLAContext === 'function') applySLAContext(sla);
  }
  setActiveNav('#/');
  window.scrollTo(0, 0);
  enhanceView();
}

/* ============================================================
   مساحة عمل خدمة العملاء (Customer Service Command Center)
   تخطيط مزدوج: النموذج يساراً (60%) + لوحة Agent Assist يميناً (40%)
   ============================================================ */
function renderWorkspace(code, svc) {
  const d = draftOf(code);
  ensureCaseRef(d);

  const main = el('div', { class: 'ws-main' });
  main.appendChild(renderCommandBar(code, svc, d));

  if (svc.form && svc.form.blocks) {
    main.appendChild(el('div', { class: 'form-stage' }, [
      renderFormModeBar(code, svc),
      el('div', { class: 'sheet-scroll' }, [renderForm(code, svc)]),
    ]));
  } else {
    main.appendChild(el('div', { class: 'empty empty--lg' }, [
      el('p', { text: `نموذج «${svc.title}» قيد الإعداد ضمن المراحل اللاحقة.` }),
      el('p', { class: 'empty-sub', text: 'الأساس والمحرّك جاهزان — تتم إضافة بيانات هذا النموذج لاحقاً دون تعديل الكود.' }),
    ]));
  }

  main.appendChild(renderNotesAndMacros(code, svc, d));

  const side = renderAgentAssist(code, svc);

  return el('section', { class: 'workspace', 'aria-label': 'مساحة عمل خدمة العملاء' }, [main, side]);
}

const SLA_LABELS = { urgent: 'عاجل', standard: 'قياسي', vip: 'كبار العملاء' };
const SLA_HINTS = {
  urgent: 'استجابة خلال 4 ساعات — تصعيد فوري عند التأخير',
  standard: 'استجابة خلال 24–48 ساعة وفق دليل الخدمة',
  vip: 'مشترك مميّز — استجابة خلال ساعة وتنسيق مع المشرف',
};

const FEE_RECEIPT_FIELDS = new Set([
  'receiptNo', 'receiptFeeNo', 'receipt_service_no', 'meterTypeCostReceiptNo',
  'meterLocationCostReceiptNo', 'meterCheckCostReceiptNo',
]);
const PRICING_DRAFT_KEYS = new Set(['subClass', 'feedType', 'meterType', 'meterLocation', 'violationType']);

function formatIQD(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null;
  return amount.toLocaleString('ar-IQ').replace(/,/g, '٬') + ' د.ع';
}

function pricingRowText(row) {
  if (!row) return null;
  if (typeof row.amount === 'number') return formatIQD(row.amount);
  return row.amountText || null;
}

function resolveServicePrice(svc, draft) {
  const p = svc.pricing;
  const empty = { label: 'رسوم الخدمة', value: '—', hint: null, year: null };
  if (!p) return empty;
  const d = draft || {};
  const subClass = String(d.subClass || '').trim();
  const feed = String(d.feedType || '');
  const isThree = /ثلاث/.test(feed);
  const base = { label: p.label || 'رسوم الخدمة', year: p.year || 2026 };

  if (p.mode === 'none') return { ...base, value: p.display || 'بدون رسوم ثابتة', hint: null };
  if (p.mode === 'fixed' || p.mode === 'variable') {
    return { ...base, value: p.display || pricingRowText(p) || '—', hint: p.notes || p.service || null };
  }
  if (p.mode === 'by_class') {
    const tier = (p.tiers && subClass && p.tiers[subClass]) || (p.tiers && p.tiers['منزلي']);
    return {
      ...base,
      value: tier ? (pricingRowText(tier) || p.display) : (p.display || 'حدّد صنف الاشتراك'),
      hint: tier ? (tier.service || subClass) : 'اختر صنف الاشتراك في النموذج',
    };
  }
  if (p.mode === 'by_class_phase') {
    const tiers = p.tiers && subClass ? p.tiers[subClass] : null;
    if (!tiers) return { ...base, value: p.display, hint: 'حدّد صنف الاشتراك ونوع التغذية' };
    const row = isThree ? tiers.three : tiers.single;
    return {
      ...base,
      value: pricingRowText(row) || p.display,
      hint: feed ? (isThree ? 'ثلاثي الطور' : 'أحادي الطور') : 'حدّد نوع التغذية في النموذج',
    };
  }
  if (p.mode === 'compound') {
    return {
      ...base,
      value: p.display || '—',
      hint: (p.parts || []).map((x) => x.service).filter(Boolean).join(' · ') || null,
    };
  }
  if (p.mode === 'meter_replace') {
    const meter = isThree ? 'ثلاثي' : 'احادي';
    const key = subClass ? `${subClass}_${meter}` : '';
    const tier = key && p.tiers ? p.tiers[key] : null;
    return {
      ...base,
      value: tier ? (pricingRowText(tier) || p.display) : (p.display || 'حدّد الصنف ونوع المقياس'),
      hint: subClass ? `${subClass} · ${meter === 'ثلاثي' ? 'ثلاثي الطور' : 'أحادي الطور'}` : null,
    };
  }
  if (p.mode === 'meter_inspection') {
    const loc = /موقع/.test(String(d.meterLocation || d.meterCheckReasons || '')) ? 'موقع' : 'مقر';
    const key = `${loc}_${isThree ? 'ثلاثي' : 'احادي'}`;
    const tier = p.tiers ? p.tiers[key] : null;
    return {
      ...base,
      value: tier ? (pricingRowText(tier) || p.display) : (p.display || 'حدّد موقع الفحص ونوع المقياس'),
      hint: `${loc === 'موقع' ? 'في موقع العمل' : 'في مقر الشركة'} · ${isThree ? 'ثلاثي' : 'أحادي'}`,
    };
  }
  if (p.mode === 'tamper') {
    return { ...base, value: p.display, hint: 'تُحدد حسب نوع المخالفة والصنف — راجع جدول الغرامات 2026' };
  }
  return { ...base, value: p.display || '—', hint: null };
}

function pricingChip(svc, draft, compact) {
  const pr = resolveServicePrice(svc, draft);
  if (!pr.value || pr.value === '—') return null;
  return el('span', {
    class: 'price-chip' + (compact ? ' price-chip--compact' : ''),
    title: [pr.label, pr.hint, pr.year ? `جدول ${pr.year}` : ''].filter(Boolean).join(' — '),
  }, [
    el('span', { class: 'price-chip__lbl', text: pr.label }),
    el('strong', { class: 'price-chip__val', text: pr.value }),
  ]);
}

function renderCommandBar(code, svc, d) {
  const sec = App.data.meta.sections[svc.section];
  const sla = d.__sla || 'standard';

  const slaTag = (value, label) => {
    const active = sla === value;
    return el('button', {
      class: `sla-tag sla-tag--${value}${active ? ' is-active' : ''}`,
      type: 'button',
      role: 'radio',
      'data-sla': value,
      'aria-checked': active ? 'true' : 'false',
      title: SLA_HINTS[value],
      onclick: () => setSLA(value),
    }, [
      el('span', { class: 'sla-dot', 'aria-hidden': 'true' }),
      el('span', { class: 'sla-tag__lbl', text: label }),
    ]);
  };

  const customer = (d.subscriberName && String(d.subscriberName).trim()) || 'لم يُحدَّد بعد';
  const phone = (d.phone && String(d.phone).trim()) || '—';
  const price = resolveServicePrice(svc, d);

  return el('div', { class: 'cc-bar app-chrome' }, [
    el('div', { class: 'cc-bar__row cc-bar__row--top' }, [
      el('div', { class: 'cc-id' }, [
        el('span', { class: 'cc-id__lbl', text: 'الرقم المرجعي للحالة' }),
        el('strong', { class: 'cc-id__val', id: 'caseRefVal', text: d.__caseRef || '' }),
        el('button', {
          class: 'cc-id__copy',
          type: 'button',
          'aria-label': 'نسخ الرقم المرجعي',
          title: 'نسخ',
          onclick: () => copyCaseRef(d.__caseRef),
        }, [el('span', { class: 'cc-id__copy-ico', text: '⧉' })]),
      ]),
      el('div', { class: 'cc-section' }, [
        el('span', { class: `cc-section__pill cc-section__pill--${svc.section}`, text: sec.code }),
        el('span', { class: 'cc-section__name', text: sec.name }),
        el('span', { class: 'cc-section__sep', 'aria-hidden': 'true', text: '·' }),
        el('span', { class: 'cc-section__form', text: svc.formNumber }),
      ]),
      el('div', { class: 'sla-group', role: 'radiogroup', 'aria-label': 'تصنيف أولوية الخدمة (SLA)' }, [
        el('span', { class: 'sla-group__lbl', text: 'الأولوية:' }),
        slaTag('urgent', SLA_LABELS.urgent),
        slaTag('standard', SLA_LABELS.standard),
        slaTag('vip', SLA_LABELS.vip),
      ]),
    ]),
    el('div', { class: 'cc-bar__row cc-bar__row--meta' }, [
      el('div', { class: 'cc-meta' }, [
        el('span', { class: 'cc-meta__lbl', text: 'العميل' }),
        el('strong', { class: 'cc-meta__val', id: 'cc-cust', text: customer }),
      ]),
      el('div', { class: 'cc-meta' }, [
        el('span', { class: 'cc-meta__lbl', text: 'الهاتف' }),
        el('strong', { class: 'cc-meta__val', id: 'cc-phone', dir: 'ltr', text: phone }),
      ]),
      el('div', { class: 'cc-meta cc-meta--sla' }, [
        el('span', { class: 'cc-meta__lbl', text: 'تنبيه SLA' }),
        el('span', { class: 'cc-meta__val cc-meta__hint', id: 'cc-slaHint', text: SLA_HINTS[sla] }),
      ]),
      el('div', { class: 'cc-meta cc-meta--pricing' }, [
        el('span', { class: 'cc-meta__lbl', text: price.label + (price.year ? ` (${price.year})` : '') }),
        el('strong', { class: 'cc-meta__val cc-meta__price', id: 'cc-pricing-val', text: price.value }),
        price.hint ? el('span', { class: 'cc-meta__hint', id: 'cc-pricing-hint', text: price.hint }) : el('span', { class: 'cc-meta__hint', id: 'cc-pricing-hint', style: 'display:none' }),
      ]),
      el('div', { class: 'cc-meta cc-meta--actions' }, [
        el('button', {
          class: 'btn btn--primary btn--sentiment-positive cc-print',
          type: 'button',
          onclick: () => printResolutionDoc(code, svc),
        }, [
          el('span', { class: 'btn-ico', html: svgIcon('print') }),
          el('span', { text: 'طباعة مستند الحلّ' }),
        ]),
      ]),
    ]),
  ]);
}

function setSLA(value) {
  const code = App.current; if (!code) return;
  const d = draftOf(code);
  d.__sla = value;
  saveDrafts();
  $$('.sla-tag').forEach((b) => {
    const on = b.dataset.sla === value;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  const hint = $('#cc-slaHint');
  if (hint) hint.textContent = SLA_HINTS[value] || '';
  if (typeof applySLAContext === 'function') applySLAContext(value);
  toast(`تم تحديد الأولوية: ${SLA_LABELS[value]}`, value === 'urgent' ? 'error' : (value === 'vip' ? 'success' : 'info'));
}

function copyCaseRef(ref) {
  if (!ref) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(ref).then(() => toast('تم نسخ الرقم المرجعي', 'success')).catch(() => toast('تعذّر النسخ', 'error'));
  } else {
    try {
      const ta = document.createElement('textarea');
      ta.value = ref;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('تم نسخ الرقم المرجعي', 'success');
    } catch (e) { toast('تعذّر النسخ', 'error'); }
  }
}

/* تحديث ملخّص العميل أعلى المساحة عند تعديل الحقول الأساسية */
function refreshCommandBar(name, value) {
  if (name === 'subscriberName') {
    const n = $('#cc-cust');
    if (n) n.textContent = (value && String(value).trim()) || 'لم يُحدَّد بعد';
  } else if (name === 'phone') {
    const n = $('#cc-phone');
    if (n) n.textContent = (value && String(value).trim()) || '—';
  }
}

function refreshPricingDisplay() {
  const code = App.current;
  if (!code || !App.data.services[code]) return;
  const svc = App.data.services[code];
  const pr = resolveServicePrice(svc, draftOf(code));
  const val = $('#cc-pricing-val');
  const hint = $('#cc-pricing-hint');
  if (val) val.textContent = pr.value;
  if (hint) {
    if (pr.hint) { hint.textContent = pr.hint; hint.style.display = ''; }
    else { hint.textContent = ''; hint.style.display = 'none'; }
  }
  const aaVal = $('#aa-pricing-val');
  const aaHint = $('#aa-pricing-hint');
  if (aaVal) aaVal.textContent = pr.value;
  if (aaHint && pr.hint) aaHint.textContent = pr.hint;
  $$('.price-chip__val', $('#formSheet') || document).forEach((n) => { n.textContent = pr.value; });
}

/* ---------- ملاحظات الوكيل + الإجراءات السريعة (Macros) ---------- */
const QUICK_MACROS = [
  { label: 'الزبون غير متاح', icon: '☎' },
  { label: 'تم اختبار الخط — مستقر', icon: '✓' },
  { label: 'تمت الإحالة للمستوى الثاني', icon: '↗' },
  { label: 'تم حلّ الإشكال', icon: '✔' },
  { label: 'بانتظار الوثائق', icon: '⏳' },
  { label: 'تمت جدولة المتابعة', icon: '📅' },
  { label: 'إحالة فنية', icon: '⚡' },
  { label: 'إعادة محاولة لاحقاً', icon: '↻' },
];

function renderNotesAndMacros(code, svc, d) {
  const card = el('section', { class: 'notes-card', 'aria-label': 'مفكرة وكيل الخدمة' });
  card.appendChild(el('div', { class: 'notes-card__head' }, [
    el('h3', { class: 'notes-card__h' }, [
      el('span', { class: 'notes-card__ico', html: svgIcon('save') }),
      el('span', { text: 'ملاحظات وكيل الخدمة' }),
    ]),
    el('span', { class: 'notes-card__sub', text: 'استخدم الإدراج السريع لتوثيق الإجراء بطابع زمني تلقائي' }),
  ]));

  const macrosWrap = el('div', { class: 'macros', role: 'toolbar', 'aria-label': 'إجراءات سريعة' });
  QUICK_MACROS.forEach((m) => {
    macrosWrap.appendChild(el('button', {
      class: 'macro-chip',
      type: 'button',
      onclick: () => appendMacro(m.label),
    }, [
      el('span', { class: 'macro-chip__ico', text: m.icon }),
      el('span', { class: 'macro-chip__lbl', text: m.label }),
    ]));
  });
  card.appendChild(macrosWrap);

  const ta = el('textarea', {
    class: 'notes-area',
    id: 'agentNotes',
    'data-name': 'agentNotes',
    rows: '6',
    dir: 'auto',
    placeholder: 'سجّل ملاحظات الاتصال أو ملخّص الحالة هنا — أو استخدم شرائح الإدراج السريع أعلاه.',
  });
  ta.value = (d.agentNotes != null) ? String(d.agentNotes) : '';
  ta.addEventListener('input', () => {
    d.agentNotes = ta.value;
    scheduleSave();
    updateNotesCounter();
  });

  card.appendChild(ta);

  card.appendChild(el('div', { class: 'notes-card__foot' }, [
    el('span', { class: 'notes-card__counter', id: 'notesCounter', text: '0 حرف · 0 سطر' }),
    el('div', { class: 'notes-card__actions' }, [
      el('button', { class: 'notes-mini', type: 'button', onclick: () => insertTimestamp(), text: '⏱ ختم وقت' }),
      el('button', { class: 'notes-mini notes-mini--danger', type: 'button', onclick: () => clearNotes() }, 'مسح الملاحظات'),
    ]),
  ]));

  setTimeout(updateNotesCounter, 0);
  return card;
}

function updateNotesCounter() {
  const ta = $('#agentNotes'); const c = $('#notesCounter');
  if (!ta || !c) return;
  const v = ta.value || '';
  const lines = v ? v.split(/\r?\n/).length : 0;
  c.textContent = `${v.length} حرف · ${lines} سطر`;
}

function appendMacro(text) {
  const ta = $('#agentNotes');
  if (!ta) return;
  const code = App.current; if (!code) return;
  const d = draftOf(code);
  const stamp = currentTimeStamp();
  const prefix = ta.value && !ta.value.endsWith('\n') ? '\n' : '';
  // أمان XSS: نُضيف عبر .value فقط (نص خام)
  ta.value += `${prefix}[${stamp}] ${text}\n`;
  d.agentNotes = ta.value;
  saveDrafts();
  updateNotesCounter();
  ta.focus();
  ta.scrollTop = ta.scrollHeight;
  toast('تم إدراج الإجراء السريع', 'info');
}

function insertTimestamp() {
  const ta = $('#agentNotes'); if (!ta) return;
  const stamp = currentTimeStamp(true);
  const prefix = ta.value && !ta.value.endsWith('\n') ? '\n' : '';
  ta.value += `${prefix}— ${stamp} —\n`;
  const code = App.current; if (code) draftOf(code).agentNotes = ta.value;
  saveDrafts();
  updateNotesCounter();
  ta.focus();
  ta.scrollTop = ta.scrollHeight;
}

function clearNotes() {
  if (!confirm('سيتم مسح ملاحظات هذا الطلب. هل أنت متأكد؟')) return;
  const ta = $('#agentNotes'); if (!ta) return;
  ta.value = '';
  const code = App.current; if (code) draftOf(code).agentNotes = '';
  saveDrafts();
  updateNotesCounter();
}

function currentTimeStamp(full) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (!full) return t;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${t}`;
}

/* ---------- لوحة المساعدة الذكية (Agent Assist) ---------- */
function renderAgentAssist(code, svc) {
  const sec = App.data.meta.sections[svc.section];
  const all = (App.data.meta.agentAssist) || {};
  const aid = all[svc.section] || {};
  const wrap = el('aside', { class: 'agent-assist app-chrome', 'aria-label': 'لوحة المساعدة الذكية للوكيل' });

  wrap.appendChild(el('div', { class: 'aa-head' }, [
    el('span', { class: 'aa-pill' }, [
      el('span', { class: 'aa-pill__dot', 'aria-hidden': 'true' }),
      el('span', { text: 'Agent Assist · مباشر' }),
    ]),
    el('h2', { class: 'aa-title', text: `بروتوكول ${sec.name} (${sec.code})` }),
    el('p', { class: 'aa-desc', text: aid.intro || sec.desc }),
  ]));

  const d = draftOf(code);
  const pr = resolveServicePrice(svc, d);
  if (svc.pricing) {
    wrap.appendChild(el('section', { class: 'aa-card aa-card--pricing' }, [
      el('h3', { class: 'aa-h' }, [
        el('span', { class: 'aa-h__num', text: 'د.ع' }),
        el('span', { class: 'aa-h__t', text: `أجور الخدمة ${pr.year || 2026}` }),
      ]),
      el('div', { class: 'aa-pricing' }, [
        el('div', { class: 'aa-pricing__main' }, [
          el('span', { class: 'aa-pricing__lbl', text: pr.label }),
          el('strong', { class: 'aa-pricing__val', id: 'aa-pricing-val', text: pr.value }),
        ]),
        pr.hint ? el('p', { class: 'aa-pricing__hint', id: 'aa-pricing-hint', text: pr.hint }) : null,
        svc.pricing.mode === 'by_class' && svc.pricing.tiers ? el('ul', { class: 'aa-pricing__tiers' },
          Object.entries(svc.pricing.tiers).map(([cls, row]) => el('li', {}, [
            el('span', { text: cls }),
            el('strong', { text: pricingRowText(row) || '—' }),
          ])),
        ) : null,
      ].filter(Boolean)),
    ]));
  }

  // 01 — Service Protocol (use guide procedure if richer)
  const guideProc = svc.guide && Array.isArray(svc.guide.procedure) ? svc.guide.procedure : null;
  const proto = (guideProc && guideProc.length) ? guideProc : (aid.protocol || []);
  if (proto.length) {
    wrap.appendChild(el('section', { class: 'aa-card aa-card--proto' }, [
      el('h3', { class: 'aa-h' }, [
        el('span', { class: 'aa-h__num', text: '01' }),
        el('span', { class: 'aa-h__t', text: 'بروتوكول الخدمة' }),
        el('span', { class: 'aa-h__cnt', text: `${proto.length} خطوة` }),
      ]),
      el('ol', { class: 'aa-list aa-list--steps' }, proto.map((p) => el('li', { class: 'aa-step' }, [
        el('span', { class: 'aa-step__bullet', 'aria-hidden': 'true' }),
        el('span', { class: 'aa-step__t', text: p }),
      ]))),
    ]));
  }

  // 02 — Recommended Agent Script
  const baseScript = (aid.script || []);
  const customer = (d.subscriberName && String(d.subscriberName).trim()) || '[اسم المشترك]';
  const ref = d.__caseRef || '[سيُولَّد عند الحفظ]';
  const dynamicScript = baseScript.length ? baseScript : [
    `السلام عليكم ${customer}، أنا [الاسم] من خدمة عملاء ${App.data.meta.company}.`,
    'كيف أستطيع مساعدتكم اليوم؟ يرجى تزويدي برقم الحساب أو البطاقة الموحّدة.',
    `سأسجّل طلبكم تحت الرقم المرجعي ${ref}.`,
  ];

  wrap.appendChild(el('section', { class: 'aa-card aa-card--script' }, [
    el('h3', { class: 'aa-h' }, [
      el('span', { class: 'aa-h__num', text: '02' }),
      el('span', { class: 'aa-h__t', text: 'النصّ الموصى به للوكيل' }),
    ]),
    el('div', { class: 'aa-script' }, dynamicScript.map((s) => el('blockquote', { class: 'aa-q' }, [
      el('span', { class: 'aa-q__mark', text: '«' }),
      el('span', { class: 'aa-q__t', text: s }),
      el('span', { class: 'aa-q__mark', text: '»' }),
    ]))),
    el('button', {
      class: 'aa-script__copy',
      type: 'button',
      onclick: () => copyScript(dynamicScript),
    }, [
      el('span', { class: 'btn-ico', html: svgIcon('export') }),
      el('span', { text: 'نسخ النصّ كاملاً' }),
    ]),
  ]));

  // 03 — Escalation Rules
  const esc = aid.escalation || [];
  if (esc.length) {
    wrap.appendChild(el('section', { class: 'aa-card aa-card--esc' }, [
      el('h3', { class: 'aa-h' }, [
        el('span', { class: 'aa-h__num', text: '03' }),
        el('span', { class: 'aa-h__t', text: 'قواعد التصعيد' }),
        el('span', { class: 'aa-h__warn', text: '!' }),
      ]),
      el('ul', { class: 'aa-list aa-list--esc' }, esc.map((e) => el('li', { class: 'aa-esc' }, [
        el('span', { class: 'aa-esc__bullet', 'aria-hidden': 'true', text: '!' }),
        el('span', { class: 'aa-esc__t', text: e }),
      ]))),
    ]));
  }

  // 04 — Quick links to in-app guide / preview
  wrap.appendChild(el('section', { class: 'aa-card aa-card--links' }, [
    el('h3', { class: 'aa-h' }, [
      el('span', { class: 'aa-h__num', text: '04' }),
      el('span', { class: 'aa-h__t', text: 'إجراءات سريعة' }),
    ]),
    el('div', { class: 'aa-links' }, [
      el('a', { class: 'aa-link', href: `#/service/${code}/guide` }, [el('span', { class: 'aa-link__ico', html: svgIcon('shield') }), el('span', { text: 'الدليل الكامل للخدمة' })]),
      el('a', { class: 'aa-link', href: `#/service/${code}/preview` }, [el('span', { class: 'aa-link__ico', html: svgIcon('print') }), el('span', { text: 'معاينة النموذج للطباعة' })]),
      el('a', { class: 'aa-link', href: '#/' }, [el('span', { class: 'aa-link__ico', html: svgIcon('grid') }), el('span', { text: 'قائمة الخدمات الكاملة' })]),
    ]),
  ]));

  return wrap;
}

function copyScript(lines) {
  const txt = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(() => toast('تم نسخ نصّ الوكيل', 'success')).catch(() => toast('تعذّر النسخ', 'error'));
  } else {
    toast('تعذّر النسخ في هذا المتصفح', 'error');
  }
}

/* ============================================================
   محرّك مستند الحلّ الرسمي (Resolution Print Engine)
   يبني وثيقة A4 رسمية ويغيّر تخطيط الطباعة بالكامل عبر body class
   ============================================================ */
function printResolutionDoc(code, svc) {
  const d = draftOf(code);
  ensureCaseRef(d);
  const meta = App.data.meta;
  const sec = meta.sections[svc.section];
  const sla = d.__sla || 'standard';
  const slaText = SLA_LABELS[sla] || 'قياسي';

  // إزالة أي مستند سابق لتفادي التكرار
  const old = document.getElementById('resolutionSheet');
  if (old) old.remove();

  const sheet = el('article', {
    id: 'resolutionSheet',
    class: 'rsd',
    dir: 'rtl',
    role: 'document',
    'aria-label': 'مستند حلّ خدمة العملاء',
  });

  // ترويسة رسمية
  sheet.appendChild(el('header', { class: 'rsd-head' }, [
    el('div', { class: 'rsd-brand' }, [
      meta.logo ? el('img', { class: 'rsd-logo', src: meta.logo, alt: '' }) : null,
      el('div', { class: 'rsd-brand__t' }, [
        el('div', { class: 'rsd-brand__co', text: meta.company }),
        el('div', { class: 'rsd-brand__sec', text: meta.sector }),
        meta.letterheadOrg ? el('div', { class: 'rsd-brand__org', text: meta.letterheadOrg }) : null,
      ]),
    ]),
    el('div', { class: 'rsd-meta' }, [
      el('div', { class: 'rsd-doc-title', text: 'مستند حلّ خدمة العميل' }),
      el('div', { class: 'rsd-doc-sub', text: 'Customer Service Resolution Document' }),
      el('div', { class: `rsd-sla rsd-sla--${sla}`, text: slaText }),
      el('div', { class: 'rsd-ref' }, [
        el('span', { class: 'rsd-ref__lbl', text: 'الرقم المرجعي:' }),
        el('strong', { class: 'rsd-ref__val', text: d.__caseRef || '—' }),
      ]),
    ]),
  ]));

  const customerRows = [
    ['اسم المشترك', d.subscriberName],
    ['رقم البطاقة الموحّدة', d.nationalId],
    ['رقم الهاتف', d.phone],
    ['رقم الحساب', d.accountNo],
    ['العنوان', [d.district, d.mahalla, d.zuqaq, d.dar].filter(Boolean).join(' / ')],
    ['نقطة دالّة / GPS', [d.landmark, d.gps].filter(Boolean).join(' — ')],
  ];
  sheet.appendChild(rsdInfoBlock('بيانات العميل', customerRows));

  const serviceRows = [
    ['القسم', `${sec.name} (${sec.code})`],
    ['الخدمة', svc.title],
    ['رقم النموذج', svc.formNumber],
    ['الأولوية (SLA)', `${slaText} — ${SLA_HINTS[sla]}`],
    ['تاريخ الطلب', d.requestDate || formatTodayDDMMYYYY()],
    ['المركز', d.centerName || ''],
    ['رقم المركز', d.centerNo || ''],
  ];
  sheet.appendChild(rsdInfoBlock('تفاصيل الخدمة', serviceRows));

  // كتلة الإجراءات / الملاحظات
  const notesBlock = el('section', { class: 'rsd-block rsd-block--notes' }, [
    el('h3', { class: 'rsd-h', text: 'ملاحظات وإجراءات وكيل الخدمة' }),
    el('div', { class: 'rsd-notes', text: (d.agentNotes && d.agentNotes.trim()) ? d.agentNotes : '— لا توجد ملاحظات مسجّلة لهذا الطلب —' }),
  ]);
  sheet.appendChild(notesBlock);

  // الإقرار / النص القانوني المختصر
  sheet.appendChild(el('section', { class: 'rsd-block rsd-block--legal' }, [
    el('h3', { class: 'rsd-h', text: 'إقرار الاستلام' }),
    el('p', { class: 'rsd-legal', text: 'أُقرّ أنا المشترك الموقّع أدناه باستلام الإجابة الرسمية على طلبي/شكواي بالرقم المرجعي أعلاه، وأنّ البيانات المدوّنة صحيحة ومسؤوليتها تقع عليّ، ويحقّ لي مراجعة المركز خلال المدد المعتمدة في حال وجود اعتراض.' }),
  ]));

  // كتلة التواقيع
  sheet.appendChild(el('section', { class: 'rsd-sign', 'aria-label': 'حقول التوقيع' }, [
    rsdSignCol('توقيع المشترك'),
    rsdSignCol('توقيع موظف خدمة العملاء'),
    rsdSignCol('توقيع مسؤول المركز'),
  ]));

  // الذيل — ::after يحقن طابع الطباعة عبر CSS
  const ts = currentTimeStamp(true);
  sheet.appendChild(el('footer', {
    class: 'rsd-foot',
    'data-timestamp': ts,
  }, [
    el('span', { class: 'rsd-foot__id', text: d.__caseRef || '' }),
    el('span', { class: 'rsd-foot__co', text: `${meta.company} — ${meta.sector}` }),
  ]));

  document.body.appendChild(sheet);
  document.body.classList.add('print-resolution');

  const cleanup = () => {
    document.body.classList.remove('print-resolution');
    const node = document.getElementById('resolutionSheet');
    if (node) node.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  // احتياطياً عند المتصفحات التي لا تطلق afterprint
  setTimeout(() => { if (document.body.classList.contains('print-resolution')) cleanup(); }, 60000);

  setTimeout(() => window.print(), 80);
}

function rsdInfoBlock(title, rows) {
  return el('section', { class: 'rsd-block' }, [
    el('h3', { class: 'rsd-h', text: title }),
    el('table', { class: 'rsd-tbl' }, [
      el('tbody', {}, rows.map(([lbl, val]) => el('tr', {}, [
        el('th', { class: 'rsd-tbl__lbl', text: lbl }),
        el('td', { class: 'rsd-tbl__val', text: (val != null && String(val).trim() !== '') ? String(val) : '—' }),
      ]))),
    ]),
  ]);
}

function rsdSignCol(label) {
  return el('div', { class: 'rsd-sign__col' }, [
    el('span', { class: 'rsd-sign__line', 'aria-hidden': 'true' }),
    el('span', { class: 'rsd-sign__lbl', text: label }),
    el('span', { class: 'rsd-sign__date', text: 'التاريخ: ............... / ............... / ...............' }),
  ]);
}

function formatTodayDDMMYYYY() {
  const d = new Date();
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');
}

/* توسيط ورقة A4 أفقياً داخل حاوية التمرير (يصحّح انحراف RTL) */
let sheetScrollRO = null;
function centerSheetScroll() {
  const scroller = $('.sheet-scroll');
  if (!scroller) return;
  const run = () => {
    const offset = scroller.scrollWidth - scroller.clientWidth;
    scroller.scrollLeft = offset > 0 ? offset / 2 : 0;
  };
  requestAnimationFrame(run);
  if (typeof ResizeObserver !== 'undefined') {
    if (sheetScrollRO) sheetScrollRO.disconnect();
    sheetScrollRO = new ResizeObserver(() => requestAnimationFrame(run));
    sheetScrollRO.observe(scroller);
    const sheet = scroller.querySelector('.sheet');
    if (sheet) sheetScrollRO.observe(sheet);
  }
}

function toolbar(code, svc) {
  const has = svc.form && svc.form.blocks;
  const tools = [];
  if (!has) return tools;

  const statusCluster = el('div', { class: 'action-cluster action-cluster--status tool-status' }, [
    el('span', { id: 'saveBadge', class: 'save-badge is-saved', text: 'تم الحفظ تلقائياً' }),
    el('span', { id: 'fieldMeter', class: 'field-meter', title: 'نسبة الحقول المعبّأة' }, [
      el('span', { class: 'field-meter__track' }, [el('span', { class: 'field-meter__fill' })]),
      el('span', { class: 'field-meter__val', text: '0%' }),
    ]),
  ]);
  tools.push(statusCluster);

  const hasWord = window.hasWordTemplate && window.hasWordTemplate(code);
  const primaryCluster = el('div', { class: 'action-cluster action-cluster--primary' });
  const secondaryCluster = el('div', { class: 'action-cluster action-cluster--secondary' });

  // زر الطباعة الموحّد — يوجّه تلقائياً حسب وضع النموذج المختار:
  //   وضع "الأصلي" + قالب Word متاح → نسخة Word طبق الأصل (RAR)
  //   وضع "الذكي" → نسخة HTML المتطوّرة بعزل clone-to-body
  primaryCluster.appendChild(btn('طباعة النموذج', 'print', (e) => printUnified(code, svc, e), 'primary', 'positive'));
  if (hasWord) {
    secondaryCluster.appendChild(btn('تنزيل Word', 'word', (e) => downloadWord(code, svc, e), null, 'positive'));
  }

  const more = [];
  // إتاحة المسارَين يدوياً للمستخدم المتقدّم (تجاوز التوجيه الذكي)
  if (hasWord) more.push({ text: 'طباعة Word الأصلية', icon: 'wordprint', onclick: (e) => printWordCopy(code, svc, e), sentiment: 'positive' });
  more.push({ text: 'طباعة HTML الذكية', icon: 'print', onclick: () => printFormSheet(), sentiment: 'positive' });
  more.push({ text: 'تصدير PDF', icon: 'pdf', onclick: (e) => { toast('في نافذة الطباعة اختر «حفظ كـ PDF»', 'info'); setTimeout(() => printUnified(code, svc, e), 500); }, sentiment: 'positive' });
  more.push('sep');
  more.push({ text: 'حفظ المسودة', icon: 'save', onclick: () => { saveDrafts(); toast('تم حفظ المسودة', 'success'); }, sentiment: 'positive' });
  more.push({ text: 'تصدير بيانات (JSON)', icon: 'export', onclick: () => exportJSON(code, svc), sentiment: 'positive' });
  more.push({ text: 'استيراد بيانات (JSON)', icon: 'import', onclick: () => importJSON(code) });
  more.push('sep');
  more.push({ text: 'مسح النموذج', icon: 'clear', variant: 'danger', sentiment: 'critical', onclick: () => clearForm(code) });
  secondaryCluster.appendChild(overflowMenu(more));

  const dock = el('div', { class: 'action-dock', role: 'toolbar', 'aria-label': 'إجراءات النموذج' }, [primaryCluster, secondaryCluster]);
  tools.push(dock);

  return tools;
}
function btn(text, icon, onclick, variant, sentiment) {
  const cls = 'btn'
    + (variant ? ` btn--${variant}` : '')
    + (sentiment ? ` btn--sentiment-${sentiment}` : '');
  return el('button', { class: cls, onclick, type: 'button' }, [
    el('span', { class: 'btn-ico', html: svgIcon(icon) }), el('span', { text }),
  ]);
}

/* ---------- قائمة منسدلة «المزيد» (Overflow menu) ---------- */
function overflowMenu(items) {
  const list = el('div', { class: 'menu-list', role: 'menu' });
  items.forEach((it) => {
    if (it === 'sep') { list.appendChild(el('div', { class: 'menu-sep', role: 'separator' })); return; }
    list.appendChild(el('button', {
      class: 'menu-item'
        + (it.variant ? ` menu-item--${it.variant}` : '')
        + (it.sentiment ? ` menu-item--sentiment-${it.sentiment}` : ''),
      type: 'button', role: 'menuitem',
      onclick: () => { closeAllMenus(); it.onclick(); },
    }, [el('span', { class: 'menu-ico', html: svgIcon(it.icon) }), el('span', { text: it.text })]));
  });
  const trigger = el('button', {
    class: 'btn menu-trigger', type: 'button',
    'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'إجراءات إضافية',
    onclick: (e) => { e.stopPropagation(); toggleMenu(wrap); },
  }, [el('span', { class: 'btn-ico', html: svgIcon('more') }), el('span', { text: 'المزيد' })]);
  const wrap = el('div', { class: 'menu' }, [trigger, list]);
  return wrap;
}
function toggleMenu(wrap) {
  const willOpen = !wrap.classList.contains('is-open');
  closeAllMenus();
  if (willOpen) {
    wrap.classList.add('is-open');
    const t = wrap.querySelector('.menu-trigger');
    const list = wrap.querySelector('.menu-list');
    if (t) t.setAttribute('aria-expanded', 'true');
    // تموضع ثابت (fixed) لتفادي القصّ من الحاويات ذات overflow:hidden
    if (t && list) positionMenu(t, list);
  }
}
function positionMenu(trigger, list) {
  const r = trigger.getBoundingClientRect();
  const w = list.offsetWidth || 252;
  const rtl = getComputedStyle(document.documentElement).direction === 'rtl';
  let left = rtl ? Math.round(r.right - w) : Math.round(r.left);
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  list.style.top = Math.round(r.bottom + 8) + 'px';
  list.style.left = left + 'px';
  list.style.right = 'auto';
}
function closeAllMenus() {
  $$('.menu.is-open').forEach((m) => {
    m.classList.remove('is-open');
    const t = m.querySelector('.menu-trigger');
    if (t) t.setAttribute('aria-expanded', 'false');
  });
}

/* ---------- مؤشّر نسبة التعبئة ---------- */
function updateFieldMeter() {
  const sheet = $('#formSheet');
  const meter = $('#fieldMeter');
  if (!sheet || !meter) return;
  const inps = $$('.inp:not(.inp--ro):not(.inp--ref)', sheet);
  const total = inps.length;
  const filled = inps.filter((i) => (i.value || '').trim() !== '').length;
  const required = inps.filter((i) => i.hasAttribute('data-required'));
  const requiredMissing = required.filter((i) => !(i.value || '').trim()).length;
  const pct = total ? Math.round((filled / total) * 100) : 0;
  const fill = meter.querySelector('.field-meter__fill');
  const val = meter.querySelector('.field-meter__val');
  if (fill) fill.style.width = pct + '%';
  if (val) val.textContent = pct + '%';
  meter.classList.toggle('is-complete', pct === 100 && total > 0);
  meter.classList.toggle('is-missing-required', requiredMissing > 0);
  meter.title = requiredMissing > 0
    ? `${filled}/${total} — ينقص ${requiredMissing} حقل إلزامي`
    : `تم تعبئة ${filled} من ${total} حقلاً`;
}

/* ---------- إجراءات الأدوات ---------- */
function clearForm(code) {
  if (!confirm('سيتم مسح جميع البيانات المُدخلة لهذا النموذج. هل أنت متأكد؟')) return;
  delete App.drafts[code];
  saveDrafts();
  renderServiceView(code, 'form');
  toast('تم مسح النموذج', 'success');
}
function exportJSON(code, svc) {
  const data = { code, formNumber: svc.formNumber, title: svc.title, savedAt: new Date().toISOString(), values: App.drafts[code] || {} };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `${code}.json` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('تم تصدير بيانات الطلب', 'success');
}
function importJSON(code) {
  const inp = el('input', { type: 'file', accept: 'application/json' });
  inp.addEventListener('change', () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (obj.code && obj.code !== code) {
          toast(`هذا الملف يخص خدمة أخرى (${obj.code})`, 'error');
          return;
        }
        App.drafts[code] = obj.values || obj;
        saveDrafts();
        renderServiceView(code, 'form');
        toast('تم استيراد البيانات بنجاح', 'success');
      } catch { toast('ملف JSON غير صالح', 'error'); }
    };
    r.readAsText(f);
  });
  inp.click();
}

/* ---------- تنزيل ملف Word من القالب الرسمي ---------- */
async function downloadWord(code, svc, ev) {
  const btn = ev && ev.currentTarget;
  await withBusy(btn, async () => {
    try {
      const values = App.drafts[code] || {};
      toast('جارٍ توليد ملف Word…', 'info');
      await window.generateWord(code, values, { fileName: svc.formNumber || code });
      toast('تم تنزيل ملف Word', 'success');
    } catch (e) {
      console.error(e);
      toast('تعذّر توليد ملف Word: ' + (e && e.message ? e.message : ''), 'error');
    }
  });
}

/* ============================================================
   عزل الطباعة — نهج "Clone-to-Body Isolation"
   ------------------------------------------------------------
   بدل إخفاء سلسلة الحاويات الطويلة (#app → view → svc-body →
   workspace → ws-main → form-stage → sheet-scroll)، نستنسخ
   #formSheet إلى حاوية #printRoot مباشرة تحت <body>، فتُلغى
   تماماً أي تسرّبات padding/position/transform من وضع الشاشة.
   ============================================================ */
function syncClonedInputs(src, dst) {
  // cloneNode(true) لا ينسخ القيم الحية للإدخال — نزامنها يدوياً
  const srcEls = src.querySelectorAll('input, textarea, select');
  const dstEls = dst.querySelectorAll('input, textarea, select');
  const n = Math.min(srcEls.length, dstEls.length);
  for (let i = 0; i < n; i++) {
    const s = srcEls[i], d = dstEls[i];
    if (!s || !d) continue;
    const type = (s.type || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      if (s.checked) { d.checked = true; d.setAttribute('checked', 'checked'); }
      else { d.checked = false; d.removeAttribute('checked'); }
    } else if (s.tagName === 'SELECT') {
      d.value = s.value;
      Array.from(d.options).forEach((o) => {
        if (o.value === s.value) o.setAttribute('selected', 'selected');
        else o.removeAttribute('selected');
      });
    } else if (s.tagName === 'TEXTAREA') {
      d.value = s.value;
      d.textContent = s.value;
    } else {
      d.value = s.value;
      if (s.value != null && s.value !== '') d.setAttribute('value', s.value);
      else d.removeAttribute('value');
    }
  }
}

function isolatedPrint(mode) {
  // مسار المعاينة (طباعة Word/docx) — يستخدم body.print-preview كما كان
  if (mode === 'preview') {
    document.body.classList.add('print-preview');
    const cleanup = () => {
      document.body.classList.remove('print-preview');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => { if (document.body.classList.contains('print-preview')) cleanup(); }, 60000);
    requestAnimationFrame(() => window.print());
    return;
  }

  // مسار طباعة النموذج — استنساخ #formSheet إلى #printRoot
  const sheet = document.getElementById('formSheet');
  if (!sheet) {
    if (typeof toast === 'function') toast('لم يتم العثور على ورقة النموذج', 'error');
    return;
  }
  const variant = (App.current) ? getFormMode(App.current) : 'original';

  // تنظيف أي طباعة سابقة عالقة
  const stale = document.getElementById('printRoot');
  if (stale) stale.remove();

  const clone = sheet.cloneNode(true);
  clone.id = 'printSheet';
  clone.removeAttribute('aria-hidden');
  syncClonedInputs(sheet, clone);

  // طابع زمني للطباعة (يُستخدم في الـcolophon)
  try {
    const ts = currentTimeStamp(true);
    clone.setAttribute('data-print-stamp', ts);
    if (App.current && App.data && App.data.services[App.current]) {
      clone.setAttribute('data-form-no', App.data.services[App.current].formNumber || App.current);
    }
  } catch (e) { /* non-fatal */ }

  const root = document.createElement('div');
  root.id = 'printRoot';
  root.className = 'print-root print-root--' + variant;
  root.setAttribute('aria-hidden', 'true');
  root.appendChild(clone);
  document.body.appendChild(root);

  const classes = ['is-printing', 'is-printing--' + variant];
  document.body.classList.add(...classes);

  const cleanup = () => {
    const r = document.getElementById('printRoot');
    if (r) r.remove();
    document.body.classList.remove(...classes);
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => { if (document.body.classList.contains('is-printing')) cleanup(); }, 60000);

  requestAnimationFrame(() => window.print());
}

function printFormSheet() {
  if (!validateForm($('#formSheet'))) {
    toast('يرجى تصحيح الحقول المطلوبة قبل الطباعة', 'error');
    return;
  }
  isolatedPrint('form');
}

/* ============================================================
   Unified Print Router — توجيه الطباعة حسب وضع النموذج
   ------------------------------------------------------------
   • وضع "original" + قالب Word متاح → printWord (مطابقة 1:1 لِملف Word
     الأصلي من ملف RAR — أعلى دقة، شُكلت من المصدر الحقيقي).
   • وضع "smart" → isolatedPrint('form') (نسخة HTML الذكية المستنسخة
     مع تصميم متطوّر، بدقة عزل clone-to-body).
   • أي حالة بدون قالب Word → fallback إلى مسار HTML.
   ============================================================ */
async function printUnified(code, svc, ev) {
  const btn = ev && ev.currentTarget;
  await withBusy(btn, async () => {
    try {
      const sheet = $('#formSheet');
      if (!sheet) { toast('لم يتم العثور على النموذج', 'error'); return; }
      if (!validateForm(sheet)) {
        toast('يرجى تصحيح الحقول المطلوبة قبل الطباعة', 'error');
        return;
      }
      const mode = getFormMode(code);
      const hasWord = !!(window.hasWordTemplate && window.hasWordTemplate(code));
      const useWord = (mode === 'original') && hasWord;

      if (useWord) {
        const values = App.drafts[code] || {};
        toast('جارٍ تجهيز نسخة Word الأصلية للطباعة…', 'info');
        const res = await window.printWord(code, values, { fileName: svc.formNumber || code });
        if (res && res.mode === 'external') toast('افتح الملف في Word ثم اطبع (Ctrl+P)', 'info');
        else toast('فُتحت نافذة طباعة النموذج الأصلي', 'success');
      } else {
        // مسار HTML المعزول (vetment للذكي أو fallback للأصلي بلا قالب)
        toast(mode === 'smart' ? 'جارٍ طباعة النموذج الذكي…' : 'جارٍ طباعة النموذج…', 'info');
        isolatedPrint('form');
      }
    } catch (e) {
      console.error(e);
      toast('تعذّر تحضير الطباعة: ' + (e && e.message ? e.message : ''), 'error');
    }
  });
}

/* ---------- طباعة نسخة Word مباشرة (نفس ملف الوورد) ---------- */
// ملاحظة: الاسم مختلف عن window.printWord (في docxgen.js) لتفادي تظليل الدالة العامة.
async function printWordCopy(code, svc, ev) {
  const btn = ev && ev.currentTarget;
  await withBusy(btn, async () => {
    try {
      if (!validateForm($('#formSheet'))) { toast('يرجى تصحيح الحقول المطلوبة قبل الطباعة', 'error'); return; }
      const values = App.drafts[code] || {};
      toast('جارٍ تجهيز نسخة Word للطباعة…', 'info');
      const res = await window.printWord(code, values, { fileName: svc.formNumber || code });
      if (res && res.mode === 'external') toast('افتح الملف في Word ثم اطبع (Ctrl+P)', 'info');
      else toast('تم فتح نافذة طباعة نسخة Word', 'success');
    } catch (e) {
      console.error(e);
      toast('تعذّر تحضير نسخة Word: ' + (e && e.message ? e.message : ''), 'error');
    }
  });
}

/* ---------- التنقل العلوي + الوضع الليلي ---------- */
function setActiveNav() {}
function setThemeIcon() {
  const t = $('#themeToggle');
  if (!t) return;
  const dark = document.body.classList.contains('dark');
  t.innerHTML = dark ? svgIcon('sun') : svgIcon('moon');
  t.setAttribute('aria-label', dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي');
  t.setAttribute('title', dark ? 'الوضع النهاري' : 'الوضع الليلي');
  t.setAttribute('aria-pressed', dark ? 'true' : 'false');
}

function applyTheme(toDark) {
  document.body.classList.toggle('dark', toDark);
  localStorage.setItem('cs_theme', toDark ? 'dark' : 'light');
  setThemeIcon();
}

function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function initTheme() {
  const saved = localStorage.getItem('cs_theme');
  const prefersDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  // الأولوية لاختيار المستخدم المحفوظ، وإلا نتبع تفضيل النظام (لمسة احترافية)
  if (saved === 'dark' || (!saved && prefersDark)) document.body.classList.add('dark');
  setThemeIcon();

  const t = $('#themeToggle');
  if (!t) return;
  if (t.dataset.themeBound) return; // تفادي ربط مزدوج (idempotent)
  t.dataset.themeBound = '1';
  t.addEventListener('click', (e) => {
    const toDark = !document.body.classList.contains('dark');
    // كشف دائري ناعم عند تبديل الوضع (View Transitions API) مع احترام تقليل الحركة
    if (typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
      const root = document.documentElement;
      root.style.setProperty('--vt-x', (e.clientX || window.innerWidth) + 'px');
      root.style.setProperty('--vt-y', (e.clientY || 0) + 'px');
      root.dataset.vt = 'theme';
      const tr = document.startViewTransition(() => applyTheme(toDark));
      tr.finished.finally(() => { delete root.dataset.vt; });
    } else {
      applyTheme(toDark);
    }
  });
}

/* ---------- زر العودة إلى الأعلى ---------- */
function initBackToTop() {
  if ($('#toTop')) return;
  const btn = el('button', {
    id: 'toTop', class: 'to-top app-chrome', type: 'button',
    'aria-label': 'العودة إلى أعلى الصفحة', title: 'إلى الأعلى',
    html: svgIcon('up'),
    onclick: () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }),
  });
  document.body.appendChild(btn);
  const onScroll = () => btn.classList.toggle('is-show', window.scrollY > 520);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================================
   ترقية الثيم — تفاعلية وحركات (Next-Level)
   ============================================================ */

/* خلفية Aurora حيّة */
function initAurora() {
  if (document.querySelector('.aurora')) return;
  const a = el('div', { class: 'aurora', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')]);
  document.body.insertBefore(a, document.body.firstChild);
}

/* ترويسة زجاجية تتقلّص عند التمرير */
function initHeaderScroll() {
  const tb = $('.topbar');
  if (!tb) return;
  const onScroll = () => tb.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* عدّاد رقمي متصاعد */
function animateCount(node, to, dur) {
  to = Number(to) || 0;
  if (prefersReducedMotion()) { node.textContent = String(to); return; }
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / (dur || 1200));
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    node.textContent = String(Math.round(to * eased));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let _revealIO = null, _countIO = null;
function revealObserver() {
  if (_revealIO) return _revealIO;
  if (!('IntersectionObserver' in window)) { _revealIO = { observe: (n) => n.classList.add('in-view') }; return _revealIO; }
  _revealIO = new IntersectionObserver((entries, obs) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in-view'); obs.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  return _revealIO;
}
function countObserver() {
  if (_countIO) return _countIO;
  if (!('IntersectionObserver' in window)) { _countIO = { observe: (n) => animateCount(n, n.dataset.countTo, 1200) }; return _countIO; }
  _countIO = new IntersectionObserver((entries, obs) => {
    entries.forEach((en) => { if (en.isIntersecting) { animateCount(en.target, en.target.dataset.countTo, 1200); obs.unobserve(en.target); } });
  }, { threshold: 0.6 });
  return _countIO;
}

/* تفعيل الكشف بالتمرير + العدّادات على المحتوى المعروض حالياً */
function enhanceView() {
  const a = app();
  if (!a) return;
  const ro = revealObserver();
  const vh = window.innerHeight || 800;
  a.querySelectorAll('.trust, .sections-wrap, .services-wrap, .guide').forEach((n) => {
    if (n.hasAttribute('data-reveal')) return;
    n.setAttribute('data-reveal', '');
    // ما هو ظاهر فوراً يُكشف بلا وميض؛ وما تحت الطيّة يُكشف عند التمرير
    if (n.getBoundingClientRect().top < vh * 0.92) n.classList.add('in-view');
    else ro.observe(n);
  });
  const co = countObserver();
  a.querySelectorAll('.count-up[data-count-to]').forEach((n) => {
    if (n.dataset.counted) return;
    n.dataset.counted = '1';
    co.observe(n);
  });
  if (typeof enhanceSpatialCommandCenter === 'function') enhanceSpatialCommandCenter();
}

/* إمالة 3D + إضاءة تتبع المؤشر للبطاقات + زر أساسي مغناطيسي (مؤشّر دقيق فقط) */
function initPointerFx() {
  if (window.matchMedia && !window.matchMedia('(pointer: fine)').matches) return;
  const CARD = '.sec-card, .svc-card, .trust-card';
  const onMove = (e) => {
    if (prefersReducedMotion()) return;
    const card = e.target.closest && e.target.closest(CARD);
    if (card) {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      const rx = (0.5 - y / r.height) * 8;
      const ry = (x / r.width - 0.5) * 8;
      card.classList.add('is-tilting');
      card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
    }
    const btn = e.target.closest && e.target.closest('.btn--primary');
    if (btn) {
      const r = btn.getBoundingClientRect();
      const mx = Math.max(-8, Math.min(8, (e.clientX - (r.left + r.width / 2)) * 0.35));
      const my = Math.max(-6, Math.min(6, (e.clientY - (r.top + r.height / 2)) * 0.35));
      btn.style.transform = 'translate(' + mx.toFixed(1) + 'px,' + my.toFixed(1) + 'px)';
    }
  };
  const reset = (e) => {
    const card = e.target.closest && e.target.closest(CARD);
    if (card && !(e.relatedTarget && card.contains(e.relatedTarget))) { card.style.transform = ''; card.classList.remove('is-tilting'); }
    const btn = e.target.closest && e.target.closest('.btn--primary');
    if (btn && !(e.relatedTarget && btn.contains(e.relatedTarget))) { btn.style.transform = ''; }
  };
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerout', reset, { passive: true });
}

/* هيكل تحميل عظمي يُعرض ريثما تُحمَّل البيانات */
function renderSkeleton() {
  const a = app();
  if (!a) return;
  const skCard = () => el('div', { class: 'sk-card' }, [
    el('div', { class: 'sk sk-badge' }),
    el('div', { class: 'sk sk-line sk-title' }),
    el('div', { class: 'sk sk-line sk-sub' }),
  ]);
  const grid = el('div', { class: 'sk-grid' });
  for (let i = 0; i < 8; i++) grid.appendChild(skCard());
  a.innerHTML = '';
  a.appendChild(el('div', { class: 'sk-wrap', 'aria-hidden': 'true' }, [el('div', { class: 'sk sk-hero' }), grid]));
}

/* ============================================================
   أيقونات SVG مضمّنة (بلا اعتماديات)
   ============================================================ */
function svgIcon(name) {
  const I = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0V8zM12 16v6"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h3M3 10h18"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
    clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
    export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    import: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="m9 12 2 2 4-4"/></svg>',
    word: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m8 13 1.5 5 1.5-3.5L12.5 18 14 13"/></svg>',
    wordprint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V3h9l3 3v3"/><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  };
  return I[name] || '';
}

/* ============================================================
   PHASE 3 — Cognitive Spatial Command Center
   طبقة إضافية: عمق مكاني، SLA متكيّف، تفاعلات دقيقة، Ergonomics
   ============================================================ */

const SLA_BODY_CLASSES = ['sla-standard', 'sla-urgent', 'sla-vip'];

function ensureSpatialLiveRegion() {
  if ($('#spatialLive')) return;
  document.body.appendChild(el('div', {
    id: 'spatialLive',
    class: 'visually-hidden',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  }));
}

function applySLAContext(value) {
  const v = SLA_BODY_CLASSES.includes(`sla-${value}`) ? value : 'standard';
  SLA_BODY_CLASSES.forEach((c) => document.body.classList.remove(c));
  document.body.classList.add(`sla-${v}`);
  document.body.dataset.sla = v;
  const esc = $('.aa-card--esc');
  if (esc) esc.setAttribute('aria-expanded', v === 'urgent' ? 'true' : 'false');
  const live = $('#spatialLive');
  if (live) live.textContent = `تم ضبط أولوية الخدمة على: ${SLA_LABELS[v] || v}`;
}

function spatialShakeField(inp) {
  if (!inp || prefersReducedMotion()) return;
  inp.classList.remove('inp--shake');
  void inp.offsetWidth;
  inp.classList.add('inp--shake');
  const done = () => { inp.classList.remove('inp--shake'); inp.removeEventListener('animationend', done); };
  inp.addEventListener('animationend', done);
}

function syncSpatialSectionFocus(filter) {
  $$('.sec-card').forEach((card) => {
    const m = card.className.match(/sec-card--(\w+)/);
    const code = m ? m[1] : '';
    const on = filter && code === filter;
    card.classList.toggle('is-spatial-focus', on);
    if (on) card.setAttribute('aria-current', 'true');
    else card.removeAttribute('aria-current');
  });
}

function markSpatialWorkspaceActive() {
  const ws = $('.ws-main');
  const tab = $('.tab.is-active');
  const isForm = tab && (tab.getAttribute('href') || '').endsWith('/form');
  if (ws) ws.classList.toggle('spatial-workspace-active', !!isForm);
}

function enhanceSpatialDepth() {
  const depthTargets = '.sec-card, .svc-card, .trust-card, .guide-card, .notes-card, .aa-card, .cc-bar, .hero, .svc-head, .preview-bar';
  $$(depthTargets).forEach((node) => node.classList.add('spatial-depth'));
  markSpatialWorkspaceActive();
  const activeFilter = $('#filters .filter.is-active');
  if (activeFilter) syncSpatialSectionFocus(activeFilter.dataset.filter || '');
}

function tagSentimentControls(root) {
  if (!root) return;
  root.querySelectorAll('.macro-chip').forEach((chip) => chip.classList.add('btn--sentiment-positive'));
  root.querySelectorAll('.notes-mini--danger').forEach((btn) => btn.classList.add('btn--sentiment-critical'));
  root.querySelectorAll('.aa-card--esc .aa-script__copy').forEach((btn) => btn.classList.add('btn--sentiment-critical'));
  root.querySelectorAll('.cc-print, .btn--primary').forEach((btn) => {
    if (!btn.classList.contains('btn--sentiment-positive') && !btn.classList.contains('btn--sentiment-critical')) {
      btn.classList.add('btn--sentiment-positive');
    }
  });
}

function enhanceSpatialCommandCenter() {
  const a = app();
  if (!a) return;
  enhanceSpatialDepth();
  tagSentimentControls(a);
  const code = App.current;
  if (code) {
    const sla = (draftOf(code).__sla) || 'standard';
    applySLAContext(sla);
  }
}

function initSpatialCommandCenter() {
  ensureSpatialLiveRegion();
  document.body.classList.add('spatial-enabled');
  if (!document.body.dataset.sla) applySLAContext('standard');
}

/* ============================================================
   Command Shell — تفعيل أزرار الـ Dock العائم + إبراز العنصر النشط
   في السايدبار الجانبية مع تبدّل الـ hash
   ============================================================ */
function initCommandShell() {
  // زر "أعلى الصفحة"
  const toTop = document.getElementById('cmdToTop');
  if (toTop) {
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
  // زر "بحث سريع" — يركّز حقل البحث في الصفحة الرئيسية، أو يعود للرئيسية ثم يركّز
  const search = document.getElementById('cmdSearchOpen');
  if (search) {
    search.addEventListener('click', () => {
      const inp = document.getElementById('search');
      if (inp) { inp.focus(); inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (location.hash !== '#/') location.hash = '#/';
      setTimeout(() => { const i = document.getElementById('search'); if (i) i.focus(); }, 80);
    });
  }
  // إبراز رابط القسم النشط في السايدبار بحسب الـ hash
  const railLinks = Array.from(document.querySelectorAll('.cmd-rail__link'));
  const syncActive = () => {
    const h = location.hash || '#/';
    railLinks.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const match = href === h || (href !== '#/' && h.startsWith(href));
      a.classList.toggle('is-active', match);
    });
    // الرئيسية: نشطة إن لم تطابق أي قسم وكان الـ hash = '#/'
    if (h === '#/' && railLinks[0]) { railLinks.forEach((a) => a.classList.remove('is-active')); railLinks[0].classList.add('is-active'); }
  };
  syncActive();
  window.addEventListener('hashchange', syncActive);
}

/* ============================================================
   الإقلاع
   ============================================================ */
async function boot() {
  loadDrafts();
  renderSkeleton();
  try {
    const res = await fetch('data/services.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    App.data = await res.json();
  } catch (e) {
    app().innerHTML = '';
    app().appendChild(el('div', { class: 'fatal' }, [
      el('h2', { text: 'تعذّر تحميل بيانات الخدمات' }),
      el('p', { text: 'يجب تشغيل الموقع عبر خادم محلي (لا بفتح الملف مباشرة). مثال:' }),
      el('code', { class: 'fatal-code', text: 'python3 -m http.server 8000' }),
      el('p', { text: 'ثم افتح: http://localhost:8000' }),
    ]));
    return;
  }
  // expose engine helpers to the Diwan view layer
  window.renderGuide = renderGuide;
  window.renderPreview = renderPreview;
  window.renderWorkspace = renderWorkspace;
  window.resolveServicePrice = resolveServicePrice;

  // initialise Diwan shell (wire ticker, clock, nav sync)
  if (window.Diwan && typeof window.Diwan.boot === 'function') {
    try { window.Diwan.boot(App); } catch (e) { console.error('Diwan.boot failed', e); }
  }

  initTheme();
  initBackToTop();
  initAurora();
  initHeaderScroll();
  initPointerFx();
  initSpatialCommandCenter();
  initCommandShell();
  // إغلاق القوائم المنسدلة عند النقر خارجها أو بمفتاح Esc
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeAllMenus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllMenus(); });
  window.addEventListener('scroll', () => { if (document.querySelector('.menu.is-open')) closeAllMenus(); }, { passive: true });
  window.addEventListener('hashchange', route);
  route();
}
document.addEventListener('DOMContentLoaded', boot);
