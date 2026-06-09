// =============================================================
// Service Detail — landing page for one service
// =============================================================

function ServiceDetail({ code, onNav, onStart }) {
  const svc = window.SERVICE_MAP[code];
  const sec = window.SECTION_MAP[svc.section];
  const [infoOpen, setInfoOpen] = useState(false);
  const guide = window.SERVICE_GUIDES[code] || window.SERVICE_GUIDES['CS0001'];

  // Compute fees breakdown estimate
  const feeRows = svc.code === 'CS0001'
    ? [
      { name: 'أجور الكشف (منزلي)',    amount: 15000 },
      { name: 'تجهيز ونصب المقياس',    amount: 62500 },
      { name: 'الغطاء السفلي للمقياس', amount: 12500 },
      { name: 'اشتراك شهري (منزلي)',   amount: 3000  },
      { name: 'تغيير اسم المشترك',     amount: 25000, note: 'عند اللزوم' },
    ]
    : svc.fixedPrice
      ? [{ name: 'الأجور الثابتة', amount: svc.fixedPrice }]
      : [];

  return (
    <div className="app-page fade-in">
      <Crumbs items={[
        { label: 'الرئيسية', onClick: () => onNav('home') },
        { label: 'الخدمات', onClick: () => onNav('services') },
        { label: svc.code + ' — ' + svc.name },
      ]} />

      {/* Hero header for the service */}
      <div className="hero" style={{ padding: 24 }}>
        <div className="hero__row">
          <div>
            <span className="hero__eyebrow">
              <Icon name={sec.icon} size={16} /> {sec.name} · {svc.code}
            </span>
            <h1 className="hero__title">{svc.name}</h1>
            <p className="hero__sub">
              {guide.purpose}
            </p>
            <div className="cluster" style={{ marginTop: 16 }}>
              <Button variant="primary" size="lg" icon="play_arrow" onClick={onStart}>
                ابدأ تعبئة النموذج
              </Button>
              <Button size="lg" icon="info" onClick={() => setInfoOpen(true)}>
                دليل الخدمة الكامل
              </Button>
              <Button size="lg" variant="ghost" icon="picture_as_pdf">
                تنزيل النموذج الفارغ
              </Button>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gap: 10,
            minWidth: 260,
          }}>
            <div style={{
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.16)',
            }}>
              <div style={{ fontSize: '0.74rem', opacity: 0.7, marginBottom: 4 }}>المدة المعتادة</div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{svc.sla} أيام عمل</div>
            </div>
            <div style={{
              padding: '14px 16px',
              background: 'rgba(244, 196, 48, 0.18)',
              borderRadius: 14,
              border: '1px solid rgba(244, 196, 48, 0.4)',
            }}>
              <div style={{ fontSize: '0.74rem', opacity: 0.8, marginBottom: 4 }}>الأجور التقديرية</div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>
                {svc.fixedPrice ? fmtIQD(svc.fixedPrice) : 'تحسب آلياً'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          <div className="section">
            <div className="section__head">
              <h3 className="section__title"><Icon name="check_circle" /> متى تقدّم هذه الخدمة؟</h3>
              <Tag dot>شروط أساسية</Tag>
            </div>
            <ul style={{
              listStyle: 'none', padding: 0, margin: 0,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {guide.when.map((w, i) => (
                <li key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: 12, alignItems: 'flex-start',
                  padding: '12px 14px',
                  background: 'var(--surface-2)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}>
                  <span style={{
                    width: 28, height: 28,
                    borderRadius: 8,
                    background: 'color-mix(in srgb, var(--ok) 18%, transparent)',
                    color: 'var(--ok)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Icon name="done" size={18} />
                  </span>
                  <span style={{ fontSize: '0.92rem', lineHeight: 1.7 }}>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="section">
            <div className="section__head">
              <h3 className="section__title"><Icon name="folder" /> الوثائق المطلوبة</h3>
              <span className="muted" style={{ fontSize: '0.82rem' }}>تختلف حسب صنف الاشتراك</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guide.docs.map((d, i) => (
                <li key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 12, alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--surface)',
                  borderRadius: 10,
                  border: '1px dashed var(--border-strong)',
                }}>
                  <span style={{
                    width: 26, height: 26,
                    borderRadius: 7,
                    background: 'var(--surface-2)',
                    color: 'var(--brand-navy)',
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800, fontSize: '0.75rem',
                  }}>{i+1}</span>
                  <span style={{ fontSize: '0.9rem' }}>{d}</span>
                  <Icon name="description" size={18} style={{ color: 'var(--text-soft)' }} />
                </li>
              ))}
            </ul>
          </div>

          <div className="section" style={{
            background: 'color-mix(in srgb, var(--warn) 6%, var(--surface))',
            borderColor: 'color-mix(in srgb, var(--warn) 28%, var(--border))',
          }}>
            <div className="section__head">
              <h3 className="section__title">
                <Icon name="warning" filled style={{ color: 'var(--warn)' }} />
                أخطاء شائعة يجب الانتباه لها
              </h3>
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 20, color: 'var(--text)', lineHeight: 1.85, fontSize: '0.92rem' }}>
              {guide.pitfalls.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>

        <div className="stack">
          {/* Fees panel */}
          <div className="feepanel">
            <div className="feepanel__head">
              <Icon name="payments" />
              <span className="feepanel__title">جدول الأجور التقديرية</span>
            </div>
            {feeRows.length > 0 ? (
              <>
                {feeRows.map((r, i) => (
                  <div key={i} className="feerow">
                    <span className="feerow__name">{r.name}{r.note && <span style={{fontSize:'0.72rem', marginInlineStart: 6, color: 'var(--text-soft)'}}>· {r.note}</span>}</span>
                    <span className="feerow__amt">{fmtIQD(r.amount)}</span>
                  </div>
                ))}
                <div className="feepanel__total">
                  <span className="lbl">المجموع التقديري</span>
                  <span className="amt">{fmtIQD(feeRows.reduce((s,r)=>s+r.amount,0))}</span>
                </div>
              </>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.7 }}>
                لا توجد أجور ثابتة لهذه الخدمة. سيتم احتسابها داخل النموذج حسب البيانات.
              </p>
            )}
            <p className="muted" style={{ fontSize: '0.74rem', marginTop: 12, lineHeight: 1.6 }}>
              * المبالغ مستندة إلى جدول الأسعار الرسمي للعام 2026، وقد تتغير حسب الصنف ونوع الربط.
            </p>
          </div>

          {/* Workflow steps */}
          <div className="section">
            <div className="section__head">
              <h3 className="section__title"><Icon name="route" /> مسار الطلب</h3>
              <span className="muted" style={{ fontSize: '0.78rem' }}>المرحلة الحالية: استلام</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { ico: 'edit_document', name: 'استلام وتعبئة النموذج', who: 'موظف خدمات المشتركين', dur: 'فوري' },
                { ico: 'currency_exchange', name: 'دفع رسوم طلب الخدمة', who: 'الصندوق', dur: '15 دقيقة' },
                { ico: 'location_searching', name: 'كشف ميداني للموقع', who: 'الدائرة الفنية', dur: '٣ أيام' },
                { ico: 'price_change', name: 'تقدير الأجور والمطالبة المالية', who: 'الدائرة المالية', dur: 'يوم واحد' },
                { ico: 'payments', name: 'دفع المطالبة وإصدار الموافقة', who: 'الصندوق + المدير', dur: 'يوم' },
                { ico: 'electrical_services', name: 'تنفيذ التوصيل وإصدار الاشتراك', who: 'الدائرة الفنية', dur: 'يومان' },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr auto',
                  gap: 12, alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: i === 0 ? 'color-mix(in srgb, var(--brand-navy) 6%, transparent)' : 'var(--surface-2)',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{
                    width: 36, height: 36,
                    borderRadius: 9,
                    background: i === 0 ? 'var(--brand-navy)' : 'var(--surface)',
                    color: i === 0 ? '#fff' : 'var(--brand-navy)',
                    border: '1px solid var(--border-strong)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Icon name={s.ico} size={20} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-soft)' }}>{s.who}</div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    padding: '4px 9px',
                    borderRadius: 999,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontWeight: 700,
                  }}>{s.dur}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="section__head">
              <h3 className="section__title"><Icon name="gavel" /> الأساس القانوني</h3>
            </div>
            <p style={{ margin: 0, lineHeight: 1.8, fontSize: '0.92rem', color: 'var(--text-soft)' }}>
              {guide.legal}
            </p>
          </div>
        </div>
      </div>

      {infoOpen && <InfoDrawer svc={svc} onClose={() => setInfoOpen(false)} />}
    </div>
  );
}

Object.assign(window, { ServiceDetail });
