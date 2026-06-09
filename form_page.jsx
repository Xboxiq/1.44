// =============================================================
// FormPage — wires Pro + Original tabs, autosave, fees, steps
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

function FormPage({ code, onNav, onCases }) {
  const svc = window.SERVICE_MAP[code];
  const sec = window.SECTION_MAP[svc.section];
  const [stage, setStage] = useState('preflight'); // preflight | filling
  const [tab, setTab] = useState('pro'); // pro | orig
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

  const classKey = data.classKey || 'res';
  const phaseKey = data.phaseKey || '1ph';

  const fees = useMemo(() => computeFees(classKey, phaseKey), [classKey, phaseKey]);
  const total = fees.reduce((s, r) => s + r.amount, 0);

  // Completion progress
  const progress = useMemo(() => {
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
  }, [data]);

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
        <div className="cluster">
          <SaveBadge status={saveStatus} />
          <Button size="sm" variant="ghost" icon="info" onClick={() => setInfoOpen(true)}>دليل الخدمة</Button>
          <Button size="sm" variant="ghost" icon="print" onClick={() => window.print()}>طباعة</Button>
          <Button size="sm" variant="ghost" icon="delete" onClick={() => {
            if (confirm('هل تريد إفراغ النموذج؟')) {
              localStorage.removeItem(`tq-form-${code}`);
              location.reload();
            }
          }}>إفراغ</Button>
        </div>
      </div>

      <div className="formshell">
        {/* SIDE — Step nav + fees */}
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

          {/* Live fees panel */}
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
            <p className="muted" style={{ fontSize: '0.72rem', marginTop: 10, lineHeight: 1.6 }}>
              يحتسب آلياً حسب الصنف ونوع الربط. عند تغيير الصنف يُحدّث المجموع فوراً.
            </p>
          </div>
        </div>

        {/* MAIN — form body */}
        <div className="formbody">
          <div className="formhead">
            <div>
              <h2 className="formhead__title">نموذج طلب — {svc.code}</h2>
              <p className="formhead__sub">
                {tab === 'pro'
                  ? 'الواجهة الاحترافية — مرتّبة بأقسام ومحسّنة للإدخال السريع'
                  : 'الواجهة الأصلية — طبق الأصل من النموذج الورقي الرسمي'}
              </p>
            </div>
            <div className="formhead__tools">
              <div className="rs-tabs" style={{ borderBottom: 0 }}>
                <button
                  className={`rs-tabs__item ${tab === 'pro' ? 'is-active' : ''}`}
                  onClick={() => setTab('pro')}
                >
                  <Icon name="auto_awesome" size={18} />
                  واجهة احترافية
                </button>
                <button
                  className={`rs-tabs__item ${tab === 'orig' ? 'is-active' : ''}`}
                  onClick={() => setTab('orig')}
                >
                  <Icon name="description" size={18} />
                  الفورمة الأصلية
                  <span className="rs-tabs__badge">طبق الأصل</span>
                </button>
              </div>
            </div>
          </div>

          {tab === 'pro'
            ? <ProForm data={data} set={set} classKey={classKey} phaseKey={phaseKey} />
            : <OrigForm data={data} classKey={classKey} phaseKey={phaseKey} />}

          {/* Footer actions */}
          <div style={{
            marginTop: 28,
            padding: '18px 0 0',
            borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 12, flexWrap: 'wrap',
          }}>
            <div className="cluster">
              <Tag dot variant={progress === 100 ? 'success' : 'info'}>
                {progress === 100 ? 'جاهز للتقديم' : `${progress}% مكتمل`}
              </Tag>
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                آخر تعديل: {new Date().toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
            <div className="cluster">
              <Button variant="ghost" icon="save">حفظ كمسودة</Button>
              <Button icon="print" onClick={() => window.print()}>طباعة بصيغة أصلية</Button>
              <Button
                variant="primary"
                icon="send"
                disabled={progress < 60}
                onClick={() => {
                  alert('تم تقديم الطلب وتحويله إلى الدائرة الفنية.\nرقم المتابعة: ' + data.reqNumber);
                  onCases();
                }}
              >
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

Object.assign(window, { FormPage, computeFees });
