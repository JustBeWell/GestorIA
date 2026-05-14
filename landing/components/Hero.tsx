import Image from 'next/image';
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

        {/* Banner a tamaño completo + cards flotantes */}
        <RevealWrapper>
          <div className="hero__banner-wrap">
            <div className="hero__banner-img-wrap">
              <Image
                src="/app-banner.png"
                alt="GestorIA — pantalla principal"
                width={1320}
                height={880}
                priority
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <div className="hero__floating-card hero__floating-card--top-left">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="hero__floating-video"
                src="/branding.mp4"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '12px' }}
              />
            </div>

            <div className="hero__floating-card hero__floating-card--bottom-right">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="hero__floating-video"
                src="/hero.mp4"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '12px' }}
              />
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
