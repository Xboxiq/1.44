// =============================================================
// App router & root
// =============================================================

function routeFromHash() {
  const h = (location.hash || '').replace(/^#\/?/, '').replace(/\/$/, '');
  if (!h) return { name: 'home' };
  const parts = h.split('/').filter(Boolean);
  if (parts[0] === 'services') return { name: 'services', section: parts[1] || 'all' };
  if (parts[0] === 'cases') {
    if (parts[1]) return { name: 'case', id: decodeURIComponent(parts[1]), svc: parts[2] };
    return { name: 'cases' };
  }
  if (parts[0] === 'fees' || parts[0] === 'pricing') return { name: 'pricing' };
  if (parts[0] === 'guide') return { name: 'guide' };
  if (parts[0] === 'reports') return { name: 'reports' };
  if (parts[0] === 'service' && parts[1]) {
    const code = parts[1].toUpperCase();
    if (parts[2] === 'form') return { name: 'form', code };
    return { name: 'detail', code };
  }
  return { name: 'home' };
}

function hashFromRoute(route) {
  switch (route.name) {
    case 'home': return '#/';
    case 'services': return '#/services';
    case 'detail': return '#/service/' + route.code;
    case 'form': return '#/service/' + route.code + '/form';
    case 'cases': return '#/cases';
    case 'case': return '#/cases/' + encodeURIComponent(route.id) + (route.svc ? '/' + route.svc : '');
    case 'pricing': return '#/fees';
    case 'guide': return '#/guide';
    case 'reports': return '#/reports';
    default: return '#/';
  }
}

function TqApp() {
  const [route, setRoute] = useState(() => {
    try {
      if (location.hash && location.hash.length > 2) return routeFromHash();
      return JSON.parse(localStorage.getItem('tq-route') || '{"name":"home"}');
    } catch { return { name: 'home' }; }
  });
  useEffect(() => { localStorage.setItem('tq-route', JSON.stringify(route)); }, [route]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [route.name, route.code]);

  const nav = (name, params = {}) => {
    const next = { name, ...params };
    setRoute(next);
    const h = hashFromRoute(next);
    if (location.hash !== h) location.hash = h;
  };

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Command palette + shortcuts
  const [cmdkOpen, setCmdkOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCmdkOpen(o => !o);
      } else if (meta && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault(); nav('home');
      } else if (meta && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault(); nav('cases');
      } else if (meta && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault(); nav('services');
      } else if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setCmdkOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  let page = null;
  if (route.name === 'home') {
    page = <Dashboard onNav={nav} onPick={(code) => nav('detail', { code })} onCmdK={() => setCmdkOpen(true)} />;
  } else if (route.name === 'services') {
    page = <ServicesHub
      initialSection={route.section || 'all'}
      onPick={(code) => nav('detail', { code })}
      onNav={nav}
    />;
  } else if (route.name === 'detail') {
    page = <ServiceDetail
      code={route.code}
      onNav={nav}
      onStart={() => nav('form', { code: route.code })}
    />;
  } else if (route.name === 'form') {
    page = <FormPage
      code={route.code}
      onNav={nav}
      onCases={() => nav('cases')}
    />;
  } else if (route.name === 'cases') {
    page = <CasesList
      onOpen={(c) => nav('case', { id: c.id, svc: c.svc })}
      onNav={nav}
    />;
  } else if (route.name === 'case') {
    const caseData = (window.RECENT_CASES || []).find(c => c.id === route.id)
      || (route.svc && (window.RECENT_CASES || []).find(c => c.svc === route.svc))
      || SAMPLE_CASE;
    page = <CaseDetail caseData={caseData} onBack={() => nav('cases')} onOpenForm={(code) => nav('form', { code })} />;
  } else if (route.name === 'pricing') {
    page = <PricingPage onNav={nav} />;
  } else if (route.name === 'guide') {
    page = <GuidePage onNav={nav} />;
  } else if (route.name === 'reports') {
    page = <ReportsPage onNav={nav} />;
  }

  return (
    <div className="app-shell">
      <CommandRail
        route={route.name === 'detail' || route.name === 'form' ? 'services'
              : route.name === 'case' ? 'cases'
              : route.name}
        onNav={nav}
      />
      <div className="app-main">
        <Topbar onCmdK={() => setCmdkOpen(true)} />
        {page}
      </div>
      <CmdK open={cmdkOpen} onClose={() => setCmdkOpen(false)} onNav={nav} />
    </div>
  );
}

// ---- Quick placeholders for nav targets we haven't fleshed out ----
function PricingPage({ onNav }) {
  return (
    <div className="app-page fade-in">
      <Crumbs items={[{ label: 'الرئيسية', onClick: () => onNav('home') }, { label: 'الأجور والأسعار' }]} />
      <div className="row-between">
        <div>
          <h1 className="pageheader__title">جدول الأجور الرسمي 2026</h1>
          <p className="pageheader__sub">مرجع كامل لجميع أجور خدمات شركة توزيع كهرباء بغداد / الرصافة.</p>
        </div>
        <Button variant="ghost" icon="print">طباعة الجدول</Button>
      </div>
      {Object.entries(window.PRICING).map(([key, table]) => (
        <div key={key} className="section">
          <div className="section__head">
            <h3 className="section__title"><Icon name="request_quote" /> {table.label}</h3>
            <span className="muted" style={{ fontSize: '0.82rem' }}>{table.items.length} بند</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 10,
          }}>
            {table.items.map(it => (
              <div key={it.key} style={{
                padding: '12px 14px',
                background: 'var(--surface-2)',
                borderRadius: 10,
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{it.name}</span>
                <span className="mono" style={{ fontWeight: 800, color: 'var(--brand-navy)' }}>{fmtIQD(it.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GuidePage({ onNav }) {
  return (
    <div className="app-page fade-in">
      <Crumbs items={[{ label: 'الرئيسية', onClick: () => onNav('home') }, { label: 'دليل الإجراءات' }]} />
      <h1 className="pageheader__title">دليل إجراءات الموظف</h1>
      <p className="pageheader__sub">شرح موحّد لكل خدمة من الـ 31 خدمة: متى تقدّم، شروطها، الوثائق، الأجور.</p>
      <div className="svc-grid">
        {window.SERVICES.map(svc => {
          const sec = window.SECTION_MAP[svc.section];
          return (
            <div key={svc.code} className="svc" style={{ '--svc-color': sec.color }}
              onClick={() => onNav('detail', { code: svc.code })}>
              <div className="svc__row1">
                <span className="svc__code">{svc.code}</span>
                <Icon name="menu_book" size={20} style={{ color: 'var(--text-soft)' }} />
              </div>
              <div className="svc__title">{svc.name}</div>
              <div className="svc__meta">
                <span className="svc__cta">قراءة الدليل <Icon name="arrow_back" size={16} /></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportsPage({ onNav }) {
  return (
    <div className="app-page fade-in">
      <Crumbs items={[{ label: 'الرئيسية', onClick: () => onNav('home') }, { label: 'التقارير' }]} />
      <h1 className="pageheader__title">التقارير</h1>
      <p className="pageheader__sub">تقارير الأداء الشهري ومؤشرات الإنجاز.</p>
      <div className="grid-4">
        <KPI ico="trending_up" label="إجمالي الحالات (شهر)" value="2,481" delta="+18%" up color="#1d4ed8" />
        <KPI ico="check_circle" label="مُغلقة" value="2,134" delta="+15%" up color="#16a34a" />
        <KPI ico="hourglass_empty" label="معلقة" value="247" delta="+4%" up color="#b45309" />
        <KPI ico="payments" label="محصّل (د.ع)" value="148M" delta="+22%" up color="#0e7490" />
      </div>
      <div className="section">
        <div className="section__head">
          <h3 className="section__title"><Icon name="bar_chart" /> توزيع الحالات حسب القسم</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {window.SECTIONS.map(s => {
            const count = window.SERVICES.filter(x => x.section === s.code).length * 23;
            const pct = Math.round((count / 800) * 100);
            return (
              <div key={s.code}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontWeight: 700 }}>
                    <SectionBadge code={s.code} /> &nbsp; {s.name}
                  </span>
                  <span className="mono" style={{ fontWeight: 700 }}>{count} حالة · {pct}%</span>
                </div>
                <div style={{ height: 12, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: s.color, borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<TqApp />);
