// =============================================================
// Form Shell — tabs (professional / original), autosave, fees,
//   step navigation, requirements alert
// =============================================================

// ---- Pre-flight modal: requirements + acknowledgment ----
function PreflightAlert({ svc, onConfirm, onCancel }) {
  const [ack, setAck] = useState([false, false, false]);
  const sec = window.SECTION_MAP[svc.section];
  const allReady = ack.every(Boolean);
  return (
    <>
      <div className="scrim" />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 102,
        display: 'grid', placeItems: 'center', padding: 24,
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'var(--surface)',
          borderRadius: 20,
          boxShadow: '0 30px 80px rgba(11,37,69,0.35)',
          width: 'min(620px, 100%)',
          maxHeight: '90vh',
          overflow: 'auto',
          pointerEvents: 'auto',
          border: '1px solid var(--border)',
        }}>
          <div style={{
            background: 'var(--brand-grad)',
            padding: '22px 26px',
            color: '#fff',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <Icon name="task_alt" filled size={26} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', opacity: 0.8, letterSpacing: '0.08em' }}>
                {svc.code} · {sec.name}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>قبل البدء بتعبئة النموذج</h2>
            <p style={{ margin: '6px 0 0', fontSize: '0.92rem', opacity: 0.88 }}>
              يرجى التأكد من توفر الشروط الأساسية لخدمة <strong>{svc.name}</strong>.
            </p>
          </div>
          <div style={{ padding: '22px 26px' }}>
            {[
              { t: 'استلمت من المشترك جميع الوثائق الأصلية والمصدّقة', s: 'الهوية، بطاقة السكن، كتاب التأييد، الطابو/الإجازة' },
              { t: 'تم التحقق من عدم وجود طلب قائم أو دين سابق على العقار', s: 'راجع نظام الجباية + قاعدة بيانات الاشتراكات' },
              { t: 'سدد المشترك رسوم طلب الخدمة في الصندوق', s: 'يجب إدراج رقم وصل القبض ضمن النموذج' },
            ].map((it, i) => (
              <label key={i} style={{
                display:'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 12, alignItems: 'flex-start',
                padding: '12px 14px',
                marginBottom: 8,
                background: ack[i] ? 'color-mix(in srgb, var(--ok) 8%, transparent)' : 'var(--surface-2)',
                border: '1.5px solid ' + (ack[i] ? 'color-mix(in srgb, var(--ok) 40%, var(--border))' : 'var(--border)'),
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 200ms',
              }}>
                <input
                  type="checkbox"
                  checked={ack[i]}
                  onChange={(e) => { const c = [...ack]; c[i] = e.target.checked; setAck(c); }}
                  style={{ width: 22, height: 22, accentColor: 'var(--brand-red)', cursor: 'pointer', marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{it.t}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: 3 }}>{it.s}</div>
                </div>
              </label>
            ))}
            <div style={{
              padding: 14, marginTop: 6,
              borderRadius: 10,
              background: 'color-mix(in srgb, var(--info) 7%, transparent)',
              border: '1px solid color-mix(in srgb, var(--info) 25%, var(--border))',
              fontSize: '0.85rem', lineHeight: 1.7,
              display: 'flex', gap: 10,
            }}>
              <Icon name="info" size={20} style={{ color: 'var(--info)', flex: 'none', marginTop: 2 }} />
              <span>
                النموذج <strong>طبق الأصل</strong> للنموذج الورقي الرسمي، مع إضافة الواجهة الاحترافية لتسريع الإدخال. يمكن التبديل بين الواجهتين في أي وقت.
              </span>
            </div>
          </div>
          <div style={{
            padding: '16px 26px',
            borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', gap: 8,
          }}>
            <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
            <Button variant="primary" icon="arrow_back" disabled={!allReady} onClick={onConfirm}>
              متابعة وبدء التعبئة
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---- Autosave hook ----
function useAutosave(key, initial) {
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch { return initial; }
  });
  const [status, setStatus] = useState('saved'); // saving | saved | error
  const t = useRef(null);

  const update = useCallback((patch) => {
    setData(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
    setStatus('saving');
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ ...data, ...(typeof patch === 'function' ? patch(data) : patch) }));
        setStatus('saved');
      } catch { setStatus('error'); }
    }, 500);
  }, [data, key]);

  return [data, update, status];
}

function SaveBadge({ status }) {
  const map = {
    saved: { ico: 'cloud_done', txt: 'محفوظ تلقائياً', cls: 'is-saved' },
    saving: { ico: 'cloud_sync', txt: 'جاري الحفظ…', cls: 'is-saving' },
    error: { ico: 'cloud_off', txt: 'تعذّر الحفظ', cls: 'is-error' },
  };
  const m = map[status];
  return (
    <span className={`rs-savebadge ${m.cls}`}>
      <Icon name={m.ico} size={16} />
      {m.txt}
    </span>
  );
}

Object.assign(window, { PreflightAlert, useAutosave, SaveBadge });
