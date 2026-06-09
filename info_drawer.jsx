// =============================================================
// Info Drawer — explanation of a service (purpose, when, how)
// =============================================================

function InfoDrawer({ svc, onClose }) {
  if (!svc) return null;
  const sec = window.SECTION_MAP[svc.section];
  const guide = (window.guideFor && window.guideFor(svc.code)) || {
    purpose: 'تقدّم هذه الخدمة للمشتركين عبر مركز خدمات المشتركين، ضمن إجراءات قسم ' + sec.name + '.',
    when: ['استكمال الوثائق المطلوبة من المشترك.', 'دفع الرسوم في الصندوق قبل تحويل الطلب.'],
    docs: ['هوية الأحوال المدنية وبطاقة السكن.'],
    fees: svc.fixedPrice ? ('أجور ثابتة: ' + fmtIQD(svc.fixedPrice)) : (svc.priceNote || 'تختلف حسب الصنف ونوع الربط.'),
    legal: 'تخضع لأنظمة شركة توزيع كهرباء بغداد / الرصافة.',
    pitfalls: ['تأكد من اكتمال البيانات قبل التحويل.'],
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer__head">
          <button className="drawer__close" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" size={20} />
          </button>
          <div className="drawer__eyebrow">{svc.code} · {sec.name}</div>
          <h2 className="drawer__title">{svc.name}</h2>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999,
              background: 'rgba(255,255,255,0.16)', color: '#fff',
              fontSize: '0.78rem', fontWeight: 700,
            }}>
              <Icon name="schedule" size={16} /> مدّة معتادة {svc.sla} أيام
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999,
              background: 'rgba(255,255,255,0.16)', color: '#fff',
              fontSize: '0.78rem', fontWeight: 700,
            }}>
              <Icon name="payments" size={16} />
              {svc.fixedPrice ? fmtIQD(svc.fixedPrice) : (svc.priceNote || 'حسب الصنف')}
            </span>
          </div>
        </div>
        <div className="drawer__body">
          <section className="drawer__sec">
            <h4><Icon name="info" /> الغرض من الخدمة</h4>
            <p>{guide.purpose}</p>
          </section>
          <section className="drawer__sec">
            <h4><Icon name="check_circle" /> متى يقدّمها الموظف؟</h4>
            <ul>{guide.when.map((w,i) => <li key={i}>{w}</li>)}</ul>
          </section>
          <section className="drawer__sec">
            <h4><Icon name="folder" /> الوثائق المطلوبة</h4>
            <ul>{guide.docs.map((d,i) => <li key={i}>{d}</li>)}</ul>
          </section>
          <section className="drawer__sec">
            <h4><Icon name="payments" /> الأجور</h4>
            <p>{guide.fees}</p>
          </section>
          <section className="drawer__sec" style={{
            padding: 14,
            background: 'color-mix(in srgb, var(--warn) 7%, var(--surface))',
            border: '1px solid color-mix(in srgb, var(--warn) 30%, var(--border))',
            borderRadius: 12,
          }}>
            <h4 style={{ color: 'var(--warn)' }}><Icon name="warning" /> أخطاء شائعة</h4>
            <ul>{guide.pitfalls.map((p,i) => <li key={i}>{p}</li>)}</ul>
          </section>
          <section className="drawer__sec">
            <h4><Icon name="gavel" /> الأساس القانوني</h4>
            <p>{guide.legal}</p>
          </section>
        </div>
        <div className="drawer__foot">
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
          <Button variant="primary" icon="play_arrow" onClick={onClose}>ابدأ التعبئة</Button>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { InfoDrawer });
