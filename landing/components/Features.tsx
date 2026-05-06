import RevealWrapper from './RevealWrapper';

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Gestión de clientes',
    desc: 'Panel centralizado con historial completo, documentos, estado fiscal y comunicaciones de cada cliente.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: 'Control de trabajos',
    desc: 'Kanban visual para gestionar expedientes. Asigna empleados, establece prioridades y sigue el progreso en tiempo real.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: 'Pagos y facturas',
    desc: 'Emite facturas, registra cobros y controla los vencimientos. KPIs en tiempo real de cobrado, pendiente y vencido.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Fichaje digital',
    desc: 'Registro de presencia con entradas, salidas y pausas. Informes mensuales automáticos e integración con nóminas.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: 'Calendario fiscal',
    desc: 'Vencimientos fiscales precargados para España. Alertas automáticas y planificación por cliente y modelo tributario.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: 'Panel de gerencia',
    desc: 'Vista 360° del negocio: KPIs de equipo, gráficas de productividad, fichajes de todos y gestión de clientes y trabajos.',
    big: true,
    bigIcon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    bigTitle: 'Asistente IA integrado',
    bigDesc:
      'Redacta escritos, resume expedientes y sugiere el siguiente paso. El asistente IA analiza el contexto de cada trabajo y cliente para darte recomendaciones precisas. Sin prompts complicados — funciona dentro del flujo natural de trabajo.',
  },
];

export default function Features() {
  const regularFeatures = FEATURES.filter((f) => !f.big);
  const bigFeature = FEATURES.find((f) => f.big)!;

  return (
    <section className="features" id="features">
      <div className="wrap">
        <RevealWrapper>
          <div className="section-head">
            <span className="eyebrow">Características</span>
            <h2>Todo lo que una gestoría necesita</h2>
            <p>
              Desde el fichaje del empleado hasta la factura al cliente,<br />
              GestorIA cubre cada parte del proceso.
            </p>
          </div>
        </RevealWrapper>

        <div className="features__grid">
          {/* Big AI feature */}
          <RevealWrapper>
            <div className="feature feature--big">
              <div className="feature__icon">
                {bigFeature.bigIcon}
              </div>
              <h3>{bigFeature.bigTitle}</h3>
              <p>{bigFeature.bigDesc}</p>
            </div>
          </RevealWrapper>

          {/* Regular features */}
          {regularFeatures.map((f) => (
            <RevealWrapper key={f.title}>
              <div className="feature">
                <div className="feature__icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </RevealWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}
