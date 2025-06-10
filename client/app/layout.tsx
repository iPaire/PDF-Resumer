// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import AuthProvider from './providers/SessionProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SmartPDF Notes',
  description: 'Rezumă PDF-uri, generează teste grilă și învață eficient cu AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen pt-10 bg-gray-50">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}