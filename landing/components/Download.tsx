import RevealWrapper from './RevealWrapper';

const RELEASES_URL = 'https://github.com/JustBeWell/GestorIA/releases/tag/macOS';

const PLATFORMS = [
  {
    name: 'Para Windows',
    sub: '.exe · 84 MB · Win 10/11',
    buttonLabel: 'Descargar para Windows',
    version: '2.4.1',
    details: ['Firmado · Microsoft', 'x64 · ARM64'],
    href: RELEASES_URL,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0zM10.949 1.949L24 0v11.4H10.949zM0 12.6h9.75v9.451L0 20.699zM10.949 12.6H24V24l-12.9-1.8z"/>
      </svg>
    ),
  },
  {
    name: 'Para macOS',
    sub: '.dmg · 78 MB · macOS 12+',
    buttonLabel: 'Descargar para macOS',
    version: '2.4.1',
    details: ['Notarized · Apple', 'Intel · Apple Silicon'],
    href: RELEASES_URL,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
];

export default function Download() {
  return (
    <section className="download download--dark" id="download">
      <div className="wrap">
        <RevealWrapper>
          <div className="download__inner">
            <span className="eyebrow on-dark" style={{ justifyContent: 'center' }}>Descarga</span>
            <h2 style={{ marginTop: '16px' }}>Disponible para tu equipo.</h2>
            <p className="download__lead">
              Aplicación de escritorio nativa. Una licencia por equipo, sin
              suscripciones forzadas. Empieza con la versión gratuita.
            </p>
          </div>
        </RevealWrapper>

        <RevealWrapper>
          <div className="download__grid download__grid--2col">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="platform">
                <div className="platform__head">
                  <div className="platform__icon">{p.icon}</div>
                  <div>
                    <div className="platform__name">{p.name}</div>
                    <div className="platform__sub">{p.sub}</div>
                  </div>
                </div>

                <a href={p.href} target="_blank" rel="noopener noreferrer" className="platform__btn btn btn--primary" style={{ textDecoration: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {p.buttonLabel}
                </a>

                <div className="platform__meta platform__meta--row">
                  <span>Versión <b>{p.version}</b></span>
                  {p.details.map((d) => <span key={d}>{d}</span>)}
                </div>
              </div>
            ))}
          </div>
        </RevealWrapper>

        <div className="download__more">
          ¿Linux, MSI corporativo o instalación desatendida?{' '}
          <a href="mailto:soporte@gestoria.app">Consulta otras opciones</a>.
        </div>
      </div>
    </section>
  );
}

