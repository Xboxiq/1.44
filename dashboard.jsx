// =============================================================
// Dashboard — Departments-first layout
// Order: Hero → Premium Departments → Reminders (extensible)
//        → Service Spotlight (rotating featured) → Up Next
// =============================================================

function HomeHero({ onNav, onCmdK }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-IQ-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="hero">
      <div className="hero__row">
        <div>
          <span className="hero__eyebrow">
            <span className="rs-pulse" style={{ background: '#10b981' }} />
            {dateStr} · مركز الرصافة - الكرادة
          </span>
          <h1 className="hero__title">صباح الخير، مهندس كرار</h1>
          <p className="hero__sub">
            ابدأ من أحد أقسامك الأربعة — أو اضغط <span className="kbd">⌘K</span> للبحث السريع عن خدمة، حالة، أو مشترك.
          </p>
        </div>
        <div className="cluster">
          <Button variant="primary" size="lg" icon="bolt" onClick={onCmdK}>
            ابدأ سريع
          </Button>
          <Button size="lg" icon="add" onClick={() => onNav('services')}>
            خدمة جديدة
          </Button>
        </div>
      </div>
      <div className="hero__stat">
        <div className="cell"><div className="num">{window.KPIS.todayCases}</div><div className="lbl">حالة جديدة اليوم</div></div>
        <div className="cell"><div className="num">{window.KPIS.pending}</div><div className="lbl">قيد المعالجة</div></div>
        <div className="cell"><div className="num">{fmt(window.KPIS.collected)} <small style={{fontSize:'0.6rem',opacity:0.7}}>د.ع</small></div><div className="lbl">محصّل اليوم</div></div>
        <div className="cell"><div className="num">{window.KPIS.satisfaction}%</div><div className="lbl">رضا المشتركين</div></div>
      </div>
    </div>
  );
}

// =============================================================
// PRIMARY: DEPARTMENTS — super premium centerpiece
// =============================================================

function DepartmentsPremium({ onNav }) {
  const [active, setActive] = useState(null);

  return (
    <section className="depts-premium">
      <header className="depts-premium__head">
        <div>
          <h3 className="depts-premium__title">
            <span className="depts-premium__title-ico"><Icon name="hub" size={18} /></span>
            الأقسام الأربعة
          </h3>
          <p className="depts-premium__sub">
            كل الخدمات الـ {window.SERVICES.length} موزّعة على أربعة أقسام — اختر القسم لاستعراض خدماته كاملة
          </p>
        </div>
      </header>

      <div className="depts-premium__grid">
        {window.SECTIONS.map((s, i) => {
          const services = window.SERVICES.filter(v => v.section === s.code);
          const sample = services.slice(0, 3);
          return (
            <button
              key={s.code}
              className={`dept-prem ${active === s.code ? 'is-active' : ''}`}
              style={{
                '--d-color': s.color,
                animationDelay: `${i * 80}ms`,
              }}
              onMouseEnter={() => setActive(s.code)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onNav('services', { section: s.code })}
            >
              {/* Decorative background */}
              <div className="dept-prem__bg" aria-hidden="true">
                <span className="dept-prem__mesh" />
                <span className="dept-prem__orb dept-prem__orb--1" />
                <span className="dept-prem__orb dept-prem__orb--2" />
                <span className="dept-prem__grid" />
              </div>

              {/* Animated gradient sweep strip */}
              <div className="dept-prem__strip" aria-hidden="true">
                <span className="dept-prem__strip-fill" />
              </div>

              <div className="dept-prem__head">
                <span className="dept-prem__code">{s.code}</span>
                <span className="dept-prem__count">
                  <span className="dept-prem__count-n">{services.length}</span>
                  <span className="dept-prem__count-l">خدمة</span>
                </span>
              </div>

              <div className="dept-prem__icon-wrap">
                <span className="dept-prem__icon">
                  <Icon name={s.icon} size={32} />
                </span>
                <span className="dept-prem__icon-ring" />
              </div>

              <div className="dept-prem__body">
                <h4 className="dept-prem__name">{s.name}</h4>
                <p className="dept-prem__blurb">{s.blurb}</p>
              </div>

              <div className="dept-prem__samples">
                {sample.map(sv => <span key={sv.code} className="dept-prem__chip">{sv.code}</span>)}
                {services.length > 3 && <span className="dept-prem__chip dept-prem__chip--more">+{services.length - 3}</span>}
              </div>

              <span className="dept-prem__cta">
                <span>افتح القسم</span>
                <Icon name="arrow_back" size={16} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// =============================================================
// REMINDERS — extensible (you can add tips & FAQs later)
// =============================================================

function RemindersHub() {
  const items = [
    {
      kind: 'tip', icon: 'lightbulb', color: '#c79111', tag: 'نصيحة',
      title: 'تجنّب إرجاع طلبات CS0001',
      body: 'أرفق كتاب تأييد السكن المصدّق قبل تحويل الطلب للدائرة الفنية — أكثر سبب إرجاع هذا الشهر.',
    },
    {
      kind: 'faq', icon: 'help', color: '#1d4ed8', tag: 'سؤال متكرر',
      title: 'كيف يُحسب التقسيط؟',
      body: 'يحتسب على أساس المتأخرات بحد أقصى 6 أقساط، يحتاج موافقة مدير المركز للقيم فوق 500,000 د.ع.',
    },
    {
      kind: 'update', icon: 'campaign', color: '#0e7490', tag: 'تحديث',
      title: 'تعديل جدول أجور 2026',
      body: 'بدأ سريان التعديل على أجور خدمات الكشف الميداني — راجع اللائحة قبل إصدار المطالبات.',
    },
  ];
  return (
    <section className="rh">
      <header className="rh__head">
        <div>
          <h3 className="rh__title">
            <span className="rh__title-ico"><Icon name="lightbulb" size={18} filled /></span>
            تنبيهات ومعرفة
          </h3>
          <p className="rh__sub">
            نصائح، أسئلة متكررة، وتحديثات تخص عملك اليومي
          </p>
        </div>
        <div className="cluster">
          <button className="rh__add" type="button" disabled title="قريباً — إضافة نصيحة">
            <Icon name="add" size={16} />
            <span>إضافة</span>
            <span className="rh__add-soon">قريباً</span>
          </button>
        </div>
      </header>
      <div className="rh__grid">
        {items.map((it, i) => (
          <article key={i} className={`rh-card rh-card--${it.kind}`} style={{ '--rm-color': it.color }}>
            <div className="rh-card__top">
              <span className="rh-card__tag">
                <Icon name={it.icon} size={14} filled /> {it.tag}
              </span>
              <button className="rh-card__more" aria-label="المزيد">
                <Icon name="more_horiz" size={18} />
              </button>
            </div>
            <h4 className="rh-card__title">{it.title}</h4>
            <p className="rh-card__body">{it.body}</p>
            <div className="rh-card__foot">
              <button className="rh-card__cta">
                التفاصيل <Icon name="arrow_back" size={14} />
              </button>
              <span className="rh-card__by">من النظام · منذ ساعتين</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// =============================================================
// SERVICE SPOTLIGHT — rotating featured card
// =============================================================

const SCENE_VARIANTS = [
  { // 0: Aurora mesh
    bg: 'linear-gradient(160deg, color-mix(in srgb, var(--svc-color) 92%, #000) 0%, color-mix(in srgb, var(--svc-color) 45%, #15153a) 100%)',
    deco: 'aurora',
  },
  { // 1: Soft beam
    bg: 'linear-gradient(155deg, #15153a 0%, color-mix(in srgb, var(--svc-color) 70%, #15153a) 60%, color-mix(in srgb, var(--svc-color) 85%, #000) 100%)',
    deco: 'beam',
  },
  { // 2: Diagonal duo
    bg: 'linear-gradient(120deg, color-mix(in srgb, var(--svc-color) 80%, #000) 0%, #1a1442 60%, color-mix(in srgb, var(--svc-color) 55%, #fff 0%) 100%)',
    deco: 'duo',
  },
  { // 3: Halo glow
    bg: 'radial-gradient(700px 400px at 80% 30%, color-mix(in srgb, var(--svc-color) 85%, #fff 0%), transparent 65%), linear-gradient(180deg, #14143a 0%, color-mix(in srgb, var(--svc-color) 50%, #15153a) 100%)',
    deco: 'halo',
  },
];

function ServiceSpotlight({ onPick, onNav }) {
  const top = useMemo(() => {
    return [...window.SERVICES].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  }, []);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Auto-advance every 7 seconds
  useEffect(() => {
    if (paused) return;
    setProgress(0);
    const tick = setInterval(() => {
      setProgress(p => {
        const next = p + 100 / 70; // 7000ms / 100 ms
        if (next >= 100) {
          setIdx(i => (i + 1) % top.length);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(tick);
  }, [idx, paused, top.length]);

  const svc = top[idx];
  const sec = window.SECTION_MAP[svc.section];
  const scene = SCENE_VARIANTS[idx % SCENE_VARIANTS.length];

  return (
    <section
      className="spot"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <header className="spot__head">
        <div>
          <h3 className="spot__title">
            <span className="spot__title-ico"><Icon name="bolt" size={18} filled /></span>
            خدمة مختارة
          </h3>
          <p className="spot__sub">
            البطاقة تتغيّر تلقائياً بين أكثر الخدمات استخداماً — توقّف عند التمرير
          </p>
        </div>
        <div className="cluster">
          <Button size="sm" variant="ghost" icon="apps" onClick={() => onNav('services')}>
            كل الخدمات
          </Button>
        </div>
      </header>

      {/* The big rotating card */}
      <div
        key={svc.code}
        className={`spot-card spot-card--${scene.deco}`}
        style={{
          '--svc-color': sec.color,
          background: scene.bg,
        }}
        onClick={() => onPick(svc.code)}
      >
        <div className="spot-card__bg" aria-hidden="true">
          <span className="spot-card__orb spot-card__orb--1" />
          <span className="spot-card__orb spot-card__orb--2" />
          <span className="spot-card__grid" />
          <span className="spot-card__sheen" />
        </div>

        <div className="spot-card__row spot-card__row--top">
          <span className="spot-card__rank">
            <span className="spot-card__rank-n">#{idx + 1}</span>
            <span>الأكثر طلباً اليوم</span>
          </span>
          <span className="spot-card__code">{svc.code}</span>
        </div>

        <div className="spot-card__body">
          <div className="spot-card__icon-wrap">
            <span className="spot-card__icon"><Icon name={svc.icon} size={44} /></span>
            <span className="spot-card__icon-ring" />
            <span className="spot-card__icon-ring spot-card__icon-ring--2" />
          </div>
          <div className="spot-card__copy">
            <span className="spot-card__sec">
              <span className="spot-card__sec-dot" /> {sec.name}
            </span>
            <h4 className="spot-card__name">{svc.name}</h4>
            <div className="spot-card__meta">
              <span><Icon name="schedule" size={16} /> مدة معتادة {svc.sla} أيام عمل</span>
              <span><Icon name="local_fire_department" size={16} /> طلب {svc.popularity}٪</span>
              {svc.fixedPrice
                ? <span><Icon name="payments" size={16} /> {fmtIQD(svc.fixedPrice)}</span>
                : <span><Icon name="payments" size={16} /> حسب الصنف</span>}
            </div>
          </div>
        </div>

        <div className="spot-card__row spot-card__row--bottom">
          <div className="spot-card__cta-row">
            <span className="spot-card__cta">
              ابدأ التعبئة
              <Icon name="arrow_back" size={18} />
            </span>
            <button
              className="spot-card__cta-secondary"
              onClick={(e) => { e.stopPropagation(); onNav('detail', { code: svc.code }); }}
            >
              <Icon name="info" size={16} />
              تفاصيل الخدمة
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="spot-card__progress" aria-hidden="true">
          <span className="spot-card__progress-fill" style={{ width: progress + '%' }} />
        </div>
      </div>

      {/* Carousel controls */}
      <div className="spot__controls">
        <button
          className="spot__arrow"
          onClick={() => setIdx(i => (i - 1 + top.length) % top.length)}
          aria-label="السابق"
        >
          <Icon name="chevron_right" size={18} />
        </button>
        <div className="spot__dots">
          {top.map((s, i) => (
            <button
              key={s.code}
              className={`spot__dot ${i === idx ? 'is-on' : ''}`}
              onClick={() => { setIdx(i); setProgress(0); }}
              aria-label={`خدمة ${i + 1}`}
              style={{ '--dot-color': window.SECTION_MAP[s.section].color }}
            >
              <span className="spot__dot-inner" />
            </button>
          ))}
        </div>
        <button
          className="spot__arrow"
          onClick={() => setIdx(i => (i + 1) % top.length)}
          aria-label="التالي"
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <button
          className="spot__pause"
          onClick={() => setPaused(p => !p)}
          aria-label={paused ? 'تشغيل' : 'إيقاف'}
        >
          <Icon name={paused ? 'play_arrow' : 'pause'} size={16} />
          <span>{paused ? 'متوقف' : 'تلقائي'}</span>
        </button>
      </div>
    </section>
  );
}

// =============================================================
// UP NEXT — softer, at bottom
// =============================================================

function UpNext({ onPick, onNav }) {
  const tasks = useMemo(() => {
    const priority = { urgent: 0, vip: 1, standard: 2 };
    return [...window.RECENT_CASES]
      .sort((a, b) => (priority[a.priority] ?? 9) - (priority[b.priority] ?? 9))
      .slice(0, 5);
  }, []);
  return (
    <div className="section upnext">
      <div className="section__head">
        <h3 className="section__title">
          <Icon name="task_alt" /> ما يلزمك إنجازه
        </h3>
        <Button size="sm" variant="ghost" icon="arrow_back" onClick={() => onNav('cases')}>
          كل الحالات
        </Button>
      </div>
      <div>
        {tasks.map(c => {
          const svc = window.SERVICE_MAP[c.svc];
          const sec = window.SECTION_MAP[svc.section];
          const sla = c.priority === 'urgent' ? 'crit' : c.priority === 'vip' ? 'warn' : '';
          const slaTxt = c.priority === 'urgent' ? 'عاجل' : c.priority === 'vip' ? 'VIP' : 'ضمن المدة';
          return (
            <div
              key={c.id}
              className="taskrow"
              style={{ '--task-color': sec.color }}
              onClick={() => onNav('case', { id: c.id, svc: c.svc })}
            >
              <span className="taskrow__ico"><Icon name={svc.icon} size={22} /></span>
              <div className="taskrow__main">
                <div className="taskrow__t">{c.subscriber}</div>
                <div className="taskrow__s">
                  <span className="taskrow__id">{c.id}</span> · {svc.code} · {c.status}
                </div>
              </div>
              <span className={`sladot ${sla}`}>{slaTxt}</span>
              <button className="taskrow__cta">
                افتح <Icon name="arrow_back" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KPI({ ico, label, value, delta, up, dn, color }) {
  return (
    <div className="kpi" style={{ '--kpi-color': color }}>
      <div className="kpi__ico"><Icon name={ico} /></div>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      {delta && (
        <span className={`kpi__delta ${up ? 'up' : 'dn'}`}>
          <Icon name={up ? 'trending_up' : 'trending_down'} size={14} />
          {delta}
        </span>
      )}
    </div>
  );
}

function Dashboard({ onNav, onPick, onCmdK }) {
  return (
    <div className="app-page fade-in">
      <HomeHero onNav={onNav} onCmdK={onCmdK} />
      <Crumbs items={[{ label: 'الرئيسية' }]} />

      <DepartmentsPremium onNav={onNav} />
      <RemindersHub />
      <ServiceSpotlight onPick={onPick} onNav={onNav} />
      <UpNext onPick={onPick} onNav={onNav} />
    </div>
  );
}

Object.assign(window, { Dashboard, KPI });
