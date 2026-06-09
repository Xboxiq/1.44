// =============================================================
// Form Page — Professional + Original tabs for CS0001
// =============================================================

const CS0001_STEPS = [
  { key: 'subscriber', label: 'بيانات المشترك',   ico: 'person' },
  { key: 'address',    label: 'عنوان العقار',     ico: 'location_on' },
  { key: 'service',    label: 'مواصفات الخدمة',   ico: 'electric_meter' },
  { key: 'docs',       label: 'الوثائق المرفقة',  ico: 'folder' },
  { key: 'fees',       label: 'المطالبة المالية', ico: 'payments' },
  { key: 'route',      label: 'مسار الإحالة',     ico: 'route' },
  { key: 'sign',       label: 'التوقيع والإقرار', ico: 'draw' },
];

const CLASSES = [
  { k:'res',  l:'منزلي',          ico:'home' },
  { k:'com',  l:'تجاري',          ico:'storefront' },
  { k:'ind',  l:'صناعي',          ico:'factory' },
  { k:'gov',  l:'حكومي',          ico:'account_balance' },
  { k:'agr',  l:'زراعي',          ico:'agriculture' },
  { k:'comp', l:'مجمع سكني',      ico:'apartment' },
  { k:'inv',  l:'مشروع استثماري', ico:'business_center' },
];

const PHASES = [
  { k:'1ph', l:'أحادي الطور',  ico:'horizontal_rule' },
  { k:'3ph', l:'ثلاثي الطور',  ico:'menu' },
];

const DOCS = [
  { k:'id',    l:'هوية الأحوال المدنية',          for:['res','com','ind','gov','agr','comp','inv'] },
  { k:'house', l:'بطاقة السكن',                  for:['res'] },
  { k:'sukn',  l:'كتاب تأييد سكن مصدّق',         for:['res','comp'] },
  { k:'qsam',  l:'القسام الشرعي (عند اللزوم)',   for:['res','com','ind','gov','agr','comp','inv'] },
  { k:'tax',   l:'كتاب ضريبة العقار',            for:['com','ind','gov','inv'] },
  { k:'build', l:'إجازة البناء مصدّقة',           for:['com','ind','inv','comp'] },
  { k:'tabu',  l:'سند قيد الطابو',               for:['res','com','ind','gov','agr','comp','inv'] },
  { k:'neigh', l:'صورة من قائمة المجاور',         for:['res','com','ind','agr','comp','inv'] },
  { k:'indb',  l:'كتاب التنمية الصناعية',        for:['ind'] },
  { k:'agrb',  l:'كتاب المضخة الزراعية',         for:['agr'] },
  { k:'govb',  l:'كتاب من الدائرة الحكومية',     for:['gov'] },
  { k:'invb',  l:'إجازة الاستثمار',              for:['inv','comp'] },
];

function ProForm({ data, set, classKey, phaseKey }) {
  const docs = useMemo(() => DOCS.filter(d => !classKey || d.for.includes(classKey)), [classKey]);
  return (
    <div className="stack" style={{ gap: 28 }}>
      {/* --- 1: Subscriber --- */}
      <section className="fsec" id="sec-subscriber">
        <header className="fsec__head">
          <span className="fsec__num">١</span>
          <h3 className="fsec__title">بيانات المشترك / طالب الخدمة</h3>
          <span className="fsec__sub">مطلوب · جميع الحقول</span>
        </header>
        <div className="fgrid fgrid--3">
          <div className="rs-field">
            <label className="rs-field__lbl rs-field__lbl-required">اسم المشترك / طالب الخدمة</label>
            <input className="rs-input" value={data.subscriberName||''} onChange={e=>set({subscriberName:e.target.value})} placeholder="مثال: علي عبدالله حسين الجبوري" />
          </div>
          <div className="rs-field">
            <label className="rs-field__lbl rs-field__lbl-required">رقم البطاقة الموحدة</label>
            <input className="rs-input mono" value={data.nationalId||''} onChange={e=>set({nationalId:e.target.value})} placeholder="١٢٣٤٥٦٧٨٩٠١٢" maxLength={12} />
          </div>
          <div className="rs-field">
            <label className="rs-field__lbl rs-field__lbl-required">رقم بطاقة السكن</label>
            <input className="rs-input mono" value={data.houseCard||''} onChange={e=>set({houseCard:e.target.value})} placeholder="٠٠٠٠٠٠" />
          </div>
          <div className="rs-field">
            <label className="rs-field__lbl rs-field__lbl-required">رقم الهاتف / موبايل</label>
            <input className="rs-input mono" value={data.phone||''} onChange={e=>set({phone:e.target.value})} placeholder="٠٧٧٠٠٠٠٠٠٠٠" />
          </div>
          <div className="rs-field">
            <label className="rs-field__lbl">رقم الطلب</label>
            <input className="rs-input mono" value={data.reqNumber||''} onChange={e=>set({reqNumber:e.target.value})} readOnly placeholder="يولّد تلقائياً" />
            <span className="rs-field__hint">يحتوي رقم النموذج (CS0001) + رقم المركز + رقم متسلسل</span>
          </div>
          <div className="rs-field">
            <label className="rs-field__lbl rs-field__lbl-required">تاريخ الطلب</label>
            <input className="rs-input" type="date" value={data.reqDate||''} onChange={e=>set({reqDate:e.target.value})} />
          </div>
        </div>
      </section>

      {/* --- 2: Service classification --- */}
      <section className="fsec" id="sec-service">
        <header className="fsec__head">
          <span className="fsec__num">٢</span>
          <h3 className="fsec__title">صنف الاشتراك ونوع الربط</h3>
          <span className="fsec__sub">يحدد الأجور والوثائق المطلوبة</span>
        </header>
        <div className="rs-field">
          <label className="rs-field__lbl rs-field__lbl-required">صنف الاشتراك المطلوب</label>
          <div className="rchips">
            {CLASSES.map(c => (
              <label key={c.k} className={`rchip ${classKey === c.k ? 'is-on' : ''}`}>
                <input type="radio" name="cls" checked={classKey === c.k} onChange={() => set({classKey: c.k})} />
                <Icon name={c.ico} size={18} />
                {c.l}
              </label>
            ))}
          </div>
        </div>
        <div className="rs-field" style={{ marginTop: 14 }}>
          <label className="rs-field__lbl rs-field__lbl-required">قوة التغذية (نوع الربط)</label>
          <div className="rchips">
            {PHASES.map(p => (
              <label key={p.k} className={`rchip ${phaseKey === p.k ? 'is-on' : ''}`}>
                <input type="radio" name="ph" checked={phaseKey === p.k} onChange={() => set({phaseKey: p.k})} />
                <Icon name={p.ico} size={18} />
                {p.l}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* --- 3: Address --- */}
      <section className="fsec" id="sec-address">
        <header className="fsec__head">
          <span className="fsec__num">٣</span>
          <h3 className="fsec__title">عنوان العقار المطلوب له الخدمة</h3>
          <span className="fsec__sub">حسب الترميز الجديد لأمانة بغداد</span>
        </header>
        <div className="fgrid fgrid--3">
          {[
            ['neigh','الحي'], ['quarter','المحلة'], ['alley','الزقاق'],
            ['house','رقم الدار'], ['parcel','رقم القطعة/المقاطعة'], ['floor','الطابق'],
            ['flat','رقم الشقة'], ['code','الترميز الجديد'], ['gps','GPS / نقطة دالة'],
          ].map(([k,l]) => (
            <div key={k} className="rs-field">
              <label className="rs-field__lbl">{l}</label>
              <input className="rs-input mono" value={data[k]||''} onChange={e=>set({[k]:e.target.value})} />
            </div>
          ))}
          <div className="rs-field fspan-3">
            <label className="rs-field__lbl">رقم الحساب المخصص</label>
            <input className="rs-input mono" value={data.accountNo||''} onChange={e=>set({accountNo:e.target.value})} placeholder="يخصص بعد الكشف" />
          </div>
        </div>
      </section>

      {/* --- 4: Documents checklist --- */}
      <section className="fsec" id="sec-docs">
        <header className="fsec__head">
          <span className="fsec__num">٤</span>
          <h3 className="fsec__title">الوثائق / المستمسكات المطلوبة</h3>
          <span className="fsec__sub">حسب الصنف المختار</span>
        </header>
        <div className="doclist">
          {docs.map((d, i) => {
            const checked = (data.docs||{})[d.k];
            return (
              <div key={d.k} className={`docrow ${checked ? 'is-checked' : ''}`}>
                <span
                  className="docrow__chk"
                  onClick={() => set({ docs: { ...(data.docs||{}), [d.k]: !checked } })}
                >
                  {checked && <Icon name="check" size={16} />}
                </span>
                <div>
                  <div className="docrow__title">{d.l}</div>
                  <div className="docrow__sub">{i+1} من {docs.length} · مطلوب للصنف المختار</div>
                </div>
                <button className="docrow__upload">
                  <Icon name="upload" size={14} /> ارفع نسخة
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- 5: Routing --- */}
      <section className="fsec" id="sec-route">
        <header className="fsec__head">
          <span className="fsec__num">٥</span>
          <h3 className="fsec__title">يحوّل الطلب لاستكمال الإجراءات إلى</h3>
        </header>
        <div className="rchips">
          {['خدمات المشتركين','الدائرة الفنية','الدائرة القانونية','الصندوق','شؤون الموظفين'].map(r => {
            const on = (data.route||[]).includes(r);
            return (
              <label key={r} className={`rchip ${on ? 'is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => {
                    const cur = data.route || [];
                    set({ route: on ? cur.filter(x=>x!==r) : [...cur, r] });
                  }}
                />
                <Icon name="arrow_back" size={16} />
                {r}
              </label>
            );
          })}
        </div>
      </section>

      {/* --- 6: Signatures --- */}
      <section className="fsec" id="sec-sign">
        <header className="fsec__head">
          <span className="fsec__num">٦</span>
          <h3 className="fsec__title">التوقيع والإقرار</h3>
          <span className="fsec__sub">مطلوب من ثلاث جهات</span>
        </header>
        <div className="fgrid fgrid--3">
          {[
            ['sigEmployee','موظف خدمات المشتركين'],
            ['sigApplicant','مقدم الطلب'],
            ['sigManager','مسؤول مركز خدمات المشتركين'],
          ].map(([k,l]) => (
            <div key={k} className="rs-field">
              <label className="rs-field__lbl rs-field__lbl-required">اسم وتوقيع {l}</label>
              <div style={{
                padding: 14, borderRadius: 12,
                border: '2px dashed var(--border-strong)',
                background: 'var(--surface-2)',
                textAlign: 'center', color: 'var(--text-soft)',
                cursor: 'pointer', fontSize: '0.85rem',
              }} onClick={() => set({ [k]: true })}>
                {data[k] ? (
                  <span style={{ color: 'var(--ok)', fontWeight: 700 }}>
                    <Icon name="verified" size={16} /> موقّع رقمياً · {new Date().toLocaleDateString('ar-IQ')}
                  </span>
                ) : (
                  <>
                    <Icon name="draw" size={20} style={{ display: 'block', margin: '0 auto 4px' }} />
                    اضغط للتوقيع الرقمي
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 16,
          padding: 14,
          background: 'color-mix(in srgb, var(--brand-navy) 5%, transparent)',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}>
          <label style={{ display:'flex', alignItems:'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!data.pledge}
              onChange={e => set({ pledge: e.target.checked })}
              style={{ accentColor: 'var(--brand-red)', width: 20, height: 20, marginTop: 2 }}
            />
            <span style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
              <strong>إقرار وتعهّد:</strong> أُقرّ أنا الموقع أدناه بعلمي وموافقتي على الأنظمة الصادرة عن شركة توزيع كهرباء بغداد / كهرباء الرصافة، والتزم بشروط منح الاشتراك وأصناف المساهمات والتأمينات،
              وعدم التعرّض للتجهيزات الكهربائية الخاصة بالشركة، وعدم السماح لأي شخص بالتزود بالتيار الكهربائي لأي مبنى آخر،
              وعدم التعرض لموظفي الشركة عند الدخول للبناء لأغراض الفحص أو القراءة الدورية.
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { ProForm, CS0001_STEPS, CLASSES, PHASES, DOCS });
