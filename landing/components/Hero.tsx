import RevealWrapper from './RevealWrapper';

export default function Hero() {
  return (
    <section className="hero hero--dark">
      <div className="wrap hero__inner">

        {/* Eyebrow pill */}
        <RevealWrapper>
          <div className="hero__eyebrow hero__eyebrow--dark">
            <b>NUEVO</b>
            Versión 1.4 · ahora con IA en modelo 303
          </div>
        </RevealWrapper>

        {/* Brand banner */}
        <RevealWrapper>
          <div className="hero__banner-wrap" style={{ maxWidth: 860 }}>
            <div className="hero__banner" style={{ animation: 'heroFloat 9s ease-in-out infinite' }}>
              <div className="hero-brand">
                <div className="hero-compass">
                  <CompassSVG />
                </div>
                <div className="hero-wordmark">GESTORIA</div>
                <div className="hero-tagline-brand">AUTOMATIZA &nbsp;&nbsp; ACOMPAÑA</div>
              </div>
            </div>
          </div>
        </RevealWrapper>

        {/* CTA */}
        <RevealWrapper>
          <div className="hero__cta-row" style={{ marginTop: 8 }}>
            <a href="https://github.com/JustBeWell/GestorIA/releases" target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--lg">
              ↓&nbsp; Descargar gratis
            </a>
          </div>
          <div className="hero__cta-meta hero__cta-meta--dark" style={{ marginTop: '20px' }}>
            <span>✓ Sin tarjeta de crédito</span>
            <span>✓ Windows · macOS</span>
            <span>✓ Datos en local</span>
          </div>
        </RevealWrapper>

      </div>
    </section>
  );
}

function CompassSVG() {
  return (
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* North arrow (cream) */}
      <polygon points="26,4 30,26 26,22 22,26" fill="rgba(243,236,218,0.95)" />
      {/* South arrow (dimmer) */}
      <polygon points="26,48 30,26 26,30 22,26" fill="rgba(243,236,218,0.3)" />
      {/* Tick marks */}
      <line x1="26" y1="0" x2="26" y2="3" stroke="rgba(243,236,218,0.45)" strokeWidth="1.5" />
      <line x1="26" y1="49" x2="26" y2="52" stroke="rgba(243,236,218,0.45)" strokeWidth="1.5" />
      <line x1="0" y1="26" x2="3" y2="26" stroke="rgba(243,236,218,0.45)" strokeWidth="1.5" />
      <line x1="49" y1="26" x2="52" y2="26" stroke="rgba(243,236,218,0.45)" strokeWidth="1.5" />
    </svg>
  );
}
