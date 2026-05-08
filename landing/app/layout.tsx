import type { Metadata } from 'next';
import { Manrope, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GestorIA · Automatiza, acompaña',
  description:
    'El asistente de IA para gestorías. Gestiona clientes, trabajos, pagos y fichaje en una sola plataforma diseñada para el día a día de tu gestoría.',
  keywords: ['gestoria', 'software gestion', 'ia gestoria', 'gestion clientes', 'fichaje digital'],
  openGraph: {
    title: 'GestorIA · Automatiza, acompaña',
    description: 'Software de gestión con IA para gestorías. Clientes, trabajos, pagos y fichaje en una sola plataforma.',
    locale: 'es_ES',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${ibmPlexMono.variable}`}>
      <head>
        <link rel="preload" href="/branding.mp4" as="video" type="video/mp4" />
      </head>
      <body>{children}</body>
    </html>
  );
}
