import RevealWrapper from './RevealWrapper';

export default function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero__inner">

        {/* Eyebrow pill */}
        <RevealWrapper>
          <div className="hero__eyebrow">
            <b>IA · Gestorías</b>
            Tu gestoría en piloto automático
          </div>
        </RevealWrapper>

        {/* App banner mockup */}
        <RevealWrapper>
          <div className="hero__banner-wrap">
            <div className="hero__banner">
              <AppMockup />
            </div>

            {/* Floating chip 1 */}
            <div className="hero__chip hero__chip--1">
              <div className="hero__chip-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                  <path d="M12 8v4l3 3" />
                </svg>
              </div>
              <div>
                <div>3h ahorradas hoy</div>
                <div className="hero__chip-sub">automatización IA</div>
              </div>
            </div>

            {/* Floating chip 2 */}
            <div className="hero__chip hero__chip--2">
              <div className="hero__chip-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <div>
                <div>+12% eficiencia</div>
                <div className="hero__chip-sub">este mes vs anterior</div>
              </div>
            </div>
          </div>
        </RevealWrapper>

        {/* CTA */}
        <RevealWrapper>
          <div className="hero__cta-row">
            <a href="#download" className="btn btn--primary btn--lg">
              Empieza gratis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a href="http://localhost:4200" className="btn btn--ghost btn--lg">
              Ver demo en vivo →
            </a>
          </div>
          <div className="hero__cta-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              30 días gratis
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Sin tarjeta de crédito
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Configuración en 5 min
            </span>
          </div>
        </RevealWrapper>

      </div>

      {/* Trust strip */}
      <div className="trust" style={{ marginTop: '60px' }}>
        <div className="trust__inner">
          <span className="trust__label">Usado por</span>
          <div className="trust__logos">
            <span>Gestoría López</span>
            <span>Asesoría Navarro</span>
            <span>Fiscal&amp;Co</span>
            <span>ContaPlus</span>
            <span>GestorPro</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppMockup() {
  return (
    <div className="hero-mockup">
      {/* Sidebar */}
      <div className="hero-mockup__sidebar">
        <div className="hero-mockup__brand">
          <div className="hero-mockup__brand-ico">G</div>
          GestorIA
        </div>
        {[
          { label: 'Dashboard', active: true },
          { label: 'Clientes', active: false },
          { label: 'Trabajos', active: false },
          { label: 'Pagos', active: false },
          { label: 'Fichaje', active: false },
        ].map((item) => (
          <div key={item.label} className={`mock-nav-item${item.active ? ' active' : ''}`}>
            <span className="mock-nav-dot" />
            {item.label}
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="hero-mockup__main">
        <div className="mock-topbar">
          <span className="mock-topbar-title">Dashboard</span>
          <span className="mock-topbar-date">mayo 2026</span>
        </div>
        <div className="mock-content">
          {/* KPIs */}
          <div className="mock-kpis">
            {[
              { label: 'Clientes activos', val: '47', sub: '+3 este mes' },
              { label: 'Trabajos en curso', val: '12', sub: '2 bloqueados' },
              { label: 'Facturado 30d', val: '€8.4k', sub: '+18%' },
              { label: 'Horas fichadas', val: '186h', sub: 'este mes' },
            ].map((kpi) => (
              <div key={kpi.label} className="mock-kpi">
                <div className="mock-kpi-label">{kpi.label}</div>
                <div className="mock-kpi-val">{kpi.val}</div>
                <div className="mock-kpi-sub">{kpi.sub}</div>
              </div>
            ))}
          </div>
          {/* Bottom row */}
          <div className="mock-row">
            <div className="mock-panel">
              <div className="mock-panel-title">Actividad reciente</div>
              {[
                { dot: 'g', text: 'Factura #2041 pagada — Garaje Pons' },
                { dot: 'y', text: 'Trabajo vence mañana — Renta 2025' },
                { dot: 'g', text: 'Nuevo cliente — Papelería Norte' },
                { dot: 'r', text: 'Factura #2039 vencida — Muebles SA' },
              ].map((item, i) => (
                <div key={i} className="mock-list-item">
                  <span className={`mock-dot ${item.dot}`} />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <div className="mock-panel">
              <div className="mock-panel-title">Facturación mensual</div>
              <div className="mock-chart">
                {[40, 55, 35, 70, 60, 80, 65, 90, 75, 100, 85, 95].map((h, i) => (
                  <div
                    key={i}
                    className={`mock-bar${h >= 90 ? ' hi' : ''}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
