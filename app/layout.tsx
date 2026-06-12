import './style.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oficina Mecânica',
  description: 'Sistema para oficina mecânica com Next.js, Vercel e Supabase'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
