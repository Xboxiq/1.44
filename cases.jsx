// =============================================================
// Cases — table + creative case detail with timeline
// =============================================================

const CASE_STAGES = [
  { k:'received',  ico:'inbox',                name:'استلام الطلب',          who:'موظف خدمات المشتركين', dur:'فوري' },
  { k:'feeInit',   ico:'currency_exchange',    name:'دفع رسوم طلب الخدمة',   who:'الصندوق',              dur:'15 دقيقة' },
  { k:'siteCheck', ico:'location_searching',   name:'الكشف الميداني',        who:'الدائرة الفنية',       dur:'3 أيام' },
  { k:'estimate',  ico:'price_change',         name:'تقدير الأجور',          who:'الدائرة المالية',      dur:'يوم' },
  { k:'approval',  ico:'verified',             name:'موافقة المدير',          who:'مدير المركز',          dur:'يوم' },
  { k:'feeFinal',  ico:'payments',             name:'دفع المطالبة المالية',  who:'الصندوق',              dur:'فوري' },
  { k:'execute',   ico:'electrical_services',  name:'تنفيذ التوصيل',         who:'الدائرة الفنية',       dur:'يومان' },
  { k:'closed',    ico:'check_circle',         name:'إصدار رقم الاشتراك',    who:'النظام',               dur:'فوري' },
];

const SAMPLE_CASE = {
  id: 'TQ-2026-08-1417',
  svc: 'CS0001',
  subscriber: 'علي عبدالله حسين الجبوري',
  classKey: 'res',
  phaseKey: '1ph',
  totalFee: 93000,
  opened: '12 / 06 / 2026',
  officer: 'م. كرار البياتي',
  currentStage: 2, // index into CASE_STAGES
  events: [
    { stage: 0, at: '12 / 06 - 09:14', by: 'م. كرار', note: 'تم استلام النموذج والمستمسكات الأصلية.', state: 'done' },
    { stage: 1, at: '12 / 06 - 09:42', by: 'الصندوق', note: 'وصل قبض رقم 38291 — 15,000 د.ع.', state: 'done' },
    { stage: 2, at: '14 / 06 - 11:30', by: 'الفريق الفني', note: 'موعد الكشف الميداني محدد. الفريق في الطريق.', state: 'active' },
  ],
};

function CaseDetail({ caseData = SAMPLE_CASE, onBack }) {
  const svc = window.SERVICE_MAP[caseData.svc];
  const sec = window.SECTION_MAP[svc.section];
  return (
    <div className="app-page fade-in">
      <Crumbs items={[
        { label: 'الحالات', onClick: onBack },
        { label: caseData.id },
      ]} />

      <div className="hero" style={{ padding: 22 }}>
        <div className="hero__row">
          <div>
            <span className="hero__eyebrow">
              <Icon name="inventory_2" size={14} /> رقم الحالة <span className="mono">{caseData.id}</span>
            </span>
            <h1 className="hero__title" style={{ fontSize: 'clamp(1.4rem, 2.4vw, 1.9rem)' }}>{svc.name}</h1>
            <p className="hero__sub">
              المشترك: <strong>{caseData.subscriber}</strong> · فُتحت بتاريخ {caseData.opened} · المسؤول: {caseData.officer}
            </p>
          </div>
          <div className="cluster">
            <span style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.18)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              fontWeight: 800,
            }}>{svc.code}</span>
            <Button size="sm" icon="edit" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              تعديل
            </Button>
            <Button size="sm" icon="print" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              طباعة
            </Button>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Timeline */}
        <div className="section">
          <div className="section__head">
            <h3 className="section__title"><Icon name="timeline" /> مسار الحالة</h3>
            <Tag variant="info" dot>المرحلة {caseData.currentStage + 1} من {CASE_STAGES.length}</Tag>
          </div>
          <div className="timeline">
            {CASE_STAGES.map((stg, i) => {
              const ev = caseData.events.find(e => e.stage === i);
              const status = ev?.state || (i < caseData.currentStage ? 'done' : i === caseData.currentStage ? 'active' : 'pending');
              return (
                <div key={stg.k} className={`tlrow ${status === 'done' ? 'is-done' : ''} ${status === 'active' ? 'is-active' : ''}`}>
                  <div className="tlrow__node">
                    <Icon name={status === 'done' ? 'check' : stg.ico} size={22} />
                  </div>
                  <div className="tlrow__body">
                    <div className="tlrow__title">
                      <span>{stg.name}</span>
                      <span className="tlrow__time">{ev ? ev.at : '— ' + stg.dur}</span>
                    </div>
                    <p className="tlrow__desc">
                      {ev ? ev.note : `سيتم تنفيذ هذه المرحلة بواسطة ${stg.who} بمدة معتادة ${stg.dur}.`}
                    </p>
                    {ev && (
                      <div className="tlrow__by">
                        <span className="tlrow__avatar">{ev.by[0]}</span>
                        <span>{ev.by}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side: fees + info + notes */}
        <div className="stack">
          <div className="feepanel">
            <div className="feepanel__head">
              <Icon name="payments" />
              <span className="feepanel__title">المطالبة المالية</span>
            </div>
            {computeFees(caseData.classKey, caseData.phaseKey).map((r, i) => (
              <div key={i} className="feerow">
                <span className="feerow__name">{r.name}</span>
                <span className="feerow__amt">{fmtIQD(r.amount)}</span>
              </div>
            ))}
            <div className="feepanel__total">
              <span className="lbl">المجموع المستحق</span>
              <span className="amt">{fmtIQD(computeFees(caseData.classKey, caseData.phaseKey).reduce((s,r)=>s+r.amount,0))}</span>
            </div>
          </div>

          <div className="section">
            <div className="section__head">
              <h3 className="section__title"><Icon name="folder_open" /> المستمسكات المرفقة</h3>
              <Tag dot variant="success">4 من 5 مكتملة</Tag>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {[
                { n:'هوية الأحوال المدنية', s:'PDF · 240 KB',  ok:true },
                { n:'بطاقة السكن',          s:'PDF · 180 KB',  ok:true },
                { n:'كتاب تأييد سكن',       s:'PDF · 320 KB',  ok:true },
                { n:'سند الطابو',           s:'PDF · 520 KB',  ok:true },
                { n:'قائمة المجاور',        s:'لم تُرفق بعد',   ok:false },
              ].map((d, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '34px 1fr auto',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 8,
                    display: 'grid', placeItems: 'center',
                    background: d.ok ? 'color-mix(in srgb, var(--ok) 14%, transparent)' : 'color-mix(in srgb, var(--warn) 14%, transparent)',
                    color: d.ok ? 'var(--ok)' : 'var(--warn)',
                  }}>
                    <Icon name={d.ok ? 'description' : 'pending'} size={18} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{d.n}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-soft)' }}>{d.s}</div>
                  </div>
                  {d.ok ? <Icon name="download" size={18} style={{ color: 'var(--text-soft)' }} />
                        : <Button size="sm" variant="ghost" icon="add">رفع</Button>}
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="section__head">
              <h3 className="section__title"><Icon name="sticky_note_2" /> ملاحظات داخلية</h3>
            </div>
            <textarea
              className="rs-textarea"
              placeholder="اكتب ملاحظة لباقي الفريق…"
              defaultValue="المشترك متواجد في الموقع وقت الكشف. الطابق الأول. الاتصال على رقم الموبايل قبل الوصول."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Button size="sm" variant="primary" icon="send">حفظ الملاحظة</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CasesList({ onOpen, onNav }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = window.RECENT_CASES.filter(c => {
    if (status === 'urgent' && c.priority !== 'urgent') return false;
    if (status === 'vip' && c.priority !== 'vip') return false;
    if (q.trim() && !(c.id.includes(q) || c.subscriber.includes(q))) return false;
    return true;
  });

  return (
    <div className="app-page fade-in">
      <Crumbs items={[
        { label: 'الرئيسية', onClick: () => onNav('home') },
        { label: 'الحالات النشطة' },
      ]} />
      <div className="row-between">
        <div>
          <h1 className="pageheader__title">الحالات المُسلَمة لك</h1>
          <p className="pageheader__sub">جميع الحالات قيد المعالجة في مركزك مع مرحلتها الحالية والإجراء التالي.</p>
        </div>
        <div className="cluster">
          <Button variant="primary" icon="add" onClick={() => onNav('services')}>فتح حالة جديدة</Button>
        </div>
      </div>

      <div className="searchhero">
        <div className="rs-search" style={{ flex: 1 }}>
          <span className="rs-search__ico"><Icon name="search" /></span>
          <input
            className="rs-search__input"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ابحث برقم الحالة أو اسم المشترك…"
          />
        </div>
        <div className="tabbar">
          {[
            ['all','الكل',     window.RECENT_CASES.length],
            ['urgent','عاجل',   window.RECENT_CASES.filter(c=>c.priority==='urgent').length],
            ['vip','VIP',       window.RECENT_CASES.filter(c=>c.priority==='vip').length],
          ].map(([k,l,n]) => (
            <button
              key={k}
              className={`tabbtn ${status === k ? 'is-on' : ''}`}
              onClick={() => setStatus(k)}
            >{l} <span className="tabbtn__n">{n}</span></button>
          ))}
        </div>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {filtered.map(c => {
          const svc = window.SERVICE_MAP[c.svc];
          const sec = window.SECTION_MAP[svc.section];
          return (
            <div
              key={c.id}
              className="section"
              style={{ cursor: 'pointer', padding: 18 }}
              onClick={() => onOpen(c)}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto auto auto',
                gap: 18,
                alignItems: 'center',
              }}>
                <div style={{
                  width: 52, height: 52,
                  borderRadius: 12,
                  background: sec.color, color: '#fff',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon name={svc.icon} size={26} />
                </div>
                <div>
                  <div className="cluster" style={{ marginBottom: 4 }}>
                    <SectionBadge code={svc.section} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.86rem' }}>{c.id}</span>
                    {c.priority === 'urgent' && <Tag variant="err" dot>عاجل</Tag>}
                    {c.priority === 'vip' && <Tag variant="gold" dot>VIP</Tag>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{svc.name}</div>
                  <div style={{ color: 'var(--text-soft)', fontSize: '0.82rem', marginTop: 3 }}>
                    {c.subscriber} · {c.officer}
                  </div>
                </div>
                <div style={{ minWidth: 130 }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-soft)', marginBottom: 4 }}>المرحلة الحالية</div>
                  <Tag variant="info" dot>{c.status}</Tag>
                </div>
                <div style={{ textAlign: 'end', minWidth: 100 }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-soft)', marginBottom: 4 }}>الأجور</div>
                  <div className="mono" style={{ fontWeight: 800 }}>{c.fee ? fmtIQD(c.fee) : '—'}</div>
                </div>
                <div style={{ textAlign: 'end', minWidth: 80 }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-soft)', marginBottom: 4 }}>منذ</div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{c.age}</div>
                </div>
                <Icon name="chevron_left" size={22} style={{ color: 'var(--text-soft)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { CasesList, CaseDetail, CASE_STAGES, SAMPLE_CASE });
