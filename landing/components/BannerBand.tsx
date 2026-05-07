import RevealWrapper from './RevealWrapper';

const STATS = [
  { num: '68', unit: '%', pre: '−', label: 'tiempo en tareas repetitivas' },
  { num: '4,2', unit: 'h', pre: '+', label: 'recuperadas a la semana' },
  { num: '12', unit: '+', pre: '', label: 'modelos AEAT integrados' },
  { num: '100', unit: '%', pre: '', label: 'datos en tu equipo' },
];

export default function BannerBand() {
  return (
    <RevealWrapper>
      <div className="banner-band">
        <div className="banner-band__inner">
          <div>
            <span className="eyebrow on-dark">El día a día, en cifras</span>
            <h2 style={{ marginTop: '16px' }}>
              Menos clics,<br />más tiempo<br />para tus clientes.
            </h2>
            <p style={{ marginTop: '16px' }}>
              Diseñada con asesores reales: cada flujo está pensado para reducir trabajo
              administrativo y darte una visión clara del negocio.
            </p>
          </div>

          <div className="banner-stats">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="banner-stat__num">
                  {s.pre}{s.num}<small>{s.unit}</small>
                </div>
                <div className="banner-stat__label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RevealWrapper>
  );
}
