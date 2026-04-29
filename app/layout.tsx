import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Model Registry',
  description: 'System-agnostic AI model registry',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
