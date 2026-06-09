// =============================================================
// Shell — CommandRail, Topbar, App container, primitives
// =============================================================

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ---------- Icon ----------
function Icon({ name, size = 22, filled = false, weight, className = '', style = {} }) {
  const s = { fontSize: size, ...style };
  if (weight) s['--rs-icon-wght'] = weight;
  if (filled) s['--rs-icon-fill'] = 1;
  return <span className={`material-symbols-outlined ${className}`} style={s}>{name}</span>;
}

// ---------- Button ----------
function Button({ variant = 'default', size, icon, children, onClick, type = 'button', className = '', ...rest }) {
  const cls = ['rs-btn',
    variant === 'primary' && 'rs-btn--primary',
    variant === 'ghost' && 'rs-btn--ghost',
    variant === 'danger' && 'rs-btn--danger',
    size === 'sm' && 'rs-btn--sm',
    size === 'lg' && 'rs-btn--lg',
    className,
  ].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} onClick={onClick} {...rest}>
      {icon && <span className="rs-btn__ico"><Icon name={icon} size={18} /></span>}
      {children}
    </button>
  );
}

// ---------- Tag ----------
function Tag({ variant, dot, children }) {
  const cls = ['rs-tag', variant && `rs-tag--${variant}`].filter(Boolean).join(' ');
  return (
    <span className={cls}>
      {dot && <span className="rs-tag__dot" />}
      {children}
    </span>
  );
}

// ---------- SectionBadge ----------
function SectionBadge({ code }) {
  return <span className={`rs-secbadge rs-secbadge--${code}`}>{code}</span>;
}

// ---------- Topbar ----------
function Topbar({ user = 'م. كرار البياتي', center = 'مركز الرصافة - فرع الكرادة', onCmdK }) {
  const [dark, setDark] = useState(() => localStorage.getItem('cs_theme') === 'dark');
  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('cs_theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <div className="rs-topbar">
      <a className="rs-topbar__brand" href="#/">
        <div className="rs-topbar__mark"><img src="assets/img/logo.png" alt="" /></div>
        <div className="rs-topbar__text">
          <strong>تدفّق الخير</strong>
          <small>منصة خدمات المشتركين — كهرباء الرصافة</small>
        </div>
      </a>
      <div className="cluster" style={{ flex: 1, justifyContent: 'center', maxWidth: 560 }}>
        <button
          className="rs-search"
          style={{ width: '100%', textAlign: 'start', cursor: 'pointer', border: '1.5px solid var(--border)' }}
          onClick={onCmdK}
          aria-label="فتح البحث السريع"
        >
          <span className="rs-search__ico"><Icon name="search" size={20} /></span>
          <span style={{ flex: 1, color: 'var(--text-soft)', fontSize: '0.9rem' }}>
            ابحث برقم اشتراك، اسم مشترك، أو رقم خدمة CS0001…
          </span>
          <span className="kbd kbd--ghost">⌘K</span>
        </button>
      </div>
      <div className="rs-topbar__actions">
        <span className="rs-topbar__status">
          <span className="rs-pulse" /> متصل
        </span>
        <button className="rs-iconbtn" onClick={() => setDark(!dark)} aria-label="الوضع الليلي">
          <Icon name={dark ? 'light_mode' : 'dark_mode'} size={20} />
        </button>
        <button className="rs-iconbtn" aria-label="الإشعارات">
          <Icon name="notifications" size={20} />
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, paddingInline: 8, borderInlineStart: '1px solid var(--border)', marginInlineStart: 6 }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-grad)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13 }}>كب</span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <strong style={{ fontSize: '0.85rem' }}>{user}</strong>
            <small style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>{center}</small>
          </span>
        </span>
      </div>
    </div>
  );
}

// ---------- CommandRail ----------
function CommandRail({ route, onNav }) {
  const items = [
    { key: 'home',     label: 'الرئيسية',         icon: 'dashboard' },
    { key: 'services', label: 'الخدمات',         icon: 'apps' },
    { key: 'cases',    label: 'الحالات النشطة',  icon: 'inventory_2' },
    { key: 'pricing',  label: 'الأجور والأسعار',  icon: 'request_quote' },
    { key: 'guide',    label: 'دليل الإجراءات',  icon: 'menu_book' },
    { key: 'reports',  label: 'التقارير',         icon: 'bar_chart' },
  ];
  return (
    <aside className="rs-rail" tabIndex={0}>
      <a className="rs-rail__brand" href="#/" onClick={(e) => { e.preventDefault(); onNav('home'); }}>
        <div className="rs-rail__mark"><img src="assets/img/logo.png" alt="" /></div>
        <div className="rs-rail__text">
          <strong>تدفّق الخير</strong>
          <small>RASAFA · CS HUB</small>
        </div>
      </a>
      <ul className="rs-rail__nav">
        {items.map(it => (
          <li key={it.key}>
            <button
              className={`rs-rail__link ${route === it.key ? 'is-active' : ''}`}
              onClick={() => onNav(it.key)}
            >
              <span className="material-symbols-outlined">{it.icon}</span>
              <span className="rs-rail__link-lbl">{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="rs-rail__foot">
        <button className="rs-rail__sos">
          <span className="material-symbols-outlined">crisis_alert</span>
          <span className="rs-rail__link-lbl">طوارئ — CA0002</span>
        </button>
      </div>
    </aside>
  );
}

// ---------- Crumbs ----------
function Crumbs({ items }) {
  return (
    <nav className="rs-crumbs" aria-label="breadcrumbs">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="rs-crumbs__sep">›</span>}
          {it.onClick ? (
            <a href="#" onClick={(e) => { e.preventDefault(); it.onClick(); }}>{it.label}</a>
          ) : (
            <span className="rs-crumbs__current">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

Object.assign(window, { Icon, Button, Tag, SectionBadge, Topbar, CommandRail, Crumbs });
