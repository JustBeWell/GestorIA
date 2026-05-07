import RevealWrapper from './RevealWrapper';

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Control horario sin ruido',
    desc: 'Fichaje con un clic, calendario mensual con barras de jornada y reportes listos para inspección.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Cartera de clientes ordenada',
    desc: 'Sociedades, autónomos, SCP… con NIF/CIF, facturación anual y estado a la vista.',
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
    title: 'Trabajos en kanban',
    desc: 'Pendiente, en curso, bloqueado, finalizado — con prioridad, progreso y vencimiento.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: 'Facturación y cobros',
    desc: 'Emite, marca como pagada y vigila vencidas. Total mes, pendiente y vencido a un vistazo.',
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
    desc: 'Modelos 303, 130, 111, 115, 347, 349… avisándote semanas antes del vencimiento.',
  },
];

const BIG_FEATURE = {
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  title: 'Una vista del negocio que sí entiende un asesor.',
  desc: 'KPIs reales: horas trabajadas, clientes activos, trabajos en curso, facturado del mes — y vencimientos AEAT marcados antes de que se conviertan en un problema.',
};

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="wrap">
        <RevealWrapper>
          <div className="section-head">
            <span className="eyebrow">Todo en una</span>
            <h2>Un escritorio de trabajo,<br />no diez pestañas.</h2>
            <p>
              Olvida cambiar entre Excel, calendarios y carpetas. GestorIA reúne tu<br />
              operación en un único lugar, con la sobriedad que un profesional necesita.
            </p>
          </div>
        </RevealWrapper>

        <div className="features__grid">
          {/* Big dark card — first */}
          <RevealWrapper>
            <div className="feature feature--big">
              <div className="feature__icon">{BIG_FEATURE.icon}</div>
              <h3>{BIG_FEATURE.title}</h3>
              <p>{BIG_FEATURE.desc}</p>
            </div>
          </RevealWrapper>

          {/* Regular feature cards */}
          {FEATURES.map((f) => (
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
