const FOOTER_COLS = [
  {
    title: 'Producto',
    links: [
      { label: 'Funciones', href: '#features' },
      { label: 'Módulos', href: '#modulos' },
      { label: 'Descargar', href: '#download' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Documentación', href: '#' },
      { label: 'Preguntas frecuentes', href: '#faq' },
      { label: 'Changelog', href: '#' },
      { label: 'Soporte', href: 'mailto:soporte@gestoria.app' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', href: '#' },
      { label: 'Términos', href: '#' },
      { label: 'Cookies', href: '#' },
      { label: 'Licencia', href: '#' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__top footer__top--4col">
          {/* Brand column */}
          <div>
            <div className="footer__brand">
              <LogoIcon />
              GestorIA
            </div>
            <p className="footer__tag">
              Automatiza, acompaña. La gestoría que se gestiona sola.
            </p>
            <a href="https://github.com/JustBeWell/GestorIA/releases" target="_blank" rel="noopener noreferrer" className="btn btn--outline-cream" style={{ marginTop: '8px' }}>
              Descargar
            </a>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title} className="footer__col">
              <div className="footer__col-title">{col.title}</div>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer__bottom">
          <span>© 2026 GestorIA. Hecho en España.</span>
          <nav className="footer__bottom-nav">
            <a href="#">Privacidad</a>
            <a href="#">Términos</a>
            <a href="#">Cookies</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function LogoIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#275448" />
      <path
        d="M16 7C11.03 7 7 11.03 7 16C7 20.97 11.03 25 16 25C18.76 25 21.24 23.82 22.98 21.94L20.3 19.7C19.22 20.84 17.69 21.56 16 21.56C12.93 21.56 10.44 19.07 10.44 16C10.44 12.93 12.93 10.44 16 10.44C17.69 10.44 19.22 11.16 20.3 12.3L22.98 10.06C21.24 8.18 18.76 7 16 7Z"
        fill="#f3ecda"
      />
      <path d="M23.5 15H16.5V17H23.5V15Z" fill="#f3ecda" opacity="0.75" />
      <circle cx="25" cy="9" r="4" fill="#3f9a82" />
      <path d="M25 7V11M23 9H27" stroke="#f3ecda" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}


