import RevealWrapper from './RevealWrapper';

const STEPS = [
  {
    title: 'Crea tu cuenta y configura tu gestoría',
    desc: 'Regístrate en menos de 2 minutos. Añade el nombre de tu despacho, el número de usuarios y los módulos que necesitas. Sin instalar nada.',
  },
  {
    title: 'Importa clientes y define flujos de trabajo',
    desc: 'Importa tu cartera de clientes desde CSV o añádelos manualmente. Configura las categorías de trabajos y asigna responsables a cada expediente.',
  },
  {
    title: 'GestorIA gestiona, tú decides',
    desc: 'El asistente IA analiza el estado de cada expediente, sugiere próximas acciones y redacta documentos. Tú apruebas; la IA ejecuta.',
  },
];

export default function HowItWorks() {
  return (
    <section className="how">
      <div className="wrap">
        <RevealWrapper>
          <div className="section-head">
            <span className="eyebrow">Cómo funciona</span>
            <h2>En marcha en menos de 10 minutos</h2>
            <p>Sin instalaciones complicadas, sin curvas de aprendizaje largas.</p>
          </div>
        </RevealWrapper>

        <RevealWrapper>
          <div className="how__steps">
            {STEPS.map((step) => (
              <div key={step.title} className="how__step">
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
