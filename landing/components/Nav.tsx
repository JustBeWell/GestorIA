'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function Nav() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      navRef.current?.classList.toggle('is-stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="nav" id="nav" ref={navRef}>
      <div className="nav__inner">
        <a href="#" className="nav__brand">
          <LogoIcon />
          GestorIA
        </a>

        <div className="nav__links">
          <a href="#features">Características</a>
          <a href="#modulos">Módulos</a>
          <a href="#download">Descarga</a>
          <a href="#faq">FAQ</a>
        </div>

        <div className="nav__actions">
          <a href="http://localhost:4200" className="btn btn--ghost">Acceder</a>
          <a href="#download" className="btn btn--primary">Descargar gratis</a>
        </div>
      </div>
    </nav>
  );
}

function LogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#275448" />
      <path
        d="M16 7C11.03 7 7 11.03 7 16C7 20.97 11.03 25 16 25C18.76 25 21.24 23.82 22.98 21.94L20.3 19.7C19.22 20.84 17.69 21.56 16 21.56C12.93 21.56 10.44 19.07 10.44 16C10.44 12.93 12.93 10.44 16 10.44C17.69 10.44 19.22 11.16 20.3 12.3L22.98 10.06C21.24 8.18 18.76 7 16 7Z"
        fill="#f3ecda"
      />
      <path
        d="M23.5 15H16.5V17H23.5V15Z"
        fill="#f3ecda"
        opacity="0.75"
      />
      <circle cx="25" cy="9" r="4" fill="#3f9a82" />
      <path d="M25 7V11M23 9H27" stroke="#f3ecda" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
