/* Shared DOM/helpers for platform skin modules */
'use strict';

(function (global) {
  const C = {};

  C.$ = (sel, root) => (root || document).querySelector(sel);
  C.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  C.el = function el(tag, attrs, children) {
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
  };

  C.icon = function icon(name, size) {
    return C.el('span', {
      class: 'material-symbols-outlined',
      style: { fontSize: (size || 20) + 'px' },
      'aria-hidden': 'true',
      text: name,
    });
  };

  C.btn = function btn(label, opts) {
    opts = opts || {};
    const cls = ['rs-btn',
      opts.variant === 'primary' && 'rs-btn--primary',
      opts.variant === 'ghost' && 'rs-btn--ghost',
      opts.variant === 'danger' && 'rs-btn--danger',
      opts.size === 'lg' && 'rs-btn--lg',
      opts.size === 'sm' && 'rs-btn--sm',
      opts.class || '',
    ].filter(Boolean).join(' ');
    const kids = [
      opts.icon ? C.el('span', { class: 'rs-btn__ico' }, [C.icon(opts.icon, 18)]) : null,
      label,
    ];
    if (opts.href) return C.el('a', { class: cls, href: opts.href, onclick: opts.onclick }, kids);
    return C.el('button', { type: opts.type || 'button', class: cls, onclick: opts.onclick, disabled: opts.disabled }, kids);
  };

  C.tag = function tag(text, variant) {
    return C.el('span', { class: 'rs-tag' + (variant ? ' rs-tag--' + variant : '') }, [
      C.el('span', { class: 'rs-tag__dot' }),
      text,
    ]);
  };

  C.secBadge = (code) => C.el('span', { class: 'rs-secbadge rs-secbadge--' + code, text: code });

  C.crumbs = function crumbs(trail) {
    const nav = C.el('nav', { class: 'rs-crumbs', 'aria-label': 'مسار التصفّح' });
    trail.forEach((it, i) => {
      if (i > 0) nav.appendChild(C.el('span', { class: 'rs-crumbs__sep', text: '›' }));
      if (it.href) nav.appendChild(C.el('a', { href: it.href, text: it.label }));
      else nav.appendChild(C.el('span', { class: 'rs-crumbs__current', text: it.label }));
    });
    return nav;
  };

  C.fmtIQDInt = function (n) {
    if (typeof n !== 'number' || !isFinite(n)) return null;
    return new Intl.NumberFormat('ar-IQ').format(n).replace(/,/g, '٬') + ' د.ع';
  };

  C.fmtDateAr = function (d) {
    try {
      return d.toLocaleDateString('ar-IQ-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch (e) {
      return d.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  };

  C.pad2 = (n) => String(n).padStart(2, '0');

  C.SECTION_COLORS = { CS: '#1d4ed8', CT: '#b45309', CB: '#0e7490', CA: '#b91c1c' };
  C.SECTION_ICONS = { CS: 'apartment', CT: 'electrical_services', CB: 'receipt_long', CA: 'report' };
  C.SECTION_BLURB = {
    CS: 'فتح اشتراكات جديدة، نقل ملكية، تغيير الصنف، إيقاف وتفعيل الاشتراكات.',
    CT: 'فحص المقاييس، تغيير الكابلات والأعمدة، تعديل القوة والجهد، تغيير الموقع.',
    CB: 'دفع القوائم، التقسيط، التسويات المالية، نسخ القوائم وتقارير الاستهلاك.',
    CA: 'إبلاغات التلاعب والأخطار، الشكاوى الإدارية وأضرار الشبكة العامة.',
  };

  C.parseHashParams = function (hash) {
    const out = {};
    const m = (hash || '').match(/\?(.+)$/);
    if (!m) return out;
    m[1].split('&').forEach((kv) => {
      const [k, v] = kv.split('=');
      if (k) out[decodeURIComponent(k)] = v == null ? '' : decodeURIComponent(v);
    });
    return out;
  };

  global.PlatformCore = C;
})(window);
