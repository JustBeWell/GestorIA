import RevealWrapper from './RevealWrapper';

const STEPS = [
  {
    num: '01',
    title: 'Descarga la app',
    desc: 'Instalable nativo para Windows y macOS. 80 MB, sin servidores intermedios.',
  },
  {
    num: '02',
    title: 'Importa tus clientes',
    desc: 'Desde Excel, CSV o tu gestor anterior. La app detecta NIF/CIF y normaliza los datos.',
  },
  {
    num: '03',
    title: 'Empieza a trabajar',
    desc: 'Calendario fiscal, fichaje y trabajos listos desde el primer día.',
  },
];

export default function HowItWorks() {
  return (
    <section className="how">
      <div className="wrap">
        <RevealWrapper>
          <div className="section-head">
            <span className="eyebrow">Cómo empezar</span>
            <h2>Operativo en menos de 5 minutos.</h2>
            <p>Sin migraciones complicadas ni dependencias en la nube. Descarga, importa y trabaja.</p>
          </div>
        </RevealWrapper>

        <RevealWrapper>
          <div className="how__steps">
            {STEPS.map((step) => (
              <div key={step.title} className="how__step">
                <span className="how__step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}
