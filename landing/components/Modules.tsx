import RevealWrapper from './RevealWrapper';

const MODULES = [
  {
    title: 'Clientes',
    desc: 'Ficha completa, historial fiscal y documentos de cada cliente.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Trabajos',
    desc: 'Kanban de expedientes con asignaciones y plazos.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: 'Pagos',
    desc: 'Facturas, cobros y control de vencimientos en un solo panel.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: 'Fichaje',
    desc: 'Registro digital de presencia con informes automáticos.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: 'Administración',
    desc: 'Panel de gerencia: KPIs de equipo, trabajos y finanzas.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: 'IA Asistente',
    desc: 'Redacción de escritos y resúmenes de expedientes automáticos.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

export default function Modules() {
  return (
    <section className="modules" id="modulos">
      <div className="wrap">
        <div className="modules__inner">
          <RevealWrapper>
            <div>
              <span className="eyebrow on-dark">Módulos</span>
              <h2 style={{ marginTop: '16px' }}>Cada pieza de tu gestoría, conectada</h2>
              <p className="lead">
                Todos los módulos comparten datos en tiempo real. Lo que ocurre en un trabajo
                se refleja en la factura, en el fichaje y en el dashboard sin ningún esfuerzo manual.
              </p>
            </div>
          </RevealWrapper>

          <RevealWrapper>
            <div className="modules__list">
              {MODULES.map((mod) => (
                <div key={mod.title} className="module-card">
                  <div className="module-card__head">
                    <div className="module-card__icon">{mod.icon}</div>
                    <div className="module-card__title">{mod.title}</div>
                  </div>
                  <p>{mod.desc}</p>
                </div>
              ))}
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}
