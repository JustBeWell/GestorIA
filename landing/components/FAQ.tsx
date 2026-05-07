import RevealWrapper from './RevealWrapper';

const FAQS = [
  {
    q: '¿Mis datos viven en la nube?',
    a: 'No. GestorIA es una aplicación de escritorio nativa: tus datos se almacenan localmente en tu equipo, cifrados. Puedes activar copias de seguridad opcionales en tu propio almacenamiento.',
  },
  {
    q: '¿Cuánto cuesta?',
    a: 'La versión Personal es gratuita y permite gestionar hasta 25 clientes. Las versiones Pro y Equipo se contratan por una sola vez (sin renovaciones forzadas) e incluyen actualizaciones durante 12 meses.',
  },
  {
    q: '¿Se integra con la AEAT?',
    a: 'Sí. Soportamos la generación de los principales modelos (303, 130, 111, 115, 202, 347, 349) listos para presentar. Próximamente, presentación directa con certificado digital.',
  },
  {
    q: '¿Puedo importar desde otros gestores?',
    a: 'Sí. Aceptamos CSV/Excel y plantillas de los gestores más comunes (A3, Sage, Holded, Contasimple). Nuestro asistente guía la importación en menos de 5 minutos.',
  },
  {
    q: '¿Hay versión para Linux?',
    a: 'Versión beta disponible bajo petición (.AppImage y .deb). Escríbenos a soporte@gestoria.app.',
  },
];

export default function FAQ() {
  return (
    <section className="faq" id="faq">
      <div className="wrap">
        <RevealWrapper>
          <div className="section-head">
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2>Lo que más nos preguntan.</h2>
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
