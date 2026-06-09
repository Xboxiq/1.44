// =============================================================
// Command Palette (⌘K / Ctrl+K)
// =============================================================

function CmdK({ open, onClose, onNav }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build full searchable list
  const all = useMemo(() => {
    const nav = [
      { kind: 'nav', t: 'الرئيسية',          s: 'لوحة العمل',                 ico: 'dashboard',       go: () => onNav('home') },
      { kind: 'nav', t: 'كل الخدمات',         s: 'دليل الـ 31 خدمة',           ico: 'apps',            go: () => onNav('services') },
      { kind: 'nav', t: 'الحالات النشطة',     s: 'إضباراتك ومُحَوَّلَة إليك',   ico: 'inventory_2',     go: () => onNav('cases') },
      { kind: 'nav', t: 'جدول الأجور',       s: 'الأسعار الرسمية ٢٠٢٦',       ico: 'request_quote',   go: () => onNav('pricing') },
      { kind: 'nav', t: 'دليل الإجراءات',     s: 'شرح موحد للموظفين',          ico: 'menu_book',       go: () => onNav('guide') },
      { kind: 'nav', t: 'التقارير',           s: 'مؤشرات الأداء',              ico: 'bar_chart',       go: () => onNav('reports') },
    ];
    const svcs = (window.SERVICES || []).map(svc => {
      const sec = window.SECTION_MAP[svc.section];
      return {
        kind: 'svc',
        t: svc.name,
        s: svc.code + ' · ' + sec.name,
        ico: svc.icon,
        color: sec.color,
        go: () => onNav('detail', { code: svc.code }),
        keys: [svc.code.toLowerCase(), svc.name, sec.name],
      };
    });
    const cases = (window.RECENT_CASES || []).map(c => {
      const svc = window.SERVICE_MAP[c.svc];
      return {
        kind: 'case',
        t: c.subscriber,
        s: c.id + ' · ' + svc.name,
        ico: 'folder_open',
        go: () => onNav('case', { id: c.id, svc: c.svc }),
        keys: [c.id.toLowerCase(), c.subscriber],
      };
    });
    return [...nav, ...svcs, ...cases];
  }, [onNav]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(it => {
      if (it.t.toLowerCase().includes(term)) return true;
      if (it.s.toLowerCase().includes(term)) return true;
      if (it.keys && it.keys.some(k => k.toLowerCase().includes(term))) return true;
      return false;
    });
  }, [q, all]);

  const grouped = useMemo(() => {
    const byKind = { svc: [], nav: [], case: [] };
    filtered.forEach((it, i) => byKind[it.kind].push({ ...it, _i: i }));
    return [
      { label: 'الخدمات', items: byKind.svc },
      { label: 'التنقل', items: byKind.nav },
      { label: 'الحالات', items: byKind.case },
    ].filter(g => g.items.length > 0);
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel(s => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSel(s => Math.max(0, s - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[sel];
        if (item) { item.go(); onClose(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, sel, onClose]);

  // keep selection in view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('.cmdk__item.is-on');
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [sel, q]);

  useEffect(() => { setSel(0); }, [q]);

  if (!open) return null;

  return (
    <div className="cmdk-scrim" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk__input">
          <Icon name="search" size={22} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث: اسم مشترك، رقم اشتراك، رقم خدمة CS0001، أو رقم حالة…"
          />
          <span className="cmdk__hint">ESC</span>
        </div>

        {filtered.length === 0 ? (
          <div className="cmdk__empty">
            <Icon name="search_off" size={36} style={{ opacity: 0.5 }} />
            <p style={{ marginTop: 8 }}>لا توجد نتائج مطابقة.</p>
          </div>
        ) : (
          <div className="cmdk__list" ref={listRef}>
            {grouped.map(g => (
              <div key={g.label}>
                <div className="cmdk__group">{g.label}</div>
                {g.items.map(it => (
                  <div
                    key={it._i}
                    className={`cmdk__item ${sel === it._i ? 'is-on' : ''}`}
                    style={{ '--cmdk-c': it.color || 'var(--brand-navy)' }}
                    onMouseEnter={() => setSel(it._i)}
                    onClick={() => { it.go(); onClose(); }}
                  >
                    <span className="cmdk__ico"><Icon name={it.ico} size={18} /></span>
                    <div>
                      <div className="cmdk__t">{it.t}</div>
                      <div className="cmdk__s">{it.s}</div>
                    </div>
                    <span className="cmdk__hint">↵</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="cmdk__foot">
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> تنقّل</span>
          <span><span className="kbd">↵</span> فتح</span>
          <span><span className="kbd">ESC</span> إغلاق</span>
          <span style={{ marginInlineStart: 'auto' }}>
            {filtered.length} نتيجة
          </span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CmdK });
