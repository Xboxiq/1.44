// =============================================================
// Services Hub — list all services, filterable & searchable
// =============================================================

function ServicesHub({ initialSection = 'all', onPick, onNav }) {
  const [q, setQ] = useState('');
  const [section, setSection] = useState(initialSection);
  const [sort, setSort] = useState('popularity');

  const filtered = useMemo(() => {
    const list = window.SERVICES.filter(s => {
      if (section !== 'all' && s.section !== section) return false;
      if (q.trim()) {
        const t = q.trim();
        return (
          s.name.includes(t) ||
          s.code.toLowerCase().includes(t.toLowerCase()) ||
          window.SECTION_MAP[s.section].name.includes(t)
        );
      }
      return true;
    });
    if (sort === 'popularity') list.sort((a,b) => b.popularity - a.popularity);
    else if (sort === 'sla') list.sort((a,b) => a.sla - b.sla);
    else if (sort === 'code') list.sort((a,b) => a.code.localeCompare(b.code));
    return list;
  }, [q, section, sort]);

  return (
    <div className="app-page fade-in">
      <div className="row-between">
        <div>
          <Crumbs items={[
            { label: 'الرئيسية', onClick: () => onNav('home') },
            { label: 'الخدمات' },
          ]} />
          <h1 className="pageheader__title" style={{ marginTop: 8 }}>دليل الخدمات الـ 31</h1>
          <p className="pageheader__sub">جميع الخدمات المقدّمة للمشتركين من خلال مركز خدمات المشتركين — اختر خدمة لبدء التعبئة أو لمراجعة الشرح والأجور.</p>
        </div>
      </div>

      <div className="searchhero">
        <div className="rs-search" style={{ flex: 1 }}>
          <span className="rs-search__ico"><Icon name="search" /></span>
          <input
            className="rs-search__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم الخدمة، رقمها (مثل CS0001)، أو القسم…"
          />
        </div>
        <div className="cluster">
          <span className="muted" style={{ fontSize: '0.82rem' }}>ترتيب:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              fontFamily: 'var(--font-cmd)',
              fontWeight: 600,
              color: 'var(--text)',
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <option value="popularity">الأكثر استخداماً</option>
            <option value="sla">الأسرع تنفيذاً</option>
            <option value="code">حسب الرمز</option>
          </select>
        </div>
      </div>

      <div className="catbar">
        <div
          className={`cattab ${section === 'all' ? 'is-active' : ''}`}
          style={{ '--cat-color': 'var(--brand-navy)' }}
          onClick={() => setSection('all')}
        >
          <Icon name="apps" size={18} />
          الكل
          <span className="cattab__count">{window.SERVICES.length}</span>
        </div>
        {window.SECTIONS.map(s => (
          <div
            key={s.code}
            className={`cattab ${section === s.code ? 'is-active' : ''}`}
            style={{ '--cat-color': s.color }}
            onClick={() => setSection(s.code)}
          >
            <Icon name={s.icon} size={18} />
            {s.name}
            <span className="cattab__count">{window.SERVICES.filter(x => x.section === s.code).length}</span>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="section" style={{ textAlign: 'center', padding: 50 }}>
          <Icon name="search_off" size={48} style={{ color: 'var(--text-soft)', opacity: 0.5 }} />
          <p className="muted" style={{ marginTop: 12 }}>لا توجد خدمات مطابقة لبحثك.</p>
        </div>
      ) : (
        <div className="svc-grid">
          {filtered.map(svc => {
            const sec = window.SECTION_MAP[svc.section];
            const price = svc.fixedPrice
              ? fmtIQD(svc.fixedPrice)
              : (svc.priceNote || 'حسب الصنف');
            return (
              <div
                key={svc.code}
                className="svc"
                style={{ '--svc-color': sec.color }}
                onClick={() => onPick(svc.code)}
              >
                <div className="svc__row1">
                  <span className="svc__code">{svc.code}</span>
                  <span className="cluster">
                    {svc.urgent && <Tag variant="err" dot>عاجل</Tag>}
                    <Icon name={svc.icon} size={22} style={{ color: sec.color }} />
                  </span>
                </div>
                <div className="svc__title">{svc.name}</div>
                <div className="svc__meta">
                  <span><Icon name="schedule" size={14} /> {svc.sla} أيام</span>
                  <span><Icon name="payments" size={14} /> {price}</span>
                  <span className="svc__cta">ابدأ <Icon name="arrow_back" size={16} /></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ServicesHub });
