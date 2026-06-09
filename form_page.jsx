// =============================================================
// FormPage — React shell + legacy engine for all 31 services
// =============================================================

function computeFees(classKey, phaseKey) {
  const rows = [];
  const insp = (window.PRICING.inspection.items.find(x => x.key === classKey) || {}).amount || 0;
  if (insp) rows.push({ name: 'أجور الكشف', amount: insp, note: window.PRICING.inspection.items.find(x => x.key === classKey)?.name });
  rows.push({ name: 'تجهيز ونصب المقياس', amount: 62500 });
  rows.push({ name: 'الغطاء السفلي للمقياس', amount: 12500 });
  const monthly = classKey === 'res' ? 3000 : 10000;
  rows.push({ name: 'اشتراك شهري على قوائم الاستهلاك', amount: monthly });
  return rows;
}

function LegacyEngineHost({ code, mode }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.LegacyForm) return undefined;
    window.LegacyForm.mount(el, code, mode);
    return () => window.LegacyForm.unmount(el);
  }, [code, mode]);
  return <div ref={ref} className="platform-form-engine" id={'engine-' + code} />;
}

function FormPage({ code, onNav, onCases }) {
  const svc = window.SERVICE_MAP[code];
  const isDemoPro = code === 'CS0001';
  const [stage, setStage] = useState('preflight');
  const [tab, setTab] = useState(isDemoPro ? 'pro' : 'orig');
  const [step, setStep] = useState('subscriber');
  const [infoOpen, setInfoOpen] = useState(false);
  const [data, set, saveStatus] = useAutosave(`tq-form-${code}`, {
    reqDate: new Date().toISOString().slice(0, 10),
    reqNumber: 'CS0001-RS014-' + Math.floor(Math.random() * 90000 + 10000),
    classKey: 'res',
    phaseKey: '1ph',
    docs: {},
    route: [],
  });

  if (!svc) {
    return (
      <div className="app-page fade-in">
        <Crumbs items={[
          { label: 'الرئيسية', onClick: () => onNav('home') },
          { label: 'الخدمات', onClick: () => onNav('services') },
          { label: 'غير موجود' },
        ]} />
        <h1 className="pageheader__title">الخدمة غير موجودة: {code}</h1>
        <Button onClick={() => onNav('services')}>عودة للخدمات</Button>
      </div>
    );
  }

  const sec = window.SECTION_MAP[svc.section];
  const useLegacy = tab === 'orig' || !isDemoPro;
  const engineMode = tab === 'pro' && isDemoPro ? 'smart' : 'original';
  const classKey = data.classKey || 'res';
  const phaseKey = data.phaseKey || '1ph';
  const fees = useMemo(() => computeFees(classKey, phaseKey), [classKey, phaseKey]);
  const total = fees.reduce((s, r) => s + r.amount, 0);

  const progress = useMemo(() => {
    if (useLegacy) return null;
    const checks = [
      !!data.subscriberName, !!data.nationalId, !!data.phone,
      !!data.classKey, !!data.phaseKey,
      !!data.neigh, !!data.house,
      Object.values(data.docs || {}).filter(Boolean).length >= 3,
      (data.route || []).length > 0,
      !!data.sigEmployee && !!data.pledge,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [data, useLegacy]);

  const handlePrint = (e) => {
    if (useLegacy && window.LegacyForm) window.LegacyForm.print(code, e);
    else window.print();
  };

  const handleSave = () => {
    if (window.LegacyForm) window.LegacyForm.save();
    else if (window.saveDrafts) window.saveDrafts();
  };

  const handleClear = () => {
    if (!confirm('هل تريد إفراغ النموذج؟')) return;
    if (window.LegacyForm) window.LegacyForm.clear(code);
    else localStorage.removeItem(`tq-form-${code}`);
    location.reload();
  };

  if (stage === 'preflight') {
    return (
      <div className="app-page fade-in">
        <Crumbs items={[
          { label: 'الرئيسية', onClick: () => onNav('home') },
          { label: 'الخدمات', onClick: () => onNav('services') },
          { label: svc.name, onClick: () => onNav('detail', { code }) },
          { label: 'النموذج' },
        ]} />
        <PreflightAlert
          svc={svc}
          onConfirm={() => setStage('filling')}
          onCancel={() => onNav('detail', { code })}
        />
      </div>
    );
  }

  const headerTools = (
    <div className="cluster">
      {!useLegacy && <SaveBadge status={saveStatus} />}
      <Button size="sm" variant="ghost" icon="info" onClick={() => setInfoOpen(true)}>دليل الخدمة</Button>
      <Button size="sm" variant="ghost" icon="print" onClick={handlePrint}>طباعة</Button>
      <Button size="sm" variant="ghost" icon="save" onClick={handleSave}>حفظ</Button>
      <Button size="sm" variant="ghost" icon="delete" onClick={handleClear}>إفراغ</Button>
    </div>
  );

  if (useLegacy) {
    return (
      <div className="app-page fade-in">
        <Crumbs items={[
          { label: 'الرئيسية', onClick: () => onNav('home') },
          { label: 'الخدمات', onClick: () => onNav('services') },
          { label: svc.name, onClick: () => onNav('detail', { code }) },
          { label: 'النموذج' },
        ]} />
        <div className="row-between">
          <div>
            <h1 className="pageheader__title">{svc.name}</h1>
            <p className="pageheader__sub">
              <SectionBadge code={svc.section} /> &nbsp; {svc.code} · مدّة معتادة {svc.sla} أيام · مركز الرصافة-الكرادة
            </p>
          </div>
          {headerTools}
        </div>
        <div className="formbody" style={{ marginTop: 16 }}>
          {isDemoPro && (
            <div className="formhead">
              <div className="formhead__tools">
                <div className="rs-tabs" style={{ borderBottom: 0 }}>
                  <button className={`rs-tabs__item ${tab === 'pro' ? 'is-active' : ''}`} onClick={() => setTab('pro')}>
                    <Icon name="auto_awesome" size={18} /> واجهة احترافية (تجريبي)
                  </button>
                  <button className={`rs-tabs__item ${tab === 'orig' ? 'is-active' : ''}`} onClick={() => setTab('orig')}>
                    <Icon name="description" size={18} /> الفورمة الأصلية
                    <span className="rs-tabs__badge">31 خدمة</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          <LegacyEngineHost code={code} mode={engineMode} />
        </div>
        {infoOpen && <InfoDrawer svc={svc} onClose={() => setInfoOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="app-page fade-in">
      <Crumbs items={[
        { label: 'الرئيسية', onClick: () => onNav('home') },
        { label: 'الخدمات', onClick: () => onNav('services') },
        { label: svc.name, onClick: () => onNav('detail', { code }) },
        { label: 'النموذج' },
      ]} />

      <div className="row-between">
        <div>
          <h1 className="pageheader__title">{svc.name}</h1>
          <p className="pageheader__sub">
            <SectionBadge code={svc.section} /> &nbsp; {svc.code} · مدّة معتادة {svc.sla} أيام · مركز الرصافة-الكرادة
          </p>
        </div>
        {headerTools}
      </div>

      <div className="formshell">
        <div className="formside">
          <div className="stepnav">
            <div className="stepnav__head">
              <span>أقسام النموذج</span>
              <span className="stepnav__progress">{progress}%</span>
            </div>
            <div className="stepnav__bar">
              <div className="stepnav__fill" style={{ width: progress + '%' }} />
            </div>
            <ul className="stepnav__list">
              {CS0001_STEPS.map((s, i) => (
                <li
                  key={s.key}
                  className={`stepnav__item ${step === s.key ? 'is-active' : ''}`}
                  onClick={() => {
                    setStep(s.key);
                    const el = document.getElementById('sec-' + s.key);
                    if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
                  }}
                >
                  <span className="stepnav__dot">{i + 1}</span>
                  <span style={{ flex: 1 }}>{s.label}</span>
                  <Icon name={s.ico} size={18} />
                </li>
              ))}
            </ul>
          </div>
          <div className="feepanel">
            <div className="feepanel__head">
              <Icon name="payments" />
              <span className="feepanel__title">المطالبة المالية</span>
            </div>
            {fees.map((r, i) => (
              <div key={i} className="feerow">
                <span className="feerow__name">{r.name}{r.note && <span style={{fontSize:'0.72rem', color:'var(--text-soft)', marginInlineStart:6}}>({r.note})</span>}</span>
                <span className="feerow__amt">{fmtIQD(r.amount)}</span>
              </div>
            ))}
            <div className="feepanel__total">
              <span className="lbl">المجموع</span>
              <span className="amt">{fmtIQD(total)}</span>
            </div>
          </div>
        </div>

        <div className="formbody">
          <div className="formhead">
            <div>
              <h2 className="formhead__title">نموذج طلب — {svc.code}</h2>
              <p className="formhead__sub">الواجهة الاحترافية التجريبية — CS0001 فقط</p>
            </div>
            <div className="formhead__tools">
              <div className="rs-tabs" style={{ borderBottom: 0 }}>
                <button className={`rs-tabs__item ${tab === 'pro' ? 'is-active' : ''}`} onClick={() => setTab('pro')}>
                  <Icon name="auto_awesome" size={18} /> واجهة احترافية
                </button>
                <button className={`rs-tabs__item ${tab === 'orig' ? 'is-active' : ''}`} onClick={() => setTab('orig')}>
                  <Icon name="description" size={18} /> الفورمة الأصلية
                  <span className="rs-tabs__badge">طبق الأصل</span>
                </button>
              </div>
            </div>
          </div>

          <ProForm data={data} set={set} classKey={classKey} phaseKey={phaseKey} />

          <div style={{
            marginTop: 28, padding: '18px 0 0', borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <div className="cluster">
              <Tag dot variant={progress === 100 ? 'success' : 'info'}>
                {progress === 100 ? 'جاهز للتقديم' : `${progress}% مكتمل`}
              </Tag>
            </div>
            <div className="cluster">
              <Button variant="ghost" icon="save" onClick={handleSave}>حفظ كمسودة</Button>
              <Button icon="print" onClick={handlePrint}>طباعة بصيغة أصلية</Button>
              <Button variant="primary" icon="send" disabled={progress < 60} onClick={() => { onCases(); }}>
                تقديم وتحويل الطلب
              </Button>
            </div>
          </div>
        </div>
      </div>

      {infoOpen && <InfoDrawer svc={svc} onClose={() => setInfoOpen(false)} />}
    </div>
  );
}

Object.assign(window, { FormPage, computeFees, LegacyEngineHost });
