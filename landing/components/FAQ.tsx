import RevealWrapper from './RevealWrapper';

const FAQS = [
  {
    q: '¿Cuánto cuesta GestorIA?',
    a: 'GestorIA tiene 30 días de prueba gratuita sin necesidad de tarjeta de crédito. Después, el plan de equipo parte de 39 €/mes para hasta 5 usuarios. Consulta la página de precios para ver todas las opciones.',
  },
  {
    q: '¿Es compatible con mis datos actuales?',
    a: 'Sí. Puedes importar clientes y trabajos desde CSV. Si usas otro software de gestión, nuestro equipo de soporte te ayuda con la migración sin coste adicional durante el primer mes.',
  },
  {
    q: '¿Funciona sin conexión a internet?',
    a: 'La versión de escritorio (macOS y Windows) almacena los datos localmente y sincroniza cuando hay conexión. La versión web requiere conexión, pero los cambios se guardan en cuanto el navegador recupera la red.',
  },
  {
    q: '¿Cuántos usuarios puedo añadir?',
    a: 'En el plan base tienes hasta 5 usuarios. Los planes superiores incluyen usuarios ilimitados. También puedes dar acceso de solo lectura a clientes o colaboradores externos sin consumir licencia.',
  },
  {
    q: '¿Cómo funciona el asistente IA?',
    a: 'El asistente analiza el contexto de cada expediente y cliente para generar textos, resumir documentos adjuntos y sugerir los siguientes pasos. Usa modelos de lenguaje de última generación con tus datos procesados de forma segura y sin compartirlos con terceros.',
  },
];

export default function FAQ() {
  return (
    <section className="faq" id="faq">
      <div className="wrap">
        <RevealWrapper>
          <div className="section-head">
            <span className="eyebrow">FAQ</span>
            <h2>Preguntas frecuentes</h2>
          </div>
        </RevealWrapper>

        <RevealWrapper>
          <div className="faq__inner">
            {FAQS.map((item) => (
              <details key={item.q} className="faq__item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}
