import RevealWrapper from './RevealWrapper';

const RELEASES_URL = 'https://github.com/JustBeWell/GestorIA/';

const PLATFORMS = [
  {
    name: 'Para Windows',
    sub: '.exe · 84 MB · Win 10/11',
    buttonLabel: 'Descargar para Windows',
    version: '2.4.1',
    details: ['Firmado · Microsoft', 'x64 · ARM64'],
    href: RELEASES_URL,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="9" height="9" rx="1" />
        <rect x="13" y="3" width="9" height="9" rx="1" />
        <rect x="2" y="13" width="9" height="9" rx="1" />
        <rect x="13" y="13" width="9" height="9" rx="1" />
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 7c0-1.5.8-3 2-4 1.3 1.1 2 2.7 2 4M6.5 9c-1.5.5-3 2-3.5 4 2 5 6 7.5 9 7.5s7-2.5 9-7.5c-.5-2-2-3.5-3.5-4M12 11c-1.5 0-3 .7-3 2s1.5 2 3 2 3-.7 3-2-1.5-2-3-2z" />
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

