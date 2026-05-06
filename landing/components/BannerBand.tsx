import RevealWrapper from './RevealWrapper';

const STATS = [
  { num: '87', unit: '%', label: 'reducción de tiempo en tareas repetitivas' },
  { num: '340', unit: '+', label: 'gestorías usando GestorIA activamente' },
  { num: '4.8', unit: '★', label: 'valoración media de los usuarios' },
  { num: '30', unit: 'd', label: 'de prueba gratuita, sin límites' },
];

export default function BannerBand() {
  return (
    <RevealWrapper>
      <div className="banner-band">
        <div className="banner-band__inner">
          <div>
            <span className="eyebrow on-dark">Por qué GestorIA</span>
            <h2 style={{ marginTop: '16px' }}>
              Diseñado para el día a día de tu gestoría
            </h2>
            <p style={{ marginTop: '16px' }}>
              No es otro software genérico. GestorIA nace de escuchar a gestores y asesores:
              menos clics, más automatización y una IA que realmente ayuda a gestionar expedientes.
            </p>
          </div>

          <div className="banner-stats">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="banner-stat__num">
                  {s.num}<small>{s.unit}</small>
                </div>
                <div className="banner-stat__label">{s.label}</div>
              </div>
            ))}
          </div>

          <div>
            <a href="#download" className="btn btn--cream btn--lg">
              Empezar ahora — gratis
            </a>
          </div>
        </div>
      </div>
    </RevealWrapper>
  );
}
