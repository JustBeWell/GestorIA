import RevealWrapper from './RevealWrapper';

const PLATFORMS = [
  {
    name: 'macOS',
    sub: 'Apple Silicon & Intel',
    desc: 'Aplicación nativa optimizada para macOS 13+. Funciona sin conexión una vez sincronizado.',
    size: '82 MB',
    version: '1.0.4',
    buttonLabel: 'Descargar para Mac',
    buttonClass: 'btn btn--primary',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 7c0-1.5.8-3 2-4 1.3 1.1 2 2.7 2 4M6.5 9c-1.5.5-3 2-3.5 4 2 5 6 7.5 9 7.5s7-2.5 9-7.5c-.5-2-2-3.5-3.5-4M12 11c-1.5 0-3 .7-3 2s1.5 2 3 2 3-.7 3-2-1.5-2-3-2z" />
      </svg>
    ),
  },
  {
    name: 'Windows',
    sub: 'x64 · Windows 10/11',
    desc: 'Instalador MSI para Windows 10 y 11. Actualización automática con notificaciones de nuevas versiones.',
    size: '95 MB',
    version: '1.0.4',
    buttonLabel: 'Descargar para Windows',
    buttonClass: 'btn btn--primary',
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
    name: 'Web',
    sub: 'Acceso desde cualquier navegador',
    desc: 'Sin instalación. Accede desde cualquier dispositivo con Chrome, Firefox o Safari. Ideal para gestorías en movilidad.',
    size: null,
    version: null,
    buttonLabel: 'Abrir en el navegador',
    buttonClass: 'btn btn--ghost',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    href: 'http://localhost:4200',
  },
];

export default function Download() {
  return (
    <section className="download" id="download">
      <div className="wrap">
        <RevealWrapper>
          <div className="download__inner">
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Descarga</span>
            <h2 style={{ marginTop: '16px' }}>Disponible donde trabajes</h2>
            <p className="download__lead">
              Nativo en escritorio para máximo rendimiento, o en la nube si prefieres
              acceder desde cualquier sitio. La misma app, en todas partes.
            </p>
          </div>
        </RevealWrapper>

        <RevealWrapper>
          <div className="download__grid">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="platform">
                <div className="platform__head">
                  <div className="platform__icon">{p.icon}</div>
                  <div>
                    <div className="platform__name">{p.name}</div>
                    <div className="platform__sub">{p.sub}</div>
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--ink-500)', margin: 0 }}>{p.desc}</p>

                <a
                  href={p.href ?? '#'}
                  className={`platform__btn ${p.buttonClass}`}
                  style={{ textDecoration: 'none' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {p.href ? (
                      <>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </>
                    ) : (
                      <>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </>
                    )}
                  </svg>
                  {p.buttonLabel}
                </a>

                {(p.size || p.version) && (
                  <div className="platform__meta">
                    {p.version && <span><b>v{p.version}</b></span>}
                    {p.size && <span>{p.size}</span>}
                    <span>Gratis · 30 días incluidos</span>
                  </div>
                )}
                {!p.size && !p.version && (
                  <div className="platform__meta">
                    <span>Siempre actualizado</span>
                    <span>Gratis · Sin límites</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </RevealWrapper>

        <div className="download__more">
          ¿Linux o necesitas una instalación personalizada?{' '}
          <a href="mailto:hola@gestoria.app">Contáctanos</a>
        </div>
      </div>
    </section>
  );
}
