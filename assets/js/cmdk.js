/* ============================================================
   Command Palette (⌘K / Ctrl+K) — vanilla JS
   ============================================================ */
'use strict';

(function (global) {
  let open = false;
  let sel = 0;
  let q = '';
  let root = null;
  let panel = null;
  let input = null;
  let list = null;

  function icon(name, size) {
    const s = document.createElement('span');
    s.className = 'material-symbols-outlined';
    s.setAttribute('aria-hidden', 'true');
    s.style.fontSize = (size || 20) + 'px';
    s.textContent = name;
    return s;
  }

  function buildItems() {
    const items = [];
    items.push({ kind: 'nav', t: 'الرئيسية', s: 'لوحة العمل', ico: 'dashboard', href: '#/' });
    items.push({ kind: 'nav', t: 'كل الخدمات', s: 'دليل الخدمات الرسمي', ico: 'apps', href: '#/services' });
    items.push({ kind: 'nav', t: 'الحالات النشطة', s: 'مسوّداتك المحفوظة', ico: 'inventory_2', href: '#/cases' });
    items.push({ kind: 'nav', t: 'جدول الأجور', s: 'الأسعار الرسمية ٢٠٢٦', ico: 'request_quote', href: '#/fees' });
    items.push({ kind: 'nav', t: 'دليل الإجراءات', s: 'شرح موحّد للموظفين', ico: 'menu_book', href: '#/guide' });

    const App = global.App;
    if (App && App.data && App.data.services) {
      const meta = App.data.meta || {};
      Object.entries(App.data.services).forEach(([code, svc]) => {
        const sec = meta.sections && meta.sections[svc.section];
        items.push({
          kind: 'svc',
          t: svc.title || code,
          s: code + ' · ' + (sec ? sec.name : svc.section),
          ico: 'description',
          href: '#/service/' + code,
          keys: [code.toLowerCase(), (svc.title || '').toLowerCase(), sec ? sec.name : ''],
        });
      });
    }

    const drafts = (App && App.drafts) || {};
    Object.keys(drafts).forEach((code) => {
      if (!App.data || !App.data.services[code]) return;
      const svc = App.data.services[code];
      const d = drafts[code] || {};
      const who = (d.subscriberName && String(d.subscriberName).trim()) || 'مسوّدة بدون اسم';
      items.push({
        kind: 'case',
        t: who,
        s: (d.__caseRef || code) + ' · ' + (svc.title || code),
        ico: 'folder_open',
        href: '#/service/' + code,
        keys: [code.toLowerCase(), who],
      });
    });

    return items;
  }

  function filterItems(items) {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => {
      if (it.t.toLowerCase().includes(term)) return true;
      if (it.s.toLowerCase().includes(term)) return true;
      if (it.keys && it.keys.some((k) => k && k.toLowerCase().includes(term))) return true;
      return false;
    });
  }

  function renderList() {
    if (!list) return;
    const items = filterItems(buildItems());
    list.innerHTML = '';
    sel = Math.min(sel, Math.max(0, items.length - 1));

    const groups = [
      { label: 'الخدمات', kind: 'svc' },
      { label: 'التنقل', kind: 'nav' },
      { label: 'الحالات', kind: 'case' },
    ];

    let idx = 0;
    groups.forEach((g) => {
      const groupItems = items.filter((it) => it.kind === g.kind);
      if (!groupItems.length) return;
      const head = document.createElement('div');
      head.className = 'cmdk__group';
      head.textContent = g.label;
      list.appendChild(head);
      groupItems.forEach((it) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'cmdk__item' + (idx === sel ? ' is-on' : '');
        row.dataset.idx = String(idx);
        row.appendChild(icon(it.ico, 20));
        const txt = document.createElement('span');
        txt.className = 'cmdk__item-txt';
        txt.innerHTML = '<strong>' + it.t + '</strong><small>' + it.s + '</small>';
        row.appendChild(txt);
        row.addEventListener('click', () => pick(it));
        list.appendChild(row);
        idx += 1;
      });
    });

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'cmdk__empty';
      empty.textContent = 'لا توجد نتائج مطابقة.';
      list.appendChild(empty);
    }
  }

  function pick(it) {
    if (it && it.href) location.hash = it.href;
    closePalette();
  }

  function ensureDom() {
    if (root) return;
    root = document.getElementById('cmdkRoot');
    if (!root) return;

    const scrim = document.createElement('div');
    scrim.className = 'cmdk-scrim';
    scrim.addEventListener('click', closePalette);

    panel = document.createElement('div');
    panel.className = 'cmdk';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'بحث سريع');

    const head = document.createElement('div');
    head.className = 'cmdk__head';
    head.appendChild(icon('search', 22));
    input = document.createElement('input');
    input.type = 'search';
    input.className = 'cmdk__input';
    input.placeholder = 'ابحث عن خدمة، حالة، أو صفحة…';
    input.setAttribute('aria-label', 'بحث');
    input.addEventListener('input', () => { q = input.value; sel = 0; renderList(); });
    head.appendChild(input);
    panel.appendChild(head);

    list = document.createElement('div');
    list.className = 'cmdk__list';
    panel.appendChild(list);

    const foot = document.createElement('div');
    foot.className = 'cmdk__foot';
    foot.innerHTML = '<span><span class="kbd">↑↓</span> تنقّل</span><span><span class="kbd">↵</span> فتح</span><span><span class="kbd">Esc</span> إغلاق</span>';
    panel.appendChild(foot);

    root.appendChild(scrim);
    root.appendChild(panel);
    root.style.display = 'none';
  }

  function openPalette() {
    ensureDom();
    if (!root) return;
    open = true;
    q = '';
    sel = 0;
    root.style.display = 'block';
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cmdk-open');
    if (input) { input.value = ''; input.focus(); }
    renderList();
  }

  function closePalette() {
    if (!root) return;
    open = false;
    root.style.display = 'none';
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cmdk-open');
  }

  function togglePalette() {
    if (open) closePalette();
    else openPalette();
  }

  function onKey(e) {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      togglePalette();
      return;
    }
    if (!open) {
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
        e.preventDefault();
        openPalette();
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
    const items = filterItems(buildItems());
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); renderList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); renderList(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[sel];
      if (it) pick(it);
    }
  }

  document.addEventListener('keydown', onKey);

  global.CmdK = { open: openPalette, close: closePalette, toggle: togglePalette };
})(window);
