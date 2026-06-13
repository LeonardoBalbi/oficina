import './style.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Garage Auto Service',
  description: 'Sistema para oficina mecânica com Next.js, Vercel e Supabase',
  manifest: '/manifest.webmanifest',
  applicationName: 'Garage Auto Service',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Garage Auto'
  },
  icons: {
    icon: '/garage-logo.png',
    apple: '/garage-logo.png'
  }
};

export const viewport: Viewport = {
  themeColor: '#101317',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
